import type { BloodParts, RawReading } from "@/shared/watch/measure";
import { getJSON, setJSON } from "@/shared/storage/storage";

import type { Metric, MetricKey, MetricStatus } from "../api/get-metrics";
import { bloodRows, bloodSummary } from "./blood";

// Soatdan olingan haqiqiy o'lchovlar: telefon xotirasida saqlanadi (ilova yopilib ochilsa ham qoladi).
// Bu faqat ma'lumot, tibbiy tashxis emas: holat yorlig'i umumiy me'yorlar bo'yicha (normalRange bilan mos).

export type StoredReading = {
  key: MetricKey;
  value: string; // "72", "126/82", "36.6"
  status: MetricStatus;
  statusLabel: string;
  at: number; // ms
  /** Qon tahlili: beshta qiymat birga (natija kartasida hammasi bitta joyda ko'rinadi). */
  blood?: BloodParts;
};

const STORAGE_KEY = "readings.v1";
const MAX_READINGS = 300;
const HISTORY_SHOWN = 20;

export async function loadReadings(): Promise<StoredReading[]> {
  return (await getJSON<StoredReading[]>(STORAGE_KEY)) ?? [];
}

export function saveReadings(readings: StoredReading[]): Promise<void> {
  return setJSON(STORAGE_KEY, readings.slice(0, MAX_READINGS));
}

export function prependReading(readings: StoredReading[], next: StoredReading): StoredReading[] {
  return [next, ...readings].slice(0, MAX_READINGS);
}

// ---- Holatni baholash ----

type Grade = { status: MetricStatus; label: string };
const NORMAL: Grade = { status: "normal", label: "Normal" };

function gradePulse(v: number): Grade {
  if (v < 40) return { status: "danger", label: "Juda past" };
  if (v < 60) return { status: "warning", label: "Past" };
  if (v <= 100) return NORMAL;
  if (v <= 120) return { status: "warning", label: "Biroz yuqori" };
  return { status: "danger", label: "Yuqori" };
}

function gradeOxygen(v: number): Grade {
  if (v >= 95) return NORMAL;
  if (v >= 90) return { status: "warning", label: "Past" };
  return { status: "danger", label: "Juda past" };
}

function gradeTemperature(v: number): Grade {
  if (v < 35.5) return { status: "danger", label: "Juda past" };
  if (v < 36.1) return { status: "warning", label: "Past" };
  if (v <= 37.2) return NORMAL;
  if (v <= 38) return { status: "warning", label: "Biroz yuqori" };
  return { status: "danger", label: "Yuqori" };
}

// Shakar har qanday vaqtda o'lchanadi (ovqatdan keyin ham), shuning uchun normal chegara 3.9–7.8 mmol/l
// (och qoringa 3.9–5.6, ovqatdan 2 soat keyin < 7.8). Soat qiymati optik, taxminiy.
function gradeSugar(v: number): Grade {
  if (v < 3.0) return { status: "danger", label: "Juda past" };
  if (v < 3.9) return { status: "warning", label: "Past" };
  if (v <= 7.8) return NORMAL;
  if (v <= 11.0) return { status: "warning", label: "Biroz yuqori" };
  return { status: "danger", label: "Yuqori" };
}

const SUGAR_RISK: Record<string, string> = { LOW: "soat: past xavf", MIDDLE: "soat: o'rta xavf", HIGH: "soat: yuqori xavf" };

function gradePressure(sys: number, dia: number): Grade {
  if (sys >= 140 || dia >= 90) return { status: "danger", label: "Yuqori" };
  if (sys < 80 || dia < 50) return { status: "danger", label: "Juda past" };
  if (sys < 90 || dia < 60) return { status: "warning", label: "Past" };
  if (sys >= 120 || dia >= 80) return { status: "warning", label: "Biroz yuqori" };
  return NORMAL;
}

/**
 * Son qiymat(lar) bo'yicha holat — Home ham, History ham shu chegaralardan foydalanadi. Bosim: [yuqori, quyi];
 * EKG: [puls]. Qon tahlili beshta ko'rsatkichdan iborat, uning holati `bloodSummary` da (bu yerda "normal").
 */
export function statusFor(key: MetricKey, nums: number[]): MetricStatus {
  const [a, b] = nums;
  switch (key) {
    case "pulse":
    case "ecg":
      return gradePulse(a).status;
    case "oxygen":
      return gradeOxygen(a).status;
    case "temperature":
      return gradeTemperature(a).status;
    case "sugar":
      return gradeSugar(a).status;
    case "pressurePump":
      return gradePressure(a, b).status;
    case "blood":
      return "normal";
  }
}

