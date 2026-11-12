import { holdWatch, isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";

// Soat siferblati do'koni: Veepoo serveridagi siferblatlar ro'yxati va soatga o'rnatish. Native qism:
// WatchController.kt ("siferblatlar"). SDK: soatdan asosiy ma'lumot → serverdan ro'yxat → faylni yuklab olish →
// soatga uzatish (oddiy soatda UiUpdateUtil, Jieli soatda setJLWatchDial). Uzatish ~2 daqiqa.

export type DialInfo = {
  jl: boolean;
  screenStyle: boolean;
  serverUi: boolean;
  bigTranType: number;
  serverCount: number;
  appPackage: string;
  appVersion: string;
};

export type MarketDial = { crc: string; name: string; previewUrl: string; fileUrl: string; binProtocol: string };

export type MarketFailure =
  | "notReady"
  | "busy"
  | "outdated"
  | "noDevice" // soat raqami/versiyasi noma'lum (ulanish ma'lumoti to'liq emas)
  | "unsupported"
  | "noInfo"
  | "network"
  | "noReply";
/** Soat qaysi faylni kutadi va ro'yxatdan nechtasi yashirildi ("Texnik ma'lumot" uchun). */
export type MarketDevice = { binDataType: string; shape: string; hidden: number };

export type MarketResult =
  | { ok: true; items: MarketDial[]; currentCrc: number | null; device: MarketDevice }
  | { ok: false; reason: MarketFailure; message?: string };

export type InstallStage = "download" | "prepare" | "clear" | "transfer";
export type InstallResult = { ok: true } | { ok: false; error: string; message?: string };

const INFO_TIMEOUT_MS = 8_000;
const MARKET_TIMEOUT_MS = 40_000;
/** Uzatish paytida soatdan shuncha vaqt hech qanday hodisa kelmasa — javob yo'q. */
const INSTALL_IDLE_MS = 90_000;

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Bitta hodisani kutadi (vaqt tugasa null). */
function waitEvent(type: string, ms: number): Promise<WatchEvent | null> {
  const watch = watchModule;
  if (!watch) return Promise.resolve(null);
  return new Promise((resolve) => {
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== type) return;
      clearTimeout(timer);
      sub.remove();
      resolve(e);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(null);
    }, ms);
  });
}

/** O'rnatilgan APK siferblat funksiyalarini biladimi (eski build'da yo'q). */
export function dialsAvailable(): boolean {
  return !!watchModule && typeof watchModule.loadDialMarket === "function";
}

export async function readDialInfo(): Promise<DialInfo | null> {
  const watch = watchModule;
  if (!watch || !dialsAvailable() || getWatchConnection().status !== "ready") return null;
  const reply = waitEvent("dialInfo", INFO_TIMEOUT_MS);
  try {
    watch.readDialInfo();
  } catch {
    return null;
  }
  const e = await reply;
  if (!e) return null;
  return {
    jl: e.jl === true,
    screenStyle: e.screenStyle === true,
    serverUi: e.serverUi === true,
    bigTranType: typeof e.bigTranType === "number" ? e.bigTranType : 0,
    serverCount: typeof e.serverCount === "number" ? e.serverCount : 0,
    appPackage: text(e.appPackage),
    appVersion: text(e.appVersion),
  };
}

