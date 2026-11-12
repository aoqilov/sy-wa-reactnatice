# Soat siferblati do'koni

Holat (2026-11-11): yozildi, **soatda sinalmagan**. Header'dagi soat tugmasi → "Soat ma'lumotlari" (`/watch`) → "Soatga siferblat qo'yish" → `/watch/dials`.

## Oqim (SDK hujjati, "Watch face function" → "Server watch face")

1. `UiUpdateUtil.isSupportChangeServerUi()`: do'kon qo'llanadimi. Hujjatdagi qo'shimcha shart: `bigTranType == 2 && watchuiServer > 0`.
2. `UiUpdateUtil.getServerWatchUiInfo` → `UIDataServer` (ekran shakli, hozirgi siferblat CRC `imgCrcId`).
3. `UiServerHttpUtil.getThemeInfo(uiDataServer, deviceNumber, deviceTestVersion, appPackName, appVersion)` → `List<TUiTheme>` (`crc`, `name`, `previewUrl`, `fileUrl`, `dialShape`, `fileLenght`, `isAvailable`). Tarmoq so'rovi (fon oqimida). `deviceNumber` va `deviceTestVersion` ulanishdagi `PwdData` dan (JS `info.deviceNumber`, `info.testFirmware`).
4. `UiServerHttpUtil.downloadFile(url, path, OnDownLoadListener)` → `cacheDir/dials/`. Xato callback'i yo'q: JS 90 s jimlikdan keyin "NO_REPLY".
5. Uzatish:
   - oddiy soat: `UiUpdateUtil.startSetUiStream(EUIFromType.SERVER, InputStream, IUiUpdateListener)`. `APP_CRC_SAME_DEVICE_CRC` = allaqachon o'rnatilgan.
   - Jieli (`isJLDevice()`): `openJLDataNotify` → `changeMTU(247)` → `startJLDeviceAuth` (ulanishga bir marta) → `listJLWatchList` (fayl tizimi) → `setJLWatchDial(path)`.

Native: `WatchController.kt` ("siferblatlar" bo'limi), JS: `src/features/dials/`. Uzatish paytida `holdWatch()` soatni band qiladi: o'lchov, rutina, tarix sinxroni boshlanmaydi. Batareya 30 % dan past bo'lsa o'rnatish boshlanmaydi (hujjat ogohlantirishi).

## Mos kelmaydigan siferblat (2026-11-12)

S105 da (Jieli) **hamma** siferblat `onFiled(16896, "File information does not match")` bilan rad etildi, G Band esa xuddi shu siferblatni o'rnatdi. 16896 — Jieli `ERR_VERSION_NOT_MATCH`.

**Asl sabab (AAR bayt-kodidan, 2026-11-12):** tekshiruv soatda emas, telefonda, uzatishdan oldin bo'ladi.
`VPOperateManager.setJLWatchDial` → `JLWatchHolder.updateJLWatchServerDial` → `FatInsertWatchTask` →
`WatchManager.createWatchFile(path, isNoNeedCheck = false)` → `FatFileSystem/RcspWatch.isMatchVersion(path, data)`:
siferblat fayli — arxiv (`PackResFormat`), SDK ichidan `WatchFileUtil.getJsonFileName(path)` = **fayl nomi
(kengaytmasiz) + ".json"** ni qidiradi, undagi `versionID` ni soatning `ExternalFlashMsg.matchVersions` bilan
solishtiradi. JSON topilmasa ham `false` → 16896. Biz faylni `dial_<crc>.bin` deb saqlardik, shuning uchun ichidagi
asl nomli JSON hech qachon topilmasdi. **Tuzatish:** fayl URL'dagi asl nomi bilan saqlanadi
(`cacheDir/dials/<crc>/<asl nom>`, `WatchController.dialFileName`). Veepoo SDK nomni o'zi tiklamaydi.

Qo'shimcha himoyalar:
- Ro'yxatda faqat `TUiTheme.isAvailable != false` siferblatlar ko'rsatiladi (yashirilganlar soni "Texnik ma'lumot"da).
- Native 16896 ni `VERSION_MISMATCH` xatosiga aylantiradi: oynada "soatingiz dasturiga mos emas" matni, siferblat shu sessiyada ro'yxatdan olinadi.
- "Texnik ma'lumot"da solishtirish uchun: firmware va test versiyasi, soatning `binDataType` va ekran shakli, siferblatlarning `binProtocol` lari.
- Release build'da R8 Gson `TypeToken` imzosini o'chirib, ro'yxat "TypeToken must be created with a type argument" bilan yiqilardi: `proguard-rules.pro` ga Gson qoidalari qo'shildi.

## Ochiq savollar [?]

- **Server ro'yxatni bizning paket nomimiz (`uz.synapse.watch`) bilan beradimi.** Hujjat misolida boshqa ilova nomi (`com.timaimee.watch`). Ro'yxat bo'sh kelsa, Veepoo'dan paket nomini ro'yxatdan o'tkazishni so'rash kerak. Boshqa ilovaning nomini ishlatmaymiz.
- SDK ichida shifrlanmagan `http://120.79.208.77:88/api/` manzili ham bor (yonida `https://www.vphband.com:9001/api/`). Android `http` ni standart bo'yicha bloklaydi. "NETWORK: Cleartext HTTP traffic ... not permitted" chiqsa, shu sabab.
- S105 Jieli platformasidami va do'konni qo'llaydimi: sahifadagi "Texnik ma'lumot" bo'limi ko'rsatadi.
- Do'kon CRC (matn) va soat CRC (`imgCrcId`, son) formati: o'nlik va o'n oltilik ikkalasi solishtiriladi.
