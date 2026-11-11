import type { MetricKey } from "../api/get-metrics";

// Har bir o'lchovning o'z rangi: Home'dagi karta (belgi, tanlangan chegara, grafik) va markaziy doira chegarasi shundan.
// Bular o'lchov kimligi uchun ranglar, holat (Normal / Past / Yuqori) uchun emas: holat yorlig'i o'z yashil/sariq/qizil
// ranglarini saqlaydi.
export const METRIC_COLORS: Record<MetricKey, string> = {
  pulse: "#EF4444", // qizil
  pressurePump: "#3B82F6", // ko'k
  oxygen: "#4ADE80", // och yashil
  temperature: "#F97316", // to'q sariq (orange)
  ecg: "#15803D", // to'q yashil
  blood: "#BE123C", // qizilroq (puls qizilidan to'qroq)
  sugar: "#8B5CF6", // binafsha
};

/** "#RRGGBB" rangning shaffofligi o'zgargan nusxasi ("rgba(...)"): och/to'q mavzuda fon ustida bir xil tus beradi. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
