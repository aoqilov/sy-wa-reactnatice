import { View } from "react-native";

import { CusHealthCard, CusHealthValue, CusText } from "@/components/ui";
import { type ActivityGoals, formatDistance, formatInt, type TodayActivity } from "@/features/activity";
import { useT } from "@/shared/i18n/use-t";

import { STEPS_COLOR, withAlpha } from "../constants/metric-colors";

type Props = {
  today: TodayActivity | null;
  goals: ActivityGoals;
  width: number;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

// O'lchov kartalari to'ridagi "Qadamlar" kartasi (CusHealthCard uslubida). Bosilsa tepada o'lchash doirasi o'rniga
// katta qadam halqasi chiqadi (StepsHero). Ma'lumot bo'lsa: qadamlar va maqsad, progress chizig'i, kkal · km va foiz.
export function StepsCard({ today, goals, width, active, disabled = false, onSelect }: Props) {
  const t = useT();
  const has = today !== null;
  const steps = today?.steps ?? 0;
  const pct = goals.steps > 0 ? Math.round((steps / goals.steps) * 100) : 0;
  const reached = has && pct >= 100;
  const dist = formatDistance(today?.km ?? 0);

  return (
    <CusHealthCard
      width={width}
      color={STEPS_COLOR}
      icon="goal"
      title={t("activity.steps")}
      active={active}
      disabled={disabled}
      onPress={onSelect}
      illustrated={!has}
    >
      {has ? (
        <>
          <CusHealthValue value={formatInt(steps)} unit={`/ ${formatInt(goals.steps)}`} />
          <View className="flex-1 justify-center">
            <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(STEPS_COLOR, 0.2) }}>
              <View
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: STEPS_COLOR }}
              />
            </View>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <CusText variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {`${formatInt(today.kcal)} kcal · ${dist.value} ${dist.unit}`}
            </CusText>
            <CusText variant="caption" tone={reached ? "success" : "muted"} className="font-semibold" numberOfLines={1}>
              {`${pct}%`}
            </CusText>
          </View>
        </>
      ) : (
        <CusText variant="caption" tone="muted" numberOfLines={3} style={{ paddingRight: 24 }}>
          {t("activity.noData")}
        </CusText>
      )}
    </CusHealthCard>
  );
}
