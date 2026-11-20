# iOS: tuzatish rejasi (Mac + Xcode)

Sana: 2026-11-20. Bu reja Mac'da Xcode bilan ishlaydigan dasturchi uchun yozilgan.
Holat: iPhone'da ilova ishga tushdi, lekin 4 ta muammo bor (pastda). Android'da hammasi ishlaydi.

Umumiy iOS hujjatlari:
- [ios-plan.md](ios-plan.md): bosqichlar va qarorlar.
- [ios-mapping.md](ios-mapping.md): Android ↔ iOS SDK moslik jadvali.

Asosiy qoidalar:
- **JS bir xil qolishi kerak.** iOS native qismi JS'ga Android bilan bir xil nomli hodisalar va maydonlarni beradi.
  Shuning uchun tuzatish iloji boricha Swift'da qilinadi. JS'ni faqat iOS'ning tabiatan sekinroq javobini kutish
  uchun o'zgartiring va Android xatti-harakatini o'zgartirmang.
- **Tayyor topilmalar:** quyidagi "Taxmin" bandlari koddan topilgan ehtimoliy sabablar. Ular telefonda
  tasdiqlanmagan. Avval konsol yozuvlari bilan tasdiqlang, keyin tuzating.
- **Build:** EAS build (`eas build`) faqat loyiha egasidan so'rab, ruxsat olgandan keyin ishga tushiriladi
  (CLAUDE.md). Mac'dagi Xcode build'i bu cheklovga kirmaydi: u bulutdagi limitni sarflamaydi.


## 0. Tayyorgarlik (Mac)

```bash
git pull
npm ci
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
open ios/*.xcworkspace
```

- Xcode: Signing & Capabilities → o'z Apple ID'ingiz (Personal Team) tanlanadi.
- Build target: ulangan iPhone. SDK freymvorklarida simulyator qismi yo'q, shuning uchun simulyator build'i
  yig'ilmaydi.
- JS'ni tez almashtirish uchun Metro'ni ishga tushiring: `npx expo start --dev-client`. Shunda JS o'zgarishlari
  qayta build'siz yangilanadi. Swift o'zgarganda Xcode'da qayta Run qiling.
- Diagnostika ikki joyda:
  - **Ilova ichidagi konsol:** chap pastdagi `>_` tugmasi. Native `log`/`error` hodisalari, `[sync]`, `[sleep]`,
    `[device]` qatorlari shu yerga tushadi. "Ulashish" tugmasi hamma yozuvni matn qilib beradi.
  - **Xcode konsoli:** Swift `print` / `NSLog` yozuvlari va crash'lar.


## 1. Qadamlar, kkal, masofa kelmayapti

**Belgisi:** Home'dagi Qadamlar slaydida `--`. Matn "Soatdan o'qilmoqda…" yoki bo'sh qoladi.

**Yo'l:**
1. JS [activity.ts](../src/features/activity/api/activity.ts), `readTodayActivity()`: `readSteps()` ni chaqiradi va
   `sportStep` hodisasini **6 s** (`READ_TIMEOUT_MS`) kutadi. Javob kelmasa `null` qaytaradi.
2. Swift [WatchController.swift](../modules/veepoo-watch/ios/WatchController.swift), `readSteps()` (~977-qator):
   - avval `veepooSDK_readStepData(withDayNumber: 0)` chaqiriladi;
   - lug'atda `Step` kaliti bo'lmasa, SDK bazasidan o'qiydi: `veepooSDKGetStepData`.

**Taxminlar** (ehtimoli yuqoridan pastga):
1. **Baza bo'sh.** Zaxira yo'l SDK bazasidan o'qiydi, lekin `readSteps()` bazani to'ldiradigan `syncAllData`
   (`veepooSdkStartReadDeviceAllData`) ni **chaqirmaydi**. `readSleep()` esa chaqiradi. Ilova yangi ochilganda
   baza bo'sh bo'ladi, hodisa chiqmaydi va JS 6 s dan keyin taslim bo'ladi.
