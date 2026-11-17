import type { Profile } from "@/features/profile/api/profile-storage";
import { calcAge } from "@/features/profile/lib/profile-utils";
import { getJSON, setJSON } from "@/shared/storage/storage";
import { isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import { watchTaskRunning } from "@/shared/watch/watch-queue";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";

// Faollik (1-bosqich): soatdan bugungi qadam, kkal, masofa (readSteps → "sportStep") va soatga shaxsiy ma'lumot
// + maqsadlar (syncPersonInfo). Soat kkal va masofani bo'y/vazn/yosh/jinsdan hisoblaydi, shuning uchun ular
// ulanishda va profil yoki maqsad o'zgarganda yuboriladi.

export type TodayActivity = {
  steps: number;
  kcal: number;
  km: number;
  /** O'qilgan vaqt (ms). */
  at: number;
  /** Qaysi kun ("YYYY-MM-DD"): kun almashsa eski qiymat ko'rsatilmaydi. */
  day: string;
};

export type ActivityGoals = { steps: number; sleepMin: number };

export const DEFAULT_GOALS: ActivityGoals = { steps: 10000, sleepMin: 480 };
export const STEP_GOAL_PRESETS = [5000, 6000, 8000, 10000, 12000, 15000];

const GOALS_KEY = "activity.goals.v1";
const TODAY_KEY = "activity.today.v1";
const READ_TIMEOUT_MS = 6_000;

const pad = (n: number) => String(n).padStart(2, "0");
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Dev rejimi va soat moduli yo'q (Expo Go): UI ustida ishlash uchun namuna qiymatlar ko'rsatiladi. */
export function activityDemo(): boolean {
  return __DEV__ && !watchModule;
}

/** O'rnatilgan APK faollik funksiyalarini biladimi (eski build'da yo'q). Expo Go'da (dev) namuna rejimi. */
export function activityAvailable(): boolean {
  if (activityDemo()) return true;
  return !!watchModule && typeof watchModule.readSteps === "function";
}

// ---------------------------------------------------------------- maqsadlar (shu qurilmada)

let goals: ActivityGoals = DEFAULT_GOALS;
let goalsLoaded = false;
const goalListeners = new Set<(g: ActivityGoals) => void>();

export function getGoals(): ActivityGoals {
  return goals;
}

export async function loadGoals(): Promise<ActivityGoals> {
  if (goalsLoaded) return goals;
  const stored = await getJSON<Partial<ActivityGoals>>(GOALS_KEY);
  goals = { ...DEFAULT_GOALS, ...(stored ?? {}) };
  goalsLoaded = true;
  goalListeners.forEach((l) => l(goals));
  return goals;
}

export async function saveGoals(next: ActivityGoals): Promise<void> {
  goals = next;
  goalsLoaded = true;
  goalListeners.forEach((l) => l(goals));
  await setJSON(GOALS_KEY, next);
}

export function subscribeGoals(listener: (g: ActivityGoals) => void): () => void {
  goalListeners.add(listener);
  return () => goalListeners.delete(listener);
}

// ---------------------------------------------------------------- bugungi faollik

export async function loadCachedToday(): Promise<TodayActivity | null> {
  // Namuna: maqsadning ~70% i (halqa, foiz va "maqsadgacha" matni ko'rinsin). Telefonga saqlanmaydi.
  if (activityDemo()) return { steps: 6842, kcal: 286.4, km: 5.12, at: Date.now(), day: dayKey() };
  const cached = await getJSON<TodayActivity>(TODAY_KEY);
  return cached && cached.day === dayKey() ? cached : null;
}

/** Soatdan bugungi jamini o'qiydi. Soat ulanmagan, o'lchov ketyapti yoki javob kelmasa — null. */
export async function readTodayActivity(): Promise<TodayActivity | null> {
  const watch = watchModule;
  if (!watch || !activityAvailable() || getWatchConnection().status !== "ready" || isMeasuring()) return null;
  // Tarix yoki uyqu o'qilayotganda soatga qo'shimcha so'rov yubormaymiz: keyingi daqiqada o'qiladi.
  if (watchTaskRunning() !== null) return null;

  const reply = new Promise<WatchEvent | null>((resolve) => {
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== "sportStep") return;
      clearTimeout(timer);
      sub.remove();
      resolve(e);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(null);
    }, READ_TIMEOUT_MS);
  });
  try {
    watch.readSteps();
  } catch {
    return null;
  }
  const e = await reply;
  if (!e) return null;

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const today: TodayActivity = {
    steps: Math.round(num(e.step)),
    kcal: Math.round(num(e.kcal) * 10) / 10,
    km: Math.round(num(e.dis) * 100) / 100,
    at: Date.now(),
    day: dayKey(),
  };
  void setJSON(TODAY_KEY, today);
  return today;
}

// ---------------------------------------------------------------- soatga shaxsiy ma'lumot

/** Profil va maqsadlarni soatga yuboradi (soat ulangan bo'lsa). */
export function syncPersonToWatch(profile: Profile, g: ActivityGoals): boolean {
  const watch = watchModule;
  if (!watch || typeof watch.syncPersonInfo !== "function" || getWatchConnection().status !== "ready") return false;
  try {
    watch.syncPersonInfo(
      profile.gender === "male",
      Math.round(profile.heightCm),
      Math.round(profile.weightKg),
      calcAge(profile.birthYear),
      g.steps,
      g.sleepMin,
    );
    return true;
  } catch {
    return false;
  }
}
