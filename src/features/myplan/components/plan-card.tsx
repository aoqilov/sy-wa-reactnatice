import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusCard, CusSwitch, CusText } from "@/components/ui";
import type { Metric } from "@/features/home/api/get-metrics";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Plan } from "../api/plans";
import { intervalText, nextRun, perDay } from "../lib/schedule";

type Props = {
  plan: Plan;
  metric: Metric;
  now: Date;
  onEdit: () => void;
  onToggle: () => void;
};

// Bitta reja: o'lchov nomi, interval, kuniga nechta o'lchov va keyingi o'lchov vaqti.
export function PlanCard({ plan, metric, now, onEdit, onToggle }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");

  return (
    <CusCard onPress={onEdit} className={`gap-2 ${plan.enabled ? "" : "opacity-60"}`}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
          <Octicons name={metric.icon} size={18} color={primary} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {metric.title}
        </CusText>
        <CusSwitch value={plan.enabled} onValueChange={onToggle} />
      </View>

      <CusText className="font-semibold">Har {intervalText(plan.intervalMin)}</CusText>
      <CusText variant="caption" tone="muted">
        Kuniga ~{perDay(plan.intervalMin)} ta o&apos;lchov
        {plan.enabled ? ` · Keyingisi: ${nextRun(now, plan.intervalMin)}` : " · To'xtatilgan"}
      </CusText>
    </CusCard>
  );
}
