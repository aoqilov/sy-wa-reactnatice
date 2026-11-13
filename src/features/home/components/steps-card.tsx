import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { type ActivityGoals, formatDistance, formatInt, type TodayActivity } from "@/features/activity";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { STEPS_COLOR, withAlpha } from "../constants/metric-colors";

type Props = {
  today: TodayActivity | null;
  goals: ActivityGoals;
  width: number;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

// O'lchov kartalari to'ridagi "Qadamlar" kartasi (MetricCardItem uslubida). Bosilsa tepada o'lchash doirasi o'rniga
// katta qadam halqasi chiqadi (StepsHero). Yorliqda maqsadning foizi, pastda progress chizig'i va kkal · km.
export function StepsCard({ today, goals, width, active, disabled = false, onSelect }: Props) {
  const t = useT();
  const border = useThemeColor("border", "#E5E8EE");
  const has = today !== null;
  const steps = today?.steps ?? 0;
  const pct = goals.steps > 0 ? Math.round((steps / goals.steps) * 100) : 0;
  const reached = has && pct >= 100;
  const dist = formatDistance(today?.km ?? 0);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={{
        width,
        borderWidth: 2,
        borderColor: active ? STEPS_COLOR : border,
        backgroundColor: active ? withAlpha(STEPS_COLOR, 0.12) : undefined,
        opacity: disabled ? 0.5 : 1,
      }}
      className={`gap-2 rounded-xl px-3 py-3 ${active ? "" : "bg-background"}`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: withAlpha(STEPS_COLOR, 0.18) }}
        >
          <Octicons name="goal" size={16} color={STEPS_COLOR} />
        </View>
        <CusText variant="caption" className="flex-1 font-semibold" numberOfLines={1}>
          {t("activity.steps")}
        </CusText>
      </View>

      <View>
        <CusText className="text-2xl font-bold" tone={has ? "default" : "muted"} numberOfLines={1} adjustsFontSizeToFit>
          {has ? formatInt(steps) : "--"}
        </CusText>
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          / {formatInt(goals.steps)} {t("activity.stepsUnit")}
        </CusText>
      </View>

      <View className="gap-1.5" style={{ minHeight: 22 }}>
        <View className="flex-row items-center justify-between gap-2">
          <View className={`shrink rounded-full px-2 py-0.5 ${reached ? "bg-success-soft" : "bg-neutral-soft"}`}>
            <CusText variant="caption" tone={reached ? "success" : "muted"} className="font-semibold" numberOfLines={1}>
              {has ? `${pct}%` : t("activity.noData")}
            </CusText>
          </View>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(STEPS_COLOR, 0.2) }}>
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: STEPS_COLOR }}
          />
        </View>
      </View>

      <CusText variant="caption" tone="muted" numberOfLines={1}>
        {has ? `${formatInt(today.kcal)} kcal · ${dist.value} ${dist.unit}` : " "}
      </CusText>
    </Pressable>
  );
}
