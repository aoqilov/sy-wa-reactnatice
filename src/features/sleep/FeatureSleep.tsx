import Octicons from "@expo/vector-icons/Octicons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";

import { CusBadge, CusCard, CusChip, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { useActivityGoals } from "@/features/activity";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { dateKey, qualityOf, type SleepNight, type SleepStage, vitalsDuring } from "./api/sleep";
import { Hypnogram } from "./components/hypnogram";
import { SleepBars } from "./components/sleep-bars";
import { useSleep } from "./hooks/use-sleep";
import { SLEEP_COLOR, STAGE_COLORS } from "./lib/colors";
import { clock, clockFromMinutes, formatDuration, shortDate } from "./lib/format";

const QUALITY_TONE = { good: "success", fair: "warning", poor: "danger" } as const;
const RANGES = [7, 30] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

// Uyqu sahifasi (/history/sleep): tanlangan kecha (davomiylik, vaqt, gipnogramma, bosqichlar, aniq uyqu ballari,
// uyqudagi puls va SpO2), pastda 7/30 kunlik grafik va o'rtachalar. Ma'lumot soatdan (useSleep), telefonda saqlanadi.
export function FeatureSleep() {
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const tabBarSpace = useTabBarSpace();
  const { nights, syncing, error, ready, available, demo, refresh, syncedAt } = useSleep();
  const { goals } = useActivityGoals();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  const list = useMemo(() => nights ?? [], [nights]);
  const night = list.find((n) => n.key === selectedKey) ?? list[0] ?? null;
  const index = night ? list.indexOf(night) : -1;

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title={t("sleep.title")} fallbackHref="/history" />
      <SyncLine
        syncing={syncing}
        error={error}
        ready={ready}
        available={available}
        demo={demo}
        syncedAt={syncedAt}
        onRefresh={refresh}
      />

      {nights === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <CusScrollView
          className="flex-1"
          contentContainerClassName="gap-3 p-4"
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
          refreshControl={
            <RefreshControl
              refreshing={syncing}
              onRefresh={() => {
                if (ready) void refresh();
              }}
              enabled={ready}
              colors={[primary]}
              tintColor={primary}
            />
          }
        >
          {night ? (
            <>
              <NightSwitcher
                night={night}
                hasOlder={index < list.length - 1}
                hasNewer={index > 0}
                onOlder={() => setSelectedKey(list[index + 1].key)}
                onNewer={() => setSelectedKey(list[index - 1].key)}
              />
              <SummaryCard night={night} goalMin={goals.sleepMin} />
              <CusCard className="gap-3">
                <CusText variant="heading">{t("sleep.stages")}</CusText>
                <Hypnogram night={night} />
                <StageRows night={night} />
              </CusCard>
              {night.scores ? <ScoresCard night={night} /> : null}
              <VitalsCard night={night} />
            </>
          ) : (
            <CusCard className="items-center gap-2 py-6">
              <Octicons name="moon" size={28} color={SLEEP_COLOR} />
              <CusText variant="heading" className="text-center">
                {t("sleep.empty.title")}
              </CusText>
              <CusText tone="muted" className="text-center">
                {t("sleep.empty.text")}
              </CusText>
            </CusCard>
          )}

          <CusCard className="gap-3">
            <View className="flex-row items-center justify-between">
              <CusText variant="heading">{t("sleep.history")}</CusText>
              <View className="flex-row gap-2">
                {RANGES.map((r) => (
                  <CusChip key={r} label={t("sleep.days", { n: r })} selected={range === r} onPress={() => setRange(r)} />
                ))}
              </View>
            </View>
            <SleepBars
              nights={list}
              days={range}
              goalMin={goals.sleepMin}
              selectedKey={night?.key ?? null}
              onSelect={setSelectedKey}
            />
            <Averages nights={list} days={range} goalMin={goals.sleepMin} />
          </CusCard>

          <CusText variant="caption" tone="muted" className="px-1">
            {t("sleep.disclaimer")}
          </CusText>
        </CusScrollView>
      )}
    </View>
  );
}

