# EKG: qanday ishlaydi

Soat: E500 (Veepoo / H Band). Bir leadli EKG: odam soatni bir qo'lida taqib turadi va ikkinchi qo'lining barmog'ini soatning metall qismiga (elektrodga) tegizadi. Bu hujjat 2026-11-10 holatini tasvirlaydi.

Qisqa yo'l:

```
Soat ──BLE──> Veepoo SDK (Android) ──> WatchController.kt ──"ecgWave"/"ecg"/"ecgResult"──> measure.ts
                                                                                              │
                                     ┌──────────────── EcgTrace (filtrlar, chastota) <────────┘
                                     │
          Home: EcgLiveStrip (jonli) ┤
                                     └──> o'lchov tugadi ──> ecg-records (fayl + ro'yxat)
                                                                   │
                                     History: EcgRecordsSheet ──> EcgReportView (pleyer, hisobot)
```

---

## 1. Native qatlam (Android)

Fayl: [WatchController.kt](../modules/veepoo-watch/android/src/main/java/expo/modules/veepoowatch/WatchController.kt), `startEcg()` / `stopEcg()`.

- Boshlash: `startDetectECG(writer, true, IECGDetectListener)`. `true` bo'lsa, to'lqin ham keladi.
- To'xtatish: `stopDetectECG(writer, true, null)`, vendor demo kabi.
- Listener chaqiruvlari JS ga hodisa sifatida yuboriladi:

| SDK chaqiruvi | JS hodisasi | Mazmuni |
|---|---|---|
| `onEcgDetectInfoChange` | `ecgInfo` | `frequency`, `drawFrequency`: soat aytgan chastotalar |
| `onEcgDetectStateChange` | `ecg` | Soniyada bir. Maydonlar: `dataType`, `deviceState`, `wear` (0 = barmoq tegib turibdi), `hr1`/`hr2`, `hrv`, `qtc`, `br2`, `rr2`, `progress`, `ecgType` |
| `onEcgDetectResultChange`, `onEcgDetectDiagnosisChange` | `ecgResult` | Yakuniy natija: `hr`, `hrv`, `qtc` (aslida QT), `br` |
| `onEcgADCChange` | `ecgWave` | To'lqin paketi: `mv[]`, `adc[]` (xom), `ecgType`, `n` |

### ADC → "mV"

`onEcgADCChange` ichida har bir nuqta `EcgUtil.convertToMvWithValue(adc, ecgType, false, 20)` bilan o'giriladi. `Int.MAX_VALUE` yaroqsiz nuqta va tashlanadi. Kuchaytirish doim 20. Ikkinchi massiv (`power`) kuchaytirish emas, vendor demo ham 20 beradi.

**Muhim (SDK bytecode'idan o'qilgan, 2026-11-10):**

- SDK paketni allaqachon ishorali butun songa aylantirib beradi. Uni `VpSpGetUtil.getECGType()` dagi turga qarab parse qiladi (16/18/21/24 bit).
- `convertToMvWithValue` formulasi turga bog'liq:

| `ecgType` | Natija |
|---|---|
| 1, 3 | **qiymat o'zgarmaydi**, ya'ni mV emas, xom birlik |
| 2 | `v·1000 / (gain·131072)` |
| 4, 7, 8, 11 | `v·1000·1.8 / 167772160` |
| 5, 6 | `v·0.8·0.001` |
| 9 | `v·1000·1.2 / 44040192` |
| 10, 12, 14 | `v·1000·1.2 / (gain·2097152)` |
| 13, boshqa | 0 |

