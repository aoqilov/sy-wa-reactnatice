import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { startRoutineRunner } from "@/features/myplan/lib/routine-runner";
import { AppHeader } from "@/widgets/app-header/AppHeader";
import { AppTabs } from "@/widgets/app-tabs/AppTabs";
import { WatchGate } from "@/widgets/watch-gate/WatchGate";

// Asosiy ilova (header + tab bar). Faqat profil to'ldirilgandan keyin ochiladi — root layout himoyalaydi.
// Soat ulanmaguncha hammasini WatchGate (to'liq ekranli "Soatni ulang") to'sib turadi.
export default function AppLayout() {
  const insets = useSafeAreaInsets();

  // Rejam → Rutinalar: jadval bo'yicha o'lchashni so'rab turadi (ilova ochiq va soat ulangan bo'lganda).
  useEffect(() => startRoutineRunner(), []);

  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <AppTabs />

      {/* Pastki safe area: tepadagi header kabi `surface` rangda (tab bar bu chiziq ustida suzib turadi) */}
      <View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0 border-t border-border bg-surface"
        style={{ height: insets.bottom }}
      />

      {/* Eng oxirgi bola: hamma narsa (header, tab bar, pastki chiziq) ustida turadi */}
      <WatchGate />
    </View>
  );
}
