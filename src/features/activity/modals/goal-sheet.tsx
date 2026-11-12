import { useState } from "react";
import { View } from "react-native";

import { CusBottomSheet, CusButton, CusChip, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import { type ActivityGoals, STEP_GOAL_PRESETS } from "../api/activity";
import { formatInt } from "../lib/format";

const SLEEP_PRESETS_H = [6, 7, 8, 9];

type Props = {
  visible: boolean;
  goals: ActivityGoals;
  onClose: () => void;
  onSave: (goals: ActivityGoals) => void;
};

// Kunlik maqsadlar: qadam va uyqu. Saqlanganda soatga ham yuboriladi (useWatchPersonSync), soatdagi halqa ham shunga.
export function GoalSheet({ visible, goals, onClose, onSave }: Props) {
  const t = useT();
  const [steps, setSteps] = useState(goals.steps);
  const [sleepMin, setSleepMin] = useState(goals.sleepMin);

  return (
    <CusBottomSheet visible={visible} onClose={onClose} title={t("activity.goal.title")}>
      <View className="gap-5">
        <View className="gap-2">
          <CusText variant="heading">{t("activity.goal.steps")}</CusText>
          <View className="flex-row flex-wrap gap-2">
            {STEP_GOAL_PRESETS.map((v) => (
              <CusChip key={v} label={formatInt(v)} selected={steps === v} onPress={() => setSteps(v)} />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <CusText variant="heading">{t("activity.goal.sleep")}</CusText>
          <View className="flex-row flex-wrap gap-2">
            {SLEEP_PRESETS_H.map((h) => (
              <CusChip
                key={h}
                label={t("activity.hours", { h })}
                selected={sleepMin === h * 60}
                onPress={() => setSleepMin(h * 60)}
              />
            ))}
          </View>
        </View>

        <CusText variant="caption" tone="muted">
          {t("activity.goal.note")}
        </CusText>

        <CusButton
          title={t("activity.goal.save")}
          onPress={() => {
            onSave({ steps, sleepMin });
            onClose();
          }}
        />
      </View>
    </CusBottomSheet>
  );
}
