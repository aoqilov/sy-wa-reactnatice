# O'lchovlar: Android'da har biri qanday ishlaydi

Soat: **S105 / E500** (Veepoo / H Band platformasi). Hujjat 2026-11-17 dagi kod holatini tasvirlaydi (`main`, `4b6336e`).
EKG batafsil alohida yozilgan: [ecg.md](ecg.md), tana tarkibi: [body.md](body.md). Ulanish va umumiy reja:
[watch-integration-plan.md](watch-integration-plan.md). iOS rejasi: [ios-plan.md](ios-plan.md).

Home'dagi o'lchovlar:

| Kalit | Nomi | Birlik | Qayerda o'lchanadi | Holati |
|---|---|---|---|---|
| `pulse` | Puls | zarb/daq | Optik, 30 s oqim | Ishlaydi |
| `oxygen` | Kislorod (SpO₂) | % | Optik, 30 s oqim | Ishlaydi |
| `pressurePump` | Bosim (nasos) | mmHg | Tasmadagi havo yostiqchasi | Ishlaydi (2026-11-10) |
| `temperature` | Harorat | °C | Soat datchigi | Ishlaydi |
| `ecg` | EKG | zarb/daq (+ RR, QT/QTc, HRV, nafas) | Elektrod (barmoq) | Ishlaydi, [ecg.md](ecg.md) |
| `sugar` | Shakar | mmol/l | Optik, taxminiy | Ishlaydi (2026-11-10) |
| `blood` | Qon tahlili | mmol/l, µmol/l | Optik, taxminiy | Ishlaydi (2026-11-10) |
| `stress` | Stress | 0..100 | Optik (`startDetectPressure`) | Yozilgan (2026-11-11), soatda sinalmagan |
| `bodyComp` | Tana tarkibi | % yog' (+ 13 ta qiymat) | Elektrod, bioimpedans, taxminiy | Yozilgan (2026-11-11), soatda sinalmagan, [body.md](body.md) |

Home'da yo'q, lekin kodda qolganlar:

| Kalit | Holati |
|---|---|
| `hrv` | **Home'dan olib tashlangan (2026-11-16).** Oqim (`measure.ts`) va native `startHrv/stopHrv` qolgan. HRV qiymati EKG hisobotida ko'rinadi. 9-bo'lim |
| `met` | **Ilovadan olib tashlangan (2026-11-11, foydalanuvchi qarori).** Native `startMet/stopMet` va soat xotirasidan "met" o'qish modulda qolgan, ilova ularni ishlatmaydi |
| optik bosim | **Butunlay olib tashlangan (2026-11-10):** S105 unga javob bermaydi. 12-bo'lim |

---

## 1. Umumiy tuzilish

```
Home "Boshlash" ─> use-measurement.ts ─> measure.ts: startMeasure(key) ─> watchModule.startX()  (native, Kotlin)
                                                  ▲                               │
                        onProgress / onDone / onError                 SDK listener ─> emitData("event", {type, ...})
                                                  └──────── measure.ts onEvent(e) <┘
```

**Fayllar:**

| Fayl | Vazifasi |
|---|---|
| `modules/veepoo-watch/android/.../WatchController.kt` | SDK chaqiruvlari. Har bir SDK javobini `event` hodisasi sifatida JS'ga yuboradi |
| `modules/veepoo-watch/android/.../VeepooWatchModule.kt` | Native funksiyalarni JS'ga ochadi (`Function("startX")`) |
| `modules/veepoo-watch/src/VeepooWatch.ts` | JS tomondagi turlar (funksiyalar, hodisalar) |
| `src/shared/watch/measure.ts` | Har bir o'lchovning oqimi: taymerlar, xatolar, natijani tekshirish |
| `src/features/home/hooks/use-measurement.ts` | Home holati: doira, doira ichidagi matn, xatoni ko'rsatish, natijani saqlash, zaxira oqimga o'tish |
| `src/features/home/api/get-metrics.ts` | Kartalar: nomi, ikonka, birlik, me'yor matni |
| `src/features/home/lib/readings.ts` | Natijani saqlash (`readings.v1`, ko'pi bilan 300 ta) va holatini baholash (Normal / Past / Yuqori) |

**Umumiy qoidalar** (`startMeasure`):

- **Bir vaqtda bitta o'lchov:** soat buyruqlarni parallel bajarmaydi. Boshqa o'lchov tanlansa, joriysi bekor qilinadi.
  `isMeasuring()` bo'lganda History sinxroni, rutina va siferblat uzatish boshlanmaydi (`holdWatch()` ham shu hisobchini
  ishlatadi).
