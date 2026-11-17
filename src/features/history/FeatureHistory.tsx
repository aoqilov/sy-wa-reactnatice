import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";

import { CusScrollView, CusText } from "@/components/ui";
import type { MetricKey } from "@/features/home/api/get-metrics";
import { activityAvailable, StepsHistoryCard } from "@/features/activity";
import { BodyHistoryCard, refreshBodyFromWatch } from "@/features/body";
import { SleepHistoryCard, useSleep } from "@/features/sleep";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import type { SyncFailure } from "@/shared/watch/watch-history";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { HistoryCard } from "./components/history-card";
import { PeriodTabs } from "./components/period-tabs";
import { type SyncState, useHistory } from "./hooks/use-history";
import { Period } from "./lib/summarize";

// Tarix ro'yxati: har bir o'lchov turi — bitta karta (davr xulosasi). Karta bosilganda o'sha turning alohida
// sahifasi ochiladi (src/app/(app)/history/[metric].tsx; EKG — history/ecg). Tepada davr tanlash va soat bilan
// sinxron holati qotib turadi, faqat kartalar scroll bo'ladi.
// focusKey: Home'dan kelgan o'lchov — u ro'yxatning boshida va belgilangan holda chiqadi.
export function FeatureHistory({ focusKey }: { focusKey?: MetricKey }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("7d");
  const { summaries, loading, sync, refresh, connected } = useHistory(period);
  const tabBarSpace = useTabBarSpace();
  const primary = useThemeColor("primary", "#1E6FEB");
  const sleep = useSleep();

  const ordered = focusKey
    ? [...summaries].sort((a, b) => Number(b.meta.key === focusKey) - Number(a.meta.key === focusKey))
    : summaries;

  const open = (key: MetricKey) => router.push({ pathname: "/history/[metric]", params: { metric: key, period } });

  return (
    <View className="flex-1 bg-background">
      <PeriodTabs value={period} onChange={setPeriod} />
      <SyncBar sync={sync} connected={connected} onRefresh={refresh} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <CusScrollView
          className="flex-1"
          contentContainerClassName="gap-3 p-4"
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
          // Pastga tortish: soatdan yangi ma'lumot o'qiladi (soat ulangan bo'lsa).
          refreshControl={
            <RefreshControl
              refreshing={sync.syncing}
              onRefresh={() => {
                if (!connected) return;
                // Tarix va uyqu ketma-ket o'qiladi (soat navbati): uyqu band bo'lsa o'zi qayta urinadi.
                void refresh()
                  .then(() => sleep.refresh())
                  .then(() => refreshBodyFromWatch());
              }}
              enabled={connected}
              colors={[primary]}
              tintColor={primary}
            />
          }
        >
          {/* Qadamlar va uyqu: davr tablaridan qat'i nazar oxirgi 7 kun; to'liq tarixi o'z sahifasida */}
          {activityAvailable() ? <StepsHistoryCard onPress={() => router.push("/history/steps")} /> : null}
          {sleep.available ? <SleepHistoryCard onPress={() => router.push("/history/sleep")} /> : null}
          <BodyHistoryCard onPress={() => router.push("/history/body")} />
          {ordered.map((s) => (
            <HistoryCard
              key={s.meta.key}
              summary={s}
              highlighted={s.meta.key === focusKey}
              onPress={() => open(s.meta.key)}
            />
          ))}
        </CusScrollView>
      )}
    </View>
  );
}

const SYNC_ERROR: Record<SyncFailure, string> = {
  notReady: "Soat ulanmagan: telefondagi ma'lumot ko'rsatilmoqda",
  busy: "O'lchov ketyapti: tugagach yangilang",
  outdated: "Soatdan o'qish uchun ilovani yangilang",
  noReply: "Soat javob bermadi. Qayta urinib ko'ring",
  failed: "Soatdan o'qib bo'lmadi. Qayta urinib ko'ring",
};

const pad = (n: number) => String(n).padStart(2, "0");
function syncedText(at: number): string {
  const d = new Date(at);
  const today = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === today.toDateString()
    ? time
    : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}

/** Soat bilan sinxron holati: o'qilmoqda / oxirgi sinxron vaqti / sabab, va "Yangilash". */
function SyncBar({
  sync,
  connected,
  onRefresh,
}: {
  sync: SyncState;
  connected: boolean;
  onRefresh: () => void;
}) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");
  const text = sync.syncing
    ? "Soatdan ma'lumot olinmoqda…"
    : sync.error
      ? SYNC_ERROR[sync.error]
      : sync.lastSyncAt
        ? `Soat bilan sinxron: ${syncedText(sync.lastSyncAt)}`
        : connected
          ? "Soat bilan hali sinxron qilinmagan"
          : SYNC_ERROR.notReady;
  const canRefresh = connected && !sync.syncing;

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-surface px-4 py-2">
      {sync.syncing ? (
        <ActivityIndicator size="small" color={primary} />
      ) : (
        <Octicons name="sync" size={14} color={muted} />
      )}
      <CusText
        variant="caption"
        tone={sync.error && sync.error !== "notReady" ? "warning" : "muted"}
        className="flex-1"
        numberOfLines={1}
      >
        {text}
      </CusText>
      {canRefresh ? (
        <Pressable accessibilityRole="button" onPress={onRefresh} hitSlop={8}>
          <CusText variant="caption" tone="primary" className="font-semibold">
            Yangilash
          </CusText>
        </Pressable>
      ) : null}
    </View>
  );
}
