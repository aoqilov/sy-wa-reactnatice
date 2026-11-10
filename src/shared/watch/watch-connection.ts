import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import watchModule, { type ConnectionReason, type WatchEvent } from "../../../modules/veepoo-watch";
import { loadLastWatch, saveLastWatch } from "./last-watch";
import {
  asNumber,
  asText,
  autoMeasureFromEvent,
  EMPTY_INFO,
  featuresFromEvent,
  loadWatchInfo,
  mergeInfo,
  saveWatchInfo,
  type WatchInfo,
} from "./watch-info";
import { logWatch } from "./watch-log";

// Soat bilan Bluetooth ulanishining umumiy holati: header, Home va boshqa ekranlar shuni o'qiydi.
// Manba — native modul hodisalari (modules/veepoo-watch). Ilovaning butun ishlash vaqtida bitta nusxa.
//
// "unavailable" — soat moduli bu ilovada yo'q (Expo Go, eski build, iOS hozircha, web). Foydalanuvchiga
// ko'rinishi bo'yicha "ulanmagan" bilan bir xil, lekin farqlash kerak bo'lsa ajratib turadi.

export type WatchConnectionStatus = "unavailable" | "disconnected" | "connecting" | "ready";

export type WatchConnection = {
  status: WatchConnectionStatus;
  /** Ulanish xatosi yoki uzilish sababi. Matn native qatlamdan keladi (hozircha faqat o'zbekcha). */
  message: string | null;
  /** Xato/uzilish sababining kodi (tarjima qilinadi): `bluetoothOff` — telefonda Bluetooth o'chiq yoki o'chirildi. */
  reason: ConnectionReason | null;
  /** Soat nomi (skan natijasidan), masalan "E500". Noma'lum bo'lsa null. */
  model: string | null;
  /** 0-100. Soat hali bildirmagan yoki foizda bermagan bo'lsa null. */
  battery: number | null;
  /** Soat haqida batafsil (versiya, imkoniyatlar ...): "Soat ma'lumotlari" sahifasi uchun. */
  info: WatchInfo;
};

const supported = Platform.OS === "android" && watchModule !== null;

let state: WatchConnection = {
  status: supported ? "disconnected" : "unavailable",
  message: null,
  reason: null,
  model: null,
  battery: null,
  info: EMPTY_INFO,
};
const listeners = new Set<() => void>();
const namesById = new Map<string, string>();
let started = false;

function setState(patch: Partial<WatchConnection>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Soat foizni bermasa (isPercent=false) faqat daraja beradi: 1-4, 4 — to'liq (SDK hujjati, BatteryData).
function batteryPercent(e: Record<string, unknown>): number | null {
  if (e.isPercent === true && typeof e.percent === "number") return clamp(e.percent);
  if (typeof e.level === "number" && e.level >= 1) return clamp(e.level * 25);
  return null;
}

// Ulanish tugagach SDK hali funksiya paketlarini almashayotgan bo'ladi, SDK esa buyruqlarni parallel
// bajarmaydi, shuning uchun birinchi so'rov yo'qolishi mumkin. Javob kelmaguncha kechikib qayta so'raymiz.
const BATTERY_RETRY_MS = [800, 2500, 5000];
let batteryTimer: ReturnType<typeof setTimeout> | undefined;

function requestBattery(attempt: number) {
  clearTimeout(batteryTimer);
  if (attempt >= BATTERY_RETRY_MS.length) return;
  batteryTimer = setTimeout(() => {
    if (state.status !== "ready" || state.battery !== null) return;
    try {
      watchModule?.readBattery(); // natija "battery" hodisasi bilan keladi
    } catch {
      // Keyingi urinishda qayta sinaymiz.
    }
    requestBattery(attempt + 1);
  }, BATTERY_RETRY_MS[attempt]);
}

// Yostiqchali bosim kadrlari soniyasiga bir necha marta keladi: jurnalni bosib ketmasligi uchun faqat holat
// o'zgarganda yoki har 8-kadrni yozamiz.
let lastCuffKey = "";
let cuffFrames = 0;

let ecgWaves = 0;

function logEvent(e: WatchEvent) {
  // EKG to'lqini soniyasiga bir necha marta keladi: har 20-sini yozamiz (signal borligini ko'rish uchun yetadi).
  if (e.type === "ecgWave") {
    ecgWaves += 1;
    if (ecgWaves % 20 !== 1) return;
    // To'liq massiv o'rniga qisqacha: amplituda (mV) va soat turi — "to'rtburchak"/kesilish sababini ko'rish uchun.
    const mv = Array.isArray(e.mv) ? (e.mv as number[]) : [];
    const min = mv.length ? Math.min(...mv).toFixed(3) : "-";
    const max = mv.length ? Math.max(...mv).toFixed(3) : "-";
    const adc = Array.isArray(e.adc) ? (e.adc as number[]) : [];
    const adcRange = adc.length ? `${Math.min(...adc)}..${Math.max(...adc)}` : "-";
    logWatch(`[ecgWave] n=${e.n} mV ${min}..${max} adc ${adcRange} ecgType=${e.ecgType} powerSize=${e.powerSize}`);
    return;
  }
  if (e.type === "cuffBp") {
    const key = `${e.status}|${e.flag}`;
    cuffFrames += 1;
    if (key === lastCuffKey && cuffFrames % 8 !== 0) return;
    lastCuffKey = key;
  }
  logWatch(`[${e.type}] ${JSON.stringify(e)}`);
}

/** Skan qilmasdan ulanishda (oxirgi soat) nomini header'da ko'rsatish uchun. */
export function rememberWatchName(id: string, name: string | null) {
  if (name) namesById.set(id, name);
}

// ---- Soat haqida batafsil ma'lumot ----

let persistTimer: ReturnType<typeof setTimeout> | undefined;

/** Ma'lumot ketma-ket bir necha hodisa bilan keladi: xotiraga bir marta, biroz kutib yozamiz. */
function persistInfo() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const address = state.info.address;
    if (address) saveWatchInfo(address, state.info).catch(() => {});
  }, 800);
}