2. **Kalit nomlari boshqacha.** `Step` / `Cal` / `Dis` kalit nomlari taxmin, kodda `[?]` belgisi bor.
   SDK boshqa nom (`step`, `steps`, `calories`, ...) yoki string qiymat qaytarsa, `int(dict["Step"])` nil bo'ladi.
3. **Javob kelmaydi.** `veepooSDK_readStepData` callback'i umuman chaqirilmaydi: masalan, soat bu buyruqni
   qo'llamaydi yoki `tableID` hali nil.

**Vazifalar:**
- [ ] `readSteps()` ga vaqtinchalik `log(...)` qo'shing:
  - `veepooSDK_readStepData` qaytargan `dict` ni to'liq yozing (kalitlar va qiymat turlari);
  - `tableID` qiymatini yozing;
  - bazadan qaytgan `stepDict` ni yozing.
- [ ] Haqiqiy kalit nomlarini konsoldan aniqlab, `emitSteps` ni tuzating. String qiymatlarni ham qabul qilsin.
- [ ] `stepDict` bo'sh bo'lsa: zaxira yo'ldan oldin `syncAllData { _ in ... }` ni chaqiring.
  `syncAllData` 60 s ichida qayta sinxron qilmaydi, shuning uchun bu arzon.
- [ ] Sinxron uzoq bo'lsa, JS 6 s da taslim bo'ladi. Ikki yo'l bor, ikkinchisi afzal:
  - JS'da faqat iOS uchun `READ_TIMEOUT_MS` ni oshirish;
  - Swift'da avval bazadagi eski qiymatni darhol `sportStep` qilib yuborish, sinxron tugagach yangisini yana
    yuborish. JS keyingi daqiqalik so'rovda yangisini oladi.
- [ ] `syncPersonInfo` muvaffaqiyatli o'tayaptimi, tekshiring. Soat kkal va km'ni bo'y, vazn va yoshdan hisoblaydi:
  ular yetmasa qadam keladi, lekin kkal va km 0 bo'ladi.
