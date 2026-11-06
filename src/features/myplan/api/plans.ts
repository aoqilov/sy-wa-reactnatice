import type { MetricKey } from "@/features/home/api/get-metrics";

// Reja: shu o'lchovni soat necha daqiqada bir marta o'zi o'lchaydi. Har bir o'lchovga bitta reja.
export type Plan = {
  key: MetricKey;
  intervalMin: number; // daqiqa
  enabled: boolean; // yoqilgan/to'xtatilgan
};

// Boshlang'ich namuna (mock) rejalar.
export const INITIAL_PLANS: Plan[] = [
  { key: "pulse", intervalMin: 30, enabled: true },
  { key: "pressurePump", intervalMin: 120, enabled: true },
  { key: "temperature", intervalMin: 60, enabled: false },
];

// Hozircha soxta (mock) so'rov. Keyin soatga haqiqiy yuborish (Bluetooth) bilan almashtiriladi.
export async function sendPlansToWatch(plans: Plan[]): Promise<{ count: number }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { count: plans.length };
}
