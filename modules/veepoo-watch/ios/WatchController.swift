import CoreBluetooth
import Foundation
import VeepooBleSDK

/**
 * SDK chaqiruvlari (Android'dagi WatchController.kt ning muqobili). Natijalar chaqiruvlardan emas, hodisa oqimidan
 * keladi: "scan", "connection", "event", "bluetooth". Hodisa shakllari Android bilan aynan bir xil, shuning uchun
 * JS (measure.ts, watch-connection.ts) ikkala platformada o'zgarishsiz ishlaydi. Moslik jadvali:
 * docs/ios-mapping.md.
 *
 * Bosqichlar (docs/ios-plan.md): 1 — skelet (shu fayl: SDK ishga tushirish, Bluetooth holati, umumiy yordamchilar,
 * nasosli bosim), 2 — skan va ulanish, 3 — o'lchovlar, 4 — sinxron, 5 — sozlamalar, 6 — siferblat.
 *
 * SDK buyruqlarni parallel bajarmaydi; bir vaqtda bitta ishni JS ta'minlaydi (`isMeasuring`), Android'dagi kabi.
 * Barcha SDK chaqiruvlari va holat o'zgarishlari asosiy navbatda (main queue) bajariladi.
 */
final class WatchController {
  private let emitEvent: (_ name: String, _ body: [String: Any?]) -> Void
  private let sdk: VPBleCentralManage

  private var currentId: String?
  private var ready = false
  private var lastState = "disconnected"
  private var lastReason: String?

  private lazy var cuffBp = CuffBpChannel(
    emit: { [weak self] type, fields in self?.emitData(type, fields) },
    log: { [weak self] message in self?.emitData("log", ["message": message]) }
  )

  init(emitEvent: @escaping (_ name: String, _ body: [String: Any?]) -> Void) {
    self.emitEvent = emitEvent
    sdk = VPBleCentralManage.sharedBleManager()
    // SDK o'zi saqlaydigan rejim: kunlik ma'lumot, uyqu, soatdagi tana tarkibi faqat SDK bazasi orqali o'qiladi
    // (docs/ios-mapping.md, 1.2).
    if !(sdk.peripheralManage is VPPeripheralManage) {
      sdk.peripheralManage = VPPeripheralManage.shareVPPeripheralManager()
    }
    sdk.vpBleCentralManageChangeBlock = { [weak self] state in
      DispatchQueue.main.async { self?.onBluetoothState(state) }
    }
  }

  /// Modul yo'q qilinganda (JS qayta yuklanishi): SDK singleton, shuning uchun eski blok uzib qo'yiladi.
  func release() {
    sdk.vpBleCentralManageChangeBlock = nil
  }

  // MARK: - Yordamchilar

  /// [reason] — JS tarjima qiladigan sabab kodi (hozircha faqat "bluetoothOff"), [message] esa faqat o'zbekcha.
  func emitConn(_ state: String, message: String? = nil, reason: String? = nil) {
    lastState = state
    lastReason = reason
    emitEvent("connection", ["state": state, "id": currentId, "message": message, "reason": reason])
  }

  /// Joriy ulanish holati: JS qayta yuklansa native qism ulanishni saqlab turadi, JS shu holatni so'rab oladi.
  func connectionSnapshot() -> [String: Any?] {
    ["state": lastState, "id": currentId, "message": nil, "reason": lastReason]
  }

  func emitData(_ type: String, _ fields: [String: Any?] = [:]) {
    var body = fields
    body["type"] = type
    emitEvent("event", body)
  }

  private func requireReady(_ op: String) -> Bool {
    if ready { return true }
    emitData("error", ["op": op, "message": "Soat bilan aloqa tayyor emas (avval ulaning)"])
    return false
  }

  // MARK: - Bluetooth

  func isBluetoothEnabled() -> Bool {
    sdk.centralManager?.state == .poweredOn
  }

  private func onBluetoothState(_ state: VPCentralManagerState) {
    switch state {
    case .poweredOn:
      emitEvent("bluetooth", ["on": true])
    case .poweredOff:
      let active = ready || lastState == "connecting" || lastState == "authenticating"
      if active {
        ready = false
        emitConn("disconnected", message: "Bluetooth o'chirildi", reason: "bluetoothOff")
      }
      emitEvent("bluetooth", ["on": false])
    default:
      break
    }
  }

  // MARK: - Nasosli bosim (CuffBpChannel.swift: SDK'da API yo'q, kadr to'g'ridan-to'g'ri yoziladi)

  func startCuffBp(rawFlag: Bool) {
    guard requireReady("startCuffBp") else { return }
    cuffBp.start(rawFlag: rawFlag)
  }

  func stopCuffBp() {
    guard ready else { return }
    cuffBp.stop()
  }
}
