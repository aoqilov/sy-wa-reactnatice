import { View } from "react-native";

import { useThemeColor } from "@/shared/theme/use-theme-color";

import type { MetricRange } from "../constants/metric-card";

const MARKER = 5; // marker uchburchagining yarim kengligi

// Rangli me'yor chizig'i (past · me'yor · yuqori bo'laklari) va tepasida qiymat turgan joyni ko'rsatuvchi uchburchak.
export function RangeBar({ range, value }: { range: MetricRange; value: number }) {
  const foreground = useThemeColor("foreground", "#111827");
  const span = range.max - range.min;
  const pct = Math.min(1, Math.max(0, (value - range.min) / span)) * 100;

  // Har bo'lak kengligi: o'z chegarasidan oldingi chegaragacha.
  const bands = range.bands.map((b, i) => ({
    ...b,
    flex: Math.max(0, b.to - (i === 0 ? range.min : range.bands[i - 1].to)),
  }));

  return (
    <View className="gap-1 pt-1">
      <View style={{ height: 6 }}>
        <View
          style={{
            position: "absolute",
            left: `${pct}%`,
            marginLeft: -MARKER,
            width: 0,
            height: 0,
            borderLeftWidth: MARKER,
            borderRightWidth: MARKER,
            borderTopWidth: 6,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: foreground,
          }}
        />
      </View>
      <View className="h-1.5 flex-row gap-0.5 overflow-hidden rounded-full">
        {bands.map((b) => (
          <View key={b.to} className="rounded-full" style={{ flex: b.flex, backgroundColor: b.color }} />
        ))}
      </View>
    </View>
  );
}
