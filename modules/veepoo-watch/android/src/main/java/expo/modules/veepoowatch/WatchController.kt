package expo.modules.veepoowatch

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.inuker.bluetooth.library.Code
import com.inuker.bluetooth.library.Constants
import com.inuker.bluetooth.library.model.BleGattProfile
import com.inuker.bluetooth.library.search.SearchResult
import com.inuker.bluetooth.library.search.response.SearchResponse
import com.veepoo.protocol.VPOperateManager
import com.veepoo.protocol.listener.base.IABleConnectStatusListener
import com.veepoo.protocol.listener.base.IBleWriteResponse
import com.veepoo.protocol.listener.base.IConnectResponse
import com.veepoo.protocol.listener.base.INotifyResponse
import com.veepoo.protocol.listener.data.IAutoMeasureSettingDataListener
import com.veepoo.protocol.listener.data.IBatteryDataListener
import com.inuker.bluetooth.library.connect.response.BleWriteResponse
import com.veepoo.protocol.listener.data.IBloodComponentDetectListener
import com.veepoo.protocol.listener.data.IBloodGlucoseChangeListener
import com.veepoo.protocol.model.datas.BloodComponent
import com.veepoo.protocol.model.enums.EBloodComponentDetectState
import com.veepoo.protocol.model.datas.MealInfo
import com.veepoo.protocol.model.enums.EBloodGlucoseRiskLevel
import com.veepoo.protocol.model.enums.EBloodGlucoseStatus
import com.veepoo.protocol.listener.data.ICuffBPDetectDataListener
import com.veepoo.protocol.listener.data.IDeviceFuctionDataListener
import com.veepoo.protocol.listener.data.IHeartDataListener
import com.veepoo.protocol.listener.data.IPwdDataListener
import com.veepoo.protocol.listener.data.ISocialMsgDataListener
import com.veepoo.protocol.listener.data.ISpo2hDataListener
import com.veepoo.protocol.listener.data.ITemptureDetectDataListener
import com.veepoo.protocol.model.datas.AutoMeasureData
import com.veepoo.protocol.model.datas.BatteryData
import com.veepoo.protocol.model.datas.DeviceFunctionPackage1
import com.veepoo.protocol.model.datas.DeviceFunctionPackage2
import com.veepoo.protocol.model.datas.DeviceFunctionPackage3
import com.veepoo.protocol.model.datas.DeviceFunctionPackage4
import com.veepoo.protocol.model.datas.DeviceFunctionPackage5
import com.veepoo.protocol.model.datas.FunctionDeviceSupportData
import com.veepoo.protocol.model.datas.FunctionSocailMsgData
import com.veepoo.protocol.model.datas.HeartData
import com.veepoo.protocol.model.datas.PwdData
import com.veepoo.protocol.model.datas.Spo2hData
import com.veepoo.protocol.model.datas.TemptureDetectData
import com.veepoo.protocol.model.datas.VPCuffBPTestData
import com.veepoo.protocol.model.enums.EAutoMeasureType
import com.veepoo.protocol.model.enums.EFunctionStatus
import com.veepoo.protocol.model.enums.EPwdStatus
import com.veepoo.protocol.model.enums.ESocailMsg
import com.veepoo.protocol.model.settings.ContentSocailSetting
import com.veepoo.protocol.listener.data.IOriginData3Listener
import com.veepoo.protocol.listener.data.IOriginDataListener
import com.veepoo.protocol.listener.data.ITextAlarmDataListener
import com.veepoo.protocol.model.datas.HRVOriginData
import com.veepoo.protocol.model.datas.OriginData
import com.veepoo.protocol.model.datas.OriginData3
import com.veepoo.protocol.model.datas.OriginHalfHourData
import com.veepoo.protocol.model.datas.Spo2hOriginData
import com.veepoo.protocol.model.datas.TextAlarmData
import com.veepoo.protocol.model.datas.TimeData
import com.veepoo.protocol.model.settings.TextAlarm2Setting
import com.veepoo.protocol.shareprence.VpSpGetUtil
import com.veepoo.protocol.util.EcgUtil
import com.veepoo.protocol.listener.data.IDeviceManualDetectDataListener
import com.veepoo.protocol.listener.data.IECGDetectListener
import com.veepoo.protocol.model.datas.EcgDetectInfo
import com.veepoo.protocol.model.datas.EcgDetectResult
import com.veepoo.protocol.model.datas.EcgDetectState
import com.veepoo.protocol.model.datas.EcgDiagnosis
import com.veepoo.protocol.model.datas.BloodComponentManualData
import com.veepoo.protocol.model.datas.BloodGlucoseManualData
import com.veepoo.protocol.model.datas.BloodOxygenManualData
import com.veepoo.protocol.model.datas.BloodPressureManualData
import com.veepoo.protocol.model.datas.BodyTemperatureManualData
import com.veepoo.protocol.model.datas.EmotionManualData
import com.veepoo.protocol.model.datas.FatigueManualData
import com.veepoo.protocol.model.datas.HeartRateManualData
import com.veepoo.protocol.model.datas.HrvManualData
import com.veepoo.protocol.model.datas.MetoManualData
import com.veepoo.protocol.model.datas.MiniCheckupManualData
import com.veepoo.protocol.model.datas.PressureManualData
import com.veepoo.protocol.model.datas.SkinConductanceManualData
import com.veepoo.protocol.model.enums.DeviceManualDataType
import java.util.concurrent.ConcurrentHashMap

/**
 * Veepoo SDK (VPOperateManager) bilan ishlaydi, JavaScript'ga bog'liq emas.
 * Natijalar [emitEvent] orqali uch oqimga bo'linadi: "scan", "connection", "event".
 *
 * SDK buyruqlarni parallel bajarmaydi (hujjatda ogohlantirilgan). 1-bosqichda buyruqlar qo'lda,
 * birin-ketin yuboriladi; buyruqlar navbati 2-bosqichda qo'shiladi (docs/watch-integration-plan.md).
 */
