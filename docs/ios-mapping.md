# iOS moslik jadvali (0-bosqich)

Holat: 2026-11-17. Manba: `github.com/HBandSDK/iOS_Ble_SDK` (`e283b1b`, SDK 2.2.113.15), papka
`iOS_sdk_source/Framework/2.2.XX.15`, `doc/VeepooSDK iOS Api_en.md` va header'lar. Hech narsa iPhone'da
sinalmagan. **[?]** — hujjatdan aniq emas, birinchi sinovda tekshiriladi.

Reja: [ios-plan.md](ios-plan.md). Android tomoni: [measurements.md](measurements.md) 14-bo'lim.

Belgilar: **✅** bor, deyarli bir xil · **⚠️** bor, lekin boshqacha ishlaydi · **❌** yo'q.

---

## 1. SDK haqida asosiy topilmalar

### 1.1 Freymvorklar

| Freymvork | Turi | Nima uchun | Ulash |
|---|---|---|---|
| `VeepooBleSDK` | statik, ObjC + Swift | Asosiy SDK | Do Not Embed |
| `JL_BLEKit`, `DFUnits` | statik | Jieli soatlar (siferblat) | Do Not Embed |
| `JLDialUnit`, `ZipZap` | dinamik | Jieli siferblat, arxiv | Embed & Sign |
| `GRDFUSDK` | dinamik | Proshivka yangilash (OTA) | Embed & Sign. Bizga kerak emas, lekin SDK unga bog'liq bo'lishi mumkin **[?]** |
| Pod'lar | | `FMDB` (SDK'ning ichki bazasi), `MJExtension` | Demo `Podfile` dan |

- **Hammasida faqat iPhone (arm64) qismi bor, simulyator qismi yo'q.** Rejadagi "kompilyatsiyani EAS simulyator
  build'i bilan tekshiramiz" g'oyasi ishlamaydi: simulyator uchun yig'ishda SDK ulanmaydi. Yechim 2-bo'limda.
- `VeepooBleSDK` Xcode 26.2 da yig'ilgan (`DTXcode 2620`), minimal iOS 10. EAS image'dagi Xcode 26.2 yoki yangiroq
  bo'lishi kerak **[?]**.
- Jieli freymvorklari `doc/K系列第三方库` papkasida. Siferblat kerak bo'lmasa ham, `VeepooBleSDK` ularsiz ulanadimi,
  noma'lum **[?]**. Birinchi kompilyatsiyada ko'rinadi.

### 1.2 Ma'lumotni saqlash rejimi

SDK'da ikki rejim bor:
- `VPPeripheralManage`: SDK ma'lumotni o'zining FMDB bazasiga yozadi, ilova keyin sana va MAC bo'yicha o'qiydi
  (`VPDataBaseOperation`).
- `VPPeripheralAddManage`: ilova o'zi saqlaydi.

[watch-integration-plan.md](watch-integration-plan.md) da ikkinchisi tavsiya qilingan edi. Lekin kunlik ma'lumot,
uyqu, soatdagi tana tarkibi, EKG yozuvlari va avto-o'lchangan shakar, SpO₂, harorat, qon tahlili **faqat baza
orqali** o'qiladi (`veepooSDKGet...WithDate:andTableID:`). Shuning uchun **birinchi rejim (`VPPeripheralManage`)
olinadi**. Native qism bazadan o'qib, JS'ga Android bilan bir xil shakldagi hodisa yuboradi. Baza jadvali soatning
MAC manzili bilan nomlanadi (`VPPeripheralModel.deviceAddress`).

### 1.3 Ulanish va qurilma identifikatori

- Skan: `veepooSDKStartScanDeviceAndReceiveScanningDevice`. Ulanish: `veepooSDKConnectDevice(VPPeripheralModel, block)`.
- iOS ulanish uchun `CBPeripheral` ni talab qiladi. Saqlangan `id` (UUID) bilan qayta ulanish uchun skan qilish yoki
  `CBCentralManager.retrievePeripherals(withIdentifiers:)` kerak **[?]**.
