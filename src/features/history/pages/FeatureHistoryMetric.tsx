import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { EcgRecordsPage } from "@/features/ecg";
import type { MetricKey } from "@/features/home/api/get-metrics";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { BloodHistoryCard } from "../components/blood-history-card";
import { HistoryDetails } from "../components/history-details";
import { PeriodTabs } from "../components/period-tabs";
import { useHistory } from "../hooks/use-history";
import { PERIODS, type Period } from "../lib/summarize";

type Props = { metric: string; period?: string };

const isPeriod = (v: string | undefined): v is Period => PERIODS.some((p) => p.value === v);

// Bitta o'lchov turining tarixi — alohida sahifa (/history/[metric]). Davr ro'yxat sahifasidan keladi va shu yerda
// ham almashtirsa bo'ladi. Qon tahlili: beshta ko'rsatkich accordion qatorlari; qolganlari: xulosa va kunlar bo'yicha
// har bir o'lchov. Ma'lumot telefonda saqlanganidan (sinxronni ro'yxat sahifasi qiladi).
export function FeatureHistoryMetric({ metric, period }: Props) {
  // EKG: davr xulosasi o'rniga saqlangan yozuvlar ro'yxati (har biri o'z hisoboti bilan, /history/ecg/[id]).
  if (metric === "ecg") return <EcgRecordsPage />;
  return <MetricHistory metric={metric} period={period} />;
}

function MetricHistory({ metric, period: initial }: Props) {
  const [period, setPeriod] = useState<Period>(isPeriod(initial) ? initial : "7d");
  const { summaries, loading, now } = useHistory(period, { sync: false });
  const tabBarSpace = useTabBarSpace();
  const summary = summaries.find((s) => s.meta.key === (metric as MetricKey));

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title={summary?.meta.title ?? "Tarix"} subtitle={summary?.meta.unit} fallbackHref="/history" />
      <PeriodTabs value={period} onChange={setPeriod} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !summary ? (
        <CusText tone="muted" className="p-6 text-center">
          Bunday o&apos;lchov yo&apos;q
        </CusText>
      ) : (
        <CusScrollView
          className="flex-1"
          contentContainerClassName="gap-3 p-4"
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
        >
          {summary.meta.key === "blood" ? (
            <BloodHistoryCard summary={summary} now={now} />
          ) : (
            <HistoryDetails summary={summary} now={now} />
          )}
        </CusScrollView>
      )}
    </View>
  );
}
