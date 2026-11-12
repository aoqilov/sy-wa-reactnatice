# Faollik: qadam, kaloriya, masofa

Holat (2026-11-12): 1-bosqich yozildi, **soatda sinalmagan**.

## 1-bosqich (qilingan)

- **Home** → o'lchovlar panelining tepasida "Bugungi faollik" kartasi (`src/features/activity/components/activity-card.tsx`):
  qadam halqasi (maqsadga nisbatan), kkal, masofa, maqsadgacha qolgan qadam. "Maqsad" → qadam va uyqu maqsadi oynasi.
- **Soatdan o'qish:** native `readSteps` → SDK `readSportStep` → hodisa `sportStep {step, kcal, dis}` (bugungi jami).
  Ulanganda, har 60 s (ilova oldinda) va ilova oldinga chiqqanda. O'lchov ketayotganda o'qilmaydi (`isMeasuring`).
  Oxirgi bugungi qiymat keshda (`activity.today.v1`), kun almashsa ko'rsatilmaydi.
- **Soatga yuborish:** native `syncPersonInfo` → SDK `syncPersonInfo(PersonInfoData(jins, bo'y, vazn, yosh,
  qadam maqsadi, uyqu maqsadi daq))`. `useWatchPersonSync` (ilova qobig'i): ulanganda (1,5 s kechikib) va profil yoki
  maqsad o'zgarganda. Soat kkal/masofani shundan hisoblaydi; tana tarkibi o'lchovi ham shunga tayanadi.
  SDK xatosi: uyqu maqsadi 0..1440 dan tashqarida bo'lsa qadam maqsadini buzadi — native qiymatlarni chegaralaydi.
- Maqsadlar shu qurilmada (`activity.goals.v1`), standart: 10 000 qadam, 8 soat uyqu.

## Keyingi bosqichlar

2. Soatma-soat grafik va kunlar tarixi: `readOriginData` (tarix sinxroni allaqachon o'qiydi) — `OriginData.stepValue /
   calValue / disValue` (5 daqiqalik) maydonlarini olish kifoya.
3. Uyqu: `readSleepData` → `SleepData` (chuqur/yengil, uyg'onishlar, sifat, `sleepLine`).
4. Uzoq o'tirish eslatmasi: `settingLongSeat` (Rejam bo'limi).
5. Mashg'ulot rejimlari: `startMultSportModel(ESportType)` — S105 qo'llashini tekshirish kerak.
