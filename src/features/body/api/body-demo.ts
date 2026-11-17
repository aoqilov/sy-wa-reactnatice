import type { BodyEntry } from "./body";

const DAY_MS = 24 * 60 * 60 * 1000;
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Expo Go uchun namunaviy o'lchovlar (72 kg, 176 sm erkak): ~2 oyda 14 ta, yog' asta kamayib, mushak oshib boradi.
 * Deterministik — har ochilganda bir xil.
 */
export function demoBodyEntries(count = 14): BodyEntry[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40).getTime();
  const weight = 72;
  return Array.from({ length: count }, (_, i) => {
    const k = i / (count - 1); // 0 — eng yangi, 1 — eng eski
    const wobble = Math.sin(i * 1.7) * 0.4;
    const fatPct = r1(21.2 + k * 2.6 + wobble);
    const fatKg = r1((weight * fatPct) / 100);
    const ffmKg = r1(weight - fatKg);
    const muscleKg = r1(ffmKg - 3.1);
    const waterPct = r1(56.4 - k * 1.5 - wobble / 2);
    const proteinPct = r1(17.6 - k * 0.6);
    const at = base - (i * 4 + (i > 0 ? 1 : 0)) * DAY_MS - (i % 3) * 3 * 60 * 60 * 1000;
    return {
      id: `demo-${i}`,
      at,
      source: i % 4 === 2 ? "watch" : "app",
      parts: {
        bmi: 23.2,
        fatPct,
        fatKg,
        ffmKg,
        musclePct: r1((muscleKg / weight) * 100),
        muscleKg,
        subFatPct: r1(fatPct * 0.82),
        waterPct,
        waterKg: r1((weight * waterPct) / 100),
        skeletalPct: r1(46.5 - k * 1.2),
        boneKg: 3.1,
        proteinPct,
        proteinKg: r1((weight * proteinPct) / 100),
        bmr: Math.round(1640 - k * 30),
      },
    } satisfies BodyEntry;
  });
}
