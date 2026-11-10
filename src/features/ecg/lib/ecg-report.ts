import { type Translate, translator } from "@/shared/i18n/use-t";

import { analyzeEcg, type EcgAnalysis } from "./ecg-analysis";
import type { IntervalText } from "./ecg-beat-figure";
import { gainFor, isCalibratedGain, robustRange } from "./ecg-geometry";
import type { EcgRecord } from "./ecg-records";

// Hisobot matni (ekran va PDF bir xil): sarlavha qatorlari, o'lchovlar jadvali, masshtab izohi.
// Hisobot shifokor uchun, shuning uchun ilova tilidan qat'i nazar rus tilida (foydalanuvchi talabi).

type T = Translate;

export const reportT: Translate = translator("ru");

/** Butun yozuv uchun bitta kuchaytirish (mm/mV): qatorlar bir-biri bilan solishtiriladigan bo'ladi. */
export function recordGain(record: EcgRecord, sign = 1): number {
  const [low, high] = robustRange(record.trace.samples);
  // Ag'darilgan signalda pastki chegara tepaga chiqadi.
  return sign < 0 ? gainFor(-high, -low) : gainFor(low, high);
}

/** Yozuvning ilova tomonidagi tahlili (R tishlari, qutblanish, o'rtacha kompleks). Eski yozuvlarga ham ishlaydi. */
export function analyzeRecord(record: EcgRecord): EcgAnalysis {
  return analyzeEcg(record.trace.samples, record.trace.rate);
}

/** Qavs ustidagi matn: "PR 176 мс". */
export const intervalText =
  (t: T): IntervalText =>
  (name, ms) =>
    t("ecg.interval", { name, ms });

export type EcgPatient = { name: string; age: number | null; sex: "male" | "female" | null };
export type ReportRow = { label: string; value: string };

const DASH = "—";
const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateTime(at: number): string {
  const d = new Date(at);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const withUnit = (v: number | undefined, unit: string) => (v === undefined ? DASH : `${v} ${unit}`);

/** Kim, qachon, qaysi qurilma bilan. */
export function headerRows(record: EcgRecord, patient: EcgPatient | null, t: T): ReportRow[] {
  const who = patient
    ? [
        patient.name,
        patient.age !== null ? t("ecg.age", { age: patient.age }) : null,
        patient.sex ? t(patient.sex === "male" ? "gender.male" : "gender.female") : null,
      ]
        .filter(Boolean)
        .join(", ")
    : DASH;
  const device = [record.device.model, record.device.firmware ? `v${record.device.firmware}` : null]
    .filter(Boolean)
    .join(" · ");
  return [
    { label: t("ecg.patient"), value: who || DASH },
    { label: t("ecg.date"), value: formatDateTime(record.at) },
    { label: t("ecg.duration"), value: t("ecg.seconds", { s: record.durationS }) },
    { label: t("ecg.device"), value: device || DASH },
    { label: t("ecg.lead"), value: t("ecg.lead.value") },
  ];
}

/** O'lchovlar: soat bermagan qiymat "—". */
export function measureRows(record: EcgRecord, t: T): ReportRow[] {
  const bpm = t("ecg.unit.bpm");
  const ms = t("ecg.unit.ms");
  const range =
    record.hrMin !== undefined && record.hrMax !== undefined ? `${record.hrMin}–${record.hrMax} ${bpm}` : DASH;
  return [
    { label: t("ecg.hr"), value: withUnit(record.value, bpm) },
    { label: t("ecg.hrRange"), value: range },
    { label: t("ecg.rr"), value: withUnit(record.rr, ms) },
    { label: t("ecg.qt"), value: withUnit(record.qt, ms) },
    { label: t("ecg.qtc"), value: withUnit(record.qtc, ms) },
    { label: t("ecg.hrv"), value: withUnit(record.hrv, ms) },
    { label: t("ecg.br"), value: withUnit(record.br, t("ecg.unit.perMin")) },
    { label: t("ecg.quality"), value: t("ecg.quality.value", { pct: record.contactPct, n: record.leadOffs }) },
  ];
}

/** Ilova o'zi hisoblagan qiymatlar (soatnikidan alohida, "avto" belgisi bilan). */
export function autoRows(analysis: EcgAnalysis, t: T): ReportRow[] {
  const ms = t("ecg.unit.ms");
  const iv = analysis.beat?.intervals;
  const qt = iv?.qt !== undefined ? `${iv.qt}${iv.qtc !== undefined ? ` / ${iv.qtc}` : ""} ${ms}` : DASH;
  return [
    { label: t("ecg.auto.hr"), value: withUnit(analysis.hr, t("ecg.unit.bpm")) },
    { label: t("ecg.auto.pr"), value: withUnit(iv?.pr, ms) },
    { label: t("ecg.auto.qrs"), value: withUnit(iv?.qrs, ms) },
    { label: t("ecg.auto.qt"), value: qt },
  ];
}

export function scaleText(record: EcgRecord, t: T, gain: number): string {
  const hz = Math.round(record.trace.rate);
  return isCalibratedGain(gain) ? t("ecg.scale", { hz, gain }) : t("ecg.scaleAuto", { hz });
}
