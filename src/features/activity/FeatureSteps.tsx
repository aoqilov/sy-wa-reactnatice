import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CusBadge, CusCard, CusChip, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { stepDayKey } from "@/shared/watch/step-history";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import type { StepDay } from "./api/step-history";
import { STEP_COLOR, StepDayBars, StepHourBars } from "./components/step-charts";
import { useActivityGoals, useTodayActivity } from "./hooks/use-activity";
import { useStepHistory } from "./hooks/use-step-history";
import { formatDistance, formatInt } from "./lib/format";

const RANGES = [7, 30] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

// Qadamlar tarixi (/history/steps): tanlangan kun (jami, kkal, masofa, maqsad, soatma-soat), pastda 7/30 kunlik grafik
// va o'rtachalar. Kunlar History sinxronida soatdan yig'iladi, bugun — jonli qiymat.
export function FeatureSteps() {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  const activity = useTodayActivity();
  const days = useStepHistory(activity.today);
  const { goals } = useActivityGoals();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  const list = (days ?? []).filter((d) => d.steps > 0);
  const day = list.find((d) => d.key === selectedKey) ?? list[0] ?? null;
  const index = day ? list.indexOf(day) : -1;

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title={t("activity.steps")} fallbackHref="/history" />
      {days === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="gap-3 p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          {day ? (
            <>
              <DaySwitcher
                day={day}
                hasOlder={index < list.length - 1}
                hasNewer={index > 0}
                onOlder={() => setSelectedKey(list[index + 1].key)}
                onNewer={() => setSelectedKey(list[index - 1].key)}
              />
              <SummaryCard day={day} goal={goals.steps} />
              <CusCard className="gap-3">
                <CusText variant="heading">{t("steps.byHour")}</CusText>
                {day.slots.some((v) => v > 0) ? (
                  <StepHourBars slots={day.slots} />
                ) : (
                  <CusText variant="caption" tone="muted">
                    {t("steps.noHourly")}
                  </CusText>
                )}
              </CusCard>
            </>
          ) : (
            <CusCard className="items-center gap-2 py-6">
              <Octicons name="goal" size={28} color={STEP_COLOR} />
              <CusText variant="heading" className="text-center">
                {t("steps.empty.title")}
              </CusText>
              <CusText tone="muted" className="text-center">
                {t("steps.empty.text")}
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
            <StepDayBars days={list} range={range} goal={goals.steps} selectedKey={day?.key ?? null} onSelect={setSelectedKey} />
            <Averages days={list} range={range} goal={goals.steps} />
          </CusCard>

          <CusText variant="caption" tone="muted" className="px-1">
            {t("steps.note")}
          </CusText>
        </CusScrollView>
      )}
    </View>
  );
}

function DaySwitcher({
  day,
  hasOlder,
  hasNewer,
  onOlder,
  onNewer,
}: {
  day: StepDay;
  hasOlder: boolean;
  hasNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
}) {
  const t = useT();
  const [now] = useState(Date.now);
  const [, m, d] = day.key.split("-");
  const label =
    day.key === stepDayKey(now) ? t("steps.today") : day.key === stepDayKey(now - DAY_MS) ? t("steps.yesterday") : `${d}.${m}`;
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

function SummaryCard({ day, goal }: { day: StepDay; goal: number }) {
  const t = useT();
  const pct = Math.round((day.steps / Math.max(1, goal)) * 100);
  const reached = day.steps >= goal;
  const dist = formatDistance(day.km);
  return (
    <CusCard className="gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {formatInt(day.steps)}
          </CusText>
          <CusText variant="caption" tone="muted">
            / {formatInt(goal)} {t("activity.stepsUnit")} · {pct}%
          </CusText>
        </View>
        <CusBadge label={reached ? t("steps.reached") : t("steps.notReached")} tone={reached ? "success" : "neutral"} />
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-neutral-soft">
        <View className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: STEP_COLOR }} />
      </View>
      <View className="flex-row gap-3">
        <Box label={t("activity.kcal")} value={`${formatInt(day.kcal)} kcal`} />
        <Box label={t("activity.distance")} value={`${dist.value} ${dist.unit}`} />
      </View>
    </CusCard>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[45%] flex-1 gap-0.5 rounded-xl border border-border px-3 py-2">
      <CusText variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </CusText>
      <CusText className="font-bold" numberOfLines={1}>
        {value}
      </CusText>
    </View>
  );
}

/** Davrdagi o'rtachalar: kunlik qadam, kkal, masofa, maqsadga yetgan kunlar, eng faol kun. */
function Averages({ days, range, goal }: { days: StepDay[]; range: number; goal: number }) {
  const t = useT();
  const [now] = useState(Date.now);
  const from = stepDayKey(now - (range - 1) * DAY_MS);
  const inRange = days.filter((d) => d.key >= from);
  if (inRange.length === 0) {
    return (
      <CusText variant="caption" tone="muted">
        {t("steps.noDays")}
      </CusText>
    );
  }
  const avg = (f: (d: StepDay) => number) => inRange.reduce((a, d) => a + f(d), 0) / inRange.length;
  const best = inRange.reduce((a, b) => (b.steps > a.steps ? b : a));
  const [, bm, bd] = best.key.split("-");
  const dist = formatDistance(avg((d) => d.km));
  return (
    <View className="flex-row flex-wrap gap-2">
      <Box label={t("steps.avg.steps")} value={formatInt(avg((d) => d.steps))} />
      <Box label={t("steps.avg.kcal")} value={`${formatInt(avg((d) => d.kcal))} kcal`} />
      <Box label={t("steps.avg.km")} value={`${dist.value} ${dist.unit}`} />
      <Box label={t("steps.avg.goal")} value={t("steps.avg.goalValue", { n: inRange.filter((d) => d.steps >= goal).length, of: inRange.length })} />
      <Box label={t("steps.best")} value={`${bd}.${bm} · ${formatInt(best.steps)}`} />
    </View>
  );
}
