import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";

import type { Polarity } from "../lib/ecg-analysis";
import {
  CAL_WIDTH_MM,
  calibrationPath,
  gainFor,
  gridPath,
  isCalibratedGain,
  type Lane,
  PAPER,
  PAPER_SPEED_MM_S,
  robustRange,
  sweepTrace,
} from "../lib/ecg-geometry";

/** Ekranda bir vaqtda ko'rinadigan qism, s. Jonli o'lchov ham, hisobotdagi qayta o'ynatish ham bir xil. */
export const SWEEP_WINDOW_S = 3;
export const SWEEP_LANE: Lane = { heightMm: 48, baselineMm: 29 };
const WIDTH_MM = CAL_WIDTH_MM + SWEEP_WINDOW_S * PAPER_SPEED_MM_S;

/**
 * Lenta kuchaytirishi — butun yozuv (jonli o'lchovda: shu paytgacha yozilgani) bo'yicha. Hisobot ham, jonli chiziq ham
 * shu bitta funksiyadan foydalanadi: o'lchov oxirida jonli chiziq hisobotdagi bilan aynan bir xil balandlikda bo'ladi.
 */
export function sweepGain(samples: number[], sign: Polarity): number {
  const [low, high] = robustRange(samples);
  return sign < 0 ? gainFor(-high, -low, SWEEP_LANE) : gainFor(low, high, SWEEP_LANE);
}

type Props = {
  samples: number[];
  /** Yozilgan (ko'rsatiladigan) namunalar soni — yozuvchining joyi. */
  total: number;
  rate: number;
  sign: Polarity;
  gain: number;
  widthDp: number;
  /** Yozuvchi uchidagi nuqta. */
  head: boolean;
};

// Soatning rasmiy ilovasidagi kabi lenta: oq fon, kulrang katak, ingichka qizil chiziq; 3 s lik oyna ekran
// kengligiga sig'adi, yozuvchi chapdan o'ngga yuradi va oxiriga yetgach eski yozuv ustidan boshidan yozadi.
// Kuchaytirish standart (mm/mV) bo'lsa, chapda 1 mV kalibrlash impulsi. Svg ekran kengligida, shuning uchun
// Android'da bitmap xotirasi muammo emas.
export function EcgSweep({ samples, total, rate, sign, gain, widthDp, head }: Props) {
  const bucketMm = widthDp > 0 ? WIDTH_MM / widthDp : 0.2; // ekran nuqtasiga ~2 ta nuqta
  const { current, previous, headX, headY } = sweepTrace(
    samples,
    total,
    rate,
    WIDTH_MM,
    CAL_WIDTH_MM,
    gain,
    SWEEP_LANE,
    sign,
    bucketMm,
  );
  const { heightMm } = SWEEP_LANE;

  return (
    <Svg width={widthDp} height={(widthDp * heightMm) / WIDTH_MM} viewBox={`0 0 ${WIDTH_MM} ${heightMm}`}>
      <Rect x={0} y={0} width={WIDTH_MM} height={heightMm} fill={PAPER.background} />
      <Path d={gridPath(1, WIDTH_MM, heightMm)} stroke={PAPER.minor} strokeWidth={0.06} />
      <Path d={gridPath(5, WIDTH_MM, heightMm)} stroke={PAPER.major} strokeWidth={0.12} />
      {isCalibratedGain(gain) ? (
        <Path d={calibrationPath(gain, SWEEP_LANE)} stroke={PAPER.ink} strokeWidth={0.22} fill="none" />
      ) : null}
      {previous ? (
        <Polyline points={previous} fill="none" stroke={PAPER.ink} strokeWidth={0.2} strokeLinejoin="round" />
      ) : null}
      {current ? (
        <Polyline points={current} fill="none" stroke={PAPER.ink} strokeWidth={0.2} strokeLinejoin="round" />
      ) : null}
      {head && total > 0 ? <Circle cx={headX} cy={headY} r={0.5} fill={PAPER.ink} /> : null}
    </Svg>
  );
}
