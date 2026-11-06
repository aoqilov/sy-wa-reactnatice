import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusImage, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { BatteryIndicator } from "./battery-indicator";
import { useWatchStatus } from "./use-watch-status";

const LOGO = require("../../../assets/images/logo.png");

// Hamma sahifada ko'rinadigan yuqori panel (bosilsa Watch sahifasi ochiladi):[logo  synapse-watch ........ soat modeli  batareya%]
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { model, battery } = useWatchStatus();
  const muted = useThemeColor("muted", "#6B7385");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Soat sahifasini ochish"
      onPress={() => router.push("/watch")}
      className="flex-row items-center justify-between border-b border-border bg-surface px-4 pb-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center gap-2">
        <CusImage source={LOGO} className="w-5 h-8 rounded-lg" />
        <CusText variant="heading">synapse-watch</CusText>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-row items-center gap-1">
          <Octicons name="clock" size={14} color={muted} />
          <CusText variant="caption" tone="muted">
            {model}
          </CusText>
        </View>
        <BatteryIndicator level={battery} />
      </View>
    </Pressable>
  );
}