- **Aloqa uzilsa**, o'lchov `lost` xatosi bilan tugaydi.
- **Eski APK:** o'rnatilgan build'da native funksiya yo'q bo'lsa (`TypeError`), `outdated` xatosi chiqadi ("ilovani
  yangilang"). Boshqa xato bo'lsa `noReply`.
- **To'xtatish buyrug'i.** Natija bilan o'zi yakunlanadigan o'lchovlarda (nasosli bosim, harorat, shakar, qon tahlili,
  stress, tana tarkibi, EKG 4-turdagi natija) muvaffaqiyatdan keyin soatga to'xtatish buyrug'i yuborilmaydi. Oqim bilan
  ishlaydigan o'lchovlarda (puls, SpO₂, HRV) esa doim yuboriladi. Xato yoki bekor qilishda har doim yuboriladi.
- **Doira:** progress (0..1) doira chegarasida soat mili kabi to'ladi (`measure-circle.tsx`). Doira ichida qolgan vaqt
  ko'rinadi. U o'tgan vaqt va bajarilgan ulushdan hisoblanadi, boshida (5% gacha) esa foiz ko'rinadi.
- **Ogohlantirish va xato:**
  - Ogohlantirish (`hint`: `posture`, `moved`, `onWatch`, `onWatchHrv`, `ecgContact`) xato emas. U doira ostida sariq
    rangda chiqadi va o'lchov davom etadi.
  - Xato (`measure.error.<kod>`) qizil rangda chiqadi. Matnlar `src/shared/i18n/translations.ts` da, uch tilda.
- **Soat javoblarida o'tish paketlari bo'ladi:** "band", "taqilmagan" kabi holatlar bir-ikki marta kelib o'tib ketishi
  mumkin. Shuning uchun xato odatda faqat **ketma-ket 3 marta** yoki ma'lum vaqt davom etsagina chiqadi.
- **Qiymat chegaralari:** soatdan kelgan har bir son oqilona oraliqda tekshiriladi (`inRange`). Oraliqdan tashqaridagi
  qiymat (o'lchov boshidagi 0 lar va h.k.) shunchaki tashlanadi.

**Umumiy xato kodlari:**

| Kod | Qachon |
|---|---|
| `unavailable` | Native modul yo'q (veb yoki Expo Go) |
| `outdated` | O'rnatilgan APK eski, funksiya yo'q |
| `busy` | Soat boshqa o'lchov bilan band |
| `notWorn` | Soat bilakda zich emas / taqilmagan |
| `charging` | Soat zaryadda |
| `lowBattery` | Batareya past |
| `lost` | Bluetooth aloqasi uzildi |
| `noData` | Soat yaroqli qiymat yubormadi |
| `featureUnsupported` | Soat bu o'lchovni qo'llamaydi (HRV, stress, tana tarkibi) |

---

## 2. Puls (`pulse`)

- **Native:** `startHeart()` / `stopHeart()`. SDK `startDetectHeart` → hodisa `heart {status, value}`.
- **Oqim:** soat qiymatlarni o'lchov davomida uzluksiz yuboradi. 30 s (`HR_MS`) davomida 30–250 oralig'idagi
  qiymatlar yig'iladi.
  - Doira vaqt bo'yicha to'ladi.
  - Ichida joriy puls ko'rinadi, qiymat hali kelmagan bo'lsa "--".
- **Natija:** **oxirgi 8 ta** qiymatning medianasi (`SAMPLES_USED`). O'lchov boshidagi beqaror qiymatlar hisobga
  olinmaydi.
- **Xatolar:**
  - `STATE_LOW_BATTERY` → `lowBattery`;
  - ketma-ket 3 marta `STATE_HEART_BUSY` → `busy`;
  - ketma-ket 3 marta `STATE_HEART_WEAR_ERROR` → `notWorn`;
  - 30 s ichida birorta qiymat kelmasa → `noData`.
- **Holat:** < 40 juda past, < 60 past, 60–100 normal, ≤ 120 biroz yuqori, > 120 yuqori.

## 3. Kislorod — SpO₂ (`oxygen`)

- **Native:** `startSpo2()` / `stopSpo2()`. SDK `startDetectSPO2H` → hodisa
  `spo2 {value, rate, deviceState, checking, progress}`.
- **Oqim:** pulsdagi bilan bir xil. 30 s (`SPO2_MS`) davomida 70–100 % oralig'idagi qiymatlar yig'iladi, natija
  oxirgi 8 tasining medianasi.
- **Xatolar:**
  - `CHARGING` → `charging`, `CHARG_LOW` → `lowBattery`;
  - ketma-ket 3 marta band holati (`BUSY`, `DETECT_BP`, `DETECT_HEART`, `DETECT_AUTO_FIVE`, `DETECT_FTG`, `DETECT_PPG`)
    → `busy`;
  - ketma-ket 3 marta `UNPASS_WEAR` → `notWorn`;
  - 30 s ichida qiymat kelmasa → `noData`.
- **Holat:** ≥ 95 normal, ≥ 90 past, < 90 juda past.

## 4. Bosim — nasos bilan (`pressurePump`)

Tasmadagi havo yostiqchasi to'ladi, keyin havo sekin chiqariladi. Soat bosimni shu jarayonda o'lchaydi, xuddi
tonometr kabi.

**Native:** `startCuffBp(false)` / `stopCuffBp()` → SDK `startDetectCuffBP`. Bu metod rasmiy hujjatda yo'q, faqat
AAR ichida bor. Hodisa:

```
cuffBp {flag, sbp, dbp, status, heart, pressure, rate}   (yoki {unsupported: true})
```

- `flag = true` — soat o'lchovni tugatdi. AAR bytecode'i `vp_t.handler` dan tasdiqlangan: kadrning 5-bayti 10 ga teng
  bo'lganda shunday bo'ladi.
- `sbp` va `dbp` — natija: yuqori va quyi bosim, mmHg. `heart` — puls.
- `pressure` — yostiqchadagi joriy bosim. U o'lchov paytida doira ichida ko'rinadi.
- `unsupported` — SDK qurilmada bu funksiya yo'q deb hisoblab, buyruqni yubormadi → `cuffUnsupported`.

**Oqim:**
1. 12 s ichida soatdan javob kelmasa, `noReply` (`CUFF_REPLY_MS`). Soat yostiqchani to'ldirishdan oldin ekranida
   3 s sanaydi.
2. Jarayon davomida 30 s jimlik bo'lsa `bpFailed`. Umumiy chegara 180 s.
3. `flag` bo'lganda: `sbp` 50–300 va `dbp` 20–250 oralig'ida bo'lishi va `sbp > dbp` bo'lishi kerak. Holat esa
   qabul qilinadiganlar ro'yxatida bo'lishi kerak: `EMPTY`, `SUCCESS`, `POSTURE_ERROR`, `NOT_REMAINING_STATIONARY`.
   Shunda natija qabul qilinadi.
4. Progress vaqt bo'yicha hisoblanadi (~45 s, `CUFF_TYPICAL_MS`, ko'pi bilan 95%), chunki kadrlarda foiz yo'q.

**Qo'l holati** (`POSTURE_ERROR`: qo'l yurak balandligida emas) **va qimirlash** (`NOT_REMAINING_STATIONARY`):
- Soat bularni harakat datchigi bilan o'zi baholaydi, lekin **o'lchovni baribir davom ettirib, natija beradi**.
- Shuning uchun ilova bu holatlarda o'lchovni **hech qachon o'zi uzmaydi**. Faqat sariq ogohlantirish ko'rsatadi,
  yakuniy xulosani soat beradi.
