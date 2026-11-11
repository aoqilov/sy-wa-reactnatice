import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusBottomSheet, CusCard, CusImage, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Metric } from "../api/get-metrics";
import { METRIC_IMAGES } from "../constants/metric-images";
import { METRIC_INFO } from "../constants/metric-info";

type Props = {
  metric: Metric;
  visible: boolean;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <CusText variant="heading">{title}</CusText>
      {children}
    </View>
  );
}

// O'lchov haqida ma'lumot: bu nima, qanday o'lchanadi, normal ko'rsatkich va maslahatlar.
export function MetricInfoSheet({ metric, visible, onClose }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const info = METRIC_INFO[metric.key];

  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" closeButton title={`${metric.title} haqida`}>
      {/* Tepada o'lchov rasmi, pastki chap burchagida ikon */}
      <View style={{ height: 180, borderRadius: 16, overflow: "hidden" }}>
        <CusImage
          source={METRIC_IMAGES[metric.key]}
          style={{ width: "100%", height: "100%" }}
        />
        <View
          className="items-center justify-center rounded-full bg-surface"
          style={{ position: "absolute", left: 12, bottom: 12, width: 40, height: 40 }}
        >
          <Octicons name={metric.icon} size={20} color={primary} />
        </View>
      </View>

      <Section title="Bu nima?">
        <CusText tone="muted">{info.about}</CusText>
      </Section>

      <Section title="Qanday o'lchanadi?">
        <CusText tone="muted">{info.how}</CusText>
      </Section>

      <CusCard className="gap-1">
        <CusText variant="caption" tone="muted">
          Normal ko&apos;rsatkich
        </CusText>
        <CusText variant="heading">{metric.normalRange}</CusText>
      </CusCard>

      <Section title="Maslahatlar">
        <View className="gap-2">
          {info.tips.map((tip) => (
            <View key={tip} className="flex-row gap-2">
              <CusText tone="primary">•</CusText>
              <CusText tone="muted" className="flex-1">
                {tip}
              </CusText>
            </View>
          ))}
        </View>
      </Section>

      <CusText variant="caption" tone="muted">
        Bu ma&apos;lumot umumiy tanishuv uchun va tibbiy tashxis emas. Shubha bo&apos;lsa, shifokorga murojaat qiling.
      </CusText>
    </CusBottomSheet>
  );
}
