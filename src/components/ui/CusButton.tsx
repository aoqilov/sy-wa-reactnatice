import { ActivityIndicator, Pressable, PressableProps, Text } from "react-native";

import { useUiScale } from "@/shared/settings/settings";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "sm";

type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: Variant;
  size?: Size; // md: 48 balandlik, sm: 36 (kichik, kartalar ichida)
  loading?: boolean;
  className?: string;
};

// Tailwind klasslarni to'liq matn sifatida skanerlaydi, shuning uchun ularni qo'shib yozmaymiz.
const containerStyles: Record<Variant, string> = {
  primary: "bg-primary active:bg-primary-dark",
  outline: "border border-border bg-surface active:bg-primary-soft",
  ghost: "bg-transparent active:bg-primary-soft",
};

const textStyles: Record<Variant, string> = {
  primary: "text-white",
  outline: "text-foreground",
  ghost: "text-primary",
};

export function CusButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const scale = useUiScale(); // balandlik qat'iy piksel bo'lgani uchun matn bilan birga o'sishi uchun masshtablaymiz

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={{ height: Math.round((size === "sm" ? 36 : 48) * scale) }}
      className={` flex-row items-center justify-center rounded-xl px-4 ${containerStyles[variant]} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : undefined} />
      ) : (
        <Text className={`${size === "sm" ? "text-sm" : "text-base"} font-semibold ${textStyles[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
