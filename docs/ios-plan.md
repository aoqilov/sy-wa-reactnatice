iOS rejasi

Maqsad: iOS ham Android kabi ishlasin. iOS native qismi JS'ga Android bilan bir xil funksiya nomlarini va bir xil
hodisalarni beradi. Shunda Home, Tarix, uyqu, qadamlar va tana tarkibi kodi o'zgarmasdan ikkala platformada ishlaydi.
Ikkala modulda 61 ta native funksiya bor (VeepooWatchModule.kt va VeepooWatchModule.swift, ro'yxati bir xil).
Umumiy qarorlar: docs/watch-integration-plan.md, 6- va 7-bosqichlar. Moslik jadvali: docs/ios-mapping.md.

Holat (2026-11-17): 0-7 bosqichlar yozildi, HECH BIRI SINALMAGAN va kompilyatsiya qilinmagan (Mac va iPhone yo'q).
Foydalanuvchi qarori: hamma bosqich sinovsiz yoziladi, xatolar birinchi ishga tushirishda ilova ichidagi konsol
orqali topilib, joyida tuzatiladi (8-bosqich).


0. Tayyorgarlik — bajarildi

SDK 2.2.113.15 o'rganildi, moslik jadvali: docs/ios-mapping.md. Asosiy topilmalar:
- Freymvorklarda simulyator qismi yo'q, faqat iPhone (arm64). Kompilyatsiyani simulyator build'i bilan tekshirib
  bo'lmaydi. Kompilyatsiya Mac'da Xcode bilan tekshiriladi ("Any iOS Device (arm64)" yoki ulangan iPhone).
- SDK "o'zi saqlaydi" rejimida (VPPeripheralManage) ishlatiladi: kunlik ma'lumot, uyqu, soatdagi tana tarkibi
  faqat SDK bazasi orqali o'qiladi.
- 7 ta freymvork va 2 ta pod kerak (VeepooBleSDK, JL_BLEKit, DFUnits, JLDialUnit, ZipZap, GRDFUSDK, ABParTool;
  FMDB, MJExtension). Har biri SDK binaridagi tashqi sinflardan aniqlangan (podspec izohi).
- Nasosli bosimni ilovadan boshlash uchun iOS SDK'da API yo'q. Yechim: Android SDK yuboradigan kadr CoreBluetooth
  orqali to'g'ridan-to'g'ri yoziladi, javob SDK delegate'idan o'qiladi (CuffBpChannel.swift). Zaxira: Health Glance.


1. Modul skeleti — yozildi

modules/veepoo-watch/ios/: VeepooWatchModule.swift (JS ko'prigi), WatchController.swift (SDK chaqiruvlari),
CuffBpChannel.swift, VeepooWatch.podspec, Frameworks/ (33 MB). expo-module.config.json ga "apple", app.json ga
Bluetooth ruxsati va fon rejimi. Expo autolinking iOS modulini topadi (Windows'da tekshirildi).


2. Ulanish — yozildi

Skan (id = CBPeripheral UUID), ulanish (parol SDK ichida avtomatik), saqlangan soatga avto-ulanish (avval skanda
qidiriladi, 15 s), uzilish va Bluetooth o'chishi, batareya. Ulanishdan keyin "pwd" va "features" hodisalari
peripheralModel'dan yasaladi. Konsolga "[device] ..." qatori: soatning barcha imkoniyat bayroqlari.


3. O'lchovlar — yozildi

Puls, SpO2, harorat (qiymat 10 ga bo'linadi), EKG (iOS butun modelni beradi: soniyalik holat, mV to'lqin
convertToMv bilan, oxirgi natija Android shakliga yasaladi), shakar (100 ga bo'linadi), qon tahlili, HRV, stress,
MET, tana tarkibi, nasosli bosim (CuffBpChannel), soatda o'lchangan bosim.
iOS'da xato holati o'lchovni darhol tugatadi: native `final: true` qo'shadi, measure.ts uni darhol xato qiladi.


4. Ma'lumot sinxroni — yozildi

Qo'lda o'lchovlar (readManualTestData, qiymatlar xom: watch-history.ts o'zi o'giradi). Kunlik ma'lumot: avval
veepooSdkStartReadDeviceAllData (SDK bazasiga), keyin bazadan kun bo'yicha: puls/bosim/qadam, SpO2, shakar,
harorat, qon tahlili. Kunning bir qismini o'qib bo'lmaydi: readDailyDay kunni to'liq beradi. Qadamlar, uyqu
(aniq uyquda parseSleepLine), soatdagi tana tarkibi.


5. Sozlamalar va eslatmalar — yozildi

Shaxsiy ma'lumot, avto-o'lchash (VPAutoMonitTestModel), avto-o'lchash kalitlari va kechasi SpO2
(veepooSDKSettingBaseFunctionType; SpO2 uchun vaqt oralig'i yo'q), salomatlik eslatmalari, harakatsizlik, puls
ogohlantirishi, matnli budilnik (repeat: Android satri <-> 8 bitli son), bildirishnoma kalitlari.
Bildirishnoma matnini ilova yubora olmaydi (iPhone ANCS orqali o'zi uzatadi); soat matn uzatishni qo'llasa
(textAndImageTransmissionType == 1) shu ishlatiladi. Qo'ng'iroq ko'prigi iOS'da yo'q: call-forward.ts bo'limni
yashiradi. Lokal bildirishnoma hozircha kerak emas: ilovada bildirishnoma yuboradigan oqim yo'q (rejadagi
eslatmalar soatning matnli budilnigi orqali ishlaydi).


6. Siferblat — yozildi

dialChannel(o'qish, do'kon) -> VPMarketDialManager: serverdan ro'yxat, yuklab olish, soatga uzatish.
Jieli soatda JL freymvorklari ishlatiladi (ular podspec'da bor). Hodisalar Android bilan bir xil.


7. JS moslashuvi — yozildi

watch-connection.ts (iOS ham "supported"), bluetooth-permissions.ts (iOS'da ruxsatni tizim o'zi so'raydi),
WatchDevPanel (iOS'da ham ochiladi), measure.ts (`final` va `notWorn` belgilar). Android xatti-harakati o'zgarmagan.

Ilova ichidagi konsol (src/widgets/debug-console, src/shared/debug/debug-log.ts): iOS'da va dev build'da chap pastda
">_" tugmasi, qizil son — yangi xatolar. Yig'iladi: native "error"/"writeError"/"log", `unsupported`/`failed`
javoblar, ulanish va skan holatlari, JS xatolari (ErrorUtils, console.error/warn), o'lchov xatolari, soat jurnali.
"Ulashish" tugmasi butun jurnalni matn qilib yuboradi (Telegram va h.k.): shu matn bilan xatoni tuzatamiz.


8. Telefonda sinash — kutilmoqda

Kerak: Mac + Xcode (bor, 2026-11-17), iPhone. O'z iPhone'iga o'rnatish uchun oddiy Apple ID yetadi (7 kunlik
imzo); TestFlight va App Store uchun Apple Developer akkaunti.
1. Mac'da: git pull, npm ci, npx expo prebuild --platform ios, cd ios && pod install, .xcworkspace ni ochish,
   Build. Kompilyatsiya xatolari Xcode'da chiqadi: nusxalab yuboriladi va tuzatiladi.
2. Ilovani ochish: konsolda "Konsol yoqildi" va native funksiyalar yo'qligi haqida xato bo'lmasligi kerak.
3. Ulanish: "[device] ..." qatori (bayroqlar), keyin har bo'lim: o'lchovlar, Tarix sinxroni, uyqu, Rejam, siferblat.
4. Har xatoda: konsol -> Ulashish -> matnni yuborish.
Birinchi sinovda alohida tekshiriladiganlar: docs/ios-mapping.md, 4-bo'lim va koddagi `[?]` izohlari.


Cheklovlar

Mac kerak emas: iOS build EAS bulutida yig'iladi.
Apple Developer akkaunti ($99/yil) hozir yo'q. U iPhone'ga o'rnatish (ad hoc yoki TestFlight) va App Store uchun kerak.
iPhone hozir yo'q. Bluetooth simulyatorda ishlamaydi, soat faqat haqiqiy telefonda ulanadi.
SDK'da simulyator qismi yo'q, shuning uchun simulyator build'i ham yig'ilmaydi.


Ochiq savollar

Apple Developer akkaunti va iPhone qachon bo'ladi?
Boshqa ochiq savollar: docs/ios-mapping.md, 4-bo'lim.
