import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Modal, View } from "react-native";

import { CusButton, CusImage, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { type InstallStage, installDial, type MarketDial } from "../api/dials";

/** Hujjat: past batareyada uzatish boshlansa, soat o'chib qolishi mumkin. */
const MIN_BATTERY = 30;

const STAGE_TEXT: Record<InstallStage, string> = {
  download: "Yuklab olinmoqda",
  prepare: "Soat tayyorlanmoqda",
  clear: "Soat xotirasi tozalanmoqda",
  transfer: "Soatga yozilmoqda",
};

const ERROR_TEXT: Record<string, string> = {
  NOT_READY: "Soat ulanmagan.",
  OUTDATED: "Siferblatlar uchun ilovani yangilang.",
  BUSY: "Soat hozir band (o'lchov ketyapti). Tugagach qayta urinib ko'ring.",
  LOST: "Soat bilan aloqa uzildi. Soatni telefonga yaqin tutib, qayta urinib ko'ring.",
  NO_REPLY: "Soat javob bermadi. Qayta urinib ko'ring.",
  DOWNLOAD: "Siferblat faylini yuklab bo'lmadi. Internetni tekshiring.",
  LOW_BATTERY: "Soat batareyasi past. Zaryadlab, qayta urinib ko'ring.",
  JL_PREPARE: "Soatni uzatishga tayyorlab bo'lmadi. Qayta urinib ko'ring.",
  INTO_UPDATE_MODE_FAIL: "Soat uzatish rejimiga o'tmadi. Qayta urinib ko'ring.",
  CHECK_CRC_FAIL: "Fayl soatga buzilib yetib bordi. Qayta urinib ko'ring.",
  VERSION_MISMATCH: "Bu siferblat soatingiz dasturiga mos emas. Boshqa siferblatni tanlang.",
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
      const base = ERROR_TEXT[result.error] ?? "Siferblatni o'rnatib bo'lmadi. Qayta urinib ko'ring.";
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
                Siferblat o&apos;rnatildi
              </CusText>
            </View>
          ) : phase.name === "error" ? (
            <View className="items-center gap-2">
              <Octicons name="x-circle-fill" size={28} color={danger} />
              <CusText className="text-center">{phase.text}</CusText>
            </View>
          ) : (
            <CusText tone="muted" className="text-center">
              Siferblatni soatga uzatish taxminan 2 daqiqa davom etadi. Telefonni soatga yaqin tuting va ilovani yopmang.
            </CusText>
          )}

          {running ? (
            <View className="w-full gap-2">
              <View className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
                <View className="h-full rounded-full bg-primary" style={{ width: `${phase.percent}%` }} />
              </View>
              <CusText variant="caption" tone="muted" className="text-center">
                {STAGE_TEXT[phase.stage]}… {phase.percent}%
              </CusText>
            </View>
          ) : null}

          {phase.name === "confirm" ? (
            <View className="w-full gap-2">
              {lowBattery ? (
                <CusText variant="caption" tone="danger" className="text-center">
                  Soat batareyasi {battery}%. O&apos;rnatish uchun kamida {MIN_BATTERY}% kerak.
                </CusText>
              ) : null}
              <CusButton title="O'rnatish" disabled={lowBattery} onPress={() => void start()} />
              <CusButton title="Bekor qilish" variant="ghost" size="sm" onPress={onClose} />
            </View>
          ) : null}

          {phase.name === "done" || phase.name === "error" ? (
            <CusButton title="Yopish" className="w-full" onPress={onClose} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
