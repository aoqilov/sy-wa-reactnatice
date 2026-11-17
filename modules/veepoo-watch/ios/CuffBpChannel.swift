import CoreBluetooth
import Foundation
import ObjectiveC
import VeepooBleSDK

/**
 * Havo yostiqchali (nasosli) bosimni ilovadan boshlash.
 *
 * iOS SDK'da buning uchun API yo'q (hujjatda ham, binarda ham; docs/ios-mapping.md). Android SDK esa
 * `startDetectCuffBP` ichida soatga oddiy kadr yuboradi, `synapse-soat` veb ilovasi ham aynan shu kadrni o'zi yozadi
 * (haqiqiy E500 da sinalgan, 2026-10-16). Shu yerda ham xuddi shunday:
 *
 * - start: `F0080003` ga 20 baytli `90 01 05 <flag> 00…`, stop: `90 00 05 01 00…`;
 * - javob: `F0080002` dan `0x90` bilan boshlanadigan kadrlar (≥ 12 bayt):
 *   1-2 yuqori bosim, 3-4 quyi bosim (little-endian), 5 = 10 — o'lchov tugadi, 6 holat, 8 puls,
 *   9-10 yostiqchadagi bosim, 11 `rate`.
 *
 * Kadrni SDK ulagan `CBPeripheral` ga to'g'ridan-to'g'ri yozamiz. Javobni o'qish uchun SDK'ning
 * `CBPeripheralDelegate` sinfidagi `peripheral:didUpdateValueForCharacteristic:error:` metodiga ObjC runtime
 * orqali "quloq" ulanadi: avval biz kadrni ko'ramiz, keyin SDK'ning o'z metodi o'zgarishsiz chaqiriladi.
 *
 * JS'ga Android bilan bir xil `cuffBp` hodisasi ketadi (measure.ts o'zgarmaydi).
 *
 * Sinalmagan (iPhone yo'q). Birinchi sinovda tekshiriladi:
 * - SDK begona `0x90` kadrlarni o'zining optik bosim javobi deb qabul qilib, xalaqit beradimi [?];
 * - delegate SDK'ning qaysi sinfi ekanligi (jurnalga yoziladi).
 */
final class CuffBpChannel {
  static let serviceUUID = CBUUID(string: "F0080001-0451-4000-B000-000000000000")
  static let notifyUUID = CBUUID(string: "F0080002-0451-4000-B000-000000000000")
  static let writeUUID = CBUUID(string: "F0080003-0451-4000-B000-000000000000")

  /// Android `EVPCuffBPTestStatus` nomlari (measure.ts dagi CUFF_ERROR / CUFF_OK_STATUS shularni kutadi).
  private static let statusNames: [UInt8: String] = [
    0: "EMPTY",
    1: "SUCCESS",
    2: "POSTURE_ERROR",
    3: "LOOSE",
    4: "NOT_WEAR",
    5: "TIME_OUT",
    6: "HEART_ERROR",
    7: "SLOW_DEFLATION",
    8: "TOO_MUCH_PRESSURE",
    9: "POOR_SIGNAL_QUALITY",
    10: "NOT_REMAINING_STATIONARY",
    253: "CHARGING",
    254: "LOW_POWER",
    255: "DEVICE_BUSY",
  ]

  private let emit: (_ type: String, _ fields: [String: Any]) -> Void
  private let log: (String) -> Void
  /// O'lchov ketyaptimi: faqat shu paytda `0x90` kadrlar nasos kadri deb o'qiladi.
  private var active = false

  init(emit: @escaping (_ type: String, _ fields: [String: Any]) -> Void, log: @escaping (String) -> Void) {
    self.emit = emit
    self.log = log
  }

  /// O'lchovni boshlaydi. Yozib bo'lmasa (ulanmagan, xizmat topilmadi) `cuffBp {unsupported: true}` yuboradi:
  /// JS bu holatda "soatda o'lchash" oqimiga o'tadi (use-measurement.ts).
  func start(rawFlag: Bool) {
    guard let target = writeTarget() else {
      log("[cuffBp] yozish kanali topilmadi")
      emit("cuffBp", ["unsupported": true])
      return
    }
    guard installTap(on: target.peripheral) else {
      log("[cuffBp] delegate topilmadi, javobni o'qib bo'lmaydi")
      emit("cuffBp", ["unsupported": true])
      return
    }
    let bpType = VPBleCentralManage.sharedBleManager()?.peripheralModel?.bloodPressureType ?? 0
    log("[cuffBp] start, bloodPressureType=\(bpType)")
    active = true
    write(target, [0x90, 0x01, 0x05, rawFlag ? 0x01 : 0x00])
  }

