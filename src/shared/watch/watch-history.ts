import watchModule, { type WatchEvent } from "../../../modules/veepoo-watch";
import { getJSON, setJSON } from "../storage/storage";
import { type BloodParts, type GlucoseRisk, isMeasuring } from "./measure";
import { getWatchConnection } from "./watch-connection";
import { logWatch } from "./watch-log";

// History sinxroni: soat xotirasida saqlangan o'lchovlar (soatning o'zida yoki ilovadan o'lchanganlar). Andoza —
// `synapse-soat` dagi `loadHistory` (veb ilova): oxirgi kunlarning yozuvlari tur bo'yicha o'qiladi. Android SDK bir
// so'rovda bir necha turni o'qiydi (`readDeviceManualData`, native `readManualData`). Natija telefonga saqlanadi:
// History soat ulanmagan paytda ham ochiladi, sinxron esa faqat yangisini qo'shadi.

export type WatchRecordKind = "bp" | "hr" | "spo2" | "temp" | "glucose" | "blood" | "hrv";

/** `auto` — soat "Rejam" jadvali bo'yicha o'zi o'lchagan (kunlik 5 daqiqalik ma'lumotdan). */
export type WatchRecord = (
  | { kind: "bp"; at: number; sys: number; dia: number; hr?: number }
  | { kind: "hr" | "spo2" | "temp" | "hrv"; at: number; value: number }
  | { kind: "glucose"; at: number; value: number; risk?: GlucoseRisk }
  | { kind: "blood"; at: number; parts: BloodParts }
) & { auto?: boolean };

export type SyncResult = { ok: true; added: number } | { ok: false; reason: SyncFailure };
/** notReady — soat ulanmagan; busy — o'lchov ketyapti; outdated — eski APK; noReply / failed — soat javob bermadi. */
export type SyncFailure = "notReady" | "busy" | "outdated" | "noReply" | "failed";

const KINDS: WatchRecordKind[] = ["bp", "hr", "spo2", "temp", "glucose", "blood", "hrv"];
const RECORDS_KEY = "watchHistory.v1";
const SYNCED_AT_KEY = "watchHistory.syncedAt";
const KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Soatdan shuncha vaqt hech narsa kelmasa, o'qish tugadi deb hisoblanadi (ba'zi turlarga soat javob bermaydi). */
const IDLE_MS = 8_000;
const MAX_MS = 45_000;
/** Kunlik ma'lumot ko'p (kuniga 288 ta 5 daqiqalik yozuv): uzoqroq kutiladi. */
const DAILY_IDLE_MS = 15_000;
const DAILY_MAX_MS = 120_000;
/** Puls va SpO2 soatda deyarli uzluksiz yoziladi: tarix to'lib ketmasligi uchun shuncha vaqtlik o'rtachaga yig'iladi. */
const DAILY_BUCKET_MS = 30 * 60 * 1000;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const inRange = (v: number | undefined, lo: number, hi: number) => (v !== undefined && v >= lo && v <= hi ? v : undefined);
const round = (v: number, step: number) => Math.round(v / step) * step;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * SDK birlikka o'giradi, lekin firmware'ga qarab xom son kelib qolsa ham noto'g'ri qiymat chiqmasin: chegaradan
 * oshsa, SDK'ning o'z bo'luvchisi bilan qayta o'giramiz (harorat /10, shakar va lipidlar /100, siydik kislotasi /10).
 */
function scaled(v: number | undefined, max: number, divisor: number): number | undefined {
  if (v === undefined) return undefined;
  return v > max ? v / divisor : v;
}

