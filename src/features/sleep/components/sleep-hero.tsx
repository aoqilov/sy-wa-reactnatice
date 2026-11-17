import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import { dateKey, qualityOf, type SleepNight, type SleepStage } from "../api/sleep";
import { SLEEP_COLOR, STAGE_COLORS, withAlpha } from "../lib/colors";
import { clock, formatDuration } from "../lib/format";
import { SleepRing } from "./sleep-ring";

type Props = {
  night: SleepNight | null;
  goalMin: number;
  ready: boolean;
  syncing: boolean;
  onDetails: () => void;
};

const SIZE = 264; // o'lchash doirasi (MeasureCircle) bilan bir xil: almashganda joy sakramaydi
const STROKE = 16;
const NUMBER_STYLE = { fontSize: 42, lineHeight: 54 } as const;
const QUALITY_TONE = { good: "success", fair: "warning", poor: "danger" } as const;

// "Uyqu" kartasi tanlanganda o'lchash doirasi o'rnida: oxirgi kecha bosqichlari bo'lakli halqada (aylana = uyqu
// maqsadi), ichida davomiylik va sifat; ostida uxlash/turish vaqti va "Batafsil" (uyqu sahifasi).
export function SleepHero({ night, goalMin, ready, syncing, onDetails }: Props) {
  const t = useT();
  const [now] = useState(Date.now);
  // Faqat yaqin kecha (bugun yoki kecha uyg'onilgan) "oxirgi uyqu" sifatida.
  const recent = night && night.key >= dateKey(now - 24 * 60 * 60 * 1000) ? night : null;
  const quality = recent ? qualityOf(recent, goalMin) : null;
  const pct = recent ? Math.round((recent.totalMin / Math.max(1, goalMin)) * 100) : 0;

  const order: SleepStage[] = ["deep", "light", "rem", "awake"];
  const minutes = (s: SleepStage) =>
    !recent ? 0 : s === "deep" ? recent.deepMin : s === "light" ? recent.lightMin : s === "rem" ? recent.remMin : recent.awakeMin;

  return (
    <View className="items-center gap-4">
      <View className="rounded-full bg-surface">
        <SleepRing
          total={goalMin}
          segments={order.map((s) => ({ value: minutes(s), color: STAGE_COLORS[s] }))}
          size={SIZE}
          stroke={STROKE}
          trackColor={withAlpha(SLEEP_COLOR, 0.2)}
        >
          <Octicons name="moon" size={22} color={SLEEP_COLOR} />
          <CusText className="font-bold" style={NUMBER_STYLE} numberOfLines={1} adjustsFontSizeToFit>
            {recent ? formatDuration(recent.totalMin, t) : "--"}
          </CusText>
          <CusText tone="muted" numberOfLines={1}>
            {t("sleep.goalPct", { goal: formatDuration(goalMin, t), pct })}
          </CusText>
          <CusText
            variant="caption"
            tone={quality ? QUALITY_TONE[quality] : "muted"}
            className="mt-2 px-10 text-center font-semibold"
            numberOfLines={2}
          >
            {quality
              ? t(`sleep.quality.${quality}`)
              : syncing
                ? t("sleep.sync.reading")
                : ready
                  ? t("sleep.hero.empty")
                  : t("sleep.hero.notConnected")}
          </CusText>
        </SleepRing>
      </View>

      <View className="flex-row items-stretch gap-3 px-4">
        <Stat icon="moon" label={t("sleep.fellAsleep")} value={recent ? clock(recent.down) : "--"} />
        <Stat icon="sun" label={t("sleep.wokeUp")} value={recent ? clock(recent.up) : "--"} />
        <Pressable
          accessibilityRole="button"
          onPress={onDetails}
          className="flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 active:bg-surface-alt"
        >
          <Octicons name="graph" size={16} color={SLEEP_COLOR} />
          <CusText variant="caption" className="font-semibold">
            {t("sleep.details")}
          </CusText>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: "moon" | "sun"; label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5 rounded-xl border border-border bg-surface px-3 py-2">
      <View className="flex-row items-center gap-1.5">
        <Octicons name={icon} size={12} color={SLEEP_COLOR} />
        <CusText variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </CusText>
      </View>
      <CusText className="font-bold" style={{ fontSize: 18 }} numberOfLines={1}>
        {value}
      </CusText>
    </View>
  );
}
