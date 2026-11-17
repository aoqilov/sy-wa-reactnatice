import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { dateKey, type SleepNight } from "../api/sleep";
import { STAGE_COLORS, withAlpha } from "../lib/colors";
import { formatDuration, shortDate, weekday } from "../lib/format";

const CHART_H = 140;
const WEEKDAYS = ["sleep.wd.0", "sleep.wd.1", "sleep.wd.2", "sleep.wd.3", "sleep.wd.4", "sleep.wd.5", "sleep.wd.6"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type Props = {
  nights: SleepNight[];
  days: number;
  goalMin: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

// Kunlar bo'yicha uyqu: har ustun bitta kecha (pastdan chuqur, yengil, REM), maqsad chiziq bilan. Ma'lumotsiz kun —
// kichik kulrang nuqta. Ustun bosilsa o'sha kecha tepada ochiladi.
export function SleepBars({ nights, days, goalMin, selectedKey, onSelect }: Props) {
  const t = useT();
  const border = useThemeColor("border", "#E5E8EE");
  const muted = useThemeColor("muted", "#6B7385");

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const keys = Array.from({ length: days }, (_, i) => dateKey(base - (days - 1 - i) * DAY_MS));
  const byKey = new Map(nights.map((n) => [n.key, n]));
  const maxMin = Math.max(goalMin * 1.25, ...keys.map((k) => byKey.get(k)?.totalMin ?? 0), 60);
  const scale = (min: number) => (min / maxMin) * CHART_H;
  const labelEvery = days <= 7 ? 1 : 5;
  const goalY = CHART_H - scale(goalMin);

  return (
    <View className="gap-1">
      <View style={{ height: CHART_H }}>
        {/* Maqsad chizig'i */}
        <View
          style={{ position: "absolute", left: 0, right: 0, top: goalY, borderTopWidth: 1, borderColor: muted, borderStyle: "dashed" }}
        />
        <CusText variant="caption" tone="muted" style={{ position: "absolute", right: 0, top: Math.max(0, goalY - 16) }}>
          {t("sleep.goalLine", { v: formatDuration(goalMin, t) })}
        </CusText>

        <View className="flex-1 flex-row items-end" style={{ gap: days <= 7 ? 10 : 3 }}>
          {keys.map((k) => {
            const n = byKey.get(k);
            const selected = k === selectedKey;
            if (!n) {
              return (
                <View key={k} className="flex-1 items-center">
                  <View className="rounded-full" style={{ width: 5, height: 5, backgroundColor: border }} />
                </View>
              );
            }
            const parts: [string, number][] = [
              [STAGE_COLORS.deep, n.deepMin],
              [STAGE_COLORS.light, n.lightMin],
              [STAGE_COLORS.rem, n.remMin],
            ];
            const known = n.deepMin + n.lightMin + n.remMin;
            // Bosqichlar yig'indisi jamiga teng bo'lmasa (soat ba'zan farq beradi), qolgani yengil rangda.
            if (n.totalMin > known) parts[1][1] += n.totalMin - known;
            return (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={`${shortDate(k)} ${formatDuration(n.totalMin, t)}`}
                onPress={() => onSelect(k)}
                className="flex-1 items-center justify-end"
                style={{ height: CHART_H }}
              >
                <View
                  className="w-full overflow-hidden rounded-md"
                  style={{
                    maxWidth: 26,
                    height: Math.max(4, scale(n.totalMin)),
                    flexDirection: "column-reverse",
                    borderWidth: selected ? 2 : 0,
                    borderColor: STAGE_COLORS.deep,
                    backgroundColor: withAlpha(STAGE_COLORS.light, 0.3),
                  }}
                >
                  {parts.map(([color, min], i) =>
                    min > 0 ? <View key={i} style={{ height: scale(min), backgroundColor: color }} /> : null,
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row" style={{ gap: days <= 7 ? 10 : 3 }}>
        {keys.map((k, i) => (
          <View key={k} className="flex-1 items-center">
            {(days - 1 - i) % labelEvery === 0 ? (
              <CusText variant="caption" tone={k === selectedKey ? "primary" : "muted"} numberOfLines={1} style={{ fontSize: 10 }}>
                {days <= 7 ? t(WEEKDAYS[weekday(k)]) : shortDate(k)}
              </CusText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
