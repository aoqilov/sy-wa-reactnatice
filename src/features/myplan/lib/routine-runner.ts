import type { MetricKey } from "@/features/home/api/get-metrics";
import { appendReading, toStoredReading } from "@/features/home/lib/readings";
import { canMeasure, isMeasuring, startMeasure } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import { logWatch } from "@/shared/watch/watch-log";

import { getRoutines, loadRoutines } from "../api/routines";

// Rutinalarni ishga tushiradi: belgilangan vaqtda soatdan o'lchashni so'raydi va natijani saqlaydi (Home'dagi "Boshlash"
// bilan bir xil o'lchash oqimi, shared/watch/measure.ts). S105/E500 intervalni soatning o'ziga yozishni qo'llamaydi,
// shuning uchun jadvalni shu yerda, telefonda yuritamiz. Ilova ochiq (JS ishlab turgan) va soat ulangan bo'lganda ishlaydi.
//
// Jadval kun boshidan hisoblangan to'r bo'yicha: 15 daqiqa → 12:00, 12:15, 12:30 ... (Rejam kartasidagi "Keyingisi"
// shu to'rdan hisoblanadi). To'rning har bir bo'lagida ko'pi bilan bitta o'lchov. Rutina qo'shilganda yoki yoqilganda joriy
// bo'lak o'tgan deb olinadi: birinchi o'lchov keyingi to'r vaqtida bo'ladi (darhol emas).

const TICK_MS = 15_000;
const WATCHDOG_MS = 5 * 60_000; // o'lchov oqimi hech qachon tugamasa, ishga tushirgich qotib qolmasin

type Seen = { intervalMin: number; slot: string };

const seen = new Map<MetricKey, Seen>();
let running = false;

/** Joriy to'r bo'lagining belgisi: bugungi kun + kun boshidan necha-bo'lak. */
function slotOf(now: Date, intervalMin: number) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}:${Math.floor(minutes / intervalMin)}`;
}

function run(key: MetricKey) {
  if (!canMeasure(key)) return;
  running = true;
  logWatch(`[rutina] ${key}: o'lchash boshlandi`);
  let cancel: () => void = () => {};
  const watchdog = setTimeout(() => {
    if (!running) return;
    cancel();
    running = false;
    logWatch(`[rutina] ${key}: vaqt tugadi`);
  }, WATCHDOG_MS);
  cancel = startMeasure(key, {
    onProgress: () => {},
    onDone: (raw) => {
      clearTimeout(watchdog);
      running = false;
      appendReading(toStoredReading(raw)).catch(() => {});
      logWatch(`[rutina] ${key}: natija saqlandi`);
    },
    // Xato bo'lsa (soat band, taqilmagan ...) keyingi to'r bo'lagida qayta uriniladi.
    onError: (code) => {
      clearTimeout(watchdog);
      running = false;
      logWatch(`[rutina] ${key}: xato ${code}`);
    },
  });
}

function tick() {
  const now = new Date();
  const routines = getRoutines();

  // Holatni yuritamiz: o'chirilgan/olib tashlangan rutina unutiladi; yangi yoki intervali o'zgargan rutinada joriy bo'lak
  // "o'tgan" deb belgilanadi.
  for (const key of [...seen.keys()]) {
    if (!routines.some((r) => r.key === key && r.enabled)) seen.delete(key);
  }
  const due: MetricKey[] = [];
  for (const r of routines) {
    if (!r.enabled) continue;
    const slot = slotOf(now, r.intervalMin);
    const prev = seen.get(r.key);
    if (!prev || prev.intervalMin !== r.intervalMin) {
      seen.set(r.key, { intervalMin: r.intervalMin, slot });
    } else if (prev.slot !== slot) {
      due.push(r.key);
    }
  }

  // Soat bir ishni bajaradi: boshqa o'lchov (Home, rutina) ketayotgan yoki soat ulanmagan bo'lsa kutamiz.
  if (due.length === 0 || running || isMeasuring() || getWatchConnection().status !== "ready") return;

  // Bitta o'lchov: qolganlari keyingi tickda (agar o'z bo'lagi hali tugamagan bo'lsa).
  const key = due[0];
  const routine = routines.find((r) => r.key === key);
  if (!routine) return;
  seen.set(key, { intervalMin: routine.intervalMin, slot: slotOf(now, routine.intervalMin) });
  run(key);
}

/** Ilova ochilganda bir marta ishga tushiriladi. Qaytgan funksiya to'xtatadi. */
export function startRoutineRunner(): () => void {
  void loadRoutines();
  const id = setInterval(tick, TICK_MS);
  return () => clearInterval(id);
}
