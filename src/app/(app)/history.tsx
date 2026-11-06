import { useLocalSearchParams } from "expo-router";

import { FeatureHistory } from "@/features/history";
import type { MetricKey } from "@/features/home/api/get-metrics";

export default function HistoryScreen() {
  // Home'dagi "Tarix" bloki ?metric=pulse kabi parametr yuboradi
  const { metric } = useLocalSearchParams<{ metric?: string }>();

  return <FeatureHistory focusKey={metric as MetricKey | undefined} />;
}
