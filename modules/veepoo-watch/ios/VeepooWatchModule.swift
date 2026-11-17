import ExpoModulesCore

/**
 * Expo ko'prigi: JavaScript <-> WatchController (Android'dagi VeepooWatchModule.kt ning muqobili). Funksiya nomlari,
 * parametrlari va hodisalar Android bilan bir xil. Natijalar chaqiruvlardan emas, hodisa oqimidan keladi:
 * "scan", "connection", "event", "bluetooth".
 *
 * WatchController faqat asosiy navbatda (main queue) ishlaydi: sinxron funksiyalar JS oqimida chaqiriladi, shuning
 * uchun `onMain` / `onMainAsync` orqali o'tkaziladi.
 */
public final class VeepooWatchModule: Module {
  private var controllerInstance: WatchController?

  private func controller() -> WatchController {
    if let controller = controllerInstance { return controller }
    let controller = WatchController { [weak self] name, body in
      self?.sendEvent(name, body.compactMapValues { $0 })
    }
    controllerInstance = controller
    return controller
  }

  /// Natija qaytaradigan chaqiruv: asosiy navbatda bajarib, javobni kutadi.
  private func onMain<T>(_ work: @escaping (WatchController) -> T) -> T {
    if Thread.isMainThread { return work(controller()) }
    return DispatchQueue.main.sync { work(self.controller()) }
  }

  /// Buyruq (javobi hodisa bilan keladi): asosiy navbatga yuboriladi, JS kutmaydi.
  private func run(_ work: @escaping (WatchController) -> Void) {
    DispatchQueue.main.async { work(self.controller()) }
  }

