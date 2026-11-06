import { router } from "expo-router";
import { View } from "react-native";

import { CusKeyboardScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import type { Profile } from "../api/profile-storage";
import { ProfileForm } from "../components/profile-form";
import { useProfile } from "../hooks/use-profile";
import { profileToForm } from "../lib/profile-utils";

export function EditProfileSheet() {
  const t = useT();
  const { profile, save } = useProfile();

  const handleSubmit = async (next: Profile) => {
    await save(next);
    router.back();
  };

  return (
    <CusKeyboardScrollView
      containerClassName="flex-1 bg-surface"
      contentContainerStyle={{ gap: 16, padding: 16, paddingBottom: 32 }}
    >
      {/* Tepadagi "tayoqcha" (handle) */}
      <View className="h-1.5 w-10 self-center rounded-full bg-border" />

      <CusText variant="heading" className="text-center">
        {t("profile.edit")}
      </CusText>

      <ProfileForm
        initialValues={profile ? profileToForm(profile) : undefined}
        submitLabel={t("form.save")}
        onSubmit={handleSubmit}
      />
    </CusKeyboardScrollView>
  );
}
