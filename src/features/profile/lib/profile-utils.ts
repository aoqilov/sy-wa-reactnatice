import type { TranslationKey } from "@/shared/i18n/translations";

import type { Gender, Profile } from "../api/profile-storage";

export const GENDER_KEY: Record<Gender, TranslationKey> = {
  male: "gender.male",
  female: "gender.female",
};

export function fullName(profile: Pick<Profile, "firstName" | "lastName">) {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

// Faqat tug'ilgan yil ma'lum bo'lgani uchun yosh taxminiy (±1).
export function calcAge(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

/** Tana massasi indeksi: vazn (kg) / bo'y (m)². Bir xonali kasr bilan. */
export function calcBmi(heightCm: number, weightKg: number) {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** JSST (WHO) kattalar uchun toifalari: < 18.5, 18.5–24.9, 25–29.9, ≥ 30. */
export function bmiCategoryKey(bmi: number): TranslationKey {
  if (bmi < 18.5) return "profile.bmi.under";
  if (bmi < 25) return "profile.bmi.normal";
  if (bmi < 30) return "profile.bmi.over";
  return "profile.bmi.obese";
}

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  birthYear: string;
  gender: Gender | "";
  heightCm: string;
  weightKg: string;
};

// Xato matn emas, tarjima kaliti (+ parametrlar) sifatida saqlanadi — til almashsa ham to'g'ri chiqadi.
export type FormError = { key: TranslationKey; params?: Record<string, number> };
export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, FormError>>;

export const EMPTY_FORM: ProfileFormValues = {
  firstName: "",
  lastName: "",
  birthYear: "",
  gender: "",
  heightCm: "",
  weightKg: "",
};

export function profileToForm(profile: Profile): ProfileFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthYear: String(profile.birthYear),
    gender: profile.gender,
    heightCm: String(profile.heightCm),
    weightKg: String(profile.weightKg),
  };
}

// Vergulli kiritishni ham qabul qilamiz ("72,5"), chunki ba'zi klaviaturalarda nuqta yo'q.
function toNumber(value: string) {
  return Number(value.trim().replace(",", "."));
}

// Xato bo'lsa `errors` to'ladi, bo'lmasa tayyor `profile` qaytadi.
export function validateProfileForm(
  values: ProfileFormValues,
): { errors: ProfileFormErrors; profile?: undefined } | { errors?: undefined; profile: Profile } {
  const errors: ProfileFormErrors = {};
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 120;

  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  if (!firstName) errors.firstName = { key: "error.firstName" };
  if (!lastName) errors.lastName = { key: "error.lastName" };

  const birthYear = toNumber(values.birthYear);
  if (!values.birthYear.trim()) errors.birthYear = { key: "error.birthYear.required" };
  else if (!Number.isInteger(birthYear) || birthYear < minYear || birthYear > currentYear)
    errors.birthYear = { key: "error.birthYear.range", params: { min: minYear, max: currentYear } };

  if (values.gender === "") errors.gender = { key: "error.gender" };

  const heightCm = toNumber(values.heightCm);
  if (!values.heightCm.trim()) errors.heightCm = { key: "error.height.required" };
  else if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250)
    errors.heightCm = { key: "error.height.range" };

  const weightKg = toNumber(values.weightKg);
  if (!values.weightKg.trim()) errors.weightKg = { key: "error.weight.required" };
  else if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300)
    errors.weightKg = { key: "error.weight.range" };

  if (Object.keys(errors).length > 0 || values.gender === "") return { errors };

  return { profile: { firstName, lastName, birthYear, gender: values.gender, heightCm, weightKg } };
}
