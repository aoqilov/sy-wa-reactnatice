import ExpoModulesCore

/**
 * Expo ko'prigi: JavaScript <-> WatchController (Android'dagi VeepooWatchModule.kt ning muqobili). Natijalar
 * chaqiruvlardan emas, hodisa oqimidan keladi: "scan", "connection", "event", "bluetooth".
 *
 * Funksiyalar bosqichma-bosqich qo'shiladi (docs/ios-plan.md). Hali qo'shilmagan funksiyani JS chaqirsa, TypeError
 * bo'ladi va measure.ts uni "outdated" deb ko'rsatadi, xuddi eski APK'dagi kabi.
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
  private func onMainAsync(_ work: @escaping (WatchController) -> Void) {
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
    // Android bilan bir xil imzo uchun joriy holat qaytariladi.
    AsyncFunction("requestEnableBluetooth") { () -> Bool in
      self.onMain { $0.isBluetoothEnabled() }
    }

    Function("getConnectionState") { () -> [String: Any] in
      self.onMain { $0.connectionSnapshot().compactMapValues { $0 } }
    }

    // Nasosli bosim
    Function("startCuffBp") { (rawFlag: Bool) in
      self.onMainAsync { $0.startCuffBp(rawFlag: rawFlag) }
    }

    Function("stopCuffBp") {
      self.onMainAsync { $0.stopCuffBp() }
    }
  }
}
