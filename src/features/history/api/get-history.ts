import { getMetrics, Metric, MetricKey, MetricStatus } from "@/features/home/api/get-metrics";
import { bloodRows, bloodSummary } from "@/features/home/lib/blood";
import { loadReadings, statusFor, type StoredReading } from "@/features/home/lib/readings";
import type { BloodParts } from "@/shared/watch/measure";
import { loadWatchHistory, type WatchRecord } from "@/shared/watch/watch-history";

// History ma'lumoti — ikki manbadan, birlashtirilgan va vaqt bo'yicha tartiblangan:
//  - "app": Home'da ilova orqali o'lchanganlar (telefonda saqlangan, features/home/lib/readings.ts);
//  - "watch": soat xotirasidagi yozuvlar (soatning o'zida o'lchanganlar), sinxron qilib saqlangan
//    (shared/watch/watch-history.ts).
// Ilovadan boshlangan o'lchov soat xotirasiga ham yozilishi mumkin: bir xil o'lchov ikki marta chiqmasligi uchun
// soat yozuvi shu turdagi ilova yozuvidan DUPLICATE_MS ichida bo'lsa tashlanadi.

/** app — Home'da ilova orqali; watch — soatning o'zida qo'lda; auto — soat "Rejam" bo'yicha o'zi o'lchagan. */
export type HistorySource = "app" | "watch" | "auto";

export const SOURCE_LABEL: Record<HistorySource, string> = { app: "Ilova", watch: "Soat", auto: "Soat (avto)" };

export type HistoryReading = {
  id: string;
  key: MetricKey;
  at: number; // vaqt (ms)
  value: string; // ko'rsatiladigan qiymat: "72", "126/82", qon tahlili uchun "5/5"
  nums: number[]; // hisoblash uchun: [72], [126, 82]; qon tahlili uchun [] (beshta ko'rsatkich, o'rtachasi yo'q)
  status: MetricStatus;
  source: HistorySource;
  /** Qo'shimcha: qon tahlilining beshta qiymati, soatning shakar xavf bahosi. */
  note?: string;
  /** Qon tahlili: beshta ko'rsatkich (History'da accordion qatorlari shundan). */
  blood?: BloodParts;
};

export const HISTORY_DAYS = 15; // eng uzun davr (sinxron ham shuncha kunni o'qiydi)

const DUPLICATE_MS = 3 * 60 * 1000;

export const DECIMALS: Record<MetricKey, number> = {
  pulse: 0,
  pressurePump: 0,
  oxygen: 0,
  temperature: 1,
  ecg: 0,
  blood: 0,
  sugar: 1,
  hrv: 0,
  stress: 0,
  bodyComp: 1,
};

export const statusOf = statusFor;

export function formatNums(nums: number[], decimals: number) {
  return nums.map((n) => n.toFixed(decimals)).join("/");
}

/** Qon tahlilining beshta qiymati bir qatorda (tafsilotlar ro'yxati uchun). */
function bloodNote(parts: BloodParts): string {
  return bloodRows(parts)
    .map((r) => `${r.label.split(" (")[0]} ${r.value}`)
    .join(" · ");
}

const RISK: Record<string, string> = { LOW: "soat: past xavf", MIDDLE: "soat: o'rta xavf", HIGH: "soat: yuqori xavf" };

function fromApp(r: StoredReading): HistoryReading {
  const base = { id: `app-${r.key}-${r.at}`, key: r.key, at: r.at, status: r.status, source: "app" as const };
  if (r.key === "blood") {
    return { ...base, value: r.value, nums: [], note: r.blood ? bloodNote(r.blood) : undefined, blood: r.blood };
  }
  const nums = r.value.split("/").map(Number).filter((n) => Number.isFinite(n));
  return { ...base, value: r.value, nums };
}

function fromWatch(r: WatchRecord): HistoryReading {
  const source: HistorySource = r.auto ? "auto" : "watch";
  const reading = (key: MetricKey, nums: number[], note?: string): HistoryReading => ({
    id: `${source}-${r.kind}-${r.at}`,
    key,
    at: r.at,
    value: formatNums(nums, DECIMALS[key]),
    nums,
    status: statusFor(key, nums),
    source,
    note,
  });
  switch (r.kind) {
    case "bp":
      return reading("pressurePump", [r.sys, r.dia], r.hr !== undefined ? `puls ${r.hr}` : undefined);
    case "hr":
      return reading("pulse", [r.value]);
    case "spo2":
      return reading("oxygen", [r.value]);
    case "temp":
      return reading("temperature", [r.value]);
    case "glucose":
      return reading("sugar", [r.value], r.risk ? RISK[r.risk] : undefined);
    case "hrv":
      return reading("hrv", [r.value]);
    case "blood": {
      const s = bloodSummary(r.parts);
      return {
        id: `${source}-blood-${r.at}`,
        key: "blood",
        at: r.at,
        value: s.value,
        nums: [],
        status: s.status,
        source,
        note: bloodNote(r.parts),
        blood: r.parts,
      };
    }
  }
}

/** Ilova va soat yozuvlarini birlashtiradi; ilovadan o'lchanib soatda ham saqlangan o'lchov bir marta chiqadi. */
export function mergeHistory(app: HistoryReading[], watch: HistoryReading[]): HistoryReading[] {
  const unique = watch.filter((w) => !app.some((a) => a.key === w.key && Math.abs(a.at - w.at) <= DUPLICATE_MS));
  return [...app, ...unique].sort((a, b) => b.at - a.at);
}

export async function getHistory(): Promise<{ metrics: Metric[]; readings: HistoryReading[] }> {
  const [metrics, app, watch] = await Promise.all([getMetrics(), loadReadings(), loadWatchHistory()]);
  // Avval saqlangan HRV yozuvlari ko'rsatilmaydi (HRV olib tashlangan).
  const shown = mergeHistory(app.map(fromApp), watch.map(fromWatch)).filter((r) => r.key !== "hrv");
  return { metrics, readings: shown };
}
