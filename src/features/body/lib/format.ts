import type { Translate } from "@/shared/i18n/use-t";

const pad = (n: number) => String(n).padStart(2, "0");

/** "Bugun 09:14", "Kecha 21:03", "12.11 09:14" (boshqa yil bo'lsa "12.11.2025"). */
export function whenText(at: number, t: Translate, now = new Date()): string {
  const d = new Date(at);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `${t("body.today")} ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `${t("body.yesterday")} ${time}`;
  return `${dateText(at, now)} ${time}`;
}

/** "16.11.2026 09:14" (EKG yozuvlari bilan bir xil). */
export function dateTimeText(at: number): string {
  const d = new Date(at);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "12.11" yoki boshqa yil bo'lsa "12.11.2025". */
export function dateText(at: number, now = new Date()): string {
  const d = new Date(at);
  const base = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base}.${d.getFullYear()}`;
}
