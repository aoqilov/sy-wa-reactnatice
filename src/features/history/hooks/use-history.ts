import { useEffect, useMemo, useState } from "react";

import { getHistory, HistoryReading } from "../api/get-history";
import { Period, summarize } from "../lib/summarize";
import type { Metric } from "@/features/home/api/get-metrics";

export function useHistory(period: Period) {
  // "Hozir" bir marta olinadi, shunda render paytida o'zgarib ketmaydi.
  const [now] = useState(() => new Date());
  const [data, setData] = useState<{ metrics: Metric[]; readings: HistoryReading[] } | null>(null);

  useEffect(() => {
    getHistory(now).then(setData);
  }, [now]);

  const summaries = useMemo(
    () => (data ? data.metrics.map((m) => summarize(m, data.readings, period, now)) : []),
    [data, period, now],
  );

  return { summaries, loading: data === null, now };
}
