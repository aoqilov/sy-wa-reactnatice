import type { MetricKey } from "../api/get-metrics";

// Kartalarning fon rasmlari (assets/images/metrics/). Manbasi: CREDITS.md.
// require() natijasi raqam (asset ID) bo'ladi. Yo'li statik bo'lishi shart, shuning uchun har biri alohida yozilgan.
// Rasm faqat bor o'lchovlar uchun (HRV, stress, tana tarkibida yo'q: o'rniga rangli belgi chiqadi).
export const METRIC_IMAGES: Partial<Record<MetricKey, number>> = {
  pulse: require("../../../../assets/images/metrics/pulse.jpg"),
  pressurePump: require("../../../../assets/images/metrics/pressurePump.jpg"),
  oxygen: require("../../../../assets/images/metrics/oxygen.jpg"),
  temperature: require("../../../../assets/images/metrics/temperature.jpg"),
  ecg: require("../../../../assets/images/metrics/ecg.jpg"),
  blood: require("../../../../assets/images/metrics/blood.jpg"),
  sugar: require("../../../../assets/images/metrics/sugar.jpg"),
};
