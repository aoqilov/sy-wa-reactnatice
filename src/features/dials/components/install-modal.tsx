import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Modal, View } from "react-native";

import { CusButton, CusImage, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { type InstallStage, installDial, type MarketDial } from "../api/dials";

/** Hujjat: past batareyada uzatish boshlansa, soat o'chib qolishi mumkin. */
const MIN_BATTERY = 30;

const STAGE_TEXT: Record<InstallStage, TranslationKey> = {
  download: "dials.stage.download",
  prepare: "dials.stage.prepare",
  clear: "dials.stage.clear",
  transfer: "dials.stage.transfer",
};

const ERROR_TEXT: Record<string, TranslationKey> = {
  NOT_READY: "dials.err.NOT_READY",
  OUTDATED: "dials.fail.outdated",
  BUSY: "dials.fail.busy",
  LOST: "dials.err.LOST",
  NO_REPLY: "dials.fail.noReply",
  DOWNLOAD: "dials.err.DOWNLOAD",
  LOW_BATTERY: "dials.err.LOW_BATTERY",
  JL_PREPARE: "dials.err.JL_PREPARE",
  INTO_UPDATE_MODE_FAIL: "dials.err.INTO_UPDATE_MODE_FAIL",
  CHECK_CRC_FAIL: "dials.err.CHECK_CRC_FAIL",
  VERSION_MISMATCH: "dials.err.VERSION_MISMATCH",
};

/** Bu xatolarda texnik tafsilot (kod) ko'rsatilmaydi: matnning o'zi yetarli. */
const PLAIN_ERRORS = new Set(["VERSION_MISMATCH"]);

type Phase =
  | { name: "confirm" }
  | { name: "running"; stage: InstallStage; percent: number }
  | { name: "done" }
  | { name: "error"; text: string };

type Props = {
  dial: MarketDial | null;
  battery: number | null;
  onClose: () => void;
  onInstalled: (dial: MarketDial) => void;
  /** Soat faylni "mos emas" deb rad etdi: ro'yxatdan yashirish uchun. */
  onIncompatible: (dial: MarketDial) => void;
};

// O'rnatish oynasi (markazda): preview, "~2 daqiqa" ogohlantirishi, bosqich va foiz chizig'i. Uzatish paytida yopilmaydi.
// Ota komponent har yangi siferblat uchun `key` ni o'zgartiradi: holat har safar boshidan.
export function InstallModal({ dial, battery, onClose, onInstalled, onIncompatible }: Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ name: "confirm" });
  const success = useThemeColor("success", "#17A34A");
  const danger = useThemeColor("danger", "#E0342F");

  if (!dial) return null;
  const lowBattery = battery !== null && battery < MIN_BATTERY;
  const running = phase.name === "running";

  const start = async () => {
    setPhase({ name: "running", stage: "download", percent: 0 });
    const result = await installDial(dial, (stage, percent) => setPhase({ name: "running", stage, percent }));
    if (result.ok) {
      setPhase({ name: "done" });
      onInstalled(dial);
    } else {
      const base = t(ERROR_TEXT[result.error] ?? "dials.err.generic");
      const detail = result.message && !PLAIN_ERRORS.has(result.error);
      setPhase({ name: "error", text: detail ? `${base}\n(${result.error}: ${result.message})` : base });
      if (result.error === "VERSION_MISMATCH") onIncompatible(dial);
    }
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={running ? () => {} : onClose}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View className="w-full max-w-sm items-center gap-4 rounded-3xl bg-surface p-5">
          <CusImage source={{ uri: dial.previewUrl }} style={{ width: 132, aspectRatio: 0.82, borderRadius: 16 }} />

          {phase.name === "done" ? (
            <View className="items-center gap-2">
              <Octicons name="check-circle-fill" size={28} color={success} />
              <CusText variant="heading" className="text-center">
                {t("dials.done")}
              </CusText>
            </View>
          ) : phase.name === "error" ? (
            <View className="items-center gap-2">
              <Octicons name="x-circle-fill" size={28} color={danger} />
              <CusText className="text-center">{phase.text}</CusText>
            </View>
          ) : (
            <CusText tone="muted" className="text-center">
              {t("dials.warn")}
            </CusText>
          )}

          {running ? (
            <View className="w-full gap-2">
              <View className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
                <View className="h-full rounded-full bg-primary" style={{ width: `${phase.percent}%` }} />
              </View>
              <CusText variant="caption" tone="muted" className="text-center">
                {t(STAGE_TEXT[phase.stage])}… {phase.percent}%
              </CusText>
            </View>
          ) : null}

          {phase.name === "confirm" ? (
            <View className="w-full gap-2">
              {lowBattery ? (
                <CusText variant="caption" tone="danger" className="text-center">
                  {t("dials.lowBattery", { v: battery ?? 0, min: MIN_BATTERY })}
                </CusText>
              ) : null}
              <CusButton title={t("dials.install")} disabled={lowBattery} onPress={() => void start()} />
              <CusButton title={t("dials.cancel")} variant="ghost" size="sm" onPress={onClose} />
            </View>
          ) : null}

          {phase.name === "done" || phase.name === "error" ? (
            <CusButton title={t("dials.close")} className="w-full" onPress={onClose} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