- [ ] Tekshiruv: soatda qadam bor (soat ekranida ko'rinadi). Ilovada 1 daqiqa ichida slaydda xuddi shu son,
  kkal va km chiqadi. Tarix → Qadamlar sahifasi ham to'ladi.


## 2. Uyqu ma'lumoti kelmayapti

**Belgisi:** Uyqu slaydida "ma'lumot yo'q" yoki o'qilmoqda. Tarix → Uyqu bo'sh.

**Yo'l:**
1. JS [sleep.ts](../src/features/sleep/api/sleep.ts), `readFromWatch()` / `syncSleep()`: `readSleep()` ni
   chaqiradi va `sleepData` hodisalarini kutadi.
   - `IDLE_MS = 10 s`: shuncha vaqt **hech qanday** hodisa kelmasa, kutish tugaydi. Hech narsa eshitilmagan
     bo'lsa natija "failed" bo'ladi.
   - `MAX_MS = 60 s`: umumiy chegara.
2. Swift `readSleep()` (~1000-qator): avval `syncAllData` (`veepooSdkStartReadDeviceAllData`, **120 s gacha**),
   keyin bazadan kun bo'yicha o'qiydi va `sleepData {records}`, oxirida `{complete: true}` yuboradi.

**Taxminlar:**
1. **Vaqt mos emas (eng ehtimolli).** Sinxron davomida Swift JS'ga hech qanday `sleepData` hodisasi
   yubormaydi. Sinxron 10 s dan uzoq davom etsa, JS `IDLE_MS` bo'yicha "failed / noReply" deb to'xtaydi.
   Natija keyin kelsa ham, uni hech kim tinglamaydi.
2. **Uyqu turi noto'g'ri aniqlanadi.** `kvc(model, "sleepType")` kaliti noto'g'ri bo'lishi mumkin. Shunda aniq
   uyqu (`veepooSDKGetAccurateSleepData`) o'rniga oddiy uyqu o'qiladi yoki aksincha, natija bo'sh chiqadi.
3. **Vaqt formati.** `down` / `up` vaqti `timeMap()` orqali yasaladi, u kamida 5 ta son kutadi. SDK vaqtni
   faqat `HH:mm` qilib bersa, `timeMap` nil qaytaradi, JS `toSegment` esa yozuvni "yaroqsiz" deb tashlaydi.
   Konsolda `[sleep] ... yaroqsiz` qatori chiqadi.
4. **Kun noto'g'ri.** `watchDays` (`model.saveDays`) 0 yoki noto'g'ri bo'lsa, faqat 3 kun o'qiladi. Bu kamroq
   ehtimol.

**Vazifalar:**
- [ ] Konsolni oching va Uyqu'ni yangilang. Qaysi yozuvlar chiqishini qayd qiling:
  - `[sync] soatdan kunlik ma'lumot o'qilmoqda`;
  - `[sync] ... tugamadi`;
  - `[sleep] aniq/oddiy all=... line=...`;
  - `[sleep] soat javob bermadi`.
- [ ] 1-taxmin uchun tuzatish: Swift sinxron davomida JS'ga "tirikman" belgisini yuborsin. Masalan,
  `veepooSdkStartReadDeviceAllData` progress callback'ida har ~2 s da `emitData("sleepData", ["progress": p])`.
  JS bu hodisani `touch()` qiladi va `records` yo'qligi uchun hech narsa qo'shmaydi. Shunda JS o'zgarmaydi,
  chunki u `records` siz hodisani e'tiborsiz qoldiradi va `IDLE_MS` taymeri qayta boshlanadi.
  - `MAX_MS = 60 s` ham kamlik qilishi mumkin. U holda iOS uchun sinxronni avvalroq boshlang: ulanishdan keyin
    fonda `syncAllData` ni bir marta chaqiring. Shunda `readSleep` 60 s lik keshdan tez o'tadi.
- [ ] Bitta aniq uyqu yozuvini (`VPAccurateSleepModel`) Xcode konsoliga to'liq chiqaring:
  - `sleepTime`, `wakeTime` formatini va `timeMap` natijasini tekshiring;
  - `parseSleepLine()` natijasini va `line` uzunligini tekshiring.
- [ ] `sleepType` kaliti haqiqatan `VPPeripheralModel` da bormi: SDK sarlavha fayllarini (`.h`) qarang.
- [ ] Tekshiruv: soat kecha uyquni yozgan (soat ekranida ko'rinadi). Ilovada Uyqu slaydi davomiylik, vaqt va
  bosqichlarni ko'rsatadi. Tarix → Uyqu'da gipnogramma chiqadi.


## 3. O'lchash doirasi silliq aylanmayapti

**Belgisi:** o'lchov sahifasida "Boshlash" bosilgandan keyin doiradagi yoy va mil sakrab-sakrab yoki qotib
harakatlanadi.

**Yo'l:** [measure-circle.tsx](../src/features/home/components/measure-circle.tsx) (Reanimated 4):
- `fill`: har yangi `progress` kelganda `withTiming(progress, 1000 ms)` (`STEP_MS`);
- `spin`: foiz yo'q paytda `withRepeat(withTiming(360, 2400 ms))`;
- mil: `useAnimatedStyle` ichidagi `rotate`.

Foiz qayerdan keladi ([measure.ts](../src/shared/watch/measure.ts)):
- puls va SpO2: JS taymeri **har 250 ms** da;
- harorat, shakar, qon, EKG: soatdan kelgan foiz, ba'zan juda siyrak.

**Taxminlar:**
1. **Animatsiya qayta boshlanadi.** Har 250 ms da yangi 1000 ms lik `withTiming` boshlanadi va oldingisini
   bekor qiladi. Natijada yoy hech qachon belgilangan tezlikka chiqmaydi va "tutilib" harakatlanadi. Android'da
   bu kamroq sezilishi mumkin.
2. **JS oqimi band.** Swift har hodisada `emitData` qiladi. EKG paytida bu soniyasiga o'nlab hodisa bo'ladi va
   JS oqimini band qiladi. Reanimated animatsiyasi UI oqimida ishlaydi, lekin `progress` qiymati JS orqali
   keladi va kechikadi.
3. **Mil ko'rinmay qoladi.** `waiting` / `spin` almashinuvida `cancelAnimation(spin)` milni joyida qoldiradi va
   keyingi `fill * 360` ga sakrab o'tadi.
4. **Debug rejimining sekinligi.** Debug build'da JS sekinroq. Release build'da ham sinab ko'ring:
   Xcode → Edit Scheme → Run → Build Configuration: **Release**.

**Vazifalar:**
- [ ] Avval Release build'da tekshiring. U yerda silliq bo'lsa, muammo faqat debug rejimida va jiddiy emas.
- [ ] 1-taxmin uchun tuzatish: `fill` animatsiyasining davomiyligini yangilanish oralig'iga tenglang (250 ms).
  Yaxshiroq yo'l: puls va SpO2 kabi vaqtga bog'liq o'lchovlarda `fill` ni bir marta
  `withTiming(1, { duration: HR_MS })` bilan boshlang va har 250 ms da yangilamang. Buning uchun
  `MeasureCircle` ga "kutilayotgan umumiy vaqt" prop'i kerak. Android'da ham sinab ko'ring, chunki bu umumiy kod.
- [ ] Xcode Instruments → **Time Profiler** (yoki React Native Perf Monitor) bilan o'lchash paytida JS va UI
  oqimlarining FPS'ini qarang.
- [ ] EKG paytida native hodisalar sonini kamaytirish kerakmi, ko'ring: `ecgWave` paketlarini Swift'da 100 ms
  oralig'ida birlashtirib yuborish.
- [ ] Tekshiruv: puls o'lchovida yoy 0 dan 100% gacha bir tekis to'ladi. Foiz kelmagan paytda mil bir tekis
  aylanadi.


## 4. Yangi UI'lar: iOS'da va SDK bilan ishlashini tekshirish

2026-11-20 da quyidagilar qo'shildi (faqat JS, Android'da tekshirilgan):

| Nima | Fayl |
|---|---|
| Kartalar: gradient fon, me'yor chizig'i, chorlov matni | `src/components/ui/CusHealthCard.tsx`, `src/features/home/components/metric-selector.tsx`, `range-bar.tsx`, `constants/metric-card.ts` |
| Home tabi endi Stack: `(home)/index` → `(home)/measure/[metric]` | `src/app/(app)/(home)/_layout.tsx`, `src/widgets/app-tabs/AppTabs.tsx` (`name: "(home)"`) |
| O'lchov sahifasi: "‹ Orqaga", nom doira tepasida, doira, bugungi ro'yxat | `src/features/home/FeatureMeasure.tsx`, `src/components/ui/CusPageHeader.tsx` (sarlavhasiz variant) |
| Qadamlar va Uyqu slayderi (gorizontal `FlatList`, nuqtalar) | `src/features/home/components/activity-slider.tsx`, `steps-slide.tsx`, `src/features/sleep/components/sleep-slide.tsx` |
| Natija saqlanganda Home kartalari yangilanadi | `src/features/home/lib/readings.ts` (`notifyReadings`), `hooks/use-measurement.ts` |
| Konsol yozuvlari render'dan keyin yangilanadi | `src/shared/debug/debug-log.ts` (`scheduleNotify`) |
| NativeWind `darkMode: "class"` (web xatosi uchun) | `tailwind.config.js` |

**iOS UI tekshiruvi:**
- [ ] **Home:**
  - kartalar 2 ustunda, bir xil kenglikda;
  - gradient fon kartani to'liq qoplaydi;
  - "info" belgisi tafsilot oynasini ochadi.
- [ ] **Slayder:**
  - surilganda bitta slaydga to'xtaydi (`snapToInterval`), nuqtalar almashadi;
  - ✎ maqsad oynasini, "?" esa uyqu oynasini ochadi. Ikkalasi ham Modal, iOS'da sheet ko'rinishida ochiladi;
  - slayd bosilganda Tarix → Qadamlar yoki Uyqu sahifasi ochiladi.
- [ ] **O'lchov sahifasi:**
  - "‹ Orqaga" tugmasi va iOS'ning chetdan surish (swipe back) ishorasi kartalarga qaytaradi;
  - tab bar ko'rinib turadi, "Bosh sahifa" tabi aktiv;
  - safe area: yuqori qism (notch / Dynamic Island) ostida qolmaydi.
- [ ] **Tungi rejim:** Sozlamalar → Mavzu (yorug' / qorong'u / tizim) iOS'da ham almashadi. `darkMode: "class"`
  native'ga ta'sir qilmasligi kerak, buni tasdiqlang.
- [ ] **Katta shrift:** iOS Settings → Display & Brightness → Text Size kattalashtirilganda slaydlar va kartalarda
  matn qirqilmaydi. Asosiy foydalanuvchilar 45+ yoshda, ko'pchiligida tizim shrifti katta.

**SDK bilan ishlash tekshiruvi:**
- [ ] Har bir o'lchovni o'lchov sahifasidan boshlang. Natija "Bugun" ro'yxatiga tushishi kerak, orqaga
  qaytilganda esa Home kartasida ko'rinishi kerak:

  | O'lchov | iOS'dagi eslatma |
  |---|---|
  | Puls, SpO2 | — |
  | Harorat | `/10` |
  | EKG | Jonli to'lqin chiqadi |
  | Shakar | `/100` |
  | Qon tahlili | — |
  | Stress | — |
  | Tana tarkibi | — |
  | Nasosli bosim | `CuffBpChannel`; ishlamasa soatda o'lchash zaxirasi |

- [ ] **O'lchash paytida orqaga qaytish:** o'lchov bekor qilinadi (`useMeasurement` unmount → `cancel`). Swift'da
  har o'lchovning `stop...` funksiyasi chaqirilib, soat o'lchovni to'xtatishini tekshiring. Aks holda keyingi
  o'lchov "band" (busy) xatosini beradi.
- [ ] **Ikki tinglovchi bir vaqtda:** Home va o'lchov sahifasi ikkalasi ham `useMeasurement` ni ishlatadi.
  O'lchash faqat sahifada boshlanadi, lekin native hodisalar ikkala tinglovchiga ham boradi. Natija ikki marta
  saqlanmasligini tekshiring: "Bugun" ro'yxatida bitta o'lchov bitta qator bo'lishi kerak.
- [ ] **Rejam rutinasi** o'lchayotgan paytda o'lchov sahifasida "Boshlash" bosilsa, "band" xabari chiqadi.
- [ ] **Slayder ma'lumoti** (1- va 2-bo'limlar tuzatilgandan keyin): ulanishdan keyin 1 daqiqa ichida
  to'ladi. Soat uzilsa, oxirgi saqlangan qiymat qoladi.

