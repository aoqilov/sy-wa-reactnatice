import type { MetricKey } from "../api/get-metrics";

// Home kartasi o'lchanmagan paytda qiymat o'rnida chiqadigan qisqa chorlov matni.
export const METRIC_TAGLINES: Record<MetricKey, string> = {
  pulse: "Yurak urishini kuzating, bir necha soniyada o'lchang",
  pressurePump: "Bosimni e'tiborsiz qoldirmang, muntazam o'lchab turing",
  oxygen: "Qondagi kislorod darajasini bilib oling",
  temperature: "Tana haroratini kuzatib boring",
  ecg: "Yurak ritmini hoziroq tekshirib ko'ring",
  blood: "Xolesterin va siydik kislotasi, taxminiy tahlil",
  sugar: "Qondagi shakar qanday? Hoziroq bilib oling",
  hrv: "Yurak ritmi o'zgaruvchanligini kuzating",
  stress: "Stressni vaqtida sezing va dam oling",
  bodyComp: "Tana yog'i va mushak ulushini bilib oling",
};

/** Me'yor chizig'i: shkala chegaralari va ketma-ket bo'laklar (har biri `to` gacha). */
export type MetricRange = { min: number; max: number; bands: { to: number; color: string }[] };

const LOW = "#60A5FA"; // past
const OK = "#22C55E"; // me'yor
const WARN = "#F59E0B"; // biroz yuqori / past
const HIGH = "#EF4444"; // yuqori / xavfli

const PULSE: MetricRange = {
  min: 40,
  max: 140,
  bands: [
    { to: 60, color: LOW },
    { to: 100, color: OK },
    { to: 120, color: WARN },
    { to: 140, color: HIGH },
  ],
};

// Kartadagi rangli chiziq va undagi marker. Faqat bitta son bilan ifodalanadigan o'lchovlar uchun (bosimda — yuqori
// qiymat). Qolganlarida (qon tahlili, tana tarkibi) chiziq o'rnida mini grafik chiqadi.
export const METRIC_RANGES: Partial<Record<MetricKey, MetricRange>> = {
  pulse: PULSE,
  ecg: PULSE,
  pressurePump: {
    min: 80,
    max: 180,
    bands: [
      { to: 90, color: LOW },
      { to: 120, color: OK },
      { to: 140, color: WARN },
      { to: 180, color: HIGH },
    ],
  },
  oxygen: {
    min: 85,
    max: 100,
    bands: [
      { to: 90, color: HIGH },
      { to: 95, color: WARN },
      { to: 100, color: OK },
    ],
  },
  temperature: {
    min: 35,
    max: 39.5,
    bands: [
      { to: 36.1, color: LOW },
      { to: 37.2, color: OK },
      { to: 38, color: WARN },
      { to: 39.5, color: HIGH },
    ],
  },
  sugar: {
    min: 2.5,
    max: 10,
    bands: [
      { to: 3.9, color: LOW },
      { to: 5.6, color: OK },
      { to: 7, color: WARN },
      { to: 10, color: HIGH },
    ],
  },
  stress: {
    min: 0,
    max: 100,
    bands: [
      { to: 50, color: OK },
      { to: 75, color: WARN },
      { to: 100, color: HIGH },
    ],
  },
};
