import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Segment = { value: number; color: string };

type Props = {
  /** Halqaning to'liq aylanasi shu qiymatga teng (masalan, uyqu maqsadi, daqiqa). Oshib ketsa — to'liq halqa. */
  total: number;
  segments: Segment[];
  size: number;
  stroke: number;
  trackColor: string;
  children?: React.ReactNode;
};

const GAP = 3; // bo'laklar orasidagi bo'shliq (px, aylana bo'ylab)

/** Bo'lakli halqa: tepadan soat mili bo'yicha ketma-ket rangli yoylar (uyqu bosqichlari), ichiga matn qo'yiladi. */
export function SleepRing({ total, segments, size, stroke, trackColor, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  // Maqsaddan oshsa, bo'laklar butun aylanaga siqiladi.
  const scale = c / Math.max(total, sum, 1);
  const parts = segments.filter((s) => s.value > 0);
  // Har bo'lakning aylanadagi boshi: oldingilar uzunligi yig'indisi.
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, s) => a + s.value * scale, 0));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        {parts.map((s, i) => {
          const len = s.value * scale;
          const visible = Math.max(0.5, len - (parts.length > 1 ? GAP : 0));
          return (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${visible} ${c}`}
              strokeDashoffset={-starts[i]}
            />
          );
        })}
      </Svg>
      {children}
    </View>
  );
}
