import { useCallback, useEffect, useRef, useState } from "react";

import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  type HealthRemind,
  type HeartWarning,
  type LongSeat,
  readWatchReminders,
  saveHealthRemind,
  saveHeartWarning,
  saveLongSeat,
  type WatchReminderFailure,
  type WatchReminders,
} from "../api/watch-reminders";

/** Boshqa tab'lardagi o'qishlar (avto-o'lchash, matnli eslatmalar) tugashini kutamiz. */
const READ_DELAY_MS = 1_200;

/**
 * Soatdagi eslatmalar: `active` bo'lganda (tab ochiq) soatdan o'qiladi, har bir o'zgarish darhol soatga yoziladi.
 * Saqlanmasa ro'yxat o'zgarmaydi va xato ko'rsatiladi.
 */
export function useWatchReminders(active: boolean) {
  const { status } = useWatchConnection();
  const connected = status === "ready";
  const [data, setData] = useState<WatchReminders | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<WatchReminderFailure | null>(null);
  const [saveError, setSaveError] = useState<WatchReminderFailure | null>(null);
  const busy = useRef(false);

  const read = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const r = await readWatchReminders();
    busy.current = false;
    setLoading(false);
    if (r.ok) {
      setData(r.value);
      setError(null);
    } else {
      setError(r.reason);
    }
  }, []);

  useEffect(() => {
    if (!active || !connected) return;
    const id = setTimeout(() => void read(), READ_DELAY_MS);
    return () => clearTimeout(id);
  }, [active, connected, read]);

  const save = useCallback(
    async <T>(run: () => Promise<{ ok: true; value: T } | { ok: false; reason: WatchReminderFailure }>, apply: (d: WatchReminders, v: T) => WatchReminders) => {
      if (busy.current) return false;
      busy.current = true;
      setSaving(true);
      const r = await run();
      busy.current = false;
      setSaving(false);
      if (!r.ok) {
        setSaveError(r.reason);
        return false;
      }
      setSaveError(null);
      setData((d) => (d ? apply(d, r.value) : d));
      return true;
    },
    [],
  );

  const setHealth = useCallback(
    (h: HealthRemind) =>
      save(
        () => saveHealthRemind(h),
        (d, v) => ({ ...d, health: d.health?.map((x) => (x.type === v.type ? v : x)) ?? null }),
      ),
    [save],
  );
  const setLongSeat = useCallback(
    (l: LongSeat) => save(() => saveLongSeat(l), (d, v) => ({ ...d, longSeat: v })),
    [save],
  );
  const setHeart = useCallback(
    (h: HeartWarning) => save(() => saveHeartWarning(h), (d, v) => ({ ...d, heart: v })),
    [save],
  );

  return { data, loading, saving, error, saveError, connected, read, setHealth, setLongSeat, setHeart };
}
