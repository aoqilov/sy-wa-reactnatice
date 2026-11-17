import { useState } from "react";
import { View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import type { SleepNight, SleepStage } from "../api/sleep";
import { STAGE_COLORS, STAGE_ORDER } from "../lib/colors";
import { clock } from "../lib/format";

const LANE_H = 26;
const LANE_GAP = 6;
const LABEL_W = 56;

// Gipnogramma: tun bo'yi bosqichlar vaqt chizig'ida. Har bosqich o'z qatorida (uyg'oq tepada, chuqur pastda),
// bo'laklar rangli bloklar. Oddiy uyquda REM qatori ko'rsatilmaydi (soat uni ajratmaydi).
export function Hypnogram({ night }: { night: SleepNight }) {
  const t = useT();
  const grid = useThemeColor("border", "#E5E8EE");
  const [width, setWidth] = useState(0);

  const lanes = STAGE_ORDER.filter((s) => s !== "rem" || night.precise);
  const start = night.down;
  const end = Math.max(
    night.up,
    ...night.segments.map((seg) => seg.down + (seg.stages.at(-1)?.[2] ?? 0) * 60_000),
  );
  const span = Math.max(1, end - start);
  const chartW = Math.max(0, width - LABEL_W);
  const height = lanes.length * LANE_H + (lanes.length - 1) * LANE_GAP;
  const x = (ms: number) => LABEL_W + ((ms - start) / span) * chartW;
  const laneY = (s: SleepStage) => lanes.indexOf(s) * (LANE_H + LANE_GAP);

  const mid = start + span / 2;

  return (
    <View className="gap-1" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View style={{ height }}>
          <Svg width={width} height={height}>
            {lanes.map((s) => (
              <Line
                key={s}
                x1={LABEL_W}
                x2={width}
                y1={laneY(s) + LANE_H / 2}
                y2={laneY(s) + LANE_H / 2}
                stroke={grid}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            ))}
            {night.segments.flatMap((seg, si) =>
              seg.stages
                .filter(([s]) => lanes.includes(s))
                .map(([s, a, b], i) => {
                  const x1 = x(seg.down + a * 60_000);
                  const x2 = x(seg.down + b * 60_000);
                  return (
                    <Rect
                      key={`${si}-${i}`}
                      x={x1}
                      y={laneY(s)}
                      width={Math.max(1.5, x2 - x1)}
                      height={LANE_H}
                      rx={3}
                      fill={STAGE_COLORS[s]}
                    />
                  );
                }),
            )}
          </Svg>
          {/* Qator nomlari SVG ustida: matn tizim shriftida va til almashganda to'g'ri chiqadi */}
          {lanes.map((s) => (
            <View
              key={s}
              style={{ position: "absolute", left: 0, top: laneY(s), height: LANE_H, width: LABEL_W - 6 }}
              className="justify-center"
            >
              <CusText variant="caption" tone="muted" numberOfLines={1}>
                {t(`sleep.stage.${s}`)}
              </CusText>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ height }} />
      )}

      <View className="flex-row justify-between" style={{ paddingLeft: LABEL_W }}>
        <CusText variant="caption" tone="muted">
          {clock(start)}
        </CusText>
        <CusText variant="caption" tone="muted">
          {clock(mid)}
        </CusText>
        <CusText variant="caption" tone="muted">
          {clock(end)}
        </CusText>
      </View>
    </View>
  );
}
