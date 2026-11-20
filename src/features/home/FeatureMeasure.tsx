import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CusButton, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { EcgLiveStrip } from "@/features/ecg";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import type { Metric, MetricKey, MetricStatus } from "./api/get-metrics";
import { MeasureCircle } from "./components/measure-circle";
import { METRIC_COLORS } from "./constants/metric-colors";
import { useMeasurement } from "./hooks/use-measurement";
import { useMetrics } from "./hooks/use-metrics";
import type { StoredReading } from "./lib/readings";
import { MetricGuideSheet } from "./modals/metric-guide-sheet";

const STATUS_TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Shu o'lchovning to'liq tarixi qayerda: tana tarkibi o'z sahifasida, qolganlari /history/[metric] da. */
function openHistory(key: MetricKey) {
  if (key === "bodyComp") router.push("/history/body", { withAnchor: true });
  else router.push({ pathname: "/history/[metric]", params: { metric: key } }, { withAnchor: true });
}

// /measure/[metric]: Home'dagi o'lchov kartasi bosilganda ochiladigan sahifa: doira ("Boshlash") va ostida bugungi
// natijalar. (Qadamlar va uyqu Home slayderida, ularning ichki sahifasi yo'q.)
export function FeatureMeasure({ metric }: { metric: string }) {
  return <MetricPage metricKey={metric} />;
}

function MetricPage({ metricKey }: { metricKey: string }) {
  const { metrics, loading } = useMetrics();
  const known = metrics.find((m) => m.key === metricKey);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }
  if (!known) {
    return (
      <View className="flex-1 bg-background">
        <CusPageHeader title="O'lchov" fallbackHref="/" />
        <CusText tone="muted" className="p-6 text-center">
          Bunday o&apos;lchov yo&apos;q
        </CusText>
      </View>
    );
  }
  return <MetricMeasure metrics={metrics} metricKey={known.key} />;
}

function MetricMeasure({ metrics, metricKey }: { metrics: Metric[]; metricKey: MetricKey }) {
  const { readings, current, measuring, progress, display, hint, error, start, cancel } = useMeasurement(
    metrics,
    metricKey,
  );
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const tabBarSpace = useTabBarSpace();
  const [guideOpen, setGuideOpen] = useState(false);
  // "Bugun" chegarasi sahifa ochilganda bir marta olinadi (render paytida Date.now() chaqirilmasin).
  const [todayFrom] = useState(startOfToday);

  const today = readings.filter((r) => r.key === metricKey && r.at >= todayFrom);

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader
        fallbackHref="/"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Qanday o'lchanadi?"
            onPress={() => setGuideOpen(true)}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-alt"
          >
            <Octicons name="question" size={24} color={primary} />
          </Pressable>
        }
      />

      <CusScrollView className="flex-1" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
        {/* O'lchov nomi va me'yori: doira tepasida, katta (asosiy foydalanuvchilar 45+) */}
        <View className="items-center gap-1 px-6 pt-1">
          <CusText className="text-center text-2xl font-bold">{current.title}</CusText>
          <CusText tone="muted" className="text-center">
            {`Me'yor: ${current.normalRange}`}
          </CusText>
        </View>

        <View className="items-center gap-4 pb-6 pt-5">
          <MeasureCircle
            metric={current}
            measuring={measuring}
            progress={progress}
            display={display}
            onStart={start}
            onCancel={cancel}
          />

          {/* EKG: o'lchash paytida jonli to'lqin */}
          {metricKey === "ecg" && measuring ? <EcgLiveStrip /> : null}

          {/* O'lchash davomida soat ogohlantirsa (qo'l yurak balandligida emas, qimirladi): xato emas, o'lchov davom etadi */}
          {measuring && hint ? (
            <CusText variant="caption" tone="warning" className="px-6 text-center">
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

        <TodayList metric={current} today={today} />

        <View className="items-center px-4 pt-2">
          <CusButton
            title={metricKey === "ecg" ? t("ecg.records") : "Barcha tarix"}
            variant="ghost"
            size="sm"
            onPress={() => openHistory(metricKey)}
          />
        </View>
      </CusScrollView>

      <MetricGuideSheet metric={current} visible={guideOpen} onClose={() => setGuideOpen(false)} />
    </View>
  );
}

// Bugungi natijalar: xulosa (min · o'rtacha · maks) va har bir o'lchov (vaqt, qiymat, holat), yangisi tepada.
function TodayList({ metric, today }: { metric: Metric; today: StoredReading[] }) {
  const color = METRIC_COLORS[metric.key];
  const showSummary = today.length >= 2 && metric.key !== "blood";

  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <CusText variant="heading">Bugun</CusText>
        <CusText variant="caption" tone="muted">
          {today.length > 0 ? `${today.length} ta o'lchov` : ""}
        </CusText>
      </View>

      {showSummary ? (
        <View className="flex-row gap-2">
          <Stat label="Min" value={metric.summary.min} />
          <Stat label="O'rtacha" value={metric.summary.avg} />
          <Stat label="Maks" value={metric.summary.max} />
        </View>
      ) : null}

      {today.length === 0 ? (
        <View className="items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-6">
          <Octicons name="history" size={20} color={color} />
          <CusText tone="muted" className="text-center">
            Bugun hali o&apos;lchanmagan
          </CusText>
          <CusText variant="caption" tone="muted" className="text-center">
            Yuqoridagi &quot;Boshlash&quot; tugmasini bosing
          </CusText>
        </View>
      ) : (
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {today.map((r, i) => (
            <View
              key={`${r.at}-${i}`}
              className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <CusText tone="muted" className="w-12">
                {hhmm(r.at)}
              </CusText>
              <View className="flex-1 flex-row items-baseline gap-1">
                <CusText className="text-lg font-bold" numberOfLines={1}>
                  {r.value}
                </CusText>
                <CusText variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {metric.unit}
                </CusText>
              </View>
              <CusText variant="caption" tone={STATUS_TONE[r.status]} className="font-semibold" numberOfLines={1}>
                {r.statusLabel.split(" · ")[0]}
              </CusText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-xl border border-border bg-surface py-2">
      <CusText variant="caption" tone="muted">
        {label}
      </CusText>
      <CusText className="text-lg font-bold">{value}</CusText>
    </View>
  );
}
