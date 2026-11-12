import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useThemeColor } from "@/shared/theme/use-theme-color";

type Props = {
  /** 0..1 (1 dan oshsa ham to'liq halqa). */
  progress: number;
  size: number;
  stroke?: number;
  color: string;
  children?: React.ReactNode;
};

/** Maqsad halqasi: kulrang iz ustida rangli yoy, tepadan soat mili bo'yicha. Ichiga matn qo'yiladi. */
export function StepRing({ progress, size, stroke = 10, color, children }: Props) {
  const track = useThemeColor("border", "#E5E8EE");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {p > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - p)}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
