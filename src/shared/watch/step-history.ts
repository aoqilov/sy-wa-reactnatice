import { getJSON, setJSON } from "../storage/storage";

// Kunlik qadamlar tarixi. Manba — History sinxroni o'qiydigan soatning 5 daqiqalik ma'lumoti (`OriginData.stepValue /
// calValue / disValue`). Soat uni bir necha kun saqlaydi, telefon esa 90 kun:
//   - `steps.fine.v1`: oxirgi kunlarning 5 daqiqalik qiymatlari (vaqt bo'yicha kalit). Bugun bir necha marta qisman
//     o'qiladi (1 soat ustma-ust), kalit bo'yicha yozilgani uchun takrorlanmaydi.
//   - `steps.days.v1`: har kun uchun jami va 48 ta 30 daqiqalik bo'lak (fine'dan hisoblanadi, eski kunlar faqat shu yerda).

export type StepPoint = { at: number; step: number; kcal: number; km: number };

export type StepDay = {
  /** "YYYY-MM-DD" */
  key: string;
  steps: number;
  kcal: number;
  km: number;
  /** 48 ta 30 daqiqalik bo'lakdagi qadamlar (00:00 dan). */
  slots: number[];
};

const FINE_KEY = "steps.fine.v1";
const DAYS_KEY = "steps.days.v1";
const FINE_KEEP_DAYS = 5;
const KEEP_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const pad = (n: number) => String(n).padStart(2, "0");
export const stepDayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Soatning kunlik yozuvidan (y, mo, d, h, mi + step / cal / dis) qadam nuqtasi. Qadam bo'lmasa — null. */
export function stepPointOf(r: Record<string, unknown>): StepPoint | null {
  const step = num(r.step);
  if (step <= 0 || step > 5000) return null; // 5 daqiqada 5000 dan ortiq qadam bo'lmaydi
  const [y, mo, d, h, mi] = [r.y, r.mo, r.d, r.h, r.mi].map((v) => (typeof v === "number" ? v : NaN));
  const at = new Date(y, mo - 1, d, h, mi).getTime();
  if (!Number.isFinite(at) || at > Date.now() + DAY_MS) return null;
  // Masofa: SDK km beradi; firmware metr bersa (5 daqiqada 10 km dan ortiq bo'lmaydi) km ga o'giramiz.
  const dis = num(r.dis);
  return { at, step, kcal: num(r.cal), km: dis > 10 ? dis / 1000 : dis };
}

type Fine = Record<string, [number, number, number]>; // vaqt (ms) → [qadam, kkal, km]

let daysCache: StepDay[] | null = null;
const listeners = new Set<() => void>();

export function subscribeStepHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadStepDays(): Promise<StepDay[]> {
  daysCache ??= (await getJSON<StepDay[]>(DAYS_KEY)) ?? [];
  return daysCache;
}

/** Faqat namuna (Expo Go) uchun: saqlamasdan xotiradagi ro'yxatni almashtiradi. */
export function setStepDaysInMemory(days: StepDay[]) {
  daysCache = days;
  listeners.forEach((l) => l());
}

function aggregate(fine: Fine): Map<string, StepDay> {
  const out = new Map<string, StepDay>();
  for (const [k, [step, kcal, km]] of Object.entries(fine)) {
    const at = Number(k);
    const key = stepDayKey(at);
    const day = out.get(key) ?? { key, steps: 0, kcal: 0, km: 0, slots: new Array<number>(48).fill(0) };
    const d = new Date(at);
    const slot = Math.min(47, Math.floor((d.getHours() * 60 + d.getMinutes()) / 30));
    day.steps += step;
    day.kcal += kcal;
    day.km += km;
    day.slots[slot] += step;
    out.set(key, day);
  }
  for (const d of out.values()) {
    d.kcal = Math.round(d.kcal * 10) / 10;
    d.km = Math.round(d.km * 100) / 100;
  }
  return out;
}

/** Yangi o'qilgan nuqtalarni qo'shadi va kunlik jamilarni qayta hisoblaydi. Qaytaradi: yangilangan kunlar soni. */
export async function mergeStepPoints(points: StepPoint[]): Promise<number> {
  if (points.length === 0) return 0;
  const fine = (await getJSON<Fine>(FINE_KEY)) ?? {};
  for (const p of points) fine[String(Math.floor(p.at / 60000) * 60000)] = [p.step, p.kcal, p.km];

  const fineFrom = Date.now() - FINE_KEEP_DAYS * DAY_MS;
  for (const k of Object.keys(fine)) if (Number(k) < fineFrom) delete fine[k];

  const fresh = aggregate(fine);
  const keepFrom = stepDayKey(Date.now() - KEEP_DAYS * DAY_MS);
  const saved = await loadStepDays();
  // fine'da bor kunlar yangidan hisoblanadi; qolgan (eski) kunlar o'zgarmaydi.
  const merged = [...fresh.values(), ...saved.filter((d) => !fresh.has(d.key))]
    .filter((d) => d.key >= keepFrom)
    .sort((a, b) => (a.key < b.key ? 1 : -1));
  daysCache = merged;
  await Promise.all([setJSON(FINE_KEY, fine), setJSON(DAYS_KEY, merged)]);
  listeners.forEach((l) => l());
  return fresh.size;
}
