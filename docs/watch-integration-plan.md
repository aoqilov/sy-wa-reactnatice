# Soat bilan ulanish va ishlatish rejasi (native SDK, Android + iOS)

Reja 2026-11-06 da yozilgan, 2026-11-09 da yangilangan (ochiq savollarga javoblar kiritildi, SDK manbasi tekshirildi). Soat: E500 (Veepoo / H Band platformasi). Ilova: `synapse-watch` (Expo SDK 58, React Native 0.88).

Belgilar: **[tasdiqlangan]** SDK faylidan yoki header'dan to'g'ridan-to'g'ri o'qilgan. **[?]** hujjatda aniq emas, birinchi sinovda (1-bosqich) tekshiriladi.

---

## 1. Qarorlar

| # | Qaror | Sabab |
|---|---|---|
| 1 | **Native SDK'lar**: Android `vpprotocol-2.3.95.15.aar`, iOS `VeepooBleSDK.framework 2.2.112.15`. Ikkalasi bitta lokal Expo moduli (`modules/veepoo-watch`) ichida | Soatga bildirishnoma yuborish uni-app JS SDK'da yo'q |
| 2 | **Bildirishnoma = faqat o'zimiz yozgan** (ilovaning o'z xabarlari). Telefondagi boshqa ilovalar bildirishnomalarini soatga ko'chirmaymiz | Foydalanuvchi qarori. `NotificationListenerService`, SMS va qo'ng'iroq jurnali ruxsatlari kerak emas, Play siyosati xavfi kamayadi |
| 3 | **Do'konga chiqariladi** (Google Play + App Store) | Foydalanuvchi qarori. Ruxsatlar va foreground servis do'kon talablariga mos bo'lishi shart |
| 4 | **iOS kodi hozir yoziladi, lekin sinalmaydi.** iOS alohida bosqichda tekshiriladi | Foydalanuvchida hozircha Apple akkaunt/iPhone yo'q |
| 5 | Web build maqsad emas | Foydalanuvchi qarori. Modul web'da yiqilmasligi uchun bo'sh stub bo'ladi (3-bo'lim, `index.web.ts`) |
| 6 | **"Mening rejam" = soatning haqiqiy avto-o'lchash sozlamasi** (interval soatga yoziladi), telefondagi eslatma emas | Foydalanuvchi qarori (2026-11-09). SDK ikkala platformada ham interval sozlashni beradi (7.5) |
| 7 | **Har bir rejali o'lchovdan oldin soatga bildirishnoma yuboriladi** ("o'lchov boshlanadi") | Foydalanuvchi qarori (2026-11-09) |
| 8 | **Ilova yopiq bo'lganda ham avto-o'lchash ishlaydi va o'lchovdan oldingi bildirishnoma keladi.** Android'da foreground servis **majburiy** (ixtiyoriy emas) | Foydalanuvchi qarori (2026-11-09). 7.2 va 7.6 ga qarang |
| 9 | Bildirishnoma turlari: `plan`, `alert`, `status` (7.1). Matn va kanallarini men belgilayman | Foydalanuvchi "optimalini qil" dedi (2026-11-09) |

Eski `docs/react-native-plan.md` va `synapse-soat` loyihasi (Web Bluetooth) endi faqat ma'lumotnoma: o'lchov mantig'i, taymerlar, xato matnlari ko'chadi. SDK chaqiruvlari native tilda qayta yoziladi.

---

## 2. Hozirgi holat (`synapse-watch`)

- Soat ma'lumotlari hammasi soxta: `src/features/home/api/get-metrics.ts`, `src/widgets/app-header/use-watch-status.ts`, `src/features/myplan/api/plans.ts` ichidagi `sendPlansToWatch`.
- **2026-11-09 yangilanishi (1-bosqich boshlandi):** `expo-dev-client`, `expo-notifications`, `expo-build-properties` o'rnatildi (`npx expo install`, SDK 58 versiyalari). `app.json`: `name` "Synapse Watch", `slug` `synapse-watch`, `scheme` `synapsewatch`, `android.package` va `ios.bundleIdentifier` = `uz.synapse.watch` (**vaqtinchalik**, do'konga chiqishdan oldin tasdiqlanadi). `eas.json` (faqat `development` profili) yaratildi. Modul skeleti `modules/veepoo-watch/` da.
- Soat ma'lumotlari haligacha soxta (quyidagi uch fayl), ularni almashtirish 4-bosqichda. Hozircha "Watch" ekrani 1-bosqich sinov paneli (`src/features/watch/WatchDevPanel.tsx`, vaqtinchalik).
- **Topilgan eski muammo:** `app.json` o'chirilgan `assets/images/icon.png` ga ishora qilardi (d251464 commit'da o'chirilgan), shuning uchun `expo prebuild` va EAS build yiqilardi. Hozircha top-level `"icon"` yozuvi olib tashlandi (Android adaptive ikonkasi va iOS `expo.icon` bor). **Do'konga chiqishdan oldin 1024×1024 PNG ikonka kerak** (`assets/images/logo.png` 113×186, yaroqsiz).
- "Mening rejam" ekrani: har bir o'lchov uchun "necha daqiqada bir marta soat o'zi o'lchaydi" (`Plan { key, intervalMin, enabled }`). Bu soatning avto-o'lchash sozlamasiga mos keladi (7.5).
- SDK fayllari repoda hali yo'q. Manba: `github.com/HBandSDK` (pastdagi "Ilova: manbalar" bo'limiga qarang), 2026-11-09 da `Android_Ble_SDK@02fe17e` va `iOS_Ble_SDK@5dcb91e` shallow klon qilib ko'rilgan.

---

## 3. Arxitektura

```
UI (src/features/*)
   → soat sessiyasi (src/shared/watch/session.ts): holat, o'lchov oqimlari, taymerlar, chegaralar
   → modules/veepoo-watch (umumiy TS API + hodisalar)
        ├─ android/  Kotlin  → VPOperateManager (vpprotocol AAR)
        └─ ios/      Swift   → VPBleCentralManage (VeepooBleSDK.framework)
```

Asosiy qoida: **native qatlam SDK javoblarini `synapse-soat` dagi hodisa shakllariga o'giradi** (`HeartRateEvent`, `SpO2Event`, `CuffBpEvent`, `EcgMeasureEvent`, `SleepEvent` ...; ularning TS turlari `synapse-soat/src/watch/types.ts` da). Shunda `synapse-soat` da haqiqiy soat bilan sinalgan `session.ts` mantig'i (taymerlar, chegaralar, xato matnlari, median) deyarli o'zgarishsiz ko'chadi.

### Papka tuzilmasi

```
modules/veepoo-watch/                     [Android qismi 2026-11-09 da yaratilgan; ios/ 6-bosqichda]
  expo-module.config.json                 platforms: android, web (apple 6-bosqichda qo'shiladi) + gradleAarProjects
  index.ts                                modulni qayta eksport qiladi
  src/VeepooWatch.ts                      native modul (requireNativeModule) va TS turlari
  src/VeepooWatch.web.ts                  web stub (qaror 5)
  src/VeepooWatch.types.ts                hodisa turlari (2-bosqichda synapse-soat shakllariga o'tkaziladi)
  android/
    build.gradle                          AAR'lar `project(':' + project.name + '$<nom>')` orqali (8-bo'lim)
    libs/   vpprotocol-2.3.95.15.aar, vpbluetooth-1.20.aar, JL_Watch_V1.13.1_11214-release.aar, jl_rcsp_V0.7.2_527-release.aar, jl_bt_ota_V1.10.0_10931-release.aar, BmpConvert_V1.6.0_10604-release.aar, abpartool-release.aar, libcomx-0.5.jar
    src/main/AndroidManifest.xml          ruxsatlar va BluetoothService (config plugin o'rniga, 8-bo'lim)
    src/main/jniLibs/                     SDK repo'dagi jniLibs/ (arm64-v8a, armeabi-v7a, x86, x86_64; ECG/opus)
    src/main/java/expo/modules/veepoowatch/
      VeepooWatchModule.kt                Expo ko'prigi [yozilgan]
      WatchController.kt                  SDK bilan ishlaydi, JS'ga bog'liq emas [yozilgan, 1-bosqich doirasi]
      WatchForegroundService.kt           ulanishni fonda ushlab turish + `plan` jadvali (majburiy, 7.6) [5-bosqich]
      EventMapper.kt                      SDK modellari → umumiy hodisalar [2-bosqich]
  ios/                                    [6-bosqich]
    VeepooWatch.podspec  (vendored_frameworks)
    Frameworks/  VeepooBleSDK.framework, DFUnits, JL_BLEKit, JLDialUnit, ZipZap, GRDFUSDK, SDKResours.bundle
    VeepooWatchModule.swift
    WatchController.swift
    EventMapper.swift
```

