import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusButton, CusScrollView, CusText } from "@/components/ui";
import { EcgLiveStrip } from "@/features/ecg";
import { useT } from "@/shared/i18n/use-t";

import { Metric } from "./api/get-metrics";
import { BloodResult } from "./components/blood-result";
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
    progress,
    display,
    hint,
    error,
    start,
    startOnWatch,
    cancel,
  } = useMeasurement(metrics);
  const t = useT();
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
          progress={progress}
          display={display}
          onStart={start}
          onCancel={cancel}
        />

        {/* Nasosli bosim: ilovadan boshlash soatda ishlamasa, soatning o'zida o'lchab natijani olish mumkin */}
        {current.key === "pressurePump" && !measuring ? (
          <CusButton
            title={t("measure.onWatch.action")}
            variant="ghost"
            size="sm"
            onPress={startOnWatch}
          />
        ) : null}

        {/* EKG: o'lchash paytida jonli to'lqin; boshqa paytda saqlangan yozuvlar History sahifasida (hisoboti bilan) */}
        {current.key === "ecg" && measuring ? <EcgLiveStrip /> : null}
        {current.key === "ecg" && !measuring ? (
          <CusButton
            title={t("ecg.records")}
            variant="ghost"
            size="sm"
            onPress={() => router.push({ pathname: "/history", params: { metric: "ecg" } })}
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

        {/* 2. Oxirgi o'lchov | Qanday o'lchanadi? | Tarix */}
        <MeasureActions
          metric={current}
          onGuide={() => setGuideOpen(true)}
          onHistory={() =>
            router.push({
              pathname: "/history",
              params: { metric: current.key },
            })
          }
        />
      </View>

      {/* 3. Faqat o'lchov kartalari scroll bo'ladi (kerak bo'lsagina) */}
      <CusScrollView contentContainerClassName="pb-20">
        {/* Qon tahlili: beshta ko'rsatkich (lipidlar, siydik kislotasi) hammasi bitta kartada */}
        {current.key === "blood" && current.blood && !measuring ? (
          <View className="px-4 pb-4">
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
