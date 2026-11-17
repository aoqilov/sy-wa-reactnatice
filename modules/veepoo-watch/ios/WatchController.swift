import CoreBluetooth
import Foundation
import VeepooBleSDK

/**
 * SDK chaqiruvlari (Android'dagi WatchController.kt ning muqobili). Natijalar chaqiruvlardan emas, hodisa oqimidan
 * keladi: "scan", "connection", "event", "bluetooth". Hodisa shakllari Android bilan aynan bir xil, shuning uchun
 * JS (measure.ts, watch-connection.ts, watch-history.ts ...) ikkala platformada o'zgarishsiz ishlaydi.
 * Moslik jadvali: docs/ios-mapping.md.
 *
 * SINALMAGAN: Mac ham, iPhone ham yo'q edi. Har bir SDK chaqiruvining Swift'dagi yozilishi SDK demo ilovasidan
 * (iOS_Ble_SDK/Demo) olingan. Enum'lar `rawValue` raqami bilan solishtiriladi (Swift case nomlarini taxmin qilmaslik
 * uchun). Noaniq joylar `[?]` bilan belgilangan va "log" hodisasiga yoziladi: ilovadagi konsolda ko'rinadi.
 *
 * SDK buyruqlarni parallel bajarmaydi; bir vaqtda bitta ishni JS ta'minlaydi (`isMeasuring`), Android'dagi kabi.
 * Barcha chaqiruvlar asosiy navbatda (main queue) bajariladi (VeepooWatchModule.swift).
 */
final class WatchController {
  private let emitEvent: (_ name: String, _ body: [String: Any?]) -> Void
  private let sdk: VPBleCentralManage

  private var currentId: String?
  private var ready = false
  private var lastState = "disconnected"
  private var lastReason: String?
  /// Ulanish urinishining raqami: eski urinishning kech kelgan javoblari e'tiborsiz.
  private var session = 0
  private var scanning = false
  /// Skanda topilgan soatlar: iOS ulanish uchun SDK'ning `VPPeripheralModel` obyektini talab qiladi.
  private var scanned: [String: VPPeripheralModel] = [:]
  /// Saqlangan soatga avto-ulanish: skanda shu `id` topilishi bilan ulanamiz.
  private var pendingConnect: (id: String, confirm: Bool, token: Int)?
  private var scanTimer: Timer?