- Parol tekshiruvi ulanish ichida avtomatik bo'ladi: `BleVerifyPasswordSuccess` holati Android'dagi `pwd` hodisasiga mos.
- Imkoniyatlar ulanishdan keyin `peripheralModel` da turadi: `bloodPressureType`, `bodyCompositionType`,
  `bloodAnalysisType`, `stressType`, `isSupportHRVTest`, `healthGlanceType`, `supportManualTestType` va boshqalar.
- **Ogohlantirish (hujjatdan):** iOS bir soatga bir vaqtda bir nechta ilovani ulaydi. H Band ham ulangan bo'lsa,
  SDK cheksiz o'qish tsikliga tushishi mumkin. Foydalanuvchiga ko'rsatma matni kerak.
- SDK buyruqlarni parallel bajarmaydi. Masalan, kunlik ma'lumot o'qilayotganda puls o'lchovi "band" xatosini beradi.
  Native qismda buyruqlar navbati kerak, Android'dagi kabi.

---

## 2. Kompilyatsiyani qanday tekshiramiz

Simulyator build'i ishlamaydi (1.1). Variantlar:

| Variant | Narxi | Nimani tekshiradi |
|---|---|---|
| **A. GitHub Actions, macOS runner** (`expo prebuild` → `pod install` → `xcodebuild -sdk iphoneos CODE_SIGNING_ALLOWED=NO`) | EAS limitidan ketmaydi. Repo yopiq bo'lsa, macOS daqiqalari bepul limitdan 10 baravar tez sarflanadi | Swift kodi va SDK'ga ulanish to'liq tekshiriladi |
| B. EAS custom build (`withoutCredentials`, imzosiz `xcodebuild`) | Har urinish EAS limitidan ketadi | A bilan bir xil. Imzosiz yig'ish EAS'da qo'llanishi **[?]** |
| C. Simulyator build, SDK chaqiruvlari `#if !targetEnvironment(simulator)` ichida | EAS limiti | Faqat modul skeleti. SDK chaqiruvlari tekshirilmaydi |

**Qaror (2026-11-17): mahalliy Mac + Xcode.** Foydalanuvchida Mac paydo bo'ldi, kompilyatsiya Xcode'da tekshiriladi
(`expo prebuild --platform ios` → `pod install` → "Any iOS Device (arm64)" uchun Build). A variant (GitHub Actions
workflow) yozilgan edi, lekin repoga qo'shilmadi: GitHub tokenida `workflow` ruxsati yo'q, Mac bilan esa kerak emas.

---

## 3. Funksiyalar jadvali

Android'dagi 65 funksiya ([VeepooWatchModule.kt](../modules/veepoo-watch/android/src/main/java/expo/modules/veepoowatch/VeepooWatchModule.kt)).
iOS metodlarining hammasi `VPBleCentralManage.sharedBleManager().peripheralManage` da, boshqa joyda bo'lsa alohida
yozilgan.

### 3.1 Bluetooth va ulanish

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `isBluetoothEnabled` | `centralManager.state` / `VPBleCentralManageChangeBlock` | ✅ | |
| `requestEnableBluetooth` | — | ⚠️ | iOS ilovaga Bluetooth'ni yoqish imkonini bermaydi. Tizim o'zi oyna ko'rsatadi, funksiya joriy holatni qaytaradi |
| `startScan` / `stopScan` | `veepooSDKStartScanDeviceAndReceiveScanningDevice` / `veepooSDKStopScanDevice` | ✅ | `scan` hodisasidagi `id` — UUID, MAC emas |
| `connect(id, confirmOnWatch)` | `veepooSDKConnectDevice` | ⚠️ | Parol avtomatik. `confirmOnWatch` uchun `Confirm whether the control device has a pop-up connection` bo'limi **[?]** |
| `disconnect` | `veepooSDKDisconnectDevice` | ✅ | |
| `getConnectionState` | o'z holatimiz | ✅ | Native qism holatni o'zi saqlaydi |
| `readBattery` | `veepooSDKReadDeviceBatteryAndChargeInfo` | ✅ | Zaryad holati ham keladi |

