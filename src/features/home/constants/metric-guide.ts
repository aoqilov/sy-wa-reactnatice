import type { MetricKey } from "../api/get-metrics";

export type RangeTone = "success" | "warning" | "danger" | "info";

export type MetricGuide = {
  steps: string[]; // qanday o'lchash (matn ko'rsatmasi)
  standard: {
    name: string; // qaysi standart/mezon bo'yicha baholanadi
    ranges: { label: string; range: string; tone: RangeTone }[];
  };
};

// Hozircha namuna (mock) ma'lumot. Keyin shifokor tasdiqlagan haqiqiy ko'rsatmalar bilan almashtiriladi.
export const METRIC_GUIDE: Record<MetricKey, MetricGuide> = {
  pulse: {
    steps: [
      "Qulay o'tiring va 5 daqiqa dam oling.",
      "Soatni bilakka zich taqing (suyakdan bir barmoq yuqoriroq).",
      "Qo'lni stol ustiga, yurak balandligida qo'ying.",
      "\"Boshlash\" ni bosing va o'lchash tugaguncha qimirlamang.",
    ],
    standard: {
      name: "Dam olish holatidagi kattalar uchun umumiy mezon",
      ranges: [
        { label: "Past", range: "60 dan kam", tone: "info" },
        { label: "Normal", range: "60–100 zarb/daq", tone: "success" },
        { label: "Yuqori", range: "100 dan ko'p", tone: "warning" },
      ],
    },
  },
  pressurePump: {
    steps: [
      "Orqangizni suyab o'tiring, oyoqlarni kesishtirmang.",
      "Soatni bilakka taqing. Tirsakni stolga tirab, bilakni gorizontal va soatni yurak balandligida tuting: soat qo'l holatini ichidagi harakat datchigi bilan tekshiradi.",
      "\"Boshlash\" ni bosing, nasos bilakni havo bilan siqadi.",
      "Gaplashmang va qimirlamang, natija chiqquncha kuting.",
    ],
    standard: {
      name: "Qon bosimi bo'yicha umumiy tavsiyalar (mock)",
      ranges: [
        { label: "Normal", range: "120/80 dan kam", tone: "success" },
        { label: "Yuqori-normal", range: "120–139 / 80–89", tone: "warning" },
        { label: "Yuqori", range: "140/90 dan ko'p", tone: "danger" },
      ],
    },
  },
  oxygen: {
    steps: [
      "Qo'lingiz iliq va quruq bo'lsin, lak surtilgan tirnoqdan saqlaning.",
      "Soatni bilakka zich taqing.",
      "Qo'lni yurak balandligida tinch tuting.",
      "\"Boshlash\" ni bosing va o'lchash tugaguncha qimirlamang.",
    ],
    standard: {
      name: "SpO2 bo'yicha umumiy mezon (mock)",
      ranges: [
        { label: "Normal", range: "95–100 %", tone: "success" },
        { label: "Past", range: "90–94 %", tone: "warning" },
        { label: "Xavfli", range: "90 % dan kam", tone: "danger" },
      ],
    },
  },
  temperature: {
    steps: [
      "Juda sovuq yoki issiq xonada o'lchamang.",
      "Jismoniy yuklamadan keyin 15 daqiqa kuting.",
      "Soat teriga zich tegib tursin.",
      "\"Boshlash\" ni bosing va natijani kuting.",
    ],
    standard: {
      name: "Tana harorati bo'yicha umumiy mezon (mock)",
      ranges: [
        { label: "Past", range: "36.1 dan kam", tone: "info" },
        { label: "Normal", range: "36.1–37.2 °C", tone: "success" },
        { label: "Ko'tarilgan", range: "37.3–38.0 °C", tone: "warning" },
        { label: "Isitma", range: "38.0 dan yuqori", tone: "danger" },
      ],
    },
  },
  ecg: {
    steps: [
      "Stulda o'tiring, qo'llaringizni stolga qo'ying va bo'shashtiring.",
      "Qo'l quruq va toza bo'lsin.",
      "Soatni bilakka zich taqing. \"Boshlash\" ni bosib, boshqa qo'lingiz barmog'ini soatning metall qismiga (elektrodga) tegizing.",
      "Natija chiqquncha barmoqni ko'tarmang, qimirlamang va gaplashmang.",
    ],
    standard: {
      name: "Yurak ritmi bo'yicha umumiy tasnif (mock)",
      ranges: [
        { label: "Sinus ritm", range: "Normal", tone: "success" },
        { label: "Shubhali", range: "Ritm buzilishi belgilari", tone: "warning" },
        { label: "Aniqlanmadi", range: "Qayta o'lchang", tone: "info" },
      ],
    },
  },
  blood: {
    steps: [
      "Soatni bilakka zich taqing, qo'l harakatsiz bo'lsin.",
      "Qo'lni yurak balandligida tuting.",
      "\"Boshlash\" ni bosing va natijani kuting.",
      "Natijani vaqt bo'yicha kuzating, aniq tahlil uchun laboratoriyaga boring.",
    ],
    standard: {
      name: "Kattalar uchun umumiy me'yorlar",
      ranges: [
        { label: "Umumiy xolesterin", range: "5.2 mmol/l dan kam", tone: "success" },
        { label: "Triglitseridlar", range: "1.7 mmol/l dan kam", tone: "success" },
        { label: "HDL", range: "1.0 mmol/l dan ko'p", tone: "success" },
        { label: "LDL", range: "3.4 mmol/l dan kam", tone: "success" },
        { label: "Siydik kislotasi", range: "150–420 µmol/l", tone: "success" },
      ],
    },
  },
  sugar: {
    steps: [
      "Imkon bo'lsa, och qoringa o'lchang.",
      "Soatni bilakka zich taqing, qo'l harakatsiz bo'lsin.",
      "\"Boshlash\" ni bosing va natijani kuting.",
      "Diabet bo'lsa, qarorlarni glyukometr natijasiga tayanib qiling.",
    ],
    standard: {
      name: "Och qoringa glyukoza bo'yicha umumiy mezon (mock)",
      ranges: [
        { label: "Past", range: "3.9 mmol/l dan kam", tone: "warning" },
        { label: "Normal", range: "3.9–5.6 mmol/l", tone: "success" },
        { label: "Yuqori-normal", range: "5.7–6.9 mmol/l", tone: "warning" },
        { label: "Yuqori", range: "7.0 mmol/l dan ko'p", tone: "danger" },
      ],
    },
  },
};
