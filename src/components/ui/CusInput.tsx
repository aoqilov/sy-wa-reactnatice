import { useState } from "react";
import { Platform, StyleProp, Text, TextInput, TextInputProps, TextStyle, View } from "react-native";

import { useThemeColor } from "@/shared/theme/use-theme-color";

import { useScrollToFocusedInput } from "./CusKeyboardScrollView";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  className?: string; // tashqi o'ram (View) uchun
};

// Web'da brauzer focus paytida o'zining qora/ko'k chizig'ini chizadi — u bizning `border-primary` bilan to'qnashadi.
const webNoOutline: StyleProp<TextStyle> =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : undefined;

export function CusInput({ label, error, className = "", onFocus, onBlur, style, ...rest }: Props) {
  const placeholderColor = useThemeColor("subtle", "#A3A9B7");
  const [focused, setFocused] = useState(false);
  // <CusKeyboardScrollView> ichida bo'lsa: fokus olgach, scroll shu input'ni klaviatura ustiga chiqaradi.
  const scrollToFocused = useScrollToFocusedInput();

  // Xato har doim ustun (qizil qoladi), keyin focus (ko'k), aks holda oddiy chegara.
  const borderStyle = error ? "border-danger" : focused ? "border-primary" : "border-border";
  const labelStyle = focused && !error ? "text-primary" : "text-foreground";

  return (
    <View className={`gap-1 ${className}`}>
      {label ? <Text className={`text-sm font-medium ${labelStyle}`}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={placeholderColor}
        className={`h-12 rounded-xl border bg-surface px-3 text-base text-foreground ${borderStyle}`}
        style={[webNoOutline, style]}
        onFocus={(e) => {
          setFocused(true);
          scrollToFocused?.();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
