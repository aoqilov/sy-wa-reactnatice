import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Metric } from "@/features/home/api/get-metrics";
import { useWatchConnection } from "@/shared/watch/watch-connection";
import { loadLastSync, type SyncFailure, syncWatchHistory } from "@/shared/watch/watch-history";

import { getHistory, HISTORY_DAYS, HistoryReading } from "../api/get-history";
import { Period, summarize } from "../lib/summarize";

/** Sahifa qayta ochilganda shundan tez-tez soatga so'rov yubormaymiz. */
const RESYNC_AFTER_MS = 60_000;

export type SyncState = {
  syncing: boolean;
  lastSyncAt: number | null;
  error: SyncFailure | null;
};

/**
 * History ma'lumoti: avval telefonda saqlangani darhol ko'rinadi (Home o'lchovlari + oldingi sinxron), keyin soat
 * ulangan bo'lsa soat xotirasidagi yangi yozuvlar o'qiladi va ro'yxat yangilanadi. Sahifa har ochilganda (fokus)
 * sinxron qilinadi, lekin bir daqiqada ko'pi bilan bir marta; "Yangilash" tugmasi esa darhol.
 */
export function useHistory(period: Period, { sync: withSync = true }: { sync?: boolean } = {}) {
  const { status } = useWatchConnection();
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState<{ metrics: Metric[]; readings: HistoryReading[] } | null>(null);
  const [sync, setSync] = useState<SyncState>({ syncing: false, lastSyncAt: null, error: null });
  const syncingRef = useRef(false);
  const lastSyncRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    const next = await getHistory();
    setNow(new Date());
    setData(next);
  }, []);

  // Oxirgi sinxron vaqti (ko'rsatish uchun). Ma'lumotning o'zi quyidagi fokus effektida yuklanadi.
  useEffect(() => {
    void loadLastSync().then((at) => {
      lastSyncRef.current ??= at; // shu orada sinxron bo'lib ulgurgan bo'lsa, yangisi qoladi
      setSync((s) => ({ ...s, lastSyncAt: s.lastSyncAt ?? at }));
    });
  }, []);

  const runSync = useCallback(
    async (force: boolean) => {
      if (syncingRef.current) return;
      const last = lastSyncRef.current;
      if (!force && last !== null && Date.now() - last < RESYNC_AFTER_MS) {
        await reload(); // Home'da yangi o'lchov bo'lgan bo'lishi mumkin
        return;
      }
      syncingRef.current = true;
      setSync((s) => ({ ...s, syncing: true, error: null }));
      const result = await syncWatchHistory(HISTORY_DAYS);
      syncingRef.current = false;
      const at = result.ok ? Date.now() : lastSyncRef.current;
      if (result.ok) lastSyncRef.current = at;
      setSync({ syncing: false, lastSyncAt: at, error: result.ok ? null : result.reason });
      await reload();
    },
    [reload],
  );

  // Sahifa ochilganda (va soat ulanib bo'lganda) sinxron.
  useFocusEffect(
    useCallback(() => {
      // Ichki sahifalar (o'lchov, EKG) faqat saqlanganini o'qiydi: sinxronni ro'yxat sahifasi qiladi.
      if (withSync && status === "ready") void runSync(false);
      else void reload();
    }, [withSync, status, runSync, reload]),
  );

  const summaries = useMemo(
    () => (data ? data.metrics.map((m) => summarize(m, data.readings, period, now)) : []),
    [data, period, now],
  );

  return { summaries, loading: data === null, now, sync, refresh: () => runSync(true), connected: status === "ready" };
}
