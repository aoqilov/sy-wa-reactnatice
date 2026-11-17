# Tana tarkibi

Holat: kod yozilgan, soatda **sinalmagan** (native qism keyingi APK'da).

## SDK

- O'lchov: `startDetectBodyComponent` → `IBodyComponentDetectListener.onDetectSuccess(BodyComponent)`.
- `BodyComponent` 14 ta qiymat beradi: `BMI`, `bodyFatRate`, `fatRate`, `FFM`, `muscleRate`, `muscleMass`,
  `subcutaneousFat`, `bodyWater`, `waterContent`, `skeletalMuscleRate`, `boneMass`, `proteinProportion`, `proteinMass`,
  `basalMetabolicRate`. Bulardan tashqari `timeBean` va `id`.
- Soatning o'zida o'lchanganlar: `readBodyComponentData(writer, IBodyComponentReadDataListener)` →
  `readBodyComponentDataFinish(List<BodyComponent>?)`. Kotlin interfeysi bo'lgani uchun tinglovchi `Proxy` orqali yozilgan.
- Native: `WatchController.bodyParts` va `readBodyHistory` (hodisa `bodyHistory`).

## Ilovada

- `shared/watch/measure.ts` → `parseBodyParts`: oraliq tekshiruvi; yog' % 60 dan katta bo'lsa hammasi 10 ga bo'linadi.
- `features/body`:
  - natija kartasi (Home va `/history/body`), oddiy matn, ranglarsiz: vazn tarkibi bir qatorda, 4 guruh, har qatorda
    qiymat, me'yor holati va oldingi o'lchovdan farq;
  - Tarix kartasi;
  - `/history/body`: o'lchovlar orasida yurish va barcha o'lchovlar ro'yxati;
  - "?" oynasi.
- Me'yorlar (`lib/norms.ts`) faqat yog' %, teri osti yog'i, suv %, oqsil % va BMI uchun. Mushak, suyak va BMR
  me'yorsiz, faqat qiymat sifatida ko'rsatiladi.
- Soatdagi yozuvlar `body.watch.v1` da saqlanadi. Ilova o'lchovi bilan 3 daqiqa ichida bir xil bo'lsa, ikki marta chiqmaydi.

## Soatda tekshirish

1. Birinchi o'lchovdan keyin natija kartasini tekshiring. Birliklar maydon nomidan taxmin qilingan: `fatRate`,
   `FFM`, `waterContent`, `proteinMass` kg deb olingan, `subcutaneousFat`, `skeletalMuscleRate`, `proteinProportion`
   esa % deb. Qiymat oraliqdan chiqsa (masalan, kg o'rniga %), u kartada ko'rinmaydi.
2. Diagnostika jurnalidagi `[body]` qatorlari, ular `/history/body` ochilganda yoziladi. Ulardan soat o'z
   o'lchovlarini qaytaradimi va qiymatlar qanday ekanini ko'rish mumkin.
