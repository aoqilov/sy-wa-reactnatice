import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import type { Profile } from "../api/profile-storage";

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <CusCard className="flex-1 items-center gap-1">
      <CusText variant="caption" tone="muted" className="text-center">
        {label}
      </CusText>
      <CusText variant="heading">
        {value}
        {unit ? <CusText tone="muted"> {unit}</CusText> : null}
      </CusText>
    </CusCard>
  );
}

// Tug'ilgan yil, bo'y va vazn — qisqa kartalar qatori.
export function ProfileStats({ profile }: { profile: Profile }) {
  const t = useT();

  return (
    <View className="flex-row gap-3">
      <Stat label={t("profile.born")} value={profile.birthYear} />
      <Stat label={t("profile.height")} value={profile.heightCm} unit={t("profile.unit.cm")} />
      <Stat label={t("profile.weight")} value={profile.weightKg} unit={t("profile.unit.kg")} />
    </View>
  );
}
