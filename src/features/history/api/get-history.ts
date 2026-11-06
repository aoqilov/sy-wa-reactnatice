import { getMetrics, Metric, MetricKey, MetricStatus } from "@/features/home/api/get-metrics";

export type HistoryReading = {
  id: string;
  key: MetricKey;
  at: number; // vaqt (ms)
  value: string; // ko'rsatiladigan qiymat: "72", "126/82", "Normal"
  nums: number[]; // hisoblash uchun: [72], [126, 82], EKG uchun []
  status: MetricStatus;
};

export const HISTORY_DAYS = 15; // eng uzun davr

// ---- Baholash (mock mezonlar, Home'dagi "Standart" bo'limiga mos) ----
export function statusOf(key: MetricKey, nums: number[]): MetricStatus {
  const [a, b] = nums;
  switch (key) {
    case "pulse":
      return a < 50 || a > 120 ? "danger" : a < 60 || a > 100 ? "warning" : "normal";
    case "pressurePump":
    case "pressureOptical":
      return a >= 140 || b >= 90 ? "danger" : a >= 120 || b >= 80 ? "warning" : "normal";
    case "oxygen":
      return a < 90 ? "danger" : a < 95 ? "warning" : "normal";
    case "temperature":
      return a > 38 ? "danger" : a < 36.1 || a > 37.2 ? "warning" : "normal";
    case "blood":
      return a < 110 || a > 180 ? "danger" : a < 120 || a > 170 ? "warning" : "normal";
    case "sugar":
      return a >= 7 ? "danger" : a < 3.9 || a >= 5.7 ? "warning" : "normal";
    case "ecg":
      return "normal";
  }
}

// ---- Soxta ma'lumot yaratish ----
type Gen = { base: number[]; spread: number[]; decimals: number; chance: number } | { text: true; chance: number };

const GEN: Record<MetricKey, Gen> = {
  pulse: { base: [74], spread: [18], decimals: 0, chance: 0.9 },
  pressurePump: { base: [122, 80], spread: [12, 7], decimals: 0, chance: 0.6 },
  pressureOptical: { base: [120, 79], spread: [12, 7], decimals: 0, chance: 0.6 },
  oxygen: { base: [97], spread: [3], decimals: 0, chance: 0.7 },
  temperature: { base: [36.6], spread: [0.7], decimals: 1, chance: 0.6 },
  ecg: { text: true, chance: 0.4 },
  blood: { base: [145], spread: [10], decimals: 0, chance: 0.2 },
  sugar: { base: [5.4], spread: [1.6], decimals: 1, chance: 0.6 },
};

const HOURS = [8, 12, 16, 20]; // kuniga shu soatlarda o'lchov bo'lishi mumkin

// Har safar bir xil natija beradigan tasodifiy son (mock ma'lumot turg'un bo'lsin).
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatNums(nums: number[], decimals: number) {
  return nums.map((n) => n.toFixed(decimals)).join("/");
}

function generate(now: Date): HistoryReading[] {
  const out: HistoryReading[] = [];
  (Object.keys(GEN) as MetricKey[]).forEach((key, ki) => {
    const rand = rng(1000 + ki * 77);
    const g = GEN[key];
    for (let day = 0; day < HISTORY_DAYS; day++) {
      for (const hour of HOURS) {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, hour, Math.floor(rand() * 50)).getTime();
        const roll = rand();
        if (at > now.getTime() || roll > g.chance) continue; // kelajak yoki bu safar o'lchanmagan

        if ("text" in g) {
          const odd = rand() < 0.1;
          out.push({ id: `${key}-${at}`, key, at, value: odd ? "Shubhali" : "Normal", nums: [], status: odd ? "warning" : "normal" });
        } else {
          const nums = g.base.map((b, i) => b + (rand() - 0.5) * 2 * g.spread[i]);
          const rounded = nums.map((n) => Number(n.toFixed(g.decimals)));
          out.push({
            id: `${key}-${at}`,
            key,
            at,
            value: formatNums(rounded, g.decimals),
            nums: rounded,
            status: statusOf(key, rounded),
          });
        }
      }
    }
  });
  return out;
}

// Hozircha soxta (mock). Keyin soatdan/serverdan olingan haqiqiy tarix bilan almashtiriladi.
export async function getHistory(now: Date): Promise<{ metrics: Metric[]; readings: HistoryReading[] }> {
  const metrics = await getMetrics(); // nom, ikon, birlik shu yerdan
  return { metrics, readings: generate(now) };
}

export const DECIMALS: Record<MetricKey, number> = {
  pulse: 0,
  pressurePump: 0,
  pressureOptical: 0,
  oxygen: 0,
  temperature: 1,
  ecg: 0,
  blood: 0,
  sugar: 1,
};
