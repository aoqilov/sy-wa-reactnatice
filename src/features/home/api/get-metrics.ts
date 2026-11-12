import type { ComponentProps } from "react";

import type Octicons from "@expo/vector-icons/Octicons";

import type { BloodRow } from "../lib/blood";

export type MetricStatus = "normal" | "warning" | "danger";

export type MetricKey =
  | "pulse"
  | "pressurePump"
  | "oxygen"
  | "temperature"
  | "ecg"
  | "blood"
  | "sugar"
  | "hrv"
  | "stress"
  | "bodyComp";

export type Metric = {
  key: MetricKey;
  title: string;
  icon: ComponentProps<typeof Octicons>["name"];
  value: string; // "72", "120/80"
  unit: string; // "zarb/daq", "mmHg"
  status: MetricStatus;
  statusLabel: string; // "Normal", "Yuqori"
  updatedAt: string; // "2 daqiqa oldin"
  normalRange: string;
  summary: { min: string; avg: string; max: string }; // bugungi
  history: { time: string; value: string }[]; // oxirgi o'lchovlar
  /** Qon tahlili: oxirgi natijaning beshta ko'rsatkichi (Home'da bitta kartada). */
  blood?: BloodRow[];
};

// O'lchanmagan o'lchovning qiymati o'rnida ko'rinadi.
export const EMPTY_VALUE = "--";

type MetricInfo = Pick<Metric, "key" | "title" | "icon" | "unit" | "normalRange">;

// Faqat o'zgarmas ma'lumot. Qiymatlar, holat va tarix soatda o'lchangach to'ldiriladi
// (features/home/hooks/use-measurement.ts va lib/readings.ts).
const METRICS: MetricInfo[] = [
  { key: "pulse", title: "Puls", icon: "pulse", unit: "zarb/daq", normalRange: "60-100 zarb/daq" },
  { key: "pressurePump", title: "Bosim (nasos)", icon: "meter", unit: "mmHg", normalRange: "120/80 mmHg gacha" },
  { key: "oxygen", title: "Kislorod", icon: "heart", unit: "% SpO2", normalRange: "95-100 %" },
  { key: "temperature", title: "Temperatura", icon: "flame", unit: "°C", normalRange: "36.1-37.2 °C" },
  // Qiymat — EKG o'lchovidagi puls; HRV va QTc tafsilotlarda (lib/readings.ts).
  { key: "ecg", title: "EKG", icon: "graph", unit: "zarb/daq", normalRange: "60-100 zarb/daq" },
  // Soat 5 ta ko'rsatkich beradi (lipidlar va siydik kislotasi); qiymat o'rnida — nechtasi me'yorda, hammasi
  // doira ostidagi bitta kartada (components/blood-result.tsx).
  {
    key: "blood",
    title: "Qon tahlili",
    icon: "beaker",
    unit: "ko'rsatkich me'yorda",
    normalRange: "Xolesterin < 5.2, triglitseridlar < 1.7, HDL > 1.0, LDL < 3.4 mmol/l; siydik kislotasi 150-420 µmol/l",
  },
  { key: "sugar", title: "Shakar", icon: "sparkle", unit: "mmol/l", normalRange: "3.9-5.6 mmol/l (och qoringa)" },
  // Yurak urishlari orasidagi vaqt o'zgaruvchanligi: yoshga va odamga qarab juda farq qiladi.
  { key: "hrv", title: "HRV", icon: "heart-fill", unit: "ms", normalRange: "Odatda 20-100 ms (yoshga bog'liq, yuqori yaxshi)" },
  // Soatning stress indeksi (0..100), optik datchik bo'yicha.
  { key: "stress", title: "Stress", icon: "smiley", unit: "/ 100", normalRange: "0-50: me'yorda, 50 dan yuqori: ko'tarilgan" },
  // Tana tarkibi elektrod orqali (bioimpedans), taxminiy. Qiymat — yog' ulushi; qolganlari natija qatorida.
  {
    key: "bodyComp",
    title: "Tana tarkibi",
    icon: "person",
    unit: "% yog'",
    normalRange: "Yog' ulushi: erkaklar ~10-20 %, ayollar ~18-28 % (taxminiy)",
  },
];

function blank(info: MetricInfo): Metric {
  return {
    ...info,
    value: EMPTY_VALUE,
    status: "normal",
    statusLabel: "—",
    updatedAt: "O'lchanmagan",
    summary: { min: EMPTY_VALUE, avg: EMPTY_VALUE, max: EMPTY_VALUE },
    history: [],
  };
}

export async function getMetrics(): Promise<Metric[]> {
  return METRICS.map(blank);
}