- uni-app JS SDK (`synapse-soat/src/vendor/veepoo`) ham xuddi shu formulalarni ishlatadi.
- **E500 amalda xom birlikda beradi.** Qiymatlar mV dan yuzlab-minglab marta katta. Shuning uchun chizishda balandlik signalga moslanadi (4-bo'lim). Haqiqiy mV koeffitsienti hali noma'lum (8-bo'lim).

### Bluetooth uzilsa

Bluetooth o'chirilsa, `onBluetoothOff()` ulanishni uzadi. JS tomondagi o'lchov xato bilan tugaydi.

---

## 2. O'lchov oqimi (JS)

Fayl: [measure.ts](../src/shared/watch/measure.ts), `case "ecg"`. Andoza `synapse-soat` dagi `session.ts → measureEcg`.

1. `new EcgTrace()` yaratiladi va `setLiveEcg(trace)` chaqiriladi. Shu paytdan Home'da jonli chiziq ko'rinadi.
2. Hodisalar:
   - `ecgInfo` kelsa, `trace.setReportedRates(drawFrequency, frequency)` chaqiriladi.
   - `ecgWave` kelsa, `trace.push(mv)` chaqiriladi. Diagnostika uchun `trace.adc` va `trace.ecgType` ham yoziladi.
   - `ecg` (holat) da quyidagilar kuzatiladi:
     - elektrod aloqasi (`wear == 0`);
     - uzilishlar soni;
     - soatning band/zaryad holati;
     - `progress`. U Home'dagi doira chegarasida ko'rsatiladi.
   - `ecg` dataType 2 yoki `ecgResult` kelsa, to'liq natija 3 s kutiladi. dataType 4 kelsa, soat o'zi tugatgan bo'ladi va to'xtatish buyrug'i yuborilmaydi.
3. Chegara va xatolar:

| Shart | Natija |
|---|---|
| 15 s hech qanday paket yo'q (`ECG_IDLE_MS`) | `ecgNoData` |
| 15 s ketma-ket barmoq tegmagan (`ECG_NO_CONTACT_S`) | `ecgNoContact` |
| Barmoq 4 martadan ko'p ko'tarilgan | `ecgLeadOff` |
| Soat 3 holat ketma-ket band / zaryadda / batareya past | `busy` / `charging` / `lowBattery` |
| `progress` 100% bo'lgach 5 s ichida natija kelmasa | Bor natija bilan yakunlanadi |
| Umumiy chegara 180 s (`ECG_MAX_MS`) | Yakunlanadi |

4. Yakun: `trace.finish()` chaqiriladi va chastota qotadi. So'ng natija yig'iladi:
   - puls: soat natijasi, bo'lmasa `hr1` medianasi;
   - min/maks puls, RR, QT, QTc, HRV, nafas;
   - aloqa foizi, uzilishlar soni;
   - to'lqin (`trace.samples`, 0.001 gacha yaxlitlangan).
5. [use-measurement.ts](../src/features/home/hooks/use-measurement.ts) yozuvni `saveEcgRecord` bilan saqlaydi.
6. Har o'lchovdan keyin, muvaffaqiyatsiz bo'lsa ham, `saveEcgDebug(trace)` xom ma'lumotni saqlaydi (7-bo'lim).

---

## 3. Signal ishlovi: `EcgTrace`

Fayl: [ecg-trace.ts](../src/shared/watch/ecg-trace.ts).

- **Filtrlar** kardiomonitorlardagi "monitor" rejimidagidek, har bir namunaga kelishi bilan qo'llanadi:
  - 0.5 Hz yuqori chastotali (1-tartib RC). Nafas va qo'l harakatidan chiziq siljimaydi, izoliniya 0 atrofida turadi.
  - 50 Hz notch (RBJ biquad, Q=25). Elektr tarmog'i shovqinini olib tashlaydi.
  - 40 Hz past chastotali (RBJ biquad). Mushak titrashini olib tashlaydi.
- **Chastota.** Paketlar kelish tezligidan hisoblanadi (birinchi 2 s dan keyin). Soat aytgan chastotaga 15% ichida yaqin bo'lsa, o'shanga tenglanadi. Undan oldin soat aytgan birinchi chastota, u ham bo'lmasa 250 Hz olinadi. `finish()` dan keyin chastota qotadi.
- `samples` filtrlangan, `raw` filtrsiz, `adc` esa xom qiymatlar. `packets` har paketning vaqti va hajmi. Oxirgi uchtasi faqat diagnostika uchun.

---

## 4. Chizish: lenta

Asosiy fayllar:
- [EcgSweep.tsx](../src/features/ecg/components/EcgSweep.tsx): bitta lenta komponenti;
- [ecg-geometry.ts](../src/features/ecg/lib/ecg-geometry.ts): mm hisoblari.

**Jonli chiziq (Home) va hisobotdagi qayta o'ynatish bitta komponentdan chiziladi**, shuning uchun bir xil ko'rinadi:

- Oq fon, kulrang katak (kichik 1 mm, katta 5 mm), ingichka qizil chiziq. Soatning rasmiy ilovasi (QWatch) uslubida.
- 25 mm/s. Ekranda 3 s lik oyna (`SWEEP_WINDOW_S`) ekran kengligiga sig'adi.
- "Sweep": yozuvchi chapdan o'ngga yuradi, oxiriga yetgach boshidan, eski yozuv ustidan yozadi. Yozuvchi oldida 0.15 s bo'sh joy qoladi (`sweepTrace`).
- Ekran nuqtasiga ~2 ta nuqta chiziladi: har bo'lakdan min va maks olinadi, shuning uchun QRS cho'qqilari yo'qolmaydi (`tracePoints`).
- Signal teskari bo'lsa (soat o'ng qo'lda), ag'darib ko'rsatiladi (`sign`, 5-bo'lim).

