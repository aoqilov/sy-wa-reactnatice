iOS rejasi

Maqsad: iOS ham Android kabi ishlasin. iOS native qismi JS'ga Android bilan bir xil funksiya nomlarini va bir xil
hodisalarni beradi. Shunda Home, Tarix, uyqu, qadamlar va tana tarkibi kodi o'zgarmasdan ikkala platformada ishlaydi.
Android tomonda 65 ta native funksiya bor (VeepooWatchModule.kt). iOS papkasi (modules/veepoo-watch/ios) hali yo'q.
Umumiy qarorlar: docs/watch-integration-plan.md, 6- va 7-bosqichlar.


0. Tayyorgarlik — bajarildi (2026-11-17)

SDK 2.2.113.15 o'rganildi, moslik jadvali: docs/ios-mapping.md. Asosiy topilmalar:
- Freymvorklarda simulyator qismi yo'q, faqat iPhone (arm64). Kompilyatsiyani simulyator build'i bilan tekshirib
  bo'lmaydi. Tavsiya: GitHub Actions macOS runner'da imzosiz xcodebuild (EAS limiti va Apple akkaunti kerak emas).
- SDK "o'zi saqlaydi" rejimida (VPPeripheralManage) ishlatiladi: kunlik ma'lumot, uyqu, soatdagi tana tarkibi
  faqat SDK bazasi orqali o'qiladi.
- Yana 5 ta freymvork va 2 ta pod kerak (JL_BLEKit, DFUnits, JLDialUnit, ZipZap, GRDFUSDK; FMDB, MJExtension).
- Nasosli bosimni ilovadan boshlash uchun iOS SDK'da API yo'q. Yechim yozildi: Android SDK yuboradigan kadr
  CoreBluetooth orqali to'g'ridan-to'g'ri yoziladi, javob SDK delegate'idan o'qiladi
  (modules/veepoo-watch/ios/CuffBpChannel.swift). Zaxira: Health Glance (Android'da startMiniCheckup).


1. Modul skeleti — yozildi (2026-11-17), kompilyatsiya hali tekshirilmagan

Fayllar: modules/veepoo-watch/ios/ (VeepooWatchModule.swift, WatchController.swift, CuffBpChannel.swift,
VeepooWatch.podspec, Frameworks/ — 7 ta freymvork, 33 MB), expo-module.config.json ga "apple",
app.json ga Bluetooth ruxsati va fon rejimi, .github/workflows/ios-compile.yml.
Skeletdagi funksiyalar: isBluetoothEnabled, requestEnableBluetooth, getConnectionState, startCuffBp, stopCuffBp.
Expo autolinking iOS modulini topadi (Windows'da tekshirildi).

ios/ papkasi: VeepooWatchModule.swift (JS bilan bog'lovchi), WatchController.swift (WatchController.kt ning
muqobili), freymvorklar ulangan .podspec (FMDB va MJExtension bog'liqliklari bilan).
Kompilyatsiya tekshiruvi: GitHub Actions workflow (expo prebuild, pod install, xcodebuild -sdk iphoneos
CODE_SIGNING_ALLOWED=NO).
expo-module.config.json ga iOS qo'shiladi.
app.json ga Bluetooth ruxsati matni (NSBluetoothAlwaysUsageDescription).
Buyruqlar navbati: SDK buyruqlarni parallel bajarmaydi.
Hodisalar (event, connection, scan) Android bilan bir xil nom va shaklda.


2. Ulanish

Skan, ulanish (iOS'da qurilma MAC emas, UUID bilan aniqlanadi), parol, batareya, soat imkoniyatlari.
Natija: "soatni ulang" ekrani va avto-ulanish iOS'da ham ishlaydi.


3. O'lchovlar

Puls, EKG, harorat, shakar, qon tahlili, HRV, stress, MET, tana tarkibi.
Bosim: iOS SDK'da yostiqchali bosimni ilovadan boshlash API'si yo'q. Uning o'rniga "soatning o'zida o'lchash"
oqimi ishlatiladi.


4. Ma'lumot sinxroni

Qo'lda o'lchovlar tarixi, 5 daqiqalik kunlik yozuvlar, qadamlar, uyqu, soatdagi tana tarkibi natijalari.
Shaxsiy ma'lumot va avto-o'lchash sozlamasi ("Mening rejam").


5. Bildirishnomalar va sozlamalar

Soatga bildirishnoma ilovadan yuborilmaydi. Uning o'rniga OS jadvallagan lokal bildirishnoma ishlatiladi, iPhone
uni ANCS orqali soatga o'zi uzatadi. Bu ilova yopiq bo'lganda ham ishlaydi.
Budilniklar va soatdagi kalitlar.
Qo'ng'iroq ko'prigi (CallBridge) iOS'da bo'lmaydi: iOS ilovaga qo'ng'iroqlarni ko'rish imkonini bermaydi, iPhone
qo'ng'iroqni soatga o'zi ko'rsatadi.


6. Soat ekrani (siferblat)

0-bosqichdagi jadvalga bog'liq. Jieli soatlar uchun iOS'da alohida JL freymvorki kerak bo'lishi mumkin. Mos API
bo'lmasa, iOS'da bu bo'lim yashiriladi.


7. JS moslashuvi

Ilova funksiya bor-yo'qligiga qarab ishlaydi (dialsAvailable, bodyWatchHistoryAvailable va h.k.), shuning uchun
iOS'da yo'q funksiyalar o'zi yashiriladi.
Qolgani: Platform.OS === "ios" tekshiruvlari (bosim oqimi, bildirishnomalar, qo'ng'iroq bo'limi) va iOS uchun matnlar.


8. Telefonda sinash

Kompilyatsiya xatolarini tuzatish.
Har bir bosqichni iPhone'da E500 soat bilan sinash.


Cheklovlar

Mac kerak emas: iOS build EAS bulutida yig'iladi.
Apple Developer akkaunti ($99/yil) hozir yo'q. U iPhone'ga o'rnatish (ad hoc yoki TestFlight) va App Store uchun kerak.
iPhone hozir yo'q. Bluetooth simulyatorda ishlamaydi, soat faqat haqiqiy telefonda ulanadi.
SDK'da simulyator qismi yo'q (0-bosqich), shuning uchun simulyator build'i ham yig'ilmaydi. Kompilyatsiya GitHub
Actions'da imzosiz tekshiriladi.


Tartib

Akkaunt va iPhone kelguncha 1-7 bosqichlar yoziladi. Kompilyatsiya GitHub Actions'da tekshiriladi, EAS limiti
sarflanmaydi. Haqiqiy sinov (8-bosqich) akkaunt va iPhone bo'lgach.
Telefonsiz yozilgan kod birinchi sinovda albatta tuzatish talab qiladi, 8-bosqichga alohida vaqt ajratiladi.


Ochiq savollar

Apple Developer akkaunti va iPhone qachon bo'ladi?
Kompilyatsiya tekshiruvi uchun GitHub Actions ishlatamizmi (repo yopiq bo'lsa macOS daqiqalari bepul limitdan
tez sarflanadi)?
Boshqa ochiq savollar: docs/ios-mapping.md, 4-bo'lim.
