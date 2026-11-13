package expo.modules.veepoowatch

import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.content.Intent
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo ko'prigi: JavaScript <-> [WatchController]. Natijalar chaqiruvlardan emas, hodisa oqimidan keladi
 * (SDK ham shunday ishlaydi): "scan", "connection", "event".
 */
class VeepooWatchModule : Module() {
  private var controllerInstance: WatchController? = null

  /** Ochiq turgan "Bluetooth'ni yoqing" tizim oynasining javobi (bir vaqtda faqat bittasi). */
  private var enablePromise: Promise? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  @Synchronized
  private fun controller(): WatchController {
    controllerInstance?.let { return it }
    val context = appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("React konteksti mavjud emas")
    return WatchController(context) { name, body -> sendEvent(name, body) }
      .also { controllerInstance = it }
  }

  override fun definition() = ModuleDefinition {
    Name("VeepooWatch")

    Events("scan", "connection", "event", "bluetooth")

    OnDestroy {
      controllerInstance?.release()
      controllerInstance = null
    }

    // Bluetooth
    Function("isBluetoothEnabled") { controller().isBluetoothEnabled() }

    // Android'ning "Ilova Bluetooth'ni yoqmoqchi" oynasi. Android 13+ da ilova Bluetooth'ni o'zi yoqa olmaydi
    // (`adapter.enable()` ishlamaydi), yagona yo'l shu oyna. Android 12+ da BLUETOOTH_CONNECT ruxsati kerak (JS oldin so'raydi).
    // Natija: true — Bluetooth yoqildi, false — foydalanuvchi rad etdi yoki oynani ochib bo'lmadi.
    AsyncFunction("requestEnableBluetooth") { promise: Promise ->
      if (controller().isBluetoothEnabled()) {
        promise.resolve(true)
        return@AsyncFunction
      }
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      enablePromise?.resolve(false) // oldingi so'rov javobsiz qolmasin
      enablePromise = promise
      try {
        activity.startActivityForResult(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE), REQUEST_ENABLE_BT)
      } catch (t: Throwable) {
        // Masalan, BLUETOOTH_CONNECT ruxsati yo'q (SecurityException).
        enablePromise = null
        promise.reject("ERR_BLUETOOTH_ENABLE", t.message ?: t.javaClass.simpleName, t)
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_ENABLE_BT) return@OnActivityResult
      val promise = enablePromise ?: return@OnActivityResult
      enablePromise = null
      if (payload.resultCode != Activity.RESULT_OK) {
        promise.resolve(false)
        return@OnActivityResult
      }
      // "Ruxsat berish" bosilgach adapter bir-ikki soniyada yoqiladi: skan/ulanish shundan keyin ishlaydi.
      awaitBluetoothOn(promise, ENABLE_WAIT_STEPS)
    }

    // Skan va ulanish
    Function("startScan") { controller().startScan() }
    Function("stopScan") { controller().stopScan() }
    Function("connect") { id: String, confirmOnWatch: Boolean -> controller().connect(id, confirmOnWatch) }
    Function("disconnect") { controller().disconnect() }
    Function("getConnectionState") { controller().connectionSnapshot() }

    // O'lchovlar
    Function("readBattery") { controller().readBattery() }
    Function("startHeart") { controller().startHeart() }
    Function("stopHeart") { controller().stopHeart() }
    Function("startSpo2") { controller().startSpo2() }
    Function("stopSpo2") { controller().stopSpo2() }
    Function("startEcg") { controller().startEcg() }
    Function("stopEcg") { controller().stopEcg() }
    Function("startTemp") { controller().startTemp() }
    Function("stopTemp") { controller().stopTemp() }
    Function("startGlucose") { controller().startGlucose() }
    Function("stopGlucose") { controller().stopGlucose() }
    Function("startBloodComponent") { controller().startBloodComponent() }
    Function("stopBloodComponent") { controller().stopBloodComponent() }
    Function("startHrv") { controller().startHrv() }
    Function("stopHrv") { controller().stopHrv() }
    Function("startStress") { controller().startStress() }
    Function("stopStress") { controller().stopStress() }
    Function("startMet") { controller().startMet() }
    Function("stopMet") { controller().stopMet() }
    Function("startBodyComp") { controller().startBodyComp() }
    Function("stopBodyComp") { controller().stopBodyComp() }
    Function("startCuffBp") { rawFlag: Boolean -> controller().startCuffBp(rawFlag) }
    Function("stopCuffBp") { controller().stopCuffBp() }
    Function("readManualBp") { sinceSec: Int -> controller().readManualBp(sinceSec) }
    Function("readManualData") { sinceSec: Int, kinds: List<String> -> controller().readManualData(sinceSec, kinds) }
    Function("readDailyData") { days: Int -> controller().readDailyData(days) }
    Function("readDailyDay") { day: Int, position: Int -> controller().readDailyDay(day, position) }

