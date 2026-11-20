import Octicons from "@expo/vector-icons/Octicons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { useUiScale } from "@/shared/settings/settings";
import { useThemeColor } from "@/shared/theme/use-theme-color";

type IconName = ComponentProps<typeof Octicons>["name"];

// Yangi tab qo'shish: shu ro'yxatga qator qo'shing (sarlavha — tarjima kaliti) va src/app/ ichida shu nomli route yarating.
const TABS: { name: string; title: TranslationKey; icon: IconName }[] = [
  { name: "(home)", title: "tabs.home", icon: "home" },
  { name: "history", title: "tabs.history", icon: "history" },
  { name: "myplan", title: "tabs.myplan", icon: "checklist" },
  { name: "profile", title: "tabs.profile", icon: "person" },
];

const TAB_BAR_HEIGHT = 68; // masshtab 1 da

/**
 * Tab bar sahifa ustida suzib turadi (position: absolute): sahifa pastida shuncha joy bo'sh qoldirilishi kerak,
 * aks holda oxirgi kontent bar ostida qolib ketadi. Bar balandligi (interfeys masshtabi bilan) + pastki safe area + oraliq.
 */
export function useTabBarSpace(gap = 16): number {
  const insets = useSafeAreaInsets();
  const scale = useUiScale();
  return insets.bottom + Math.round(TAB_BAR_HEIGHT * scale) + gap;
}

// Pastki navigatsiya: suzib turuvchi, yumaloq burchakli tab bar.
export function AppTabs() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const scale = useUiScale(); // "Interfeys kattaligi" sozlamasi: tab bar qat'iy pikselda, shuning uchun o'zimiz masshtablaymiz
  const surface = useThemeColor("surface", "#FFFFFF");
  const border = useThemeColor("border", "#E5E8EE");
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");
  const primarySoft = useThemeColor("primary-soft", "#E8F0FE");

  return (
    <Tabs
      // Pastki oraliqni tab bar o'zi emas, quyidagi marginBottom egallaydi (suzib turuvchi ko'rinish uchun)
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: surface,
          // absolute: bar sahifa ustida suzib turadi, atrofi shaffof bo'ladi (kontent bar ostida ko'rinadi)
          position: "absolute",
          
          bottom: insets.bottom,
          height: Math.round(TAB_BAR_HEIGHT * scale),
          paddingHorizontal: 6,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderWidth: 0,
          borderColor: border,
          borderTopWidth: 2,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        // Aktiv tab: yumaloq yumshoq fon
        tabBarItemStyle: {
          borderRadius: 24,
          overflow: "hidden", // bo'lmasa aktiv fon yumaloq kesilmaydi
          marginVertical: 4,
          marginHorizontal: 0,
        },
        // Standart tugma Android'da bosilganda "to'lqin" (ripple) chiqaradi. Oddiy Pressable bilan almashtirdik.
        tabBarButton: (props) => (
          <Pressable
            onPress={props.onPress}
            onLongPress={props.onLongPress}
            testID={props.testID}
            role={props.role}
            aria-label={props["aria-label"]}
            aria-selected={props["aria-selected"]}
            style={props.style}
          >
            {props.children as React.ReactNode}
          </Pressable>
        ),
        tabBarActiveBackgroundColor: primarySoft,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: { fontWeight: "600", fontSize: Math.round(12 * scale) },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            tabBarIcon: ({ color }) => (
              <Octicons name={tab.icon} size={Math.round(22 * scale)} color={color as string} />
            ),
          }}
        />
      ))}

      {/* Watch sahifasi tab bar'da ko'rinmaydi, faqat yuqoridagi header bosilganda ochiladi.
          `href: null` ISHLATILMAYDI: expo-router 58 da u `hidden: true` bo'ladi va yashirin tab ochilishi bilan
          navigator bosh sahifaga qaytaradi ("redirects to its initial visible screen"). Shuning uchun faqat
          tugmasini olib tashlaymiz, sahifaning o'zi oddiy tab bo'lib qoladi. */}
      <Tabs.Screen name="watch" options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }} />
    </Tabs>
  );
}