- Avval 15 s dan keyin uzilardi, natijada o'lchov oxiriga yetmasdi (tuzatildi, 2026-11-10).

**Darhol xato beradigan holatlar:** `CHARGING`, `LOW_POWER`, `DEVICE_BUSY`. Boshqa xato holatlari (`LOOSE`,
`NOT_WEAR`, `HEART_ERROR`, `SLOW_DEFLATION`, `TOO_MUCH_PRESSURE`, `POOR_SIGNAL_QUALITY`, `TIME_OUT`) ketma-ket 3 marta
kelsa xato bo'ladi.

**Muhim tuzatish (2026-11-10):** native hodisa qiymatlarni `sbp`/`dbp` nomi bilan yuboradi. JS esa avval `sys`/`dia`
ni o'qirdi. Natijada soat natija bersa ham ilova uni ko'rmasdi va oxirgi holat bo'yicha "qo'l holati" xatosini
chiqarardi. Endi ikkala nom ham o'qiladi.

**Zaxira yo'l — soatning o'zida o'lchash** (`startOnWatchBp`):
- Ilovadan boshlash ishlamasa (`noReply` yoki `cuffUnsupported`), `use-measurement.ts` bu yo'lga o'zi o'tadi.
- Foydalanuvchi bosimni soatning o'zida o'lchaydi. Ilova esa soat xotirasidagi yozuvlarni har 5 s da o'qiydi
  (`readManualBp(since)` → SDK `readDeviceManualData`, hodisa `manualBp {records}`). Soat 6 s javob bermasa, so'rov
  qaytariladi.
- Bosish vaqtidan ~30 s oldingi va undan yangi yozuv paydo bo'lsa, o'sha natija bo'ladi. Umumiy chegara 240 s, keyin
  `onWatchNone`.

**Holat** (tekshiruv tartibi shu):

| Holat | Shart |
|---|---|
| Yuqori | yuqori ≥ 140 yoki quyi ≥ 90 |
| Juda past | yuqori < 80 yoki quyi < 50 |
| Past | yuqori < 90 yoki quyi < 60 |
| Biroz yuqori | yuqori ≥ 120 yoki quyi ≥ 80 |
| Normal | Boshqa barcha holatlar |

## 5. Harorat (`temperature`)

- **Native:** `startTemp()` / `stopTemp()`. SDK `startDetectTempture` → hodisa
  `temp {temp, progress, deviceState, oprate}`.
- **Oqim:** soat progress (0..100) yuboradi va o'zi yakunlaydi. `progress == 100` bo'lganda oxirgi yaroqli harorat
  (30–43 °C) natija bo'ladi, 0.1 aniqlik bilan.
