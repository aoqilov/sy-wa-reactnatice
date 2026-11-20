import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import {
  dateKey,
  qualityOf,
  type SleepNight,
  type SleepStage,
} from "../api/sleep";
import { SLEEP_COLOR, STAGE_COLORS, withAlpha } from "../lib/colors";
import { clock, formatDuration } from "../lib/format";
import { SleepHowSheet } from "../modals/sleep-how-sheet";

type Props = {
  night: SleepNight | null;
  goalMin: number;
  ready: boolean;
  syncing: boolean;
  width: number;
  /** Bosilganda: uyqu tarixi (/history/sleep). */
  onPress: () => void;
};

const STAGES: SleepStage[] = ["deep", "light", "rem", "awake"];
const QUALITY_TONE = {
  good: "success",
  fair: "warning",
  poor: "danger",
} as const;
/** Qadamlar slaydi bilan taxminan bir xil balandlik (halqa 120 + padding). Slayder qatori baribir eng balandiga tenglashadi. */
const MIN_HEIGHT = 152;

const hm = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

// Home slayderidagi "Uyqu": oxirgi kechaning davomiyligi, yotish → turish vaqti, sifat, bosqichlar chizig'i va har
// bosqich daqiqasi. "?" — soat uyquni qanday hisoblashi. Ichki sahifa yo'q: bosilsa uyqu tarixi ochiladi.
export function SleepSlide({
  night,
  goalMin,
  ready,
  syncing,
  width,
  onPress,
}: Props) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const [howOpen, setHowOpen] = useState(false);
  // Faqat yaqin kecha (bugun yoki kecha uyg'onilgan) "oxirgi uyqu" sifatida.
  const [now] = useState(Date.now);
  const recent =
    night && night.key >= dateKey(now - 24 * 60 * 60 * 1000) ? night : null;
  const quality = recent ? qualityOf(recent, goalMin) : null;

  const minutes = (s: SleepStage) =>
    !recent
      ? 0
      : s === "deep"
        ? recent.deepMin
        : s === "light"
          ? recent.lightMin
          : s === "rem"
            ? recent.remMin
            : recent.awakeMin;
  const total = STAGES.reduce((sum, s) => sum + minutes(s), 0);

  // "?" tugmasi va oyna slayd tugmasidan tashqarida (ustida, absolute): web'da <button> ichida <button> bo'lishi
  // mumkin emas. Sarlavha qatorida uning o'rni bo'sh qoldiriladi.
  return (
    <View style={{ width, minHeight: MIN_HEIGHT }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("sleep.title")}
        onPress={onPress}
        className="grow gap-2 rounded-2xl border border-border bg-surface p-4 active:bg-surface-alt"
      >
        <View className="flex-row items-center gap-2">
          <Octicons name="moon" size={20} color={SLEEP_COLOR} />
          <CusText className="flex-1 text-xl font-bold" numberOfLines={1}>
            {t("sleep.title")}
          </CusText>
          {quality ? (
            <View
              className="rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.12) }}
            >
              <CusText tone={QUALITY_TONE[quality]} className="font-semibold">
                {t(`sleep.quality.${quality}`)}
              </CusText>
            </View>
          ) : null}
          <View className="h-9 w-9" />
        </View>

        {recent ? (
          <>
            <View>
              <CusText
                className="text-3xl font-bold"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ flexShrink: 1 }}
              >
                {formatDuration(recent.totalMin, t)}
              </CusText>
              <CusText className="text-lg" tone="muted" numberOfLines={1}>
                {`${clock(recent.down)} → ${clock(recent.up)}`}
              </CusText>
            </View>

            {/* Bosqichlar ulushi bitta chiziqda */}
            <View
              className="h-3 flex-row overflow-hidden rounded-full"
              style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.15) }}
            >
              {total > 0
                ? STAGES.map((s) =>
                    minutes(s) > 0 ? (
                      <View
                        key={s}
                        style={{
                          flex: minutes(s),
                          backgroundColor: STAGE_COLORS[s],
                        }}
                      />
                    ) : null,
                  )
                : null}
            </View>

            <View className="flex-row flex-wrap" style={{ rowGap: 6 }}>
              {STAGES.map((s) => (
                <View key={s} className="w-1/2 flex-row items-center gap-2">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[s] }}
                  />
                  <CusText
                    tone="muted"
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                  >
                    {t(`sleep.stage.${s}`)}
                  </CusText>
                  <CusText className="font-bold">{hm(minutes(s))}</CusText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View className="flex-1 justify-center">
            <CusText className="text-lg" tone="muted">
              {syncing
                ? t("sleep.sync.reading")
                : ready
                  ? t("sleep.hero.empty")
                  : t("sleep.hero.notConnected")}
            </CusText>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("sleep.how.title")}
        onPress={() => setHowOpen(true)}
        hitSlop={10}
        className="absolute h-9 w-9 items-center justify-center rounded-full bg-surface-alt"
        style={{ top: 16, right: 16 }}
      >
        <Octicons name="question" size={16} color={muted} />
      </Pressable>

      <SleepHowSheet visible={howOpen} onClose={() => setHowOpen(false)} />
    </View>
  );
}