function toRecord(kind: WatchRecordKind, r: Record<string, unknown>): WatchRecord | undefined {
  const sec = num(r.at);
  if (sec === undefined || sec <= 0) return undefined;
  const at = sec * 1000;
  if (at > Date.now() + DAY_MS) return undefined; // soat vaqti noto'g'ri
  switch (kind) {
    case "bp": {
      const sys = inRange(num(r.sys), 50, 300);
      const dia = inRange(num(r.dia), 20, 250);
      if (sys === undefined || dia === undefined || sys <= dia) return undefined;
      return { kind, at, sys, dia, hr: inRange(num(r.hr), 30, 250) };
    }
    case "hr":
    case "spo2": {
      const [lo, hi] = kind === "hr" ? [30, 250] : [70, 100];
      const values = (Array.isArray(r.values) ? r.values : []).map(num).filter((v): v is number => v !== undefined && v >= lo && v <= hi);
      return values.length ? { kind, at, value: median(values) } : undefined;
    }
    case "temp": {
      const v = inRange(scaled(num(r.value), 45, 10), 30, 45);
      return v === undefined ? undefined : { kind, at, value: round(v, 0.1) };
    }
    case "glucose": {
      const v = inRange(scaled(num(r.value), 35, 100), 1, 35);
      if (v === undefined) return undefined;
      const risk = r.risk === "LOW" || r.risk === "MIDDLE" || r.risk === "HIGH" ? r.risk : undefined;
      return { kind, at, value: round(v, 0.1), risk };
    }
    case "blood": {
      const uricAcid = inRange(scaled(num(r.uricAcid), 1200, 10), 50, 1200);
      const tcho = inRange(scaled(num(r.tcho), 20, 100), 1, 20);
      const tag = inRange(scaled(num(r.tag), 20, 100), 0.1, 20);
      const hdl = inRange(scaled(num(r.hdl), 6, 100), 0.1, 6);
      const ldl = inRange(scaled(num(r.ldl), 15, 100), 0.1, 15);
      if (uricAcid === undefined || tcho === undefined || tag === undefined || hdl === undefined || ldl === undefined) {
        return undefined;
      }
      return { kind, at, parts: { uricAcid, tcho, tag, hdl, ldl } };
    }
    case "hrv": {
      // Soat bitta o'lchovda bir nechta qiymat (ms) yuboradi: medianasi.
      const values = (Array.isArray(r.values) ? r.values : []).map(num).filter((v): v is number => v !== undefined && v >= 5 && v <= 300);
      return values.length ? { kind, at, value: median(values) } : undefined;
    }
  }
}

const idOf = (r: WatchRecord) => `${r.auto ? "auto" : "manual"}-${r.kind}-${r.at}`;

export async function loadWatchHistory(): Promise<WatchRecord[]> {
  return (await getJSON<WatchRecord[]>(RECORDS_KEY)) ?? [];
}

export async function loadLastSync(): Promise<number | null> {
  return getJSON<number>(SYNCED_AT_KEY);
}

type ReadOutcome = "complete" | "failed" | "idle";

/**
 * Bitta o'qish oqimi: `start()` so'rovni yuboradi, `onEvent` shu turdagi hodisalarni yig'adi. `complete`/`failed`
 * (yoki `timeout`) kelguncha yoki `idleMs` jimlik / `maxMs` chegara o'tguncha kutiladi.
 */
function readStream(
  type: string,
  start: () => void,
  onRecords: (e: WatchEvent) => void,
  idleMs: number,
  maxMs: number,
): Promise<ReadOutcome> {
  const watch = watchModule;
  if (!watch) return Promise.resolve("failed");
  return new Promise<ReadOutcome>((resolve) => {
    let heard = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const finish = (how: ReadOutcome) => {
      clearTimeout(idle);
      clearTimeout(cap);
      subscription.remove();
      resolve(how);
    };
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => finish("idle"), idleMs);
    };
    const subscription = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== type) return;
      heard = true;
      touch();
      if (e.complete === true) return finish("complete");
      if (e.failed === true) return finish("failed");
      onRecords(e);
      if (e.timeout === true) finish("idle");
    });
    const cap = setTimeout(() => finish(heard ? "idle" : "failed"), maxMs);
    touch();
    try {
      start();
    } catch {
      finish("failed");
    }
  });
}

