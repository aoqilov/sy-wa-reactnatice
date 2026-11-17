import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { subscribeReadings } from "@/features/home/lib/readings";
import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  bodyDemo,
  bodyWatchHistoryAvailable,
  getBodySnapshot,
  loadBody,
  subscribeBody,
  syncBodyFromWatch,
  type BodySyncResult,
} from "../api/body";

/** Soatdagi tarix kam o'zgaradi: avtomatik o'qish shundan tez-tez bo'lmaydi. */
const AUTO_SYNC_MS = 30 * 60 * 1000;
const START_DELAY_MS = 6_000;

type Failure = Exclude<BodySyncResult, { ok: true }>["reason"];

let lastSync = 0;
let syncingNow = false;
const syncListeners = new Set<(on: boolean) => void>();

async function runSync(): Promise<BodySyncResult> {
  syncingNow = true;
  syncListeners.forEach((l) => l(true));
  try {
    const r = await syncBodyFromWatch();
    if (r.ok || r.reason === "unsupported" || r.reason === "outdated") lastSync = Date.now();
    return r;
  } finally {
    syncingNow = false;
    syncListeners.forEach((l) => l(false));
  }
}

/** Tashqaridan (History'ni tortib yangilash) soatdagi tana tarkibi tarixini o'qish. */
export function refreshBodyFromWatch(): Promise<BodySyncResult> {
  return runSync();
}

/**
 * Tana tarkibi o'lchovlari (eng yangisi birinchi). Home'da yangi o'lchov saqlansa o'zi yangilanadi. `autoSync` —
 * soat ulangan bo'lsa soatning o'zida o'lchanganlarni ham o'qiydi (30 daqiqada ko'pi bilan bir marta).
 */
export function useBody({ autoSync = false }: { autoSync?: boolean } = {}) {
  const { status } = useWatchConnection();
  const ready = status === "ready";
  const entries = useSyncExternalStore(subscribeBody, getBodySnapshot);
  const [syncing, setSyncing] = useState(syncingNow);
  const [error, setError] = useState<Failure | null>(null);

  useEffect(() => {
    syncListeners.add(setSyncing);
    void loadBody();
    const unsub = subscribeReadings(() => void loadBody());
    return () => {
      syncListeners.delete(setSyncing);
      unsub();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (syncingNow) return;
    const r = await runSync();
    setError(r.ok ? null : r.reason);
  }, []);

  useEffect(() => {
    if (!autoSync || !ready || !bodyWatchHistoryAvailable()) return;
    const timer = setTimeout(() => {
      if (!syncingNow && Date.now() - lastSync >= AUTO_SYNC_MS) void refresh();
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoSync, ready, refresh]);

  return { entries, syncing, error, ready, demo: bodyDemo(), refresh };
}