export async function loadMarket(): Promise<MarketResult> {
  const watch = watchModule;
  const conn = getWatchConnection();
  if (!watch || conn.status !== "ready") return { ok: false, reason: "notReady" };
  if (!dialsAvailable()) return { ok: false, reason: "outdated" };
  if (isMeasuring()) return { ok: false, reason: "busy" };
  const { deviceNumber, testFirmware } = conn.info;
  if (deviceNumber === null) return { ok: false, reason: "noDevice" };

  const reply = waitEvent("dialMarket", MARKET_TIMEOUT_MS);
  try {
    watch.loadDialMarket(String(deviceNumber), testFirmware ?? "");
  } catch {
    return { ok: false, reason: "noReply" };
  }
  const e = await reply;
  if (!e) return { ok: false, reason: "noReply" };
  if (typeof e.error === "string") {
    const reason: MarketFailure = e.error === "UNSUPPORTED" ? "unsupported" : e.error === "NO_INFO" ? "noInfo" : "network";
    return { ok: false, reason, message: text(e.message) || undefined };
  }
  const all = (Array.isArray(e.items) ? (e.items as Record<string, unknown>[]) : []).filter(
    (r) => text(r.fileUrl) !== "" && text(r.previewUrl) !== "",
  );
  // Server bu soatga mos emas deb belgilaganlarini (available: false) ko'rsatmaymiz: soat ularni
  // "File information does not match" (Jieli 16896) bilan rad etadi. Bayroq kelmasa (eski build) — ko'rsatiladi.
  const items = all
    .filter((r) => r.available !== false)
    .map((r) => ({
      crc: text(r.crc),
      name: text(r.name),
      previewUrl: text(r.previewUrl),
      fileUrl: text(r.fileUrl),
      binProtocol: text(r.binProtocol),
    }));
  return {
    ok: true,
    items,
    currentCrc: typeof e.currentCrc === "number" ? e.currentCrc : null,
    device: { binDataType: text(e.binDataType), shape: text(e.shape), hidden: all.length - items.length },
  };
}

/** Do'kondagi siferblat soatdagi hozirgisimi: server CRC'ni matn (o'nlik yoki o'n oltilik) sifatida beradi. */
export function isCurrentDial(dial: MarketDial, currentCrc: number | null): boolean {
  if (currentCrc === null || currentCrc === 0 || dial.crc === "") return false;
  const crc = dial.crc.trim();
  return crc === String(currentCrc) || parseInt(crc, 16) === currentCrc;
}

/**
 * Siferblatni yuklab olib soatga o'rnatadi. Uzatish davomida soat band qilinadi (o'lchov, rutina, tarix sinxroni
 * boshlanmaydi). `onProgress` — bosqich va foiz (0..100).
 */
export function installDial(
  dial: MarketDial,
  onProgress: (stage: InstallStage, percent: number) => void,
): Promise<InstallResult> {
  const watch = watchModule;
  if (!watch || getWatchConnection().status !== "ready") return Promise.resolve({ ok: false, error: "NOT_READY" });
  if (!dialsAvailable()) return Promise.resolve({ ok: false, error: "OUTDATED" });
  if (isMeasuring()) return Promise.resolve({ ok: false, error: "BUSY" });

  const release = holdWatch();
  return new Promise((resolve) => {
    let idle: ReturnType<typeof setTimeout> | undefined;
    const finish = (r: InstallResult) => {
      clearTimeout(idle);
      sub.remove();
      conn.remove();
      release();
      resolve(r);
    };
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => finish({ ok: false, error: "NO_REPLY" }), INSTALL_IDLE_MS);
    };
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type !== "dialInstall") return;
      touch();
      const stage = text(e.stage);
      if (stage === "done") return finish({ ok: true });
      if (stage === "error") return finish({ ok: false, error: text(e.error) || "TRANSFER", message: text(e.message) || undefined });
      const percent = typeof e.progress === "number" ? Math.max(0, Math.min(100, e.progress)) : 0;
      if (stage === "download" || stage === "prepare" || stage === "clear" || stage === "transfer") onProgress(stage, percent);
    });
    const conn = watch.addListener("connection", (c) => {
      if (c.state === "disconnected" || c.state === "error") finish({ ok: false, error: "LOST" });
    });
    touch();
    try {
      watch.installDial(dial.fileUrl, dial.crc || dial.name || String(Date.now()));
    } catch {
      finish({ ok: false, error: "TRANSFER" });
    }
  });
}
