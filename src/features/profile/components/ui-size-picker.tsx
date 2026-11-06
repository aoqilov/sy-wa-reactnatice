import { Pressable, Text, View } from "react-native";

import { useT } from "@/shared/i18n/use-t";
import { setUiSize, UI_SIZES, UiSize, useUiSize } from "@/shared/settings/settings";
import type { TranslationKey } from "@/shared/i18n/translations";

const LABEL_KEY: Record<UiSize, TranslationKey> = {
  small: "size.small",
  medium: "size.medium",
  large: "size.large",
  xlarge: "size.xlarge",
};

// "Aa" belgisi har bir variantda o'z kattaligida chiqadi. Bu qat'iy piksel (rem emas),
// shuning uchun tanlangan o'lchamdan qat'i nazar variantlar bir-biridan farq qilib turadi.
const SAMPLE_PX: Record<UiSize, number> = { small: 14, medium: 17, large: 21, xlarge: 25 };

// Interfeys kattaligi: 4 xil variant, tanlansa butun ilova darhol shu o'lchamga o'tadi.
export function UiSizePicker() {
  const t = useT();
  const current = useUiSize();

  return (
    <View className="flex-row gap-2">
      {UI_SIZES.map((size) => {
        const selected = size === current;
        return (
          <Pressable
            key={size}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setUiSize(size)}
            className={`flex-1 items-center justify-end gap-1 rounded-xl border px-1 py-2 ${
              selected ? "border-primary bg-primary-soft" : "border-border bg-surface"
            }`}
          >
            <Text
              style={{ fontSize: SAMPLE_PX[size] }}
              className={`font-semibold ${selected ? "text-primary" : "text-foreground"}`}
            >
              Aa
            </Text>
            <Text className={`text-center text-xs ${selected ? "text-primary" : "text-muted"}`}>
              {t(LABEL_KEY[size])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
