import { useLocalSearchParams } from "expo-router";

import { FeatureMeasure } from "@/features/home";

// /measure/pulse — bitta o'lchov sahifasi: doira ("Boshlash") va bugungi natijalar.
export default function MeasureScreen() {
  const { metric } = useLocalSearchParams<{ metric: string }>();

  return <FeatureMeasure metric={metric} />;
}
