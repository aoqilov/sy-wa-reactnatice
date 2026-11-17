# Faollik: qadam, kaloriya, masofa

Holat (2026-11-16): 1-bosqich soatda sinaldi, qadam, kkal va masofa to'g'ri ishlaydi.

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

2. Kunlik qadamlar tarixi: yozildi (2026-11-16), soatda sinalmagan. Native kunlik o'qish (`readDaily`) har 5 daqiqalik
   yozuvga `step` / `cal` / `dis` qo'shadi. History sinxroni ularni `src/shared/watch/step-history.ts` ga beradi:
   oxirgi 5 kun 5 daqiqalik (`steps.fine.v1`, vaqt kaliti bilan, shuning uchun takror o'qish zarar qilmaydi), har kun
   jami va 48 ta 30 daqiqalik bo'lak (`steps.days.v1`, 90 kun). Bugungi jami: `readSportStep` va yig'indidan kattasi.
   UI: `/history/steps` (kun, soatma-soat, 7/30 kun, o'rtachalar), History kartasi, qadam halqasida "Batafsil".
   Tekshirish: jurnaldagi `[steps] N ta 5 daqiqalik yozuv`; o'tgan kunning yig'indisi soatdagi kunlik jamiga mos
   kelishi, `cal` kkal va `dis` km ekani (dis > 10 bo'lsa metr deb olinadi).
3. Uyqu: yozildi, [sleep.md](sleep.md).
4. Uzoq o'tirish eslatmasi: `settingLongSeat` (Rejam bo'limi).
5. Mashg'ulot rejimlari: `startMultSportModel(ESportType)` — S105 qo'llashini tekshirish kerak.
