import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusBadge, CusCard, CusText } from "@/components/ui";
import type { MetricStatus } from "@/features/home/api/get-metrics";
import { METRIC_COLORS, withAlpha } from "@/features/home/constants/metric-colors";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Summary } from "../lib/summarize";
import { MiniBars } from "./mini-bars";

export const STATUS: Record<MetricStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  normal: { label: "Normal", tone: "success" },
  warning: { label: "Diqqat", tone: "warning" },
  danger: { label: "Xavfli", tone: "danger" },
};

type Props = {
  summary: Summary;
  highlighted?: boolean; // Home'dan shu o'lchov tanlab kelingan
  onPress: () => void;
};

// Bitta o'lchov bo'yicha davr xulosasi: o'rtacha qiymat, oralig'i, grafik va o'lchovlar soni.
export function HistoryCard({ summary: s, highlighted = false, onPress }: Props) {
  const color = METRIC_COLORS[s.meta.key]; // Home kartasidagi shu o'lchov rangi
  const muted = useThemeColor("muted", "#6B7385");
  const empty = s.count === 0;

  return (
    <CusCard
      onPress={onPress}
      className={`gap-3 ${empty ? "opacity-60" : ""} ${highlighted ? "border-primary" : ""}`}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withAlpha(color, 0.18) }}>
          <Octicons name={s.meta.icon} size={16} color={color} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {s.meta.title}
        </CusText>
        {s.status ? <CusBadge label={STATUS[s.status].label} tone={STATUS[s.status].tone} /> : null}
      </View>

      {empty ? (
        <CusText tone="muted">Bu davrda o&apos;lchov yo&apos;q</CusText>
      ) : (
        <>
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row items-end gap-1">
                <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
                  {s.avg}
                </CusText>
                <CusText variant="caption" tone="muted" className="pb-1" numberOfLines={1}>
                  {s.meta.unit}
                </CusText>
              </View>
              {s.min && s.max ? (
                <CusText variant="caption" tone="muted">
                  min {s.min} · maks {s.max}
                </CusText>
              ) : null}
            </View>
            <MiniBars values={s.bars} />
          </View>

          <View className="flex-row items-center justify-between">
            <CusText variant="caption" tone="muted">
              {s.count} ta o&apos;lchov
            </CusText>
            <Octicons name="chevron-right" size={16} color={muted} />
          </View>
        </>
      )}
    </CusCard>
  );
}