### Kuchaytirish (balandlik)

Masshtab `sweepGain(samples, sign)` → `gainFor(low, high)` bilan tanlanadi. `low`/`high` — chetdagi 0.5% nuqtalarsiz chegaralar (`robustRange`).

1. Signal mV da va lentaga sig'sa, standart kuchaytirish olinadi: 10 mm/mV (juda past signalda 20, kattada 5 yoki 2.5). Chapda 1 mV kalibrlash impulsi chiziladi, ostida "10 mm/mV" yoziladi.
2. 2.5 mm/mV da ham sig'masa, qiymat mV bo'lishi mumkin emas (bilakdagi EKG 0.3–2 mV), ya'ni soat xom birlikda bergan. Bu holatda:
   - balandlik lentaga moslanadi (75% zaxira bilan);
   - kalibrlash impulsi **chizilmaydi**;
   - yozuv "avto masshtab" bo'ladi, hisobot ostida esa "амплитуда подогнана под экран".
   `isCalibratedGain(gain)` qaysi holat ekanini aytadi.

Nega bunday: avval kuchaytirish faqat 2.5/5/10/20 dan tanlanardi. Xom birlikdagi signal lentadan chiqib, yuqori va pastki chetda kesilardi va chiziq "to'rtburchak" bo'lib ko'rinardi.

### Jonli chiziq (Home)

Fayl: [EcgLiveStrip.tsx](../src/features/ecg/components/EcgLiveStrip.tsx).

- Namunalar React holatidan tashqarida (`EcgTrace`) to'planadi. Komponent har 40 ms da kadr chizadi.
- **Bir tekis yurish.** Soat paketlarni soniyasiga ~4 marta (~0.25 s lik) yuboradi. Yozuvchi kelgan ma'lumotdan 0.5 s orqada, haqiqiy tezlikda yuradi (`LAG_S`), shuning uchun paket kelganda chiziq sakramaydi. Ma'lumot tugab qolsa, to'xtab turadi va yana 0.5 s yig'ilgach davom etadi. 2 s dan ko'p orqada qolsa, oldinga sakraydi.
- **Kuchaytirish** soniyada bir marta shu paytgacha yozilgan hammasidan hisoblanadi (`sweepGain`, hisobot bilan bir xil). U faqat 15% dan ko'p farq qilsa yangilanadi.
- **Puls** oxirgi 8 s tahlilidan olinadi (`analyzeEcg`), soniyada bir marta yangilanadi.
- **Qutblanish:** 5 ta urish topilgach bir marta qotiriladi.
- **Bosilganda:**
  - mV rejimida 5 → 10 → 20 mm/mV;
  - avto masshtabda x1 → x2 → x0.5.
