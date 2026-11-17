# Uyqu

Holat (2026-11-16): yozildi, **soatda sinalmagan** (native o'zgarish: yangi build kerak).

## Manba (SDK)

- Native `readSleep` → `readSleepData(w, ISleepDataListener, watchDays)`. Har bo'lak uchun `onSleepDataChange(day, SleepData)`,
  oxirida `onReadSleepComplete`. Hodisa `sleepData`: `{records: [...]}` va `{complete}`.
- Soatda aniq uyqu bo'lsa obyekt `SleepPrecisionData` (`precise: true`). Imkoniyat belgisi `features.precisionSleep`
  (`FunctionDeviceSupportData.precisionSleep`, `DeviceFunctionPackage2.precisionSleepFunction`).
- `sleepLine` (Veepoo hujjati): oddiy uyquda belgi = 5 daqiqa, `0` yengil, `1` chuqur, `2` uyg'oq. Aniq uyquda belgi =
  `onePointDuration` soniya (60), `0` chuqur, `1` yengil, `2` REM, `3` uyqusizlik, `4` uyg'oq (ilovada 3 va 4 "uyg'oq").
- Imzolar AAR bytecode'idan tekshirilgan (`vpprotocol-2.3.95.15`). `sleepLine` ma'nosi faqat hujjatdan.

## Ilovada

- `src/features/sleep/api/sleep.ts`: o'girish (`toSegment`, `decodeLine`), kechalarga birlashtirish (uyg'ongan kun bo'yicha),
  saqlash `sleep.segments.v1` (90 kun), `syncSleep`.
- `src/shared/watch/watch-queue.ts`: uzun o'qishlar (tarix sinxroni, uyqu) ketma-ket. Qulf band bo'lsa bugungi qadam o'qilmaydi.
- Home: "Uyqu" kartasi (oxirgi kecha, sifat, bosqichlar chizig'i) → `/history/sleep`.
- `/history/sleep`: kecha tanlash, davomiylik va maqsad, uxlash/turish vaqti, gipnogramma, bosqichlar, aniq uyqu ballari,
  uyqudagi puls/SpO₂ (avto-o'lchovlardan), 7/30 kunlik grafik va o'rtachalar.
- History ro'yxatida "Uyqu" kartasi (7 kun). Pastga tortish tarix va uyquni ketma-ket yangilaydi.
- Sifat bahosi ilovaniki: maqsadning 90%+ va chuqur uyqu 15%+ = yaxshi, 70% dan kam yoki chuqur 8% dan kam = yomon.

## Soatda tekshirish

Diagnostika jurnalida har bo'lak: `[sleep] oddiy|aniq all= deep= light= wake= q= line=<uzunlik> pt= <davomiylik> daq`.
- `line` uzunligi × 5 (oddiy) yoki × 1 (aniq) ≈ uxlash–turish oralig'i bo'lishi kerak. Bo'lmasa kodlash taxmini noto'g'ri.
- Gipnogrammadagi chuqur/yengil ulushi soatning `deep`/`light` daqiqalariga mos kelishi kerak (0 va 1 o'rni almashmaganini tekshirish).
- `q` (soatning bahosi) oralig'i: hozircha ko'rsatilmaydi.
