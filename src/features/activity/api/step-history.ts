import { loadStepDays, setStepDaysInMemory, type StepDay, stepDayKey } from "@/shared/watch/step-history";

import { activityDemo, type TodayActivity } from "./activity";

export type { StepDay } from "@/shared/watch/step-history";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Saqlangan kunlar + bugungi jonli qiymat: bugungi jami `readSportStep` dan (eng yangi), 5 daqiqalik yig'indi
 * biroz orqada qolishi mumkin. Qaysi biri katta bo'lsa o'sha olinadi; soatma-soat bo'laklar 5 daqiqalikdan.
 */
export function withToday(days: StepDay[], today: TodayActivity | null): StepDay[] {
  if (!today) return days;
  const key = stepDayKey(Date.now());
  if (today.day !== key) return days;
  const saved = days.find((d) => d.key === key);
  if (saved && saved.steps >= today.steps) return days;
  const merged: StepDay = {
    key,
    steps: today.steps,
    kcal: Math.max(today.kcal, saved?.kcal ?? 0),
    km: Math.max(today.km, saved?.km ?? 0),
    slots: saved?.slots ?? new Array<number>(48).fill(0),
  };
  return [merged, ...days.filter((d) => d.key !== key)];
}

/** Faqat namuna rejimi (Expo Go): 30 kunlik qadamlar, ba'zi kunlar yo'q. */
function demoDays(): StepDay[] {
  let s = 20261116;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const out: StepDay[] = [];
  for (let i = 0; i < 30; i++) {
    if (i > 0 && rand() < 0.1) continue;
    const slots = new Array<number>(48).fill(0);
    // Ertalab, tushlik va kechqurun faolroq; tunda deyarli yo'q.
    const lastSlot = i === 0 ? Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) : 47;
    for (let k = 14; k <= Math.min(45, lastSlot); k++) {
      const peak = k === 16 || k === 17 || k === 25 || k === 26 || k === 37 || k === 38 ? 3 : 1;
      slots[k] = Math.round(rand() * 280 * peak);
    }
    const steps = slots.reduce((a, b) => a + b, 0);
    out.push({ key: stepDayKey(base - i * DAY_MS), steps, kcal: Math.round(steps * 0.042), km: Math.round(steps * 0.00072 * 100) / 100, slots });
  }
  return out;
}

export async function loadStepHistory(): Promise<StepDay[]> {
  if (activityDemo()) {
    const days = demoDays();
    setStepDaysInMemory(days);
    return days;
  }
  return loadStepDays();
}
