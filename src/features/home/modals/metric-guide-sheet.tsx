import { useState } from "react";
import { View } from "react-native";

import { CusBadge, CusBottomSheet, CusCard, CusDivider, CusMenuTabs, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Metric } from "../api/get-metrics";
import { GuideAnimation } from "../components/guide-animation";
import { withAlpha } from "../constants/metric-colors";
import { METRIC_GUIDE } from "../constants/metric-guide";
import { type HowSection, METRIC_HOW } from "../constants/metric-how";

type Props = {
  metric: Metric;
  visible: boolean;
  onClose: () => void;
};

type TabKey = "video" | "text" | "standard" | "how";

const TABS: { label: string; value: TabKey }[] = [
  { label: "Video", value: "video" },
  { label: "Matn", value: "text" },
  { label: "Standart", value: "standard" },
  { label: "Soat qanday o'lchaydi", value: "how" },
];

// Qanday o'lchash bo'yicha ko'rsatma. Standart bo'yicha to'liq ekranda (1) ochiladi, 4 ta bo'limi bor.
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
      {tab === "how" ? <HowTab sections={METRIC_HOW[metric.key]} /> : null}
    </CusBottomSheet>
  );
}

// Video: 1:1 qisqa animatsiya (ilovaning o'zida chiziladi, components/guide-animation.tsx). Batafsil qadamlar Matn tabida.
function VideoTab({ metric }: { metric: Metric }) {
  return (
    <View className="gap-3">
      <GuideAnimation metricKey={metric.key} />
      <CusText variant="caption" tone="muted">
        {metric.title} o&apos;lchashda qo&apos;l va soatning to&apos;g&apos;ri holati. Batafsil qadamlar «Matn» tabida.
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

// Soat qanday o'lchaydi: datchik va ishlash tamoyili, ilova nima qiladi, aniqlikka nima ta'sir qiladi.
function HowTab({ sections }: { sections: HowSection[] }) {
  const danger = useThemeColor("danger", "#E0342F");
  return (
    <View className="gap-4">
      {sections.map((s) => {
        // "Muhim" va "Muhim ogohlantirish": juda och qizil fonli blok, ko'zga tashlansin, lekin baqirmasin.
        const important = s.heading.startsWith("Muhim");
        return (
          <View
            key={s.heading}
            className={`gap-1 ${important ? "rounded-xl border p-3" : ""}`}
            style={
              important
                ? { backgroundColor: withAlpha(danger, 0.06), borderColor: withAlpha(danger, 0.2) }
                : undefined
            }
          >
            <CusText variant="heading" tone={important ? "danger" : undefined}>
              {s.heading}
            </CusText>
            <CusText>{s.text}</CusText>
          </View>
        );
      })}
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