/** Soatdan kelgan xom natijani saqlanadigan ko'rinishga o'giradi. */
export function toStoredReading(raw: RawReading, at = Date.now()): StoredReading {
  switch (raw.key) {
    case "pulse": {
      const g = gradePulse(raw.value);
      return { key: raw.key, value: String(raw.value), status: g.status, statusLabel: g.label, at };
    }
    case "oxygen": {
      const g = gradeOxygen(raw.value);
      return { key: raw.key, value: String(raw.value), status: g.status, statusLabel: g.label, at };
    }
    case "temperature": {
      const g = gradeTemperature(raw.value);
      return { key: raw.key, value: raw.value.toFixed(1), status: g.status, statusLabel: g.label, at };
    }
    case "sugar": {
      const g = gradeSugar(raw.value);
      const extras = [raw.risk && SUGAR_RISK[raw.risk], "taxminiy"].filter(Boolean);
      return { key: raw.key, value: raw.value.toFixed(1), status: g.status, statusLabel: [g.label, ...extras].join(" · "), at };
    }
    case "blood": {
      const s = bloodSummary(raw.parts);
      return { key: raw.key, value: s.value, status: s.status, statusLabel: `${s.label} · taxminiy`, at, blood: raw.parts };
    }
    case "pressurePump": {
      const g = gradePressure(raw.sys, raw.dia);
      return { key: raw.key, value: `${raw.sys}/${raw.dia}`, status: g.status, statusLabel: g.label, at };
    }
    case "ecg": {
      // Qiymat — EKG paytidagi puls. Ritm tahlili (kasallik belgilari) Veepoo'ning pullik funksiyasi, shuning uchun
      // holat faqat puls bo'yicha; soat bergan HRV va QTc yorliqqa qo'shiladi.
      const g = gradePulse(raw.value);
      const extras = [raw.hrv !== undefined && `HRV ${raw.hrv} ms`, raw.qtc !== undefined && `QTc ${raw.qtc} ms`].filter(Boolean);
      return { key: raw.key, value: String(raw.value), status: g.status, statusLabel: [g.label, ...extras].join(" · "), at };
    }
  }
}

// ---- Ko'rsatish ----

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function relativeTime(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "Hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const d = new Date(at);
  if (sameDay(d, new Date(now))) return `${Math.floor(minutes / 60)} soat oldin`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${hhmm(d)}`;
}

/** "126/82" -> [126, 82]; "72" -> [72]. */
const parts = (value: string) => value.split("/").map(Number);

function summarize(key: MetricKey, today: StoredReading[]): Metric["summary"] {
  // Qon tahlili beshta ko'rsatkichdan iborat: bitta son bo'yicha min/o'rtacha/maks ma'nosiz.
  if (today.length === 0 || key === "blood") return { min: "--", avg: "--", max: "--" };
  const columns = parts(today[0].value).map((_, i) => today.map((r) => parts(r.value)[i]));
  const decimals = key === "temperature" || key === "sugar" ? 1 : 0;
  const fmt = (n: number) => n.toFixed(decimals);
  const join = (pick: (xs: number[]) => number) => columns.map((xs) => fmt(pick(xs))).join("/");
  // Bosim juftligida (sistolik/diastolik) har bir qism alohida min/o'rtacha/maks.
  return {
    min: join((xs) => Math.min(...xs)),
    avg: join((xs) => xs.reduce((s, n) => s + n, 0) / xs.length),
    max: join((xs) => Math.max(...xs)),
  };
}

/** O'lchov kartasini saqlangan natijalar bilan to'ldiradi (natija bo'lmasa o'zgarishsiz). */
export function applyReadings(metric: Metric, all: StoredReading[], now = Date.now()): Metric {
  const mine = all.filter((r) => r.key === metric.key);
  if (mine.length === 0) return metric;

  const last = mine[0];
  const today = mine.filter((r) => sameDay(new Date(r.at), new Date(now)));
  return {
    ...metric,
    value: last.value,
    status: last.status,
    statusLabel: last.statusLabel,
    updatedAt: relativeTime(last.at, now),
    summary: summarize(metric.key, today),
    blood: last.blood ? bloodRows(last.blood) : undefined,
    history: mine.slice(0, HISTORY_SHOWN).map((r) => {
      const d = new Date(r.at);
      return { time: sameDay(d, new Date(now)) ? hhmm(d) : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${hhmm(d)}`, value: r.value };
    }),
  };
}