function SyncLine({
  syncing,
  error,
  ready,
  available,
  demo,
  syncedAt,
  onRefresh,
}: {
  demo: boolean;
  syncing: boolean;
  error: string | null;
  ready: boolean;
  available: boolean;
  syncedAt: number | null;
  onRefresh: () => void;
}) {
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");
  const text = demo
    ? t("sleep.sync.demo")
    : !available
    ? t("sleep.sync.outdated")
    : syncing
      ? t("sleep.sync.reading")
      : !ready
        ? t("sleep.sync.notReady")
        : error === "noReply"
          ? t("sleep.sync.noReply")
          : syncedAt
            ? t("sleep.sync.at", { time: `${shortDate(dateKey(syncedAt))} ${clock(syncedAt)}` })
            : t("sleep.sync.never");

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-surface px-4 py-2">
      {syncing ? <ActivityIndicator size="small" color={primary} /> : <Octicons name="sync" size={14} color={muted} />}
      <CusText variant="caption" tone={error === "noReply" ? "warning" : "muted"} className="flex-1" numberOfLines={1}>
        {text}
      </CusText>
      {ready && available && !syncing ? (
        <Pressable accessibilityRole="button" onPress={onRefresh} hitSlop={8}>
          <CusText variant="caption" tone="primary" className="font-semibold">
            {t("sleep.sync.refresh")}
          </CusText>
        </Pressable>
      ) : null}
    </View>
  );
}

function NightSwitcher({
  night,
  hasOlder,
  hasNewer,
  onOlder,
  onNewer,
}: {
  night: SleepNight;
  hasOlder: boolean;
  hasNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
}) {
  const t = useT();
  const [now] = useState(Date.now);
  const today = dateKey(now);
  const yesterday = dateKey(now - DAY_MS);
  const label =
    night.key === today ? t("sleep.lastNight") : night.key === yesterday ? t("sleep.nightBefore") : shortDate(night.key);

  return (
    <View className="flex-row items-center justify-between">
      <Arrow dir="left" enabled={hasOlder} onPress={onOlder} />
      <CusText variant="heading">{label}</CusText>
      <Arrow dir="right" enabled={hasNewer} onPress={onNewer} />
    </View>
  );
}

function Arrow({ dir, enabled, onPress }: { dir: "left" | "right"; enabled: boolean; onPress: () => void }) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const border = useThemeColor("border", "#E5E8EE");
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-alt"
    >
      <Octicons name={dir === "left" ? "chevron-left" : "chevron-right"} size={20} color={enabled ? primary : border} />
    </Pressable>
  );
}

function SummaryCard({ night, goalMin }: { night: SleepNight; goalMin: number }) {
  const t = useT();
  const quality = qualityOf(night, goalMin);
  const pct = Math.round((night.totalMin / Math.max(1, goalMin)) * 100);

  return (
    <CusCard className="gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {formatDuration(night.totalMin, t)}
          </CusText>
          <CusText variant="caption" tone="muted">
            {t("sleep.goalPct", { pct, goal: formatDuration(goalMin, t) })}
          </CusText>
        </View>
        <CusBadge label={t(`sleep.quality.${quality}`)} tone={QUALITY_TONE[quality]} />
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-neutral-soft">
        <View className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: SLEEP_COLOR }} />
      </View>
      <View className="flex-row gap-3">
        <TimeBox icon="moon" label={t("sleep.fellAsleep")} value={clock(night.down)} />
        <TimeBox icon="sun" label={t("sleep.wokeUp")} value={clock(night.up)} />
        <TimeBox icon="eye" label={t("sleep.wakeCount")} value={String(night.wakeCount)} />
      </View>
    </CusCard>
  );
}

function TimeBox({ icon, label, value }: { icon: "moon" | "sun" | "eye"; label: string; value: string }) {
  const muted = useThemeColor("muted", "#6B7385");
  return (
    <View className="flex-1 gap-0.5 rounded-xl border border-border px-3 py-2">
      <View className="flex-row items-center gap-1.5">
        <Octicons name={icon} size={12} color={muted} />
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </CusText>
      </View>
      <CusText className="font-bold" style={{ fontSize: 18 }}>
        {value}
      </CusText>
    </View>
  );
}

function StageRows({ night }: { night: SleepNight }) {
  const t = useT();
  const rows: [SleepStage, number][] = [
    ["deep", night.deepMin],
    ["light", night.lightMin],
    ...(night.precise ? ([["rem", night.remMin]] as [SleepStage, number][]) : []),
    ["awake", night.awakeMin],
  ];
  const sum = rows.reduce((a, [, m]) => a + m, 0) || 1;

  return (
    <View className="gap-2">
      {rows.map(([s, min]) => (
        <View key={s} className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: STAGE_COLORS[s] }} />
          <CusText className="flex-1">{t(`sleep.stage.${s}`)}</CusText>
          <CusText className="font-semibold">{formatDuration(min, t)}</CusText>
          <CusText variant="caption" tone="muted" style={{ width: 40, textAlign: "right" }}>
            {Math.round((min / sum) * 100)}%
          </CusText>
        </View>
      ))}
    </View>
  );
}