class WatchController(
  context: Context,
  private val emitEvent: (String, Map<String, Any?>) -> Unit,
) {
  private val appContext: Context = context.applicationContext
  private val manager: VPOperateManager

  @Volatile private var currentId: String? = null
  @Volatile private var ready = false
  @Volatile private var lastState = "disconnected"
  @Volatile private var lastSocial: FunctionSocailMsgData? = null
  private var statusListener: IABleConnectStatusListener? = null
  private var spo2Listener: ISpo2hDataListener? = null
  @Volatile private var ecgType = 0 // EKG ADC -> mV formulasining turi (EcgDetectState.ecgType)
  @Volatile private var glucoseListener: IBloodGlucoseChangeListener? = null
  @Volatile private var watchDays = 3 // soat saqlaydigan kunlik ma'lumot (kun); ulanishda soat aytadi
  private val textAlarmCache = ConcurrentHashMap<Int, TextAlarm2Setting>()
  private val autoMeasureCache = ConcurrentHashMap<Int, AutoMeasureData>()

  /** Ulanish urinishining raqami: Bluetooth o'chirilgan yoki uzilgandan keyin eski urinishning kech kelgan javoblari e'tiborsiz. */
  @Volatile private var session = 0
  @Volatile private var lastReason: String? = null
  @Volatile private var scanning = false

  // Telefonda Bluetooth o'chirilsa SDK uzilishni kech yoki umuman bildirmasligi mumkin: holatni o'zimiz kuzatamiz.
  private val bluetoothReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != BluetoothAdapter.ACTION_STATE_CHANGED) return
      when (intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)) {
        BluetoothAdapter.STATE_TURNING_OFF, BluetoothAdapter.STATE_OFF -> onBluetoothOff()
        BluetoothAdapter.STATE_ON -> emitEvent("bluetooth", mapOf("on" to true))
      }
    }
  }

  init {
    synchronized(WatchController::class.java) {
      if (!sdkInitialized) {
        VPOperateManager.getInstance().init(appContext)
        sdkInitialized = true
      }
    }
    manager = VPOperateManager.getInstance()

    val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      appContext.registerReceiver(bluetoothReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      appContext.registerReceiver(bluetoothReceiver, filter)
    }
  }

  /** Modul yo'q qilinganda (JS qayta yuklanishi): qabul qilgich ikki marta ro'yxatda qolib ketmasin. */
  fun release() {
    try {
      appContext.unregisterReceiver(bluetoothReceiver)
    } catch (ignored: IllegalArgumentException) {
      // Allaqachon olib tashlangan.
    }
  }

  // ---------------------------------------------------------------- yordamchilar

  /** [reason] — JS tarjima qiladigan sabab kodi (hozircha faqat "bluetoothOff"), [message] esa faqat o'zbekcha. */
  private fun emitConn(state: String, message: String? = null, reason: String? = null) {
    lastState = state
    lastReason = reason
    emitEvent("connection", mapOf("state" to state, "id" to currentId, "message" to message, "reason" to reason))
  }

  /**
   * Joriy ulanish holati. JS qayta yuklansa (dev'da tez-tez) native qism ulanishni saqlab turadi,
   * shuning uchun JS ishga tushganda shu holatni so'rab oladi.
   */
  fun connectionSnapshot(): Map<String, Any?> =
    mapOf("state" to lastState, "id" to currentId, "message" to null, "reason" to lastReason)

  // ---------------------------------------------------------------- Bluetooth

  fun isBluetoothEnabled(): Boolean =
    appContext.getSystemService(BluetoothManager::class.java)?.adapter?.isEnabled == true

  /** Bluetooth o'chirildi: skan to'xtaydi, soat (ulangan yoki ulanayotgan) uziladi. */
  private fun onBluetoothOff() {
    if (scanning) {
      scanning = false
      try {
        manager.stopScanDevice()
      } catch (ignored: Throwable) {
        // Adapter o'chayotganda SDK xato berishi mumkin.
      }
      emitEvent("scan", mapOf("state" to "bluetoothOff"))
    }
    val active = ready || lastState == "connecting" || lastState == "authenticating"
    if (active) {
      dropConnection()
      emitConn("disconnected", "Bluetooth o'chirildi", "bluetoothOff")
    }
    emitEvent("bluetooth", mapOf("on" to false))
  }

  /** Ulanishni tashlaydi; kech kelgan SDK javoblari [session] tufayli hech narsa yubormaydi. */
  private fun dropConnection() {
    session += 1
    ready = false
    val id = currentId
    statusListener?.let { listener -> id?.let { manager.unregisterConnectStatusListener(it, listener) } }
    statusListener = null
    try {
      manager.disconnectWatch(writer("disconnectWatch"))
    } catch (ignored: Throwable) {
      // Bluetooth o'chiq bo'lsa SDK xato berishi mumkin: aloqa baribir yo'q.
    }
  }

  private fun emitData(type: String, vararg pairs: Pair<String, Any?>) {
    emitEvent("event", mapOf<String, Any?>("type" to type) + pairs)
  }

  private fun writer(op: String): IBleWriteResponse = object : IBleWriteResponse {
    override fun onResponse(code: Int) {
      if (code != Code.REQUEST_SUCCESS) {
        emitData("writeError", "op" to op, "code" to code, "message" to Code.toString(code))
      }
    }
  }

  private inline fun safe(op: String, block: () -> Unit) {
    try {
      block()
    } catch (t: Throwable) {
      emitData("error", "op" to op, "message" to (t.message ?: t.javaClass.simpleName))
    }
  }

  private fun requireReady(op: String): Boolean {
    if (ready) return true
    emitData("error", "op" to op, "message" to "Soat bilan aloqa tayyor emas (avval ulaning)")
    return false
  }

  // ---------------------------------------------------------------- skan

  fun startScan() = safe("startScan") {
    // Bluetooth o'chiq bo'lsa SDK skani jimgina ishlamaydi (hujjat): foydalanuvchiga aytish uchun alohida holat.
    if (!manager.isBluetoothOpened) {
      emitEvent("scan", mapOf("state" to "bluetoothOff"))
      return@safe
    }
    manager.startScanDevice(object : SearchResponse {
      override fun onSearchStarted() {
        scanning = true
        emitEvent("scan", mapOf("state" to "started"))
      }

      override fun onDeviceFounded(device: SearchResult?) {
        if (device == null) return
        emitEvent(
          "scan",
          mapOf("state" to "found", "id" to device.address, "name" to device.name, "rssi" to device.rssi),
        )
      }

      override fun onSearchStopped() {
        scanning = false
        emitEvent("scan", mapOf("state" to "stopped"))
      }

      override fun onSearchCanceled() {
        scanning = false
        emitEvent("scan", mapOf("state" to "stopped"))
      }
    })
  }

  fun stopScan() = safe("stopScan") { manager.stopScanDevice() }

  // ---------------------------------------------------------------- ulanish

  /** [confirmOnWatch] true: qo'lda ulash, soat ekranida tasdiq so'raydi. false: avto-qayta ulash. */
  fun connect(id: String, confirmOnWatch: Boolean) = safe("connect") {
    // Zaxira tekshiruv (JS avval Bluetooth'ni yoqishni so'raydi): aks holda SDK tushunarsiz kod bilan yiqiladi.
    if (!isBluetoothEnabled()) {
      currentId = id
      ready = false
      emitConn("error", "Telefonda Bluetooth o'chiq", "bluetoothOff")
      return@safe
    }
    manager.stopScanDevice()
    currentId = id
    ready = false
    val token = ++session
    manager.setDeviceShowConfirm(confirmOnWatch)
    emitConn("connecting")
    manager.connectDevice(
      id,
      object : IConnectResponse {
        override fun connectState(code: Int, profile: BleGattProfile?, isOadModel: Boolean) {
          if (token != session) return
          if (code == Code.REQUEST_SUCCESS) {
            emitData("log", "message" to "BLE ulandi (OAD rejimi: $isOadModel)")
          } else {
            emitConn("error", "Ulanib bo'lmadi: ${Code.toString(code)}")
          }
        }
      },
      object : INotifyResponse {
        override fun notifyState(state: Int) {
          if (token != session) return
          if (state == Code.REQUEST_SUCCESS) {
            authenticate(token)
          } else {
            emitConn("error", "Aloqa kanali ochilmadi: ${Code.toString(state)}")
          }
        }
      },
    )
  }

  private fun authenticate(token: Int) = safe("confirmDevicePwd") {
    emitConn("authenticating")
    manager.confirmDevicePwd(
      writer("confirmDevicePwd"),
      object : IPwdDataListener {
        override fun onPwdDataChange(data: PwdData?) {
          if (token != session) return
          val status = data?.getmStatus()
          emitData(
            "pwd",
            "status" to status?.name,
            "deviceVersion" to data?.deviceVersion,
            "deviceTestVersion" to data?.deviceTestVersion,
            "deviceNumber" to data?.deviceNumber,
          )
          when (status) {
            EPwdStatus.CHECK_SUCCESS, EPwdStatus.CHECK_AND_TIME_SUCCESS -> markReady()
            EPwdStatus.CHECK_FAIL -> {
              emitConn("error", "Soat paroli noto'g'ri (standart: 0000)")
              disconnect()
            }
            else -> Unit
          }
        }

        override fun onConnectionConfirmTimeout() {
          if (token != session) return
          emitConn("error", "Soat ekranida tasdiqlash vaqti tugadi")
          disconnect()
        }
      },
      object : IDeviceFuctionDataListener {
        override fun onFunctionSupportDataChange(data: FunctionDeviceSupportData?) {
          // Soat necha kunlik kunlik (5 daqiqalik) ma'lumot saqlaydi: readDailyData shundan foydalanadi.
          data?.wathcDay?.let { if (it > 0) watchDays = it }
          // Shakar (qon glyukozasi): o'lchov, bitta qiymatli va ko'p nuqtali kalibrlash imkoniyatlari.
          emitData(
            "features",
            "bloodGlucose" to data?.bloodGlucose?.name,
            "bloodGlucoseAdjusting" to data?.bloodGlucoseAdjusting?.name,
            "bloodGlucoseMultipleAdjusting" to data?.bloodGlucoseMultipleAdjusting?.name,
            "bloodComponent" to data?.bloodComponent?.name,
          )
        }

        override fun onDeviceFunctionPackage1Report(data: DeviceFunctionPackage1?) {
          emitData(
            "features",
            "bloodPressure" to data?.bloodPressure?.name,
            "heartRateDetect" to data?.heartRateDetect?.name,
          )
        }

        override fun onDeviceFunctionPackage2Report(data: DeviceFunctionPackage2?) {
          // Yostiqchali bosim buyrug'i shu imkoniyatga bog'liq (startCuffBp izohiga qarang).
          emitData("features", "sportModel" to data?.sportModelFunction?.name)
        }

        override fun onDeviceFunctionPackage3Report(data: DeviceFunctionPackage3?) {
          emitData(
            "features",
            "temperature" to data?.temperatureFunction?.name,
            "bloodGlucose" to data?.bloodGlucose?.name,
          )
        }

        override fun onDeviceFunctionPackage4Report(data: DeviceFunctionPackage4?) {
          emitData(
            "features",
            "autoMeasure" to data?.autoMeasure?.name,
            "bloodComponent" to data?.bloodComponent?.name,
          )
        }

        override fun onDeviceFunctionPackage5Report(data: DeviceFunctionPackage5?) {
          emitData("features", "textImagePush" to data?.textImagePush?.name)
        }
      },
      socialListener(),
      DEFAULT_PASSWORD,
      true,
    )
  }

  private fun markReady() {
    if (ready) return
    ready = true
    registerStatusListener()
    emitConn("ready")
  }

  private fun registerStatusListener() {
    val id = currentId ?: return
    statusListener?.let { manager.unregisterConnectStatusListener(id, it) }
    val listener = object : IABleConnectStatusListener() {
      override fun onConnectStatusChanged(mac: String?, status: Int) {
        if (status == Constants.STATUS_DISCONNECTED) {
          ready = false
          // SDK uzilishni Bluetooth o'chishi haqidagi xabardan oldin bildirishi mumkin: sababni shu yerda ham aniqlaymiz.
          if (isBluetoothEnabled()) {
            emitConn("disconnected", "Soat bilan aloqa uzildi")
          } else {
            emitConn("disconnected", "Bluetooth o'chirildi", "bluetoothOff")
          }
        }
      }
    }
    statusListener = listener
    manager.registerConnectStatusListener(id, listener)
  }

  fun disconnect() = safe("disconnect") {
    dropConnection()
    emitConn("disconnected")
  }

  // ---------------------------------------------------------------- o'qishlar

  fun readBattery() = safe("readBattery") {
    if (!requireReady("readBattery")) return@safe
    manager.readBattery(
      writer("readBattery"),
      object : IBatteryDataListener {
        override fun onDataChange(data: BatteryData?) {
          if (data == null) return
          emitData(
            "battery",
            "level" to data.batteryLevel,
            "percent" to data.batteryPercent,
            "isPercent" to data.isPercent,
            "isLow" to data.isLowBattery,
            "state" to data.state,
          )
        }
      },
    )
  }

  fun startHeart() = safe("startHeart") {
    if (!requireReady("startHeart")) return@safe
    manager.startDetectHeart(
      writer("startDetectHeart"),
      object : IHeartDataListener {
        override fun onDataChange(data: HeartData?) {
          if (data == null) return
          emitData("heart", "status" to data.heartStatus?.name, "value" to data.data)
        }
      },
    )
  }

  // To'xtatish buyruqlari ulanish uzilganda jim o'tadi: JS bekor qilish/xatodan keyin ham chaqiradi.
  fun stopHeart() = safe("stopHeart") {
    if (!ready) return@safe
    manager.stopDetectHeart(writer("stopDetectHeart"))
  }

  /** Qondagi kislorod (SpO2): soat to'xtatilmaguncha qiymatlarni oqim bilan yuboradi. */
  fun startSpo2() = safe("startSpo2") {
    if (!requireReady("startSpo2")) return@safe
    val listener = object : ISpo2hDataListener {
      override fun onSpO2HADataChange(data: Spo2hData?) {
        if (data == null) return
        emitData(
          "spo2",
          "value" to data.value,
          "rate" to data.rateValue,
          "deviceState" to data.deviceState?.name,
          "checking" to data.isChecking,
          "progress" to data.checkingProgress,
        )
      }
    }
    spo2Listener = listener
    manager.startDetectSPO2H(writer("startDetectSPO2H"), listener)
  }

  fun stopSpo2() = safe("stopSpo2") {
    if (!ready) return@safe
    manager.stopDetectSPO2H(writer("stopDetectSPO2H"), spo2Listener)
  }

  /** Tana harorati: soat o'zi yakunlaydi, jarayonni `progress` bilan bildiradi. */
  fun startTemp() = safe("startTemp") {
    if (!requireReady("startTemp")) return@safe
    manager.startDetectTempture(
      writer("startDetectTempture"),
      object : ITemptureDetectDataListener {
        override fun onDataChange(data: TemptureDetectData?) {
          if (data == null) return
          emitData(
            "temp",
            "temp" to data.tempture,
            "base" to data.temptureBase,
            "progress" to data.progress,
            "deviceState" to data.deviceState,
            "oprate" to data.oprate,
          )
        }
      },
    )
  }

  /**
   * EKG: odam boshqa qo'lining barmog'ini soatning metall qismiga (elektrodga) tegizib turadi. Holat soniyada bir
   * keladi ("ecg": dataType, wear, hr1/hr2, hrv, qtc, br2, progress), natija oxirida ("ecg" dataType 2/4 yoki
   * "ecgResult"). To'lqin har paketda keladi; hozircha chizilmaydi, faqat signal borligi uchun nuqtalar soni.
   */
  fun startEcg() = safe("startEcg") {
    if (!requireReady("startEcg")) return@safe
    ecgType = 0 // har o'lchovda holat paketidan qayta olinadi
    manager.startDetectECG(
      writer("startDetectECG"),
      true,
      object : IECGDetectListener {
        override fun onEcgDetectInfoChange(info: EcgDetectInfo?) {
          if (info == null) return
          emitData("ecgInfo", "frequency" to info.frequency, "drawFrequency" to info.drawFrequency)
        }

        override fun onEcgDetectStateChange(state: EcgDetectState?) {
          if (state == null) return
          if (state.ecgType > 0) ecgType = state.ecgType
          emitData(
            "ecg",
            "dataType" to state.dataType,
            "deviceState" to state.deviceState?.name,
            "wear" to state.wear,
            "hr1" to state.hr1,
            "hr2" to state.hr2,
            "hrv" to state.hrv,
            "br1" to state.br1,
            "br2" to state.br2,
            "qtc" to state.qtc,
            "progress" to state.progress,
            "ecgType" to state.ecgType,
          )
        }

        override fun onEcgDetectResultChange(result: EcgDetectResult?) {
          if (result == null) return
          emitData(
            "ecgResult",
            "success" to result.isSuccess,
            "hr" to result.aveHeart,
            "hrv" to result.aveHrv,
            "qtc" to result.aveQT,
            "br" to result.aveResRate,
            "duration" to result.duration,
          )
        }

        override fun onEcgDetectDiagnosisChange(diagnosis: EcgDiagnosis?) {
          if (diagnosis == null) return
          emitData(
            "ecgResult",
            "success" to diagnosis.isSuccess,
            "hr" to diagnosis.heartRate,
            "hrv" to diagnosis.hrv,
            "qtc" to diagnosis.qtTime,
            "br" to diagnosis.respRate,
            "duration" to diagnosis.duration,
          )
        }

        override fun onEcgADCChange(data: IntArray?, power: IntArray?) {
          if (data == null) return
          // Xom ADC -> mV: SDK'ning EcgUtil'i (vendor demo EcgHeartRealthView kabi). Formula soat turiga (ecgType) bog'liq,
          // noto'g'ri tur 0 qaytaradi, shuning uchun tur holat paketidan, bo'lmasa SDK saqlagan qurilma sozlamasidan.
          // Kuchaytirish doim 20: ikkinchi massiv (`power`) SDK hujjatiga ko'ra charchoq ma'lumoti, kuchaytirish emas,
          // vendor demo ham amalda doim 20 beradi. (Avval power[i] ishlatilgani paket boshidagi nuqtalarni buzardi.)
          // Int.MAX_VALUE — yaroqsiz nuqta (SDK hujjati), tashlanadi.
          val type = if (ecgType > 0) ecgType else VpSpGetUtil.getVpSpVariInstance(appContext).getECGType()
          val mv = ArrayList<Double>(data.size)
          val adcs = ArrayList<Int>(data.size)
          for (adc in data) {
            if (adc == Int.MAX_VALUE) continue
            val value = EcgUtil.convertToMvWithValue(adc, type, false, ECG_GAIN)
            mv.add(Math.round(value * 1000.0) / 1000.0)
            adcs.add(adc)
          }
          // `adc` — o'girishdan oldingi xom qiymatlar: diagnostika uchun (EKG "to'rtburchak" bo'lib chiqishi — mV ga
          // o'girish formulasi yoki soat turi noto'g'ri bo'lsa shunday bo'ladi; xom qiymatdan to'g'ri formulani topamiz).
          emitData(
            "ecgWave",
            "n" to mv.size,
            "mv" to mv,
            "adc" to adcs,
            "ecgType" to type,
            "powerSize" to (power?.size ?: 0),
          )
        }
      },
    )
  }

  fun stopEcg() = safe("stopEcg") {
    if (!ready) return@safe
    manager.stopDetectECG(writer("stopDetectECG"), true, null) // vendor demo ham listener o'rniga null beradi
  }

  fun stopTemp() = safe("stopTemp") {
    if (!ready) return@safe
    manager.stopDetectTempture(writer("stopDetectTempture"), null) // hujjat: listener o'rniga null berish mumkin
  }

  /**
   * Shakar (qon glyukozasi), optik, taxminiy. Soat jarayonni `progress` (0..100) bilan bildiradi, qiymat (mmol/l —
   * SDK xom sonni 100 ga bo'ladi) va xavf darajasi oxirida keladi. Holat xatolari: NONSUPPORT, LOW_POWER, BUSY,
   * WEARING_ERROR. Kalibrlash (setBloodGlucoseAdjustingData) hozircha ishlatilmaydi.
   * Supported flag: [VpSpGetUtil.isSupportBloodGlucoseDetect] (ulanishdan keyin SDK saqlaydi).
   */
  fun startGlucose() = safe("startGlucose") {
    if (!requireReady("startGlucose")) return@safe
    val listener = object : AbsGlucoseListener() {
      override fun onDetectError(opt: Int, status: EBloodGlucoseStatus?) {
        emitData("glucoseError", "status" to status?.name, "opt" to opt)
      }

      override fun onBloodGlucoseDetect(progress: Int, bloodGlucose: Float, level: EBloodGlucoseRiskLevel?) {
        emitData(
          "glucose",
          "progress" to progress,
          "value" to Math.round(bloodGlucose * 100.0) / 100.0,
          "risk" to level?.name,
        )
      }

      override fun onBloodGlucoseStopDetect() {
        emitData("glucoseStop")
      }
    }
    glucoseListener = listener
    emitData(
      "glucoseSupport",
      "detect" to VpSpGetUtil.getVpSpVariInstance(appContext).isSupportBloodGlucoseDetect,
      "any" to VpSpGetUtil.getVpSpVariInstance(appContext).isSupportBloodGlucose,
    )
    manager.startBloodGlucoseDetect(writer("startBloodGlucoseDetect"), listener)
  }

  fun stopGlucose() = safe("stopGlucose") {
    if (!ready) return@safe
    // SDK to'xtatish javobini ham shu listener orqali beradi: start'dagi listener qayta beriladi.
    val listener = glucoseListener ?: object : AbsGlucoseListener() {}
    manager.stopBloodGlucoseDetect(writer("stopBloodGlucoseDetect"), listener)
  }

  /**
   * Qon tahlili (lipidlar va siydik kislotasi), optik, taxminiy. `false` — Normal rejim (Personal = kalibrlash, keyinroq).
   * SDK: qurilmada funksiya yo'q bo'lsa (`isSupportBloodComponent`) buyruqni jimgina yubormaydi, shuning uchun o'zimiz
   * tekshirib "UNSUPPORTED" xatosini beramiz. Qiymatlar SDK ichida: siydik kislotasi /10 (µmol/l), qolganlari /100 (mmol/l).
   * Hodisalar: "blood" (progress + joriy qiymatlar), "bloodDone" (yakuniy), "bloodError" {state}, "bloodStop".
   */
  fun startBloodComponent() = safe("startBloodComponent") {
    if (!requireReady("startBloodComponent")) return@safe
    if (!VpSpGetUtil.getVpSpVariInstance(appContext).isSupportBloodComponent) {
      emitData("bloodError", "state" to "UNSUPPORTED")
      return@safe
    }
    manager.startDetectBloodComponent(
      bleWriter("startDetectBloodComponent"),
      false,
      object : IBloodComponentDetectListener {
        override fun onDetectFailed(errorState: EBloodComponentDetectState) {
          emitData("bloodError", "state" to errorState.name)
        }

        override fun onDetecting(progress: Int, bloodComponent: BloodComponent) {
          emitData("blood", "progress" to progress, *bloodParts(bloodComponent))
        }

        override fun onDetectStop() {
          emitData("bloodStop")
        }

        override fun onDetectComplete(bloodComponent: BloodComponent) {
          emitData("bloodDone", *bloodParts(bloodComponent))
        }
      },
    )
  }

  fun stopBloodComponent() = safe("stopBloodComponent") {
    if (!ready) return@safe
    manager.stopDetectBloodComponent(bleWriter("stopDetectBloodComponent"))
  }

  private fun bloodParts(b: BloodComponent): Array<Pair<String, Any?>> {
    val r = { v: Float -> Math.round(v * 100.0) / 100.0 }
    return arrayOf(
      "uricAcid" to r(b.uricAcid),
      "tcho" to r(b.tCHO),
      "tag" to r(b.tAG),
      "hdl" to r(b.hDL),
      "ldl" to r(b.lDL),
    )
  }

  /** Ba'zi SDK metodlari (qon tahlili) inuker kutubxonasining `BleWriteResponse` ini kutadi. */
  private fun bleWriter(op: String): BleWriteResponse = BleWriteResponse { code ->
    if (code != Code.REQUEST_SUCCESS) {
      emitData("writeError", "op" to op, "code" to code, "message" to Code.toString(code))
    }
  }

  /** IBloodGlucoseChangeListener'ning kalibrlash metodlari bizga kerak emas: bo'sh. */
  private abstract class AbsGlucoseListener : IBloodGlucoseChangeListener {
    override fun onDetectError(opt: Int, status: EBloodGlucoseStatus?) = Unit
    override fun onBloodGlucoseDetect(progress: Int, bloodGlucose: Float, level: EBloodGlucoseRiskLevel?) = Unit
    override fun onBloodGlucoseStopDetect() = Unit
    override fun onBloodGlucoseAdjustingSettingSuccess(isOpen: Boolean, adjustingValue: Float) = Unit
    override fun onBloodGlucoseAdjustingSettingFailed() = Unit
    override fun onBloodGlucoseAdjustingReadSuccess(isOpen: Boolean, adjustingValue: Float) = Unit
    override fun onBloodGlucoseAdjustingReadFailed() = Unit
    override fun onBGMultipleAdjustingReadSuccess(isOpen: Boolean, breakfast: MealInfo?, lunch: MealInfo?, dinner: MealInfo?) = Unit
    override fun onBGMultipleAdjustingReadFailed() = Unit
    override fun onBGMultipleAdjustingSettingSuccess() = Unit
    override fun onBGMultipleAdjustingSettingFailed() = Unit
  }

  /** Havo yostiqchali bosim. `startDetectCuffBP` rasmiy hujjatda yo'q, faqat AAR ichida bor. */
  fun startCuffBp(rawFlag: Boolean) = safe("startCuffBp") {
    if (!requireReady("startCuffBp")) return@safe
    // AAR bytecode'i (VPOperateManager.startDetectCuffBP): `FunctionCheckUtil.checkSportModel()` false bo'lsa
    // buyruq yuborilmaydi va callback ham kelmaydi. Jim kutib qolmaslik uchun oldindan aniq xabar beramiz.
    if (!VpSpGetUtil.getVpSpVariInstance(appContext).isSupportSportModel) {
      emitData("cuffBp", "unsupported" to true)
      return@safe
    }
    manager.startDetectCuffBP(
      writer("startDetectCuffBP"),
      rawFlag,
      object : ICuffBPDetectDataListener {
        override fun onCuffDataChange(flag: Boolean, data: VPCuffBPTestData?) {
          if (data == null) return
          emitData(
            "cuffBp",
            "flag" to flag,
            "sbp" to data.sbpValue,
            "dbp" to data.dbpValue,
            "status" to data.status?.name,
            "heart" to data.heartValue,
            "pressure" to data.pressureValue,
            "rate" to data.rate,
          )
        }
      },
    )
  }

  fun stopCuffBp() = safe("stopCuffBp") {
    if (!ready) return@safe
    manager.stopDetectCuffBP(writer("stopDetectCuffBP"))
  }

  /**
   * Soatning o'zida o'lchangan qon bosimi yozuvlarini o'qiydi. Bu SDK hujjatida yozilgan rasmiy yo'l
   * ("Reading Device Manual Measurement Data", faqat nasosli bosimi bor soatlar uchun); ilovadan nasosni
   * boshlash esa hujjatlashtirilmagan. [sinceSec]: shu vaqtdan (soniya, epoch) yangi yozuvlar.
   * Natija "manualBp" hodisasi bilan keladi: `records`, keyin `complete` yoki `failed`.
   */
  fun readManualBp(sinceSec: Int) = safe("readManualBp") {
    if (!requireReady("readManualBp")) return@safe
    val types = listOf(DeviceManualDataType.BLOOD_PRESSURE)
    manager.readDeviceManualData(
      writer("readDeviceManualData"),
      sinceSec.toLong(),
      types,
      types,
      object : IDeviceManualDetectDataListener {
        override fun onBloodPressureDataChange(list: MutableList<BloodPressureManualData>?) {
          val records = (list ?: emptyList()).map { d ->
            mapOf<String, Any?>(
              "at" to d.timeStamp,
              "sys" to d.systolic,
              "dia" to d.diastolic,
              "hr" to d.heartRate,
              "mode" to d.measurementMode,
              "version" to d.version,
              "status" to d.testStatus,
              "credibility" to d.resultCredibility,
            )
          }
          emitData("manualBp", "records" to records)
        }

        override fun onHeartRateDataChange(list: MutableList<HeartRateManualData>?) = Unit
        override fun onBloodGlucoseDataChange(list: MutableList<BloodGlucoseManualData>?) = Unit
        override fun onPressureManualDataChange(list: MutableList<PressureManualData>?) = Unit
        override fun onBloodOxygenDataChange(list: MutableList<BloodOxygenManualData>?) = Unit
        override fun onBodyTemperatureDataChange(list: MutableList<BodyTemperatureManualData>?) = Unit
        override fun onMetoManualDataChange(list: MutableList<MetoManualData>?) = Unit
        override fun onHrvManualDataChange(list: MutableList<HrvManualData>?) = Unit
        override fun onBloodComponentManualDataChange(list: MutableList<BloodComponentManualData>?) = Unit
        override fun onMiniCheckupManualDataChange(list: MutableList<MiniCheckupManualData>?) = Unit
        override fun onEmotionManualDataChange(list: MutableList<EmotionManualData>?) = Unit
        override fun onFatigueManualDataChange(list: MutableList<FatigueManualData>?) = Unit
        override fun onSkinConductanceManualDataChange(list: MutableList<SkinConductanceManualData>?) = Unit

        override fun onReadProgress(progress: Float) = Unit

        override fun onReadComplete() {
          emitData("manualBp", "complete" to true)
        }

        override fun onReadFail() {
          emitData("manualBp", "failed" to true)
        }
      },
    )
  }

  /**
   * History sinxroni: soatning o'zida (yoki ilovadan) o'lchanib soat xotirasida qolgan yozuvlar, bir necha tur birga.
   * [kinds]: "bp", "hr", "spo2", "temp", "glucose", "blood". [sinceSec]: shu vaqtdan (soniya, epoch) yangilari.
   * Qiymatlarni SDK o'zi birlikka o'giradi (shakar va lipidlar /100, siydik kislotasi /10 — AAR bytecode'i, vp_aa).
   * Natija "manualData" hodisasi bilan keladi: har tur uchun `{kind, records}`, oxirida `complete` yoki `failed`.
   */
  fun readManualData(sinceSec: Int, kinds: List<String>) = safe("readManualData") {
    if (!requireReady("readManualData")) return@safe
    val types = kinds.mapNotNull { MANUAL_TYPES[it] }.distinct()
    if (types.isEmpty()) {
      emitData("manualData", "complete" to true)
      return@safe
    }
    val emit = { kind: String, records: List<Map<String, Any?>> -> emitData("manualData", "kind" to kind, "records" to records) }
    manager.readDeviceManualData(
      writer("readDeviceManualData"),
      sinceSec.toLong(),
      types,
      types,
      object : IDeviceManualDetectDataListener {
        override fun onBloodPressureDataChange(list: MutableList<BloodPressureManualData>?) = emit(
          "bp",
          (list ?: emptyList()).map { d ->
            mapOf("at" to d.timeStamp, "sys" to d.systolic, "dia" to d.diastolic, "hr" to d.heartRate, "mode" to d.measurementMode)
          },
        )

        override fun onHeartRateDataChange(list: MutableList<HeartRateManualData>?) = emit(
          "hr",
          (list ?: emptyList()).map { d -> mapOf("at" to d.timeStamp, "values" to (d.rate?.toList() ?: emptyList())) },
        )

        override fun onBloodOxygenDataChange(list: MutableList<BloodOxygenManualData>?) = emit(
          "spo2",
          (list ?: emptyList()).map { d -> mapOf("at" to d.timeStamp, "values" to (d.oxygen?.toList() ?: emptyList())) },
        )

        override fun onBodyTemperatureDataChange(list: MutableList<BodyTemperatureManualData>?) = emit(
          "temp",
          (list ?: emptyList()).map { d -> mapOf("at" to d.timeStamp, "value" to d.temperature.toDouble()) },
        )

        override fun onBloodGlucoseDataChange(list: MutableList<BloodGlucoseManualData>?) = emit(
          "glucose",
          (list ?: emptyList()).map { d ->
            mapOf("at" to d.timeStamp, "value" to d.bloodGlucoseValue.toDouble(), "risk" to d.risk?.name)
          },
        )

        override fun onBloodComponentManualDataChange(list: MutableList<BloodComponentManualData>?) = emit(
          "blood",
          (list ?: emptyList()).map { d ->
            mapOf(
              "at" to d.timeStamp,
              "uricAcid" to d.uricAcid.toDouble(),
              "tcho" to d.gettCHO().toDouble(),
              "tag" to d.gettAG().toDouble(),
              "hdl" to d.gethDL().toDouble(),
              "ldl" to d.getlDL().toDouble(),
            )
          },
        )

        override fun onPressureManualDataChange(list: MutableList<PressureManualData>?) = Unit
        override fun onMetoManualDataChange(list: MutableList<MetoManualData>?) = Unit
        override fun onHrvManualDataChange(list: MutableList<HrvManualData>?) = Unit
        override fun onMiniCheckupManualDataChange(list: MutableList<MiniCheckupManualData>?) = Unit
        override fun onEmotionManualDataChange(list: MutableList<EmotionManualData>?) = Unit
        override fun onFatigueManualDataChange(list: MutableList<FatigueManualData>?) = Unit
        override fun onSkinConductanceManualDataChange(list: MutableList<SkinConductanceManualData>?) = Unit

        override fun onReadProgress(progress: Float) = Unit

        override fun onReadComplete() {
          emitData("manualData", "complete" to true)
        }

        override fun onReadFail() {
          emitData("manualData", "failed" to true)
        }
      },
    )
  }

  // ---------------------------------------------------------------- kunlik ma'lumot (avto-o'lchovlar)

  /**
   * Soatning kunlik 5 daqiqalik ma'lumoti: avto-o'lchash ("Rejam") natijalari shu yerga yoziladi — puls, bosim,
   * harorat, (yangi protokolda) SpO2, shakar, qon tahlili. Bugundan boshlab [days] kun (soat saqlaganidan ko'p emas).
   * SDK hujjati: protokol versiyasi 3 yoki 5 bo'lsa `IOriginData3Listener`, aks holda `IOriginDataListener`.
   * Faqat biror o'lchov bor 5 daqiqalik yozuvlar yuboriladi: "dailyData" `{records}` (bo'laklab), oxirida
   * `{complete}`, vaqt tugasa `{timeout}`. Vaqt soatning mahalliy vaqti (y, mo, d, h, mi) — JS Date'ga o'giradi.
   */
  fun readDailyData(days: Int) = safe("readDailyData") {
    if (!requireReady("readDailyData")) return@safe
    val span = days.coerceIn(1, watchDays.coerceAtLeast(1))
    val records = ArrayList<Map<String, Any?>>()

    fun flush() {
      if (records.isEmpty()) return
      emitData("dailyData", "records" to ArrayList(records))
      records.clear()
    }

    fun positive(xs: IntArray?): List<Int>? = xs?.filter { it > 0 }?.takeIf { it.isNotEmpty() }

    fun add(t: TimeData?, fields: Map<String, Any?>) {
      if (t == null || fields.values.none { it != null }) return
      records.add(mapOf("y" to t.year, "mo" to t.month, "d" to t.day, "h" to t.hour, "mi" to t.minute) + fields)
      if (records.size >= 200) flush()
    }

    fun fromBase(d: OriginData): Map<String, Any?> = mapOf(
      "hr" to d.rateValue.takeIf { it > 0 },
      "sys" to d.highValue.takeIf { it > 0 },
      "dia" to d.lowValue.takeIf { it > 0 },
      "temp" to d.temperature.takeIf { it > 0 },
    )

    val useV3 = VpSpGetUtil.getVpSpVariInstance(appContext).originProtocolVersion.let { it == 3 || it == 5 }
    if (useV3) {
      manager.readOriginData(
        writer("readOriginData"),
        object : IOriginData3Listener {
          override fun onOriginFiveMinuteListDataChange(list: MutableList<OriginData3>?) {
            for (d in list ?: emptyList()) {
              val bc = d.bloodComponent
              val blood = bc?.let {
                mapOf(
                  "uricAcid" to it.uricAcid.toDouble(),
                  "tcho" to it.tCHO.toDouble(),
                  "tag" to it.tAG.toDouble(),
                  "hdl" to it.hDL.toDouble(),
                  "ldl" to it.lDL.toDouble(),
                ).takeIf { m -> m.values.any { v -> v > 0 } }
              }
              add(
                d.getmTime(),
                fromBase(d) + mapOf(
                  "hrs" to positive(d.ppgs),
                  "spo2" to positive(d.oxygens),
                  "glucose" to d.bloodGlucose.toDouble().takeIf { it > 0 },
                  "blood" to blood,
                ),
              )
            }
            flush()
          }

          override fun onOriginHalfHourDataChange(data: OriginHalfHourData?) = Unit
          override fun onOriginHRVOriginListDataChange(list: MutableList<HRVOriginData>?) = Unit
          override fun onOriginSpo2OriginListDataChange(list: MutableList<Spo2hOriginData>?) = Unit
          override fun onReadOriginProgressDetail(day: Int, date: String?, allPackage: Int, currentPackage: Int) = Unit
          override fun onReadOriginProgress(progress: Float) = Unit

          override fun onReadOriginComplete() {
            flush()
            emitData("dailyData", "complete" to true)
          }

          override fun onReadTimeout(day: Int) {
            flush()
            emitData("dailyData", "timeout" to true, "day" to day)
          }
        },
        span,
      )
    } else {
      manager.readOriginData(
        writer("readOriginData"),
        object : IOriginDataListener {
          override fun onOringinFiveMinuteDataChange(d: OriginData?) {
            if (d != null) add(d.getmTime(), fromBase(d))
          }

          override fun onOringinHalfHourDataChange(data: OriginHalfHourData?) = Unit
          override fun onReadOriginProgressDetail(day: Int, date: String?, allPackage: Int, currentPackage: Int) = flush()
          override fun onReadOriginProgress(progress: Float) = Unit

          override fun onReadOriginComplete() {
            flush()
            emitData("dailyData", "complete" to true)
          }

          override fun onReadTimeout(day: Int) {
            flush()
            emitData("dailyData", "timeout" to true, "day" to day)
          }
        },
        span,
      )
    }
  }

  // ---------------------------------------------------------------- soatdagi eslatmalar (matnli budilnik)

  /**
   * Matnli budilnik: soat belgilangan vaqtda o'z matnimizni ko'rsatib tebranadi (masalan "EKG o'lchash vaqti").
   * Ko'pi bilan 10 ta (SDK hujjati). Har bir amaldan keyin "textAlarm" `{op, alarms}` keladi (op: SETTING_SUCCESS,
   * ALARM_FULL, CLEAR_SUCCESS, READ_SUCCESS ...; soatda funksiya bo'lmasa UNSUPPORTED). O'chirish va yoqish/o'chirish
   * uchun SDK obyektning o'zini oladi: oxirgi ro'yxatdan (textAlarmCache).
   */
  private fun textAlarmListener() = object : ITextAlarmDataListener {
    override fun onAlarmDataChangeListListener(textAlarmData: TextAlarmData?) {
      val list = textAlarmData?.textAlarm2SettingList ?: emptyList()
      textAlarmCache.clear()
      list.forEach { textAlarmCache[it.alarmId] = it }
      emitData(
        "textAlarm",
        "op" to textAlarmData?.oprate?.name,
        "alarms" to list.map {
          mapOf(
            "id" to it.alarmId,
            "hour" to it.alarmHour,
            "minute" to it.alarmMinute,
            "repeat" to it.repeatStatus,
            "content" to it.content,
            "open" to it.isOpen,
          )
        },
      )
    }
  }

  private fun textAlarmSupported(): Boolean {
    if (VpSpGetUtil.getVpSpVariInstance(appContext).isSupportTextAlarm) return true
    emitData("textAlarm", "op" to "UNSUPPORTED")
    return false
  }

  fun readTextAlarms() = safe("readTextAlarms") {
    if (!requireReady("readTextAlarms") || !textAlarmSupported()) return@safe
    manager.readTextAlarm(writer("readTextAlarm"), textAlarmListener())
  }

  /** [repeat]: 7 belgi, masalan "1111111" (vendor demo kabi: har kuni). */
  fun addTextAlarm(hour: Int, minute: Int, repeat: String, content: String) = safe("addTextAlarm") {
    if (!requireReady("addTextAlarm") || !textAlarmSupported()) return@safe
    val setting = TextAlarm2Setting()
    setting.isOpen = true
    setting.repeatStatus = repeat
    setting.unRepeatDate = "0000-00-00"
    setting.alarmHour = hour
    setting.alarmMinute = minute
    setting.content = content
    manager.addTextAlarm(writer("addTextAlarm"), textAlarmListener(), setting)
  }

  fun deleteTextAlarm(id: Int) = safe("deleteTextAlarm") {
    if (!requireReady("deleteTextAlarm")) return@safe
    val setting = textAlarmCache[id]
    if (setting == null) {
      emitData("error", "op" to "deleteTextAlarm", "message" to "Eslatma topilmadi: avval ro'yxatni o'qing")
      return@safe
    }
    manager.deleteTextAlarm(writer("deleteTextAlarm"), textAlarmListener(), setting)
  }

  fun setTextAlarmOpen(id: Int, open: Boolean) = safe("setTextAlarmOpen") {
    if (!requireReady("setTextAlarmOpen")) return@safe
    val setting = textAlarmCache[id]
    if (setting == null) {
      emitData("error", "op" to "setTextAlarmOpen", "message" to "Eslatma topilmadi: avval ro'yxatni o'qing")
      return@safe
    }
    setting.isOpen = open
    manager.modifyTextAlarm(writer("modifyTextAlarm"), textAlarmListener(), setting)
  }

  // ---------------------------------------------------------------- bildirishnoma (7.2)

  private fun socialListener(): ISocialMsgDataListener = object : ISocialMsgDataListener {
    override fun onSocialMsgSupportDataChange(data: FunctionSocailMsgData?) = onSocial(data)
    override fun onSocialMsgSupportDataChange2(data: FunctionSocailMsgData?) = onSocial(data)
  }

  private fun onSocial(data: FunctionSocailMsgData?) {
    if (data == null) return
    lastSocial = data
    emitData("socialSwitch", "other" to data.other?.name, "phone" to data.phone?.name, "sms" to data.msg?.name)
  }

  fun readNotificationSwitches() = safe("readNotificationSwitches") {
    if (!requireReady("readNotificationSwitches")) return@safe
    manager.readSocialMsg(writer("readSocialMsg"), socialListener())
  }

  /** Soatdagi "boshqa xabarlar" kalitini yoqadi/o'chiradi (ilovaning o'z bildirishnomalari uchun). */
  fun setOtherNotifications(on: Boolean) = safe("setOtherNotifications") {
    if (!requireReady("setOtherNotifications")) return@safe
    val data = lastSocial ?: manager.functionSocailMsgData
    if (data == null) {
      emitData("error", "op" to "setOtherNotifications", "message" to "Kalit holati hali o'qilmagan: avval readNotificationSwitches")
      return@safe
    }
    data.other = if (on) EFunctionStatus.SUPPORT_OPEN else EFunctionStatus.SUPPORT_CLOSE
    manager.settingSocialMsg(writer("settingSocialMsg"), socialListener(), data)
  }

  /**
   * Soatga o'z bildirishnomamizni yuboradi. [variant]: "custom" = ESocailMsg.APP_CUSTOM_MSG
   * (hujjatda yo'q, AAR'da topilgan), "other" = hujjatlashtirilgan ESocailMsg.OTHER.
   * 1-bosqichda ikkalasi ham soatda ko'rinishi sinaladi.
   */
  fun sendNotification(title: String, body: String, variant: String) = safe("sendNotification") {
    if (!requireReady("sendNotification")) return@safe
    val kind = if (variant == "other") ESocailMsg.OTHER else ESocailMsg.APP_CUSTOM_MSG
    manager.sendSocialMsgContent(writer("sendSocialMsgContent"), ContentSocailSetting(kind, title, body))
    emitData("notifySent", "variant" to kind.name, "title" to title, "body" to body)
  }

  // ---------------------------------------------------------------- avto-o'lchash (7.5)

  private fun autoMeasureListener(): IAutoMeasureSettingDataListener = object : IAutoMeasureSettingDataListener {
    override fun onSettingDataChange(list: MutableList<AutoMeasureData>?) {
      val items = (list ?: emptyList()).map { d ->
        val type = d.funType
        autoMeasureCache[type.value] = d
        mapOf<String, Any?>(
          "type" to type.name,
          "typeValue" to type.value,
          "on" to d.isSwitchOpen,
          "stepUnit" to d.stepUnit,
          "intervalModifiable" to d.isIntervalModify,
          "slotModifiable" to d.isSlotModify,
          "intervalMin" to d.measureInterval,
          "startMin" to d.currentStartMinute,
          "endMin" to d.currentEndMinute,
          "supportStartMin" to d.supportStartMinute,
          "supportEndMin" to d.supportEndMinute,
        )
      }
      emitData("autoMeasure", "items" to items)
    }

    override fun onSettingDataChangeFail() {
      emitData("autoMeasureResult", "ok" to false)
    }

    override fun onSettingDataChangeSuccess() {
      emitData("autoMeasureResult", "ok" to true)
    }
  }

  fun readAutoMeasure() = safe("readAutoMeasure") {
    if (!requireReady("readAutoMeasure")) return@safe
    manager.readAutoMeasureSettingData(writer("readAutoMeasureSettingData"), autoMeasureListener())
  }

  /**
   * Bitta o'lchov turi uchun avto-o'lchashni yozadi. Avval [readAutoMeasure] chaqirilgan bo'lishi kerak:
   * soat qaytargan sozlama (qadam, ruxsat etilgan oraliq) o'zgartirilib qayta yoziladi.
   * [startMin]/[endMin] manfiy bo'lsa joriy oraliq saqlanadi.
   */
  fun setAutoMeasure(typeValue: Int, on: Boolean, intervalMin: Int, startMin: Int, endMin: Int) =
    safe("setAutoMeasure") {
      if (!requireReady("setAutoMeasure")) return@safe
      val data = autoMeasureCache[typeValue]
      if (data == null) {
        val name = EAutoMeasureType.values().find { it.value == typeValue }?.name ?: typeValue.toString()
        emitData("error", "op" to "setAutoMeasure", "message" to "$name sozlamasi hali o'qilmagan: avval readAutoMeasure")
        return@safe
      }
      data.isSwitchOpen = on
      data.measureInterval = intervalMin
      if (startMin >= 0) data.currentStartMinute = startMin
      if (endMin >= 0) data.currentEndMinute = endMin
      manager.setAutoMeasureSettingData(writer("setAutoMeasureSettingData"), data, autoMeasureListener())
    }

  companion object {
    private const val DEFAULT_PASSWORD = "0000"
    private const val ECG_GAIN = 20 // EcgUtil kuchaytirishi (vendor demo qiymati)
    /** History sinxroni: JS'dagi tur nomi → SDK turi. */
    private val MANUAL_TYPES = mapOf(
      "bp" to DeviceManualDataType.BLOOD_PRESSURE,
      "hr" to DeviceManualDataType.HEART_RATE,
      "spo2" to DeviceManualDataType.BLOOD_OXYGEN,
      "temp" to DeviceManualDataType.BODY_TEMPERATURE,
      "glucose" to DeviceManualDataType.BLOOD_GLUCOSE,
      "blood" to DeviceManualDataType.BLOOD_COMPOSITION,
    )

    @Volatile private var sdkInitialized = false
  }
}
