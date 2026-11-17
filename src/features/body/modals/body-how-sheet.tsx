import { View } from "react-native";

import { CusBottomSheet, CusCard, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";

type Section = { title: TranslationKey; body: TranslationKey };

const TOP: Section[] = [
  { title: "body.how.method.title", body: "body.how.method.body" },
  { title: "body.how.profile.title", body: "body.how.profile.body" },
];

const TERMS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "body.fatPct", body: "body.how.term.fat" },
  { title: "body.subFatPct", body: "body.how.term.subFat" },
  { title: "body.muscleKg", body: "body.how.term.muscle" },
  { title: "body.skeletalPct", body: "body.how.term.skeletal" },
  { title: "body.ffmKg", body: "body.how.term.ffm" },
  { title: "body.waterPct", body: "body.how.term.water" },
  { title: "body.proteinPct", body: "body.how.term.protein" },
  { title: "body.boneKg", body: "body.how.term.bone" },
  { title: "body.bmr", body: "body.how.term.bmr" },
  { title: "body.bmi", body: "body.how.term.bmi" },
];

const BOTTOM: Section[] = [
  { title: "body.how.accuracy.title", body: "body.how.accuracy.body" },
  { title: "body.how.tips.title", body: "body.how.tips.body" },
];

// Tana tarkibi qanday o'lchanadi va har bir ko'rsatkich nimani anglatadi. Natija kartasidagi "?" dan ochiladi.
export function BodyHowSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" closeButton title={t("body.how.title")}>
      <View className="gap-3">
        {TOP.map((s) => (
          <SectionCard key={s.title} section={s} />
        ))}

        <CusCard className="gap-3">
          <CusText variant="heading">{t("body.how.terms")}</CusText>
          {TERMS.map((term) => (
            <View key={term.title} className="gap-0.5">
              <CusText className="font-semibold">{t(term.title)}</CusText>
              <CusText variant="caption" tone="muted">
                {t(term.body)}
              </CusText>
            </View>
          ))}
        </CusCard>

        {BOTTOM.map((s) => (
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
      <CusText variant="heading">{t(section.title)}</CusText>
      <CusText>{t(section.body)}</CusText>
    </CusCard>
  );
}
