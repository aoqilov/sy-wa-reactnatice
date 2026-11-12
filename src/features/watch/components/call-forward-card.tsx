import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Alert, Linking, View } from "react-native";

import { CusCard, CusSwitch, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { setCallForwarding, useCallForward } from "@/shared/watch/call-forward";

// "Soat" sahifasi: telefonga kelgan qo'ng'iroqni soatda ko'rsatish (ism/raqam), soatdan rad etish va ovozsiz qilish.
// Kalit native qismda saqlanadi: ilova qayta ochilganda ham yoqiq qoladi.
export function CallForwardCard({ connected }: { connected: boolean }) {
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const { status, refresh, available } = useCallForward();
  const [busy, setBusy] = useState(false);

  if (!available) return null;

  const toggle = async (on: boolean) => {
    setBusy(true);
    const result = await setCallForwarding(on);
    setBusy(false);
    refresh();
    if (result.ok) return;
    if (result.reason === "blocked") {
      Alert.alert(t("watchInfo.calls.title"), t("watchInfo.calls.blocked"), [
        { text: t("watchConnect.cancel"), style: "cancel" },
        { text: t("watchInfo.calls.openSettings"), onPress: () => void Linking.openSettings() },
      ]);
    } else if (result.reason === "denied") {
      Alert.alert(t("watchInfo.calls.title"), t("watchInfo.calls.denied"));
    }
  };

  // Yoqiq, lekin ba'zi ixtiyoriy ruxsatlar yo'q: nimasi ishlamasligini aytamiz.
  const limits: string[] = [];
  if (status.enabled) {
    if (!status.phoneState) limits.push(t("watchInfo.calls.limit.phoneState"));
    if (!status.callLog) limits.push(t("watchInfo.calls.limit.callLog"));
    if (!status.contacts) limits.push(t("watchInfo.calls.limit.contacts"));
    if (!status.answerCalls) limits.push(t("watchInfo.calls.limit.answer"));
  }

  return (
    <CusCard className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
          <Octicons name="device-mobile" size={20} color={primary} />
        </View>
        <CusText variant="heading" className="flex-1">
          {t("watchInfo.calls.title")}
        </CusText>
        <CusSwitch value={status.enabled} onValueChange={(v) => void toggle(v)} disabled={busy} />
      </View>
      <CusText tone="muted">{t("watchInfo.calls.desc")}</CusText>

      {status.enabled && !connected ? (
        <CusText variant="caption" tone="warning">
          {t("watchInfo.calls.notConnected")}
        </CusText>
      ) : null}

      {limits.length > 0 ? (
        <View className="gap-1">
          {limits.map((line) => (
            <CusText key={line} variant="caption" tone="warning">
              • {line}
            </CusText>
          ))}
          <CusText variant="caption" tone="primary" onPress={() => void Linking.openSettings()}>
            {t("watchInfo.calls.openSettings")}
          </CusText>
        </View>
      ) : null}

      <CusText variant="caption" tone="muted">
        {t("watchInfo.calls.note")}
      </CusText>
    </CusCard>
  );
}
