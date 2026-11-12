import type { MetricKey } from "@/features/home/api/get-metrics";
import { getJSON, setJSON } from "@/shared/storage/storage";

// "Rutinalar" = ilova soatdan muntazam o'lchashni so'raydi (rutina: o'lchov + interval). S105/E500 intervalni soatning
// o'ziga yozishni qo'llamaydi (SDK `isSupportAutoMeasure` = false), shuning uchun jadvalni telefon yuritadi:
// `lib/routine-runner.ts` belgilangan vaqtda o'lchovni boshlaydi va natijani saqlaydi. Rutinalar telefonda saqlanadi.

export type Routine = {
  key: MetricKey;
  /** Necha daqiqada bir marta (kun boshidan hisoblangan to'r bo'yicha: 15 daq → 12:00, 12:15, ...). */
  intervalMin: number;
  enabled: boolean;
};

/** Tanlanadigan intervallar (daqiqa): 5 ... 60, 2 soat, 3 soat. */
export const INTERVALS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 120, 180] as const;

/**
 * Rutinaga qo'shiladigan o'lchovlar. EKG va tana tarkibi yo'q: ular barmoqni elektrodga qo'yishni talab qiladi.
 * HRV ham yo'q: S105 uni ilovadan boshlashga ruxsat bermaydi (faqat soatning o'zida o'lchanadi).
 */
export const ROUTINE_KEYS: readonly MetricKey[] = [
  "pulse",
  "oxygen",
  "pressurePump",
  "temperature",
  "sugar",
  "blood",
  "stress",
];

const STORAGE_KEY = "myplan.routines.v1";

// Bitta umumiy nusxa: Rejam ekrani ham, fondagi ishga tushirgich (routine-runner) ham shuni o'qiydi.
let routines: Routine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeRoutines(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getRoutines = () => routines;
export const routinesLoaded = () => loaded;

const isRoutine = (r: unknown): r is Routine => {
  const x = r as Partial<Routine> | null;
  return (
    !!x &&
    ROUTINE_KEYS.includes(x.key as MetricKey) &&
    typeof x.intervalMin === "number" &&
    x.intervalMin > 0 &&
    typeof x.enabled === "boolean"
  );
};

/** Saqlangan rutinalarni xotiradan o'qiydi (bir marta). */
export async function loadRoutines(): Promise<void> {
  if (loaded) return;
  const saved = (await getJSON<unknown[]>(STORAGE_KEY)) ?? [];
  if (loaded) return; // o'qish paytida o'zgartirilgan bo'lsa, uni bosib yubormaymiz
  routines = saved.filter(isRoutine);
  loaded = true;
  emit();
}

function commit(next: Routine[]) {
  routines = next;
  loaded = true;
  emit();
  setJSON(STORAGE_KEY, next).catch(() => {}); // saqlanmasa ham ro'yxat ishlashda davom etadi
}

/** Yangi rutina qo'shadi yoki shu o'lchovning mavjudini almashtiradi (har o'lchovga bitta rutina). */
export function upsertRoutine(routine: Routine) {
  const exists = routines.some((r) => r.key === routine.key);
  commit(exists ? routines.map((r) => (r.key === routine.key ? routine : r)) : [...routines, routine]);
}

export function removeRoutine(key: MetricKey) {
  commit(routines.filter((r) => r.key !== key));
}

export function toggleRoutine(key: MetricKey) {
  commit(routines.map((r) => (r.key === key ? { ...r, enabled: !r.enabled } : r)));
}
