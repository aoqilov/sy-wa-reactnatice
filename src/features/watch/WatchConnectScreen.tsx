import Octicons from "@expo/vector-icons/Octicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusButton, CusCard, CusListItem, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { type LastWatch, loadLastWatch } from "@/shared/watch/last-watch";
import { rememberWatchName, useWatchConnection } from "@/shared/watch/watch-connection";
import { useWatchLog } from "@/shared/watch/watch-log";
import { type ScanProblem, useWatchScanner } from "@/shared/watch/use-watch-scanner";

const LOG_SHOWN = 60; // ulanish ekranida jurnalning oxirgi qatorlari (to'liq jurnal `/watch` panelida)

const PROBLEM_TEXT = {
  permission: "watchConnect.problem.permission",
  permissionBlocked: "watchConnect.problem.permissionBlocked",
  bluetoothOff: "watchConnect.problem.bluetoothOff",
  error: "watchConnect.problem.error",
} as const satisfies Record<ScanProblem, string>;

// Soat ulanmaguncha butun ilovani to'sib turadigan to'liq ekranli sahifa (widgets/watch-gate).
// Soatni Bluetooth orqali topib ulaydi.
export function WatchConnectScreen({ onDevSkip }: { onDevSkip?: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { status, message, reason } = useWatchConnection();
  const scanner = useWatchScanner();
  const log = useWatchLog();
  const [showLog, setShowLog] = useState(false);
  const [last, setLast] = useState<LastWatch | null>(null);
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");

  useEffect(() => {
    loadLastWatch().then(setLast);
  }, []);

  const connecting = status === "connecting";
  const unavailable = status === "unavailable";
  // Bluetooth o'chiq/o'chirilgan — xato emas: qizil o'rniga oddiy matn va "Bluetooth'ni yoqish" tugmasi.
  const bluetoothOff = reason === "bluetoothOff" || scanner.problem === "bluetoothOff";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="items-center gap-3 px-6"
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
        {connecting ? <ActivityIndicator color={primary} /> : <Octicons name="clock" size={36} color={primary} />}
      </View>

      <CusText variant="title" className="text-center">
        {t("watchConnect.title")}
      </CusText>
      <CusText tone="muted" className="text-center">
        {t("watchConnect.subtitle")}
      </CusText>

      {unavailable ? (
        <View className="mt-4 w-full gap-3">
          <CusText tone="danger" className="text-center">
            {t("watchConnect.unavailable")}
          </CusText>
          {/* Faqat dev'da (Expo Go'da modul yo'q): UI ustida ishlash uchun. Release'da bu tugma yo'q. */}
          {__DEV__ && onDevSkip ? (
            <CusButton title={t("watchConnect.devSkip")} variant="outline" onPress={onDevSkip} />
          ) : null}
        </View>
      ) : connecting ? (
        <View className="mt-4 w-full gap-3">
          <CusText className="text-center font-semibold">{t("watchConnect.connecting")}</CusText>
          <CusText tone="muted" className="text-center">
            {t("watchConnect.confirmOnWatch")}
          </CusText>
          <CusButton title={t("watchConnect.cancel")} variant="outline" onPress={scanner.cancelConnect} />
        </View>
      ) : (
        <View className="mt-2 w-full gap-3">
          <CusText variant="caption" tone="muted" className="text-center">
            {t("watchConnect.hint")}
          </CusText>

          {bluetoothOff ? (
            <View className="gap-2">
              <CusText tone="muted" className="text-center">
                {reason === "bluetoothOff" && scanner.problem !== "bluetoothOff"
                  ? t("watchConnect.bluetoothTurnedOff")
                  : t("watchConnect.problem.bluetoothOff")}
              </CusText>
              <CusButton
                title={t("watchConnect.enableBluetooth")}
                variant="outline"
                size="sm"
                onPress={scanner.enableBluetooth}
              />
            </View>
          ) : message ? (
            // Oxirgi ulanish xato bilan tugagan (masalan parol noto'g'ri): sababi native qatlamdan
            <CusText tone="danger" className="text-center">
              {message}
            </CusText>
          ) : null}

          {scanner.problem && scanner.problem !== "bluetoothOff" ? (
            <View className="gap-2">
              <CusText tone="danger" className="text-center">
                {t(PROBLEM_TEXT[scanner.problem])}
              </CusText>
              {scanner.problem === "permissionBlocked" ? (
                <CusButton
                  title={t("watchConnect.openSettings")}
                  variant="outline"
                  size="sm"
                  onPress={() => Linking.openSettings()}
                />
              ) : null}
            </View>
          ) : null}

          {last ? (
            <CusButton
              title={t("watchConnect.reconnect", { name: last.name ?? t("watch.fallbackName") })}
              variant="outline"
              onPress={() => {
                rememberWatchName(last.id, last.name); // skan qilmaganimiz uchun nomini o'zimiz beramiz
                scanner.connect(last.id);
              }}
            />
          ) : null}

          <CusButton
            title={scanner.scanning ? t("watchConnect.scanning") : t("watchConnect.scan")}
            loading={scanner.scanning}
            onPress={scanner.start}
          />
          {scanner.scanning ? (
            <CusButton title={t("watchConnect.stop")} variant="ghost" size="sm" onPress={scanner.stop} />
          ) : null}

          {scanner.devices.length > 0 ? (
            <View className="mt-2 gap-2">
              <CusText variant="heading">{t("watchConnect.found")}</CusText>
              <CusCard className="p-0">
                {scanner.devices.map((device, index) => (
                  <View key={device.id} className={index > 0 ? "border-t border-border" : ""}>
                    <CusListItem
                      title={device.name}
                      subtitle={`${device.id} · ${device.rssi} dBm`}
                      left={<Octicons name="clock" size={18} color={muted} />}
                      right={<Octicons name="chevron-right" size={18} color={muted} />}
                      onPress={() => scanner.connect(device.id)}
                    />
                  </View>
                ))}
              </CusCard>
            </View>
          ) : scanner.searched && !scanner.scanning && !scanner.problem ? (
            <CusText tone="muted" className="text-center">
              {t("watchConnect.nothingFound")}
            </CusText>
          ) : null}
        </View>
      )}

      {/* Diagnostika: soat ulanmagan paytda header (va `/watch` jurnali) to'siq ostida qoladi, shuning uchun jurnal shu yerda */}
      <View className="mt-4 w-full gap-1">
        <CusButton
          title={showLog ? t("watchConnect.hideLog") : t("watchConnect.showLog")}
          variant="ghost"
          size="sm"
          onPress={() => setShowLog((v) => !v)}
        />
        {showLog
          ? log.slice(0, LOG_SHOWN).map((line, i) => (
              <CusText key={`${i}-${line.slice(0, 12)}`} variant="caption" tone="muted" selectable>
                {line}
              </CusText>
            ))
          : null}
      </View>
    </ScrollView>
  );
}