- Har yangi o'lchov yangi komponent (`key={trace.id}`), shuning uchun holat boshidan boshlanadi.

---

## 5. Tahlil (ilova tomonida, taxminiy)

Fayl: [ecg-analysis.ts](../src/features/ecg/lib/ecg-analysis.ts). Natija tashxis emas.

- **R tishlari:** Pan-Tompkins g'oyasidan foydalaniladi. Bosqichlari:
  1. hosila;
  2. kvadrat;
  3. 150 ms oyna;
  4. har 5 s blokda `0.3·p98` chegara.

  250 ms refrakter davr qo'llanadi. T to'lqini R deb olinmaydi.
- **Ritm muntazamligi:** RR larning kamida 60% i medianadan ±20% ichida bo'lishi kerak. Aks holda urishlar qaytarilmaydi, ya'ni shovqindan soxta puls chiqmaydi.
- **Qutblanish:** pastga og'ish yuqoriga og'ishdan 1.5 barobar katta bo'lsa, signal ag'dariladi.
- **O'rtacha kompleks:** muntazam urishlar R bo'yicha tekislanadi va har nuqtada mediana olinadi.
- **Nuqtalar va intervallar:**
  - izoliniya PR segmentining eng tekis oynasidan olinadi;
  - QRS boshi va J nuqtasi;
  - T oxiri urinma usuli bilan topiladi;
  - P to'lqini;
  - PR, QRS, QT, QTc (Bazett formulasi bo'yicha).

Chegaralar asosan nisbiy (R amplitudasiga nisbatan), shuning uchun avto masshtabda ham ishlaydi. Puls va intervallar (ms) masshtabga bog'liq emas.

---

## 6. Saqlash va hisobot

**Saqlash.** Fayl: [ecg-records.ts](../src/features/ecg/lib/ecg-records.ts).
- To'lqin `Paths.document/ecg/<id>.json` faylida saqlanadi.
- Qisqa ro'yxat AsyncStorage'da turadi (`ecg.index.v1`).
- Ko'pi bilan 50 ta yozuv saqlanadi, eskilari fayli bilan o'chiriladi.

**Ochish.** History sahifasida EKG kartasi bosilsa, `EcgRecordsSheet` ochiladi ([EcgRecordsSheet.tsx](../src/features/ecg/components/EcgRecordsSheet.tsx)). U `CusBottomSheet` da avval yozuvlar ro'yxatini, yozuv tanlangach esa hisobotni ko'rsatadi. Home'dagi "EKG yozuvlari" tugmasi `/history?metric=ecg` ga olib boradi.

**Hisobot.** Fayl: [EcgReportView.tsx](../src/features/ecg/components/EcgReportView.tsx). Hisobot shifokor uchun, shuning uchun ilova tilidan qat'i nazar rus tilida (`reportT`). Tartibi:
1. Puls / QT / HRV yorliqlari.
2. **Pleyer** ([EcgPlayer.tsx](../src/features/ecg/components/EcgPlayer.tsx)): yozuvni QWatch kabi qayta o'ynatadi. Tugmalar: qayta boshlash, play/pause, tezlik x1/x2/x4. Lenta jonli chiziq bilan bir xil (`EcgSweep`).
3. Sarlavha: bemor (profildan), sana, qurilma, Lead I.
4. Soat o'lchovlari.
5. O'rtacha kompleks rasmi ([EcgBeatFigure.tsx](../src/features/ecg/components/EcgBeatFigure.tsx)): P Q R S T va PR/QRS/QT qavslari, avto intervallar.
6. Masshtab izohi va ogohlantirish matni.

**Android xotirasi (muhim).** `react-native-svg` har bir `<Svg>` uchun o'z o'lchamidagi bitmap yaratadi. Juda baland rasm `OutOfMemoryError` bilan ilovani yopadi. Shuning uchun:
- o'rtacha kompleks rasmi 340×420 dp bilan cheklangan, to'lqin balandligi esa ≤ 30 mm;
- lentalar faqat ekran kengligida chiziladi;
- har bir yo'l `safePath` dan o'tadi: NaN yoki Infinity bo'lsa, native qism xato tashlab ilovani yopardi.

---

## 7. Diagnostika

- **Xom ma'lumot:** dev panelda "EKG xom ma'lumotini ulashish" tugmasi bor. U oxirgi o'lchovning `Paths.document/ecg-debug-last.json` faylini ulashadi (`saveEcgDebug`, [ecg-debug.ts](../src/shared/watch/ecg-debug.ts)). Faylda:
  - `reportedRates`, `rate`, `ecgType`;
  - `packets` (vaqt, hajm);
  - `adc` (xom), `raw` (filtrsiz), `filtered`.
- **Jurnal:** har 20-paketda `[ecgWave] n=.. mV min..max ecgType=.. powerSize=..` yoziladi, adc oralig'i ham.
- **Sintetik tekshiruv** (2026-11-10): sun'iy EKG oddiy mV da, ×1000 va ×50000 birlikda filtr va masshtabdan o'tkazildi.
  - Kesilish 5000 nuqtadan 0–7 ta bo'ldi (faqat R uchlari).
  - Puls 70, QT ~360 ms. Bu qiymatlar birlikka bog'liq emas.

---

## 8. Ochiq masalalar

- **Haqiqiy mV koeffitsienti.** E500 ning `ecgType` qiymati va xom ADC dan mV formulasini topish kerak. Buning uchun xom ADC yuboradigan build (`adc` maydoni) va debug JSON kerak. Topilsa, lenta yana standart mm/mV va kalibrlash impulsi bilan chiziladi.
- **Jonli chiziq boshida:** qutblanish qotguncha (taxminan 5–8 s) teskari signal ag'darilmagan ko'rinadi. Hisobot esa butun yozuvdan aniqlangani uchun boshidanoq to'g'ri.
- **Birinchi ~2 s:** soat aytgan chastota noto'g'ri bo'lsa, chiziq biroz tutilib yuradi, keyin to'g'rilanadi.
- **Ritm va kasallik tahlili** Veepoo'ning pullik funksiyasi, shuning uchun qilinmagan.
- **iOS** qismi sinalmagan.

---

## 9. Fayllar xaritasi

| Fayl | Vazifasi |
|---|---|
| `modules/veepoo-watch/android/.../WatchController.kt` | SDK chaqiruvlari, ADC → mV, hodisalar |
| `src/shared/watch/measure.ts` | O'lchov oqimi, taymerlar, xatolar, natija |
| `src/shared/watch/ecg-trace.ts` | Filtrlar, chastota, jonli trace (`setLiveEcg`) |
| `src/shared/watch/ecg-debug.ts` | Debug JSON saqlash/ulashish |
| `src/features/ecg/lib/ecg-geometry.ts` | mm geometriyasi, katak, kuchaytirish, `sweepTrace` |
| `src/features/ecg/lib/ecg-analysis.ts` | R tishlari, puls, qutblanish, o'rtacha kompleks, intervallar |
| `src/features/ecg/lib/ecg-beat-figure.ts` | O'rtacha kompleks rasmi geometriyasi |
| `src/features/ecg/lib/ecg-report.ts` | Hisobot qatorlari, rus tilidagi matn |
| `src/features/ecg/lib/ecg-records.ts` | Yozuvlarni saqlash/o'qish |
| `src/features/ecg/components/EcgSweep.tsx` | Umumiy lenta (jonli + pleyer), `sweepGain` |
| `src/features/ecg/components/EcgLiveStrip.tsx` | Home'dagi jonli chiziq |
| `src/features/ecg/components/EcgPlayer.tsx` | Hisobotdagi qayta o'ynatish |
| `src/features/ecg/components/EcgReportView.tsx` | Hisobot sahifasi |
| `src/features/ecg/components/EcgRecordsSheet.tsx` | History'dagi bottom sheet (ro'yxat → hisobot) |
| `src/features/ecg/components/EcgBeatFigure.tsx` | O'rtacha kompleks rasmi |
