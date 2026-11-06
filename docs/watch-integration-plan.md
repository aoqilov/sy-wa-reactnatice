# Soat bilan ulanish va ishlatish rejasi (native SDK, Android + iOS)

Reja 2026-11-06 holatiga asoslangan. Soat: E500 (Veepoo / H Band platformasi). Ilova: `synapse-watch` (Expo SDK 58, React Native 0.88).

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

Eski `docs/react-native-plan.md` va `synapse-soat` loyihasi (Web Bluetooth) endi faqat ma'lumotnoma: o'lchov mantig'i, taymerlar, xato matnlari ko'chadi. SDK chaqiruvlari native tilda qayta yoziladi.

---

## 2. Hozirgi holat (`synapse-watch`)

- Soat ma'lumotlari hammasi soxta: `src/features/home/api/get-metrics.ts`, `src/widgets/app-header/use-watch-status.ts`, `src/features/myplan/api/plans.ts` ichidagi `sendPlansToWatch`.
- Bluetooth uchun hech narsa o'rnatilmagan. `package.json` da `expo-dev-client`, `expo-notifications`, `expo-build-properties` yo'q.
- `app.json`: `name`/`slug` hali `tutorial-native` (shablon qoldig'i). `android.package` va `ios.bundleIdentifier` berilmagan.
- "Mening rejam" ekrani: har bir o'lchov uchun "necha daqiqada bir marta soat o'zi o'lchaydi" (`Plan { key, intervalMin, enabled }`). Bu soatning avto-o'lchash sozlamasiga mos keladi (7.5).

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
modules/veepoo-watch/
  expo-module.config.json
  src/index.ts, src/types.ts, src/index.web.ts       TS API, turlar, web stub
  android/
    libs/   vpprotocol-2.3.95.15.aar, vpbluetooth-1.20.aar, JL_*.aar, abpartool-release.aar, BmpConvert_*.aar, gson
    src/main/jniLibs/  (ECG uchun: arm64-v8a, armeabi-v7a, x86, x86_64)
    src/main/java/expo/modules/veepoowatch/
      VeepooWatchModule.kt        Expo ko'prigi
      WatchController.kt          SDK bilan ishlaydi, JS'ga bog'liq emas
      WatchForegroundService.kt   ulanishni fonda ushlab turish (ixtiyoriy)
      EventMapper.kt              SDK modellari → umumiy hodisalar
  ios/
    VeepooWatch.podspec  (vendored_frameworks)
    Frameworks/  VeepooBleSDK.framework, DFUnits, JL_BLEKit, JLDialUnit, ZipZap, GRDFUSDK, SDKResours.bundle
    VeepooWatchModule.swift
    WatchController.swift
    EventMapper.swift
plugin/   config plugin: ruxsatlar, manifest, Info.plist
```

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
VeepooWatch.setAutoMeasure(key: AutoSwitchKey, on: boolean, intervalMin?: number): void;   // "Mening rejam"

VeepooWatch.notify(n: { title: string; body: string; kind: 'plan' | 'alert' | 'status' }): Promise<NotifyResult>;
VeepooWatch.setNotificationSwitch(kind: 'other' | 'sms' | 'phone', on: boolean): void;

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

---

## 7. Bildirishnomalar (faqat o'zimiz yozgan)

### 7.1 Turlari (taklif, o'zgartirish mumkin)

| Kod | Qachon | Misol |
|---|---|---|
| `plan` | "Mening rejam" bo'yicha o'lchov vaqti | "Puls o'lchash vaqti" |
| `alert` | O'lchov normadan tashqarida | "Puls 128: dam oling va qayta o'lchang" (tibbiy maslahat emas, ehtiyot matni bilan) |
| `status` | Batareya past, aloqa uzildi | "Soat batareyasi 15%" |

### 7.2 Android: ilova soatga to'g'ridan-to'g'ri yuboradi [tasdiqlangan]

- `sendSocialMsgContent(w, ContentSocailSetting(ESocailMsg, title, content))`.
- `ESocailMsg` ichida hujjatda yo'q **`APP_CUSTOM_MSG`** bor (AAR'da topildi, shuningdek `ZALO`, `VIBER`). Avval `APP_CUSTOM_MSG` bilan sinaymiz, soatda chiqmasa hujjatlashtirilgan **`OTHER`** ga o'tamiz **[?]**.
- Soat tomonda "boshqa xabarlar" kaliti yoqiq bo'lishi kerak: `FunctionSocailMsgData.other` ni `settingSocialMsg` bilan `SUPPORT_OPEN` qilamiz va avval `readSocialMsg` bilan soat qo'llab-quvvatlashini tekshiramiz (`UNSUPPORT` bo'lsa, UI'da yashiramiz).
- Sarlavha/matn uzunlik chegarasi **[?]**, sinovda aniqlanadi.
- Ilova yopiq bo'lsa: ulanish foreground servisda (`connectedDevice` turi) turadi. Bu **ixtiyoriy**: foydalanuvchi sozlamada "Fonda ulanishni saqlash" ni yoqsa ishlaydi, doimiy bildirishnoma ko'rinadi. Android 14+ da `FOREGROUND_SERVICE_CONNECTED_DEVICE` ruxsati va Play Console'da foreground servis turini asoslash kerak.
- MVP: ilova ochiq yoki servis yoqilgan paytda yuboriladi. Ilova butunlay yopiq bo'lganda reja bo'yicha yuborish keyingi versiya (WorkManager + qayta ulanish).

### 7.3 iOS: ilova yubora olmaydi, ikki yo'l bor [?]

1. **Matn yuborish**: `veepooSDKSendStartTransmissionMessage`, ilova to'g'ridan-to'g'ri soatga. Faqat soat `textAndImageTransmissionType == 1` desa. E500 qo'llab-quvvatlashi noma'lum.
2. **Lokal bildirishnoma + ANCS**: ilova `expo-notifications` bilan o'z lokal bildirishnomasini jadval bo'yicha chiqaradi. iPhone uni soatga ANCS orqali o'zi uzatadi, buning uchun soat iPhone bilan **juftlangan** bo'lishi va soatdagi "boshqa xabarlar" kaliti yoqiq bo'lishi kerak (`veepooSDKSettingMessageType`). Bu yo'lda ilova BLE'ga ulangan bo'lishi shart emas, fon rejimi kerak emas. Uni hujjatida iOS juftlash oynasi autentifikatsiyada `isPair: true` bilan chiqishi aytilgan; native iOS'da buni qanday ishga tushirish noma'lum.
- Qaysi yo'l ishlashi iPhone sinovida (7-bosqich) aniqlanadi. Kodda ikkalasi ham yoziladi, sinab bo'lingach keraksizi olib tashlanadi.

### 7.4 JS qatlami

`notify({ title, body, kind })` ikkala platformada bir xil chaqiriladi. Natija: `{ ok, via: 'ble' | 'ancs' | 'unsupported' }`. "Mening rejam" ekrani rejalar o'zgarganda lokal jadvalni (iOS) va soatning avto-o'lchash sozlamasini (7.5) yangilaydi.

### 7.5 Soatning avto-o'lchashi (Mening rejam) [?]

`Plan.intervalMin` ni soatga yozish uchun SDK'da avto-o'lchash sozlamasi bor: Android `setAutoMeasureSettingData` / `readAutoMeasureSettingData`, iOS "automatic measurement and detection time setting" (1.1.0) va `veepooSDKReadAutoMonitSwitchInfo`. Hamma o'lchov turi uchun ixtiyoriy interval qo'llab-quvvatlanishi noma'lum (uni-app SDK'da faqat yoqish/o'chirish kaliti bor edi). Natija shunga qarab `sendPlansToWatch` ni haqiqiy qilishda UI cheklanadi (masalan, tayyor intervallar ro'yxati).

---

## 8. Sozlamalar va o'rnatiladigan paketlar

Paketlar faqat `npx expo install` bilan (SDK'ga mos versiya). Har bir Expo API'dan oldin Expo 58 hujjatini o'qish (AGENTS.md talabi).

```
npx expo install expo-dev-client expo-notifications expo-build-properties
```

`app.json` o'zgarishlari (bajarishdan oldin foydalanuvchi qiymatlarni beradi):
- `name`, `slug`, `android.package`, `ios.bundleIdentifier`: yakuniy qiymatlar. Package/bundle ID do'konga chiqqandan keyin o'zgartirib bo'lmaydi.
- iOS `Info.plist`: `NSBluetoothAlwaysUsageDescription` (o'zbekcha matn). Fon rejimi (`bluetooth-central`) faqat zarur bo'lsa va App Store asosi bilan (7.3 ning 2-yo'li uni talab qilmaydi).
- Android ruxsatlari va servis: config plugin orqali (4.1 dagi ro'yxat). `android/` va `ios/` papkalarini qo'lda tahrirlamaymiz (CNG).

Expo 58 talablari (hujjatdan): Android compileSdk 37 / targetSdk 36, iOS 16.4+, Xcode 26.4+. Expo Go ishlamaydi, faqat dev build.

Android AAR'larni modulga ulash: `android/libs/` ga qo'yiladi. Expo hujjatidagi "third-party library" sahifasi (SDK 52+) Gradle'ga qanday qo'shishni ko'rsatadi; aniq Gradle satrlarini o'sha sahifadan o'qish kerak **[?]**. iOS: podspec'da `vendored_frameworks`, yo'l `..` siz va `ios/` ichida.

---

## 9. Bosqichlar

Har bosqich oxirida qabul mezonlari tekshiriladi. Foydalanuvchi bajaradigan joyda 👤.

### 0. 👤 Tayyorgarlik
- Expo akkaunti (expo.dev) va `eas login`.
- Yakuniy ilova nomi, `android.package`, `ios.bundleIdentifier`.
- Android telefon va E500 soat. Apple Developer akkaunti va iPhone keyinroq (iOS sinovi uchun).
- Soatdagi H Band ilovasi soatdan uzilgan bo'lishi kerak.

### 1. Sinov: Android (go/no-go)
1. `npx create-expo-module@latest --local`, modul skeleti, AAR'lar, config plugin.
2. EAS Android dev build.
3. Skan → ulanish → kalit tekshiruvi → batareya → puls.
4. `sendSocialMsgContent` bilan test bildirishnoma: `APP_CUSTOM_MSG` va `OTHER` ikkalasini sinash.
5. `startDetectCuffBP` bilan yostiqchali bosim.
- **Mezon:** soat bilan haqiqiy aloqa, puls natijasi va soatda ko'ringan test bildirishnoma.

### 2. Umumiy API va hodisalar
TS turlari, hodisa shakllari (`synapse-soat/types.ts` asosida), Android EventMapper, web stub, hodisa jurnali (xom baytlar o'rniga SDK javoblari).

### 3. Android to'liq funksiyalar
Barcha o'lchovlar, kunlik, uyqu, qadam, soatdagi yozuvlar, profil, avto-o'lchash. `synapse-soat/session.ts` mantig'ini ko'chirish.

### 4. Ilovaga ulash (Android)
Soxta ma'lumotlarni almashtirish: `get-metrics.ts`, `use-watch-status.ts`, `sendPlansToWatch`. Skan/ulanish ekrani, avto-ulanish, ruxsat so'rovlari, xato matnlari.

### 5. Android bildirishnomalari va fon
`notify()`, bildirishnoma turlari sozlamasi, ixtiyoriy foreground servis, qayta ulanish. Play Console talablari (foreground servis turi, ruxsat asoslari, maxfiylik).

### 6. iOS: kodni yozish (sinovsiz)
Swift qatlami 6-bo'limdagi iOS jadvaliga muvofiq, ikkala bildirishnoma yo'li (7.3). Faqat header'larga qarshi ehtiyotkor tekshirish, kompilyatsiya yo'q. `ios/` papkasi Android build'iga ta'sir qilmaydi.

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
| Android fon cheklovlari (ishlab chiqaruvchilar servisni o'ldiradi) | Fon bildirishnomalari | Foreground servis ixtiyoriy, MVP ilova ochiq paytda |
| Pullik Veepoo funksiyalari (HRV tahlili, EKG kasallik ma'lumotlari) | Ba'zi ma'lumotlar chiqmasligi | Rejaga kirmaydi, Veepoo bilan kelishuv kerak |
| SDK tez yangilanadi | Mosligi buzilishi | Versiyalarni pin qilish |

Aniqlashtirish kerak:
1. Bildirishnoma turlari (7.1) to'g'rimi: qaysilari kerak, matnlari qanday?
2. "Mening rejam" soatda haqiqiy avto-o'lchash interval sozlamasi bo'lishi kerakmi, yoki faqat telefondagi eslatmami?
3. Ilova yopiq bo'lganda ham Android'da bildirishnoma kerakmi (foreground servis) yoki ilova ochiq paytda yetarlimi?

---

## Ilova: manbalar

- Android: `HBandSDK/Android_Ble_SDK`, `vpprotocol-2.3.95.15.aar` (class fayllari o'qilgan), `VeepooSDK Android Api - English.md`.
- iOS: `HBandSDK/iOS_Ble_SDK`, `VeepooBleSDK.framework 2.2.XX.15` header'lari (125 ta), `VeepooSDK iOS Api_en.md`. Framework statik, faqat arm64 (simulyatorda ishlamaydi).
- uni-app: `HBandSDK/uni-appSDK` V1.1.0, `VeepooUniAppSDK使用文档.md` (auth va ANCS bo'limlari).
- Expo: docs.expo.dev SDK 58 (modules, config-plugins, third-party-library).
- Protokol tajribasi: `C:\Users\user\Desktop\synapse-soat` (README va `src/watch/*`).