/** Kunlik 5 daqiqalik yozuv → avto-o'lchov yozuvlari (puls va SpO2 hali yig'ilmagan, 5 daqiqalik). */
function fromDaily(r: Record<string, unknown>): WatchRecord[] {
  const [y, mo, d, h, mi] = [r.y, r.mo, r.d, r.h, r.mi].map(num);
  if (y === undefined || mo === undefined || d === undefined || h === undefined || mi === undefined) return [];
  const at = new Date(y, mo - 1, d, h, mi).getTime();
  if (!Number.isFinite(at) || at > Date.now() + DAY_MS) return [];
  const out: WatchRecord[] = [];
  const values = (v: unknown) => (Array.isArray(v) ? v.map(num).filter((x): x is number => x !== undefined) : []);

  const hrs = values(r.hrs).filter((x) => x >= 30 && x <= 250);
  const hr = hrs.length ? median(hrs) : inRange(num(r.hr), 30, 250);
  if (hr !== undefined) out.push({ kind: "hr", at, value: hr, auto: true });

  const spo2 = values(r.spo2).filter((x) => x >= 70 && x <= 100);
  if (spo2.length) out.push({ kind: "spo2", at, value: median(spo2), auto: true });

  const sys = inRange(num(r.sys), 50, 300);
  const dia = inRange(num(r.dia), 20, 250);
  if (sys !== undefined && dia !== undefined && sys > dia) out.push({ kind: "bp", at, sys, dia, auto: true });

  const temp = inRange(scaled(num(r.temp), 45, 10), 30, 45);
  if (temp !== undefined) out.push({ kind: "temp", at, value: round(temp, 0.1), auto: true });

  const glucose = inRange(scaled(num(r.glucose), 35, 100), 1, 35);
  if (glucose !== undefined) out.push({ kind: "glucose", at, value: round(glucose, 0.1), auto: true });

  if (r.blood && typeof r.blood === "object") {
    const rec = toRecord("blood", { ...(r.blood as Record<string, unknown>), at: at / 1000 });
    if (rec) out.push({ ...rec, auto: true });
  }
  return out;
}

/** Puls va SpO2: 30 daqiqalik bo'laklarga yig'ish (median), vaqti — bo'lak boshi. */
function bucketContinuous(records: WatchRecord[]): WatchRecord[] {
  const groups = new Map<string, { kind: "hr" | "spo2"; at: number; values: number[] }>();
  const rest: WatchRecord[] = [];
  for (const r of records) {
    if (r.kind !== "hr" && r.kind !== "spo2") {
      rest.push(r);
      continue;
    }
    const at = Math.floor(r.at / DAILY_BUCKET_MS) * DAILY_BUCKET_MS;
    const key = `${r.kind}-${at}`;
    const g = groups.get(key) ?? { kind: r.kind, at, values: [] };
    g.values.push(r.value);
    groups.set(key, g);
  }
  const merged = [...groups.values()].map((g) => ({ kind: g.kind, at: g.at, value: median(g.values), auto: true }) as WatchRecord);
  return [...rest, ...merged];
}

/**
 * Soatdan oxirgi `days` kunning yozuvlarini o'qib, saqlanganlariga qo'shadi (takrorlanmaydi). Ikki bosqich, ketma-ket
 * (soat bir ishni bajaradi): 1) soatda qo'lda o'lchanganlar (`readManualData`); 2) avto-o'lchovlar — kunlik
 * 5 daqiqalik ma'lumot (`readDailyData`, soat saqlagan kunlar, odatda 3).
 */
