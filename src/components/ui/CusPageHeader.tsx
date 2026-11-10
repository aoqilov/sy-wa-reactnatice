import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { useThemeColor } from "@/shared/theme/use-theme-color";

import { CusText } from "./CusText";

type Props = {
  title: string;
  subtitle?: string;
  /** Orqaga yo'l bo'lmasa (sahifaga to'g'ridan-to'g'ri kelingan) shu manzilga qaytadi. */
  fallbackHref?: string;
};

// Ichki sahifa sarlavhasi: chapda "orqaga", yonida nomi. Stack'ning o'z sarlavhasi o'chirilgan (headerShown: false),
// shuning uchun ilova uslubidagi sarlavha shu. Android'ning tizim "orqaga" tugmasi va iOS'da chetdan surish ham ishlaydi.
export function CusPageHeader({ title, subtitle, fallbackHref }: Props) {
  const router = useRouter();
  const primary = useThemeColor("primary", "#1E6FEB");

  const back = () => {
    if (router.canGoBack()) router.back();
    else if (fallbackHref) router.replace(fallbackHref as never);
  };

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-surface px-2 py-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Orqaga"
        onPress={back}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-alt"
      >
        <Octicons name="chevron-left" size={22} color={primary} />
      </Pressable>
      <View className="flex-1">
        <CusText variant="heading" numberOfLines={1}>
          {title}
        </CusText>
        {subtitle ? (
          <CusText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </CusText>
        ) : null}
      </View>
    </View>
  );
}
