import { Pressable, PressableProps, View, ViewProps } from "react-native";

type BaseProps = { className?: string };

// onPress berilsa karta bosiladigan bo'ladi, aks holda oddiy View.
type Props = BaseProps & (({ onPress: PressableProps["onPress"] } & Omit<PressableProps, "onPress">) | ({ onPress?: undefined } & ViewProps));

const base = "rounded-xl border border-border bg-surface p-4";

export function CusCard({ className = "", onPress, ...rest }: Props) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${base} active:bg-surface-alt ${className}`}
        {...(rest as PressableProps)}
      />
    );
  }
  return <View className={`${base} ${className}`} {...(rest as ViewProps)} />;
}
