import Svg, { Circle, Polyline } from "react-native-svg";

type Props = {
  /** Eskidan yangiga (chapdan o'ngga). */
  values: number[];
  color: string;
  width?: number;
  height?: number;
};

const PAD = 3; // chiziq va oxirgi nuqta chetdan kesilib qolmasligi uchun

// Kartadagi mini grafik: oxirgi o'lchovlar dinamikasi (o'qlarsiz, faqat shakl). Oxirgi nuqta nuqta bilan belgilanadi.
// Kamida ikkita qiymat bo'lmasa chizilmaydi.
export function Sparkline({ values, color, width = 56, height = 22 }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const stepX = (width - PAD * 2) / (values.length - 1);
  const points = values.map((v, i) => ({
    x: PAD + i * stepX,
    // Hamma qiymat bir xil bo'lsa, chiziq o'rtada tekis turadi.
    y: max === min ? height / 2 : PAD + (1 - (v - min) / (max - min)) * (height - PAD * 2),
  }));
  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height} accessible={false}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </Svg>
  );
}
