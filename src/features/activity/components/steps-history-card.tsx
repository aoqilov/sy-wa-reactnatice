import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { stepDayKey } from "@/shared/watch/step-history";

import { useActivityGoals } from "../hooks/use-activity";
import { useStepHistory } from "../hooks/use-step-history";
import { formatInt } from "../lib/format";
import { STEP_COLOR } from "./step-charts";

const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const BAR_H = 36;

// History ro'yxatidagi "Qadamlar" kartasi: oxirgi 7 kun o'rtachasi va kichik ustunlar. Bosilsa /history/steps.
export function StepsHistoryCard({ onPress }: { onPress: () => void }) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const border = useThemeColor("border", "#E5E8EE");
  const days = useStepHistory();
  const { goals } = useActivityGoals();

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const keys = Array.from({ length: DAYS }, (_, i) => stepDayKey(base - (DAYS - 1 - i) * DAY_MS));
  const byKey = new Map((days ?? []).filter((d) => d.steps > 0).map((d) => [d.key, d]));
  const week = keys.map((k) => byKey.get(k)).filter((d) => d !== undefined);
  const avg = week.length ? week.reduce((a, d) => a + d.steps, 0) / week.length : 0;
  const max = Math.max(goals.steps, ...week.map((d) => d.steps), 1000);

  return (
    <CusCard onPress={onPress} className={`gap-3 ${week.length === 0 ? "opacity-60" : ""}`}>
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${STEP_COLOR}2E` }}>
          <Octicons name="goal" size={16} color={STEP_COLOR} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {t("activity.steps")}
        </CusText>
      </View>

      {week.length === 0 ? (
        <CusText tone="muted">{t("steps.noDays")}</CusText>
      ) : (
        <>
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
                {formatInt(avg)}
              </CusText>
              <CusText variant="caption" tone="muted">
                {t("steps.avgWeek")}
              </CusText>
            </View>
            <View className="flex-row items-end gap-1" style={{ height: BAR_H }}>
              {keys.map((k) => {
                const d = byKey.get(k);
                return d ? (
                  <View
                    key={k}
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: Math.max(4, (d.steps / max) * BAR_H),
                      backgroundColor: d.steps >= goals.steps ? STEP_COLOR : `${STEP_COLOR}88`,
                    }}
                  />
                ) : (
                  <View key={k} className="rounded-full" style={{ width: 5, height: 4, backgroundColor: border }} />
                );
              })}
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <CusText variant="caption" tone="muted">
              {t("steps.reachedDays", { n: week.filter((d) => d.steps >= goals.steps).length, of: week.length })}
            </CusText>
            <Octicons name="chevron-right" size={16} color={muted} />
          </View>
        </>
      )}
    </CusCard>
  );
}
