import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusImage, CusKeyboardScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import { ProfileForm } from "../components/profile-form";
import { useProfile } from "../hooks/use-profile";

const LOGO = require("../../../../assets/images/logo.png");

// Birinchi kirish: ma'lumot telefonga saqlanadi. Saqlangach root layout o'zi asosiy ekranga o'tkazadi
// (router.replace kerak emas — profil paydo bo'lishi bilan /login yopiladi).
export function FeatureLogin() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { save } = useProfile();

  return (
    // Klaviatura chiqqanda bo'y/vazn kabi pastdagi input'lar yopilib qolmasligi uchun
    // KeyboardAvoidingView + fokusdagi input'ga scroll qiladigan o'ram.
    <CusKeyboardScrollView
      containerClassName="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        gap: 24,
        padding: 16,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View className="items-center gap-3">
        <CusImage source={LOGO} className="h-16 w-10 rounded-lg" />
        <CusText variant="title">{t("login.title")}</CusText>
        <CusText tone="muted" className="text-center">
          {t("login.subtitle")}
        </CusText>
      </View>

      <ProfileForm submitLabel={t("login.submit")} onSubmit={save} />
    </CusKeyboardScrollView>
  );
}