### 3.2 O'lchovlar

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `startHeart` / `stopHeart` | `veepooSDKTestHeartStart(BOOL)` | ✅ | Holatlar: Start, Testing, NotWear, DeviceBusy, Over. Android nomlariga o'giriladi (`STATE_HEART_BUSY` va h.k.) |
| `startSpo2` / `stopSpo2` | `veepooSDKTestOxygenStart(BOOL)` | ✅ | Holatlar: NotWear, DeviceBusy, NoFunction, Calibration (qiymat o'rnida kalibrlash foizi keladi), Invalid. Zaryad / batareya holati yo'q |
| `startTemp` / `stopTemp` | `veepooSDK_temperatureTestStart` | ⚠️ | `tempValue` **10 baravar** (365 = 36.5 °C), native'da 10 ga bo'linadi. `enable` = band emas. Android'dagi `deviceState`/`oprate` kodlari yo'q |
| `startEcg` / `stopEcg` | `veepooSDKTestECGStart` | ⚠️ | Holatlar: Start, Testing, NotLead, DeviceBusy, Over, Failure, Complete, NoFunction. `VPECGTestDataModel` har safar **to'liq** keladi (`originalSignals`, `filterSignals`, `hearts`, `rrs`, `qts`, `aveHeart`, `aveHrv`, `aveQT` ...). Soniyalik `wear` maydoni yo'q, uning o'rniga `NotLead` holati. To'lqin birligi (ADC yoki mV) **[?]**: Android'da `EcgUtil` bilan mV ga o'giriladi |
| `startGlucose` / `stopGlucose` | `veepooSDKTestBloodGlucoseStart(start, isPersonalModel:false)` | ⚠️ | `value` **100 baravar** (560 = 5.6 mmol/l). `level` 1/2/3 → `LOW`/`MIDDLE`/`HIGH`, faqat `bloodGlucoseType == 5` bo'lsa. Holatlar: Unsupported, LowPower, DeviceBusy, NotWear |
| `startBloodComponent` / `stopBloodComponent` | `veepooSDKTestBloodAnalysisStart(start, isPersonalModel:false)` | ✅ | Progress `NSProgress` da. Qo'llash: `peripheralModel.bloodAnalysisType` |
| `startHrv` / `stopHrv` | `veepooSDK_HRVTest` | ⚠️ | Qo'llash: `peripheralModel.isSupportHRVTest`. S105'da Android'dagi kabi `false` bo'lishi kutiladi **[?]**. HRV Home'da yo'q |
| `startStress` / `stopStress` | `veepooSDK_stressTestStart` | ✅ | `progress`, `stress`. Qo'llash: `stressType > 1` |
| `startMet` / `stopMet` | `veepooSDK_metTest` | ✅ | Ilova ishlatmaydi. Yozish shart emas |
| `startBodyComp` / `stopBodyComp` | `veepooSDKTestBodyCompositionStart` | ✅ | `lead` (0 = barmoq tegib turibdi) Android bilan bir xil. 14 ta qiymat bir xil nomlarda. Bo'y, vazn va jinsni SDK saqlamaydi, ilova yuboradi |
| `readBodyHistory` | `VPDataBaseOperation.veepooSDKGetDeviceOffStoreBodyCompositionWithDate` | ⚠️ | Bazadan, kunlik ma'lumot o'qilgandan keyin |
| `startCuffBp(flag)` / `stopCuffBp` | SDK'siz: [CuffBpChannel.swift](../modules/veepoo-watch/ios/CuffBpChannel.swift) | ⚠️ | SDK'da API yo'q (hujjatda ham, binarda ham; `veepooSDKTestBloodStart` faqat optik). Yechim: Android SDK yuboradigan `90 01 05 00` kadri SDK ulagan `CBPeripheral` ga (`F0080003`) to'g'ridan-to'g'ri yoziladi, javob `0x90` kadrlari (`F0080002`) SDK delegate'iga ObjC runtime orqali ulangan "quloq" bilan o'qiladi. JS'ga Android bilan bir xil `cuffBp` hodisasi ketadi. Kadr formati synapse-soat'da haqiqiy soatda sinalgan. Ishlamasa, JS o'zi "soatda o'lchash" oqimiga o'tadi (`noReply` / `unsupported`) |
| `readManualBp(since)` | `readManualTestDataWithTimestamp(ts, dataType: BloodPressure)` | ✅ | Yozuvda `testModel` (1 = nasos), `h_bp`, `l_bp`, `heart`, `state` (2 = qo'l holati, 9 = qimirlagan) |
| `readManualData(since, kinds)` | `readManualTestDataWithTimestamp(ts, dataType)` | ✅ | Turlar: bosim, puls, shakar, stress, SpO₂, harorat, MET, HRV, qon tahlili. Qo'llash: `supportManualTestType`. Birliklarni tekshirish kerak **[?]**: hujjatda xolesterin "umol/L", siydik kislotasi "mmol/L" deb yozilgan, ehtimol xato |

### 3.3 Kunlik ma'lumot, qadam, uyqu

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `readDailyData(days)` | `veepooSdkStartReadDeviceAllDataWithReadStateChangeBlock`, keyin bazadan: `veepooSDKGetOriginalDataWithDate` (puls, bosim), `...GetDeviceOxygenDataWithDate`, `...GetDeviceBloodGlucoseDataWithDate`, `...GetDeviceTemperatureDataWithDate`, `...GetDeviceBloodAnalysisDataWithDate` | ⚠️ | Android bir chaqiruvda yozuvlarni oqim bilan beradi. iOS avval hammasini bazaga o'qiydi, keyin native qism kunlar bo'yicha bazadan olib, bir xil `dailyData {records}` hodisasini yuboradi |
| `readDailyDay(day, position)` | — | ⚠️ | Alohida kunni o'qish yo'q: o'qish har doim to'liq, keyin baza. Funksiya bazadan o'sha kunni qaytaradi |
| `readSteps` | `veepooSDK_readStepDataWithDayNumber` | ✅ | `{step, dis, cal}` lug'ati **[?]** |
| `readSleep` | `veepooSDK_readSleepDataWithDayNumber` yoki bazadan `veepooSDKGetAccurateSleepDataWithDate` | ⚠️ | Aniq uyqu modeli (`VPAccurateSleepModel`) va uyqu chizig'i bor. Android maydonlariga o'girish kerak |

### 3.4 Sozlamalar va eslatmalar

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `syncPersonInfo` | `veepooSDKSynchronousPersonalInformation(VPSyncPersonalInfo)` | ✅ | Bo'y, vazn, yosh, jins, qadam maqsadi, uyqu maqsadi |
| `readAutoMeasure` / `setAutoMeasure` | `veepooSDKReadAutoMonitSwitchInfo` / `veepooSDKSetAutoMonitSwitchWithModel` | ✅ | `VPAutoMonitTestModel` |
| `readAutoSwitches` / `setAutoSwitch(key)` | `veepooSDKSettingBaseFunctionType(type, settingState)` | ⚠️ | O'qish: `VPReadFunctionState`. Kalitlar: `heartRate` → `VPSettingAutomaticHRTest`, `bloodPressure` → `AutomaticBPTest`, `hrv` → `AutomaticHRVTest`, `temperature` → `AutomaticTemperatureTest`, `bloodGlucose` → `AutomaticBloodGlucoseTest`. `bloodComponent` uchun alohida kalit topilmadi **[?]** |
| `readSpo2Night` / `setSpo2Night` | `VPSettingAutomaticOxygenTest` | ⚠️ | Faqat yoqish va o'chirish. Boshlanish va tugash vaqtini sozlash topilmadi **[?]** |
| `readHealthReminds` / `setHealthRemind` | `veepooSDKSettingHealthRemindWithRemindType` | ✅ | |
| `readLongSeat` / `setLongSeat` | `veepooSDKSettingDeviceLongSeatWithLongSeatModel(model, settingMode)` | ✅ | |
| `readHeartWarning` / `setHeartWarning` | `veepooSDKSettingDeviceHeartAlarmWithHeartAlarmModel` | ✅ | |
| `readTextAlarms`, `addTextAlarm`, `deleteTextAlarm`, `setTextAlarmOpen` | `veepooSDKSettingDeviceTextAlarmWithTextAlarmModel(model, settingMode)` | ✅ | Bitta metod: o'qish, qo'shish, o'chirish, o'zgartirish |

### 3.5 Bildirishnoma va qo'ng'iroq

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `readNotificationSwitches` / `setOtherNotifications` | `veepooSDKSettingMessageType` / `veepooSDKBatchSettingWithMessageTypeModels` | ✅ | Soatdagi kalitlar. Bildirishnomani iPhone o'zi ANCS orqali uzatadi |
| `setCallNotifications` | `veepooSDKSettingMessageType` (qo'ng'iroq turi) | ✅ | |
| `sendNotification(title, body)` | — | ❌ | Ilova soatga bildirishnoma matnini yubora olmaydi. O'rniga lokal bildirishnoma (`expo-notifications`) ishlatiladi, iPhone uni ANCS orqali soatga o'zi uzatadi. Muqobil: `veepooSDKSendStartTransmissionMessage`, faqat `textAndImageTransmissionType == 1` bo'lsa **[?]** |
| `sendIncomingCall` / `endIncomingCall` | — | ❌ | iPhone qo'ng'iroqni soatga o'zi ko'rsatadi |
| `setCallForwarding` / `getCallForwardStatus` | — | ❌ | Faqat Android (CallBridge). iOS'da bo'lim yashiriladi |

### 3.6 Siferblat

| JS funksiyasi | iOS | Holat | Izoh |
|---|---|---|---|
| `readDialInfo` | `veepooSDK_dialChannelWithChannelModel`; Jieli uchun `openJLDialFileSystemWithAction`, `getJLWatchNamesWithAction`, `getJLCurrentPhotoAndMarketWatchNameWithArray` | ⚠️ | S105 Jieli chipli (`CPUType == 1`) bo'lsa, JL freymvorklari kerak **[?]** |
| `loadDialMarket` | `getVeepooServerAllMarketDialsWithDeviceInfo` | ✅ | SDK serverdan o'zi oladi |
| `installDial(url, crc)` | `downloadMarketDialBinFileWithModel` → `startTransferWithFilePath` | ⚠️ | iOS'da yuklash va uzatish SDK ichida. JS'dagi oqimni moslash kerak |

---

## 4. Ochiq savollar va keyingi tekshiruvlar

1. **Nasosli bosim, xom kadr yo'li** ([CuffBpChannel.swift](../modules/veepoo-watch/ios/CuffBpChannel.swift)):
   iPhone'dagi birinchi sinovda tekshiriladi:
   - soat iOS'dan yozilgan kadrga javob beradimi (synapse-soat'da beradi);
   - SDK begona `0x90` kadrlarni o'zining optik bosim javobi deb qabul qilib, xalaqit bermaydimi;
   - quloq ulangan SDK sinfi (jurnalda `[cuffBp] quloq ulandi: ...`).

   Zaxira variant — **Health Glance (mikro ko'rik)**: `veepooSDK_healthGlanceTestStart`, natijada
   `cuffBloodPressureHigh/Low` bor, turi `VPHealthGlanceTypeCuffBp` (`1 << 3`). Android SDK'da ham bor:
   `startMiniCheckup`, `VpSpGetUtil.getMiniCheckupType()`. S105 uni qo'llashini keyingi Android build'da jurnalga
   yozib bilsa bo'ladi. Ikkalasi ham ishlamasa, iOS'da bosim faqat "soatda o'lchash" orqali.
2. **Kompilyatsiya tekshiruvi** — Mac'da Xcode bilan (2-bo'lim).
3. **Jieli freymvorklari** — siferblatsiz ham kerakmi.
4. **EKG to'lqini birligi** — `originalSignals` / `filterSignals` ADC'mi yoki mV'mi. Demo ilovadagi
   `VPAnalysisViewFactory` va EKG chizish kodidan tekshiriladi.
5. **Saqlangan soatga skansiz ulanish** — UUID bilan `retrievePeripherals`.
6. **Qo'lda o'lchov yozuvlarining birliklari** (qon tahlili, shakar) — birinchi sinovda.
7. **Shakar kalibrlashi** — iOS'da hujjati aniq: `veepooSDKBloodGlucosePersonalWithOpCode` (qiymat 3.0–15.0 mmol/l;
   yoqilsa avto-o'lchovlar ham shu rejimda bo'ladi) va 6 nuqtali `veepooSDKBloodGlucoseMultiPersonalWithOpCode`.
   Ikkalasi bir-birini istisno qiladi. Android'ga qo'shilsa, iOS'da ham bor.
