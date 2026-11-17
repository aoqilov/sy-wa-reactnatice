import { getJSON, setJSON } from "@/shared/storage/storage";
import { isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import { loadWatchHistory } from "@/shared/watch/watch-history";
import { logWatch } from "@/shared/watch/watch-log";
import { runWatchTask } from "@/shared/watch/watch-queue";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";
import { demoSleepRecords } from "./sleep-demo";

// Uyqu: soat uni o'zi aniqlaydi (harakat sensori + puls) va saqlaydi, ilova tayyor natijani o'qiydi (native
// `readSleep` → SDK `readSleepData`). Natija telefonda saqlanadi: soat faqat bir necha kunni eslaydi.
//
// `sleepLine` — tun bo'yi holat qatori (Veepoo hujjati):
//   oddiy uyqu: belgi = 5 daqiqa; 0 yengil, 1 chuqur, 2 uyg'oq;
//   aniq uyqu (SleepPrecisionData): belgi = `onePointDuration` soniya (hozir 60); 0 chuqur, 1 yengil, 2 REM,
//   3 uyqusizlik, 4 uyg'oq.

export type SleepStage = "deep" | "light" | "rem" | "awake";

/** Bitta uyqu bo'lagi (soat bir kechani bir necha bo'lak qilib berishi mumkin). */
export type SleepSegment = {
  /** Uxlagan va uyg'ongan vaqt (ms). */
  down: number;
  up: number;
  totalMin: number;
  deepMin: number;
  lightMin: number;
  remMin: number;
  awakeMin: number;
  wakeCount: number;
  /** Soatning o'z bahosi (xom son, ma'nosi modelga bog'liq). */
  quality: number;
  precise: boolean;
  /** Bosqichlar: [bosqich, boshidan daqiqa, oxiri daqiqa] (`down` ga nisbatan). */
  stages: [SleepStage, number, number][];
  scores?: SleepScores;
  insomniaTimes?: number;
  firstDeepMin?: number;
};

export type SleepScores = {
  deep: number;
  efficiency: number;
  fallAsleep: number;
  time: number;
  getUp: number;
  insomnia: number;
};

/** Bir kecha: uyg'ongan kun bo'yicha birlashtirilgan bo'laklar. */
export type SleepNight = {
  /** Uyg'ongan kun "YYYY-MM-DD". */
  key: string;
  down: number;
  up: number;
  totalMin: number;
  deepMin: number;
  lightMin: number;
  remMin: number;
  awakeMin: number;
  wakeCount: number;
  precise: boolean;
  segments: SleepSegment[];
  scores?: SleepScores;
};

export type SleepSyncResult = { ok: true; nights: number } | { ok: false; reason: "notReady" | "busy" | "outdated" | "noReply" };

const STORE_KEY = "sleep.segments.v1";
const SYNCED_AT_KEY = "sleep.syncedAt";
const KEEP_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_MS = 10_000;
const MAX_MS = 60_000;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Dev rejimi va soat moduli yo'q (Expo Go): UI ustida ishlash uchun namuna kechalar ko'rsatiladi. */
export function sleepDemo(): boolean {
  return __DEV__ && !watchModule;
}

/** O'rnatilgan APK uyquni o'qiy oladimi (eski build'da yo'q). Expo Go'da (dev) namuna rejimi. */
export function sleepAvailable(): boolean {
  if (sleepDemo()) return true;
  return !!watchModule && typeof watchModule.readSleep === "function";
}

// ---------------------------------------------------------------- soat yozuvini o'girish

function timeOf(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const [y, mo, d, h, mi] = [t.y, t.mo, t.d, t.h, t.mi].map(num);
  if (y < 2000 || mo < 1 || d < 1) return null;
  const ms = new Date(y, mo - 1, d, h, mi).getTime();
  return Number.isFinite(ms) ? ms : null;
}

const NORMAL_STAGES: Record<string, SleepStage> = { "0": "light", "1": "deep", "2": "awake" };
const PRECISE_STAGES: Record<string, SleepStage> = { "0": "deep", "1": "light", "2": "rem", "3": "awake", "4": "awake" };

/** Holat qatorini bosqich bo'laklariga yig'adi (ketma-ket bir xil belgilar bitta bo'lak). */
export function decodeLine(line: string, precise: boolean, pointSec: number): [SleepStage, number, number][] {
  const map = precise ? PRECISE_STAGES : NORMAL_STAGES;
  const step = precise ? (pointSec > 0 ? pointSec : 60) / 60 : 5;
  const out: [SleepStage, number, number][] = [];
  for (let i = 0; i < line.length; i++) {
    const stage = map[line[i]];
    if (!stage) continue;
    const from = i * step;
    const last = out[out.length - 1];
    if (last && last[0] === stage && last[2] === from) last[2] = from + step;
    else out.push([stage, from, from + step]);
  }
  return out;
}

function stageMinutes(stages: [SleepStage, number, number][], stage: SleepStage): number {
  return Math.round(stages.reduce((sum, [s, a, b]) => (s === stage ? sum + (b - a) : sum), 0));
}

export function toSegment(r: Record<string, unknown>): SleepSegment | null {
  const down = timeOf(r.down);
  let up = timeOf(r.up);
  if (down === null || up === null) return null;
  if (up <= down) up += DAY_MS; // soat sanani bermagan bo'lsa (yarim tundan o'tgan)
  if (up - down > 20 * 60 * 60 * 1000 || down > Date.now() + DAY_MS) return null;

  const precise = r.precise === true;
  const line = typeof r.line === "string" ? r.line : "";
  const stages = decodeLine(line, precise, num(r.pointSec));
  const deepMin = num(r.deep);
  const lightMin = num(r.light);
  const remMin = precise ? stageMinutes(stages, "rem") : 0;
  const awakeMin = stageMinutes(stages, "awake");
  const totalMin = num(r.all) || deepMin + lightMin + remMin;
  if (totalMin <= 0) return null;

  const seg: SleepSegment = {
    down,
    up,
    totalMin,
    deepMin,
    lightMin,
    remMin,
    awakeMin,
    wakeCount: num(r.wake),
    quality: num(r.quality),
    precise,
    stages,
  };
  if (precise) {
    const scores: SleepScores = {
      deep: num(r.deepScore),
      efficiency: num(r.efficiencyScore),
      fallAsleep: num(r.fallAsleepScore),
      time: num(r.timeScore),
      getUp: num(r.getUpScore),
      insomnia: num(r.insomniaScore),
    };
    if (Object.values(scores).some((v) => v > 0)) seg.scores = scores;
    seg.insomniaTimes = num(r.insomniaTimes);
    seg.firstDeepMin = num(r.firstDeepMin);
  }
  return seg;
}

// ---------------------------------------------------------------- kechalar

/** Bo'laklarni uyg'ongan kun bo'yicha kechalarga birlashtiradi (yangisi birinchi). */
export function groupNights(segments: SleepSegment[]): SleepNight[] {
  const byKey = new Map<string, SleepSegment[]>();
  for (const s of segments) {
    const key = dateKey(s.up);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }
  const nights: SleepNight[] = [];
  for (const [key, list] of byKey) {
    const segs = [...list].sort((a, b) => a.down - b.down);
    const sum = (f: (s: SleepSegment) => number) => segs.reduce((acc, s) => acc + f(s), 0);
    const main = segs.reduce((a, b) => (b.totalMin > a.totalMin ? b : a));
    nights.push({
      key,
      down: segs[0].down,
      up: Math.max(...segs.map((s) => s.up)),
      totalMin: sum((s) => s.totalMin),
      deepMin: sum((s) => s.deepMin),
      lightMin: sum((s) => s.lightMin),
      remMin: sum((s) => s.remMin),
      awakeMin: sum((s) => s.awakeMin),
      wakeCount: sum((s) => s.wakeCount),
      precise: segs.some((s) => s.precise),
      segments: segs,
      scores: main.scores,
    });
  }
  return nights.sort((a, b) => b.up - a.up);
}

export type SleepQuality = "good" | "fair" | "poor";

/** Oddiy baho: maqsadga nisbatan davomiylik va chuqur uyqu ulushi (soatning xom bahosi modelga bog'liq). */
export function qualityOf(night: SleepNight, goalMin: number): SleepQuality {
  const ratio = goalMin > 0 ? night.totalMin / goalMin : 1;
  const deepShare = night.totalMin > 0 ? night.deepMin / night.totalMin : 0;
  if (ratio >= 0.9 && deepShare >= 0.15) return "good";
  if (ratio < 0.7 || deepShare < 0.08) return "poor";
  return "fair";
}

/** Uyqu paytidagi puls va SpO2 (soatning avto-o'lchovlaridan, History sinxroni yig'gan 30 daqiqalik qiymatlar). */
export async function vitalsDuring(night: SleepNight): Promise<{ hrAvg?: number; hrMin?: number; spo2Avg?: number; spo2Min?: number }> {
  const records = await loadWatchHistory();
  const inNight = (at: number) => night.segments.some((s) => at >= s.down && at <= s.up);
  const hr: number[] = [];
  const spo2: number[] = [];
  for (const r of records) {
    if (!r.auto || !inNight(r.at)) continue;
    if (r.kind === "hr") hr.push(r.value);
    else if (r.kind === "spo2") spo2.push(r.value);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined);
  return {
    hrAvg: avg(hr),
    hrMin: hr.length ? Math.min(...hr) : undefined,
    spo2Avg: avg(spo2),
    spo2Min: spo2.length ? Math.min(...spo2) : undefined,
  };
}

// ---------------------------------------------------------------- saqlash va obuna (Home kartasi va sahifa bitta holatda)

let segmentsCache: SleepSegment[] | null = null;
let syncedAt: number | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function subscribeSleep(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSleepSnapshot(): { nights: SleepNight[] | null; syncedAt: number | null } {
  return { nights: segmentsCache ? groupNights(segmentsCache) : null, syncedAt };
}

export async function loadSleep(): Promise<void> {
  if (segmentsCache) return;
  if (sleepDemo()) {
    segmentsCache = demoSleepRecords()
      .map(toSegment)
      .filter((s): s is SleepSegment => s !== null);
    notify();
    return;
  }
  const [stored, at] = await Promise.all([getJSON<SleepSegment[]>(STORE_KEY), getJSON<number>(SYNCED_AT_KEY)]);
  segmentsCache ??= stored ?? [];
  syncedAt ??= at;
  notify();
}

// ---------------------------------------------------------------- soatdan o'qish

function readFromWatch(): Promise<{ records: Record<string, unknown>[]; outcome: "complete" | "idle" | "failed" }> {
  const watch = watchModule;
  if (!watch) return Promise.resolve({ records: [], outcome: "failed" });
  return new Promise((resolve) => {
    const records: Record<string, unknown>[] = [];
    let heard = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const finish = (outcome: "complete" | "idle" | "failed") => {
      clearTimeout(idle);
      clearTimeout(cap);
      sub.remove();
      resolve({ records, outcome });
    };
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => finish(heard ? "idle" : "failed"), IDLE_MS);
    };
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== "sleepData") return;
      heard = true;
      touch();
      if (e.complete === true) return finish("complete");
      if (Array.isArray(e.records)) records.push(...(e.records as Record<string, unknown>[]));
    });
    const cap = setTimeout(() => finish(heard ? "idle" : "failed"), MAX_MS);
    touch();
    try {
      watch.readSleep();
    } catch {
      finish("failed");
    }
  });
}

