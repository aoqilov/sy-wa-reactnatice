import type { BloodParts } from "@/shared/watch/measure";

import type { MetricStatus } from "../api/get-metrics";

// Qon tahlili (soat, optik, taxminiy): beshta ko'rsatkich, ularning nomi, birligi va kattalar uchun umumiy me'yori.
// Bu tashxis emas: holat yorlig'i laboratoriya me'yorlari bo'yicha umumiy yo'naltirish.

export type BloodPartKey = keyof BloodParts;

/** Natija kartasidagi bitta qator. */
export type BloodRow = {
  key: BloodPartKey;
  label: string;
  value: string;
  unit: string;
  /** Me'yor matni: "< 5.2". */
  normal: string;
  status: MetricStatus;
  statusLabel: string;
};

type Grade = { status: MetricStatus; label: string };
const OK: Grade = { status: "normal", label: "Normal" };

type Def = { key: BloodPartKey; label: string; unit: string; decimals: number; normal: string; grade: (v: number) => Grade };

/** Tartib — soatning rasmiy ilovasidagi kabi. */
const DEFS: Def[] = [
  {
    key: "uricAcid",
    label: "Siydik kislotasi",
    unit: "µmol/l",
    decimals: 1,
    normal: "150–420",
    grade: (v) =>
      v < 150 ? { status: "warning", label: "Past" } : v <= 420 ? OK : v <= 480 ? { status: "warning", label: "Biroz yuqori" } : { status: "danger", label: "Yuqori" },
  },
  {
    key: "tcho",
    label: "Umumiy xolesterin",
    unit: "mmol/l",
    decimals: 2,
    normal: "< 5.2",
    grade: (v) => (v < 5.2 ? OK : v < 6.2 ? { status: "warning", label: "Chegarada" } : { status: "danger", label: "Yuqori" }),
  },
  {
    key: "tag",
    label: "Triglitseridlar",
    unit: "mmol/l",
    decimals: 2,
    normal: "< 1.7",
    grade: (v) => (v < 1.7 ? OK : v < 2.3 ? { status: "warning", label: "Chegarada" } : { status: "danger", label: "Yuqori" }),
  },
  {
    key: "hdl",
    label: "HDL (yaxshi xolesterin)",
    unit: "mmol/l",
    decimals: 2,
    normal: "> 1.0",
    grade: (v) => (v >= 1.0 ? OK : { status: "warning", label: "Past" }),
  },
  {
    key: "ldl",
    label: "LDL (yomon xolesterin)",
    unit: "mmol/l",
    decimals: 2,
    normal: "< 3.4",
    grade: (v) => (v < 3.4 ? OK : v < 4.1 ? { status: "warning", label: "Chegarada" } : { status: "danger", label: "Yuqori" }),
  },
];

export const BLOOD_PART_COUNT = DEFS.length;

export function bloodRows(parts: BloodParts): BloodRow[] {
  return DEFS.map((d) => {
    const v = parts[d.key];
    const g = d.grade(v);
    return {
      key: d.key,
      label: d.label,
      value: v.toFixed(d.decimals),
      unit: d.unit,
      normal: d.normal,
      status: g.status,
      statusLabel: g.label,
    };
  });
}

/** Umumiy holat: eng yomoni; qiymat o'rnida "me'yordagi ko'rsatkichlar soni / 5". */
export function bloodSummary(parts: BloodParts): { value: string; status: MetricStatus; label: string } {
  const rows = bloodRows(parts);
  const normal = rows.filter((r) => r.status === "normal").length;
  const status: MetricStatus = rows.some((r) => r.status === "danger")
    ? "danger"
    : rows.some((r) => r.status === "warning")
      ? "warning"
      : "normal";
  const off = rows.length - normal;
  const label = off === 0 ? "Hammasi me'yorda" : `${off} tasi me'yordan tashqari`;
  return { value: `${normal}/${rows.length}`, status, label };
}