  private lazy var cuffBp = CuffBpChannel(
    emit: { [weak self] type, fields in self?.emitData(type, fields) },
    log: { [weak self] message in self?.log(message) }
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
      DispatchQueue.main.async { self?.onBluetoothState(state.rawValue) }
    }
    sdk.vpBleConnectStateChangeBlock = { [weak self] state in
      DispatchQueue.main.async { self?.onDeviceConnectState(state.rawValue) }
    }
  }

  /// Modul yo'q qilinganda (JS qayta yuklanishi): SDK singleton, shuning uchun eski bloklar uzib qo'yiladi.
  func release() {
    sdk.vpBleCentralManageChangeBlock = nil
    sdk.vpBleConnectStateChangeBlock = nil
    scanTimer?.invalidate()
  }

  // MARK: - Yordamchilar

  private var pm: VPPeripheralBaseManage? { sdk.peripheralManage }
  private var model: VPPeripheralModel? { sdk.peripheralModel }
  /// SDK bazasidagi jadval nomi: soatning MAC manzili.
  private var tableID: String? { model?.deviceAddress }

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

  /// Diagnostika: ilovadagi konsolga va `/watch` jurnaliga tushadi.
  func log(_ message: String) {
    emitData("log", ["message": message])
  }

  private func fail(_ op: String, _ message: String) {
    emitData("error", ["op": op, "message": message])
  }

  private func requireReady(_ op: String) -> Bool {
    if ready, pm != nil { return true }
    fail(op, "Soat bilan aloqa tayyor emas (avval ulaning)")
    return false
  }

  /// SDK obyektining xususiyati KVC orqali (Swift'dagi nomi aniq bo'lmagan xususiyatlar uchun: RSSI, CPUType ...).
  private func kvc(_ object: NSObject?, _ key: String) -> Any? {
    guard let object = object, object.responds(to: NSSelectorFromString(key)) else { return nil }
    return object.value(forKey: key)
  }

  private func int(_ v: Any?) -> Int? {
    switch v {
    case let n as NSNumber: return n.intValue
    case let s as String: return Int(s) ?? Double(s).map { Int($0) }
    case let i as Int: return i
    default: return nil
    }
  }

  private func double(_ v: Any?) -> Double? {
    switch v {
    case let n as NSNumber: return n.doubleValue
    case let s as String: return Double(s)
    default: return nil
    }
  }

  private func positive(_ v: Int?) -> Int? { (v ?? 0) > 0 ? v : nil }

  /// "yyyy-MM-dd" (SDK bazasi kunlarni shu shaklda saqlaydi), bugundan [daysAgo] kun oldin.
  private func dateString(daysAgo: Int) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    let date = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
    return f.string(from: date)
  }

  /// Matndagi sonlar: "2017/02/09 01:15", "2017-02-09 01:15:00" → {y, mo, d, h, mi} (JS shunday kutadi).
  private func timeMap(_ text: String?) -> [String: Int]? {
    guard let text = text else { return nil }
    let nums = text.split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
    guard nums.count >= 5 else { return nil }
    return ["y": nums[0], "mo": nums[1], "d": nums[2], "h": nums[3], "mi": nums[4]]
  }

  private var watchDays: Int {
    let days = Int(model?.saveDays ?? 0)
    return days > 0 ? days : 3
  }

  // MARK: - Bluetooth

  func isBluetoothEnabled() -> Bool {
    sdk.centralManager?.state == .poweredOn
  }

  /// VPCentralManagerState: 4 — o'chiq, 5 — yoqiq.
  private func onBluetoothState(_ raw: Int) {
    if raw == 5 {
      emitEvent("bluetooth", ["on": true])
      return
    }
    guard raw == 4 else { return }
    if scanning {
      stopScanInternal(emitStopped: false)
      emitEvent("scan", ["state": "bluetoothOff"])
    }
    let active = ready || lastState == "connecting" || lastState == "authenticating"
    if active {
      dropConnection()
      emitConn("disconnected", message: "Bluetooth o'chirildi", reason: "bluetoothOff")
    }
    emitEvent("bluetooth", ["on": false])
  }

  // MARK: - 2-bosqich: skan

  func startScan() {
    guard isBluetoothEnabled() else {
      emitEvent("scan", ["state": "bluetoothOff"])
      return
    }
    scanning = true
    emitEvent("scan", ["state": "started"])
    sdk.veepooSDKStartScanDeviceAndReceiveScanningDevice { [weak self] peripheralModel in
      DispatchQueue.main.async { self?.onScanned(peripheralModel) }
    }
    // Android SDK skanni o'zi ~10 s da to'xtatadi; iOS SDK'da bunday yo'q.
    scanTimer?.invalidate()
    scanTimer = Timer.scheduledTimer(withTimeInterval: 12, repeats: false) { [weak self] _ in
      self?.stopScanInternal(emitStopped: true)
    }
  }

  func stopScan() {
    stopScanInternal(emitStopped: true)
  }

  private func stopScanInternal(emitStopped: Bool) {
    scanTimer?.invalidate()
    scanTimer = nil
    let was = scanning
    scanning = false
    sdk.veepooSDKStopScanDevice()
    if was && emitStopped { emitEvent("scan", ["state": "stopped"]) }
  }

  private func onScanned(_ found: VPPeripheralModel?) {
    guard let found = found, let peripheral = found.peripheral else { return }
    let id = peripheral.identifier.uuidString
    scanned[id] = found
    if let pending = pendingConnect, pending.id == id {
      pendingConnect = nil
      stopScanInternal(emitStopped: true)
      connectModel(found, id: id, confirm: pending.confirm, token: pending.token)
      return
    }
    guard scanning else { return }
    let rssi = (kvc(found, "RSSI") as? NSNumber)?.intValue
    emitEvent("scan", ["state": "found", "id": id, "name": found.deviceName, "rssi": rssi])
  }

  // MARK: - 2-bosqich: ulanish

  /// [confirmOnWatch] true: qo'lda ulash, soat ekranida tasdiq so'raydi. false: avto-qayta ulash.
  func connect(id: String, confirmOnWatch: Bool) {
    guard isBluetoothEnabled() else {
      currentId = id
      ready = false
      emitConn("error", message: "Telefonda Bluetooth o'chiq", reason: "bluetoothOff")
      return
    }
    currentId = id
    ready = false
    session += 1
    let token = session
    emitConn("connecting")
    if let found = scanned[id] {
      stopScanInternal(emitStopped: true)
      connectModel(found, id: id, confirm: confirmOnWatch, token: token)
      return
    }
    // Saqlangan soat (ilova qayta ochilgan): avval skanda topamiz. [?] retrievePeripherals bilan tezroq bo'lishi mumkin.
    log("[connect] \(id) skanda qidirilmoqda")
    pendingConnect = (id, confirmOnWatch, token)
    startScan()
    DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
      guard let self = self, let pending = self.pendingConnect, pending.token == token else { return }
      self.pendingConnect = nil
      self.stopScanInternal(emitStopped: true)
      self.emitConn("error", message: "Soat topilmadi (yaqinda va yoqilganmi?)")
    }
  }

  private func connectModel(_ found: VPPeripheralModel, id: String, confirm: Bool, token: Int) {
    guard token == session else { return }
    sdk.deviceShowConfirm = confirm
    sdk.veepooSDKConnectDevice(found) { [weak self] state in
      DispatchQueue.main.async { self?.onConnectBlock(state.rawValue, token: token) }
    }
  }

  /// DeviceConnectState: 0 Bluetooth o'chiq, 1 ulanmoqda, 2 ulandi, 3 ulanmadi, 4 parol to'g'ri, 5 parol xato.
  private func onConnectBlock(_ raw: Int, token: Int) {
    guard token == session else { return }
    log("[connect] holat=\(raw)")
    switch raw {
    case 0:
      emitConn("error", message: "Telefonda Bluetooth o'chiq", reason: "bluetoothOff")
    case 2:
      emitConn("authenticating")
    case 3:
      emitConn("error", message: "Ulanib bo'lmadi")
    case 4:
      markReady()
    case 5:
      emitConn("error", message: "Soat paroli noto'g'ri (standart: 0000)")
      disconnect()
    default:
      break
    }
  }

  /// VPDeviceConnectState: 0 uzildi, 3 parol to'g'ri, 6 ulanish vaqti tugadi, 7 soatda tasdiqlash vaqti tugadi.
  private func onDeviceConnectState(_ raw: Int) {
    switch raw {
    case 0:
      guard ready || lastState == "connecting" || lastState == "authenticating" else { return }
      ready = false
      if isBluetoothEnabled() {
        emitConn("disconnected", message: "Soat bilan aloqa uzildi")
      } else {
        emitConn("disconnected", message: "Bluetooth o'chirildi", reason: "bluetoothOff")
      }
    case 3:
      markReady()
    case 6:
      if !ready { emitConn("error", message: "Ulanish vaqti tugadi") }
    case 7:
      emitConn("error", message: "Soat ekranida tasdiqlash vaqti tugadi")
      disconnect()
    default:
      break
    }
  }

  private func markReady() {
    if ready { return }
    ready = true
    lastDataSync = nil
    emitConn("ready")
    emitDeviceInfo()
  }

  /// Android'dagi "pwd" va "features" hodisalari: versiyalar va imkoniyatlar (watch-info.ts yig'adi).
  private func emitDeviceInfo() {
    guard let m = model else { return }
    emitData("pwd", [
      "status": "CHECK_SUCCESS",
      "deviceVersion": m.deviceVersion,
      "deviceTestVersion": m.deviceTestVersion,
      "deviceNumber": Int(m.deviceNumber),
    ])
    let flag = { (v: Int?) -> String in (v ?? 0) > 0 ? "SUPPORT" : "UNSUPPORT" }
    emitData("features", [
      "bloodGlucose": flag(int(kvc(m, "bloodGlucoseType"))),
      "bloodComponent": flag(int(kvc(m, "bloodAnalysisType"))),
      "bloodPressure": flag(int(kvc(m, "bloodPressureType"))),
      "temperature": flag(int(kvc(m, "temperatureType"))),
      "precisionSleep": (int(kvc(m, "sleepType")) ?? 0) == 0 ? "UNSUPPORT" : "SUPPORT",
      "autoMeasure": "SUPPORT",
      "textImagePush": flag(int(kvc(m, "textAndImageTransmissionType"))),
    ])
    log(
      "[device] mac=\(m.deviceAddress ?? "-") bpType=\(int(kvc(m, "bloodPressureType")) ?? -1) " +
        "cpu=\(int(kvc(m, "CPUType")) ?? -1) sleep=\(int(kvc(m, "sleepType")) ?? -1) saveDays=\(watchDays) " +
        "hrvTest=\(int(kvc(m, "isSupportHRVTest")) ?? -1) stress=\(int(kvc(m, "stressType")) ?? -1) " +
        "healthGlance=\(int(kvc(m, "healthGlanceType")) ?? -1) manual=\(int(kvc(m, "supportManualTestType")) ?? -1)"
    )
  }

  private func dropConnection() {
    session += 1
    ready = false
    pendingConnect = nil
    sdk.veepooSDKDisconnectDevice()
  }

  func disconnect() {
    dropConnection()
    emitConn("disconnected")
  }

  func readBattery() {
    guard requireReady("readBattery") else { return }
    pm?.veepooSDKReadDeviceBatteryAndChargeInfo { [weak self] isPercent, chargeState, isLow, battery in
      DispatchQueue.main.async {
        // Foiz bo'lmasa — daraja (1-4), Android BatteryData kabi.
        let level: Int? = isPercent ? nil : Int(battery)
        let percent: Int? = isPercent ? Int(battery) : nil
        self?.emitData("battery", [
          "level": level,
          "percent": percent,
          "isPercent": isPercent,
          "isLow": isLow,
          "state": Int(chargeState.rawValue),
        ])
      }
    }
  }

  // MARK: - 3-bosqich: o'lchovlar
  //
  // iOS SDK holatlari Android nomlariga o'giriladi (measure.ts shu nomlarni kutadi). iOS'da xato holati o'lchovni
  // darhol tugatadi (Android'da esa bir necha paket keladi): bunday hodisaga `final: true` qo'shiladi, measure.ts uni
  // ketma-ket 3 marta kutmasdan darhol xato qiladi.

  func startHeart() {
    guard requireReady("startHeart") else { return }
    pm?.veepooSDKTestHeartStart(true) { [weak self] state, value in
      DispatchQueue.main.async {
        // VPTestHeartState: 0 boshlandi, 1 o'lchanmoqda, 2 taqilmagan, 3 band, 4 tugadi.
        switch state.rawValue {
        case 2: self?.emitData("heart", ["status": "STATE_HEART_WEAR_ERROR", "final": true])
        case 3: self?.emitData("heart", ["status": "STATE_HEART_BUSY", "final": true])
        case 1: self?.emitData("heart", ["status": "STATE_HEART_NORMAL", "value": Int(value)])
        default: break
        }
      }
    }
  }

  func stopHeart() {
    guard ready else { return }
    pm?.veepooSDKTestHeartStart(false, testResult: nil)
  }

  func startSpo2() {
    guard requireReady("startSpo2") else { return }
    pm?.veepooSDKTestOxygenStart(true) { [weak self] state, value in
      DispatchQueue.main.async {
        // VPTestOxygenState: 1 o'lchanmoqda, 2 taqilmagan, 3 band, 5 funksiya yo'q, 6/7 kalibrlash, 8 vaqtincha yo'q.
        switch state.rawValue {
        case 1: self?.emitData("spo2", ["value": Int(value), "deviceState": "NORMAL"])
        case 2: self?.emitData("spo2", ["deviceState": "UNPASS_WEAR", "final": true])
        case 3: self?.emitData("spo2", ["deviceState": "BUSY", "final": true])
        case 5, 8: self?.emitData("spo2", ["deviceState": "UNSUPPORTED", "final": true])
        case 6: self?.emitData("spo2", ["deviceState": "CALIBRATION", "progress": Int(value)])
        default: break
        }
      }
    }
  }

  func stopSpo2() {
    guard ready else { return }
    pm?.veepooSDKTestOxygenStart(false, testResult: nil)
  }

  func startTemp() {
    guard requireReady("startTemp") else { return }
    pm?.veepooSDK_temperatureTestStart(true, result: { [weak self] state, enable, progress, tempValue, original in
      DispatchQueue.main.async {
        // VPTemperatureTestState: 0 qo'llanmaydi, 1 o'lchanmoqda, 2 to'xtadi, 9 taqilmagan. Qiymat 10 baravar.
        switch state.rawValue {
        case 0: self?.emitData("temp", ["oprate": 0])
        case 9: self?.emitData("temp", ["notWorn": true, "final": true])
        case 2: self?.emitData("temp", ["oprate": 2])
        default:
          self?.emitData("temp", [
            "temp": tempValue > 0 ? Double(tempValue) / 10.0 : 0,
            "base": Double(original) / 10.0,
            "progress": Int(progress),
            "deviceState": enable ? 0 : 1,
            "oprate": 1,
          ])
        }
      }
    })
  }

  func stopTemp() {
    guard ready else { return }
    pm?.veepooSDK_temperatureTestStart(false, result: nil)
  }

  /// EKG: iOS har chaqiruvda butun natijani (`VPECGTestDataModel`) beradi. Android'dagi soniyalik "ecg" holati,
  /// "ecgWave" (yangi nuqtalar, mV) va oxirgi natija shundan yasaladi.
  private var ecgSent = 0

  func startEcg() {
    guard requireReady("startEcg") else { return }
    ecgSent = 0
    var infoSent = false
    pm?.veepooSDKTestECGStart(true) { [weak self] state, progress, ecg in
      DispatchQueue.main.async {
        guard let self = self else { return }
        if let ecg = ecg, !infoSent {
          infoSent = true
          self.emitData("ecgInfo", ["frequency": self.int(ecg.frequency), "drawFrequency": self.int(ecg.uploadFrequency)])
        }
        self.onEcg(state: state.rawValue, progress: Int(progress), ecg: ecg)
      }
    }
  }

  private func onEcg(state: Int, progress: Int, ecg: VPECGTestDataModel?) {
    // VPTestECGState: 0 boshlandi, 1 o'lchanmoqda, 2 elektrod uzildi, 3 band, 4 qo'lda to'xtatildi, 5 xato,
    // 6 tugadi, 7 funksiya yo'q.
    if let ecg = ecg { emitEcgWave(ecg) }
    let last = { (xs: NSArray?) -> Int? in self.int(xs?.lastObject) }
    switch state {
    case 0, 1:
      emitData("ecg", [
        "dataType": 1, "deviceState": "NORMAL", "wear": 0, "progress": progress,
        "hr1": last(ecg?.muHearts), "hr2": last(ecg?.muHearts), "hrv": last(ecg?.muHrvs),
        "qtc": last(ecg?.muQTs), "br2": last(ecg?.muResRates), "rr2": last(ecg?.muRrs),
      ])
    case 2:
      emitData("ecg", ["dataType": 1, "deviceState": "NORMAL", "wear": 1, "progress": progress])
    case 3:
      emitData("ecg", ["dataType": 1, "deviceState": "BUSY", "final": true])
    case 5, 7:
      emitData("ecg", ["dataType": 3])
    case 6:
      let rrs = (ecg?.rrs as? [Any])?.compactMap { self.int($0) }.filter { $0 > 0 } ?? []
      let rrAverage: Int? = rrs.isEmpty ? nil : rrs.reduce(0, +) / rrs.count
      emitData("ecg", [
        "dataType": 4,
        "hr2": int(ecg?.aveHeart), "hrv": int(ecg?.aveHrv), "qtc": int(ecg?.aveQT), "br2": int(ecg?.aveResRate),
        "rr2": rrAverage,
      ])
    default:
      break
    }
  }

  private func emitEcgWave(_ ecg: VPECGTestDataModel) {
    guard let signals = ecg.filterSignals as? [Any], signals.count > ecgSent else { return }
    let fresh = signals[ecgSent...]
    ecgSent = signals.count
    let gain = ecg.getGainValue()
    var mv: [Double] = []
    var adc: [Int] = []
    for raw in fresh {
      guard let value = double(raw) else { continue }
      let v = VPECGTestDataModel.convertToMv(withValue: CGFloat(value), ecgType: ecg.ecgType ?? "", testType: ecg.type ?? "", gain: gain)
      mv.append((Double(v) * 1000).rounded() / 1000)
      adc.append(Int(value))
    }
    emitData("ecgWave", ["n": mv.count, "mv": mv, "adc": adc, "ecgType": int(ecg.ecgType) ?? 0])
  }

  func stopEcg() {
    guard ready else { return }
    pm?.veepooSDKTestECGStart(false, testResult: nil)
  }

  func startGlucose() {
    guard requireReady("startGlucose") else { return }
    let type = int(kvc(model, "bloodGlucoseType")) ?? 0
    emitData("glucoseSupport", ["detect": type > 0, "any": type > 0])
    pm?.veepooSDKTestBloodGlucoseStart(true, isPersonalModel: false, testResult: { [weak self] state, progress, value, level in
      DispatchQueue.main.async {
        // VPDeviceBloodGlucoseTestState: 0 qo'llanmaydi, 1 o'lchanmoqda, 2 to'xtadi, 3 batareya, 4 band, 5 taqilmagan.
        // Qiymat 100 baravar; daraja 1/2/3 — past/o'rta/yuqori xavf (faqat bloodGlucoseType == 5 da).
        switch state.rawValue {
        case 0: self?.emitData("glucoseError", ["status": "NONSUPPORT"])
        case 3: self?.emitData("glucoseError", ["status": "LOW_POWER"])
        case 4: self?.emitData("glucoseError", ["status": "BUSY"])
        case 5: self?.emitData("glucoseError", ["status": "WEARING_ERROR"])
        case 2: self?.emitData("glucoseStop")
        default:
          let risk = [1: "LOW", 2: "MIDDLE", 3: "HIGH"][Int(level)] ?? "NONE"
          self?.emitData("glucose", ["progress": Int(progress), "value": Double(value) / 100.0, "risk": risk])
        }
      }
    })
  }

  func stopGlucose() {
    guard ready else { return }
    pm?.veepooSDKTestBloodGlucoseStart(false, isPersonalModel: false, testResult: nil)
  }

  private func bloodFields(_ r: VPBloodAnalysisResultModel?) -> [String: Any?] {
    // [?] Birliklar: siydik kislotasi µmol/l, qolganlari mmol/l deb olindi (measure.ts oraliqlarni tekshiradi).
    [
      "uricAcid": r?.uricAcidValue, "tcho": r?.totalCholesterolValue, "tag": r?.triglycerideValue,
      "hdl": r?.highDensityLipoproteinValue, "ldl": r?.lowDensityLipoproteinValue,
    ]
  }

  func startBloodComponent() {
    guard requireReady("startBloodComponent") else { return }
    pm?.veepooSDKTestBloodAnalysisStart(true, isPersonalModel: false, progress: { [weak self] p in
      DispatchQueue.main.async {
        self?.emitData("blood", ["progress": Int(((p?.fractionCompleted ?? 0) * 100).rounded())])
      }
    }, testResult: { [weak self] state, result in
      DispatchQueue.main.async {
        guard let self = self else { return }
        // VPDeviceBloodAnalysisState: 0 yo'q, 1 band, 2 to'xtatildi, 3 batareya, 4 xato, 5 taqilmagan, 6 tugadi.
        switch state.rawValue {
        case 0: self.emitData("bloodError", ["state": "UNSUPPORTED"])
        case 1: self.emitData("bloodError", ["state": "BUSY"])
        case 3: self.emitData("bloodError", ["state": "LOW_POWER"])
        case 4: self.emitData("bloodError", ["state": "UNKNOWN"])
        case 5: self.emitData("bloodError", ["state": "WEAR_ERROR"])
        case 2: self.emitData("bloodStop")
        case 6:
          self.log("[blood] natija: \(self.bloodFields(result).compactMapValues { $0 })")
          self.emitData("bloodDone", self.bloodFields(result))
        default: break
        }
      }
    })
  }

  func stopBloodComponent() {
    guard ready else { return }
    pm?.veepooSDKTestBloodAnalysisStart(false, isPersonalModel: false, progress: nil, testResult: nil)
  }

  func startHrv() {
    guard requireReady("startHrv") else { return }
    guard (int(kvc(model, "isSupportHRVTest")) ?? 0) != 0 else {
      emitData("hrvError", ["state": "UNSUPPORTED"])
      return
    }
    pm?.veepooSDK_HRVTest(true) { [weak self] con, ack, value in
      DispatchQueue.main.async {
        // con: 0 qo'llanmaydi, 1 boshlandi, 2 to'xtadi. ack (VPTestHRVState): 2 batareya, 3 band, 4 taqilmagan.
        if con == 0 {
          self?.emitData("hrvError", ["state": "UNSUPPORTED"])
          return
        }
        switch ack.rawValue {
        case 2: self?.emitData("hrvError", ["state": "LOW_POWER"])
        case 3: self?.emitData("hrvError", ["state": "BUSY"])
        case 4: self?.emitData("hrvError", ["state": "WEAR_OFF"])
        default:
          if con == 2 {
            self?.emitData("hrvStop")
          } else if value > 0 {
            self?.emitData("hrv", ["value": Int(value)])
          }
        }
      }
    }
  }

  func stopHrv() {
    guard ready else { return }
    pm?.veepooSDK_HRVTest(false, callBack: nil)
  }

  func startStress() {
    guard requireReady("startStress") else { return }
    guard (int(kvc(model, "stressType")) ?? 0) > 1 else {
      emitData("stressError", ["state": "UNSUPPORTED"])
      return
    }
    pm?.veepooSDK_stressTestStart(true, result: { [weak self] state, progress, stress in
      DispatchQueue.main.async {
        // VPDeviceStressTestState: 0 yo'q, 1 band, 2 to'xtatildi, 3 batareya, 4 taqilmagan, 5 tugadi.
        // [?] O'lchov davomidagi progress qaysi holat bilan kelishi hujjatda yo'q: 5 dan boshqa holatda ham foiz o'tkaziladi.
        switch state.rawValue {
        case 0: self?.emitData("stressError", ["state": "UNSUPPORTED"])
        case 1: self?.emitData("stressError", ["state": "BUSY"])
        case 3: self?.emitData("stressError", ["state": "LOW_POWER"])
        case 4: self?.emitData("stressError", ["state": "WEAR_OFF"])
        case 2: self?.emitData("stressStop")
        case 5:
          if progress >= 100 {
            self?.emitData("stressDone", ["value": Int(stress)])
          } else {
            self?.emitData("stress", ["progress": Int(progress)])
          }
        default:
          self?.emitData("stress", ["progress": Int(progress)])
        }
      }
    })
  }

  func stopStress() {
    guard ready else { return }
    pm?.veepooSDK_stressTestStart(false, result: nil)
  }

  func startMet() {
    guard requireReady("startMet") else { return }
    pm?.veepooSDK_metTest(true) { [weak self] con, ack, progress, value in
      DispatchQueue.main.async {
        if con == 0 {
          self?.emitData("metError", ["state": "UNSUPPORTED"])
          return
        }
        switch ack.rawValue {
        case 2: self?.emitData("metError", ["state": "LOW_POWER"])
        case 3: self?.emitData("metError", ["state": "BUSY"])
        case 4: self?.emitData("metError", ["state": "WEAR_OFF"])
        default:
          if con == 2 {
            self?.emitData("metStop")
          } else {
            self?.emitData("met", ["progress": Int(progress), "value": Double(value)])
          }
        }
      }
    }
  }

  func stopMet() {
    guard ready else { return }
    pm?.veepooSDK_metTest(false, callBack: nil)
  }

  /// BodyComponent'ning 14 ta qiymati, Android nomlari bilan (measure.ts `parseBodyParts` oraliqlarni tekshiradi).
  private func bodyParts(_ b: VPBodyCompositionValueModel) -> [String: Any?] {
    [
      "bmi": double(b.bmi), "fatPct": double(b.bodyFatPercentage), "fatKg": double(b.fatMass),
      "ffmKg": double(b.leanBodyMass), "musclePct": double(b.muscleRate), "muscleKg": double(b.muscleMass),
      "subFatPct": double(b.subcutaneousFat), "waterPct": double(b.bodyMoisture), "waterKg": double(b.waterContent),
      "skeletalPct": double(b.skeletalMuscleRate), "boneKg": double(b.boneMass),
      "proteinPct": double(b.proportionOfProtein), "proteinKg": double(b.proteinAmount),
      "bmr": double(b.basalMetabolicRate),
    ]
  }

  func startBodyComp() {
    guard requireReady("startBodyComp") else { return }
    guard (int(kvc(model, "bodyCompositionType")) ?? 0) > 0 else {
      emitData("bodyError", ["state": "UNSUPPORTED"])
      return
    }
    pm?.veepooSDKTestBodyCompositionStart(true, progress: { [weak self] lead, p in
      DispatchQueue.main.async {
        self?.emitData("body", ["progress": Int(((p?.fractionCompleted ?? 0) * 100).rounded()), "lead": Int(lead)])
      }
    }, testResult: { [weak self] state, result in
      DispatchQueue.main.async {
        guard let self = self else { return }
        // VPDeviceBodyCompositionState: 0 yo'q, 1 band, 2 to'xtatildi, 3 batareya, 4 xato, 5 tugadi.
        switch state.rawValue {
        case 0: self.emitData("bodyError", ["state": "UNSUPPORTED"])
        case 1: self.emitData("bodyError", ["state": "BUSY"])
        case 3: self.emitData("bodyError", ["state": "LOW_POWER"])
        case 4: self.emitData("bodyError", ["state": "FAILED"])
        case 2: self.emitData("bodyStop")
        case 5:
          guard let result = result else { return self.emitData("bodyError", ["state": "FAILED"]) }
          self.emitData("bodyDone", self.bodyParts(result))
        default: break
        }
      }
    })
  }

  func stopBodyComp() {
    guard ready else { return }
    pm?.veepooSDKTestBodyCompositionStart(false, progress: nil, testResult: nil)
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

  // MARK: - 4-bosqich: soat xotirasi (qo'lda o'lchovlar)

  /// JS turi → SDK `VPManualTestDataType` biti.
  private static let manualBits: [String: UInt] = [
    "bp": 1 << 0, "hr": 1 << 1, "glucose": 1 << 2, "spo2": 1 << 4, "temp": 1 << 5, "met": 1 << 6, "hrv": 1 << 7,
    "blood": 1 << 8,
  ]

  /// Qiymatlar xom holda yuboriladi (harorat 10, shakar 100 baravar ...): watch-history.ts ularni o'zi o'giradi.
  private func manualRecords(_ m: VPManualTestDataModel, kind: String) -> [[String: Any?]] {
    func list(_ key: String) -> [NSObject] { (kvc(m, key) as? [NSObject]) ?? [] }
    func ts(_ o: NSObject) -> Int { int(kvc(o, "timestamp")) ?? 0 }
    func values(_ o: NSObject, _ key: String) -> [Int] { ((kvc(o, key) as? [Any]) ?? []).compactMap { int($0) } }
    typealias Row = [String: Any?]
    switch kind {
    case "bp":
      return list("bloodPressureArr").map { o -> Row in
        ["at": ts(o), "sys": int(kvc(o, "h_bp")), "dia": int(kvc(o, "l_bp")), "hr": int(kvc(o, "heart")),
         "mode": int(kvc(o, "testModel")), "version": int(kvc(o, "protocol")), "status": int(kvc(o, "state")),
         "credibility": int(kvc(o, "credibility"))]
      }
    case "hr": return list("heartRateArr").map { o -> Row in ["at": ts(o), "values": values(o, "heartArray")] }
    case "spo2": return list("bloodOxygenArr").map { o -> Row in ["at": ts(o), "values": values(o, "bloodOxygenArray")] }
    case "temp": return list("bodyTempArr").map { o -> Row in ["at": ts(o), "value": int(kvc(o, "bodyTemp"))] }
    case "glucose":
      return list("bloodSugarArr").map { o -> Row in
        let level = int(kvc(o, "bloodSugarLevel")) ?? 0
        let risk: String? = [1: "LOW", 2: "MIDDLE", 3: "HIGH"][level]
        return ["at": ts(o), "value": int(kvc(o, "bloodSugarValue")), "risk": risk]
      }
    case "blood":
      return list("bloodCompArr").map { o -> Row in
        ["at": ts(o), "uricAcid": int(kvc(o, "uricAcid")), "tcho": int(kvc(o, "totalCholesterol")),
         "tag": int(kvc(o, "triglyceride")), "hdl": int(kvc(o, "highDensityLipoprotein")),
         "ldl": int(kvc(o, "lowDensityLipoprotein"))]
      }
    case "hrv":
      return list("hrvArr").map { o -> Row in
        let v = kvc(o, "hrvArray")
        let arr: [Int] = (v as? [Any])?.compactMap { int($0) } ?? [int(v)].compactMap { $0 }
        return ["at": ts(o), "values": arr]
      }
    case "met": return list("metArr").map { o -> Row in ["at": ts(o), "value": int(kvc(o, "value"))] }
    default: return []
    }
  }

  /// Soatning o'zida o'lchangan bosim: "manualBp" {records}, keyin {complete} yoki {failed}.
  func readManualBp(sinceSec: Int) {
    guard requireReady("readManualBp") else { return }
    readManual(sinceSec: sinceSec, kinds: ["bp"]) { [weak self] kind, records, done in
      guard let self = self else { return }
      if let records = records { self.emitData("manualBp", ["records": records]) }
      if done == "complete" { self.emitData("manualBp", ["complete": true]) }
      if done == "failed" { self.emitData("manualBp", ["failed": true]) }
      _ = kind
    }
  }

  /// History sinxroni: "manualData" {kind, records} har tur uchun, oxirida {complete} yoki {failed}.
  func readManualData(sinceSec: Int, kinds: [String]) {
    guard requireReady("readManualData") else { return }
    readManual(sinceSec: sinceSec, kinds: kinds) { [weak self] kind, records, done in
      guard let self = self else { return }
      if let kind = kind, let records = records { self.emitData("manualData", ["kind": kind, "records": records]) }
      if let done = done { self.emitData("manualData", [done: true]) }
    }
  }

  private func readManual(
    sinceSec: Int, kinds: [String],
    emit: @escaping (_ kind: String?, _ records: [[String: Any?]]?, _ done: String?) -> Void
  ) {
    let wanted = kinds.filter { Self.manualBits[$0] != nil }
    guard !wanted.isEmpty else { return emit(nil, nil, "complete") }
    let bits = wanted.reduce(UInt(0)) { $0 | (Self.manualBits[$1] ?? 0) }
    var finished = false
    pm?.readManualTestData(withTimestamp: UInt32(max(0, sinceSec)), dataType: VPManualTestDataType(rawValue: bits)) {
      [weak self] result in
      DispatchQueue.main.async {
        guard let self = self, !finished else { return }
        finished = true
        guard let result = result else { return emit(nil, nil, "failed") }
        for kind in wanted { emit(kind, self.manualRecords(result, kind: kind), nil) }
        emit(nil, nil, "complete")
      }
    }
  }

  // MARK: - 4-bosqich: kunlik ma'lumot (SDK bazasi orqali)
  //
  // iOS SDK avto-o'lchovlarni avval o'z bazasiga o'qiydi (`veepooSdkStartReadDeviceAllData`), keyin ilova sana va MAC
  // bo'yicha bazadan oladi. Android'dagi "dailyData" {records} shakli shu yerda yasaladi.

  private var dataSyncWaiters: [(Bool) -> Void] = []
  private var lastDataSync: Date?

  /// Soatdagi barcha kunlik ma'lumotni SDK bazasiga o'qiydi (bir vaqtda bitta o'qish; 60 s ichida qayta o'qimaydi).
  private func syncAllData(_ done: @escaping (Bool) -> Void) {
    if let last = lastDataSync, Date().timeIntervalSince(last) < 60 { return done(true) }
    dataSyncWaiters.append(done)
    guard dataSyncWaiters.count == 1 else { return }
    var finished = false
    let finish = { [weak self] (ok: Bool) in
      guard let self = self, !finished else { return }
      finished = true
      if ok { self.lastDataSync = Date() }
      let waiters = self.dataSyncWaiters
      self.dataSyncWaiters = []
      waiters.forEach { $0(ok) }
    }
    log("[sync] soatdan kunlik ma'lumot o'qilmoqda")
    pm?.veepooSdkStartReadDeviceAllData { [weak self] state, total, current, progress in
      DispatchQueue.main.async {
        // VPReadDeviceBaseDataState: 0 boshlandi, 1 o'qilmoqda, 2 tugadi, 3 yaroqsiz.
        if state.rawValue == 2 { finish(true) }
        if state.rawValue == 3 {
          self?.log("[sync] o'qish yaroqsiz (holat 3)")
          finish(false)
        }
        _ = (total, current, progress)
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 120) { [weak self] in
      if !finished { self?.log("[sync] 120 s ichida tugamadi, bazadagi bor ma'lumot olinadi") }
      finish(false)
    }
  }

  func readDailyData(days: Int) {
    guard requireReady("readDailyData") else { return }
    let span = min(max(days, 1), watchDays)
    syncAllData { [weak self] ok in
      guard let self = self else { return }
      for day in 0..<span { self.emitDailyDay(day) }
      self.emitData("dailyData", ok ? ["complete": true] : ["timeout": true])
    }
  }

  /// iOS'da kunning bir qismini o'qib bo'lmaydi: kun har doim bazadan to'liq beriladi (`position` e'tiborsiz).
  func readDailyDay(day: Int, position: Int) {
    guard requireReady("readDailyDay") else { return }
    _ = position
    let d = min(max(day, 0), watchDays - 1)
    syncAllData { [weak self] ok in
      guard let self = self else { return }
      self.emitDailyDay(d)
      self.emitData("dailyData", ok ? ["complete": true] : ["timeout": true, "day": d])
    }
  }

  private func emitDailyDay(_ day: Int) {
    guard let table = tableID else { return }
    let date = dateString(daysAgo: day)
    let parts = date.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return }
    var slots: [String: [String: Any?]] = [:]
    func slot(_ hhmm: String) -> String? {
      let t = hhmm.split(separator: ":").compactMap { Int($0) }
      return t.count >= 2 ? String(format: "%02d:%02d", t[0], t[1]) : nil
    }
    func put(_ key: String?, _ fields: [String: Any?]) {
      guard let key = key else { return }
      var row = slots[key] ?? [:]
      for (k, v) in fields where v != nil { row[k] = v }
      slots[key] = row
    }
    func ints(_ v: Any?) -> [Int]? {
      let xs = ((v as? [Any]) ?? []).compactMap { int($0) }.filter { $0 > 0 }
      return xs.isEmpty ? nil : xs
    }

    // Puls, bosim, qadam (5 daqiqalik): {"10:40": {heartValue, systolic, diastolic, stepValue, calValue, disValue, ppgs}}
    if let original = VPDataBaseOperation.veepooSDKGetOriginalData(withDate: date, andTableID: table) {
      for (k, v) in original {
        guard let key = k as? String, let f = v as? [String: Any] else { continue }
        put(slot(key), [
          "hr": positive(int(f["heartValue"])), "sys": positive(int(f["systolic"])), "dia": positive(int(f["diastolic"])),
          "step": positive(int(f["stepValue"])), "cal": double(f["calValue"]).flatMap { $0 > 0 ? $0 : nil },
          "dis": double(f["disValue"]).flatMap { $0 > 0 ? $0 : nil }, "hrs": ints(f["ppgs"]) ?? ints(f["ecgs"]),
        ])
      }
    }
    // SpO2: [{Time, OxygenValue, ...}]
    for item in (VPDataBaseOperation.veepooSDKGetDeviceOxygenData(withDate: date, andTableID: table) as? [Any]) ?? [] {
      guard let f = item as? [String: Any], let time = f["Time"] as? String, let v = positive(int(f["OxygenValue"])) else {
        continue
      }
      put(slot(time), ["spo2": [v]])
    }
    // Shakar: [{time, bloodGlucoses: ["5.60", ...], bloodGlucoseLevels}]
    for item in (VPDataBaseOperation.veepooSDKGetDeviceBloodGlucoseData(withDate: date, andTableID: table) as? [Any]) ?? [] {
      guard let f = item as? [String: Any], let time = f["time"] as? String else { continue }
      let values = ((f["bloodGlucoses"] as? [Any]) ?? []).compactMap { double($0) }.filter { $0 > 0 }
      if let v = values.last { put(slot(time), ["glucose": v]) }
    }
    // Harorat: kalitlar header'da e'lon qilinmagan, nom qismi bo'yicha qidiriladi. [?]
    for item in (VPDataBaseOperation.veepooSDKGetDeviceTemperatureData(withDate: date, andTableID: table) as? [Any]) ?? [] {
      guard let f = item as? [String: Any] else { continue }
      func find(_ part: String, excluding: String? = nil) -> Any? {
        f.first(where: { k, _ in
          let key = k.lowercased()
          return key.contains(part) && !(excluding.map { key.contains($0) } ?? false)
        })?.value
      }
      guard let h = int(find("hour")), let mi = int(find("minute")),
            let v = double(find("value", excluding: "orig")), v > 0 else { continue }
      put(String(format: "%02d:%02d", h, mi), ["temp": v])
    }
    // Qon tahlili: VPDailyBloodAnalysisModel {time, totalCholesterols[], triglycerides[], ...}
    for item in VPDataBaseOperation.veepooSDKGetDeviceBloodAnalysisData(withDate: date, andTableID: table) ?? [] {
      let last = { (key: String) -> Double? in ((self.kvc(item, key) as? [Any]) ?? []).compactMap { self.double($0) }.last }
      let blood: [String: Any?] = [
        "uricAcid": last("uricAcids"), "tcho": last("totalCholesterols"), "tag": last("triglycerides"),
        "hdl": last("highDensityLipoproteins"), "ldl": last("lowDensityLipoproteins"),
      ]
      guard blood.values.contains(where: { ($0 as? Double ?? 0) > 0 }), let time = kvc(item, "time") as? String else {
        continue
      }
      put(slot(time), ["blood": blood.compactMapValues { $0 }])
    }

    let records: [[String: Any?]] = slots.keys.sorted().compactMap { key in
      let t = key.split(separator: ":").compactMap { Int($0) }
      guard t.count == 2, var row = slots[key] else { return nil }
      row["y"] = parts[0]
      row["mo"] = parts[1]
      row["d"] = parts[2]
      row["h"] = t[0]
      row["mi"] = t[1]
      return row
    }
    emitData("dailyData", ["day": day, "allPackage": 1, "watchDays": watchDays])
    stride(from: 0, to: records.count, by: 200).forEach { start in
      emitData("dailyData", ["records": Array(records[start..<min(start + 200, records.count)])])
    }
  }

  // MARK: - 4-bosqich: qadam, uyqu, soatdagi tana tarkibi

  func readSteps() {
    guard requireReady("readSteps") else { return }
    let emitSteps = { [weak self] (dict: [AnyHashable: Any]?) -> Bool in
      guard let self = self, let dict = dict, let step = self.int(dict["Step"]) else { return false }
      self.emitData("sportStep", ["step": step, "kcal": self.double(dict["Cal"]) ?? 0, "dis": self.double(dict["Dis"]) ?? 0])
      return true
    }
    // To'g'ridan-to'g'ri o'qish; javob bo'lmasa bazadan (demo shunday qiladi). [?]
    pm?.veepooSDK_readStepData(withDayNumber: 0) { [weak self] dict in
      DispatchQueue.main.async {
        if emitSteps(dict) { return }
        guard let self = self, let table = self.tableID else { return }
        VPDataBaseOperation.veepooSDKGetStepData(
          withDate: self.dateString(daysAgo: 0), andTableID: table,
          changeUserStature: self.model?.deviceStature ?? 170
        ) { stepDict in
          DispatchQueue.main.async { _ = emitSteps(stepDict) }
        }
      }
    }
  }

  /// "sleepData" {records} har kun uchun, oxirida {complete}. Android `sleepRecord` maydonlari.
  func readSleep() {
    guard requireReady("readSleep") else { return }
    syncAllData { [weak self] _ in
      guard let self = self, let table = self.tableID else { return }
      let precise = (self.int(self.kvc(self.model, "sleepType")) ?? 0) != 0
      for day in 0..<self.watchDays {
        let date = self.dateString(daysAgo: day)
        var records: [[String: Any?]] = []
        if precise {
          for s in VPDataBaseOperation.veepooSDKGetAccurateSleepData(withDate: date, andTableID: table) ?? [] {
            records.append(self.accurateSleep(s, day: date))
          }
        }
        if records.isEmpty {
          for item in (VPDataBaseOperation.veepooSDKGetSleepData(withDate: date, andTableID: table) as? [Any]) ?? [] {
            if let f = item as? [String: Any] { records.append(self.normalSleep(f, day: date)) }
          }
        }
        if !records.isEmpty { self.emitData("sleepData", ["records": records]) }
      }
      self.emitData("sleepData", ["complete": true])
    }
  }

  private func accurateSleep(_ s: VPAccurateSleepModel, day: String) -> [String: Any?] {
    // Uyqu chizig'i: parseSleepLine → [{index, type}], type: 0 chuqur, 1 yengil, 2 REM, 3 uyqusizlik, 4 uyg'oq.
    // Android'dagi kabi har nuqta bitta belgi bo'lgan satrga o'giriladi (sleep.ts decodeLine).
    let points = (s.parseSleepLine() as [Any]?) ?? []
    let line = points.compactMap { ($0 as? [String: Any]).flatMap { int($0["type"]) } }.map(String.init).joined()
    return [
      "day": day, "date": day, "down": timeMap(s.sleepTime), "up": timeMap(s.wakeTime),
      "all": int(s.sleepDuration), "deep": int(s.deepDuration), "light": int(s.lightDuration),
      "wake": int(s.getUpTimes), "quality": int(s.sleepQuality), "line": line, "precise": true,
      "pointSec": int(s.onePointDuration) ?? 60, "accurateType": int(s.accurateType),
      "getUpScore": int(s.getUpScore), "deepScore": int(s.deepScore), "efficiencyScore": int(s.sleepEfficiencyScore),
      "fallAsleepScore": int(s.fallAsleepScore), "timeScore": int(s.sleepTimeScore), "insomniaScore": int(s.insomniaScore),
      "insomniaTimes": int(s.insomniaTimes), "insomniaMin": int(s.insomniaDuration), "firstDeepMin": int(s.firstDeepDuration),
      "getUpMin": int(s.getUpDuration), "otherMin": int(s.otherDuration), "laster": int(s.lastType), "next": int(s.nextType),
    ]
  }

  private func normalSleep(_ f: [String: Any], day: String) -> [String: Any?] {
    let hours = { (key: String) -> Int? in self.double(f[key]).map { Int(($0 * 60).rounded()) } }
    let total = (int(f["SLE_HOUR"]) ?? 0) * 60 + (int(f["SLE_MINUTE"]) ?? 0)
    return [
      "day": day, "date": day, "down": timeMap(f["SLEEP_TIME"] as? String), "up": timeMap(f["WAKE_TIME"] as? String),
      "all": total > 0 ? total : nil, "deep": hours("DEEP_HOUR"), "light": hours("LIGHT_HOUR"),
      "wake": int(f["WakeUpTime"]), "quality": int(f["SLEEP_LEVEL"]), "line": f["SLE_LINE"] as? String,
      "precise": false,
    ]
  }

  /// Soatning o'zida o'lchangan tana tarkibi: "bodyHistory" {records: [{at: {y, mo, d, h, mi}, id, ...}]}.
  func readBodyHistory() {
    guard requireReady("readBodyHistory") else { return }
    guard (int(kvc(model, "bodyCompositionType")) ?? 0) > 0 else {
      emitData("bodyHistory", ["unsupported": true])
      return
    }
    syncAllData { [weak self] _ in
      guard let self = self, let table = self.tableID else { return }
      var records: [[String: Any?]] = []
      for day in 0..<self.watchDays {
        for b in VPDataBaseOperation.veepooSDKGetDeviceOffStoreBodyComposition(withDate: self.dateString(daysAgo: day), andTableID: table) ?? [] {
          var row = self.bodyParts(b)
          row["at"] = self.timeMap("\(b.date ?? "") \(b.testTime ?? "")")
          row["id"] = "\(b.date ?? "")-\(b.testTime ?? "")"
          records.append(row)
        }
      }
      self.emitData("bodyHistory", ["records": records])
    }
  }

  // MARK: - 5-bosqich: shaxsiy ma'lumot va avto-o'lchash

  func syncPersonInfo(male: Bool, heightCm: Int, weightKg: Int, age: Int, stepGoal: Int, sleepGoalMin: Int) {
    guard requireReady("syncPersonInfo") else { return }
    let info = VPSyncPersonalInfo()
    info.status = Int32(min(max(heightCm, 55), 255)) // `status` — bo'y (sm), SDK'dagi nomi shunday
    info.weight = Int32(min(max(weightKg, 25), 255))
    info.age = Int32(min(max(age, 1), 255))
    info.sex = male ? 1 : 0
    info.targetStep = Int32(min(max(stepGoal, 1), 65535))
    info.targetSleepDuration = Int32(min(max(sleepGoalMin, 0), 1440))
    pm?.veepooSDKSynchronousPersonalInformation(info) { [weak self] result in
      DispatchQueue.main.async {
        self?.emitData("personInfo", ["status": result == 1 ? "SUCCESS" : "FAIL", "code": Int(result)])
      }
    }
  }

  private var autoMeasureCache: [Int: VPAutoMonitTestModel] = [:]
  private static let autoMeasureNames = [
    0: "PULSE_RATE", 1: "BLOOD_PRESSURE", 2: "BLOOD_GLUCOSE", 3: "STRESS", 4: "BLOOD_OXYGEN", 5: "BODY_TEMPERATURE",
    6: "LORENTZ", 7: "HRV", 8: "BLOOD_COMPONENTS", 9: "FALL",
  ]

  private func emitAutoMeasure(_ models: [VPAutoMonitTestModel]) {
    let items: [[String: Any?]] = models.map { m in
      let type = Int(m.type.rawValue)
      autoMeasureCache[type] = m
      return [
        "type": Self.autoMeasureNames[type] ?? "\(type)", "typeValue": type, "on": m.on,
        "stepUnit": Int(m.minStepValue), "intervalModifiable": true, "slotModifiable": m.supportRangeTime,
        "intervalMin": Int(m.timeInterval),
        "startMin": Int(m.startHour) * 60 + Int(m.startMinute), "endMin": Int(m.endHour) * 60 + Int(m.endMinute),
        "supportStartMin": Int(m.startHourRef) * 60 + Int(m.startMinuteRef),
        "supportEndMin": Int(m.endHourRef) * 60 + Int(m.endMinuteRef),
      ]
    }
    emitData("autoMeasure", ["items": items])
  }

  func readAutoMeasure() {
    guard requireReady("readAutoMeasure") else { return }
    pm?.veepooSDKReadAutoMonitSwitchInfo { [weak self] models in
      DispatchQueue.main.async { self?.emitAutoMeasure(models ?? []) }
    }
  }

  func setAutoMeasure(typeValue: Int, on: Bool, intervalMin: Int, startMin: Int, endMin: Int) {
    guard requireReady("setAutoMeasure") else { return }
    guard let m = autoMeasureCache[typeValue] else {
      fail("setAutoMeasure", "\(Self.autoMeasureNames[typeValue] ?? "\(typeValue)") sozlamasi hali o'qilmagan: avval readAutoMeasure")
      return
    }
    m.on = on
    m.timeInterval = UInt16(max(1, min(intervalMin, 65535)))
    if startMin >= 0 {
      m.startHour = UInt8(min(startMin / 60, 23))
      m.startMinute = UInt8(startMin % 60)
    }
    if endMin >= 0 {
      m.endHour = UInt8(min(endMin / 60, 23))
      m.endMinute = UInt8(endMin % 60)
    }
    pm?.veepooSDKSetAutoMonitSwitch(with: m) { [weak self] success, _ in
      DispatchQueue.main.async {
        self?.emitData("autoMeasureResult", ["ok": success])
        if success { self?.readAutoMeasure() }
      }
    }
  }

  /// Avto-o'lchash kalitlari (JS kaliti → VPSettingBaseFunctionSwitchType raqami).
  private static let autoSwitchTypes: [(key: String, raw: Int)] = [
    ("heartRate", 5), ("bloodPressure", 6), ("hrv", 13), ("temperature", 24), ("bloodGlucose", 27), ("bloodComponent", 31),
  ]

  /// Bitta kalitni o'qiydi/yozadi. VPSettingFunctionState: 0 o'qish, 1 yoqish, 2 o'chirish.
  /// Javob (VPSettingFunctionCompleteState): 1 yoqiq, 2 o'chiq, 3 xato, 0 noma'lum (soatda yo'q).
  private func baseSwitch(_ raw: Int, state: Int, _ done: @escaping (Int) -> Void) {
    guard let type = VPSettingBaseFunctionSwitchType(rawValue: raw),
          let setting = VPSettingFunctionState(rawValue: state) else { return done(0) }
    var answered = false
    pm?.veepooSDKSettingBaseFunctionType(type, settingState: setting, complete: { result in
      DispatchQueue.main.async {
        guard !answered else { return }
        answered = true
        done(Int(result.rawValue))
      }
    })
    // Soatda funksiya bo'lmasa javob kelmasligi mumkin.
    DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
      guard !answered else { return }
      answered = true
      done(0)
    }
  }

  private func switchName(_ result: Int) -> String {
    switch result {
    case 1: return "SUPPORT_OPEN"
    case 2: return "SUPPORT_CLOSE"
    case 3: return "UNKONW"
    default: return "UNSUPPORT"
    }
  }

  /// "autoSwitches" {status, heartRate, bloodPressure, hrv, temperature, bloodGlucose, bloodComponent}.
  /// SDK buyruqlarni parallel bajarmaydi: kalitlar ketma-ket o'qiladi.
  func readAutoSwitches() {
    guard requireReady("readAutoSwitches") else { return }
    var out: [String: Any?] = ["status": "READ_SUCCESS"]
    var index = 0
    func next() {
      guard index < Self.autoSwitchTypes.count else { return emitData("autoSwitches", out) }
      let item = Self.autoSwitchTypes[index]
      index += 1
      baseSwitch(item.raw, state: 0) { [weak self] result in
        out[item.key] = self?.switchName(result)
        next()
      }
    }
    next()
  }

  func setAutoSwitch(key: String, on: Bool) {
    guard requireReady("setAutoSwitch") else { return }
    guard let item = Self.autoSwitchTypes.first(where: { $0.key == key }) else {
      fail("setAutoSwitch", "Noma'lum kalit: \(key)")
      return
    }
    baseSwitch(item.raw, state: on ? 1 : 2) { [weak self] result in
      guard let self = self else { return }
      self.emitData("autoSwitches", [
        "status": result == 3 || result == 0 ? "SETTING_FAIL" : "SETTING_SUCCESS",
        item.key: self.switchName(result),
      ])
    }
  }

  /// Kechasi SpO2: iOS'da faqat yoqish/o'chirish (vaqt oralig'i yo'q; soat 0-7 da o'lchaydi, hujjat). [?]
  func readSpo2Night() {
    guard requireReady("readSpo2Night") else { return }
    baseSwitch(1000, state: 0) { [weak self] result in
      self?.emitData("spo2Night", [
        "result": result == 0 || result == 3 ? "READ_FAIL" : "READ_SUCCESS",
        "open": result == 1, "startMin": 0, "endMin": 420,
      ])
    }
  }

  func setSpo2Night(on: Bool, startMin: Int, endMin: Int) {
    guard requireReady("setSpo2Night") else { return }
    _ = (startMin, endMin)
    baseSwitch(1000, state: on ? 1 : 2) { [weak self] result in
      self?.emitData("spo2Night", [
        "result": result == 0 || result == 3 ? "SETTING_FAIL" : "SETTING_SUCCESS",
        "open": result == 1, "startMin": 0, "endMin": 420,
      ])
    }
  }

  // MARK: - 5-bosqich: eslatmalar

  /// iOS VPDeviceHealthRemindType raqami → Android (JS) nomi.
  private static let healthNames = [
    1: "SEDENTARY", 2: "DRINK_WATER", 3: "OVERLOOK", 4: "SPORTS", 5: "TAKE_MEDICINE", 6: "READING", 7: "GOING_OUT",
    8: "WASH",
  ]

  private func healthMap(_ h: VPDeviceHealthRemindModel) -> [String: Any?] {
    [
      "type": Self.healthNames[Int(h.type.rawValue)] ?? "\(h.type.rawValue)", "on": h.open,
      "start": Int(h.startHour) * 60 + Int(h.startMinute), "end": Int(h.endHour) * 60 + Int(h.endMinute),
      "interval": Int(h.remindInterval),
    ]
  }

  /// "healthRemind" {op}: item, read, readFailed, set, setFailed, report (Android bilan bir xil).
  func readHealthReminds() {
    guard requireReady("readHealthReminds") else { return }
    var ended = false
    pm?.veepooSDKSettingHealthRemind(with: VPDeviceHealthRemindType(rawValue: 0)!, opCode: 2, remindModel: nil, result: {
      [weak self] success, complete, item in
      DispatchQueue.main.async {
        guard let self = self, !ended else { return }
        if !success {
          ended = true
          return self.emitData("healthRemind", ["op": "readFailed"])
        }
        if let item = item { self.emitData("healthRemind", ["op": "item", "item": self.healthMap(item)]) }
        if complete {
          ended = true
          self.emitData("healthRemind", ["op": "read"])
        }
      }
    }, deviceInfoDidChange: { [weak self] item in
      DispatchQueue.main.async {
        guard let self = self, let item = item else { return }
        self.emitData("healthRemind", ["op": "report", "item": self.healthMap(item)])
      }
    })
  }

  func setHealthRemind(type: String, on: Bool, startMin: Int, endMin: Int, interval: Int) {
    guard requireReady("setHealthRemind") else { return }
    guard let raw = Self.healthNames.first(where: { $0.value == type })?.key,
          let kind = VPDeviceHealthRemindType(rawValue: UInt(raw)) else {
      fail("setHealthRemind", "Noma'lum eslatma turi: \(type)")
      return
    }
    let item = VPDeviceHealthRemindModel()
    item.type = kind
    item.open = on
    item.startHour = UInt8(min(startMin / 60, 23))
    item.startMinute = UInt8(startMin % 60)
    item.endHour = UInt8(min(endMin / 60, 23))
    item.endMinute = UInt8(endMin % 60)
    item.remindInterval = UInt8(min(max(interval, 1), 255))
    pm?.veepooSDKSettingHealthRemind(with: kind, opCode: 1, remindModel: item, result: { [weak self] success, _, saved in
      DispatchQueue.main.async {
        guard let self = self else { return }
        if success {
          self.emitData("healthRemind", ["op": "set", "item": self.healthMap(saved ?? item)])
        } else {
          self.emitData("healthRemind", ["op": "setFailed", "type": type])
        }
      }
    }, deviceInfoDidChange: nil)
  }

  /// "longSeat" {status, on, start, end, threshold}. settingMode: 0 o'chirish, 1 yoqish, 2 o'qish.
  private func longSeat(_ model: VPDeviceLongSeatModel, mode: UInt, okStatus: String) {
    pm?.veepooSDKSettingDeviceLongSeat(with: model, settingMode: mode, successResult: { [weak self] m in
      DispatchQueue.main.async {
        guard let m = m else { return }
        self?.emitData("longSeat", [
          "status": okStatus, "on": m.longSeatState == 1,
          "start": Int(m.longSeatStartHour) * 60 + Int(m.longSeatStartMinute),
          "end": Int(m.longSeatEndHour) * 60 + Int(m.longSeatEndMinute), "threshold": Int(m.longSeatGateValue),
        ])
      }
    }, failureResult: { [weak self] in
      DispatchQueue.main.async { self?.emitData("longSeat", ["status": mode == 2 ? "READ_FAIL" : "SETTING_FAIL"]) }
    })
  }

  func readLongSeat() {
    guard requireReady("readLongSeat") else { return }
    longSeat(VPDeviceLongSeatModel(), mode: 2, okStatus: "READ_SUCCESS")
  }

  func setLongSeat(on: Bool, startMin: Int, endMin: Int, threshold: Int) {
    guard requireReady("setLongSeat") else { return }
    let m = VPDeviceLongSeatModel(
      longSeatStartHour: UInt(startMin / 60), longSeatStartMinute: UInt(startMin % 60),
      longSeatEndHour: UInt(endMin / 60), longSeatEndMinute: UInt(endMin % 60),
      longSeatGateValue: UInt(min(max(threshold, 30), 240)), longSeatState: on ? 1 : 0
    )
    longSeat(m, mode: on ? 1 : 0, okStatus: on ? "OPEN_SUCCESS" : "CLOSE_SUCCESS")
  }

  /// "heartWarning" {status, on, high, low}. settingMode: 0 o'chirish, 1 yoqish, 2 o'qish (demo kabi).
  private func heartAlarm(_ model: VPDeviceHeartAlarmModel, mode: UInt, okStatus: String) {
    pm?.veepooSDKSettingDeviceHeartAlarm(with: model, settingMode: mode, successResult: { [weak self] m in
      DispatchQueue.main.async {
        guard let m = m else { return }
        self?.emitData("heartWarning", [
          "status": okStatus, "on": m.isOpen, "high": Int(m.heartMaxValue), "low": Int(m.heartMinValue),
        ])
      }
    }, failureResult: { [weak self] in
      DispatchQueue.main.async { self?.emitData("heartWarning", ["status": mode == 2 ? "READ_FAIL" : "SETTING_FAIL"]) }
    })
  }

  func readHeartWarning() {
    guard requireReady("readHeartWarning") else { return }
    heartAlarm(VPDeviceHeartAlarmModel(), mode: 2, okStatus: "READ_SUCCESS")
  }

  func setHeartWarning(on: Bool, high: Int, low: Int) {
    guard requireReady("setHeartWarning") else { return }
    let m = VPDeviceHeartAlarmModel(heartMaxValue: UInt(max(high, 0)), heartMinValue: UInt(max(low, 0)), openState: on)
    heartAlarm(m, mode: on ? 1 : 0, okStatus: on ? "OPEN_SUCCESS" : "CLOSE_SUCCESS")
  }

  // MARK: - 5-bosqich: matnli budilnik

  private var textAlarmCache: [Int: VPDeviceTextAlarmModel] = [:]

  /// Android repeat satri ("1111111", dushanbadan) ↔ iOS `repeatState` (8 bitli son, 0-bit dushanba; 0 — takrorsiz).
  private func repeatBits(_ text: String) -> Int {
    text.enumerated().reduce(0) { acc, item in item.element == "1" && item.offset < 7 ? acc | (1 << item.offset) : acc }
  }

  private func repeatText(_ bits: Int) -> String {
    (0..<7).map { (bits >> $0) & 1 == 1 ? "1" : "0" }.joined()
  }

  /// "textAlarm" {op, alarms: [{id, hour, minute, repeat, content, open}]} (reminders.ts shu op nomlarini kutadi).
  private func textAlarm(_ model: VPDeviceTextAlarmModel, mode: UInt, okOp: String) {
    guard let settingMode = VPDeviceTextAlarmSettingModel(rawValue: mode) else { return }
    pm?.veepooSDKSettingDeviceTextAlarm(with: model, settingMode: settingMode, successResult: { [weak self] array in
      DispatchQueue.main.async {
        guard let self = self else { return }
        let list = (array as? [VPDeviceTextAlarmModel]) ?? []
        self.textAlarmCache = [:]
        let alarms: [[String: Any?]] = list.compactMap { a in
          guard let id = self.int(a.alarmID) else { return nil }
          self.textAlarmCache[id] = a
          return [
            "id": id, "hour": self.int(a.alarmHour), "minute": self.int(a.alarmMinute),
            "repeat": self.repeatText(self.int(a.repeatState) ?? 0), "content": a.alarmText,
            "open": self.int(a.alarmState) == 1,
          ]
        }
        self.emitData("textAlarm", ["op": okOp, "alarms": alarms])
      }
    }, failureResult: { [weak self] in
      DispatchQueue.main.async { self?.emitData("textAlarm", ["op": mode == 3 ? "READ_FAIL" : "SETTING_FAIL"]) }
    })
  }

  func readTextAlarms() {
    guard requireReady("readTextAlarms") else { return }
    textAlarm(VPDeviceTextAlarmModel(), mode: 3, okOp: "READ_SUCCESS")
  }

  /// [repeat]: 7 belgi, masalan "1111111" (har kuni). Ko'pi bilan 10 ta (SDK hujjati).
  func addTextAlarm(hour: Int, minute: Int, repeat: String, content: String) {
    guard requireReady("addTextAlarm") else { return }
    if textAlarmCache.count >= 10 {
      emitData("textAlarm", ["op": "ALARM_FULL"])
      return
    }
    let a = VPDeviceTextAlarmModel() // SDK yangi obyektga bo'sh ID va vaqtni o'zi beradi (demo izohi)
    a.alarmHour = String(hour)
    a.alarmMinute = String(minute)
    a.alarmState = "1"
    a.repeatState = String(repeatBits(`repeat`))
    a.alarmText = content
    textAlarm(a, mode: 2, okOp: "SETTING_SUCCESS")
  }

  func deleteTextAlarm(id: Int) {
    guard requireReady("deleteTextAlarm") else { return }
    guard let a = textAlarmCache[id] else {
      fail("deleteTextAlarm", "Eslatma topilmadi: avval ro'yxatni o'qing")
      return
    }
    textAlarm(a, mode: 1, okOp: "CLEAR_SUCCESS")
  }

  func setTextAlarmOpen(id: Int, open: Bool) {
    guard requireReady("setTextAlarmOpen") else { return }
    guard let a = textAlarmCache[id] else {
      fail("setTextAlarmOpen", "Eslatma topilmadi: avval ro'yxatni o'qing")
      return
    }
    a.alarmState = open ? "1" : "0"
    textAlarm(a, mode: 2, okOp: "SETTING_SUCCESS")
  }

  // MARK: - 5-bosqich: bildirishnomalar
  //
  // iOS'da ilova soatga bildirishnoma matnini yubora olmaydi: iPhone bildirishnomalarni ANCS orqali o'zi uzatadi.
  // Soatdagi kalitlar (qaysi turlar ko'rsatilsin) esa shu yerda o'qiladi/yoziladi.

  /// VPSettingMessageSwitchType: 2 qo'ng'iroq, 3 SMS, 19 boshqa ilovalar.
  private func messageSwitch(_ raw: Int, state: Int, _ done: @escaping (Int) -> Void) {
    guard let type = VPSettingMessageSwitchType(rawValue: raw), let setting = VPSettingFunctionState(rawValue: state) else {
      return done(0)
    }
    var answered = false
    pm?.veepooSDKSettingMessageType(type, settingState: setting, complete: { result in
      DispatchQueue.main.async {
        guard !answered else { return }
        answered = true
        done(Int(result.rawValue))
      }
    })
    DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
      guard !answered else { return }
      answered = true
      done(0)
    }
  }

  func readNotificationSwitches() {
    guard requireReady("readNotificationSwitches") else { return }
    messageSwitch(19, state: 0) { [weak self] other in
      self?.messageSwitch(2, state: 0) { phone in
        self?.messageSwitch(3, state: 0) { sms in
          guard let self = self else { return }
          self.emitData("socialSwitch", [
            "other": self.switchName(other), "phone": self.switchName(phone), "sms": self.switchName(sms),
          ])
        }
      }
    }
  }

  func setOtherNotifications(on: Bool) {
    guard requireReady("setOtherNotifications") else { return }
    messageSwitch(19, state: on ? 1 : 2) { [weak self] result in
      guard let self = self else { return }
      self.emitData("socialSwitch", ["other": self.switchName(result)])
    }
  }

  func setCallNotifications(on: Bool) {
    guard requireReady("setCallNotifications") else { return }
    messageSwitch(2, state: on ? 1 : 2) { [weak self] result in
      guard let self = self else { return }
      self.emitData("socialSwitch", ["phone": self.switchName(result)])
    }
  }

  /// iOS: soat matn uzatishni qo'llasa (textAndImageTransmissionType == 1) matn yuboriladi, aks holda JS lokal
  /// bildirishnoma ishlatadi (iPhone uni soatga o'zi uzatadi).
  func sendNotification(title: String, body: String, variant: String) {
    guard requireReady("sendNotification") else { return }
    guard (int(kvc(model, "textAndImageTransmissionType")) ?? 0) == 1 else {
      emitData("notifySent", ["variant": variant, "title": title, "body": body, "unsupported": true])
      return
    }
    let text = title.isEmpty ? body : "\(title)\n\(body)"
    pm?.veepooSDKSendStartTransmissionMessage(text) { [weak self] error in
      DispatchQueue.main.async {
        if let error = error { self?.fail("sendNotification", error.localizedDescription) }
        self?.emitData("notifySent", ["variant": "TEXT_TRANSMISSION", "title": title, "body": body, "ok": error == nil])
      }
    }
  }

  // MARK: - 6-bosqich: siferblatlar
  //
  // SDK oqimi: dialChannel(read, market) → VPDeviceMarketDialModel; VPMarketDialManager: serverdan ro'yxat,
  // faylni yuklab olish, soatga uzatish. Hodisalar Android bilan bir xil: "dialInfo", "dialMarket", "dialInstall".

  private var deviceDial: VPDeviceMarketDialModel?
  private var serverDials: [String: VPServerMarketDialModel] = [:]
  private var dialBusy = false

  private func readDeviceDial(_ done: @escaping (VPDeviceMarketDialModel?, String?) -> Void) {
    if let d = deviceDial { return done(d, nil) }
    // VPDialChannelModel: 1 o'rnatish, 2 o'qish; VPDeviceDialType: 0 standart, 1 do'kon, 2 rasm (header).
    guard let channel = VPDialChannelModel(rawValue: 2), let market = VPDeviceDialType(rawValue: 1) else {
      return done(nil, "enum")
    }
    pm?.veepooSDK_dialChannel(with: channel, dialType: market, photoDialModel: nil, result: { [weak self] _, dial, error in
      DispatchQueue.main.async {
        self?.deviceDial = dial
        done(dial, error?.localizedDescription)
      }
    }, transformProgress: nil)
  }

  func readDialInfo() {
    guard requireReady("readDialInfo") else { return }
    readDeviceDial { [weak self] dial, error in
      guard let self = self else { return }
      self.emitData("dialInfo", [
        "jl": (self.int(self.kvc(self.model, "CPUType")) ?? 0) == 1, "serverUi": dial != nil,
        "binProtocol": dial.map { Int($0.binProtocol) }, "shape": dial.map { Int($0.deviceShape) }, "error": error,
        "appPackage": Bundle.main.bundleIdentifier, "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"],
      ])
    }
  }

  func loadDialMarket(deviceNumber: String, deviceTestVersion: String) {
    guard requireReady("loadDialMarket") else { return }
    _ = (deviceNumber, deviceTestVersion)
    readDeviceDial { [weak self] dial, error in
      guard let self = self else { return }
      guard let dial = dial else { return self.emitData("dialMarket", ["error": "UNSUPPORTED", "message": error]) }
      VPMarketDialManager.share().getVeepooServerAllMarketDials(withDeviceInfo: dial, success: { [weak self] list in
        DispatchQueue.main.async {
          guard let self = self else { return }
          let items: [[String: Any?]] = (list ?? []).map { th in
            let crc = String(th.crc)
            self.serverDials[crc] = th
            return [
              "crc": crc, "name": th.fileUrl.map { ($0 as NSString).lastPathComponent }, "previewUrl": th.previewUrl,
              "fileUrl": th.fileUrl, "shape": Int(th.dialShape), "available": true, "binProtocol": String(th.binProtocol),
            ]
          }
          self.emitData("dialMarket", ["items": items, "shape": String(dial.deviceShape), "binDataType": String(dial.binProtocol)])
        }
      }, failure: { [weak self] error, code in
        DispatchQueue.main.async {
          self?.emitData("dialMarket", ["error": "NETWORK", "message": "\(code): \(error?.localizedDescription ?? "")"])
        }
      })
    }
  }

  private func dialStage(_ stage: String, _ progress: Int = 0, _ extra: [String: Any?] = [:]) {
    var fields = extra
    fields["stage"] = stage
    fields["progress"] = progress
    emitData("dialInstall", fields)
  }

  private func dialFail(_ error: String, _ message: String? = nil) {
    dialBusy = false
    dialStage("error", 0, ["error": error, "message": message])
  }

  /// Siferblatni yuklab olib soatga o'rnatadi. `crc` — "dialMarket" ro'yxatidagi qiymat (fileUrl e'tiborsiz: SDK o'zi yuklaydi).
  func installDial(fileUrl: String, crc: String) {
    guard requireReady("installDial") else { return }
    _ = fileUrl
    if dialBusy { return dialStage("error", 0, ["error": "BUSY"]) }
    guard let server = serverDials[crc] else { return dialFail("NOT_IN_LIST", "Avval do'kon ro'yxatini yuklang") }
    dialBusy = true
    dialStage("download", 0)
    readDeviceDial { [weak self] dial, error in
      guard let self = self else { return }
      guard let dial = dial else { return self.dialFail("DEVICE_INFO", error) }
      let manager = VPMarketDialManager.share()
      manager?.downloadMarketDialBinFile(with: server, deviceMarketDialModel: dial, success: { [weak self] path in
        DispatchQueue.main.async {
          guard let self = self else { return }
          guard let path = path else { return self.dialFail("DOWNLOAD") }
          self.dialStage("transfer", 0)
          var finished = false
          manager?.startTransfer(withFilePath: path, transformProgress: { [weak self] progress in
            DispatchQueue.main.async {
              guard let self = self, !finished else { return }
              let p = Int((progress * 100).rounded())
              if p >= 100 {
                finished = true
                self.dialBusy = false
                self.dialStage("done", 100)
              } else {
                self.dialStage("transfer", p)
              }
            }
          }, failure: { [weak self] error in
            DispatchQueue.main.async {
              guard !finished else { return }
              finished = true
              self?.dialFail("TRANSFER", error?.localizedDescription)
            }
          })
        }
      }, failure: { [weak self] error, code in
        DispatchQueue.main.async { self?.dialFail("DOWNLOAD", "\(code): \(error?.localizedDescription ?? "")") }
      })
    }
  }
}