- **Holatlar** (vendor demo `BodyTemperatureDetectActivity` bo'yicha):
  - `oprate`: 0 — soatda funksiya yo'q (`tempNoData`); 2 — o'lchov to'xtagan (e'tiborga olinmaydi).
  - `deviceState`: 0 va 7 — qiymat yaroqli; 1–6 — band (3 marta → `busy`); 8 — batareya past; 9 — datchik xatosi
    (3 marta → `tempSensor`).
- **Taymerlar:** 15 s jimlik yoki 120 s chegara → `tempNoData`.
- **Holat:** < 35.5 juda past, < 36.1 past, 36.1–37.2 normal, ≤ 38 biroz yuqori, > 38 yuqori.

## 6. EKG (`ecg`)

Barmoq soatning metall qismiga (elektrodga) qo'yiladi. To'lqin jonli chiziladi va to'liq yozuv History'da hisobot
bilan saqlanadi. Batafsil: **[ecg.md](ecg.md)**.

Qisqacha:
- **Native:** `startEcg()` / `stopEcg()`, SDK `startDetectECG(w, true, listener)`. Hodisalar:
  - `ecg` — soniyalik holat (`dataType` 1), qisman (2) yoki to'liq (4) natija, muvaffaqiyatsiz (3);
  - `ecgWave` — to'lqin (`mv`, `adc`);
  - `ecgInfo` — chastotalar;
  - `ecgResult` — natija.
- **Xatolar:**
  - 15 s barmoq tegmasa → `ecgNoContact`;
  - barmoq 4 martadan ko'p ko'tarilsa → `ecgLeadOff`;
  - 15 s jimlik → `ecgNoData`; umumiy chegara 180 s.
- **Natija:** puls (min/maks), RR, QT/QTc, HRV, nafas, aloqa foizi. Home'da qiymat o'rnida puls ko'rinadi, holat
  pulsdagi kabi baholanadi.

## 7. Shakar — qon glyukozasi (`sugar`)

Optik, **taxminiy**: glyukometr o'rnini bosmaydi. Bu izoh doira ichida va natija yonida yoziladi.

**Native:** `startGlucose()` / `stopGlucose()` → SDK `startBloodGlucoseDetect(w, IBloodGlucoseChangeListener)`.
Hodisalar:

| Hodisa | Mazmuni |
|---|---|
| `glucose {progress, value, risk}` | `value` mmol/l da. SDK uni o'zi hisoblaydi: `(xom & 0x1FFF) / 100`. O'lchov davomida 0 bo'lishi mumkin. `risk`: `NONE`/`LOW`/`MIDDLE`/`HIGH` — soatning o'z bahosi |
| `glucoseError {status}` | `NONSUPPORT` → `glucoseUnsupported`, `LOW_POWER` → `lowBattery`, `BUSY` → `busy`, `WEARING_ERROR` → `notWorn` |
| `glucoseStop` | Soat yakunladi |
| `glucoseSupport {detect, any}` | SDK'ning qo'llab-quvvatlash belgilari (`VpSpGetUtil.isSupportBloodGlucoseDetect`) |

**Oqim:**
- Progress doirada ko'rinadi.
- 100% da oxirgi yaroqli qiymat (1–35 mmol/l) natija bo'ladi. Qiymat hali kelmagan bo'lsa, yana 5 s kutiladi.
- 15 s jimlik → `glucoseNoData`. Agar soat "shakar yo'q" degan bo'lsa → `glucoseUnsupported`. Umumiy chegara 150 s.

**Holat:**
- Shakar istalgan vaqtda o'lchanadi, ovqatdan keyin ham. Shuning uchun baholashda normal chegara **3.9–7.8 mmol/l**.
- Undan tashqari: < 3.0 juda past, < 3.9 past, ≤ 11.0 biroz yuqori, > 11.0 yuqori.
- Yorliqqa soatning xavf bahosi va "taxminiy" belgisi qo'shiladi.
- Diqqat: Home kartasidagi me'yor matni (`get-metrics.ts`) "3.9–5.6 mmol/l (och qoringa)" deydi, baholash esa 7.8 gacha
  normal deb hisoblaydi. Ikkalasi ataylab har xilmi, tekshirish kerak **[?]**.

**Keyinroq:** kalibrlash (glyukometrdagi qiymat bilan, `setBloodGlucoseAdjustingData`).

## 8. Qon tahlili (`blood`)

Lipidlar va siydik kislotasi. Optik, **taxminiy**: laboratoriya tahlili o'rnini bosmaydi. Soatning rasmiy ilovasidagi
"Blood Components Test" bilan bir xil beshta qiymat beradi.

**Native:** `startBloodComponent()` / `stopBloodComponent()` → SDK
`startDetectBloodComponent(BleWriteResponse, false, listener)`.
- `false` — Normal rejim. Personal rejim (kalibrlash) keyinroq qo'shiladi.
- Bu metodlar inuker kutubxonasining `BleWriteResponse` ini kutadi, `IBleWriteResponse` ni emas. Native qismda buning
  uchun `bleWriter()` yozilgan.
