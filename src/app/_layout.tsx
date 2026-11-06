import "../../global.css";

import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { View } from "react-native";

import { ProfileProvider, useProfile } from "@/features/profile";
import { loadSettings, useSettingsLoaded } from "@/shared/settings/settings";

// Saqlangan profil va sozlamalar (til, o'lcham, mavzu) o'qilguncha splash ekran turadi
// (aks holda bir lahza /login yoki eski mavzu yaltirab ketardi).
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { profile, loading: profileLoading } = useProfile();
  const settingsLoaded = useSettingsLoaded();
  const hasProfile = profile !== null;
  const ready = !profileLoading && settingsLoaded;

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Web'da splash yo'q, shuning uchun o'qish tugaguncha bo'sh fon ko'rsatamiz.
  if (!ready) return <View className="flex-1 bg-background" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Profil bor — asosiy ilova. Profil o'chsa (Log out) foydalanuvchi o'zi /login'ga tushadi. */}
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Profil yo'q — faqat /login. Saqlangach avtomatik asosiy ilovaga o'tadi. */}
      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <ProfileProvider>
      <View className="flex-1 bg-background">
        <StatusBar animated style={colorScheme === "dark" ? "light" : "dark"} />
        <RootNavigator />
      </View>
    </ProfileProvider>
  );
}
