const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem: false — `rem` qiymati build vaqtida qotirib qo'yilmaydi (odatda 14), ilova ishlayotganda o'zgartirsa bo'ladi.
// "Interfeys kattaligi" sozlamasi shu orqali butun ilovani (shrift, bo'shliq, balandlik) birdan masshtablaydi.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: false });
