import { isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import { logWatch } from "@/shared/watch/watch-log";
import { runWatchTask } from "@/shared/watch/watch-queue";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";

// Soatning o'zida saqlangan eslatmalar (WatchController.kt, "Soatdagi eslatmalar"):
//  - salomatlik eslatmalari: harakatsizlik ("Get up and move"), suv, ko'zga dam, sport, dori, o'qish, tashqariga
//    chiqish, qo'l yuvish — har biri yoqiq/o'chiq, vaqt oralig'i va necha daqiqada bir;
//  - harakatsizlik eslatmasining eski API'si (long seat): salomatlik eslatmalari yo'q soatlarda;
//  - puls ogohlantirishi: puls chegaradan chiqsa soat ogohlantiradi.
// Soat qo'llamaydiganlari null bo'ladi va ro'yxatda chiqmaydi.

export type HealthType =
  | "SEDENTARY"
  | "DRINK_WATER"
  | "OVERLOOK"
  | "SPORTS"
  | "TAKE_MEDICINE"
  | "READING"
  | "GOING_OUT"
  | "WASH";

/** Vaqtlar kun boshidan daqiqada; `interval` — daqiqa. */
export type HealthRemind = { type: HealthType; on: boolean; start: number; end: number; interval: number };
/** `threshold` — necha daqiqa harakatsizlikdan keyin eslatadi. */
export type LongSeat = { on: boolean; start: number; end: number; threshold: number };
export type HeartWarning = { on: boolean; high: number; low: number };

export type WatchReminders = { health: HealthRemind[] | null; longSeat: LongSeat | null; heart: HeartWarning | null };

export type WatchReminderFailure = "notReady" | "busy" | "outdated" | "failed" | "noReply";
export type Result<T> = { ok: true; value: T } | { ok: false; reason: WatchReminderFailure };

const HEALTH_TYPES: HealthType[] = [
  "SEDENTARY",
  "DRINK_WATER",
  "OVERLOOK",
  "SPORTS",
  "TAKE_MEDICINE",
  "READING",
  "GOING_OUT",
  "WASH",
];
const READ_MS = 8_000;
/** Eslatmalar kelib turgan bo'lsa-yu, "tugadi" kelmasa: shuncha jimlikdan keyin borlari bilan yakunlanadi. */
const ITEMS_IDLE_MS = 2_500;
const SET_MS = 6_000;
/** SDK buyruqlarni parallel bajarmaydi: o'qishlar orasida kichik tanaffus. */
const GAP_MS = 300;

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function watchRemindersAvailable(): boolean {
  return !!watchModule && typeof watchModule.readHealthReminds === "function";
}

function precheck(): WatchReminderFailure | null {
  if (!watchModule || getWatchConnection().status !== "ready") return "notReady";
  if (!watchRemindersAvailable()) return "outdated";
  if (isMeasuring()) return "busy";
  return null;
}

function healthOf(v: unknown): HealthRemind | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const type = r.type as HealthType;
  if (!HEALTH_TYPES.includes(type)) return null;
  return { type, on: r.on === true, start: num(r.start), end: num(r.end, 1440), interval: num(r.interval, 60) };
}

/** Hodisalarni tinglaydi: `onEvent` natija qaytarsa yakunlanadi; vaqt tugasa — `onTimeout()`. */
function listen<T>(
  types: string[],
  ms: number,
  send: () => void,
  onEvent: (e: WatchEvent, finish: (v: T) => void, touch: (ms: number) => void) => void,
  onTimeout: () => T,
): Promise<T> {
  const watch = watchModule;
  if (!watch) return Promise.resolve(onTimeout());
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = (v: T) => {
      clearTimeout(timer);
      sub.remove();
      resolve(v);
    };
    const touch = (after: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(onTimeout()), after);
    };
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (types.includes(e.type)) onEvent(e, finish, touch);
    });
    touch(ms);
    try {
      send();
    } catch {
      finish(onTimeout());
    }
  });
}

function readHealth(): Promise<HealthRemind[] | null> {
  const items = new Map<HealthType, HealthRemind>();
  const collected = () => (items.size > 0 ? HEALTH_TYPES.flatMap((t) => (items.has(t) ? [items.get(t)!] : [])) : null);
  return listen<HealthRemind[] | null>(
    ["healthRemind"],
    READ_MS,
    () => watchModule?.readHealthReminds(),
    (e, finish, touch) => {
      if (e.op === "item") {
        const h = healthOf(e.item);
        if (h) items.set(h.type, h);
        touch(ITEMS_IDLE_MS);
      } else if (e.op === "read" || e.op === "readFailed" || e.op === "unsupported") {
        finish(collected());
      }
    },
    collected,
  );
}

