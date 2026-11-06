import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/widgets/app-header/AppHeader";
import { AppTabs } from "@/widgets/app-tabs/AppTabs";

// Asosiy ilova (header + tab bar). Faqat profil to'ldirilgandan keyin ochiladi — root layout himoyalaydi.
export default function AppLayout() {
  const insets = useSafeAreaInsets();

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
    </View>
  );
}