- SDK qurilmada funksiya yo'q bo'lsa (`isSupportBloodComponent`), buyruqni **jimgina yubormaydi**. Shuning uchun native
  qism buni o'zi tekshirib, `bloodError {state: "UNSUPPORTED"}` yuboradi.

**Hodisalar:**
- `blood {progress, uricAcid, tcho, tag, hdl, ldl}` — o'lchov davomida;
- `bloodDone {...}` — yakuniy natija;
- `bloodError {state}` — `LOW_POWER`, `BUSY`, `WEAR_ERROR`, `UNKNOWN` yoki `UNSUPPORTED`;
- `bloodStop` — o'lchov to'xtadi.

**Qiymatlar** (SDK ichida hisoblanadi):

| Maydon | Ko'rsatkich | Birlik | Qabul oralig'i | Me'yor (kattalar) |
|---|---|---|---|---|
| `uricAcid` | Siydik kislotasi | µmol/l (xom / 10) | 50–1200 | 150–420 |
| `tcho` | Umumiy xolesterin | mmol/l (xom / 100) | 1–20 | < 5.2 |
| `tag` | Triglitseridlar | mmol/l | 0.1–20 | < 1.7 |
| `hdl` | HDL (yaxshi xolesterin) | mmol/l | 0.1–6 | > 1.0 |
| `ldl` | LDL (yomon xolesterin) | mmol/l | 0.1–15 | < 3.4 |

**Oqim:**
- Progress doirada ko'rinadi.
- Natija `bloodDone` dan olinadi. Beshala qiymat qabul oralig'ida bo'lishi kerak, chunki o'lchov davomida 0 lar keladi.
- 100% dan keyin `bloodDone` 5 s kutiladi. 15 s jimlik → `bloodNoData`. Umumiy chegara 150 s.

**Ko'rinishi:**
- Beshala ko'rsatkich **bitta kartada**, har qatorda nomi, me'yori, qiymati va holati bor. To'liq hisobot History'da:
  `/history/blood/<id>` (`BloodReportPage.tsx`).
- Doira va o'lchov kartasida qiymatlarning o'zi emas, faqat "me'yordagilar soni / 5" ko'rinadi.

**Keyinroq:** Personal rejim va laboratoriya qiymatlari bilan kalibrlash (`settingBloodComponentCalibration`).

## 9. HRV (`hrv`) — Home'da yo'q

Home kartasi 2026-11-16 da olib tashlangan. HRV qiymati EKG natijasida ko'rinadi. Kod quyidagi holatda qolgan:

- **Native:** `startHrv()` / `stopHrv()` → SDK `startDetectHrv`. Hodisalar: `hrv {value}` (ms), `hrvError {state}`,
  `hrvStop`.
- **Oqim:** soat foiz bermaydi, progress vaqt bo'yicha (60 s). Qiymatlar 5–300 ms oralig'ida yig'iladi, natija oxirgi
  8 tasining medianasi. 20 s jimlik yoki 90 s chegarada borlari bilan yakunlanadi.
- **Nega S105'da ishlamaydi:** SDK `startDetectHrv` ichida `FunctionCheckUtil.checkHrvAppDetect()` →
  `VpSpGetUtil.isSupportHrvAppDetect()` ni tekshiradi (AAR bayt-kodi). S105 bu bayroqni false yuboradi. Funksiya soatda
  bor (`isSupportHRV`), lekin ilovadan boshlab bo'lmaydi. Shuning uchun native qism oldindan tekshirib,
  `hrvError {state: "UNSUPPORTED"}` → `featureUnsupported` yuboradi.
- **Zaxira yo'l** (`startOnWatchManual("hrv")`): `featureUnsupported` kelsa, foydalanuvchi HRV'ni soat menyusidan
  o'lchaydi. Ilova har 5 s da `readManualData(since, ["hrv"])` bilan yangi yozuvni kutadi (4 daqiqagacha, keyin
  `onWatchNoneHrv`). Natija yozuvdagi qiymatlar medianasi.
- **Holat:** < 20 ms past, qolgani normal (me'yor yoshga bog'liq, shuning uchun faqat aniq past qiymat belgilanadi).

MET ham shu sababdan ilovadan boshlanmaydi (`isSupportMetAppDetect` false). U ilovadan butunlay olib tashlangan.

## 10. Stress (`stress`)

- **Native:** `startStress()` / `stopStress()` → SDK `startDetectPressure` (SDK'da stress "pressure" deb ataladi,
  qon bosimi bilan adashtirmang). Oldindan `isSupportStress` tekshiriladi, yo'q bo'lsa
  `stressError {state: "UNSUPPORTED"}`.
