import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, useWindowDimensions, View } from "react-native";

import { CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { EMPTY_VALUE, Metric, type MetricStatus } from "../api/get-metrics";
import { METRIC_COLORS, withAlpha } from "../constants/metric-colors";
import { Sparkline } from "./sparkline";

type Props = {
  metrics: Metric[];
  selectedKey: Metric["key"];
  onSelect: (key: Metric["key"]) => void;
  onInfo: (key: Metric["key"]) => void; // kartadagi "info" belgisi bosilganda
};

const PADDING = 16; // chap va o'ng chetdan
const GAP = 8; // kartalar orasidagi masofa
const COLS = 2; // 2 ustun, kartalar pastga qarab tushadi (surish yo'q)
const SPARK_POINTS = 8; // mini grafikda nechta oxirgi o'lchov
const SPARK_WIDTH = 56;
const SPARK_WIDTH_WIDE = 120;

// Holat yorlig'i (Normal / Past / Yuqori) ranglari: fon sinfi (to'liq nom: Tailwind uni statik ko'rishi kerak) va matn rangi
// (`CusText` tone orqali: o'z standart rangi bilan sinf to'qnashuvi bo'lmasin).
const CHIP: Record<MetricStatus | "none", { box: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  normal: { box: "bg-success-soft", tone: "success" },
  warning: { box: "bg-warning-soft", tone: "warning" },
  danger: { box: "bg-danger-soft", tone: "danger" },
  none: { box: "bg-neutral-soft", tone: "muted" },
};

/** Oxirgi o'lchovlar, eskidan yangiga. Bosimda yuqori (sistolik) qiymat olinadi. Qon tahlili bitta son emas: grafik yo'q. */
function sparkValues(m: Metric): number[] {
  if (m.key === "blood") return [];
  return m.history
    .slice(0, SPARK_POINTS)
    .map((h) => Number(h.value.split("/")[0]))
    .filter(Number.isFinite)
    .reverse();
}

// O'lchov kartalari: 2 ustunli to'r, ustunlar to'lsa keyingi qatorga tushadi. Toq sondagi oxirgi karta butun qatorni
// egallaydi. Har bir kartada: nom, qiymat, rangli holat yorlig'i, mini grafik va oxirgi o'lchov vaqti. Karta o'z
// o'lchovining rangida (constants/metric-colors.ts); holat yorlig'i esa holat rangida (yashil/sariq/qizil).
export function MetricSelector({ metrics, selectedKey, onSelect, onInfo }: Props) {
  const { width } = useWindowDimensions();

  const itemWidth = (width - PADDING * 2 - GAP * (COLS - 1)) / COLS;
  const wideWidth = itemWidth * COLS + GAP * (COLS - 1);

  return (
    // Sarlavha ("O'lchovni tanlang") va panel foni FeatureHome'da: ular qotib turadi, faqat shu kartalar scroll bo'ladi.
    <View className="flex-row flex-wrap pb-4 pt-2" style={{ paddingHorizontal: PADDING, gap: GAP }}>
      {metrics.map((m, i) => {
        const wide = metrics.length % COLS === 1 && i === metrics.length - 1;
        return (
          <MetricCardItem
            key={m.key}
            metric={m}
            width={wide ? wideWidth : itemWidth}
            sparkWidth={wide ? SPARK_WIDTH_WIDE : SPARK_WIDTH}
            active={m.key === selectedKey}
            onSelect={() => onSelect(m.key)}
            onInfo={() => onInfo(m.key)}
          />
        );
      })}
    </View>
  );
}

type CardProps = {
  metric: Metric;
  width: number;
  sparkWidth: number;
  active: boolean;
  onSelect: () => void;
  onInfo: () => void;
};

function MetricCardItem({ metric: m, width, sparkWidth, active, onSelect, onInfo }: CardProps) {
  const border = useThemeColor("border", "#E5E8EE");
  const muted = useThemeColor("muted", "#6B7385");
  const color = METRIC_COLORS[m.key]; // shu o'lchovning rangi: belgi, tanlangan chegara va grafik

  const measured = m.value !== EMPTY_VALUE;
  const chip = CHIP[measured ? m.status : "none"];
  // Yorliq matni: "Normal · soat: past xavf · taxminiy" kabi uzun qatordan faqat holat ("Normal").
  const chipLabel = measured ? m.statusLabel.split(" · ")[0] : m.updatedAt;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onSelect}
      // Tanlangan karta: o'lchov rangidagi chegara va shu rangning yengil tusi. Chegara qalinligi doim bir xil (2),
      // shunda tanlanganda ichi siljimaydi.
      style={{
        width,
        borderWidth: 2,
        borderColor: active ? color : border,
        backgroundColor: active ? withAlpha(color, 0.12) : undefined,
      }}
      className={`gap-2 rounded-xl px-3 py-3 ${active ? "" : "bg-background"}`}
    >
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withAlpha(color, 0.18) }}>
          <Octicons name={m.icon} size={16} color={color} />
        </View>
        <CusText variant="caption" className="flex-1 font-semibold" numberOfLines={1}>
          {m.title}
        </CusText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${m.title} haqida ma'lumot`}
          onPress={onInfo}
          hitSlop={10}
        >
          <Octicons name="info" size={16} color={muted} />
        </Pressable>
      </View>

      <View>
        <CusText className="text-2xl font-bold" tone={measured ? "default" : "muted"} numberOfLines={1} adjustsFontSizeToFit>
          {m.value}
        </CusText>
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          {m.unit}
        </CusText>
      </View>

      <View className="flex-row items-center justify-between gap-2" style={{ minHeight: 22 }}>
        <View className={`shrink rounded-full px-2 py-0.5 ${chip.box}`}>
          <CusText variant="caption" tone={chip.tone} className="font-semibold" numberOfLines={1}>
            {chipLabel}
          </CusText>
        </View>
        {measured ? <Sparkline values={sparkValues(m)} color={color} width={sparkWidth} /> : null}
      </View>

      {/* O'lchanmagan kartada ham bir xil balandlik: bo'sh joy ushlab turiladi */}
      <CusText variant="caption" tone="muted" numberOfLines={1}>
        {measured ? m.updatedAt : " "}
      </CusText>
    </Pressable>
  );
}
