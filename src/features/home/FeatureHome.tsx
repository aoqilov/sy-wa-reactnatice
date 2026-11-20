import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusScrollView, CusText } from "@/components/ui";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { Metric } from "./api/get-metrics";
import { ActivitySlider } from "./components/activity-slider";
import { MetricSelector } from "./components/metric-selector";
import { useMeasurement } from "./hooks/use-measurement";
import { useMetrics } from "./hooks/use-metrics";
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

/** O'lchov kartasi bosilganda: o'z sahifasi (/measure/[metric]) — doira va bugungi natijalar. */
const openMeasure = (metric: string) =>
  router.push({ pathname: "/measure/[metric]", params: { metric } });

// Bosh sahifa: tepada Qadamlar va Uyqu slayderi, ostida o'lchov kartalari to'ri. O'lchash har kartaning o'z sahifasida.
function HomeContent({ metrics }: { metrics: Metric[] }) {
  // Faqat kartalardagi oxirgi natijalar uchun (o'lchash bu yerda boshlanmaydi). O'lchov sahifasida saqlangan natija
  // `subscribeReadings` orqali shu yerga ham keladi.
  const { items } = useMeasurement(metrics);
  const tabBarSpace = useTabBarSpace();

  // Info sheet: qaysi o'lchov haqida ekani va ochiq-yopiqligi alohida saqlanadi,
  // shunda yopilish animatsiyasi paytida sheet mazmuni o'zgarib ketmaydi.
  const [infoKey, setInfoKey] = useState<Metric["key"]>(metrics[0].key);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoMetric = items.find((m) => m.key === infoKey) ?? items[0];

  return (
    <View className="flex-1 bg-background">
      <CusScrollView className="flex-1" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
        <View className="px-4 pb-3 pt-5">
          <CusText variant="title">Sog&apos;lig&apos;im</CusText>
        </View>

        <ActivitySlider />

        <View className="gap-1 px-4 pb-1 pt-5">
          <CusText variant="heading">O&apos;lchovlar</CusText>
          <CusText variant="caption" tone="muted">
            Kartani bosing: o&apos;lchash va bugungi natijalar
          </CusText>
        </View>

        <MetricSelector
          metrics={items}
          selectedKey={null}
          onSelect={openMeasure}
          onInfo={(key) => {
            setInfoKey(key);
            setInfoOpen(true);
          }}
        />
      </CusScrollView>

      <MetricInfoSheet metric={infoMetric} visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  );
}
