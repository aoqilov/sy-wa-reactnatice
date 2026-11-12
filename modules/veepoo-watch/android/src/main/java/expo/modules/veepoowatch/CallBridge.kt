package expo.modules.veepoowatch

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.telecom.TelecomManager
import android.telephony.TelephonyManager

/**
 * Telefon qo'ng'iroqlarini soatga uzatish ("Soat" sahifasidagi kalit).
 *
 * Telefon: `PHONE_STATE` broadcast (RINGING / OFFHOOK / IDLE). Ilova jarayoni tirik bo'lgandagina ishlaydi
 * (ochiq yoki fonda); ilova butunlay yopilganda kuzatish uchun foreground servis kerak (hali yo'q).
 * Android 9+ da raqam faqat READ_CALL_LOG bilan keladi va broadcast ikki marta yuboriladi (raqamsiz va raqamli):
 * shuning uchun RINGING da raqamni qisqa kutamiz.
 *
 * Soatdagi tugmalar (IPhoneListener): rad etish — TelecomManager.endCall (Android 9+, ANSWER_PHONE_CALLS);
 * javob berish — acceptRingingCall; ovozsiz — qo'ng'iroq ovozini o'chirish (qo'ng'iroq tugagach qaytariladi).
 */
class CallBridge(
  context: Context,
  private val isReady: () -> Boolean,
  private val showCall: (name: String, number: String) -> Unit,
  private val hideCall: () -> Unit,
  private val emit: (String, Map<String, Any?>) -> Unit,
) {
  private val appContext = context.applicationContext
  private val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private val handler = Handler(Looper.getMainLooper())

  @Volatile private var registered = false
  @Volatile private var ringing = false
  @Volatile private var shown = false
  @Volatile private var mutedByUs = false
  private var pendingShow: Runnable? = null

  val enabled: Boolean get() = prefs.getBoolean(KEY_ENABLED, false)

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
      @Suppress("DEPRECATION")
      val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
      when (intent.getStringExtra(TelephonyManager.EXTRA_STATE)) {
        TelephonyManager.EXTRA_STATE_RINGING -> onRinging(number)
        TelephonyManager.EXTRA_STATE_OFFHOOK, TelephonyManager.EXTRA_STATE_IDLE -> onCallOver()
      }
    }
  }

  init {
    if (enabled) register()
  }

  fun setEnabled(on: Boolean) {
    prefs.edit().putBoolean(KEY_ENABLED, on).apply()
    if (on) register() else unregister()
    emit("callForward", status())
  }

  /** Kalit holati va ruxsatlar: JS sahifada ko'rsatadi. */
  fun status(): Map<String, Any?> = mapOf(
    "enabled" to enabled,
    "listening" to registered,
    "phoneState" to granted(Manifest.permission.READ_PHONE_STATE),
    "callLog" to granted(Manifest.permission.READ_CALL_LOG),
    "contacts" to granted(Manifest.permission.READ_CONTACTS),
    "answerCalls" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && granted(Manifest.permission.ANSWER_PHONE_CALLS)),
  )

  fun release() {
    unregister()
  }

  private fun granted(permission: String) =
    appContext.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  private fun register() {
    if (registered) return
    val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
    // Tizim broadcast'i: faqat tizim yuboradi (himoyalangan), shuning uchun EXPORTED xavfsiz.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      appContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      appContext.registerReceiver(receiver, filter)
    }
    registered = true
  }

  private fun unregister() {
    if (!registered) return
    try {
      appContext.unregisterReceiver(receiver)
    } catch (ignored: IllegalArgumentException) {
      // Allaqachon olib tashlangan.
    }
    registered = false
  }

  // ---------------------------------------------------------------- telefon holati

  private fun onRinging(number: String?) {
    if (shown) return
    ringing = true
    pendingShow?.let { handler.removeCallbacks(it) }
    if (!number.isNullOrBlank() || !granted(Manifest.permission.READ_CALL_LOG)) {
      show(number)
      return
    }
    // Raqamsiz birinchi broadcast: raqamli ikkinchisini qisqa kutamiz, kelmasa raqamsiz ko'rsatamiz.
    val r = Runnable { if (ringing && !shown) show(null) }
    pendingShow = r
    handler.postDelayed(r, NUMBER_WAIT_MS)
  }

  private fun show(number: String?) {
    pendingShow?.let { handler.removeCallbacks(it) }
    pendingShow = null
    shown = true
    if (!isReady()) {
      emit("callForward", status() + ("skipped" to "notConnected"))
      return
    }
    val clean = number?.trim().orEmpty()
    val name = if (clean.isEmpty()) "" else lookupName(clean).orEmpty()
    val title = name.ifEmpty { clean.ifEmpty { UNKNOWN_CALLER } }
    showCall(title, clean)
    emit("callIncoming", mapOf("name" to name, "hasNumber" to clean.isNotEmpty()))
  }

  private fun onCallOver() {
    pendingShow?.let { handler.removeCallbacks(it) }
    pendingShow = null
    val wasShown = shown
    ringing = false
    shown = false
    restoreRinger()
    if (wasShown && isReady()) hideCall()
  }

  private fun lookupName(number: String): String? {
    if (!granted(Manifest.permission.READ_CONTACTS)) return null
    return try {
      val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
      appContext.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) c.getString(0) else null
      }
    } catch (t: Throwable) {
      null
    }
  }

  // ---------------------------------------------------------------- soatdagi tugmalar

  fun onWatchReject() {
    var ok = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && granted(Manifest.permission.ANSWER_PHONE_CALLS)) {
      ok = try {
        @Suppress("DEPRECATION")
        telecom()?.endCall() == true
      } catch (t: Throwable) {
        false
      }
    }
    emit("callAction", mapOf("action" to "reject", "ok" to ok))
  }

  fun onWatchAnswer() {
    var ok = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && granted(Manifest.permission.ANSWER_PHONE_CALLS)) {
      ok = try {
        @Suppress("DEPRECATION")
        telecom()?.acceptRingingCall()
        true
      } catch (t: Throwable) {
        false
      }
    }
    emit("callAction", mapOf("action" to "answer", "ok" to ok))
  }

  fun onWatchSilence() {
    val ok = try {
      val audio = appContext.getSystemService(AudioManager::class.java)
      audio?.adjustStreamVolume(AudioManager.STREAM_RING, AudioManager.ADJUST_MUTE, 0)
      mutedByUs = audio != null
      audio != null
    } catch (t: Throwable) {
      false // ba'zi telefonlarda "Bezovta qilmang" ruxsatisiz ovozni o'chirib bo'lmaydi
    }
    emit("callAction", mapOf("action" to "silence", "ok" to ok))
  }

  private fun restoreRinger() {
    if (!mutedByUs) return
    mutedByUs = false
    try {
      appContext.getSystemService(AudioManager::class.java)
        ?.adjustStreamVolume(AudioManager.STREAM_RING, AudioManager.ADJUST_UNMUTE, 0)
    } catch (ignored: Throwable) {
    }
  }

  private fun telecom(): TelecomManager? = appContext.getSystemService(TelecomManager::class.java)

  companion object {
    private const val PREFS = "veepoo_watch"
    private const val KEY_ENABLED = "callForward"
    private const val NUMBER_WAIT_MS = 800L
    private const val UNKNOWN_CALLER = "Noma'lum raqam"
  }
}
