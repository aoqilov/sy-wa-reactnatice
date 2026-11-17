import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { stepDayKey } from "@/shared/watch/step-history";

import type { StepDay } from "../api/step-history";
import { formatInt } from "../lib/format";

export const STEP_COLOR = "#F59E0B"; // Home'dagi qadam kartasi rangi (kahrabo)

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["sleep.wd.0", "sleep.wd.1", "sleep.wd.2", "sleep.wd.3", "sleep.wd.4", "sleep.wd.5", "sleep.wd.6"] as const;

const shortDate = (key: string) => {
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
};
const weekday = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** Ming bilan qisqa: 12 500 → "12.5k". */
const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

// Kunlar bo'yicha qadamlar: har ustun bitta kun, maqsad chiziq bilan; maqsadga yetgan kun to'q rangda. Ustun bosilsa
// o'sha kun tanlanadi. Ma'lumotsiz kun — kichik kulrang nuqta.
export function StepDayBars({
  days,
  range,
  goal,
  selectedKey,
  onSelect,
}: {
  days: StepDay[];
  range: number;
  goal: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const t = useT();
  const border = useThemeColor("border", "#E5E8EE");
  const muted = useThemeColor("muted", "#6B7385");
  const H = 140;

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const keys = Array.from({ length: range }, (_, i) => stepDayKey(base - (range - 1 - i) * DAY_MS));
  const byKey = new Map(days.map((d) => [d.key, d]));
  const max = Math.max(goal * 1.25, ...keys.map((k) => byKey.get(k)?.steps ?? 0), 1000);
  const goalY = H - (goal / max) * H;
  const gap = range <= 7 ? 10 : 3;
  const labelEvery = range <= 7 ? 1 : 5;

  return (
    <View className="gap-1">
      <View style={{ height: H }}>
        <View
          style={{ position: "absolute", left: 0, right: 0, top: goalY, borderTopWidth: 1, borderColor: muted, borderStyle: "dashed" }}
        />
        <CusText variant="caption" tone="muted" style={{ position: "absolute", right: 0, top: Math.max(0, goalY - 16) }}>
          {t("steps.goalLine", { v: compact(goal) })}
        </CusText>
        <View className="flex-1 flex-row items-end" style={{ gap }}>
          {keys.map((k) => {
            const d = byKey.get(k);
            if (!d || d.steps === 0) {
              return (
                <View key={k} className="flex-1 items-center">
                  <View className="rounded-full" style={{ width: 5, height: 5, backgroundColor: border }} />
                </View>
              );
            }
            const reached = d.steps >= goal;
            return (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={`${shortDate(k)} ${formatInt(d.steps)}`}
                onPress={() => onSelect(k)}
                className="flex-1 items-center justify-end"
                style={{ height: H }}
              >
                <View
                  className="w-full rounded-md"
                  style={{
                    maxWidth: 26,
                    height: Math.max(4, (d.steps / max) * H),
                    backgroundColor: reached ? STEP_COLOR : `${STEP_COLOR}88`,
                    borderWidth: k === selectedKey ? 2 : 0,
                    borderColor: "#B45309",
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View className="flex-row" style={{ gap }}>
        {keys.map((k, i) => (
          <View key={k} className="flex-1 items-center">
            {(range - 1 - i) % labelEvery === 0 ? (
              <CusText variant="caption" tone={k === selectedKey ? "primary" : "muted"} numberOfLines={1} style={{ fontSize: 10 }}>
                {range <= 7 ? t(WEEKDAYS[weekday(k)]) : shortDate(k)}
              </CusText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// Bitta kunning 30 daqiqalik qadamlari (00:00–24:00): kunning qaysi qismida yurilgani.
export function StepHourBars({ slots }: { slots: number[] }) {
  const H = 90;
  const max = Math.max(...slots, 100);
  return (
    <View className="gap-1">
      <View className="flex-row items-end" style={{ height: H, gap: 1.5 }}>
        {slots.map((v, i) => (
          <View
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: v > 0 ? Math.max(3, (v / max) * H) : 2, backgroundColor: v > 0 ? STEP_COLOR : "#9CA3AF33" }}
          />
        ))}
      </View>
      <View className="flex-row justify-between">
        {["00", "06", "12", "18", "24"].map((h) => (
          <CusText key={h} variant="caption" tone="muted" style={{ fontSize: 10 }}>
            {h}:00
          </CusText>
        ))}
      </View>
    </View>
  );
}