Rejadan farq: **alohida config plugin yozilmadi**, chunki kerak emas. Android ruxsatlari va servis modulning o'z `AndroidManifest.xml` ida turadi (Gradle manifest merge uni ilovaga qo'shadi), iOS `Info.plist` kalitlari esa `app.json` dagi `ios.infoPlist` ga yoziladi (6-bosqich). Plugin faqat shu usullar yetmay qolsa qo'shiladi.

Vendor qilinmagan (SDK hujjati talab qilmaydi): `libble-0.5.aar`, `libdfu-1.5.aar`, `libfastdfu-0.5.aar` (demo ularni `fileTree` bilan umumiy ulaydi, hujjat ro'yxatida yo'q), AMap jar. `gson-2.2.4.jar` o'rniga Maven'dagi `gson:2.10.1` (boshqa kutubxonalar bilan "Duplicate class" bo'lmasligi uchun). Nordic (`mcumgr-core/ble 2.7.4`, `scanner 1.4.2`) va `localbroadcastmanager` Maven orqali ulangan: demo ularni "majburiy" deb belgilagan. Runtime'da `NoClassDefFoundError` chiqsa, kerakli AAR qo'shiladi (1-bosqich sinovi).

SDK fayllari repoga pin qilingan versiya bilan qo'yiladi (Veepoo SDK'ni tez-tez yangilaydi: AAR bir kun ichida 2.3.94 → 2.3.95 bo'ldi). Litsenziya Apache-2.0, qayta tarqatish mumkin.

---

## 4. Ulanish

### 4.1 Android [tasdiqlangan: AAR 2.3.95.15 ichidagi imzolar]

Barcha chaqiruvlar `VPOperateManager.getInstance()` orqali.

| Qadam | Chaqiruv |
|---|---|
| Ishga tushirish (bir marta, `Application` darajasida) | `init(Context)` |
| Skan | `startScanDevice(SearchResponse)`, to'xtatish `stopScanDevice()`. SDK begona qurilmalarni o'zi filtrlaydi |
| Ulanish | `connectDevice(mac, IConnectResponse, INotifyResponse)`. Muvaffaqiyat: `connectState(code, profile, isOadModel)` da `code == Code.REQUEST_SUCCESS`, keyin `notifyState` |
| Soatda tasdiqlash | `setDeviceShowConfirm(true)`: qo'lda ulashda soat ekranida tasdiq so'raydi (12 s kutadi). Avtomatik qayta ulashda `false` |
| Kalit tekshiruvi | `confirmDevicePwd(IBleWriteResponse, IPwdDataListener, IDeviceFuctionDataListener, ISocialMsgDataListener, ICustomSettingDataListener, pwd, is24h, DeviceTimeSetting?)`. Parol standart `"0000"` **[?]** |
| Imkoniyatlar | Kalit tekshiruvidan keyin `IDeviceFuctionDataListener` orqali keladi (bloodPressureType, bildirishnoma turlari va hokazo) |
| Uzish | `disconnectWatch(IBleWriteResponse)` |
| Holat kuzatish | `registerConnectStatusListener(mac, IABleConnectStatusListener)` |

Android ruxsatlari: `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION` (faqat Android 11 va eski, `maxSdkVersion=30`), `INTERNET`, `POST_NOTIFICATIONS` (13+). Manifest'ga servis: `com.inuker.bluetooth.library.BluetoothService`. SDK Kotlin ishlatadi. ProGuard/R8: AAR ichidagi `proguard.txt` qoidalari qo'shiladi, va `com.veepoo.protocol.**` saqlanishi tekshiriladi **[?]**.

### 4.2 iOS [hujjat va header'lar, 2.2.XX.15; sinalmagan]

Kirish nuqtasi `VPBleCentralManage.sharedBleManager()`.

| Qadam | Chaqiruv |
|---|---|
| Ma'lumot saqlash rejimi | `peripheralManage = VPPeripheralAddManage.shareVPPeripheralManager()` (ilova o'zi saqlaydi). Muqobil: `VPPeripheralManage` (SDK o'zi DB'ga yozadi, FMDB kerak). Tavsiya: birinchisi, ikkala platformada ma'lumot bir xil JS'ga kelishi uchun **[?]** |
| Skan | `veepooSDKStartScanDeviceAndReceiveScanningDevice(block)`, `veepooSDKStopScanDevice()` |
| Ulanish | `veepooSDKConnectDevice(VPPeripheralModel, deviceConnectBlock)` |
| Holatlar | `VPBleConnectStateChangeBlock(VPDeviceConnectState)`: DisConnect, Connecting, Connect, **VerifyPasswordSuccess**, VerifyPasswordFailure, Timeout, ConfirmStateTimeout |
| Uzish | `veepooSDKDisconnectDevice()` |

Farqlar: iOS'da kalit tekshiruvi ulanish ichida avtomatik (Android'da alohida `confirmDevicePwd`). SDK ichki buyruqlarni **parallel bajarmaydi** (hujjatda ogohlantirilgan), shuning uchun ikkala native qatlamda ham buyruqlar navbati bo'ladi. iOS'da bir soatga bir vaqtda H Band ilovasi ham ulangan bo'lsa SDK cheksiz o'qish tsikliga tushishi mumkin: foydalanuvchiga ko'rsatma matni kerak.

### 4.3 Umumiy ulanish holatlari (JS)

`idle → scanning → connecting → authenticating → ready`, xatoda `error`. `synapse-soat` dagi `SessionState.status` bilan bir xil. Ulanish uzilsa `handleLost()` o'sha mantiq: o'lchovlarni bekor qiladi, xabar chiqaradi.

Saqlangan soatga avto-ulanish: oxirgi qurilma `id` si (Android MAC, iOS UUID) `AsyncStorage` da saqlanadi (loyihada allaqachon bor). Ilova ochilganda skansiz ulanadi. Uzilsa eksponentsial kechikish bilan qayta uriniladi.

---

## 5. Ishlatish: modul API (qoralama)

```ts
// modules/veepoo-watch/src/index.ts
export type Metric = 'hr' | 'spo2' | 'bp' | 'ecg' | 'temp';

VeepooWatch.startScan(): void;
VeepooWatch.stopScan(): void;
VeepooWatch.connect(id: string): Promise<{ id: string; name: string; version?: string; mac?: string }>;
VeepooWatch.disconnect(): void;

VeepooWatch.start(metric: Metric, opts?: { bp?: 'cuff' | 'optical' }): void;
VeepooWatch.stop(metric: Metric): void;

VeepooWatch.readBattery(): void;
VeepooWatch.readDaily(day: 0 | 1 | 2): void;
VeepooWatch.readSleep(day: 0 | 1 | 2): void;
VeepooWatch.readActivity(day: 0 | 1 | 2): void;
VeepooWatch.readManual(dataType: number, since: number): void;

VeepooWatch.setProfile(p: PersonalInfo): void;
VeepooWatch.readAutoMeasure(): void;   // 'event' orqali: har bir o'lchov uchun imkoniyat + joriy sozlama (7.5)
VeepooWatch.setAutoMeasure(key: AutoSwitchKey, cfg: { on: boolean; intervalMin: number; startMin?: number; endMin?: number }): void;   // "Mening rejam"

VeepooWatch.notify(n: { title: string; body: string; kind: 'plan' | 'alert' | 'status' }): Promise<NotifyResult>;
VeepooWatch.setNotificationSwitch(kind: 'other' | 'sms' | 'phone', on: boolean): void;

VeepooWatch.startBackgroundSession(opts: { schedule: PlanSchedule[]; leadMin: number }): void;   // Android foreground servis (7.6)
VeepooWatch.stopBackgroundSession(): void;

VeepooWatch.addListener('scan' | 'connection' | 'event', cb): Subscription;
// 'event' = umumiy SdkEvent shakllari (synapse-soat/types.ts), platformadan qat'i nazar bir xil
```

Natijalar Promise bilan emas, hodisa oqimi bilan keladi (SDK ham shunday ishlaydi). Expo Modules API: `Function`, `AsyncFunction`, `Events`, `sendEvent`; Kotlin'da `override fun definition() = ModuleDefinition { ... }`, Swift'da `public func definition() -> ModuleDefinition { ... }` (Expo 58 hujjati).

---

## 6. Funksiyalar xaritasi (SDK chaqiruvlari)

### Android [tasdiqlangan]

