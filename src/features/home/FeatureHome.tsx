import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CusButton, CusScrollView, CusText } from "@/components/ui";
import { useActivityGoals, useTodayActivity } from "@/features/activity";
import { EcgLiveStrip } from "@/features/ecg";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { Metric } from "./api/get-metrics";
import { BloodResult } from "./components/blood-result";
import { MeasureCircle } from "./components/measure-circle";
import { MetricSelector } from "./components/metric-selector";
import { StepsCard } from "./components/steps-card";
import { StepsHero } from "./components/steps-hero";
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

  // "Qadamlar" kartasi tanlangan: tepada o'lchash doirasi o'rnida katta qadam halqasi. O'lchov kartasi bosilsa qaytadi.
  // Ma'lumot bir marta o'qiladi va karta bilan halqaga beriladi.
  const [stepsView, setStepsView] = useState(false);
  const activity = useTodayActivity();
  const { goals, save: saveGoals } = useActivityGoals();
  const showSteps = stepsView && activity.available && !measuring;

  const selectMetric = (key: Metric["key"]) => {
    setStepsView(false);
    select(key);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Tepa qism qimirlamaydi: scroll paytida doira yopilib qolmaydi */}
      <View className="items-center gap-5 pb-5 pt-6">
        {/* "Qanday o'lchanadi?" — chap yuqori burchakda (faqat o'lchov uchun) */}
        {!showSteps ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Qanday o'lchanadi?"
            onPress={() => setGuideOpen(true)}
            hitSlop={8}
            className="absolute left-4 top-3 z-10 h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Octicons name="question" size={22} color={primary} />
          </Pressable>
        ) : null}

        {/* 1. O'lchash yoki (Qadamlar tanlangan bo'lsa) katta qadam halqasi */}
        {showSteps ? (
          <StepsHero
            today={activity.today}
            goals={goals}
            ready={activity.ready}
            onSaveGoals={(g) => void saveGoals(g)}
          />
        ) : (
          <MeasureCircle
            metric={current}
            measuring={measuring}
            progress={progress}
            display={display}
            onStart={start}
            onCancel={cancel}
          />
        )}

        {/* EKG: o'lchash paytida jonli to'lqin; boshqa paytda saqlangan yozuvlar History sahifasida (hisoboti bilan) */}
        {current.key === "ecg" && measuring ? <EcgLiveStrip /> : null}
        {current.key === "ecg" && !measuring && !showSteps ? (
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
        {error && !showSteps ? (
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
          {/* Qon tahlili: beshta ko'rsatkich (lipidlar, siydik kislotasi) hammasi bitta kartada */}
          {current.key === "blood" && current.blood && !measuring && !showSteps ? (
            <View className="px-4 pt-2">
              <BloodResult rows={current.blood} updatedAt={current.updatedAt} />
            </View>
          ) : null}

          <MetricSelector
            metrics={items}
            selectedKey={showSteps ? null : selectedKey}
            onSelect={selectMetric}
            leading={
              activity.available
                ? (width) => (
                    <StepsCard
                      today={activity.today}
                      goals={goals}
                      width={width}
                      active={showSteps}
                      disabled={measuring}
                      onSelect={() => setStepsView(true)}
                    />
                  )
                : undefined
            }
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
