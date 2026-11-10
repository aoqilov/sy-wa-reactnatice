import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { EMPTY_VALUE, Metric, MetricStatus } from "../api/get-metrics";

const TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};

type Props = {
  metric: Metric;
  onGuide: () => void; // "Qanday o'lchanadi?" bosilganda
  onHistory: () => void; // "Tarix" bosilganda
};

// Doira tagidagi 3 ta blok:
// 1) oxirgi o'lchov (qiymat va vaqt), 2) o'lchash ko'rsatmasi, 3) tarix sahifasiga o'tish.
export function MeasureActions({ metric, onGuide, onHistory }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");

  return (
    <View className="flex-row items-stretch gap-2 self-stretch px-4">
      {/* 1. Oxirgi o'lchov */}
      <CusCard className="flex-1 items-center justify-center gap-1 p-3">
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          Oxirgi o&apos;lchov
        </CusText>
        <CusText
          variant="heading"
          tone={metric.value === EMPTY_VALUE ? "muted" : TONE[metric.status]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {metric.value}
        </CusText>
        <CusText variant="caption" tone="muted" className="text-center" numberOfLines={2}>
          {metric.updatedAt}
        </CusText>
      </CusCard>

      {/* 2. Qanday o'lchanadi? */}
      <CusCard onPress={onGuide} className="flex-1 items-center justify-center gap-2 p-3">
        <Octicons name="question" size={22} color={primary} />
        <CusText variant="caption" className="text-center font-semibold" numberOfLines={2}>
          Qanday o&apos;lchanadi?
        </CusText>
      </CusCard>

      {/* 3. Tarix */}
      <CusCard onPress={onHistory} className="flex-1 items-center justify-center gap-2 p-3">
        <Octicons name="history" size={22} color={primary} />
        <CusText variant="caption" className="text-center font-semibold" numberOfLines={2}>
          Tarix
        </CusText>
      </CusCard>
    </View>
  );
}
