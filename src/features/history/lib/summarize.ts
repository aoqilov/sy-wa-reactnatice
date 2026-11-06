import type { Metric, MetricStatus } from "@/features/home/api/get-metrics";

import { DECIMALS, formatNums, HistoryReading, statusOf } from "../api/get-history";

export type Period = "today" | "yesterday" | "3d" | "7d" | "15d";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "3d", label: "3 kun" },
  { value: "7d", label: "7 kun" },
  { value: "15d", label: "15 kun" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 24 * 60 * 60 * 1000;

// Davr oralig'i: "3 kun" = bugun bilan birga oxirgi 3 kun. "Kecha" = faqat kecha.
export function periodRange(period: Period, now: Date) {
  const today = startOfDay(now);
  switch (period) {
    case "today":
      return { start: today, end: today + DAY, days: 1 };
    case "yesterday":
      return { start: today - DAY, end: today, days: 1 };
    case "3d":
      return { start: today - 2 * DAY, end: today + DAY, days: 3 };
    case "7d":
      return { start: today - 6 * DAY, end: today + DAY, days: 7 };
    case "15d":
      return { start: today - 14 * DAY, end: today + DAY, days: 15 };
  }
}

export type Summary = {
  meta: Metric;
  count: number;
  avg: string | null; // o'rtacha qiymat ("74", "124/81", EKG uchun "Normal")
  min: string | null;
  max: string | null;
  status: MetricStatus | null; // o'rtacha qiymatga qarab holat
  bars: (number | null)[]; // mini grafik: 1 kunlik davrda har bir o'lchov, ko'p kunlikda har kun o'rtachasi
  readings: HistoryReading[]; // yangisi birinchi
};

const avgOf = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function summarize(meta: Metric, all: HistoryReading[], period: Period, now: Date): Summary {
  const { start, end, days } = periodRange(period, now);
  const readings = all
    .filter((r) => r.key === meta.key && r.at >= start && r.at < end)
    .sort((a, b) => b.at - a.at);

  if (readings.length === 0) {
    return { meta, count: 0, avg: null, min: null, max: null, status: null, bars: [], readings };
  }

  const dec = DECIMALS[meta.key];
  const numeric = readings[0].nums.length > 0; // EKG matnli, uning o'rtachasi yo'q

  let avg: string;
  let min: string | null = null;
  let max: string | null = null;
  let status: MetricStatus;

  if (numeric) {
    const parts = readings[0].nums.length;
    const avgNums = Array.from({ length: parts }, (_, i) => avgOf(readings.map((r) => r.nums[i])));
    avg = formatNums(avgNums, dec);
    status = statusOf(meta.key, avgNums);
    const byFirst = [...readings].sort((a, b) => a.nums[0] - b.nums[0]);
    min = byFirst[0].value;
    max = byFirst[byFirst.length - 1].value;
  } else {
    avg = mostCommon(readings.map((r) => r.value));
    status = readings.some((r) => r.status !== "normal") ? "warning" : "normal";
  }

  // Mini grafik
  let bars: (number | null)[] = [];
  if (numeric) {
    if (days === 1) {
      bars = [...readings].reverse().map((r) => r.nums[0]);
    } else {
      bars = Array.from({ length: days }, (_, i) => {
        const dayStart = start + i * DAY;
        const inDay = readings.filter((r) => r.at >= dayStart && r.at < dayStart + DAY);
        return inDay.length ? avgOf(inDay.map((r) => r.nums[0])) : null;
      });
    }
  }

  return { meta, count: readings.length, avg, min, max, status, bars, readings };
}
