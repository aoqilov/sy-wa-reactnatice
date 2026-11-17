import "../../global.css";

import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { ProfileProvider, useProfile } from "@/features/profile";
import { loadSettings, useSettingsLoaded } from "@/shared/settings/settings";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { AppSplash } from "@/widgets/app-splash/AppSplash";

// Saqlangan profil va sozlamalar (til, o'lcham, mavzu) o'qilguncha splash ekran turadi
// (aks holda bir lahza /login yoki eski mavzu yaltirab ketardi).
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { profile, loading: profileLoading } = useProfile();
  const settingsLoaded = useSettingsLoaded();
  const hasProfile = profile !== null;
  const ready = !profileLoading && settingsLoaded;
  const navigator = <Navigator hasProfile={hasProfile} />;

  useEffect(() => {
    loadSettings();
  }, []);

  // Animatsiyali splash (AppSplash) native splash'ni o'zi yopadi va ilova tayyor bo'lgach (kamida ~3 s) so'nadi.
  const [splashVisible, setSplashVisible] = useState(true);
  const hideSplash = useCallback(() => setSplashVisible(false), []);
  const splash = splashVisible ? <AppSplash ready={ready} onDone={hideSplash} /> : null;

  // O'qish tugaguncha ostida bo'sh fon turadi.
  if (!ready) {
    return (
      <View className="flex-1 bg-background">
        {splash}
      </View>
    );
  }

  return (
    <View className="flex-1">
      {navigator}
      {splash}
    </View>
  );
}

// Profil bor — asosiy ilova, yo'q — faqat /login.
function Navigator({ hasProfile }: { hasProfile: boolean }) {
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
  const dark = colorScheme === "dark";
  const background = useThemeColor("background", "#F4F6F9");
  const surface = useThemeColor("surface", "#FFFFFF");
  const border = useThemeColor("border", "#E5E8EE");
  const foreground = useThemeColor("foreground", "#1B2230");
  const primary = useThemeColor("primary", "#1E6FEB");

  // Ilova mavzusi (Profil → Mavzu) tizim mavzusidan farq qilishi mumkin. Native oyna foni (Android'da pastki
  // navigatsiya paneli / safe-area ostida ko'rinadi) va navigator fonlari ham ilova mavzusiga ergashsin.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(background).catch(() => {});
  }, [background]);

  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark,
      colors: { ...base.colors, background, card: surface, border, text: foreground, primary },
    };
  }, [dark, background, surface, border, foreground, primary]);

  return (
    <ProfileProvider>
      <ThemeProvider value={navTheme}>
        <View className="flex-1 bg-background">
          <StatusBar animated style={dark ? "light" : "dark"} />
          <RootNavigator />
        </View>
      </ThemeProvider>
    </ProfileProvider>
  );
}