export async function syncWatchHistory(days: number): Promise<SyncResult> {
  const watch = watchModule;
  if (!watch || getWatchConnection().status !== "ready") return { ok: false, reason: "notReady" };
  if (isMeasuring()) return { ok: false, reason: "busy" };
  if (typeof watch.readManualData !== "function") return { ok: false, reason: "outdated" };

  // Qo'lda o'lchovlar: oxirgi sinxrondan 1 kun oldingisidan (birinchi marta — `days` kun). Soat kam yozuv yuboradi.
  const lastSync = await loadLastSync();
  const sinceMs = Math.max(Date.now() - days * DAY_MS, lastSync !== null ? lastSync - DAY_MS : 0);
  const since = Math.floor(sinceMs / 1000);
  const found: WatchRecord[] = [];

  const manual = await readStream(
    "manualData",
    () => watch.readManualData(since, KINDS),
    (e) => {
      const kind = KINDS.find((k) => k === e.kind);
      if (!kind || !Array.isArray(e.records)) return;
      for (const raw of e.records as Record<string, unknown>[]) {
        const rec = toRecord(kind, raw);
        if (rec) found.push(rec);
      }
    },
    IDLE_MS,
    MAX_MS,
  );

  // Avto-o'lchovlar (kunlik 5 daqiqalik ma'lumot). Yangi APK'da faqat yangi qism o'qiladi (readDailyIncremental),
  // eskisida — avvalgidek hamma kunlar boshidan.
  let daily: ReadOutcome = "failed";
  /** Avto yozuvlari almashtiriladigan vaqt oraliqlari [from, to): shu oraliqdagi eski avto yozuvlar o'chadi. */
  let replace: [number, number][] = [];
  if (getWatchConnection().status === "ready" && !isMeasuring()) {
    if (typeof watch.readDailyDay === "function") {
      const inc = await readDailyIncremental();
      daily = inc.outcome;
      replace = inc.replace;
      found.push(...inc.records);
    } else if (typeof watch.readDailyData === "function") {
      const auto: WatchRecord[] = [];
      daily = await readStream(
        "dailyData",
        () => watch.readDailyData(days),
        (e) => {
          if (!Array.isArray(e.records)) return;
          for (const raw of e.records as Record<string, unknown>[]) auto.push(...fromDaily(raw));
        },
        DAILY_IDLE_MS,
        DAILY_MAX_MS,
      );
      found.push(...bucketContinuous(auto));
      if (daily === "complete") replace = [[Date.now() - days * DAY_MS, Infinity]];
    }
  }

  if (manual !== "complete" && daily !== "complete" && found.length === 0) {
    logWatch(`[historySync] manual ${manual}, daily ${daily}, yozuv yo'q`);
    return { ok: false, reason: manual === "failed" && daily === "failed" ? "failed" : "noReply" };
  }

  const saved = await loadWatchHistory();
  // O'qilgan oraliqlarning avto yozuvlari yangisi bilan almashtiriladi (30 daqiqalik bo'lak to'lib borgan bo'lishi
  // mumkin). Qo'lda o'lchovlar esa faqat qo'shiladi.
  const inReplaced = (at: number) => replace.some(([from, to]) => at >= from && at < to);
  const kept = saved.filter((r) => !(r.auto && inReplaced(r.at)));
  const known = new Set(kept.map(idOf));
  const fresh = found.filter((r) => !known.has(idOf(r)));
  const keepFrom = Date.now() - KEEP_DAYS * DAY_MS;
  const merged = [...fresh, ...kept].filter((r) => r.at >= keepFrom).sort((a, b) => b.at - a.at);
  await setJSON(RECORDS_KEY, merged);
  await setJSON(SYNCED_AT_KEY, Date.now());
  const added = fresh.length - (saved.length - kept.length);
  logWatch(`[historySync] manual ${manual}, daily ${daily}: ${found.length} yozuv, ${Math.max(0, added)} yangi`);
  return { ok: true, added: Math.max(0, added) };
}

// ---------------------------------------------------------------- kunlik ma'lumot: faqat yangi qism

const CURSOR_KEY = "watchHistory.dailyCursor.v1";
/** Bugungi kunni shuncha paket (5 daqiqadan, ya'ni 1 soat) orqadan qayta o'qiymiz: oxirgi 30 daqiqalik bo'lak to'lsin. */
const OVERLAP_PACKAGES = 12;
const DEFAULT_WATCH_DAYS = 3;

