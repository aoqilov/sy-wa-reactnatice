import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { useActivityGoals, useTodayActivity } from "../hooks/use-activity";
import { formatDistance, formatInt } from "../lib/format";
import { GoalSheet } from "../modals/goal-sheet";
import { StepRing } from "./step-ring";

const STEP_COLOR = "#F97316"; // to'q sariq (qadam)
const KCAL_COLOR = "#EF4444"; // qizil (kaloriya)
const DIST_COLOR = "#0891B2"; // moviy (masofa)
const RING = 92;

// Home: bugungi qadam halqasi (maqsadga nisbatan), kkal va masofa. Maqsad bosilsa — maqsadlar oynasi.
// Ma'lumot soatdan (readSteps), ulanganda va har daqiqada yangilanadi; soat uzilsa oxirgi bugungi qiymat qoladi.
export function ActivityCard() {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const { today, ready, available } = useTodayActivity();
  const { goals, save } = useActivityGoals();
  const [goalOpen, setGoalOpen] = useState(false);

  if (!available) return null;

  const steps = today?.steps ?? 0;
  const progress = goals.steps > 0 ? steps / goals.steps : 0;
  const reached = steps >= goals.steps && goals.steps > 0;
  const left = Math.max(0, goals.steps - steps);
  const dist = formatDistance(today?.km ?? 0);
  const hasData = today !== null;

  return (
    <View className="flex-row items-center gap-4 rounded-xl border border-border bg-background p-3">
      <StepRing progress={progress} size={RING} stroke={9} color={STEP_COLOR}>
        <Octicons name="flame" size={14} color={STEP_COLOR} />
        <CusText className="font-bold" style={{ fontSize: 18 }} numberOfLines={1}>
          {hasData ? formatInt(steps) : "--"}
        </CusText>
        <CusText variant="caption" tone="muted" style={{ fontSize: 11 }} numberOfLines={1}>
          /{formatInt(goals.steps)}
        </CusText>
      </StepRing>

      <View className="flex-1 gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <CusText variant="heading" numberOfLines={1} className="shrink">
            {t("activity.today")}
          </CusText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("activity.goal.title")}
            onPress={() => setGoalOpen(true)}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Octicons name="goal" size={14} color={muted} />
            <CusText variant="caption" tone="muted">
              {t("activity.goal")}
            </CusText>
          </Pressable>
        </View>

        <View className="flex-row gap-4">
          <Stat color={KCAL_COLOR} label={t("activity.kcal")} value={hasData ? formatInt(today.kcal) : "--"} unit="kcal" />
          <Stat color={DIST_COLOR} label={t("activity.distance")} value={hasData ? dist.value : "--"} unit={dist.unit} />
        </View>

        <CusText variant="caption" tone={reached ? "success" : "muted"} numberOfLines={2}>
          {!hasData
            ? ready
              ? t("activity.loading")
              : t("activity.notConnected")
            : reached
              ? t("activity.reached")
              : t("activity.left", { n: formatInt(left) })}
        </CusText>
      </View>

      <GoalSheet
        key={`${goals.steps}-${goals.sleepMin}-${goalOpen}`}
        visible={goalOpen}
        goals={goals}
        onClose={() => setGoalOpen(false)}
        onSave={(g) => void save(g)}
      />
    </View>
  );
}

function Stat({ color, label, value, unit }: { color: string; label: string; value: string; unit: string }) {
  return (
    <View className="gap-0.5">
      <View className="flex-row items-center gap-1.5">
        <View className="h-2.5 w-1 rounded-full" style={{ backgroundColor: color }} />
        <CusText variant="caption" tone="muted">
          {label}
        </CusText>
      </View>
      <View className="flex-row items-baseline gap-1">
        <CusText className="font-bold" style={{ fontSize: 17 }}>
          {value}
        </CusText>
        <CusText variant="caption" tone="muted">
          {unit}
        </CusText>
      </View>
    </View>
  );
}