function ScoresCard({ night }: { night: SleepNight }) {
  const t = useT();
  const s = night.scores;
  if (!s) return null;
  const rows = [
    [t("sleep.score.fallAsleep"), s.fallAsleep],
    [t("sleep.score.deep"), s.deep],
    [t("sleep.score.efficiency"), s.efficiency],
    [t("sleep.score.time"), s.time],
    [t("sleep.score.getUp"), s.getUp],
    [t("sleep.score.insomnia"), s.insomnia],
  ] as const;

  return (
    <CusCard className="gap-2">
      <CusText variant="heading">{t("sleep.scores")}</CusText>
      {rows
        .filter(([, v]) => v > 0)
        .map(([label, v]) => (
          <View key={label} className="flex-row items-center justify-between">
            <CusText>{label}</CusText>
            <CusText className="font-semibold">{v}</CusText>
          </View>
        ))}
    </CusCard>
  );
}

function VitalsCard({ night }: { night: SleepNight }) {
  const t = useT();
  const [v, setV] = useState<Awaited<ReturnType<typeof vitalsDuring>> | null>(null);
  useEffect(() => {
    let active = true;
    void vitalsDuring(night).then((r) => active && setV(r));
    return () => {
      active = false;
    };
  }, [night]);

  if (!v || (v.hrAvg === undefined && v.spo2Avg === undefined)) return null;
  return (
    <CusCard className="gap-2">
      <CusText variant="heading">{t("sleep.vitals")}</CusText>
      {v.hrAvg !== undefined ? (
        <View className="flex-row items-center justify-between">
          <CusText>{t("sleep.vitals.hr")}</CusText>
          <CusText className="font-semibold">{t("sleep.vitals.hrValue", { avg: v.hrAvg, min: v.hrMin ?? "-" })}</CusText>
        </View>
      ) : null}
      {v.spo2Avg !== undefined ? (
        <View className="flex-row items-center justify-between">
          <CusText>{t("sleep.vitals.spo2")}</CusText>
          <CusText className="font-semibold">{t("sleep.vitals.spo2Value", { avg: v.spo2Avg, min: v.spo2Min ?? "-" })}</CusText>
        </View>
      ) : null}
      <CusText variant="caption" tone="muted">
        {t("sleep.vitals.note")}
      </CusText>
    </CusCard>
  );
}

/** Davrdagi o'rtachalar: davomiylik, yotish va turish vaqti, maqsadga yetgan kechalar. */
function Averages({ nights, days, goalMin }: { nights: SleepNight[]; days: number; goalMin: number }) {
  const t = useT();
  const [now] = useState(Date.now);
  const from = dateKey(now - (days - 1) * DAY_MS);
  const inRange = nights.filter((n) => n.key >= from);
  if (inRange.length === 0) {
    return (
      <CusText variant="caption" tone="muted">
        {t("sleep.noNights")}
      </CusText>
    );
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // Yotish vaqti yarim tundan o'tishi mumkin: 18:00 dan keyingisi "kecha" deb, oldingisi +24 soat deb olinadi.
  const minutesOf = (ms: number) => {
    const d = new Date(ms);
    return d.getHours() * 60 + d.getMinutes();
  };
  const bed = avg(inRange.map((n) => {
    const m = minutesOf(n.down);
    return m < 18 * 60 ? m + 1440 : m;
  }));
  const wake = avg(inRange.map((n) => minutesOf(n.up)));
  const reached = inRange.filter((n) => n.totalMin >= goalMin).length;

  return (
    <View className="flex-row flex-wrap gap-2">
      <Item label={t("sleep.avg.duration")} value={formatDuration(avg(inRange.map((n) => n.totalMin)), t)} />
      <Item label={t("sleep.avg.deep")} value={formatDuration(avg(inRange.map((n) => n.deepMin)), t)} />
      <Item label={t("sleep.avg.bed")} value={clockFromMinutes(bed)} />
      <Item label={t("sleep.avg.wake")} value={clockFromMinutes(wake)} />
      <Item label={t("sleep.avg.goal")} value={t("sleep.avg.goalValue", { n: reached, of: inRange.length })} />
    </View>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 gap-0.5 rounded-xl border border-border px-3 py-2">
      <CusText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </CusText>
      <CusText className="font-bold">{value}</CusText>
    </View>
  );
}