type DailyCursor = {
  /** Bugungi kun ("YYYY-MM-DD") va unda oxirgi o'qilgan paketlar soni. */
  day: string;
  packages: number;
  /** To'liq o'qilgan o'tgan kunlar: ular endi o'zgarmaydi, qayta o'qilmaydi. */
  doneDays: string[];
  watchDays: number;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfDay = (offset: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime();
};

/**
 * Sinxronning sekin qismi shu edi: har safar soatdagi barcha kunlar (kuniga 288 tagacha paket) boshidan o'qilardi.
 * Endi: o'tgan kunlar bir marta to'liq o'qiladi (ular o'zgarmaydi), bugun esa oxirgi o'qilgan joydan
 * (1 soat orqadan) davom etadi. Natijadagi `replace` — shu o'qishda yangilangan vaqt oraliqlari.
 */
async function readDailyIncremental(): Promise<{ outcome: ReadOutcome; records: WatchRecord[]; replace: [number, number][] }> {
  const watch = watchModule;
  if (!watch) return { outcome: "failed", records: [], replace: [] };
  const saved = await getJSON<DailyCursor>(CURSOR_KEY);
  const today = dateKey(new Date());
  const cursor: DailyCursor = {
    day: saved?.day ?? "",
    packages: saved?.packages ?? 0,
    doneDays: saved?.doneDays ?? [],
    watchDays: saved?.watchDays ?? DEFAULT_WATCH_DAYS,
  };

  const records: WatchRecord[] = [];
  const replace: [number, number][] = [];
  let outcome: ReadOutcome = "failed";

  const readDay = async (day: number, position: number) => {
    const auto: WatchRecord[] = [];
    let total: number | null = null;
    const how = await readStream(
      "dailyData",
      () => watch.readDailyDay(day, position),
      (e) => {
        if (typeof e.allPackage === "number") total = Math.max(total ?? 0, e.allPackage);
        if (typeof e.watchDays === "number" && e.watchDays > 0) cursor.watchDays = e.watchDays;
        if (!Array.isArray(e.records)) return;
        for (const raw of e.records as Record<string, unknown>[]) auto.push(...fromDaily(raw));
      },
      DAILY_IDLE_MS,
      DAILY_MAX_MS,
    );
    // Umumiy natija: birortasi to'liq o'qilsa "complete", aks holda eng yaxshisi.
    if (how === "complete") outcome = "complete";
    else if (how === "idle" && outcome === "failed") outcome = "idle";
    return { how, auto, total: total as number | null };
  };

  // 1) O'tgan kunlar (eskisidan): hali to'liq o'qilmaganlari.
  for (let day = cursor.watchDays - 1; day >= 1; day--) {
    const key = dateKey(new Date(startOfDay(day)));
    if (cursor.doneDays.includes(key)) continue;
    if (getWatchConnection().status !== "ready" || isMeasuring()) break;
    const r = await readDay(day, 1);
    if (r.how !== "complete") continue;
    records.push(...bucketContinuous(r.auto));
    replace.push([startOfDay(day), startOfDay(day - 1)]);
    cursor.doneDays.push(key);
  }

  // 2) Bugun: oxirgi o'qilgan joydan 1 soat orqadan (kun almashgan bo'lsa boshidan).
  if (getWatchConnection().status === "ready" && !isMeasuring()) {
    const position = cursor.day === today ? Math.max(1, cursor.packages - OVERLAP_PACKAGES) : 1;
    const r = await readDay(0, position);
    if (r.how === "complete" || r.auto.length > 0) {
      const dayStart = startOfDay(0);
      let from = dayStart;
      let fresh = r.auto;
      if (position > 1) {
        // Birinchi bo'lak qisman o'qilgan bo'lishi mumkin: undan keyingisidan boshlab almashtiramiz, eskisi qoladi.
        const first = Math.min(...r.auto.map((x) => x.at));
        from = Number.isFinite(first) ? Math.floor(first / DAILY_BUCKET_MS) * DAILY_BUCKET_MS + DAILY_BUCKET_MS : Infinity;
        fresh = r.auto.filter((x) => x.at >= from);
      }
      records.push(...bucketContinuous(fresh));
      if (Number.isFinite(from)) replace.push([from, Infinity]);
      if (r.how === "complete") {
        cursor.day = today;
        cursor.packages = r.total ?? cursor.packages;
      }
    }
  }

  // Faqat soat saqlaydigan kunlar eslab qolinadi.
  const oldest = startOfDay(cursor.watchDays + 1);
  cursor.doneDays = cursor.doneDays.filter((k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d).getTime() >= oldest;
  });
  await setJSON(CURSOR_KEY, cursor);
  return { outcome, records, replace };
}
