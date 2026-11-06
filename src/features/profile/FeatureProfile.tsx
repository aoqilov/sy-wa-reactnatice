import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { CusButton, CusCard, CusDivider, CusScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import { LanguagePicker } from "./components/language-picker";
import { ProfileHeader } from "./components/profile-header";
import { ProfileStats } from "./components/profile-stats";
import { SettingGroup } from "./components/setting-group";
import { ThemeSwitcher } from "./components/theme-switcher";
import { UiSizePicker } from "./components/ui-size-picker";
import { useProfile } from "./hooks/use-profile";

// Profil sahifasi tartibi (yuqoridan pastga):
//  1. Men kimman  — ism, yosh, jins
//  2. Tana ko'rsatkichlari — tug'ilgan yil, bo'y, vazn
//  3. Sozlamalar  — til, interfeys kattaligi, mavzu
//  4. Amallar     — tahrirlash, chiqish
export function FeatureProfile() {
  const t = useT();
  const { profile, loading, clear } = useProfile();

  // Bu ekran faqat profil bo'lganda ochiladi (root layout himoyalaydi), lekin tur xavfsizligi uchun tekshiramiz.
  if (loading || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* pb-32: pastdagi suzib turuvchi tab bar ostida qolmasligi uchun */}
      <CusScrollView contentContainerClassName="gap-5 p-4 pb-32">
        <ProfileHeader profile={profile} />
        <ProfileStats profile={profile} />

        <CusCard className="gap-4">
          <CusText variant="heading">{t("profile.settings")}</CusText>

          <SettingGroup title={t("profile.language")}>
            <LanguagePicker />
          </SettingGroup>
          <CusDivider />

          <SettingGroup title={t("profile.uiSize")}>
            <UiSizePicker />
          </SettingGroup>
          <CusDivider />

          <SettingGroup title={t("profile.theme")}>
            <ThemeSwitcher />
          </SettingGroup>
        </CusCard>

        <View className="gap-3">
          <CusButton title={t("profile.edit")} onPress={() => router.push("/profile/edit")} />
          {/* Ma'lumotni o'chiradi va /login'ga qaytaradi (root layout o'zi yo'naltiradi). */}
          <CusButton title={t("profile.logout")} variant="outline" onPress={clear} />
          <CusButton
            title={t("profile.uiPreview")}
            variant="ghost"
            size="sm"
            onPress={() => router.push("/profile/preview")}
          />
        </View>
      </CusScrollView>
    </View>
  );
}
