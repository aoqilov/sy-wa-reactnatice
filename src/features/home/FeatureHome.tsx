import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusScrollView } from "@/components/ui";

import { Metric } from "./api/get-metrics";
import { MeasureActions } from "./components/measure-actions";
import { MeasureCircle } from "./components/measure-circle";
import { MetricSelector } from "./components/metric-selector";
import { useMeasurement } from "./hooks/use-measurement";
import { useMetrics } from "./hooks/use-metrics";
import { MetricGuideSheet } from "./modals/metric-guide-sheet";
import { MetricInfoSheet } from "./modals/metric-info-sheet";

export function FeatureHome() {
  const { metrics, loading } = useMetrics();

  if (loading || metrics.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return <HomeContent metrics={metrics} />;
}

function HomeContent({
  metrics,
}: {
  metrics: ReturnType<typeof useMetrics>["metrics"];
}) {
  const {
    items,
    current,
    selectedKey,
    select,
    measuring,
    secondsLeft,
    start,
    cancel,
  } = useMeasurement(metrics);
  const [guideOpen, setGuideOpen] = useState(false); // "Qanday o'lchanadi?" sheet'i

  // Info sheet: qaysi o'lchov haqida ekani va ochiq-yopiqligi alohida saqlanadi,
  // shunda yopilish animatsiyasi paytida sheet mazmuni o'zgarib ketmaydi.
  const [infoKey, setInfoKey] = useState<Metric["key"]>(metrics[0].key);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoMetric = items.find((m) => m.key === infoKey) ?? items[0];

  return (
    <View className="flex-1 bg-background">
      {/* Tepa qism qimirlamaydi: scroll paytida doira yopilib qolmaydi */}
      <View className="items-center gap-5 pb-5 pt-6">
        {/* 1. O'lchash */}
        <MeasureCircle
          metric={current}
          measuring={measuring}
          secondsLeft={secondsLeft}
          onStart={start}
          onCancel={cancel}
        />

        {/* 2. Oxirgi o'lchov | Qanday o'lchanadi? | Tarix */}
        <MeasureActions
          metric={current}
          onGuide={() => setGuideOpen(true)}
          onHistory={() => router.push({ pathname: "/history", params: { metric: current.key } })}
        />
      </View>

      {/* 3. Faqat o'lchov kartalari scroll bo'ladi (kerak bo'lsagina) */}
      <CusScrollView contentContainerClassName="pb-20">
        <MetricSelector
          metrics={items}
          selectedKey={selectedKey}
          onSelect={select}
          onInfo={(key) => {
            setInfoKey(key);
            setInfoOpen(true);
          }}
        />
      </CusScrollView>

      <MetricInfoSheet
        metric={infoMetric}
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      <MetricGuideSheet
        metric={current}
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </View>
  );
}
