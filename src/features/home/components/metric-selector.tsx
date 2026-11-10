import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { CusButton, CusImage, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Metric } from "../api/get-metrics";
import { METRIC_IMAGES } from "../constants/metric-images";

type Props = {
  metrics: Metric[];
  selectedKey: Metric["key"];
  onSelect: (key: Metric["key"]) => void;
  onInfo: (key: Metric["key"]) => void; // kartadagi "info" tugmasi bosilganda
};

const PADDING = 16; // chap va o'ng chetdan
const GAP = 8; // kartalar orasidagi masofa
const COLS = 2; // 2 ustun, kartalar pastga qarab tushadi (surish yo'q)
// Rasm ustidagi qora qatlam (0 = yo'q, 1 = to'liq qora). Tanlangan karta yorqin, qolganlari xira ko'rinadi.
const DIM_ACTIVE = 0.3;
const DIM_INACTIVE = 0.68;
// Rasm ustidagi matn: oq rang va qora soya (har qanday rasmda o'qilishi uchun).
const TEXT = {
  color: "#FFFFFF",
  textShadowColor: "rgba(0,0,0,0.85)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

// O'lchov kartalari: 2 ustunli to'r, ustunlar to'lsa keyingi qatorga tushadi.
// Har bir kartada fon rasmi bor, ma'lumotlar uning ustida turadi.
export function MetricSelector({
  metrics,
  selectedKey,
  onSelect,
  onInfo,
}: Props) {
  const { width } = useWindowDimensions();

  const itemWidth = (width - PADDING * 2 - GAP * (COLS - 1)) / COLS;

  return (
    // Sarlavha ("O'lchovni tanlang") va panel foni FeatureHome'da: ular qotib turadi, faqat shu kartalar scroll bo'ladi.
    <View className="flex-row flex-wrap pb-4 pt-2" style={{ paddingHorizontal: PADDING, gap: GAP }}>
      {metrics.map((m) => (
        <MetricCardItem
          key={m.key}
          metric={m}
          width={itemWidth}
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
  active: boolean;
  onSelect: () => void;
  onInfo: () => void;
};

function MetricCardItem({ metric: m, width, active, onSelect, onInfo }: CardProps) {
  const primary = useThemeColor("primary", "#1E6FEB");

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onSelect}
      // Tanlangan karta: yo'g'on ko'k chegara, yorqin rasm va burchakda "✓" belgisi.
      // Chegara qalinligi doim bir xil (3), shunda tanlanganda karta ichi siljimaydi.
      style={{
        width,
        alignItems: "center",
        borderWidth: 3,
        borderColor: active ? primary : "transparent",
      }}
      className="gap-2 overflow-hidden rounded-xl px-3 py-3"
    >
      {/* Fon rasmi va uning ustidagi qora qatlam */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <CusImage source={METRIC_IMAGES[m.key]} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0,0,0,${active ? DIM_ACTIVE : DIM_INACTIVE})` },
          ]}
        />
      </View>

      {/* Tanlanganlik belgisi */}
      {active ? (
        <View
          pointerEvents="none"
          className="items-center justify-center rounded-full"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            backgroundColor: primary,
          }}
        >
          <Octicons name="check" size={14} color="#FFFFFF" />
        </View>
      ) : null}

      <View className="flex-row items-center justify-center gap-2 self-stretch">
        <Octicons name={m.icon} size={16} color="#FFFFFF" />
        <CusText
          variant="caption"
          className="shrink font-semibold"
          style={TEXT}
          numberOfLines={1}
        >
          {m.title}
        </CusText>
      </View>

      <View className="items-center self-stretch">
        <CusText
          className="text-center text-xl font-bold"
          style={TEXT}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {m.value}
        </CusText>
        <CusText
          variant="caption"
          className="text-center"
          style={TEXT}
          numberOfLines={1}
        >
          {m.unit}
        </CusText>
      </View>

      {/* Karta oxiri: info tugmasi */}
      <CusButton
        title="Info"
        variant="outline"
        size="sm"
        className="self-stretch"
        accessibilityLabel={`${m.title} haqida ma'lumot`}
        onPress={onInfo}
      />
    </Pressable>
  );
}