**Takomillashtirish** (asosiy ish tugagach, ixtiyoriy):
- [ ] O'lchash ketayotganda "Orqaga" bosilsa: "O'lchov to'xtatilsinmi?" deb so'rash.
- [ ] Doiradagi o'lchash va natija paytida iOS haptic: `expo-haptics`, natijada `notificationAsync(Success)`.
- [ ] Slaydlar balandligi har xil bo'lsa, ularni tenglash: slayder qatorini eng balandiga moslash.


## 5. Ish tartibi va topshirish

1. Har bo'lim uchun alohida commit, xabar o'zbekcha. Masalan: "iOS: qadam o'qishdan oldin sinxron".
   Branch: `feat/watch-measurements` yoki undan yangi branch.
2. Tasdiqlangan topilmani (masalan, haqiqiy kalit nomlari) [ios-mapping.md](ios-mapping.md) ga yozing va koddagi
   `[?]` izohini olib tashlang.
3. Android'ga tegadigan har JS o'zgarishi Android'da ham tekshirilishi kerak. Mac'da Android yo'q bo'lsa, PR
   tavsifida "Android'da tekshirilmagan" deb yozing.
4. Tugagach: `npm run lint` va `npx tsc --noEmit`. EAS build kerak bo'lsa, loyiha egasidan so'rang.
