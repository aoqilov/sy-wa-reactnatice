# Consumer R8/ProGuard qoidalari: ilova release build'ida (R8 minify) avtomatik qo'llanadi.
#
# Nima uchun kerak: vendor SDK'lar reflection, dinamik java.lang.reflect.Proxy, AIDL/Parcelable va JNI
# ishlatadi. Qoidalarsiz R8 klass/metod nomlarini qisqartiradi va soat qidiruvi ishlamay qoladi:
#   java.lang.ClassCastException: $Proxy12 cannot be cast to e80
#     at i80.handleMessage(...)
# (com.inuker.bluetooth.library.utils.proxy.ProxyUtils / utils.hook.BluetoothHooker Proxy orqali ishlaydi.)
# Debug / dev-client build'da R8 yo'q, shuning uchun xato faqat release (EAS "preview") build'da chiqadi.

-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*

# Veepoo protokol SDK (vpprotocol)
-keep class com.veepoo.** { *; }
-keep class com.vp.** { *; }
# Opus JNI (static-registered `Java_vip_inode_demo_opusaudiodemo_utils_OpusUtils_*`)
-keep class vip.inode.** { *; }

# Bluetooth skan/ulanish kutubxonasi (vpbluetooth): Proxy + hook + AIDL
-keep class com.inuker.** { *; }

# Jieli (JL) RCSP / OTA / fatfs / filebrowse / bmp_convert
-keep class com.jieli.** { *; }

# Goodix, Bluetrum, Nordic DFU (Veepoo shadelagan `vpno.nordicsemi`)
-keep class com.goodix.** { *; }
-keep class com.bluetrum.** { *; }
-keep class vpno.nordicsemi.** { *; }

# Parcelable.CREATOR va enum'lar SDK ichida reflection orqali ishlatilishi mumkin
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Saqlangan vendor kodining ixtiyoriy tashqi havolalari R8 build'ini to'xtatmasin
-dontwarn com.veepoo.**
-dontwarn com.vp.**
-dontwarn vip.inode.**
-dontwarn com.inuker.**
-dontwarn com.jieli.**
-dontwarn com.goodix.**
-dontwarn com.bluetrum.**
-dontwarn vpno.nordicsemi.**
-dontwarn io.runtime.mcumgr.**
