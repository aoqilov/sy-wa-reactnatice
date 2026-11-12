import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CusButton, CusScrollView, CusText } from "@/components/ui";
import { ActivityCard } from "@/features/activity";
import { EcgLiveStrip } from "@/features/ecg";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { Metric } from "./api/get-metrics";
import { BloodResult } from "./components/blood-result";
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
    progress,
    display,
    hint,
    error,
    start,
    cancel,
  } = useMeasurement(metrics);
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const tabBarSpace = useTabBarSpace();
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
        {/* "Qanday o'lchanadi?" — chap yuqori burchakda */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qanday o'lchanadi?"
          onPress={() => setGuideOpen(true)}
          hitSlop={8}
          className="absolute left-4 top-3 z-10 h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
        >
          <Octicons name="question" size={22} color={primary} />
        </Pressable>

        {/* 1. O'lchash */}
        <MeasureCircle
          metric={current}
          measuring={measuring}
          progress={progress}
          display={display}
          onStart={start}
          onCancel={cancel}
        />

        {/* EKG: o'lchash paytida jonli to'lqin; boshqa paytda saqlangan yozuvlar History sahifasida (hisoboti bilan) */}
        {current.key === "ecg" && measuring ? <EcgLiveStrip /> : null}
        {current.key === "ecg" && !measuring ? (
          <CusButton
            title={t("ecg.records")}
            variant="ghost"
            size="sm"
            onPress={() =>
              router.push({ pathname: "/history/[metric]", params: { metric: "ecg" } }, { withAnchor: true })
            }
          />
        ) : null}

        {/* O'lchash davomida soat ogohlantirsa (qo'l yurak balandligida emas, qimirladi): xato emas, o'lchov davom etadi */}
        {measuring && hint ? (
          <CusText
            variant="caption"
            tone="warning"
            className="px-6 text-center"
          >
            {hint}
          </CusText>
        ) : null}

        {/* Soat o'lchovni yakunlay olmasa (taqilmagan, band, aloqa uzilgan ...) sababi shu yerda */}
        {error ? (
          <CusText variant="caption" tone="danger" className="px-6 text-center">
            {error}
          </CusText>
        ) : null}

      </View>

      {/* 3. O'lchovlar paneli: sarlavha qotib turadi, faqat kartalar scroll bo'ladi (kerak bo'lsagina).
          Pastda suzuvchi tab bar balandligicha joy. */}
      <View
        className="flex-1 border-t border-border bg-surface"
        style={{ borderTopStartRadius: 12, borderTopEndRadius: 12 }}
      >
        <View className="gap-1 px-4 pb-2 pt-4">
          <CusText variant="heading">O&apos;lchovni tanlang</CusText>
          <CusText variant="caption" tone="muted">
            Kerakli ko&apos;rsatkichni tanlab, yuqoridagi &quot;Boshlash&quot; tugmasini bosing.
          </CusText>
        </View>

        <CusScrollView className="flex-1" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          {/* Bugungi faollik: qadam halqasi, kkal, masofa (soatdan) */}
          <View className="px-4 pt-2">
            <ActivityCard />
          </View>

          {/* Qon tahlili: beshta ko'rsatkich (lipidlar, siydik kislotasi) hammasi bitta kartada */}
          {current.key === "blood" && current.blood && !measuring ? (
            <View className="px-4 pt-2">
              <BloodResult rows={current.blood} updatedAt={current.updatedAt} />
            </View>
          ) : null}

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
      </View>

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
