import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  getSleepSnapshot,
  loadSleep,
  sleepAvailable,
  sleepDemo,
  subscribeSleep,
  syncSleep,
  type SleepSyncResult,
} from "../api/sleep";

/** Uyqu kuniga bir marta o'zgaradi: avtomatik sinxron shundan tez-tez bo'lmaydi. */
const AUTO_SYNC_MS = 15 * 60 * 1000;
/** Ulanishdan keyin soat parol, imkoniyatlar, shaxsiy ma'lumot buyruqlarini bajarib bo'lsin. */
const START_DELAY_MS = 5_000;
/** Soat band bo'lsa (tarix sinxroni, o'lchov) shundan keyin qayta uriniladi. */
const BUSY_RETRY_MS = 20_000;

type Failure = Exclude<SleepSyncResult, { ok: true }>["reason"];

let snapshot = getSleepSnapshot();
const subscribe = (cb: () => void) =>
  subscribeSleep(() => {
    snapshot = getSleepSnapshot();
    cb();
  });
const getSnapshot = () => snapshot;

let lastAutoSync = 0;
let syncingNow = false;
const syncListeners = new Set<(on: boolean) => void>();

async function runSync(): Promise<SleepSyncResult> {
  syncingNow = true;
  syncListeners.forEach((l) => l(true));
  try {
    const result = await syncSleep();
    if (result.ok) lastAutoSync = Date.now();
    return result;
  } finally {
    syncingNow = false;
    syncListeners.forEach((l) => l(false));
  }
}

/**
 * Uyqu kechalari (telefonda saqlangani darhol, so'ng soatdan). Soat ulanganda, ilova oldinga chiqqanda (15 daqiqada
 * ko'pi bilan bir marta) va `refresh` bilan sinxron qilinadi. Home kartasi va uyqu sahifasi bitta holatni ko'radi.
 */
export function useSleep() {
  const { status } = useWatchConnection();
  const ready = status === "ready";
  const { nights, syncedAt } = useSyncExternalStore(subscribe, getSnapshot);
  const [syncing, setSyncing] = useState(syncingNow);
  const [error, setError] = useState<Failure | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    syncListeners.add(setSyncing);
    void loadSleep();
    return () => {
      syncListeners.delete(setSyncing);
      clearTimeout(retry.current);
    };
  }, []);

  const sync = useCallback(async (force: boolean) => {
    // Soat band bo'lsa (tarix sinxroni ketyapti) bir necha marta qayta urinadi.
    for (let attempt = 0; attempt < 4; attempt++) {
      if (syncingNow) return;
      if (!force && Date.now() - lastAutoSync < AUTO_SYNC_MS) return;
      const result = await runSync();
      setError(result.ok ? null : result.reason);
      if (result.ok || result.reason !== "busy") return;
      await new Promise<void>((resolve) => {
        retry.current = setTimeout(resolve, BUSY_RETRY_MS);
      });
    }
  }, []);

  useEffect(() => {
    if (!ready || !sleepAvailable()) return;
    const timer = setTimeout(() => void sync(false), START_DELAY_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void sync(false);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [ready, sync]);

  return {
    nights,
    syncedAt,
    syncing,
    error,
    ready,
    available: sleepAvailable(),
    demo: sleepDemo(),
    refresh: () => sync(true),
  };
}