function setInfo(patch: Partial<WatchInfo>) {
  setState({ info: { ...state.info, ...patch } });
  persistInfo();
}

/** Hodisalardan soat ma'lumotlarini yig'adi ("pwd" — versiyalar, "features" — imkoniyatlar, "autoMeasure" — sozlama). */
function collectInfo(e: WatchEvent) {
  switch (e.type) {
    case "battery":
      if (typeof e.level === "number" && e.level >= 1) setInfo({ batteryLevel: e.level });
      break;
    case "pwd":
      setInfo({
        firmware: asText(e.deviceVersion) ?? state.info.firmware,
        testFirmware: asText(e.deviceTestVersion) ?? state.info.testFirmware,
        deviceNumber: asNumber(e.deviceNumber) ?? state.info.deviceNumber,
      });
      break;
    case "features": {
      const features = featuresFromEvent(e);
      if (Object.keys(features).length > 0) setInfo({ features: { ...state.info.features, ...features } });
      break;
    }
    case "autoMeasure": {
      const items = autoMeasureFromEvent(e.items);
      if (items) setInfo({ autoMeasure: items });
      break;
    }
  }
}

/** Oldingi ulanishlarda saqlangan ma'lumot bilan to'ldiradi (JS qayta yuklanganda hodisalar qayta kelmaydi). */
function restoreInfo(address: string) {
  loadWatchInfo(address)
    .then((saved) => {
      if (!saved || state.info.address !== address) return;
      setState({ info: mergeInfo(saved, state.info) });
    })
    .catch(() => {});
}

/**
 * Versiya va imkoniyatlar soatdan faqat ulanish paytida (parol tekshiruvida) keladi. Soat shu JS ishga tushishidan
 * oldin ulangan bo'lsa, ular yo'q: uzib, o'sha soatga avtomatik qayta ulaymiz (soat ekranida tasdiq so'ralmaydi).
 * Ma'lumot kelgach telefonga saqlanadi, keyingi safar qayta ulash shart emas.
 */
export function reconnectWatch() {
  const id = state.info.address;
  if (!watchModule || !id || state.status !== "ready") return;
  try {
    watchModule.disconnect();
  } catch {
    return;
  }
  // Soatga uzilishni tugatishi uchun vaqt beramiz.
  setTimeout(() => {
    try {
      watchModule?.connect(id, false);
    } catch {
      // Muvaffaqiyatsiz bo'lsa, "Soatni ulang" ekranidagi "oxirgi soatga ulanish" qoladi.
    }
  }, 2000);
}