- **Hodisalar:**
  - `stress {progress}` — o'lchov davomida, 0..100;
  - `stressDone {value}` — natija, 0..100 (soatning o'z shkalasi);
  - `stressError {state}` — `UNSUPPORTED`, `BUSY`, `LOW_POWER`, `WEAR_OFF` va boshqalar;
  - `stressStop` — natijasiz to'xtadi → `noData`.
- **Oqim:** soat o'zi yakunlaydi. 15 s jimlik yoki 150 s chegara → `noData`.
- **Holat:** ≤ 25 bo'shashgan, ≤ 50 normal, ≤ 75 o'rtacha, > 75 yuqori.
- **Soatda sinalmagan.** Natija qiymati qanday kelishi (0..100 butun son ekani) birinchi o'lchovda tekshiriladi.

## 11. Tana tarkibi (`bodyComp`)

Elektrod orqali (bioimpedans), EKG kabi barmoq soatning metall qismiga tegib turadi. **Taxminiy.** Batafsil:
[body.md](body.md).

- **Native:** `startBodyComp()` / `stopBodyComp()` → SDK `startDetectBodyComponent`. Oldindan `isSupportBodyComponent`
  tekshiriladi.
- **Hodisalar:**
  - `body {progress, lead}` — `lead` 0: barmoq tegib turibdi, 1: ko'tarildi;
  - `bodyDone {...14 ta qiymat}` — natija;
  - `bodyError {state}`, `bodyStop` (natijasiz → `noData`).
- **Oqim:**
  - Barmoq tegmagan bo'lsa doira ostida `ecgContact` ogohlantirishi chiqadi.
  - Boshida 15 ta paket davomida barmoq tegmasa → `ecgNoContact`. Tekkanidan keyin 4 marta ketma-ket ko'tarilsa →
    `ecgLeadOff`.
  - 15 s jimlik yoki 150 s chegara → `noData`.
- **Qiymatlar** (`parseBodyParts`, native `bodyParts`): SDK birliklarni yozmagan, ular maydon nomidan taxmin qilingan.
  Yog' ulushi 60 dan katta bo'lsa, hamma qiymat 10 ga bo'linadi (SDK hujjatida "10 barobar" deyilgan). BMI (5–80) va
  yog' % (2–60) bo'lmasa natija yaroqsiz.

  | Maydon | SDK | Birlik | Qabul oralig'i |
  |---|---|---|---|
  | `bmi` | `BMI` | — | 5–80 |
  | `fatPct` | `bodyFatRate` | % | 2–60 |
  | `fatKg` | `fatRate` | kg | 1–200 |
  | `ffmKg` | `FFM` | kg | 10–200 |
  | `musclePct` | `muscleRate` | % | 10–95 |
  | `muscleKg` | `muscleMass` | kg | 5–150 |
  | `subFatPct` | `subcutaneousFat` | % | 1–60 |
  | `waterPct` | `bodyWater` | % | 20–80 |
  | `waterKg` | `waterContent` | kg | 5–150 |
  | `skeletalPct` | `skeletalMuscleRate` | % | 5–70 |
  | `boneKg` | `boneMass` | kg | 0.5–10 |
  | `proteinPct` | `proteinProportion` | % | 5–30 |
  | `proteinKg` | `proteinMass` | kg | 1–50 |
  | `bmr` | `basalMetabolicRate` | kkal/kun | 500–4000 |

- **Home'da:** qiymat o'rnida yog' %, yorliqda BMI, mushak kg, suv % va "taxminiy". Holat har doim "normal", chunki SDK
  me'yor bermaydi.
- Bo'y, vazn, yosh va jins soatdagi shaxsiy ma'lumotdan olinadi.
- **Soatda sinalmagan.**

---

## 12. Olib tashlangan: optik bosim

- SDK `startDetectBP` buyruqni faqat soat ulanganda `FunctionDeviceSupportData.bp` ni "bor" desagina yuboradi
  (`isSupportBp`). Aks holda buyruq jimgina yuborilmaydi.
- S105 bu belgini "yo'q" deydi. Uning bosimi nasos bilan: `bloodPressureType = 5`.
- Doira 35% da (≈20 s) "javob bermadi" bilan to'xtardi.
- uni-app JS SDK (synapse-soat) xuddi shu `90 01 00` buyrug'ini tekshirmasdan yuboradi. Lekin veb ilovada ham optik
  bosim bu soatda hech qachon sinalmagan: u ham nasosni tanlaydi.
- Foydalanuvchi qarori bilan (2026-11-10) optik bosim butunlay olib tashlandi: Home kartasi, oqim, matnlar, native
  `startBp/stopBp`.

## 13. History: soat bilan sinxron

History'da soxta ma'lumot yo'q. U ikki manbani birlashtirib, vaqt bo'yicha tartib bilan ko'rsatadi:

| Manba | Qayerdan | Fayl |
|---|---|---|
| **Ilova** | Home'da ilova orqali qilingan o'lchovlar (telefonda, `readings.v1`) | `features/home/lib/readings.ts` |
| **Soat** | Soat xotirasidagi yozuvlar: soatning o'zida yoki ilovadan o'lchanganlar | `shared/watch/watch-history.ts` |
| **Soat (avto)** | Soat "Rejam" jadvali bo'yicha o'zi o'lchaganlar: kunlik 5 daqiqalik ma'lumot | `shared/watch/watch-history.ts` |

**Sinxron:**
- **Native:** `readManualData(since, kinds)` → SDK `readDeviceManualData`. U bir so'rovda bir necha turni o'qiydi:
  bosim, puls, SpO₂, harorat, shakar, qon tahlili, HRV, MET.
- **Hodisa:**
  - har tur uchun `manualData {kind, records}`;
  - oxirida `complete` yoki `failed`.
  - Soat ba'zi turlarga javob bermasligi mumkin, shuning uchun 8 s jimlik bo'lsa o'qish tugagan hisoblanadi. Umumiy
    chegara 45 s.
- **Qiymatlar:**
  - SDK ularni o'zi birlikka o'giradi (AAR bytecode'i `vp_aa`): shakar va lipidlar /100, siydik kislotasi /10.
  - Puls, SpO₂ va HRV yozuvi qiymatlar massivi bo'lib keladi. Undan yaroqli qiymatlarning medianasi olinadi.
  - Chegaradan oshgan xom son kelsa, qayta o'giriladi.
  - MET yozuvining birligi (`MetoManualData.meto`, Int) hujjatda yo'q: |qiymat| > 20 bo'lsa 10 ga bo'linadi **[?]**.
- **Qachon:** History ochilganda, soat ulangan bo'lsa. Bir daqiqada ko'pi bilan bir marta, "Yangilash" tugmasi esa
  darhol sinxron qiladi. Oxirgi 15 kun o'qiladi.
- **Saqlash:** yozuvlar `watchHistory.v1` ga saqlanadi (30 kun), sinxron vaqti esa `watchHistory.syncedAt` ga. History
  soat ulanmagan paytda ham ochiladi.
- **O'lchov paytida** sinxron qilinmaydi (`isMeasuring()`), chunki soat bir vaqtda bitta ish bajaradi.
- **Avto-o'lchovlar:**
  - Native `readDailyData(days)` → SDK `readOriginData`. Soat protokol versiyasi 3/5 bo'lsa `IOriginData3Listener` (puls
    massivi, SpO₂, shakar, qon tahlili ham), aks holda `IOriginDataListener` (puls, bosim, harorat).
  - Soat odatda 3 kunni saqlaydi (`FunctionDeviceSupportData.wathcDay`).
  - Hodisa `dailyData {records}`: vaqt soatning mahalliy vaqti (`y, mo, d, h, mi`). Oxirida `complete` yoki `timeout`.
    Jimlik 15 s, chegara 120 s.
  - Puls va SpO₂ deyarli uzluksiz yoziladi, shuning uchun **30 daqiqalik median**ga yig'iladi. Bosim, harorat, shakar,
    qon tahlili har biri alohida.
  - Har sinxronda o'qilgan kunlarning avto yozuvlari yangisi bilan almashtiriladi (bo'lak to'lib borgan bo'lishi
    mumkin).