    // Soatdagi eslatmalar (matnli budilnik)
    Function("readTextAlarms") { controller().readTextAlarms() }
    Function("addTextAlarm") { hour: Int, minute: Int, repeat: String, content: String ->
      controller().addTextAlarm(hour, minute, repeat, content)
    }
    Function("deleteTextAlarm") { id: Int -> controller().deleteTextAlarm(id) }
    Function("setTextAlarmOpen") { id: Int, open: Boolean -> controller().setTextAlarmOpen(id, open) }

    // Bildirishnoma
    Function("readNotificationSwitches") { controller().readNotificationSwitches() }
    Function("setOtherNotifications") { on: Boolean -> controller().setOtherNotifications(on) }
    Function("sendNotification") { title: String, body: String, variant: String ->
      controller().sendNotification(title, body, variant)
    }

    // Qo'ng'iroq (sinov bosqichi)
    Function("setCallNotifications") { on: Boolean -> controller().setCallNotifications(on) }
    Function("sendIncomingCall") { name: String, number: String -> controller().sendIncomingCall(name, number) }
    Function("endIncomingCall") { controller().endIncomingCall() }
    // Faollik: bugungi qadam/kkal/masofa va soatga shaxsiy ma'lumot + maqsadlar
    Function("readSteps") { controller().readSteps() }
    Function("syncPersonInfo") { male: Boolean, heightCm: Int, weightKg: Int, age: Int, stepGoal: Int, sleepGoalMin: Int ->
      controller().syncPersonInfo(male, heightCm, weightKg, age, stepGoal, sleepGoalMin)
    }

    // Haqiqiy qo'ng'iroqlarni soatga uzatish ("Soat" sahifasidagi kalit)
    Function("setCallForwarding") { on: Boolean -> controller().setCallForwarding(on) }
    Function("getCallForwardStatus") { controller().callForwardStatus() }

    // Avto-o'lchash ("Mening rejam")
    Function("readAutoMeasure") { controller().readAutoMeasure() }
    Function("setAutoMeasure") { typeValue: Int, on: Boolean, intervalMin: Int, startMin: Int, endMin: Int ->
      controller().setAutoMeasure(typeValue, on, intervalMin, startMin, endMin)
    }

    // Siferblatlar (soat siferblati do'koni)
    Function("readDialInfo") { controller().readDialInfo() }
    Function("loadDialMarket") { deviceNumber: String, deviceTestVersion: String ->
      controller().loadDialMarket(deviceNumber, deviceTestVersion)
    }
    Function("installDial") { fileUrl: String, crc: String -> controller().installDial(fileUrl, crc) }

    // Avto-o'lchash kalitlari (intervalsiz; S105/E500 shuni qo'llaydi)
    Function("readAutoSwitches") { controller().readAutoSwitches() }
    Function("setAutoSwitch") { key: String, on: Boolean -> controller().setAutoSwitch(key, on) }
    Function("readSpo2Night") { controller().readSpo2Night() }
    Function("setSpo2Night") { on: Boolean, startMin: Int, endMin: Int -> controller().setSpo2Night(on, startMin, endMin) }
  }

  private fun awaitBluetoothOn(promise: Promise, stepsLeft: Int) {
    if (controllerInstance?.isBluetoothEnabled() == true || stepsLeft <= 0) {
      promise.resolve(controllerInstance?.isBluetoothEnabled() == true)
      return
    }
    mainHandler.postDelayed({ awaitBluetoothOn(promise, stepsLeft - 1) }, ENABLE_WAIT_STEP_MS)
  }

  companion object {
    private const val REQUEST_ENABLE_BT = 0x5B01
    private const val ENABLE_WAIT_STEP_MS = 100L
    private const val ENABLE_WAIT_STEPS = 50 // 5 soniyagacha
  }
}
