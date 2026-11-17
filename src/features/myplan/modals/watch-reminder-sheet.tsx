import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusBottomSheet, CusButton, CusChip, CusSwitch, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { type EditTarget, HEALTH_LABEL } from "../components/watch-reminders-section";
import { hhmm } from "../lib/schedule";

const DAY = 1440;
const TIME_STEP = 30;
const INTERVALS = [30, 45, 60, 90, 120];

type Props = {
  target: EditTarget | null;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (t: EditTarget) => Promise<boolean>;
};

// Soatdagi bitta eslatmani tahrirlash: yoqish/o'chirish, vaqt oralig'i va necha daqiqada bir (puls ogohlantirishida —
// past va yuqori chegara). "Saqlash" soatga yozadi; saqlanmasa oyna ochiq qoladi.
export function WatchReminderSheet({ target, visible, saving, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<EditTarget | null>(target);
  if (!draft) return null;

  const title =
    draft.kind === "heart" ? "Puls ogohlantirishi" : draft.kind === "longSeat" ? HEALTH_LABEL.SEDENTARY : HEALTH_LABEL[draft.value.type];
  const on = draft.value.on;
  const setOn = (v: boolean) => setDraft({ ...draft, value: { ...draft.value, on: v } } as EditTarget);

  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" title={title}>
      <CusSwitch label="Yoqilgan" value={on} onValueChange={setOn} />

      {draft.kind === "heart" ? (
        <>
          <Stepper
            label="Past chegara (zarb/daq)"
            value={draft.value.low}
            step={5}
            min={30}
            max={Math.min(100, draft.value.high - 10)}
            format={String}
            onChange={(low) => setDraft({ kind: "heart", value: { ...draft.value, low } })}
          />
          <Stepper
            label="Yuqori chegara (zarb/daq)"
            value={draft.value.high}
            step={5}
            min={Math.max(80, draft.value.low + 10)}
            max={220}
            format={String}
            onChange={(high) => setDraft({ kind: "heart", value: { ...draft.value, high } })}
          />
          <CusText variant="caption" tone="muted">
            Puls shu chegaralardan chiqsa, soat tebranib ogohlantiradi.
          </CusText>
        </>
      ) : (
        <>
          <View className="gap-2">
            <CusText variant="heading">{draft.kind === "longSeat" ? "Necha daqiqa harakatsizlikdan keyin?" : "Necha daqiqada bir?"}</CusText>
            <View className="flex-row flex-wrap gap-2">
              {INTERVALS.map((m) => {
                const current = draft.kind === "longSeat" ? draft.value.threshold : draft.value.interval;
                return (
                  <CusChip
                    key={m}
                    label={`${m} daqiqa`}
                    selected={current === m}
                    onPress={() =>
                      setDraft(
                        draft.kind === "longSeat"
                          ? { kind: "longSeat", value: { ...draft.value, threshold: m } }
                          : { kind: "health", value: { ...draft.value, interval: m } },
                      )
                    }
                  />
                );
              })}
            </View>
          </View>
          <Stepper
            label="Boshlanishi"
            value={draft.value.start}
            step={TIME_STEP}
            min={0}
            max={draft.value.end - TIME_STEP}
            format={hhmm}
            onChange={(start) => setDraft({ ...draft, value: { ...draft.value, start } } as EditTarget)}
          />
          <Stepper
            label="Tugashi"
            value={draft.value.end}
            step={TIME_STEP}
            min={draft.value.start + TIME_STEP}
            max={DAY - 1}
            format={hhmm}
            onChange={(end) => setDraft({ ...draft, value: { ...draft.value, end } } as EditTarget)}
          />
          <CusText variant="caption" tone="muted">
            Soat faqat shu vaqt oralig&apos;ida eslatadi.
          </CusText>
        </>
      )}

      <CusButton
        title="Soatga saqlash"
        loading={saving}
        onPress={async () => {
          if (await onSave(draft)) onClose();
        }}
      />
    </CusBottomSheet>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  format,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const border = useThemeColor("border", "#E5E8EE");
  const btn = (dir: 1 | -1) => {
    const next = Math.max(min, Math.min(max, value + dir * step));
    const enabled = next !== value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${dir > 0 ? "oshirish" : "kamaytirish"}`}
        disabled={!enabled}
        onPress={() => onChange(next)}
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft"
      >
        <Octicons name={dir > 0 ? "plus" : "dash"} size={18} color={enabled ? primary : border} />
      </Pressable>
    );
  };
  return (
    <View className="flex-row items-center justify-between gap-3">
      <CusText className="flex-1">{label}</CusText>
      <View className="flex-row items-center gap-3">
        {btn(-1)}
        <CusText className="text-xl font-bold" style={{ minWidth: 64, textAlign: "center" }}>
          {format(value)}
        </CusText>
        {btn(1)}
      </View>
    </View>
  );
}
