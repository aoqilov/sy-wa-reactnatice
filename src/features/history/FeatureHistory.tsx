import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusScrollView } from "@/components/ui";
import { EcgRecordsSheet } from "@/features/ecg";
import type { MetricKey } from "@/features/home/api/get-metrics";

import { HistoryCard } from "./components/history-card";
import { PeriodTabs } from "./components/period-tabs";
import { useHistory } from "./hooks/use-history";
import { Period } from "./lib/summarize";
import { HistoryDetailsSheet } from "./modals/history-details-sheet";

// focusKey: Home'dan "Tarix" bosilganda kelgan o'lchov. U ro'yxatning boshida va belgilangan holda chiqadi.
export function FeatureHistory({ focusKey }: { focusKey?: MetricKey }) {
  const [period, setPeriod] = useState<Period>("7d");
  const { summaries, loading, now } = useHistory(period);

  // Tafsilot sheet'i: qaysi o'lchov ekani va ochiq-yopiqligi alohida saqlanadi (yopilish animatsiyasi uchun).
  const [detailKey, setDetailKey] = useState<MetricKey | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // EKG: haqiqiy saqlangan yozuvlar va ularning hisoboti (to'lqin bilan).
  const [ecgOpen, setEcgOpen] = useState(false);

  const ordered = focusKey
    ? [...summaries].sort((a, b) => Number(b.meta.key === focusKey) - Number(a.meta.key === focusKey))
    : summaries;
  const detail = summaries.find((s) => s.meta.key === detailKey) ?? summaries[0];

  return (
    <View className="flex-1 bg-background">
      {/* Davr tanlash tepada qotib turadi, faqat kartalar scroll bo'ladi */}
      <PeriodTabs value={period} onChange={setPeriod} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <CusScrollView contentContainerClassName="gap-3 p-4 pb-32">
          {ordered.map((s) => (
            <HistoryCard
              key={s.meta.key}
              summary={s}
              highlighted={s.meta.key === focusKey}
              onPress={() => {
                if (s.meta.key === "ecg") {
                  setEcgOpen(true);
                  return;
                }
                setDetailKey(s.meta.key);
                setDetailOpen(true);
              }}
            />
          ))}
        </CusScrollView>
      )}

      {detail ? (
        <HistoryDetailsSheet
          summary={detail}
          period={period}
          now={now}
          visible={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}

      <EcgRecordsSheet visible={ecgOpen} onClose={() => setEcgOpen(false)} />
    </View>
  );
}