- **Tana tarkibi** alohida o'qiladi: `readBodyHistory()` → SDK `readBodyComponentData`, hodisa `bodyHistory`
  ([body.md](body.md)).

**Takrorlanmaslik:** ilovadan boshlangan o'lchov soat xotirasiga ham yoziladi. Soat yozuvi shu turdagi ilova yozuvidan
3 daqiqa ichida bo'lsa, u tashlanadi.

**Ko'rinishi:**
- Tepada sinxron qatori turadi:
  - "Soatdan ma'lumot olinmoqda…";
  - "Soat bilan sinxron: 14:05";
  - yoki sababi: soat ulanmagan, o'lchov ketyapti, javob bermadi.
- Kartalarda davr bo'yicha o'rtacha, min va maks qiymat va mini grafik bor.
- Kartani bosganda o'lchov turining **alohida sahifasi** ochiladi (bottom sheet emas). History tabi ichida Stack bor:
  `src/app/(app)/history/`:

  | Manzil | Fayl | Sahifa |
  |---|---|---|
  | `/history` | `index.tsx` | Ro'yxat (kartalar, davr, sinxron qatori) |
  | `/history/[metric]?period=7d` | `[metric].tsx` | Xulosa (min / o'rtacha / maks, grafik) va kunlar bo'yicha har bir o'lchov |
  | `/history/blood` | `[metric].tsx` | Qon tahlili yozuvlari ro'yxati |
  | `/history/blood/<id>` | `blood/[id].tsx` | Bitta qon tahlili hisoboti |
  | `/history/ecg` | `[metric].tsx` | EKG yozuvlari ro'yxati |
  | `/history/ecg/<id>` | `ecg/[id].tsx` | Bitta EKG yozuvining hisoboti |
  | `/history/body`, `/history/body/<id>` | `body.tsx`, `body/[id].tsx` | Tana tarkibi o'lchovlari va hisoboti |
  | `/history/sleep`, `/history/steps` | `sleep.tsx`, `steps.tsx` | Uyqu ([sleep.md](sleep.md)), qadamlar ([activity.md](activity.md)) |

  - `unstable_settings.anchor = "index"`: ichki sahifaga to'g'ridan-to'g'ri kelinganda ham (masalan Home'dagi "EKG
    yozuvlari", `withAnchor`) orqaga qaytish ro'yxatga olib boradi.
  - Sarlavha `CusPageHeader`, orqaga tugmasi bilan. Android'ning "orqaga" tugmasi ham ishlaydi.
  - Har yozuvda vaqti, manbasi (Soat / Ilova) va qo'shimcha ma'lumot bor: qon tahlilining beshta qiymati, soatning
    shakar xavf bahosi, bosimdagi puls.
- **Holat chegaralari** Home bilan bir xil (`statusFor`, `readings.ts`).

## 14. Native funksiyalar va hodisalar: qisqa jadval (iOS moslik jadvali uchun)

iOS moduli JS'ga shu nomlar va hodisa shakllarini berishi kerak, shunda `measure.ts` o'zgarmaydi
([ios-plan.md](ios-plan.md)).

| O'lchov | JS funksiyasi | Android SDK | Hodisalar (`event.type`) |
|---|---|---|---|
| Puls | `startHeart` / `stopHeart` | `startDetectHeart` / `stopDetectHeart` | `heart` |
| SpO₂ | `startSpo2` / `stopSpo2` | `startDetectSPO2H` / `stopDetectSPO2H` | `spo2` |
| Nasosli bosim | `startCuffBp(flag)` / `stopCuffBp` | `startDetectCuffBP` / `stopDetectCuffBP` | `cuffBp` |
| Bosim (soatda) | `readManualBp(since)` | `readDeviceManualData` | `manualBp` |
| Harorat | `startTemp` / `stopTemp` | `startDetectTempture` / `stopDetectTempture` | `temp` |
| EKG | `startEcg` / `stopEcg` | `startDetectECG` / `stopDetectECG` | `ecg`, `ecgWave`, `ecgInfo`, `ecgResult` |
| Shakar | `startGlucose` / `stopGlucose` | `startBloodGlucoseDetect` / `stopBloodGlucoseDetect` | `glucose`, `glucoseError`, `glucoseStop`, `glucoseSupport` |
| Qon tahlili | `startBloodComponent` / `stopBloodComponent` | `startDetectBloodComponent` / `stopDetectBloodComponent` | `blood`, `bloodDone`, `bloodError`, `bloodStop` |
| HRV | `startHrv` / `stopHrv` | `startDetectHrv` / `stopDetectHrv` | `hrv`, `hrvError`, `hrvStop` |
| Stress | `startStress` / `stopStress` | `startDetectPressure` / `stopDetectPressure` | `stress`, `stressDone`, `stressError`, `stressStop` |
| MET (ishlatilmaydi) | `startMet` / `stopMet` | `startDetectMet` / `stopDetectMet` | `met`, `metError`, `metStop` |
| Tana tarkibi | `startBodyComp` / `stopBodyComp` | `startDetectBodyComponent` / `stopDetectBodyComponent` | `body`, `bodyDone`, `bodyError`, `bodyStop` |
| Tana tarkibi (soatda) | `readBodyHistory` | `readBodyComponentData` | `bodyHistory` |
| Qo'lda o'lchovlar tarixi | `readManualData(since, kinds)` | `readDeviceManualData` | `manualData` |
| Kunlik avto yozuvlar | `readDailyData(days)` | `readOriginData` | `dailyData` |

Barcha hodisalar bitta `event` kanali orqali keladi. Aloqa holati esa alohida `connection` kanalida.

## 15. Yangi o'lchov qo'shish

1. **Native.** `WatchController.kt` ga `startX/stopX` metodlarini qo'shing:
   - har bir SDK javobini `emitData("x", ...)` bilan yuboring;
   - SDK funksiyani jimgina rad etishi mumkin bo'lsa, qo'llab-quvvatlashni o'zingiz tekshirib, aniq xato hodisasini
     yuboring;
   - `VeepooWatchModule.kt` da `Function("startX")` ni ochib, `VeepooWatch.ts` va `.web.ts` ga qo'shing.
2. **JS.** `measure.ts` da:
   - `MeasureKey`, `MEASURABLE`, `RawReading` ga yangi o'lchovni qo'shing;
   - `case "x"`: `startNative`/`stopNative`, `onEvent`, jimlik va umumiy chegara taymerlari;
   - kerak bo'lsa yangi `MeasureError` kodlari va ularning uch tildagi matnini qo'shing.
3. **Home.**
   - `get-metrics.ts` ga kartani qo'shing (nomi, ikonka, birlik, me'yor);
   - `metric-info.ts`, `metric-guide.ts` va `metric-images.ts` ga matn va rasm qo'shing;
   - `readings.ts` ga holatni baholashni qo'shing;
   - `use-measurement.ts` dagi `liveDisplay` da doira ichida nima ko'rinishini belgilang.
4. **Build.** Native o'zgargani uchun yangi EAS build kerak. Soatda sinab, natijani shu hujjatga yozing.