| Funksiya | Chaqiruv | Listener |
|---|---|---|
| Batareya | `readBattery(w, l)` | `IBatteryDataListener` |
| Puls | `startDetectHeart(w, l)` / `stopDetectHeart(w)` | `IHeartDataListener` |
| SpO₂ | `startDetectSPO2H(w, l)` / `stopDetectSPO2H(w, l)` | `ISpo2hDataListener` |
| Bosim, optik | `startDetectBP(w, l, EBPDetectModel)` / `stopDetectBP(w, model)` | `IBPDetectDataListener` |
| **Bosim, havo yostiqchasi** | `startDetectCuffBP(w, boolean, l)` / `stopDetectCuffBP(w)` | `ICuffBPDetectDataListener.onCuffDataChange(boolean, VPCuffBPTestData)` |
| Harorat | `startDetectTempture(w, l)` / `stopDetectTempture(w, l)` | `ITemptureDetectDataListener` |
| EKG | `openECGSwitch` / `startDetectECG(w, boolean, l)` / `stopDetectECG(w, boolean, l)` / `closeECGSwitch` | `IECGSwitchListener`, `IECGDetectListener`, `INewECGDataReportListener` |
| Kunlik (5 daqiqalik) | `readOriginData(w, l, int)` | `IOriginProgressListener` |
| Uyqu | `readSleepData(w, l, int)` | `ISleepDataListener` |
| Qadam | `readSportStep(w, l)` | `ISportDataListener` |
| Soatda o'lchangan yozuvlar | `readDeviceManualData(w, long, List, List, l)` | `IDeviceManualDetectDataListener` |
| Shaxsiy ma'lumot | `syncPersonInfo(w, l, PersonInfoData)` | `IPersonInfoDataListener` |
| Bildirishnoma kalitlari | `readSocialMsg(w, l)` / `settingSocialMsg(w, l, FunctionSocailMsgData)` | `ISocialMsgDataListener` |
| **Bildirishnoma yuborish** | `sendSocialMsgContent(w, ContentSetting)` | |
| **Avto-o'lchash sozlamasi** | `readAutoMeasureSettingData(w, l)` / `setAutoMeasureSettingData(w, AutoMeasureData, l)`. Qo'llab-quvvatlash: `VpSpGetUtil.getVpSpVariInstance(ctx).isSupportAutoMeasure` | `IAutoMeasureSettingDataListener` |

Yostiqchali bosim: `VPCuffBPTestData` maydonlari `sbpValue`, `dbpValue`, `status`, `heartValue`, `pressureValue`, `rate`. `EVPCuffBPTestStatus`: EMPTY, SUCCESS, POSTURE_ERROR, LOOSE, NOT_WEAR, TIME_OUT, HEART_ERROR, SLOW_DEFLATION, TOO_MUCH_PRESSURE, POOR_SIGNAL_QUALITY, NOT_REMAINING_STATIONARY, CHARGING, LOW_POWER, DEVICE_BUSY (har birida `rawValue`). Bu `synapse-soat` dagi `CUFF_ERRORS` jadvali bilan bir xil. `startDetectCuffBP` ning `boolean` parametri ma'nosi **[?]** (ehtimol xom sensor oqimi, bizga kerak emas, `false` bilan sinab ko'riladi). Bu buyruq rasmiy hujjatda yo'q, faqat AAR ichida bor.

### iOS [hujjat va header'lardan; sinalmagan]

| Funksiya | Chaqiruv |
|---|---|
| Batareya | `veepooSDKReadDeviceBatteryInfo` |
| Puls | `veepooSDKTestHeartStart(_:testResult:)` |
| SpO₂ | `veepooSDKTestOxygenStart` |
| Bosim | `veepooSDKTestBloodStart(_:testMode:testResult:)`, `testMode` 0 umumiy, 1 xususiy (50–55 s). **Yostiqchani ilovadan boshlash API'si yo'q**: faqat soatda o'lchangan yozuvni o'qish (`readManualTestDataWithTimestamp:dataType:result:`, yozuvda `testModel` 1 = yostiqcha). Ya'ni iOS'da `synapse-soat` dagi "soatning o'zida o'lchash" oqimi (`measureBpOnWatch`) ishlatiladi |
| Harorat | `veepooSDK_temperatureTestStart` |
| EKG | `veepooSDKTestECGStart` |
| Kunlik | `veepooSDKGetOriginalDataWithDate` |
| Uyqu | `veepooSDKGetAccurateSleepDataWithDate`, `veepooSDKGetSleepDataWithDate` |
| Qadam | `veepooSDKGetStepDataWithDate` |
| Soatdagi yozuvlar | `readManualTestDataWithTimestamp:dataType:result:` |
| Kalitlar | `veepooSDKSettingMessageType(_:settingState:completeBlock:)` va ommaviy `veepooSDKBatchSettingWithMessageTypeModels` |
| Matn yuborish | `veepooSDKSendStartTransmissionMessage(_:AndResult:)`, faqat `peripheralModel.textAndImageTransmissionType == 1` bo'lsa |
| Avto-o'lchash sozlamasi | `peripheralManage.veepooSDKReadAutoMonitSwitchInfo` / `veepooSDKSetAutoMonitSwitchWithModel(_:result:)` (`VPPeripheralBaseManage`). Qo'llab-quvvatlash: `peripheralModel.autoMonitSwitchType != 0`. Interval sozlash qo'llab-quvvatlansa, o'sha o'lchov uchun `veepooSDKSettingBaseFunctionType` bilan aralashtirmaslik kerak (hujjatda ogohlantirilgan) |

---

## 7. Bildirishnomalar (faqat o'zimiz yozgan)

### 7.1 Turlari (2026-11-09: "optimalini qil" asosida belgilandi)

| Kod | Qachon | Qayerga | Matn (o'zbekcha, qisqa: soat ekrani kichik) |
|---|---|---|---|
| `plan` | Har bir rejali o'lchovdan `leadMin` oldin (standart **2 daqiqa**, sozlamada 1/2/5) | soat | "Puls o'lchovi 2 daqiqadan keyin. Qo'lingizni tinch tuting." |
| `alert` | Avto-o'lchov natijasi normadan tashqarida (chegaralar `synapse-soat` dan) | soat + telefon | "Puls 128. Dam oling, keyin qayta o'lchang." Tibbiy maslahat emas, shifokor o'rnini bosmaydi |
| `status` (batareya) | Batareya ≤ 15% | soat + telefon | "Soat batareyasi 15%." |
| `status` (aloqa) | Soat bilan aloqa uzildi va qayta ulanmadi | **faqat telefon** | Soatga yetkazib bo'lmaydi (aloqa yo'q), shuning uchun `expo-notifications` |

