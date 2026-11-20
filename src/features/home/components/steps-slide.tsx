import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import {
  type ActivityGoals,
  formatDistance,
  formatInt,
  GoalSheet,
  StepRing,
  type TodayActivity,
} from "@/features/activity";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import {
  DISTANCE_COLOR,
  KCAL_COLOR,
  STEPS_COLOR,
  withAlpha,
} from "../constants/metric-colors";

type Props = {
  today: TodayActivity | null;
  goals: ActivityGoals;
  ready: boolean;
  width: number;
  onSaveGoals: (goals: ActivityGoals) => void;
  /** Bosilganda: qadamlar tarixi (/history/steps). */
  onPress: () => void;
};

// Asosiy foydalanuvchilar 45+ yoshda: yozuvlar va halqa kattaroq.
const RING = 120;
const STROKE = 11;
const DONE_COLOR = "#22C55E";

// Home slayderidagi "Qadamlar": chapda maqsad halqasi (ichida qadamlar soni), o'ngda maqsad, foiz, kkal va masofa.
// ✎ — kunlik maqsadni o'zgartirish (GoalSheet). Ichki sahifa yo'q: bosilsa qadamlar tarixi ochiladi.
export function StepsSlide({
  today,
  goals,
  ready,
  width,
  onSaveGoals,
  onPress,
}: Props) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const [goalOpen, setGoalOpen] = useState(false);

  const has = today !== null;
  const steps = today?.steps ?? 0;
  const progress = goals.steps > 0 ? steps / goals.steps : 0;
  const pct = Math.round(progress * 100);
  const reached = has && steps >= goals.steps;
  const ringColor = reached ? DONE_COLOR : STEPS_COLOR;
  const dist = formatDistance(today?.km ?? 0);

  // ✎ tugmasi va maqsad oynasi slayd tugmasidan tashqarida (ustida, absolute): web'da <button> ichida <button>
  // bo'lishi mumkin emas. Sarlavha qatorida uning o'rni bo'sh qoldiriladi.
  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("activity.steps")}
        onPress={onPress}
        className="grow flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4 active:bg-surface-alt"
      >
        <StepRing
          progress={progress}
          size={RING}
          stroke={STROKE}
          color={ringColor}
          trackColor={withAlpha(ringColor, 0.18)}
        >
          <CusText
            className="text-3xl font-bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ maxWidth: RING - 28 }}
          >
            {has ? formatInt(steps) : "--"}
          </CusText>
          <CusText tone="muted">{t("activity.stepsUnit")}</CusText>
        </StepRing>

        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-2">
            <CusText className="flex-1 text-xl font-bold" numberOfLines={1}>
              {t("activity.steps")}
            </CusText>
            <View className="h-9 w-9" />
          </View>

          <CusText tone={reached ? "success" : "muted"} numberOfLines={2}>
            {!has
              ? ready
                ? t("activity.loading")
                : t("activity.notConnected")
              : reached
                ? `✓ ${t("activity.reached")}`
                : `${pct}% · ${t("activity.goal")}: ${formatInt(goals.steps)}`}
          </CusText>

          <View className="gap-1.5">
            <Stat
              color={KCAL_COLOR}
              icon="flame"
              value={has ? formatInt(today.kcal) : "--"}
              unit="kcal"
            />
            <Stat
              color={DISTANCE_COLOR}
              icon="location"
              value={has ? dist.value : "--"}
              unit={dist.unit}
            />
          </View>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("activity.goal")}
        onPress={() => setGoalOpen(true)}
        hitSlop={10}
        className="absolute h-9 w-9 items-center justify-center rounded-full bg-surface-alt"
        style={{ top: 16, right: 16 }}
      >
        <Octicons name="pencil" size={16} color={muted} />
      </Pressable>

      <GoalSheet
        key={`${goals.steps}-${goals.sleepMin}-${goalOpen}`}
        visible={goalOpen}
        goals={goals}
        onClose={() => setGoalOpen(false)}
        onSave={onSaveGoals}
      />
    </View>
  );
}

function Stat({
  color,
  icon,
  value,
  unit,
}: {
  color: string;
  icon: "flame" | "location";
  value: string;
  unit: string;
}) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-xl px-2.5 py-1.5"
      style={{ backgroundColor: withAlpha(color, 0.1) }}
    >
      <Octicons name={icon} size={16} color={color} />
      <CusText
        className="text-lg font-bold"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {value}
      </CusText>
      <CusText tone="muted" numberOfLines={1}>
        {unit}
      </CusText>
    </View>
  );
}
