import type { SleepStage } from "../api/sleep";

/** Uyqu kartasi va sahifa rangi (Home kartalari uslubida). */
export const SLEEP_COLOR = "#6366F1"; // indigo

/** Bosqich ranglari: chuqur — to'q, yengil — och, REM — moviy, uyg'oq — kahrabo. Och va to'q mavzuda o'qiladi. */
export const STAGE_COLORS: Record<SleepStage, string> = {
  deep: "#4338CA",
  light: "#818CF8",
  rem: "#06B6D4",
  awake: "#F59E0B",
};

/** Gipnogramma qatorlari (yuqoridan pastga): uyg'oq eng tepada, chuqur eng pastda. */
export const STAGE_ORDER: SleepStage[] = ["awake", "rem", "light", "deep"];

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