  func stop() {
    active = false
    guard let target = writeTarget() else { return }
    write(target, [0x90, 0x00, 0x05, 0x01])
  }

  // MARK: - Yozish

  private func writeTarget() -> (peripheral: CBPeripheral, characteristic: CBCharacteristic)? {
    guard
      let peripheral = VPBleCentralManage.sharedBleManager()?.peripheralModel?.peripheral,
      peripheral.state == .connected,
      let service = peripheral.services?.first(where: { $0.uuid == Self.serviceUUID }),
      let characteristic = service.characteristics?.first(where: { $0.uuid == Self.writeUUID })
    else { return nil }
    return (peripheral: peripheral, characteristic: characteristic)
  }

  private func write(_ target: (peripheral: CBPeripheral, characteristic: CBCharacteristic), _ head: [UInt8]) {
    var frame = [UInt8](repeating: 0, count: 20)
    frame.replaceSubrange(0..<head.count, with: head)
    // synapse-soat: writeNoResponse. Xususiyat buni qo'llamasa, javobli yozish.
    let type: CBCharacteristicWriteType =
      target.characteristic.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
    target.peripheral.writeValue(Data(frame), for: target.characteristic, type: type)
  }

  // MARK: - Javobni o'qish

  private func handle(_ characteristic: CBCharacteristic) {
    guard active, characteristic.uuid == Self.notifyUUID, let data = characteristic.value, data.count >= 12 else {
      return
    }
    let b = [UInt8](data)
    guard b[0] == 0x90 else { return }
    let flag = b[5] == 10
    emit("cuffBp", [
      "flag": flag,
      "sbp": Int(b[1]) | Int(b[2]) << 8,
      "dbp": Int(b[3]) | Int(b[4]) << 8,
      "status": Self.statusNames[b[6]] ?? "UNKNOWN_\(b[6])",
      "heart": Int(b[8]),
      "pressure": Int(b[9]) | Int(b[10]) << 8,
      "rate": Int(b[11]),
      "raw": b.map { String(format: "%02x", $0) }.joined(separator: " "),
    ])
    if flag { active = false }
  }

  /// Faol kanal (quloq bitta: SDK delegate'i ilova davomida bir xil sinf).
  private static weak var current: CuffBpChannel?
  private static var hookedClasses = Set<ObjectIdentifier>()
  private static let selector = NSSelectorFromString("peripheral:didUpdateValueForCharacteristic:error:")

  /// SDK delegate sinfining `peripheral:didUpdateValueForCharacteristic:error:` metodini o'raydi.
  /// Sinf uchun bir marta bajariladi; SDK'ning asl metodi har doim chaqiriladi.
  private func installTap(on peripheral: CBPeripheral) -> Bool {
    Self.current = self
    guard let delegate = peripheral.delegate, let cls: AnyClass = object_getClass(delegate) else { return false }
    let key = ObjectIdentifier(cls)
    if Self.hookedClasses.contains(key) { return true }
    guard let method = class_getInstanceMethod(cls, Self.selector) else { return false }

    typealias Original = @convention(c) (AnyObject, Selector, CBPeripheral, CBCharacteristic, NSError?) -> Void
    let original = unsafeBitCast(method_getImplementation(method), to: Original.self)
    let selector = Self.selector
    let tap: @convention(block) (AnyObject, CBPeripheral, CBCharacteristic, NSError?) -> Void = {
      object, peripheral, characteristic, error in
      if error == nil { CuffBpChannel.current?.handle(characteristic) }
      original(object, selector, peripheral, characteristic, error)
    }
    // Metod ota sinfda bo'lsa, class_replaceMethod uni shu sinfga qo'shadi; `original` ota sinfnikini chaqiradi.
    class_replaceMethod(cls, Self.selector, imp_implementationWithBlock(tap), method_getTypeEncoding(method))
    Self.hookedClasses.insert(key)
    log("[cuffBp] quloq ulandi: \(NSStringFromClass(cls))")
    return true
  }
}