Qoidalar (spam bo'lmasligi uchun):
- `plan` faqat kunduzgi oynada yuboriladi (standart 08:00–22:00, sozlanadi). Tunda soat o'lchayveradi, lekin foydalanuvchini uyg'otmaymiz.
- `alert`: bir o'lchov turi uchun 30 daqiqada ko'pi bilan bitta.
- `status` batareya: bir tushishga bitta (15% dan pastga o'tganda), zaryadlangach qayta tiklanadi.
- Soat tomonda bildirishnoma o'lchov boshlanayotgan paytda ekranni egallab olishi o'lchovga xalaqit berishi mumkin **[?]**. 1-bosqichda sinaladi; xalaqit bersa `leadMin` ni uzaytiramiz.

### 7.2 Android: ilova soatga to'g'ridan-to'g'ri yuboradi [tasdiqlangan]

- `sendSocialMsgContent(w, ContentSocailSetting(ESocailMsg, title, content))`.
- `ESocailMsg` ichida hujjatda yo'q **`APP_CUSTOM_MSG`** bor (AAR'da topildi, shuningdek `ZALO`, `VIBER`). Avval `APP_CUSTOM_MSG` bilan sinaymiz, soatda chiqmasa hujjatlashtirilgan **`OTHER`** ga o'tamiz **[?]**.
- Soat tomonda "boshqa xabarlar" kaliti yoqiq bo'lishi kerak: `FunctionSocailMsgData.other` ni `settingSocialMsg` bilan `SUPPORT_OPEN` qilamiz va avval `readSocialMsg` bilan soat qo'llab-quvvatlashini tekshiramiz (`UNSUPPORT` bo'lsa, UI'da yashiramiz).
- Sarlavha/matn uzunlik chegarasi **[?]**, sinovda aniqlanadi.
- Ilova yopiq bo'lsa: ulanish foreground servisda (`connectedDevice` turi) turadi. **Majburiy** (qaror 8): soat ulangach servis ishga tushadi, doimiy bildirishnoma ko'rinadi ("Soat bilan ulangan"). Android 14+ da `FOREGROUND_SERVICE_CONNECTED_DEVICE` ruxsati va Play Console'da foreground servis turini asoslash kerak. Batafsil 7.6.
- Soat bilan aloqa bo'lmaganda `plan` bildirishnomasi yuborilmaydi (o'tkazib yuboriladi, navbatga qo'yilmaydi: kech kelgan "o'lchov 2 daqiqadan keyin" ma'nosiz). O'lchov esa soatning o'zida baribir bajariladi, natija keyin sinxronlanadi.

### 7.3 iOS: ilova yubora olmaydi, ikki yo'l bor [?]

1. **Matn yuborish**: `veepooSDKSendStartTransmissionMessage`, ilova to'g'ridan-to'g'ri soatga. Faqat soat `textAndImageTransmissionType == 1` desa. E500 qo'llab-quvvatlashi noma'lum.
2. **Lokal bildirishnoma + ANCS**: ilova `expo-notifications` bilan o'z lokal bildirishnomasini jadval bo'yicha chiqaradi. iPhone uni soatga ANCS orqali o'zi uzatadi, buning uchun soat iPhone bilan **juftlangan** bo'lishi va soatdagi "boshqa xabarlar" kaliti yoqiq bo'lishi kerak (`veepooSDKSettingMessageType`). Bu yo'lda ilova BLE'ga ulangan bo'lishi shart emas, fon rejimi kerak emas. Uni hujjatida iOS juftlash oynasi autentifikatsiyada `isPair: true` bilan chiqishi aytilgan; native iOS'da buni qanday ishga tushirish noma'lum.
- Qaysi yo'l ishlashi iPhone sinovida (7-bosqich) aniqlanadi. Kodda ikkalasi ham yoziladi, sinab bo'lingach keraksizi olib tashlanadi.
- **Ilova yopiq bo'lganda (qaror 8):** 2-yo'l bu holatni o'zi hal qiladi. Rejali o'lchovlardan `leadMin` oldin vaqtlar uchun lokal bildirishnomalar OS ga oldindan jadvallanadi (takrorlanuvchi trigger), ilova ishlab turishi shart emas, iPhone ularni ANCS bilan soatga uzatadi. Jadval "Mening rejam" o'zgarganda yangilanadi. 1-yo'l (BLE matn) ilova yopiq bo'lganda ishlamaydi (iOS ilovani fonda ushlab turmaydi), shuning uchun u faqat qo'shimcha. Soatning o'zi avto-o'lchashni baribir bajaradi, natija ilova ochilganda sinxronlanadi. `alert` (natijaga bog'liq) iOS'da ilova yopiq paytda yuborilmaydi: bu cheklov foydalanuvchiga ochiq aytiladi.
- Ehtiyot: iOS lokal bildirishnomalar soni 64 ta bilan cheklangan. Interval qisqa bo'lsa (masalan 15 daqiqa) 64 ta bildirishnoma ~16 soatni qoplaydi, shuning uchun kunduzgi oyna bo'yicha jadvallanib, ilova ochilganda har safar yangilanadi **[?: cheklov va takrorlanuvchi triggerlar `expo-notifications` 58 hujjatida tekshiriladi]**.

### 7.4 JS qatlami

`notify({ title, body, kind })` ikkala platformada bir xil chaqiriladi. Natija: `{ ok, via: 'ble' | 'ancs' | 'unsupported' }`. "Mening rejam" ekrani rejalar o'zgarganda soatning avto-o'lchash sozlamasini (7.5) va `plan` bildirishnomalari jadvalini (Android: servis ichida 7.6, iOS: lokal jadval 7.3) yangilaydi. `status` (aloqa) telefonga `expo-notifications` bilan chiqadi.

### 7.5 Soatning avto-o'lchashi (Mening rejam) [tasdiqlangan: SDK hujjati; E500 da qaysi turlar qo'llab-quvvatlanishi [?]]

`Plan.intervalMin` soatning o'ziga yoziladi, shuning uchun soat ilovasiz ham o'lchayveradi (qaror 6 va 8). SDK hujjatida (Android `AutoMeasureData`, iOS `VPAutoMonitTestModel`) har bir o'lchov uchun:

| Maydon (Android / iOS) | Ma'nosi |
|---|---|
| `funType` / `type` | PULSE_RATE, BLOOD_PRESSURE, BLOOD_OXYGEN, BODY_TEMPERATURE, HRV, STRESS ... |
| `isSwitchOpen` / `on` | yoqiq/o'chiq |
| `stepUnit` / `minStepValue` | interval qadami (daqiqa) |
| `isIntervalModify` (Android) | interval o'zgartirib bo'ladimi. iOS'da alohida bayroq yo'q: `autoMonitSwitchType != 0` va `minStepValue` |
| `isSlotModify` / `supportRangeTime` | vaqt oralig'i o'zgartirib bo'ladimi |
| `measureInterval` / `timeInterval` | joriy interval (daqiqa) |
| `currentStartMinute`, `currentEndMinute` / `startHour:startMinute`, `endHour:endMinute` | joriy o'lchash oralig'i |
| `supportStartMinute/EndMinute` / `startHourRef...` | qurilma ruxsat bergan oralig'i |

Amalda:
- Avval `readAutoMeasure()` bilan qurilma imkoniyatini o'qiymiz. **UI faqat soat qo'llab-quvvatlagan o'lchovlar va intervallarni ko'rsatadi** (`stepUnit` ning karralisi, `supportStart..End` ichida). Qo'llab-quvvatlanmaganini yashiramiz. Shuning uchun interval tanlovi qat'iy daqiqa emas, soat bergan qadamga moslanadi.
- `isSupportAutoMeasure == false` bo'lsa (yoki o'lchov uchun interval o'zgarmasa), faqat yoqish/o'chirish kaliti qoladi va `plan` bildirishnomalari uchun aniq vaqt noma'lum: bu holda o'sha o'lchov uchun `plan` bildirishnomasi o'chiriladi va foydalanuvchiga aytiladi.
- iOS'da interval sozlash qo'llab-quvvatlansa, o'sha o'lchov uchun eski kalit API'si (`veepooSDKSettingBaseFunctionType`) bilan aralashtirmaymiz.
- **Soat o'lchash vaqtini qanday hisoblaydi [?]**: `plan` bildirishnomasi o'lchovdan oldin chiqishi uchun biz soat qachon o'lchashini bilishimiz kerak. Faraz: `currentStartMinute` dan boshlab har `measureInterval` daqiqada, `currentEndMinute` gacha. Buni 1-bosqichda tekshiramiz: sozlama yozib, kunlik (5 daqiqalik) yozuvlar vaqt tamg'alarini taqqoslaymiz. Aniq jadval chiqmasa zaxira variant: o'lchovni soatga qoldirmay, servis ichida o'zimiz `startDetect*` bilan boshlaymiz (aniq vaqt, lekin soatning o'z jadvalidan voz kechamiz). Bu qaror 6 ga zid bo'ladi, shuning uchun foydalanuvchi bilan kelishiladi.
- Jadvalni deterministik qilish uchun oraliqni tekis qo'yamiz (masalan 00:00 dan boshlab), shunda vaqtlar `k * interval` bo'ladi **[?]**.

### 7.6 Ilova yopiq bo'lganda ishlash (qaror 8)

Nima nimaga bog'liq:

| Narsa | Ilova yopiq bo'lsa | Nima kerak |
|---|---|---|
| Avto-o'lchash | **Ishlayveradi**: soatning o'zi o'lchaydi va xotirasiga yozadi | Faqat 7.5 sozlamasi soatga yozilgan bo'lsin |
| Natijani olish (sinxron) | Ilova ochilganda (yoki servis ulangan bo'lsa fonda) `readOriginData` / `readDeviceManualData` bilan | Soat xotirasi to'lib ketmaguncha (kunlar bo'yicha `day 0/1/2`) ilova ochilishi kerak |
| `plan` bildirishnomasi (o'lchovdan oldin) | **BLE ulanish tirik bo'lishi shart** | Android: foreground servis. iOS: OS jadvallangan lokal bildirishnoma + ANCS (7.3) |
| `alert` (natijaga bog'liq) | Natijani olish uchun ulanish kerak | Android: servis. iOS: ilova yopiq paytda ishlamaydi |

Android servis dizayni:
- `WatchForegroundService` (`foregroundServiceType="connectedDevice"`): SDK ulanishini (`BluetoothService`) tirik ushlab turadi, ulanish uzilsa eksponentsial kechikish bilan qayta ulanadi (4.3).
- Servis ichida `plan` jadvali: har bir yoqiq o'lchov uchun keyingi o'lchash vaqti (7.5) − `leadMin`; vaqti kelganda `notify(plan)`. Aniq vaqt uchun `AlarmManager` (exact alarm) ruxsatlari Play siyosati bilan cheklangan **[?]**, shuning uchun avval `Handler`/inexact variantni sinaymiz: bir necha soniya xato `leadMin = 2 daqiqa` bilan muhim emas.
- Servis foydalanuvchi ilovani ochib "soatga ulanish"ni bosganda boshlanadi (Android 12+ da fondan foreground servis ishga tushirish cheklangan [?]). Qurilma qayta yoqilganda qayta ishga tushirish uchun `RECEIVE_BOOT_COMPLETED` va Android 14/15 qoidalari tekshiriladi **[?]**.
- Ishlab chiqaruvchilar (Xiaomi, Huawei, Samsung ...) fon servislarini o'ldiradi. Ilovada "Fon rejimini sozlash" ko'rsatmasi: batareya optimallashtirishidan chiqarish (tizim sozlamalariga yo'naltirish; `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` Play'da cheklangan, shuning uchun to'g'ridan-to'g'ri so'ramaymiz) va avto-ishga tushirish ruxsati.
- Servis o'ldirilsa: soat o'lchashda davom etadi, faqat `plan` bildirishnomalari to'xtaydi. Ilova qayta ochilganda sinxronlanadi va telefonga `status` (aloqa) chiqadi.
- Play Console: foreground servis `connectedDevice` turini asoslash (soat bilan doimiy BLE aloqa) va ruxsat deklaratsiyasi.

---

## 8. Sozlamalar va o'rnatiladigan paketlar

Paketlar faqat `npx expo install` bilan (SDK'ga mos versiya). Har bir Expo API'dan oldin Expo 58 hujjatini o'qish (AGENTS.md talabi).

```
npx expo install expo-dev-client expo-notifications expo-build-properties
```

`app.json` o'zgarishlari (bajarishdan oldin foydalanuvchi qiymatlarni beradi):
- `name`, `slug`, `android.package`, `ios.bundleIdentifier`: yakuniy qiymatlar. Package/bundle ID do'konga chiqqandan keyin o'zgartirib bo'lmaydi.
- iOS `Info.plist`: `NSBluetoothAlwaysUsageDescription` (o'zbekcha matn). Fon rejimi (`bluetooth-central`) faqat zarur bo'lsa va App Store asosi bilan (7.3 ning 2-yo'li uni talab qilmaydi).
- Android ruxsatlari va servis: modulning `AndroidManifest.xml` i orqali (4.1 dagi ro'yxat). `android/` va `ios/` papkalarini qo'lda tahrirlamaymiz (CNG).

Expo 58 talablari (hujjatdan): Android compileSdk 37 / targetSdk 36, iOS 16.4+, Xcode 26.4+. Expo Go ishlamaydi, faqat dev build.

Android AAR'larni modulga ulash **[tasdiqlangan: Expo hujjati + `expo-modules-autolinking` kodi, 2026-11-09]**: kutubxona modullariga to'g'ridan-to'g'ri `files('x.aar')` ulab bo'lmaydi. Buning o'rniga `expo-module.config.json` ichida `android.gradleAarProjects: [{ name, aarFilePath }]`, `build.gradle` da esa `implementation project(':' + project.name + '$<name>')`. Diqqat: loyiha nomidagi `$` literal ajratuvchi (Groovy interpolyatsiyasi emas), shuning uchun satrlar `+` bilan birlashtiriladi. `expo-modules-autolinking resolve --platform android` bilan tekshirilgan: loyiha nomlari `veepoo-watch$vpprotocol` va hokazo. JAR fayllar `files('libs/x.jar')` bilan ishlayveradi. iOS: podspec'da `vendored_frameworks`, yo'l `..` siz va `ios/` ichida.

---

## 9. Bosqichlar

Har bosqich oxirida qabul mezonlari tekshiriladi. Foydalanuvchi bajaradigan joyda 👤.

### 0. 👤 Tayyorgarlik
- [x] Expo akkaunti va `eas login` (2026-11-09: `eas whoami` ishlaydi, akkaunt `akiylov`). EAS loyihasini qaysi akkauntga (`akiylov` yoki `akiylovs-team`) ochish hali hal qilinmagan.
- [x] Ilova nomi "Synapse Watch". `android.package` / `ios.bundleIdentifier` = `uz.synapse.watch` (vaqtinchalik, do'konga chiqishdan oldin tasdiqlanadi).
- [ ] Android telefon va E500 soat. Apple Developer akkaunti va iPhone keyinroq (iOS sinovi uchun).
- [ ] Soatdagi H Band ilovasi soatdan uzilgan bo'lishi kerak.

### 1. Sinov: Android (go/no-go)
1. [x] Modul skeleti (`create-expo-module --local` Windows'da fayl yozishda qotib qoldi, shuning uchun shablon `expo-module-template-local@0.7.10` npm paketidan olinib qo'lda moslandi), AAR'lar, manifest (config plugin kerak emas bo'ldi). `tsc`, `expo lint`, `expo-doctor` (20/20) o'tdi, `expo prebuild --platform android` o'tdi, autolinking modulni va 7 ta AAR loyihasini topdi. **Kotlin kodi EAS bulutida xatosiz kompilyatsiya bo'ldi** (2026-11-09, 7 ta AAR + Nordic + gson bilan; mahalliy Java/Android SDK yo'q). `NoClassDefFoundError` kabi runtime xatolar haqiqiy telefonda sinaladi.
2. [x] EAS Android dev build tayyor (2026-11-09, akkaunt `akiylov`, loyiha `synapse-watch`, build `6cdc0a2b-0102-40a1-903b-473de8224eb6`, ~21 daqiqa). Kod git'siz yuborildi (`EAS_NO_VCS=1`), commit qilinmagan. Bu build eski ikonka bilan; yangi ikonka (`assets/images/android/`) keyingi build'da.
3. [ ] Skan → ulanish → kalit tekshiruvi → batareya → puls (kod yozilgan: `WatchController.kt`, UI: `WatchDevPanel.tsx`).
4. [ ] `sendSocialMsgContent` bilan test bildirishnoma: `APP_CUSTOM_MSG` va `OTHER` ikkalasini sinash (panelda ikkita tugma).
5. [ ] `startDetectCuffBP` bilan yostiqchali bosim.
6. [ ] Avto-o'lchash: `readAutoMeasureSettingData` bilan E500 qaysi o'lchovlarda interval/oraliq o'zgartirishga ruxsat berishini o'qish, puls uchun qisqa interval yozish, kunlik (5 daqiqalik) yozuvlar vaqt tamg'alari bilan soat qachon o'lchaganini aniqlash (7.5 faraz). Panelda o'qish va "puls har 30 daq" tugmalari bor; vaqt tamg'alarini taqqoslash (`readOriginData`) hali yozilmagan.
7. [ ] Bildirishnoma o'lchov paytida kelsa, o'lchov buzilmasligini tekshirish (7.1 oxirgi qoida).
- **Mezon:** soat bilan haqiqiy aloqa, puls natijasi, soatda ko'ringan test bildirishnoma va avto-o'lchash vaqti aniqlangan (yoki aniqlab bo'lmasligi ma'lum).

### 2. Umumiy API va hodisalar
TS turlari, hodisa shakllari (`synapse-soat/types.ts` asosida), Android EventMapper, web stub, hodisa jurnali (xom baytlar o'rniga SDK javoblari).

### 3. Android to'liq funksiyalar
Barcha o'lchovlar, kunlik, uyqu, qadam, soatdagi yozuvlar, profil, avto-o'lchash. `synapse-soat/session.ts` mantig'ini ko'chirish.

### 4. Ilovaga ulash (Android)
Soxta ma'lumotlarni almashtirish: `get-metrics.ts`, `use-watch-status.ts`, `sendPlansToWatch`. Skan/ulanish ekrani, avto-ulanish, ruxsat so'rovlari, xato matnlari.

Oldindan bajarilgan (2026-11-09, foydalanuvchi talabi: soat ulanmasa Home "soatni ulang" deb turishi kerak, ulanish Bluetooth orqali):
- [x] `src/shared/watch/watch-connection.ts`: ulanish holati (`unavailable` / `disconnected` / `connecting` / `ready`), soat nomi, batareya. Manba native modul hodisalari. JS qayta yuklansa native `getConnectionState()` dan tiklanadi.
- [x] `use-watch-status.ts` endi haqiqiy holatni qaytaradi (soxta "Watch X1 82%" olib tashlandi). Header ulanmagan bo'lsa "Soat ulanmagan" ko'rsatadi, bosilsa `/watch` ochiladi.
- [x] **Butun ilova soat ulanmaguncha to'siladi** (foydalanuvchi talabi): `widgets/watch-gate/WatchGate.tsx` `(app)/_layout.tsx` ning eng oxirgi bolasi sifatida header, tablar va hamma sahifa ustida to'liq ekranli `features/watch/WatchConnectScreen.tsx` ni ko'rsatadi. Asosiy ilova ostida mount bo'lib qoladi (holati yo'qolmaydi). Soat ulangach yo'qoladi, aloqa uzilsa qayta chiqadi.
- [x] Ulanish ekrani: Bluetooth ruxsatini so'rash (`shared/watch/bluetooth-permissions.ts`, "boshqa so'ramaslik" bo'lsa sozlamalarga yo'naltiradi), skan (20 s dan keyin to'xtaydi), topilgan soatlar ro'yxati (signal bo'yicha), Bluetooth o'chiqligini aniqlash (native `isBluetoothOpened`), "oxirgi soatga ulanish" (`shared/watch/last-watch.ts`), ulanish paytida "soat ekranida tasdiqlang" va "Bekor qilish". Tarjimalar uch tilda.
- [x] Faqat dev'da va soat moduli yo'q bo'lsa (Expo Go) to'siqni o'tkazib yuboradigan tugma bor (UI ustida ishlash uchun). Release'da va modul mavjud bo'lsa yo'q.
- [ ] **Cheklov:** modul yo'q platformalarda (iOS, to'liq iOS moduli 6-bosqichda yoziladi) release ilova to'siqdan o'tolmaydi. iOS'ni do'konga chiqarishdan oldin iOS moduli bo'lishi shart.
- [x] **`/watch` — "Soat ma'lumotlari" sahifasi** (2026-11-09, foydalanuvchi talabi: header bosilganda soat haqida ma'lumot chiqsin): model (skan nomi, masalan S105), holat, batareya (foiz va 1-4 daraja), manzil (MAC), dastur/test versiyasi va qurilma raqami (`pwd` hodisasi), imkoniyatlar (`features`: bosim, puls, harorat, avto-o'lchash, matn yuborish, sport rejimi), soatdagi avto-o'lchash sozlamasi (`autoMeasure`). `shared/watch/watch-info.ts` hodisalardan yig'adi va oxirgi ma'lumotni qurilmaga saqlaydi (JS qayta yuklansa hodisalar qayta kelmaydi). "Yangilash" batareya va avto-o'lchashni qayta o'qiydi. Sinov va diagnostika (jurnal) pastda yig'ilgan holda.
- [x] **`/watch` ochilmasligi tuzatildi** (2026-11-09): expo-router 58 da `href: null` tabni `hidden: true` qiladi va yashirin tab ochilishi bilan navigator bosh sahifaga qaytaradi (o'rnatilgan `bottom-tabs/types.d.ts`: "If the screen is focused, the navigator redirects to its initial visible screen"). Endi `watch` tabi faqat `tabBarButton: () => null` bilan yashiriladi; header `router.navigate("/watch")` ishlatadi.
- [ ] Avto-qayta ulanish (ilova ochilganda saqlangan soatga o'zi ulanishi) hali yo'q; hozircha "oxirgi soatga ulanish" tugmasi.
- [x] **Home o'lchashi haqiqiy** (2026-11-09, foydalanuvchi talabi: "Boshlash" soatga so'rov yuborsin): `shared/watch/measure.ts` o'lchashni soatda boshlaydi va `synapse-soat/session.ts` dagi taymer/chegara/xato mantig'ini qo'llaydi: puls va SpO₂ 30 s oqim + oxirgi 8 ta qiymat medianasi; optik bosim (soat progress beradi, 80 s chegara); yostiqchali bosim (12 s javob, 30 s sukunat, 180 s chegara); harorat. Native: `startSpo2/startBp/startTemp` (+ stop) qo'shildi. EKG, qon tarkibi va shakar hali yo'q ("qo'llab-quvvatlanmaydi" xabari chiqadi).
- [x] Soxta qiymatlar olib tashlandi: `get-metrics.ts` faqat nom/ikonka/birlik/norma beradi; qiymat, holat, "oxirgi o'lchov", bugungi min/o'rtacha/maks va tarix `features/home/lib/readings.ts` dagi saqlangan haqiqiy natijalardan (AsyncStorage, oxirgi 300 ta). Holat yorlig'i umumiy me'yorlar bo'yicha (tibbiy tashxis emas).
- [x] **Taxminlar manbadan tekshirildi** (2026-11-09): (1) yostiqchali bosim: AAR bytecode'i (`vp_t.handler`) `onCuffDataChange` ning `boolean` parametri = `kadr[5] == 10` ekanini, ya'ni "tugadi" ekanini ko'rsatdi (`synapse-soat` dagi `done` bilan bir xil); holat kodlari (EMPTY 0 ... NOT_REMAINING_STATIONARY 10, CHARGING 253, LOW_POWER 254, DEVICE_BUSY 255) `CUFF_ERRORS` jadvali bilan aynan mos; start buyrug'i `90 01 05 <flag>` (flag=false, `synapse-soat` ham 0x00 yuboradi), stop `90 00 05 01` (`synapse-soat` bilan bir xil). (2) harorat: vendor demo (`BodyTemperatureDetectActivity.java`): tugash `progress == 100`, `deviceState` 0 va 7 yaroqli, 1-6 band, 8 batareya past, 9 sensor xatosi, `oprate` 0 qo'llab-quvvatlanmaydi / 2 to'xtagan (avvalgi 3 s "settle" taxmini olib tashlandi). (3) puls, SpO₂, optik bosim: vendor demo bilan mos.
- [x] Yostiqchali bosimda qo'l holati (status 2) va qimirlash (10) endi darhol xato emas: soat harakat datchigi (G-sensor) bo'yicha o'zi baholaydi va qo'lni joyiga qo'yish paytida bir necha kadr shu holatda tura oladi. Home'da ogohlantirish chiqadi, soatning yakuniy xulosasi (tugadi bayrog'i) kutiladi; faqat 15 s davom etsa xato. Umumiy jurnal (`shared/watch/watch-log.ts`) Home'dagi o'lchovlar kadrlarini ham `/watch` panelida ko'rsatadi (yostiqcha kadrlari faqat holat o'zgarganda yoki har 8-sida).
- [x] **Nasosli bosim: soatning o'zida o'lchab, natijani o'qish** (2026-11-09, foydalanuvchi kuzatuvi: soatning o'zida o'lchov ishlaydi, telefondan boshlash ishlamaydi). Bu SDK hujjatidagi rasmiy yo'l ("Reading Device Manual Measurement Data", `readDeviceManualData`, nasosli bosimi bor soatlar uchun); ilovadan nasosni boshlash esa hujjatlashtirilmagan. Native `readManualBp(sinceSec)` -> "manualBp" hodisasi; JS `startOnWatchBp` har 5 s da `since` dan yangi nasosli yozuvni so'raydi (`synapse-soat` dagi `measureBpOnWatch` ekvivalenti, 240 s chegara). Home'da: "Soatning o'zida o'lchayman" tugmasi va avtomatik zaxira (ilovadan boshlash `noReply` yoki `cuffUnsupported` bersa).
- [x] **Qon bosimi `synapse-soat` andozasiga moslashtirildi** (2026-11-09, foydalanuvchi talabi). Topilgan farqlar: (1) to'xtatish buyrug'i (`90 00 05 01`, `stopDetectBP`, `stopDetectTempture`) soat o'zi yakunlaydigan o'lchovlarda muvaffaqiyatdan keyin yuborilmaydi, faqat xato/bekor qilishda (`synapse-soat` shunday qiladi; puls va SpO₂ da oqimni to'xtatish uchun har doim); (2) soat xotirasidan o'qishda turidan qat'i nazar yaroqli yangi yozuv qabul qilinadi (`toHistoryItem`), `mode`/`version` ga tayanib tashlab yuborilmaydi; (3) doira ichidagi ko'rsatkich `ChannelRow` kabi: nasosli bosimda soat ekrani ochilguncha "…" va "Soat ekranida o'lchov ochilmoqda", keyin yostiqchadagi joriy bosim; optik bosim va haroratda "…" va foiz; puls/SpO₂ da joriy qiymat.
- [x] **EKG** (2026-11-09, `synapse-soat` `measureEcg` andozasi): native `startEcg/stopEcg` (`startDetectECG(w, isNeedCurve=true, IECGDetectListener)`, stop `stopDetectECG(w, true, null)` — vendor demo kabi). Hodisalar: "ecg" (EcgDetectState: dataType, deviceState, wear, hr1/hr2, hrv, qtc, br2, progress), "ecgResult" (EcgDetectResult/EcgDiagnosis), "ecgWave" (ADC nuqtalar soni; to'lqin hozircha chizilmaydi). JS: elektrod aloqasi `wear==0`, 4 dan ortiq uzilish -> ecgLeadOff, 15 s aloqasiz -> ecgNoContact, band/zaryad/batareya 3 marta -> xato, 100% dan keyin 5 s natija kutish, dataType 4 (soat o'zi tugatdi) -> to'xtatish buyrug'isiz. Natija: puls (Home qiymati), HRV va QTc yorliqda. Ritm/kasallik tahlili Veepoo'ning pullik funksiyasi, qilinmagan.
- [x] **EKG hisoboti (shifokor uchun)** (2026-11-09): native `onEcgADCChange` xom ADC ni SDK'ning `EcgUtil.convertToMvWithValue(adc, ecgType, false, power)` bilan mV ga aylantiradi (vendor demo kabi; ecgType holat paketidan yoki `VpSpGetUtil.getECGType()`, power bo'lmasa 20). JS: `synapse-soat` ning `EcgTrace` (0.5 Hz high-pass, chastotani hisoblash) ko'chirildi; o'lchash paytida jonli lenta; yozuv (to'lqin + puls min/maks, RR, QT, QTc, HRV, nafas, aloqa %, uzilishlar, qurilma) `Paths.document/ecg/<id>.json` ga, ro'yxat AsyncStorage'ga. Hisobot oynasi: bemor (profil), sana, qurilma, Lead I, o'lchovlar, 25 mm/s · 10 mm/mV lenta 10 s lik qatorlarda (1 mV kalibrlash), PDF (A4 yotiq, `expo-print` + `expo-sharing`, aniq mm masshtab). Paketlar: react-native-svg, expo-print, expo-sharing, expo-file-system. Tekshirish kerak: E500 dagi haqiqiy chastota va mV amplitudasi (chop etilgan PDF'ni chizg'ich bilan: 1 mV impuls = 10 mm, 1 s = 25 mm).
- [x] **EKG "to'rtburchak" chizilishi tuzatildi, hisobot rus tilida, jonli lenta** (2026-11-09, foydalanuvchi talabi). Sabablar: (1) `onEcgADCChange` ning ikkinchi massivi (`power`) SDK hujjatiga ko'ra charchoq ma'lumoti, men uni har nuqta uchun kuchaytirish deb ishlatgandim; endi vendor demo kabi doim 20 (`ECG_GAIN`); (2) qatorga sig'magan cho'qqilar chetda kesilib tekis "tom" hosil qilardi. Tuzatish: kuchaytirish signalga qarab 2.5/5/10/20 mm/mV (`gainFor`, standart 10 ga ustunlik; kalibrlash impulsi va hisobot matni shunga mos), filtrlar real kardiograflardagi "monitor" rejimi: 0.5 Hz high-pass + 40 Hz low-pass + 50 Hz notch (RBJ biquad). Jonli lenta kardiomonitor kabi "sweep": yozuvchi chapdan o'ngga yuradi, eski yozuv ustidan yangisi tushadi, 20 kadr/s. Hisobot va PDF ilova tilidan qat'i nazar ruscha (`translator("ru")`). Diagnostika jurnalida har 20-paket: `[ecgWave] n=.. mV min..max ecgType=.. powerSize=..`. Sintetik sinov: 50 Hz shovqin yo'qoladi, 0.6–6.5 mV signallarda kesilish 0. Haqiqiy S105 dagi amplituda va chastota hali tekshirilmagan.
- [x] **EKG: balandlik moslanishi, jonli va hisobot bir xil lenta** (2026-11-10). E500 EKG qiymatini mV da emas, xom birlikda beradi (SDK `convertToMvWithValue` 1 va 3-turlarda qiymatni o'zgartirmaydi). Kuchaytirish 2.5 mm/mV da ham sig'masa, lentaga moslanadi ("avto masshtab", kalibrlash impulsisiz). Batafsil: [ecg.md](ecg.md).
- [x] **Shakar (qon glyukozasi) o'lchovi — E500 da sinovdan o'tdi (2026-11-10, EAS build 335a56e2)** (2026-11-10, foydalanuvchi talabi). SDK (bytecode va vendor demo `BloodGlucoseActivity`dan tekshirildi): `startBloodGlucoseDetect(w, IBloodGlucoseChangeListener)` / `stopBloodGlucoseDetect(w, listener)`; `onBloodGlucoseDetect(progress, qiymat, xavf)` — qiymat SDK ichida `(xom & 0x1FFF) / 100`, ya'ni mmol/l; xavf `NONE/LOW/MIDDLE/HIGH`; `onDetectError(opt, status)` — `NONSUPPORT/LOW_POWER/BUSY/WEARING_ERROR`; progress 100 da `onBloodGlucoseStopDetect`. Native: `startGlucose/stopGlucose`, hodisalar `glucose`, `glucoseError`, `glucoseStop`, `glucoseSupport` (`VpSpGetUtil.isSupportBloodGlucoseDetect`), `features.bloodGlucose` (FunctionDeviceSupportData va Package3). JS (`measure.ts`, kalit `sugar`): progress doira chegarasida, natija 1–35 mmol/l, 15 s jimlik → `glucoseNoData` (qurilmada shakar yo'q bo'lsa `glucoseUnsupported`), umumiy chegara 150 s, soat o'zi yakunlaydi (muvaffaqiyatda to'xtatish buyrug'i yo'q). Home: natija 1 kasr bilan, holat 3.9–7.8 normal + soatning xavf bahosi + "taxminiy". "Soat ma'lumotlari" sahifasida "Shakar" imkoniyati. **Keyinroq (foydalanuvchi qarori):** kalibrlash (`setBloodGlucoseAdjustingData`, ko'p nuqtali), History'da saqlash, soatda o'lchangan shakarni o'qish, avto-o'lchash.
- [x] **Qon tahlili (lipidlar va siydik kislotasi) — E500 da sinovdan o'tdi (2026-11-10, EAS build 335a56e2)** (2026-11-10, foydalanuvchi talabi; soatning rasmiy ilovasidagi "Blood Components Test" bilan bir xil 5 qiymat). SDK (hujjat, bytecode `operate/vp_i`, vendor demo `BloodComponentDetectActivity`): `startDetectBloodComponent(BleWriteResponse, isUseCalibrationMode, IBloodComponentDetectListener)` — buyruq `8A 01 01 <rejim>`, `false` = Normal, `true` = Personal (kalibrlash); `stopDetectBloodComponent(BleWriteResponse)`. **E'tibor:** bu metodlar inuker `BleWriteResponse` ni oladi (`IBleWriteResponse` emas) — native'da `bleWriter()`. Javob: `onDetecting(progress, BloodComponent)`, progress 100 da `onDetectComplete(BloodComponent)`, `onDetectStop()`, `onDetectFailed(LOW_POWER/BUSY/WEAR_ERROR/UNKNOWN)`. `BloodComponent`: `uricAcid` (xom/10, µmol/l), `tCHO`, `tAG`, `hDL`, `lDL` (xom/100, mmol/l). SDK `isSupportBloodComponent` false bo'lsa buyruqni **jimgina yubormaydi** — native o'zi tekshirib `bloodError {state: UNSUPPORTED}` beradi. Native: `startBloodComponent/stopBloodComponent`, hodisalar `blood`, `bloodDone`, `bloodError`, `bloodStop`; `features.bloodComponent`. JS (`measure.ts`, kalit `blood`): progress doira chegarasida, qiymatlar oqilona chegarada tekshiriladi, 15 s jimlik → `bloodNoData`, chegara 150 s. Home: "Qon tarkibi (gemoglobin)" o'rniga "Qon tahlili"; natija — **beshala ko'rsatkich bitta kartada** (`components/blood-result.tsx`: nomi, me'yori, qiymati, holati), karta qiymati "me'yordagilar soni / 5". Me'yorlar (kattalar): xolesterin < 5.2, triglitseridlar < 1.7, HDL > 1.0, LDL < 3.4 mmol/l, siydik kislotasi 150–420 µmol/l. **Keyinroq:** Personal rejim + kalibrlash (`settingBloodComponentCalibration`), History'da saqlash (History'dagi `blood` hali gemoglobin mock).
- [x] **Bosim o'lchovi oxiriga yetmasligi tuzatildi** (2026-11-10, foydalanuvchi kuzatuvi: "qo'l holatiga juda ko'p ahamiyat berib, o'lchovni oxiriga yetkaza olmayapti"). Sabablar: (1) **nasosli:** native `cuffBp` hodisasi qiymatlarni `sbp`/`dbp` nomi bilan yuboradi, JS esa `sys`/`dia` ni o'qirdi — soat natija berganda ham ilova uni ko'rmas va oxirgi holat (ko'pincha `POSTURE_ERROR`) bo'yicha "qo'l holati" xatosini chiqarardi; (2) **nasosli:** qo'l holati/qimirlash ogohlantirishi 15 s davom etsa ilova o'lchovni o'zi uzardi — endi faqat ogohlantirish, yakuniy xulosa soatniki (`flag`); (3) **optik:** qat'iy 80 s chegara (sekin soatda o'lchov oxiriga yetmasdi) → 20 s jimlik yoki 150 s umumiy; `WEAR_OFF` 3 paketda emas, 10 s davom etsagina xato; progress 100% bo'lib qiymat hali kelmagan bo'lsa 5 s kutiladi (avval darhol xato). Faqat JS o'zgardi. **Natija:** nasosli bosim E500 da barqaror ishladi. Optik bosim 35% da (≈20 s, soatdan birorta ham paket kelmagan) xato bilan to'xtadi: AAR bytecode'i — `startDetectBP` `FunctionCheckUtil.checkBp()` (`VpSpGetUtil.isSupportBp`) false bo'lsa buyruqni **jimgina yubormaydi**; E500 da bosim nasos bilan, optik o'lchov yo'q bo'lsa kerak. Endi: `features.bloodPressure == UNSUPPORT` bo'lsa darhol `bpOpticalUnsupported`, birorta paket kelmasa `bpOpticalNoReply` ("Bosim (nasos)" dan foydalaning); native `startBp` ham `isSupportBp` ni tekshirib `bp {unsupported}` beradi (keyingi build'da). SDK'ning yana bir xususiyati: progress bermaydigan soatda SDK 1.1 s da +2% soxta progress yasaydi va 100% dan keyin kelgan haqiqiy natijani tashlab yuboradi (`isDetectingBp` false) — hozircha muammo emas.
- [ ] **Xavf (E500 da tekshiriladi):** SDK'ning `startDetectCuffBP` i `FunctionCheckUtil.checkSportModel()` (`VpSpGetUtil.isSupportSportModel`, ya'ni qurilmaning `sportModelFunction` imkoniyati) `false` bo'lsa buyruqni jimgina yubormaydi. Shuning uchun native qism buni oldindan tekshirib `cuffUnsupported` xabarini beradi va ulanishda `[features] sportModel` hodisasini chiqaradi. Agar E500 da `sportModel` yo'q bo'lsa, `VPOperateManager.sendOrder(w, byte[])` (xom yozish) bilan `synapse-soat` kabi `90 01 05 00` yuborish kerak bo'ladi; kadrlarni qabul qilish yo'li alohida o'rganiladi.
- [ ] Tarix ekrani hali soxta (`get-history.ts`), natijalarni saqlangan o'lchovlardan olishi kerak. "Mening rejam" soat holatiga bog'lanmagan.
- [ ] Native xato matnlari hozircha faqat o'zbekcha (`WatchController.kt` ichida); ru/uz-Cyrl uchun kod bo'yicha tarjima qilish kerak.
- [x] Batareya: `isPercent=true` bo'lsa foiz, aks holda `batteryLevel` (1-4, SDK hujjati) × 25. Ulangandan keyin birinchi so'rov yo'qolishi mumkin (SDK buyruqlarni parallel bajarmaydi), shuning uchun javob kelmaguncha 0.8 / 2.5 / 5 s da qayta so'raladi. Davriy yangilash 2-bosqichdagi buyruqlar navbatidan keyin.

### 5. Android bildirishnomalari va fon (qaror 7, 8)
`notify()`, 7.1 turlari va qoidalari, majburiy foreground servis (7.6), servis ichida `plan` jadvali (o'lchovdan `leadMin` oldin), qayta ulanish, `status` (aloqa) telefon bildirishnomasi, ishlab chiqaruvchi uchun fon rejimi ko'rsatmasi. Play Console talablari (foreground servis turi, ruxsat asoslari, maxfiylik).
- **Mezon:** ilova yopiq (swipe bilan), telefon ekrani o'chiq: rejali o'lchovdan 2 daqiqa oldin soatga `plan` bildirishnomasi keladi, soat o'lchaydi, ilova ochilganda natija sinxronlanadi.

### 6. iOS: kodni yozish (sinovsiz)
Swift qatlami 6-bo'limdagi iOS jadvaliga muvofiq (avto-o'lchash sozlamasi ham), ikkala bildirishnoma yo'li (7.3), `plan` uchun OS ga jadvallangan lokal bildirishnomalar. Faqat header'larga qarshi ehtiyotkor tekshirish, kompilyatsiya yo'q. `ios/` papkasi Android build'iga ta'sir qilmaydi.

### 7. 👤 iOS tekshiruvi (keyin, alohida)
Apple akkaunti + iPhone bo'lgach: EAS iOS dev build, kompilyatsiya xatolarini tuzatish, so'ng 1-bosqich mezonlarini iOS'da takrorlash, ANCS va matn yuborish yo'llarini sinash, bosim oqimini (soatda o'lchash) tekshirish.

### 8. Do'konga tayyorlash
Maxfiylik siyosati (SDK `vphband.com` ga murojaat qilishi mumkin: aniqlash), do'kon tavsiflari, production build.

---

## 10. Xavflar va ochiq savollar

| Xavf / savol | Ta'siri | Qanday hal qilinadi |
|---|---|---|
| E500 `OTHER`/`APP_CUSTOM_MSG` bildirishnomani ko'rsatmasligi | Android asosiy maqsad | 1-bosqichda sinash. Ishlamasa Veepoo bilan bog'lanish yoki matn yuborish (`pushTextMsg`) |
| iOS kodi kompilyatsiya qilinmagan | 7-bosqichda xatolar chiqadi | Header'lar bilan tekshirish, ingichka Swift qatlami, alohida bosqich ajratilgan |
| iOS'da yostiqchali bosimni ilovadan boshlab bo'lmaydi | iOS'da oqim boshqacha | Soatda o'lchash oqimi (allaqachon `synapse-soat` da bor) |
| iOS'da ANCS ishlashi (juftlash) | iOS bildirishnomasi | 7-bosqich sinovi, ikkita yo'l tayyor |
| `startDetectCuffBP` hujjatlashtirilmagan | Versiyalar orasida o'zgarishi mumkin | SDK versiyasini pin qilish, yangilashda qayta sinash |
| Android fon cheklovlari (ishlab chiqaruvchilar servisni o'ldiradi) | `plan` bildirishnomalari yopiq ilovada to'xtaydi (o'lchovning o'zi emas) | Majburiy foreground servis, fon rejimi ko'rsatmasi, servis o'lsa telefonga `status` (7.6) |
| Soat o'lchash vaqti noma'lum yoki E500 da interval o'zgarmaydi | `plan` bildirishnomasini o'lchovdan oldin chiqarib bo'lmaydi | 1-bosqich 6-qadam. Zaxira: servis o'zi o'lchovni boshlaydi (qaror 6 bilan kelishish kerak) |
| iOS'da ilova yopiq bo'lganda `alert` yuborilmaydi | iOS'da natijaga bog'liq ogohlantirish cheklangan | OS cheklovi; `plan` esa lokal jadval bilan ishlaydi. Foydalanuvchiga ochiq aytiladi |
| iOS lokal bildirishnomalar 64 ta bilan cheklangan | Qisqa intervalda uzoq muddatga jadval sig'maydi | Kunduzgi oyna + ilova ochilganda qayta jadvallash |
| Foreground servis Play siyosati (turi, ruxsat asoslari) | Do'konda rad etilishi | `connectedDevice` turi, asos matni va demo video tayyorlanadi (5 va 8-bosqich) |
| Pullik Veepoo funksiyalari (HRV tahlili, EKG kasallik ma'lumotlari) | Ba'zi ma'lumotlar chiqmasligi | Rejaga kirmaydi, Veepoo bilan kelishuv kerak |
| SDK tez yangilanadi | Mosligi buzilishi | Versiyalarni pin qilish |

Hal qilingan (2026-11-09):
1. Bildirishnoma turlari: `plan`, `alert`, `status`, matn va qoidalari 7.1 da (foydalanuvchi "optimalini qil" dedi).
2. "Mening rejam" = soatning haqiqiy avto-o'lchash intervali, har bir o'lchovdan oldin soatga bildirishnoma (qaror 6, 7).
3. Ilova yopiq bo'lganda ham avto-o'lchash ishlaydi, Android'da foreground servis majburiy (qaror 8, 7.6).

Hali ochiq (foydalanuvchidan kerak):
- Ilova nomi, `slug`, `android.package`, `ios.bundleIdentifier` (0-bosqich). EAS dev build shundan oldin boshlanmaydi.
- `plan` bildirishnomasining standart vaqti: 2 daqiqa va kunduzgi oyna 08:00–22:00 mosmi (7.1)? Kelishilmasa shu qiymatlar bilan boshlanadi.

---

## Ilova: manbalar

- Android: `github.com/HBandSDK/Android_Ble_SDK` (commit `02fe17e`, Apache-2.0). Papkalar: `android_sdk_source/jar_core`, `jar_base`, `jniLibs`, `sdkdoc/VeepooSDK Android Api - English.md`. `vpprotocol-2.3.95.15.aar` (class fayllari o'qilgan).
- iOS: `github.com/HBandSDK/iOS_Ble_SDK` (commit `5dcb91e`, Apache-2.0). `iOS_sdk_source/Framework/2.2.XX.15`, `iOS_sdk_source/doc/VeepooSDK iOS Api_en.md` (avto-o'lchash bo'limi faqat xitoycha `VeepooSDK iOS Api.md` da: "自动测量时间间隔"). Framework statik, faqat arm64 (simulyatorda ishlamaydi). Windows'da klon qilganda `git config core.longpaths true` kerak (uzun yo'llar).
- uni-app: `github.com/HBandSDK/uni-appSDK` V1.1.0, `VeepooUniAppSDK使用文档.md` (auth va ANCS bo'limlari).
- Boshqa repolar (kerak emas): `WeChat_Mini_Program_Ble_SDK`, `HarmonyOS_BLE_SDK`.
- Expo: docs.expo.dev SDK 58 (modules, config-plugins, third-party-library).
- Protokol tajribasi: `C:\Users\user\Desktop\synapse-soat` (README va `src/watch/*`).
