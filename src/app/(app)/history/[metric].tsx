import { useLocalSearchParams } from "expo-router";

import { FeatureHistoryMetric } from "@/features/history";

// /history/pulse?period=7d — bitta o'lchov turining tarixi. /history/ecg — EKG yozuvlari ro'yxati.
export default function HistoryMetricScreen() {
  const { metric, period } = useLocalSearchParams<{ metric: string; period?: string }>();

  return <FeatureHistoryMetric metric={metric} period={period} />;
}
