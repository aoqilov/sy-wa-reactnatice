import { useState } from "react";
import { View } from "react-native";

import { CusHealthCard, CusHealthValue, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

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

const QUALITY_TONE = { good: "success", fair: "warning", poor: "danger" } as const;

// Home'dagi "Uyqu" kartasi (CusHealthCard uslubida): oxirgi kechaning davomiyligi, bosqichlar chizig'i, vaqti va sifati.
// Bosilsa tepada o'lchash doirasi o'rnida katta uyqu halqasi chiqadi (SleepHero).
export function SleepCard({ night, goalMin, width, active, disabled = false, onSelect }: Props) {
  const t = useT();
  // Faqat yaqin kecha (bugun yoki kecha uyg'onilgan) "oxirgi uyqu" sifatida ko'rsatiladi.
  const [now] = useState(Date.now);
  const yesterday = dateKey(now - 24 * 60 * 60 * 1000);
  const recent = night && night.key >= yesterday ? night : null;
  const quality = recent ? qualityOf(recent, goalMin) : null;
  const total = recent ? recent.deepMin + recent.lightMin + recent.remMin + recent.awakeMin : 0;

  return (
    <CusHealthCard
      width={width}
      color={SLEEP_COLOR}
      icon="moon"
      title={t("sleep.title")}
      active={active}
      disabled={disabled}
      onPress={onSelect}
      illustrated={!recent}
    >
      {recent ? (
        <>
          <CusHealthValue value={formatDuration(recent.totalMin, t)} />
          <View className="flex-1 justify-center gap-1">
            {/* Bosqichlar ulushi bitta chiziqda */}
            <View className="h-1.5 flex-row overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.2) }}>
              {total > 0
                ? (["deep", "light", "rem", "awake"] as const).map((s) => {
                    const min = s === "deep" ? recent.deepMin : s === "light" ? recent.lightMin : s === "rem" ? recent.remMin : recent.awakeMin;
                    return min > 0 ? <View key={s} style={{ flex: min, backgroundColor: STAGE_COLORS[s] }} /> : null;
                  })
                : null}
            </View>
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <CusText variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {`${clock(recent.down)} → ${clock(recent.up)}`}
            </CusText>
            {quality ? (
              <CusText variant="caption" tone={QUALITY_TONE[quality]} className="font-semibold" numberOfLines={1}>
                {t(`sleep.quality.${quality}`)}
              </CusText>
            ) : null}
          </View>
        </>
      ) : (
        <CusText variant="caption" tone="muted" numberOfLines={3} style={{ paddingRight: 24 }}>
          {t("sleep.lastNight")} · {t("activity.noData")}
        </CusText>
      )}
    </CusHealthCard>
  );
}
