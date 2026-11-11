import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import {
  CusBadge,
  CusBottomSheet,
  CusCard,
  CusDivider,
  CusImage,
  CusMenuTabs,
  CusText,
} from "@/components/ui";

import { Metric } from "../api/get-metrics";
import { METRIC_GUIDE } from "../constants/metric-guide";
import { METRIC_IMAGES } from "../constants/metric-images";

type Props = {
  metric: Metric;
  visible: boolean;
  onClose: () => void;
};

type TabKey = "video" | "text" | "standard";

const TABS: { label: string; value: TabKey }[] = [
  { label: "Video", value: "video" },
  { label: "Matn", value: "text" },
  { label: "Standart", value: "standard" },
];

// Qanday o'lchash bo'yicha ko'rsatma. Standart bo'yicha to'liq ekranda (1) ochiladi, 3 ta bo'limi bor.
export function MetricGuideSheet({ metric, visible, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>("video");
  const guide = METRIC_GUIDE[metric.key];

  return (
    <CusBottomSheet
      visible={visible}
      onClose={onClose}
      initialSnap="full"
      closeButton
      title={`${metric.title}: qanday o'lchanadi?`}
    >
      <CusMenuTabs tabs={TABS} value={tab} onChange={(v) => setTab(v as TabKey)} />

      {tab === "video" ? <VideoTab metric={metric} /> : null}
      {tab === "text" ? <TextTab steps={guide.steps} /> : null}
      {tab === "standard" ? <StandardTab standard={guide.standard} /> : null}
    </CusBottomSheet>
  );
}

// Video: hozircha namuna (mock). Rasm va "play" tugmasi, video keyin ulanadi.
function VideoTab({ metric }: { metric: Metric }) {
  return (
    <View className="gap-3">
      <View style={{ height: 200, borderRadius: 16, overflow: "hidden" }}>
        <CusImage source={METRIC_IMAGES[metric.key]} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />
        <Pressable
          accessibilityLabel="Videoni ijro etish"
          className="items-center justify-center rounded-full bg-surface"
          style={{ position: "absolute", top: 80, left: "50%", marginLeft: -24, width: 48, height: 48 }}
        >
          <Octicons name="play" size={22} color="#1B2230" />
        </Pressable>
      </View>
      <CusText tone="muted">
        {metric.title} o&apos;lchash bo&apos;yicha qisqa video qo&apos;llanma. Video tez orada qo&apos;shiladi (hozircha namuna).
      </CusText>
    </View>
  );
}

// Matn: qadamma-qadam ko'rsatma.
function TextTab({ steps }: { steps: string[] }) {
  return (
    <View className="gap-3">
      {steps.map((step, i) => (
        <View key={step} className="flex-row items-start gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-soft">
            <CusText variant="caption" tone="primary" className="font-bold">
              {i + 1}
            </CusText>
          </View>
          <CusText className="flex-1">{step}</CusText>
        </View>
      ))}
    </View>
  );
}

// Standart: natija qaysi mezon bo'yicha baholanishi. Hozircha namuna (mock).
function StandardTab({ standard }: { standard: (typeof METRIC_GUIDE)[Metric["key"]]["standard"] }) {
  return (
    <View className="gap-3">
      <CusText tone="muted">Natija quyidagi mezon bo&apos;yicha baholanadi:</CusText>
      <CusText variant="heading">{standard.name}</CusText>

      <CusCard className="p-0">
        {standard.ranges.map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <CusDivider /> : null}
            <View className="flex-row items-center justify-between gap-3 px-4 py-3">
              <CusBadge label={r.label} tone={r.tone} />
              <CusText className="flex-1 text-right">{r.range}</CusText>
            </View>
          </View>
        ))}
      </CusCard>

      <CusText variant="caption" tone="muted">
        Hozircha namuna (mock) ma&apos;lumot. Tibbiy tashxis emas.
      </CusText>
    </View>
  );
}
