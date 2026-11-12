# CLAUDE.md

Umumiy loyiha qoidalari: [AGENTS.md](AGENTS.md) (Expo, buyruqlar, navigatsiya, EAS). Quyidagilar unga qo'shimcha.

## Build

- **EAS build'ni (`eas build`, `eas update`, `eas submit`) faqat foydalanuvchidan so'rab, ruxsat olgandan keyin ishga tushir.** O'zgarish tayyor bo'lsa, lint va typecheck'dan keyin "build qilaymi?" deb so'ra. "Build qil" deb aytilgandagina boshlanadi.
  Sabab: har bir build bulutdagi build limitidan sarflanadi va ketma-ket build'lar bir-birini eskirtiradi. Foydalanuvchi bir nechta o'zgarishni bitta build'ga yig'ishni xohlaydi.
- Build profili: `preview` (Android APK), akkaunt `organizationn-1` (`app.json` → `owner`; 2026-11-11 dan, `akiylovs-team` ning noyabr limiti tugadi).
