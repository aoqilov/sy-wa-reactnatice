import { useWindowDimensions, View } from "react-native";

import { CusHealthCard, CusHealthValue, CusText } from "@/components/ui";

import { EMPTY_VALUE, Metric, type MetricStatus } from "../api/get-metrics";
import { METRIC_RANGES, METRIC_TAGLINES } from "../constants/metric-card";
import { METRIC_COLORS } from "../constants/metric-colors";
import { RangeBar } from "./range-bar";
import { Sparkline } from "./sparkline";

type Props = {
  metrics: Metric[];
  /** null — hech bir o'lchov tanlanmagan (masalan, "Qadamlar" kartasi tanlangan). */
  selectedKey: Metric["key"] | null;
  onSelect: (key: Metric["key"]) => void;
  onInfo: (key: Metric["key"]) => void; // kartadagi "info" belgisi bosilganda
};

const PADDING = 16; // chap va o'ng chetdan
const GAP = 8; // kartalar orasidagi masofa
const COLS = 2; // 2 ustun, kartalar pastga qarab tushadi (surish yo'q)
const SPARK_POINTS = 8; // mini grafikda nechta oxirgi o'lchov
const SPARK_WIDTH = 56;

// Holat matni (Normal / Past / Yuqori) rangi.
const STATUS_TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
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

// O'lchov kartalari: 2 ustunli to'r, ustunlar to'lsa keyingi qatorga tushadi. Hamma kartalar bir xil kenglikda (toq
// sondagi oxirgisi ham cho'zilmaydi). Karta o'z o'lchovining rangidagi gradient fonda (constants/metric-colors.ts);
// holat matni esa holat rangida (yashil/sariq/qizil).
export function MetricSelector({ metrics, selectedKey, onSelect, onInfo }: Props) {
  const { width } = useWindowDimensions();

  const itemWidth = (width - PADDING * 2 - GAP * (COLS - 1)) / COLS;

  return (
    <View className="flex-row flex-wrap pb-4 pt-2" style={{ paddingHorizontal: PADDING, gap: GAP }}>
      {metrics.map((m) => (
        <MetricCardItem
          key={m.key}
          metric={m}
          width={itemWidth}
          sparkWidth={SPARK_WIDTH}
          active={m.key === selectedKey}
          onSelect={() => onSelect(m.key)}
          onInfo={() => onInfo(m.key)}
        />
      ))}
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

// O'lchanmagan: sarlavha, qisqa chorlov matni va pastki burchakda katta belgi. O'lchangan: "103 zarb/daq", rangli
// me'yor chizig'i (marker qiymat joyida) yoki mini grafik, pastda vaqt va holat ("11:29 · Normal").
function MetricCardItem({ metric: m, width, sparkWidth, active, onSelect, onInfo }: CardProps) {
  const color = METRIC_COLORS[m.key]; // shu o'lchovning rangi: fon, belgi, tanlangan chegara va grafik
  const measured = m.value !== EMPTY_VALUE;
  const range = METRIC_RANGES[m.key];
  const number = Number(m.value.split("/")[0]); // bosimda yuqori (sistolik) qiymat
  // Holat matni: "Normal · soat: past xavf · taxminiy" kabi uzun qatordan faqat holat ("Normal").
  const statusLabel = m.statusLabel.split(" · ")[0];

  return (
    <CusHealthCard
      width={width}
      color={color}
      icon={m.icon}
      title={m.title}
      active={active}
      onPress={onSelect}
      onInfo={onInfo}
      illustrated={!measured}
    >
      {measured ? (
        <>
          <CusHealthValue value={m.value} unit={m.unit} />
          <View className="flex-1 justify-center">
            {range && Number.isFinite(number) ? (
              <RangeBar range={range} value={number} />
            ) : (
              <Sparkline values={sparkValues(m)} color={color} width={sparkWidth} />
            )}
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <CusText variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {m.updatedAt}
            </CusText>
            <CusText variant="caption" tone={STATUS_TONE[m.status]} className="font-semibold" numberOfLines={1}>
              {statusLabel}
            </CusText>
          </View>
        </>
      ) : (
        <CusText variant="caption" tone="muted" numberOfLines={3} style={{ paddingRight: 24 }}>
          {METRIC_TAGLINES[m.key]}
        </CusText>
      )}
    </CusHealthCard>
  );
}
