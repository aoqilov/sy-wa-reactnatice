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

import { DISTANCE_COLOR, KCAL_COLOR, STEPS_COLOR, withAlpha } from "../constants/metric-colors";

type Props = {
  today: TodayActivity | null;
  goals: ActivityGoals;
  ready: boolean;
  onSaveGoals: (goals: ActivityGoals) => void;
};

const SIZE = 264; // o'lchash doirasi (MeasureCircle) bilan bir xil: almashganda joy sakramaydi
const STROKE = 16;
const NUMBER_STYLE = { fontSize: 50, lineHeight: 62 } as const;

// "Qadamlar" kartasi tanlanganda o'lchash doirasi o'rnida: katta maqsad halqasi (qadam / maqsad, foiz), ostida
// kkal, masofa va "Maqsad" tugmasi. Ma'lumot soatdan (FeatureHome → useTodayActivity).
export function StepsHero({ today, goals, ready, onSaveGoals }: Props) {
  const t = useT();
  const [goalOpen, setGoalOpen] = useState(false);
  const has = today !== null;
  const steps = today?.steps ?? 0;
  const progress = goals.steps > 0 ? steps / goals.steps : 0;
  const pct = Math.round(progress * 100);
  const reached = has && steps >= goals.steps;
  const left = Math.max(0, goals.steps - steps);
  const dist = formatDistance(today?.km ?? 0);

  return (
    <View className="items-center gap-4">
      <View className="rounded-full bg-surface">
        <StepRing
          progress={progress}
          size={SIZE}
          stroke={STROKE}
          color={STEPS_COLOR}
          trackColor={withAlpha(STEPS_COLOR, 0.2)}
        >
          <Octicons name="goal" size={22} color={STEPS_COLOR} />
          <CusText className="font-bold" style={NUMBER_STYLE} numberOfLines={1} adjustsFontSizeToFit>
            {has ? formatInt(steps) : "--"}
          </CusText>
          <CusText tone="muted" numberOfLines={1}>
            / {formatInt(goals.steps)} {t("activity.stepsUnit")}
          </CusText>
          <CusText
            variant="caption"
            tone={reached ? "success" : "muted"}
            className="mt-2 px-10 text-center font-semibold"
            numberOfLines={2}
          >
            {!has
              ? ready
                ? t("activity.loading")
                : t("activity.notConnected")
              : reached
                ? t("activity.reached")
                : `${pct}% · ${t("activity.left", { n: formatInt(left) })}`}
          </CusText>
        </StepRing>
      </View>

      <View className="flex-row items-stretch gap-3 px-4">
        <Stat color={KCAL_COLOR} icon="flame" label={t("activity.kcal")} value={has ? formatInt(today.kcal) : "--"} unit="kcal" />
        <Stat
          color={DISTANCE_COLOR}
          icon="location"
          label={t("activity.distance")}
          value={has ? dist.value : "--"}
          unit={dist.unit}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setGoalOpen(true)}
          className="flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 active:bg-surface-alt"
        >
          <Octicons name="pencil" size={16} color={STEPS_COLOR} />
          <CusText variant="caption" className="font-semibold">
            {t("activity.goal")}
          </CusText>
        </Pressable>
      </View>

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
  label,
  value,
  unit,
}: {
  color: string;
  icon: "flame" | "location";
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="flex-1 gap-0.5 rounded-xl border border-border bg-surface px-3 py-2">
      <View className="flex-row items-center gap-1.5">
        <Octicons name={icon} size={12} color={color} />
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </CusText>
      </View>
      <View className="flex-row items-baseline gap-1">
        <CusText className="font-bold" style={{ fontSize: 18 }} numberOfLines={1}>
          {value}
        </CusText>
        <CusText variant="caption" tone="muted">
          {unit}
        </CusText>
      </View>
    </View>
  );
}
