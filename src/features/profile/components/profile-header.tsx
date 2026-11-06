import { View } from "react-native";

import { CusAvatar, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import type { Profile } from "../api/profile-storage";
import { calcAge, fullName, GENDER_KEY } from "../lib/profile-utils";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const t = useT();
  const name = fullName(profile);

  return (
    <View className="items-center gap-1">
      <CusAvatar name={name} size="lg" className="mb-2" />
      <CusText variant="title">{name}</CusText>
      <CusText tone="muted">
        {t("profile.ageGender", { age: calcAge(profile.birthYear), gender: t(GENDER_KEY[profile.gender]) })}
      </CusText>
    </View>
  );
}
