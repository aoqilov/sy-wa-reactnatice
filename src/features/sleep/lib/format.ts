import type { Translate } from "@/shared/i18n/use-t";

const pad = (n: number) => String(n).padStart(2, "0");

/** 440 → "7 s 20 daq" (tilga qarab). */
export function formatDuration(min: number, t: Translate): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t("sleep.dur.m", { m });
  if (m === 0) return t("sleep.dur.h", { h });
  return t("sleep.dur.hm", { h, m });
}

/** Soat:daqiqa. */
export function clock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Kun boshidan daqiqa → "HH:MM" (o'rtacha yotish vaqti uchun; 24 dan oshsa aylanadi). */
export function clockFromMinutes(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "YYYY-MM-DD" → "16.11" */
export function shortDate(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
}

/** "YYYY-MM-DD" → hafta kuni indeksi (0 — yakshanba). */
export function weekday(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
