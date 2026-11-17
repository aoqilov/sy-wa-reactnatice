import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useActivityGoals } from "@/features/activity";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { dateKey } from "../api/sleep";
import { useSleep } from "../hooks/use-sleep";
import { SLEEP_COLOR, STAGE_COLORS, withAlpha } from "../lib/colors";
import { formatDuration } from "../lib/format";

const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const BAR_H = 36;

// History ro'yxatidagi "Uyqu" kartasi: oxirgi 7 kecha o'rtachasi va kichik ustunlar. Bosilsa /history/sleep.
export function SleepHistoryCard({ onPress }: { onPress: () => void }) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const border = useThemeColor("border", "#E5E8EE");
  const { nights } = useSleep();
  const { goals } = useActivityGoals();

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const keys = Array.from({ length: DAYS }, (_, i) => dateKey(base - (DAYS - 1 - i) * DAY_MS));
  const byKey = new Map((nights ?? []).map((n) => [n.key, n]));
  const week = keys.map((k) => byKey.get(k)).filter((n) => n !== undefined);
  const avg = week.length ? week.reduce((a, n) => a + n.totalMin, 0) / week.length : 0;
  const max = Math.max(goals.sleepMin, ...week.map((n) => n.totalMin), 60);

  return (
    <CusCard onPress={onPress} className={`gap-3 ${week.length === 0 ? "opacity-60" : ""}`}>
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.18) }}>
          <Octicons name="moon" size={16} color={SLEEP_COLOR} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {t("sleep.title")}
        </CusText>
      </View>

      {week.length === 0 ? (
        <CusText tone="muted">{t("sleep.noNights")}</CusText>
      ) : (
        <>
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <CusText className="text-3xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
                {formatDuration(avg, t)}
              </CusText>
              <CusText variant="caption" tone="muted">
                {t("sleep.avgWeek")}
              </CusText>
            </View>
            <View className="flex-row items-end gap-1" style={{ height: BAR_H }}>
              {keys.map((k) => {
                const n = byKey.get(k);
                return n ? (
                  <View
                    key={k}
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: Math.max(4, (n.totalMin / max) * BAR_H),
                      backgroundColor: n.totalMin >= goals.sleepMin ? STAGE_COLORS.deep : STAGE_COLORS.light,
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
              {t("sleep.nightsCount", { n: week.length })}
            </CusText>
            <Octicons name="chevron-right" size={16} color={muted} />
          </View>
        </>
      )}
    </CusCard>
  );
}