/** Soatdagi uyqu yozuvlarini o'qib, saqlanganlariga qo'shadi (bir xil uxlash vaqtidagi bo'lak yangisi bilan almashadi). */
export async function syncSleep(): Promise<SleepSyncResult> {
  if (sleepDemo()) return { ok: false, reason: "notReady" };
  if (!sleepAvailable()) return { ok: false, reason: "outdated" };
  if (getWatchConnection().status !== "ready") return { ok: false, reason: "notReady" };
  if (isMeasuring()) return { ok: false, reason: "busy" };

  const read = await runWatchTask("sleep", readFromWatch);
  if (read === null) return { ok: false, reason: "busy" };
  if (read.outcome === "failed" && read.records.length === 0) {
    logWatch("[sleep] soat javob bermadi");
    return { ok: false, reason: "noReply" };
  }

  const fresh: SleepSegment[] = [];
  for (const r of read.records) {
    const seg = toSegment(r);
    // Tekshirish uchun: qator uzunligi va davomiylik (kodlash taxminini soatda tasdiqlash).
    logWatch(
      `[sleep] ${r.precise ? "aniq" : "oddiy"} all=${num(r.all)} deep=${num(r.deep)} light=${num(r.light)} ` +
        `wake=${num(r.wake)} q=${num(r.quality)} line=${typeof r.line === "string" ? r.line.length : 0} ` +
        `pt=${num(r.pointSec)} ${seg ? `${Math.round((seg.up - seg.down) / 60000)} daq` : "yaroqsiz"}`,
    );
    if (seg) fresh.push(seg);
  }

  await loadSleep();
  const freshDowns = new Set(fresh.map((s) => s.down));
  const keepFrom = Date.now() - KEEP_DAYS * DAY_MS;
  const merged = [...fresh, ...(segmentsCache ?? []).filter((s) => !freshDowns.has(s.down))]
    .filter((s) => s.up >= keepFrom)
    .sort((a, b) => b.down - a.down);
  segmentsCache = merged;
  syncedAt = Date.now();
  await Promise.all([setJSON(STORE_KEY, merged), setJSON(SYNCED_AT_KEY, syncedAt)]);
  notify();
  logWatch(`[sleep] ${read.outcome}: ${fresh.length} bo'lak`);
  return { ok: true, nights: groupNights(fresh).length };
}