const readLongSeat = () =>
  listen<LongSeat | null>(
    ["longSeat"],
    READ_MS,
    () => watchModule?.readLongSeat(),
    (e, finish) => {
      const s = String(e.status);
      if (s === "UNSUPPORT" || s.endsWith("FAIL")) return finish(null);
      finish({ on: e.on === true, start: num(e.start), end: num(e.end, 1440), threshold: num(e.threshold, 60) });
    },
    () => null,
  );

const readHeart = () =>
  listen<HeartWarning | null>(
    ["heartWarning"],
    READ_MS,
    () => watchModule?.readHeartWarning(),
    (e, finish) => {
      const s = String(e.status);
      if (s === "UNSUPPORT" || s.endsWith("FAIL")) return finish(null);
      finish({ on: e.on === true, high: num(e.high, 120), low: num(e.low, 40) });
    },
    () => null,
  );

/** Uchala guruhni ketma-ket o'qiydi. */
export async function readWatchReminders(): Promise<Result<WatchReminders>> {
  const pre = precheck();
  if (pre) return { ok: false, reason: pre };
  const value = await runWatchTask("reminders", async () => {
    const health = await readHealth();
    await wait(GAP_MS);
    // Salomatlik eslatmalarida harakatsizlik bo'lsa, eski API so'ralmaydi (bir xil sozlama ikki joyda chiqmasin).
    const longSeat = health?.some((h) => h.type === "SEDENTARY") ? null : await readLongSeat();
    await wait(GAP_MS);
    const heart = await readHeart();
    return { health, longSeat, heart };
  });
  if (value === null) return { ok: false, reason: "busy" };
  logWatch(
    `[reminders] health=${value.health ? value.health.map((h) => `${h.type}:${h.on ? 1 : 0}`).join(",") : "yo'q"} ` +
      `longSeat=${value.longSeat ? (value.longSeat.on ? "on" : "off") : "yo'q"} heart=${value.heart ? (value.heart.on ? "on" : "off") : "yo'q"}`,
  );
  if (!value.health && !value.longSeat && !value.heart) return { ok: false, reason: "noReply" };
  return { ok: true, value };
}

/** Saqlash javobidagi holat: OPEN_SUCCESS — yoqildi, CLOSE_SUCCESS — o'chirildi. */
const onAfter = (status: string, wanted: boolean) =>
  status.startsWith("OPEN") ? true : status.startsWith("CLOSE") ? false : wanted;

async function write<T>(task: () => Promise<T | null>): Promise<Result<T>> {
  const pre = precheck();
  if (pre) return { ok: false, reason: pre };
  const done = await runWatchTask("reminders", async () => ({ v: await task() }));
  if (done === null) return { ok: false, reason: "busy" };
  return done.v === null ? { ok: false, reason: "failed" } : { ok: true, value: done.v };
}

export const saveHealthRemind = (r: HealthRemind) =>
  write(() =>
    listen<HealthRemind | null>(
      ["healthRemind"],
      SET_MS,
      () => watchModule?.setHealthRemind(r.type, r.on, r.start, r.end, r.interval),
      (e, finish) => {
        if (e.op === "set") finish(healthOf(e.item) ?? r);
        else if (e.op === "setFailed" || e.op === "unsupported") finish(null);
      },
      () => null,
    ),
  );

export const saveLongSeat = (r: LongSeat) =>
  write(() =>
    listen<LongSeat | null>(
      ["longSeat"],
      SET_MS,
      () => watchModule?.setLongSeat(r.on, r.start, r.end, r.threshold),
      (e, finish) => {
        const s = String(e.status);
        finish(
          s.endsWith("SUCCESS")
            ? { on: onAfter(s, r.on), start: num(e.start, r.start), end: num(e.end, r.end), threshold: num(e.threshold, r.threshold) }
            : null,
        );
      },
      () => null,
    ),
  );

export const saveHeartWarning = (r: HeartWarning) =>
  write(() =>
    listen<HeartWarning | null>(
      ["heartWarning"],
      SET_MS,
      () => watchModule?.setHeartWarning(r.on, r.high, r.low),
      (e, finish) => {
        const s = String(e.status);
        finish(s.endsWith("SUCCESS") ? { on: onAfter(s, r.on), high: num(e.high, r.high), low: num(e.low, r.low) } : null);
      },
      () => null,
    ),
  );
