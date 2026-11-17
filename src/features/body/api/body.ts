import { loadReadings } from "@/features/home/lib/readings";
import { getJSON, setJSON } from "@/shared/storage/storage";
import { isMeasuring, parseBodyParts, type BodyParts } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import { logWatch } from "@/shared/watch/watch-log";
import { runWatchTask } from "@/shared/watch/watch-queue";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";
import { demoBodyEntries } from "./body-demo";

// Tana tarkibi o'lchovlari ikki manbadan:
//  - "app": Home'da ilova orqali o'lchanganlar (features/home/lib/readings.ts, `body` maydoni bilan);
//  - "watch": soatning o'zida o'lchanganlar (readBodyHistory), shu yerda saqlanadi.
// Ilovadan boshlangan o'lchov soat xotirasiga ham yozilishi mumkin: DUPLICATE_MS ichidagi soat yozuvi tashlanadi.

export type BodySource = "app" | "watch";
export type BodyEntry = { id: string; at: number; source: BodySource; parts: BodyParts };
export type BodySyncResult =
  | { ok: true; count: number }
  | { ok: false; reason: "notReady" | "outdated" | "busy" | "noReply" | "unsupported" };

const WATCH_KEY = "body.watch.v1";
const MAX_WATCH = 200;
const DUPLICATE_MS = 3 * 60 * 1000;
const REPLY_MS = 15_000;

/** Expo Go / soatsiz dev: namunaviy ma'lumot bilan dizaynni ko'rish uchun. */
export function bodyDemo(): boolean {
  return __DEV__ && !watchModule;
}

/** Soatdagi tarixni o'qish (yangi native build'da bor). */
export function bodyWatchHistoryAvailable(): boolean {
  return !!watchModule && typeof watchModule.readBodyHistory === "function";
}

let entriesCache: BodyEntry[] | null = null;
let watchCache: BodyEntry[] | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function subscribeBody(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getBodySnapshot(): BodyEntry[] | null {
  return entriesCache;
}

function merge(app: BodyEntry[], watch: BodyEntry[]): BodyEntry[] {
  const unique = watch.filter((w) => !app.some((a) => Math.abs(a.at - w.at) <= DUPLICATE_MS));
  return [...app, ...unique].sort((a, b) => b.at - a.at);
}

/** Ilova o'lchovlari va soat tarixini o'qib, umumiy ro'yxatni yangilaydi (eng yangisi birinchi). */
export async function loadBody(): Promise<BodyEntry[]> {
  if (bodyDemo()) {
    entriesCache ??= demoBodyEntries();
    notify();
    return entriesCache;
  }
  const readings = await loadReadings();
  const app: BodyEntry[] = readings
    .filter((r) => r.key === "bodyComp" && r.body)
    .map((r) => ({ id: `app-${r.at}`, at: r.at, source: "app", parts: r.body as BodyParts }));
  watchCache ??= (await getJSON<BodyEntry[]>(WATCH_KEY)) ?? [];
  entriesCache = merge(app, watchCache);
  notify();
  return entriesCache;
}

function atOf(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const n = (k: string) => (typeof t[k] === "number" ? (t[k] as number) : NaN);
  const ms = new Date(n("y"), n("mo") - 1, n("d"), n("h"), n("mi")).getTime();
  // Soat vaqti noto'g'ri (2000-yil) yoki kelajakda bo'lsa yozuv yaroqsiz.
  return Number.isFinite(ms) && n("y") >= 2020 && ms <= Date.now() + 60_000 ? ms : null;
}

function readFromWatch(): Promise<WatchEvent | null> {
  const watch = watchModule;
  if (!watch) return Promise.resolve(null);
  return new Promise((resolve) => {
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== "bodyHistory") return;
      clearTimeout(timer);
      sub.remove();
      resolve(e);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(null);
    }, REPLY_MS);
    try {
      watch.readBodyHistory();
    } catch {
      clearTimeout(timer);
      sub.remove();
      resolve(null);
    }
  });
}

/** Soatning o'zida o'lchangan natijalarni o'qib saqlaydi. */
export async function syncBodyFromWatch(): Promise<BodySyncResult> {
  if (bodyDemo()) return { ok: false, reason: "notReady" };
  if (!bodyWatchHistoryAvailable()) return { ok: false, reason: "outdated" };
  if (getWatchConnection().status !== "ready") return { ok: false, reason: "notReady" };
  if (isMeasuring()) return { ok: false, reason: "busy" };

  // runWatchTask band bo'lsa null qaytaradi: javob yo'qligi (e: null) bilan adashmasligi uchun o'ralgan.
  const task = await runWatchTask("body", async () => ({ e: await readFromWatch() }));
  if (task === null) return { ok: false, reason: "busy" };
  const read = task.e;
  if (read === null) {
    logWatch("[body] soat javob bermadi");
    return { ok: false, reason: "noReply" };
  }
  if (read.unsupported === true) return { ok: false, reason: "unsupported" };

  const records = Array.isArray(read.records) ? (read.records as Record<string, unknown>[]) : [];
  const fresh: BodyEntry[] = [];
  for (const r of records) {
    const at = atOf(r.at);
    const parts = parseBodyParts(r);
    // Tekshirish uchun: birliklar taxminini soatda tasdiqlash (kg yoki %).
    logWatch(
      `[body] ${at ? new Date(at).toISOString() : "vaqt?"} fat=${String(r.fatPct)}%/${String(r.fatKg)} ` +
        `muscle=${String(r.muscleKg)} water=${String(r.waterPct)}%/${String(r.waterKg)} ` +
        `protein=${String(r.proteinPct)}/${String(r.proteinKg)} ${parts ? "ok" : "yaroqsiz"}`,
    );
    if (at !== null && parts) fresh.push({ id: `watch-${at}`, at, source: "watch", parts });
  }

  watchCache ??= (await getJSON<BodyEntry[]>(WATCH_KEY)) ?? [];
  const freshAt = new Set(fresh.map((e) => e.at));
  watchCache = [...fresh, ...watchCache.filter((e) => !freshAt.has(e.at))]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_WATCH);
  await setJSON(WATCH_KEY, watchCache);
  await loadBody();
  logWatch(`[body] soatdan ${records.length} ta yozuv, ${fresh.length} ta yaroqli`);
  return { ok: true, count: fresh.length };
}
