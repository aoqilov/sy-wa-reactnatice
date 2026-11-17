import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { dateKey, qualityOf, type SleepNight } from "../api/sleep";
import { SLEEP_COLOR, STAGE_COLORS, withAlpha } from "../lib/colors";
import { clock, formatDuration } from "../lib/format";

type Props = {
  night: SleepNight | null;
  goalMin: number;
  width: number;
  /** Tanlangan: tepada katta uyqu halqasi ko'rinib turibdi. */
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

const QUALITY_CHIP = {
  good: { box: "bg-success-soft", tone: "success" },
  fair: { box: "bg-warning-soft", tone: "warning" },
  poor: { box: "bg-danger-soft", tone: "danger" },
} as const;

// Home'dagi "Uyqu" kartasi (o'lchov kartalari uslubida): oxirgi kechaning davomiyligi, maqsadga nisbatan, vaqti va
// bosqichlar chizig'i. Bosilsa tepada o'lchash doirasi o'rnida katta uyqu halqasi chiqadi (SleepHero).
export function SleepCard({ night, goalMin, width, active, disabled = false, onSelect }: Props) {
  const t = useT();
  const border = useThemeColor("border", "#E5E8EE");
  // Faqat yaqin kecha (bugun yoki kecha uyg'onilgan) "oxirgi uyqu" sifatida ko'rsatiladi.
  const [now] = useState(Date.now);
  const yesterday = dateKey(now - 24 * 60 * 60 * 1000);
  const recent = night && night.key >= yesterday ? night : null;
  const quality = recent ? qualityOf(recent, goalMin) : null;
  const chip = quality ? QUALITY_CHIP[quality] : null;
  const total = recent ? recent.deepMin + recent.lightMin + recent.remMin + recent.awakeMin : 0;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={{
        width,
        borderWidth: 2,
        borderColor: active ? SLEEP_COLOR : border,
        backgroundColor: active ? withAlpha(SLEEP_COLOR, 0.12) : undefined,
        opacity: disabled ? 0.5 : 1,
      }}
      className={`gap-2 rounded-xl px-3 py-3 ${active ? "" : "bg-background"}`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.18) }}
        >
          <Octicons name="moon" size={16} color={SLEEP_COLOR} />
        </View>
        <CusText variant="caption" className="flex-1 font-semibold" numberOfLines={1}>
          {t("sleep.title")}
        </CusText>
      </View>

      <View>
        <CusText className="text-2xl font-bold" tone={recent ? "default" : "muted"} numberOfLines={1} adjustsFontSizeToFit>
          {recent ? formatDuration(recent.totalMin, t) : "--"}
        </CusText>
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          {recent ? `${clock(recent.down)} → ${clock(recent.up)}` : t("sleep.lastNight")}
        </CusText>
      </View>

      <View className="gap-1.5" style={{ minHeight: 22 }}>
        <View className="flex-row">
          <View className={`shrink rounded-full px-2 py-0.5 ${chip?.box ?? "bg-neutral-soft"}`}>
            <CusText variant="caption" tone={chip?.tone ?? "muted"} className="font-semibold" numberOfLines={1}>
              {quality ? t(`sleep.quality.${quality}`) : t("activity.noData")}
            </CusText>
          </View>
        </View>
        {/* Bosqichlar ulushi bitta chiziqda */}
        <View className="h-1.5 flex-row overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.2) }}>
          {recent && total > 0
            ? (["deep", "light", "rem", "awake"] as const).map((s) => {
                const min = s === "deep" ? recent.deepMin : s === "light" ? recent.lightMin : s === "rem" ? recent.remMin : recent.awakeMin;
                return min > 0 ? <View key={s} style={{ flex: min, backgroundColor: STAGE_COLORS[s] }} /> : null;
              })
            : null}
        </View>
      </View>

      <CusText variant="caption" tone="muted" numberOfLines={1}>
        {recent ? t("sleep.ofGoal", { pct: Math.round((recent.totalMin / Math.max(1, goalMin)) * 100) }) : " "}
      </CusText>
    </Pressable>
  );
}
