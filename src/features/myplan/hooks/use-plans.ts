import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MetricKey } from "@/features/home/api/get-metrics";
import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  capabilitiesFrom,
  loadPlanKeys,
  Plan,
  plansFrom,
  requestWatchPlans,
  savePlanKeys,
  type SendFailure,
  sendPlansToWatch,
} from "../api/plans";

// Soatdagi (saqlangan) reja bilan hozirgi reja orasidagi farqlar soni.
function countChanges(current: Plan[], saved: Plan[]) {
  const keys = new Set([...current.map((p) => p.key), ...saved.map((p) => p.key)]);
  let n = 0;
  keys.forEach((key) => {
    const a = current.find((p) => p.key === key);
    const b = saved.find((p) => p.key === key);
    if (!a || !b) {
      // Rejadan olib tashlangan, lekin soatda baribir o'chiq turgan bo'lsa — farq yo'q.
      if (a || b?.enabled) n++;
      return;
    }
    if (a.intervalMin !== b.intervalMin || a.enabled !== b.enabled || a.startMin !== b.startMin || a.endMin !== b.endMin) n++;
  });
  return n;
}

const READ_WAIT_MS = 10_000;

/**
 * Reja holati. `saved` — soatda hozir turgan jadval (watch-connection'dagi `info.autoMeasure` dan). `draft` —
 * foydalanuvchining yuborilmagan o'zgarishlari (null = o'zgarish yo'q, soatdagisi ko'rsatiladi).
 * Sahifa ochilganda jadval soatdan qayta o'qiladi.
 */
export function usePlans() {
  const { status, info } = useWatchConnection();
  const [keys, setKeys] = useState<MetricKey[]>([]);
  const [draft, setDraft] = useState<Plan[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ reason: SendFailure; keys: MetricKey[] } | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    void loadPlanKeys().then(setKeys);
  }, []);

  const read = useCallback(() => {
    if (requestWatchPlans()) setReading(true);
  }, []);

  // Sahifa ochilganda soatdagi haqiqiy jadval o'qiladi (boshqa joyda — soatning o'zida — o'zgargan bo'lishi mumkin).
  useFocusEffect(
    useCallback(() => {
      if (status === "ready") read();
    }, [status, read]),
  );

  // Jadval kelishini ko'p kutmaymiz: kelmasa, "o'qib bo'lmadi" holati.
  useEffect(() => {
    if (!reading) return;
    const id = setTimeout(() => setReading(false), READ_WAIT_MS);
    return () => clearTimeout(id);
  }, [reading]);

  const items = info.autoMeasure;
  // Soatdan javob kelgach "o'qilmoqda" belgisi o'chadi (render paytida holatni moslash).
  const [seenItems, setSeenItems] = useState(items);
  if (items !== seenItems) {
    setSeenItems(items);
    if (reading) setReading(false);
  }

  const caps = useMemo(() => (items ? capabilitiesFrom(items) : []), [items]);
  const saved = useMemo(() => (items ? plansFrom(items, keys) : []), [items, keys]);
  const plans = draft ?? saved;

  const edit = (next: Plan[]) => {
    setError(null);
    setDraft(next);
  };

  const rememberKeys = (next: MetricKey[]) => {
    setKeys(next);
    void savePlanKeys(next);
  };

  const upsert = (plan: Plan) => {
    edit(plans.some((p) => p.key === plan.key) ? plans.map((p) => (p.key === plan.key ? plan : p)) : [...plans, plan]);
    if (!keys.includes(plan.key)) rememberKeys([...keys, plan.key]);
  };

  const remove = (key: MetricKey) => {
    edit(plans.filter((p) => p.key !== key));
    rememberKeys(keys.filter((k) => k !== key));
  };

  const toggle = (key: MetricKey) => edit(plans.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p)));

  const send = async () => {
    setSending(true);
    setError(null);
    const result = await sendPlansToWatch(plans, saved, caps);
    setSending(false);
    if (result.ok) setDraft(null);
    else setError({ reason: result.reason, keys: result.failedKeys });
  };

  /** Yuborilmagan o'zgarishlarni bekor qilish: soatdagi holatga qaytish. */
  const discard = () => {
    setDraft(null);
    setError(null);
  };

  return {
    plans,
    caps,
    connected: status === "ready",
    loaded: items !== null,
    reading,
    read,
    upsert,
    remove,
    toggle,
    send,
    discard,
    sending,
    error,
    changes: countChanges(plans, saved),
    activeCount: plans.filter((p) => p.enabled).length,
  };
}
