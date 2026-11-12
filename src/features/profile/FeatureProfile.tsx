import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { CusAccordion, CusButton, CusDivider, CusScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import { LanguagePicker } from "./components/language-picker";
import { ProfileHeader } from "./components/profile-header";
import { SettingGroup } from "./components/setting-group";
import { ThemeSwitcher } from "./components/theme-switcher";
import { UiSizePicker } from "./components/ui-size-picker";
import { useProfile } from "./hooks/use-profile";
import { bmiCategoryKey, calcAge, calcBmi, GENDER_KEY } from "./lib/profile-utils";

/** Bo'lim ichidagi bitta qator: chapda nomi, o'ngda qiymati. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2.5">
      <CusText tone="muted" className="shrink">
        {label}
      </CusText>
      <CusText className="shrink-0 text-right font-semibold">{value}</CusText>
    </View>
  );
}

// Profil sahifasi: tepada ism va avatar, pastda ochilib-yopiladigan bo'limlar:
//  1. Shaxsiy ma'lumotlar (standart ochiq) — ism, familiya, tug'ilgan yil, yosh, jins
//  2. Tana ko'rsatkichlari — bo'y, vazn, tana massasi indeksi
//  3. Sozlamalar — til, interfeys kattaligi, mavzu
// Oxirida amallar: tahrirlash, chiqish.
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

  const age = calcAge(profile.birthYear);
  const gender = t(GENDER_KEY[profile.gender]);
  const height = `${profile.heightCm} ${t("profile.unit.cm")}`;
  const weight = `${profile.weightKg} ${t("profile.unit.kg")}`;
  const bmi = calcBmi(profile.heightCm, profile.weightKg);

  return (
    <View className="flex-1 bg-background">
      {/* pb-32: pastdagi suzib turuvchi tab bar ostida qolmasligi uchun */}
      <CusScrollView contentContainerClassName="gap-3 p-4 pb-32">
        <View className="pb-2">
          <ProfileHeader profile={profile} />
        </View>

        <CusAccordion
          title={t("profile.section.personal")}
          subtitle={t("profile.ageGender", { age, gender })}
          icon="person"
          defaultOpen
        >
          <InfoRow label={t("form.firstName")} value={profile.firstName} />
          <CusDivider />
          <InfoRow label={t("form.lastName")} value={profile.lastName} />
          <CusDivider />
          <InfoRow label={t("profile.born")} value={String(profile.birthYear)} />
          <CusDivider />
          <InfoRow label={t("profile.age")} value={String(age)} />
          <CusDivider />
          <InfoRow label={t("form.gender")} value={gender} />
        </CusAccordion>

        <CusAccordion title={t("profile.section.body")} subtitle={`${height} · ${weight}`} icon="pulse">
          <InfoRow label={t("profile.height")} value={height} />
          <CusDivider />
          <InfoRow label={t("profile.weight")} value={weight} />
          <CusDivider />
          <InfoRow label={t("profile.bmi")} value={`${bmi} · ${t(bmiCategoryKey(bmi))}`} />
        </CusAccordion>

        <CusAccordion title={t("profile.settings")} icon="gear">
          <View className="gap-4">
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
          </View>
        </CusAccordion>

        <View className="gap-3 pt-2">
          <CusButton title={t("profile.edit")} onPress={() => router.push("/profile/edit")} />
          {/* Ma'lumotni o'chiradi va /login'ga qaytaradi (root layout o'zi yo'naltiradi). */}
          <CusButton title={t("profile.logout")} variant="outline" onPress={clear} />
        </View>
      </CusScrollView>
    </View>
  );
}