  public func definition() -> ModuleDefinition {
    Name("VeepooWatch")

    Events("scan", "connection", "event", "bluetooth")

    OnDestroy {
      self.controllerInstance?.release()
      self.controllerInstance = nil
    }

    // Bluetooth
    Function("isBluetoothEnabled") { () -> Bool in
      self.onMain { $0.isBluetoothEnabled() }
    }
    // iOS ilovaga Bluetooth'ni yoqishga ruxsat bermaydi: o'chiq bo'lsa tizim o'zi oyna ko'rsatadi.
    AsyncFunction("requestEnableBluetooth") { () -> Bool in
      self.onMain { $0.isBluetoothEnabled() }
    }

    // Skan va ulanish
    Function("startScan") { self.run { $0.startScan() } }
    Function("stopScan") { self.run { $0.stopScan() } }
    Function("connect") { (id: String, confirmOnWatch: Bool) in
      self.run { $0.connect(id: id, confirmOnWatch: confirmOnWatch) }
    }
    Function("disconnect") { self.run { $0.disconnect() } }
    Function("getConnectionState") { () -> [String: Any] in
      self.onMain { $0.connectionSnapshot().compactMapValues { $0 } }
    }

    // O'lchovlar
    Function("readBattery") { self.run { $0.readBattery() } }
    Function("startHeart") { self.run { $0.startHeart() } }
    Function("stopHeart") { self.run { $0.stopHeart() } }
    Function("startSpo2") { self.run { $0.startSpo2() } }
    Function("stopSpo2") { self.run { $0.stopSpo2() } }
    Function("startEcg") { self.run { $0.startEcg() } }
    Function("stopEcg") { self.run { $0.stopEcg() } }
    Function("startTemp") { self.run { $0.startTemp() } }
    Function("stopTemp") { self.run { $0.stopTemp() } }
    Function("startGlucose") { self.run { $0.startGlucose() } }
    Function("stopGlucose") { self.run { $0.stopGlucose() } }
    Function("startBloodComponent") { self.run { $0.startBloodComponent() } }
    Function("stopBloodComponent") { self.run { $0.stopBloodComponent() } }
    Function("startHrv") { self.run { $0.startHrv() } }
    Function("stopHrv") { self.run { $0.stopHrv() } }
    Function("startStress") { self.run { $0.startStress() } }
    Function("stopStress") { self.run { $0.stopStress() } }
    Function("startMet") { self.run { $0.startMet() } }
    Function("stopMet") { self.run { $0.stopMet() } }
    Function("startBodyComp") { self.run { $0.startBodyComp() } }
    Function("stopBodyComp") { self.run { $0.stopBodyComp() } }
    Function("readBodyHistory") { self.run { $0.readBodyHistory() } }
    Function("startCuffBp") { (rawFlag: Bool) in self.run { $0.startCuffBp(rawFlag: rawFlag) } }
    Function("stopCuffBp") { self.run { $0.stopCuffBp() } }
    Function("readManualBp") { (sinceSec: Int) in self.run { $0.readManualBp(sinceSec: sinceSec) } }
    Function("readManualData") { (sinceSec: Int, kinds: [String]) in
      self.run { $0.readManualData(sinceSec: sinceSec, kinds: kinds) }
    }
    Function("readDailyData") { (days: Int) in self.run { $0.readDailyData(days: days) } }
    Function("readDailyDay") { (day: Int, position: Int) in self.run { $0.readDailyDay(day: day, position: position) } }

    // Soatdagi eslatmalar (matnli budilnik)
    Function("readTextAlarms") { self.run { $0.readTextAlarms() } }
    Function("addTextAlarm") { (hour: Int, minute: Int, repeatDays: String, content: String) in
      self.run { $0.addTextAlarm(hour: hour, minute: minute, repeat: repeatDays, content: content) }
    }
    Function("deleteTextAlarm") { (id: Int) in self.run { $0.deleteTextAlarm(id: id) } }
    Function("setTextAlarmOpen") { (id: Int, open: Bool) in self.run { $0.setTextAlarmOpen(id: id, open: open) } }

    // Bildirishnoma va qo'ng'iroq. iOS: bildirishnoma va qo'ng'iroqni iPhone soatga o'zi uzatadi (ANCS).
    Function("readNotificationSwitches") { self.run { $0.readNotificationSwitches() } }
    Function("setOtherNotifications") { (on: Bool) in self.run { $0.setOtherNotifications(on: on) } }
    Function("sendNotification") { (title: String, body: String, variant: String) in
      self.run { $0.sendNotification(title: title, body: body, variant: variant) }
    }
    Function("setCallNotifications") { (on: Bool) in self.run { $0.setCallNotifications(on: on) } }
    Function("sendIncomingCall") { (name: String, number: String) in
      self.run { $0.emitData("callSent", ["name": name, "number": number, "unsupported": true]) }
    }
    Function("endIncomingCall") { self.run { $0.emitData("callEnded", ["unsupported": true]) } }
    // Qo'ng'iroqlarni uzatish faqat Android'da (CallBridge). call-forward.ts bu holatni ko'rib, bo'limni yashiradi.
    Function("setCallForwarding") { (on: Bool) in _ = on }
    Function("getCallForwardStatus") { () -> [String: Bool] in
      [
        "enabled": false, "listening": false, "phoneState": false, "callLog": false, "contacts": false,
        "answerCalls": false,
      ]
    }

    // Faollik, uyqu, shaxsiy ma'lumot
    Function("readSteps") { self.run { $0.readSteps() } }
    Function("readSleep") { self.run { $0.readSleep() } }
    Function("syncPersonInfo") {
      (male: Bool, heightCm: Int, weightKg: Int, age: Int, stepGoal: Int, sleepGoalMin: Int) in
      self.run {
        $0.syncPersonInfo(
          male: male, heightCm: heightCm, weightKg: weightKg, age: age, stepGoal: stepGoal, sleepGoalMin: sleepGoalMin
        )
      }
    }

    // Salomatlik eslatmalari, harakatsizlik, puls ogohlantirishi
    Function("readHealthReminds") { self.run { $0.readHealthReminds() } }
    Function("setHealthRemind") { (type: String, on: Bool, startMin: Int, endMin: Int, interval: Int) in
      self.run { $0.setHealthRemind(type: type, on: on, startMin: startMin, endMin: endMin, interval: interval) }
    }
    Function("readLongSeat") { self.run { $0.readLongSeat() } }
    Function("setLongSeat") { (on: Bool, startMin: Int, endMin: Int, threshold: Int) in
      self.run { $0.setLongSeat(on: on, startMin: startMin, endMin: endMin, threshold: threshold) }
    }
    Function("readHeartWarning") { self.run { $0.readHeartWarning() } }
    Function("setHeartWarning") { (on: Bool, high: Int, low: Int) in
      self.run { $0.setHeartWarning(on: on, high: high, low: low) }
    }

    // Avto-o'lchash
    Function("readAutoMeasure") { self.run { $0.readAutoMeasure() } }
    Function("setAutoMeasure") { (typeValue: Int, on: Bool, intervalMin: Int, startMin: Int, endMin: Int) in
      self.run {
        $0.setAutoMeasure(typeValue: typeValue, on: on, intervalMin: intervalMin, startMin: startMin, endMin: endMin)
      }
    }
    Function("readAutoSwitches") { self.run { $0.readAutoSwitches() } }
    Function("setAutoSwitch") { (key: String, on: Bool) in self.run { $0.setAutoSwitch(key: key, on: on) } }
    Function("readSpo2Night") { self.run { $0.readSpo2Night() } }
    Function("setSpo2Night") { (on: Bool, startMin: Int, endMin: Int) in
      self.run { $0.setSpo2Night(on: on, startMin: startMin, endMin: endMin) }
    }

    // Siferblatlar
    Function("readDialInfo") { self.run { $0.readDialInfo() } }
    Function("loadDialMarket") { (deviceNumber: String, deviceTestVersion: String) in
      self.run { $0.loadDialMarket(deviceNumber: deviceNumber, deviceTestVersion: deviceTestVersion) }
    }
    Function("installDial") { (fileUrl: String, crc: String) in self.run { $0.installDial(fileUrl: fileUrl, crc: crc) } }
  }
}
