import type { TranslationKey } from "@/shared/i18n/translations";
import type { BodyParts } from "@/shared/watch/measure";

// Tana tarkibi me'yorlari — taxminiy, umumiy qabul qilingan oraliqlar (aqlli tarozilar va adabiyotdagi kabi), tashxis
// emas. Yog' ulushi: Gallagher va boshq. (2000), yosh va jins bo'yicha. Me'yori aniq bo'lmagan ko'rsatkichlar (mushak,
// suyak, BMR) faqat qiymat sifatida ko'rsatiladi.

export type Gender = "male" | "female";
export type Level = "low" | "normal" | "high";
export type BodyKey = keyof BodyParts;

/** lo..hi — me'yor; min..max — chiziq shkalasi. */
export type Norm = { lo: number; hi: number; min: number; max: number };

export type Person = { gender: Gender | null; age: number | null; weightKg: number | null };

function fatNorm(gender: Gender, age: number): Norm {
  if (gender === "male") {
    const [lo, hi] = age < 40 ? [8, 20] : age < 60 ? [11, 22] : [13, 25];
    return { lo, hi, min: 3, max: 40 };
  }
  const [lo, hi] = age < 40 ? [21, 33] : age < 60 ? [23, 34] : [24, 36];
  return { lo, hi, min: 10, max: 50 };
}

export function normFor(key: BodyKey, p: Person): Norm | null {
  const g = p.gender;
  const age = p.age ?? 35;
  switch (key) {
    case "bmi":
      return { lo: 18.5, hi: 24.9, min: 14, max: 36 };
    case "fatPct":
      return g ? fatNorm(g, age) : null;
    case "subFatPct":
      return g === "male" ? { lo: 8.6, hi: 16.7, min: 3, max: 30 } : g === "female" ? { lo: 18.5, hi: 26.7, min: 8, max: 40 } : null;
    case "waterPct":
      return g === "male" ? { lo: 50, hi: 65, min: 35, max: 75 } : g === "female" ? { lo: 45, hi: 60, min: 30, max: 70 } : null;
    case "proteinPct":
      return { lo: 16, hi: 20, min: 10, max: 26 };
    default:
      return null;
  }
}

export function levelOf(value: number, norm: Norm): Level {
  return value < norm.lo ? "low" : value > norm.hi ? "high" : "normal";
}

export type RowDef = { key: BodyKey; label: TranslationKey; unit: "%" | "kg" | "kcal" | "" };
export type GroupDef = { title: TranslationKey; rows: RowDef[] };

/** Natija kartasidagi guruhlar va tartib. */
export const GROUPS: GroupDef[] = [
  {
    title: "body.group.fat",
    rows: [
      { key: "fatPct", label: "body.fatPct", unit: "%" },
      { key: "fatKg", label: "body.fatKg", unit: "kg" },
      { key: "subFatPct", label: "body.subFatPct", unit: "%" },
    ],
  },
  {
    title: "body.group.muscle",
    rows: [
      { key: "muscleKg", label: "body.muscleKg", unit: "kg" },
      { key: "musclePct", label: "body.musclePct", unit: "%" },
      { key: "skeletalPct", label: "body.skeletalPct", unit: "%" },
      { key: "ffmKg", label: "body.ffmKg", unit: "kg" },
    ],
  },
  {
    title: "body.group.water",
    rows: [
      { key: "waterPct", label: "body.waterPct", unit: "%" },
      { key: "waterKg", label: "body.waterKg", unit: "kg" },
      { key: "proteinPct", label: "body.proteinPct", unit: "%" },
      { key: "proteinKg", label: "body.proteinKg", unit: "kg" },
    ],
  },
  {
    title: "body.group.other",
    rows: [
      { key: "bmi", label: "body.bmi", unit: "" },
      { key: "boneKg", label: "body.boneKg", unit: "kg" },
      { key: "bmr", label: "body.bmr", unit: "kcal" },
    ],
  },
];

export const fmt = (v: number, key: BodyKey) => (key === "bmr" ? String(Math.round(v)) : v.toFixed(1));

/** Yog' massasi kelmasa ulush va profil vaznidan hisoblanadi. */
export function fatKgOf(parts: BodyParts, weightKg: number | null): number | undefined {
  if (parts.fatKg !== undefined) return parts.fatKg;
  return weightKg ? Math.round(((weightKg * parts.fatPct) / 100) * 10) / 10 : undefined;
}

export function personFrom(profile: { gender: Gender; birthYear: number; weightKg: number } | null): Person {
  if (!profile) return { gender: null, age: null, weightKg: null };
  return { gender: profile.gender, age: new Date().getFullYear() - profile.birthYear, weightKg: profile.weightKg };
}
