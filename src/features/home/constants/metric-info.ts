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
  pressureOptical: {
    about:
      "Optik usulda qon bosimi manjetsiz, yorug'lik datchigi yordamida taxminiy hisoblanadi. U tez va qulay, lekin nasosli usuldan kamroq aniq.",
    how: "Soat bilakdagi qon oqimi to'lqinini yorug'lik bilan o'qib, bosimni hisoblaydi. Natija tonometr o'rnini bosmaydi.",
    tips: [
      "Tez kuzatuv uchun ishlating, muhim qaror uchun nasosli usulni tanlang.",
      "Soat terini zich ushlab tursin va qo'l harakatsiz bo'lsin.",
      "Natijalar bir-biridan keskin farq qilsa, qayta o'lchang.",
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
};
