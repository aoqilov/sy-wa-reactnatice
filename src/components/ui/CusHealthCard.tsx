import Octicons from "@expo/vector-icons/Octicons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useThemeColor } from "@/shared/theme/use-theme-color";

import { CusText } from "./CusText";

type IconName = ComponentProps<typeof Octicons>["name"];

type Props = {
  width: number;
  /** Ko'rsatkichning o'z rangi ("#RRGGBB"): gradient fon, belgi va tanlangan chegara shundan. */
  color: string;
  icon: IconName;
  title: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Berilsa, sarlavha yonida "info" belgisi chiqadi. */
  onInfo?: () => void;
  /**
   * Katta bezak belgisi pastki o'ng burchakda. Ma'lumot yo'q kartalarda bo'sh joyni to'ldiradi;
   * ma'lumot bor kartalarda belgi kichrayib sarlavha qatoriga o'tadi, shunda qiymatlar uchun joy qoladi.
   */
  illustrated: boolean;
  children: ReactNode;
};

const RADIUS = 16;
const MIN_HEIGHT = 150;

// Home'dagi sog'liq kartalari uchun qobiq: o'z rangidagi och gradient fon, qalin sarlavha va pastki o'ng burchakda
// katta xira belgi. Ichidagi mazmunni (qiymat, chiziq, vaqt) chaqiruvchi beradi.
export function CusHealthCard({
  width,
  color,
  icon,
  title,
  active,
  disabled = false,
  onPress,
  onInfo,
  illustrated,
  children,
}: Props) {
  const muted = useThemeColor("muted", "#6B7385");
  const gradientId = `hc-${color.slice(1)}`;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width,
        minHeight: MIN_HEIGHT,
        borderRadius: RADIUS,
        borderWidth: 2,
        // Tanlanmaganda ham chegara qalinligi bir xil (2), shunda tanlanganda ichi siljimaydi.
        borderColor: active ? color : `${color}1F`,
        opacity: disabled ? 0.5 : 1,
      }}
      className="overflow-hidden bg-background"
    >
      {/* Fon: chap yuqoridan o'ng pastga o'z rangining och tusi. Tanlanganda biroz to'qroq. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={active ? 0.26 : 0.16} />
            <Stop offset="1" stopColor={color} stopOpacity={active ? 0.1 : 0.03} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>

      {illustrated ? (
        <View
          pointerEvents="none"
          className="absolute items-center justify-center rounded-full"
          style={{ right: -10, bottom: -10, width: 76, height: 76, backgroundColor: `${color}26` }}
        >
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 48, height: 48, backgroundColor: `${color}33` }}
          >
            <Octicons name={icon} size={24} color={color} />
          </View>
        </View>
      ) : null}

      <View className="flex-1 gap-2 px-3 py-3">
        <View className="flex-row items-center gap-2">
          <CusText className="flex-1 text-base font-bold" numberOfLines={1}>
            {title}
          </CusText>
          {!illustrated ? <Octicons name={icon} size={18} color={color} /> : null}
          {onInfo ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${title} haqida ma'lumot`} onPress={onInfo} hitSlop={10}>
              <Octicons name="info" size={16} color={muted} />
            </Pressable>
          ) : null}
        </View>
        {children}
      </View>
    </Pressable>
  );
}

/** Kartadagi qiymat: katta son va yonida kichik birlik ("103 bpm"). */
export function CusHealthValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <View className="flex-row items-baseline gap-1">
      <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
        {value}
      </CusText>
      {unit ? (
        <CusText variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {unit}
        </CusText>
      ) : null}
    </View>
  );
}
