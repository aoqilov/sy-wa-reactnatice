import { useLocalSearchParams } from "expo-router";

import { FeatureHistory } from "@/features/history";
import type { MetricKey } from "@/features/home/api/get-metrics";

export default function HistoryScreen() {
  // ?metric=pulse — shu o'lchov ro'yxatning boshida va belgilangan holda chiqadi
  const { metric } = useLocalSearchParams<{ metric?: string }>();

  return <FeatureHistory focusKey={metric as MetricKey | undefined} />;
}
