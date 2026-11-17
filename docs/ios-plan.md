iOS rejasi

Maqsad: iOS ham Android kabi ishlasin. iOS native qismi JS'ga Android bilan bir xil funksiya nomlarini va bir xil
hodisalarni beradi. Shunda Home, Tarix, uyqu, qadamlar va tana tarkibi kodi o'zgarmasdan ikkala platformada ishlaydi.
Android tomonda 59 ta native funksiya bor (VeepooWatchModule.kt). iOS papkasi (modules/veepoo-watch/ios) hali yo'q.
Umumiy qarorlar: docs/watch-integration-plan.md, 6- va 7-bosqichlar.


0. Tayyorgarlik

iOS SDK'ni (HBandSDK/iOS_Ble_SDK, VeepooBleSDK.framework) yuklab olish va header fayllarini o'qish.
Moslik jadvalini tuzish: Android'dagi 59 funksiyaning har biri uchun iOS'dagi muqobili. Har biri uchun belgi: bor,
boshqacha ishlaydi yoki yo'q. Jadval docs/ios-mapping.md ga yoziladi.
Freymvorkda simulyator uchun qism bormi, tekshirish (kompilyatsiyani tekshirish shunga bog'liq).


1. Modul skeleti

ios/ papkasi: VeepooWatchModule.swift (JS bilan bog'lovchi), WatchController.swift (WatchController.kt ning
muqobili), freymvork ulangan .podspec.
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
EAS iOS simulyator build'ini akkauntsiz yig'sa bo'lishi kerak (hali tekshirilmagan). U Swift kodi kompilyatsiya
bo'lishini tekshirish uchun yetadi.


Tartib

Akkaunt va iPhone kelguncha 0-7 bosqichlar yoziladi. Kompilyatsiya 2-3 ta simulyator build bilan tekshiriladi,
har bir build EAS limitidan sarflanadi. Haqiqiy sinov (8-bosqich) akkaunt va iPhone bo'lgach.
Telefonsiz yozilgan kod birinchi sinovda albatta tuzatish talab qiladi, 8-bosqichga alohida vaqt ajratiladi.


Ochiq savollar

Apple Developer akkaunti va iPhone qachon bo'ladi?
0-bosqichni boshlash (build talab qilmaydi).
