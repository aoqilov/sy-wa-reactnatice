import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import watchModule, { type WatchEvent } from "../../../modules/veepoo-watch";

// Ilova ichidagi konsol (widgets/debug-console): iOS sinovsiz yozilgan, shuning uchun birinchi ishga tushirishda
// xatolarni telefonning o'zida ko'rish kerak. Bu yerga yig'iladi:
//  - native moduldan: "error", "writeError" (xato), "log" (ma'lumot), `unsupported` belgili javoblar (ogohlantirish),
//    "connection" dagi xato holatlari;
//  - JS: ushlanmagan xatolar (ErrorUtils), console.error / console.warn;
//  - o'lchov xatolari (use-measurement) va soat jurnali (watch-log.ts).

export type DebugLevel = "error" | "warn" | "info";
export type DebugEntry = { id: number; at: number; level: DebugLevel; source: string; message: string };

/** Konsol qachon ko'rinadi: iOS (sinov davri) va dev build'da. Android release foydalanuvchilariga ko'rinmaydi. */
export const DEBUG_CONSOLE_ENABLED = Platform.OS === "ios" || __DEV__;

const MAX_ENTRIES = 500;

let entries: DebugEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function stringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function debugLog(level: DebugLevel, source: string, ...parts: unknown[]) {
  if (!DEBUG_CONSOLE_ENABLED) return;
  const message = parts.map(stringify).join(" ");
  entries = [{ id: nextId++, at: Date.now(), level, source, message }, ...entries].slice(0, MAX_ENTRIES);
  scheduleNotify();
}

// Yozuv boshqa komponent render bo'layotganda kelishi mumkin (React console.warn/error'ni render ichida chaqiradi):
// konsolni o'sha zahoti yangilash "Cannot update a component while rendering a different component" xatosini beradi.
// Shuning uchun xabar render tugagach, bir marta yuboriladi (ketma-ket yozuvlar bitta yangilanishga yig'iladi).
let notifyScheduled = false;
function scheduleNotify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  setTimeout(() => {
    notifyScheduled = false;
    notify();
  }, 0);
}

export function clearDebugLog() {
  entries = [];
  notify();
}

/** Hammasini matn sifatida (ulashish uchun): eskidan yangiga. */
export function debugLogText(list: DebugEntry[] = entries): string {
  return [...list]
    .reverse()
    .map((e) => `${new Date(e.at).toLocaleTimeString()} [${e.level}] ${e.source}: ${e.message}`)
    .join("\n");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDebugLog(): DebugEntry[] {
  return useSyncExternalStore(subscribe, () => entries, () => entries);
}

// ---------------------------------------------------------------- manbalarni ulash

/** Native hodisa konsolga qaysi darajada tushadi (null — tushmaydi: oddiy ma'lumot oqimi). */
function levelOf(e: WatchEvent): DebugLevel | null {
  if (e.type === "error" || e.type === "writeError") return "error";
  if (e.type === "log") return "info";
  if (e.unsupported === true || e.failed === true || e.timeout === true) return "warn";
  if (typeof e.type === "string" && e.type.endsWith("Error")) return "warn";
  if (e.type === "dialInstall" && e.stage === "error") return "warn";
  if (e.type === "dialMarket" && e.error) return "warn";
  return null;
}

let installed = false;

/** Bir marta, ilova ishga tushganda (app/_layout.tsx). */
export function installDebugCapture() {
  if (installed || !DEBUG_CONSOLE_ENABLED) return;
  installed = true;
  debugLog("info", "app", `Konsol yoqildi (${Platform.OS} ${String(Platform.Version)})`);

  // JS: ushlanmagan xatolar. Asl ishlov beruvchi saqlanadi (qizil ekran / ilova yopilishi o'zgarmaydi).
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      debugLog("error", isFatal ? "js-fatal" : "js", error);
      previous?.(error, isFatal);
    });
  }

  // console.error / console.warn (React ogohlantirishlari, ushlangan xatolar).
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => {
    debugLog("error", "console", ...args);
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    debugLog("warn", "console", ...args);
    originalWarn(...args);
  };

  // Native modul.
  const watch = watchModule;
  if (!watch) {
    debugLog("warn", "native", "VeepooWatch native moduli topilmadi (Expo Go yoki modul ulanmagan)");
    return;
  }
  const missing = ["startScan", "connect", "startHeart", "readDailyDay", "startCuffBp"].filter(
    (name) => typeof (watch as unknown as Record<string, unknown>)[name] !== "function",
  );
  if (missing.length) debugLog("error", "native", `Native funksiyalar yo'q: ${missing.join(", ")}`);

  watch.addListener("event", (e) => {
    const level = levelOf(e);
    if (!level) return;
    const { type, ...rest } = e;
    debugLog(level, `native:${type}`, Object.keys(rest).length ? rest : "");
  });
  watch.addListener("connection", (c) => {
    if (c.state === "error") debugLog("error", "connection", c.message ?? "", c.reason ?? "");
    else debugLog("info", "connection", c.state, c.message ?? "");
  });
  watch.addListener("scan", (s) => {
    if (s.state === "bluetoothOff") debugLog("warn", "scan", "Bluetooth o'chiq");
    else if (s.state !== "found") debugLog("info", "scan", s.state);
  });
}

type ErrorUtilsLike = {
  getGlobalHandler: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};
