import { useEffect, useState } from "react";

import { getMetrics, Metric } from "../api/get-metrics";

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  return { metrics, loading };
}
