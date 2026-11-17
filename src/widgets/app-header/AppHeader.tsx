import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusImage, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { BatteryIndicator } from "./battery-indicator";
import { useWatchStatus } from "./use-watch-status";

const LOGO = require("../../../assets/images/logo.png");

// Hamma sahifada ko'rinadigan yuqori panel (bosilsa Watch sahifasi ochiladi):[logo  synapse-watch ........ soat modeli  batareya%]
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { connected, connecting, model, battery } = useWatchStatus();
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const danger = useThemeColor("danger", "#D92D20");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Soat sahifasini ochish"
      // `navigate`: tab'lar orasida o'tadi (push kabi ustiga yangi nusxa qo'shmaydi)
      onPress={() => router.navigate("/watch")}
      className="flex-row items-center justify-between border-b border-border bg-surface px-4 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center gap-2">
        <CusImage source={LOGO} contentFit="contain" className="h-8 w-[22px]" />
        <CusText variant="heading">synapse-watch</CusText>
      </View>

      {connected ? (
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Octicons name="clock" size={14} color={muted} />
            <CusText variant="caption" tone="muted">
              {model ?? t("watch.fallbackName")}
            </CusText>
          </View>
          {battery !== null ? <BatteryIndicator level={battery} /> : null}
        </View>
      ) : (
        <View className="flex-row items-center gap-1">
          <Octicons name="alert" size={14} color={connecting ? muted : danger} />
          <CusText variant="caption" tone={connecting ? "muted" : "danger"}>
            {connecting ? t("watch.connecting") : t("watch.notConnected")}
          </CusText>
        </View>
      )}
    </Pressable>
  );
}
