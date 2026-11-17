import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusBottomSheet, CusCard, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";

import type { SleepStage } from "../api/sleep";
import { SLEEP_COLOR, STAGE_COLORS, withAlpha } from "../lib/colors";

type Props = { visible: boolean; onClose: () => void };

type Section = { icon: "pulse" | "heart" | "clock" | "alert" | "light-bulb"; title: TranslationKey; body: TranslationKey };

// Uyqu qanday hisoblanadi: soatning qaysi sensorlari, qaysi vaqt oralig'i, bosqichlar nimani anglatadi, aniqlik
// cheklovlari va maslahatlar. Home'dagi uyqu halqasi ochiq turganda chap yuqoridagi "?" tugmasidan ochiladi.
const SECTIONS_TOP: Section[] = [
  { icon: "pulse", title: "sleep.how.motion.title", body: "sleep.how.motion.body" },
  { icon: "heart", title: "sleep.how.pulse.title", body: "sleep.how.pulse.body" },
  { icon: "clock", title: "sleep.how.window.title", body: "sleep.how.window.body" },
];

const SECTIONS_BOTTOM: Section[] = [
  { icon: "alert", title: "sleep.how.accuracy.title", body: "sleep.how.accuracy.body" },
  { icon: "light-bulb", title: "sleep.how.tips.title", body: "sleep.how.tips.body" },
];

const STAGES: { stage: SleepStage; body: TranslationKey }[] = [
  { stage: "deep", body: "sleep.how.stage.deep" },
  { stage: "light", body: "sleep.how.stage.light" },
  { stage: "rem", body: "sleep.how.stage.rem" },
  { stage: "awake", body: "sleep.how.stage.awake" },
];

export function SleepHowSheet({ visible, onClose }: Props) {
  const t = useT();
  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" closeButton title={t("sleep.how.title")}>
      <View className="gap-3">
        <CusText tone="muted">{t("sleep.how.intro")}</CusText>

        {SECTIONS_TOP.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}

        <CusCard className="gap-3">
          <CusText variant="heading">{t("sleep.how.stages.title")}</CusText>
          {STAGES.map(({ stage, body }) => (
            <View key={stage} className="flex-row gap-3">
              <View className="mt-1 h-3 w-3 rounded-sm" style={{ backgroundColor: STAGE_COLORS[stage] }} />
              <View className="flex-1">
                <CusText className="font-semibold">{t(`sleep.stage.${stage}`)}</CusText>
                <CusText variant="caption" tone="muted">
                  {t(body)}
                </CusText>
              </View>
            </View>
          ))}
        </CusCard>

        {SECTIONS_BOTTOM.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}
      </View>
    </CusBottomSheet>
  );
}

function SectionCard({ section }: { section: Section }) {
  const t = useT();
  return (
    <CusCard className="gap-2">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: withAlpha(SLEEP_COLOR, 0.18) }}>
          <Octicons name={section.icon} size={16} color={SLEEP_COLOR} />
        </View>
        <CusText variant="heading" className="flex-1">
          {t(section.title)}
        </CusText>
      </View>
      <CusText>{t(section.body)}</CusText>
    </CusCard>
  );
}
