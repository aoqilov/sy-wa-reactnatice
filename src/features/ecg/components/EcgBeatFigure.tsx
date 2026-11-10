import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Path, Polyline, Rect, Text as SvgText } from "react-native-svg";

import type { MedianBeat } from "../lib/ecg-analysis";
import { beatFigure, type IntervalText } from "../lib/ecg-beat-figure";
import { PAPER } from "../lib/ecg-geometry";

const MAX_WIDTH_DP = 340;
/** Balandlik ham cheklanadi: Android'da Svg o'z o'lchamidagi bitmap yaratadi (OutOfMemoryError dan himoya). */
const MAX_HEIGHT_DP = 420;

type Props = { beat: MedianBeat; rate: number; intervalText: IntervalText };

// O'rtacha kompleks (P Q R S T va PR/QRS/QT qavslari) — konteyner kengligiga kattalashtirilgan; kataklar
// standart masshtabda (1 kichik katak = 0.04 s), shuning uchun intervallarni kataklar bo'yicha ham sanash mumkin.
export function EcgBeatFigure({ beat, rate, intervalText }: Props) {
  const [width, setWidth] = useState(0);
  const fig = useMemo(() => beatFigure(beat, rate, intervalText), [beat, rate, intervalText]);
  // Kenglik konteynerga, lekin balandlik MAX_HEIGHT_DP dan oshsa, nisbat saqlanib ikkalasi kichrayadi.
  const ratio = fig.heightMm / fig.widthMm;
  const shownWidth = Number.isFinite(ratio) && ratio > 0 ? Math.min(width, MAX_WIDTH_DP, MAX_HEIGHT_DP / ratio) : 0;

  return (
    <View className="items-center self-stretch" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {shownWidth > 0 ? (
        <Svg
          width={shownWidth}
          height={shownWidth * ratio}
          viewBox={`0 0 ${fig.widthMm} ${fig.heightMm}`}
        >
          <Rect x={0} y={0} width={fig.widthMm} height={fig.heightMm} fill={PAPER.background} />
          <Path d={fig.minor} stroke={PAPER.minor} strokeWidth={0.04} />
          <Path d={fig.major} stroke={PAPER.major} strokeWidth={0.09} />
          {fig.guides ? (
            <Path d={fig.guides} stroke={PAPER.guide} strokeWidth={0.06} strokeDasharray="0.4 0.3" />
          ) : null}
          {fig.brackets ? <Path d={fig.brackets} stroke={PAPER.text} strokeWidth={0.1} /> : null}
          <Polyline
            points={fig.trace}
            fill="none"
            stroke={PAPER.ink}
            strokeWidth={0.18}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {fig.labels.map((l) => (
            <SvgText
              key={`${l.text}-${l.x}`}
              x={l.x}
              y={l.y}
              fontSize={l.size}
              fontWeight="bold"
              fill={l.color}
              textAnchor={l.anchor}
            >
              {l.text}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
