import type { MetricKey } from "../api/get-metrics";

export type MetricInfo = {
  about: string; // bu nima
  how: string; // qanday o'lchanadi
  tips: string[]; // maslahatlar
};

// Har bir o'lchov haqida umumiy (statik) ma'lumot. Tibbiy tashxis emas.
export const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  pulse: {
    about:
      "Puls — yurakning bir daqiqada necha marta urishi. Dam olish holatida kattalar uchun odatda 60–100 zarb/daq bo'ladi.",
    how: "Soat teri ostidagi qon oqimini yorug'lik (optik datchik) yordamida sezadi. O'lchash paytida qo'lni tinch tuting.",
    tips: [
      "O'lchashdan oldin 5 daqiqa dam oling.",
      "Soatni bilakka zich, lekin siqmasdan taqing.",
      "Kofe, stress va jismoniy yuklamadan keyin puls oshishi mumkin.",
    ],
  },
  pressurePump: {
    about:
      "Qon bosimi — qon tomirlar devoriga ta'sir qiladigan kuch. U ikki son bilan yoziladi: yuqori (sistolik) va pastki (diastolik), masalan 120/80.",
    how: "Soatdagi kichik nasos bilakni havo bilan siqadi va bosimni manjetli usulda o'lchaydi. Bu optik usuldan aniqroq.",
    tips: [
      "O'tirib, orqangizni suyab, oyoqlarni kesishtirmasdan o'lchang.",
      "Qo'l yurak balandligida tursin.",
      "O'lchash vaqtida gaplashmang va harakatlanmang.",
    ],
  },
  oxygen: {
    about:
      "Kislorod (SpO2) — qondagi gemoglobin qanchasi kislorod bilan to'yinganini ko'rsatadi. Sog'lom odamda odatda 95–100 %.",
    how: "Soat qizil va infraqizil yorug'lik yordamida qonning rangini o'lchab, to'yinish darajasini hisoblaydi.",
    tips: [
      "Qo'lni tinch tuting, soat terini zich ushlab tursin.",
      "Sovuq qo'l yoki lak surtilgan tirnoq natijani buzishi mumkin.",
      "Doimiy 92 % dan past bo'lsa, shifokorga murojaat qiling.",
    ],
  },
  temperature: {
    about:
      "Tana harorati — organizmning issiqlik darajasi. Normal harorat odatda 36.1–37.2 °C oralig'ida bo'ladi.",
    how: "Soat teri sirtining haroratini o'lchaydi. Tashqi havo va kiyim natijaga ta'sir qilishi mumkin.",
    tips: [
      "Sovuq yoki juda issiq xonada o'lchamang.",
      "Jismoniy yuklamadan keyin 15 daqiqa kuting.",
      "Harorat 38 °C dan yuqori bo'lsa, shifokorga murojaat qiling.",
    ],
  },
  ecg: {
    about:
      "EKG — yurakning elektr faolligi yozuvi. U yurak ritmini baholashga yordam beradi.",
    how: "Barmog'ingizni soatning tegishli datchigiga qo'yib, taxminan 30 soniya tinch turasiz.",
    tips: [
      "Qo'llaringizni stolga qo'yib, bo'shashtiring.",
      "O'lchash paytida harakatlanmang.",
      "Qo'l quruq va toza bo'lsin.",
    ],
  },
  blood: {
    about:
      "Qon tahlili — beshta ko'rsatkich: siydik kislotasi, umumiy xolesterin, triglitseridlar, HDL (yaxshi xolesterin) va LDL (yomon xolesterin). Ular yurak-qon tomir va almashinuv holatini baholashga yordam beradi.",
    how: "Soat optik datchik orqali beshala ko'rsatkichni bitta o'lchovda taxminiy baholaydi. Natija laboratoriya tahlilini almashtirmaydi.",
    tips: [
      "Natijani vaqt o'tishi bilan kuzating, bitta o'lchovga qarab xulosa qilmang.",
      "Xolesterin yoki LDL doimiy yuqori, HDL past bo'lsa, shifokorga murojaat qiling.",
      "Aniq tahlil uchun laboratoriyada och qoringa qon topshiring.",
    ],
  },
  sugar: {
    about:
      "Shakar (glyukoza) — qondagi qand miqdori. Och qoringa normal ko'rsatkich odatda 3.9–5.6 mmol/l.",
    how: "Soat teriga tegmasdan, optik datchik orqali qand miqdorini taxminiy baholaydi. Natija glyukometr o'rnini bosmaydi.",
    tips: [
      "Eng ishonchli taqqoslash uchun och qoringa o'lchang.",
      "Diabet bo'lsa, davolash qarorlarini glyukometr natijasiga tayanib qiling.",
      "Ko'rsatkich doimiy 7 mmol/l dan yuqori bo'lsa, shifokorga murojaat qiling.",
    ],
  },
  hrv: {
    about:
      "HRV (yurak ritmi o'zgaruvchanligi) — yurak urishlari orasidagi vaqtning qanchalik o'zgarib turishi, millisekundda. Odatda yuqori HRV dam olgan, tiklangan holatni bildiradi. Me'yor yoshga va odamga qarab ancha farq qiladi.",
    how: "Soat optik datchik bilan yurak urishlarini sezadi va ular orasidagi vaqt farqlarini hisoblaydi. O'lchash taxminan bir daqiqa davom etadi.",
    tips: [
      "Tinch o'tirib, har kuni bir xil vaqtda (masalan ertalab) o'lchang.",
      "Bitta natijaga emas, kunlar bo'yicha o'zgarishga qarang.",
      "Kam uyqu, kasallik, spirtli ichimlik va stress HRV ni pasaytiradi.",
    ],
  },
  stress: {
    about:
      "Stress indeksi — soatning 0 dan 100 gacha bo'lgan bahosi: qanchalik yuqori bo'lsa, organizm shunchalik zo'riqqan. Bu soatning o'z shkalasi, tibbiy o'lchov emas.",
    how: "Soat yurak urishi va uning o'zgaruvchanligi asosida (optik datchik) stress darajasini baholaydi.",
    tips: [
      "O'lchashdan oldin bir necha daqiqa tinch o'tiring.",
      "Jismoniy yuklama, kofe va kasallik natijani oshirishi mumkin.",
      "Doimiy yuqori bo'lsa, dam olish va uyqu tartibiga e'tibor bering.",
    ],
  },
  bodyComp: {
    about:
      "Tana tarkibi — tanadagi yog', mushak, suv va suyak ulushi. Kartadagi asosiy qiymat — yog' ulushi (%). Natija taxminiy, tibbiy tashxis emas.",
    how: "Soat elektrodlar orqali tanadan juda kuchsiz tok o'tkazadi va qarshilikni o'lchaydi (bioimpedans). Buning uchun boshqa qo'l barmog'i soatning metall qismiga tegib turishi kerak. Hisob bo'y, vazn, yosh va jinsga tayanadi.",
    tips: [
      "Ovqat, ko'p suv ichish va mashqdan keyin darhol o'lchamang: natija o'zgaradi.",
      "Har safar bir xil vaqtda o'lchang.",
      "Yurak stimulyatori (pacemaker) yoki boshqa implant bo'lsa, o'lchamang va shifokor bilan maslahatlashing.",
    ],
  },
};
