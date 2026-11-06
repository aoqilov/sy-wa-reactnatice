import { View } from "react-native";

import { CusBadge, CusBottomSheet, CusCard, CusDivider, CusListItem, CusText } from "@/components/ui";

import { Metric, MetricStatus } from "../api/get-metrics";

const TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};

type Props = {
  metric: Metric;
  visible: boolean;
  onClose: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <CusText variant="caption" tone="muted">
        {label}
      </CusText>
      <CusText variant="heading">{value}</CusText>
    </View>
  );
}

// Tanlangan o'lchov bo'yicha batafsil ma'lumot va tarix (pastdan chiqadigan oyna).
export function MetricDetailsSheet({ metric, visible, onClose }: Props) {
  return (
    <CusBottomSheet visible={visible} onClose={onClose} title={`${metric.title}: batafsil`}>
      <View className="items-center gap-1">
        <CusText className="text-5xl font-bold">{metric.value}</CusText>
        <CusText tone="muted">{metric.unit}</CusText>
        <CusBadge label={metric.statusLabel} tone={TONE[metric.status]} className="mt-2" />
        <CusText variant="caption" tone="muted">
          {metric.updatedAt}
        </CusText>
      </View>

      <CusCard className="gap-3">
        <CusText variant="heading">Bugun</CusText>
        <View className="flex-row">
          <Stat label="Min" value={metric.summary.min} />
          <Stat label="O'rtacha" value={metric.summary.avg} />
          <Stat label="Maks" value={metric.summary.max} />
        </View>
      </CusCard>

      <CusCard className="gap-1">
        <CusText variant="caption" tone="muted">
          Normal ko&apos;rsatkich
        </CusText>
        <CusText>{metric.normalRange}</CusText>
      </CusCard>

      <View className="gap-2">
        <CusText variant="heading">Tarix</CusText>
        <CusCard className="p-0">
          {metric.history.map((h, i) => (
            <View key={`${h.time}-${i}`}>
              {i > 0 ? <CusDivider /> : null}
              <CusListItem title={`${h.value} ${metric.unit}`} subtitle={h.time} />
            </View>
          ))}
        </CusCard>
      </View>
    </CusBottomSheet>
  );
}