/** Soatni Bluetooth'dan uzadi. Natijada "disconnected" hodisasi keladi va ilovani "Soatni ulang" ekrani to'sadi. */
export function disconnectWatch() {
  try {
    watchModule?.disconnect();
  } catch {
    // Modul yo'q yoki aloqa allaqachon uzilgan.
  }
}

/** "Soat ma'lumotlari" sahifasidagi "Yangilash": batareya va avto-o'lchash sozlamasini soatdan qayta o'qiydi. */
export function refreshWatchInfo() {
  if (state.status !== "ready") return;
  try {
    watchModule?.readBattery();
    // SDK buyruqlarni parallel bajarmaydi: ikkinchisini biroz kechiktiramiz.
    setTimeout(() => {
      try {
        if (state.status === "ready") watchModule?.readAutoMeasure();
      } catch {
        // Eski build'da funksiya bo'lmasligi mumkin.
      }
    }, 1500);
  } catch {
    // Eski build'da funksiya bo'lmasligi mumkin.
  }
}

function applyConnection(e: {
  state: string;
  id?: string | null;
  message?: string | null;
  reason?: ConnectionReason | null;
}) {
  const model = (e.id ? namesById.get(e.id) : undefined) ?? state.model;
  switch (e.state) {
    case "connecting":
    case "authenticating":
      setState({
        status: "connecting",
        message: null,
        reason: null,
        model,
        // Boshqa soatga ulanilsa, oldingisining ma'lumoti qolib ketmasin.
        info: e.id && state.info.address !== e.id ? { ...EMPTY_INFO, address: e.id } : state.info,
      });
      break;
    case "ready": {
      setState({ status: "ready", message: null, reason: null, model, info: { ...state.info, address: e.id ?? state.info.address } });
      requestBattery(0);
      const id = e.id;
      if (id) restoreInfo(id);
      if (id) {
        // Nomi noma'lum bo'lsa (masalan JS qayta yuklangan) saqlangan nomni olamiz va uni null bilan bosib yubormaymiz.
        loadLastWatch()
          .then((last) => {
            const known = model ?? (last?.id === id ? last.name : null);
            if (known && state.status === "ready" && !state.model) setState({ model: known });
            return saveLastWatch({ id, name: known });
          })
          .catch(() => {}); // saqlanmasa ham ulanish ishlayveradi
      }
      break;
    }
    case "disconnected":
    case "error":
      clearTimeout(batteryTimer);
      // Xato va undan keyingi "disconnected" ketma-ket keladi: sababni oxirgisi o'chirib yubormasin.
      setState({
        status: "disconnected",
        message: e.message ?? state.message,
        // Yangi sababsiz xato kelsa eski sabab qolib ketmasin.
        reason: e.reason ?? (e.message ? null : state.reason),
        model: null,
        battery: null,
        info: EMPTY_INFO,
      });
      break;
  }
}

function ensureStarted() {
  if (started || !supported || !watchModule) return;
  started = true;

  watchModule.addListener("scan", (e) => {
    if (e.state === "found" && e.id && e.name) namesById.set(e.id, e.name);
  });
  watchModule.addListener("connection", (e) => {
    logWatch(`[ulanish] ${e.state}${e.message ? `: ${e.message}` : ""}`);
    applyConnection(e);
  });
  watchModule.addListener("bluetooth", (e) => {
    logWatch(`[bluetooth] ${e.on ? "yoqildi" : "o'chirildi"}`);
    // Bluetooth qayta yoqildi: "Bluetooth o'chirildi" xabari endi kerak emas, oxirgi soatga ulanish mumkin.
    if (e.on && state.reason === "bluetoothOff") setState({ message: null, reason: null });
  });
  watchModule.addListener("event", (e) => {
    logEvent(e);
    collectInfo(e);
    if (e.type !== "battery") return;
    const percent = batteryPercent(e);
    if (percent !== null) setState({ battery: percent });
  });

  // JS qayta yuklangan bo'lsa, native qism ulanishni saqlab turgan bo'lishi mumkin.
  try {
    applyConnection(watchModule.getConnectionState());
  } catch {
    // Eski build'da bu funksiya yo'q: oddiy holatda qolamiz.
  }
}

function subscribe(listener: () => void) {
  ensureStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

/** Hook'siz o'qish (masalan, EKG yozuvini saqlash paytida qurilma ma'lumoti uchun). */
export function getWatchConnection(): WatchConnection {
  return state;
}

export function useWatchConnection(): WatchConnection {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
