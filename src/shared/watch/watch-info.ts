import { getJSON, setJSON } from "@/shared/storage/storage";

// Soat haqidagi ma'lumotlar ("Soat ma'lumotlari" sahifasi uchun). Manba: native modul hodisalari ("pwd",
// "features", "battery", "autoMeasure"). Ular ulanish paytida bir marta keladi, shuning uchun oxirgi
// ma'lumot telefon xotirasiga saqlanadi: JS qayta yuklansa ham sahifa bo'sh qolmaydi.

/** SDK `EFunctionStatus` nomlari: UNSUPPORT, SUPPORT, SUPPORT_OPEN, SUPPORT_CLOSE, UNKONW. */
export type WatchFeatureKey =
  | "bloodPressure"
  | "heartRateDetect"
  | "temperature"
  | "autoMeasure"
  | "textImagePush"
  | "sportModel"
  | "bloodGlucose"
  | "bloodComponent";

export const FEATURE_KEYS: readonly WatchFeatureKey[] = [
  "bloodPressure",
  "heartRateDetect",
  "temperature",
  "autoMeasure",
  "textImagePush",
  "sportModel",
  "bloodGlucose",
  "bloodComponent",
];

export type AutoMeasureItem = {
  type: string; // SDK nomi: PULSE_RATE, BLOOD_PRESSURE ...
  /** `EAutoMeasureType.value` — soatga yozishda shu raqam yuboriladi (setAutoMeasure). */
  typeValue: number | null;
  on: boolean;
  intervalMin: number;
  startMin: number; // kun boshidan daqiqa
  endMin: number;
  /** Oraliq shu qadamga karrali bo'lishi kerak (daqiqa). */
  stepUnit: number | null;
  /** Soat oraliqni / vaqt oynasini o'zgartirishga ruxsat beradimi. */
  intervalModifiable: boolean;
  slotModifiable: boolean;
  /** Vaqt oynasi shu chegaralar ichida bo'lishi kerak (kun boshidan daqiqa). */
  supportStartMin: number | null;
  supportEndMin: number | null;
};

export type WatchInfo = {
  /** Qurilma manzili (Android'da MAC). */
  address: string | null;
  firmware: string | null;
  testFirmware: string | null;
  deviceNumber: number | null;
  /** 1-4 (4 — to'liq), soat foiz bermaganda ham keladi. */
  batteryLevel: number | null;
  features: Partial<Record<WatchFeatureKey, string>>;
  autoMeasure: AutoMeasureItem[] | null;
};

export const EMPTY_INFO: WatchInfo = {
  address: null,
  firmware: null,
  testFirmware: null,
  deviceNumber: null,
  batteryLevel: null,
  features: {},
  autoMeasure: null,
};

const storageKey = (address: string) => `watch.info.${address}`;

export function loadWatchInfo(address: string): Promise<WatchInfo | null> {
  return getJSON<WatchInfo>(storageKey(address));
}

/** Batareya saqlanmaydi: u har safar soatdan so'raladi. */
export function saveWatchInfo(address: string, info: WatchInfo): Promise<void> {
  return setJSON(storageKey(address), { ...info, batteryLevel: null });
}

/** `current` (hozirgi sessiya) ustun; yo'q joyini `saved` (oldingi ulanishlardan) to'ldiradi. */
export function mergeInfo(saved: WatchInfo, current: WatchInfo): WatchInfo {
  return {
    address: current.address ?? saved.address,
    firmware: current.firmware ?? saved.firmware,
    testFirmware: current.testFirmware ?? saved.testFirmware,
    deviceNumber: current.deviceNumber ?? saved.deviceNumber,
    batteryLevel: current.batteryLevel ?? saved.batteryLevel,
    features: { ...saved.features, ...current.features },
    autoMeasure: current.autoMeasure ?? saved.autoMeasure,
  };
}

export const asText = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const asNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** "features" hodisasi har bir SDK paketi uchun alohida keladi va faqat o'sha paketning kalitlarini o'z ichiga oladi. */
export function featuresFromEvent(e: Record<string, unknown>): Partial<Record<WatchFeatureKey, string>> {
  const out: Partial<Record<WatchFeatureKey, string>> = {};
  for (const key of FEATURE_KEYS) {
    const value = asText(e[key]);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Soat intervalli avto-o'lchash sozlamasini (SDK `readAutoMeasureSettingData`) qo'llaydimi. SDK buni o'zi
 * `isSupportAutoMeasure` bayrog'i bilan tekshiradi: qo'llamasa Toast "This feature is not supported" ko'rsatib, javob
 * bermasdan qaytadi. Shuning uchun faqat soat qo'llashini aniq aytgan bo'lsa (SUPPORT, SUPPORT_OPEN, SUPPORT_CLOSE) o'qiymiz;
 * UNSUPPORT, UNKONW yoki bayroq kelmagan bo'lsa — yo'q (S105/E500: rutinalarni ilovaning o'zi yuritadi).
 */
export function isAutoMeasureSupported(features: WatchInfo["features"]): boolean {
  return features.autoMeasure?.startsWith("SUPPORT") === true;
}

export function autoMeasureFromEvent(items: unknown): AutoMeasureItem[] | null {
  if (!Array.isArray(items)) return null;
  return (items as Record<string, unknown>[])
    .map((r) => ({
      type: asText(r.type) ?? "",
      typeValue: asNumber(r.typeValue) ?? null,
      on: r.on === true,
      intervalMin: asNumber(r.intervalMin) ?? 0,
      startMin: asNumber(r.startMin) ?? 0,
      endMin: asNumber(r.endMin) ?? 0,
      stepUnit: asNumber(r.stepUnit) ?? null,
      intervalModifiable: r.intervalModifiable !== false,
      slotModifiable: r.slotModifiable !== false,
      supportStartMin: asNumber(r.supportStartMin) ?? null,
      supportEndMin: asNumber(r.supportEndMin) ?? null,
    }))
    .filter((r) => r.type !== "");
}
