# Qo'ng'iroqlarni soatga uzatish

Holat (2026-11-12): sinov tugmalari soatda ishladi (qo'ng'iroq oynasi chiqdi, tugmalar `phoneControl` bo'lib keldi).
Haqiqiy qo'ng'iroqlar uchun kalit yozildi, **soatda sinalmagan**.

## Qayerda

- UI: "Soat" sahifasi (`/watch`) → "Qo'ng'iroqlar soatda" kartasi (`src/features/watch/components/call-forward-card.tsx`).
- JS: `src/shared/watch/call-forward.ts` — ruxsatlar, kalit, holat.
- Native: `CallBridge.kt` (telefon holati, tugmalar), `WatchController.kt` ("qo'ng'iroq" bo'limi).
- Sinov tugmalari: dev panel → "Qo'ng'iroq (sinov)".

## Oqim

1. Kalit yoqilganda JS ruxsat so'raydi: `READ_PHONE_STATE` (majburiy), `READ_CALL_LOG`, `READ_CONTACTS`,
   `ANSWER_PHONE_CALLS` (ixtiyoriy). Kalit native `SharedPreferences` da saqlanadi, soatdagi qo'ng'iroq kaliti ham yoqiladi.
2. Telefon: `PHONE_STATE` broadcast (dinamik ro'yxat, ilova jarayoni tirik bo'lganda).
   - `RINGING` → soatga `sendSocialMsgContent(ContentPhoneSetting(PHONE, ism, raqam))`. Ism kontaktlardan
     (`PhoneLookup`), bo'lmasa raqam, raqam ham bo'lmasa "Noma'lum raqam".
   - Android 9+ broadcast ikki marta keladi (raqamsiz va raqamli): raqamsizida 800 ms kutiladi.
   - `OFFHOOK` / `IDLE` → `offhookOrIdlePhone` (soat qo'ng'iroq oynasini yopadi).
3. Soatdagi tugmalar (`settingPhoneListener`, ulanishda o'rnatiladi):
   - `rejectPhone` → `TelecomManager.endCall()` (Android 9+, `ANSWER_PHONE_CALLS`);
   - `cliencePhone` (ovozsiz) → `STREAM_RING` ni `ADJUST_MUTE`, qo'ng'iroq tugagach qaytariladi;
   - `appAnswerCall` → `acceptRingingCall()`.
   Natija `callAction {action, ok}` hodisasida (jurnal).

## Cheklovlar [?]

- **Ilova butunlay yopilsa ishlamaydi**: o'z foreground servisimiz hali yo'q, BLE ulanish ham jarayon bilan birga
  yo'qoladi. Kerak bo'lsa: `connectedDevice` foreground servis + manifestdagi `PHONE_STATE` qabul qilgich.
- Play Market: `READ_CALL_LOG` cheklangan ruxsat (deklaratsiya kerak). Do'konga chiqishda raqamsiz variant yoki
  `CallScreeningService` ni ko'rib chiqish.
- Ba'zi telefonlarda "Bezovta qilmang" ruxsatisiz ovozni o'chirib bo'lmaydi (`callAction ok: false`).
- Kontaktlarni soatga yozish (`addContact`, SOS) hali qilinmagan.
