import { useState } from "react";

import type { MetricKey } from "@/features/home/api/get-metrics";

import { INITIAL_PLANS, Plan, sendPlansToWatch } from "../api/plans";

// Soatdagi (saqlangan) reja bilan hozirgi reja orasidagi farqlar soni.
function countChanges(current: Plan[], saved: Plan[]) {
  const keys = new Set([...current.map((p) => p.key), ...saved.map((p) => p.key)]);
  let n = 0;
  keys.forEach((key) => {
    const a = current.find((p) => p.key === key);
    const b = saved.find((p) => p.key === key);
    if (!a || !b || a.intervalMin !== b.intervalMin || a.enabled !== b.enabled) n++;
  });
  return n;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);
  const [saved, setSaved] = useState<Plan[]>(INITIAL_PLANS); // soatga oxirgi yuborilgan holat
  const [sending, setSending] = useState(false);

  const upsert = (plan: Plan) =>
    setPlans((prev) =>
      prev.some((p) => p.key === plan.key) ? prev.map((p) => (p.key === plan.key ? plan : p)) : [...prev, plan],
    );

  const remove = (key: MetricKey) => setPlans((prev) => prev.filter((p) => p.key !== key));

  const toggle = (key: MetricKey) =>
    setPlans((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p)));

  const send = async () => {
    setSending(true);
    try {
      await sendPlansToWatch(plans);
      setSaved(plans);
    } finally {
      setSending(false);
    }
  };

  return {
    plans,
    upsert,
    remove,
    toggle,
    send,
    sending,
    changes: countChanges(plans, saved),
    activeCount: plans.filter((p) => p.enabled).length,
  };
}
