import { Text, View } from "react-native";

import { CusButton } from "./CusButton";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

// Ro'yxat bo'sh bo'lganda yoki xato bo'lganda ko'rsatiladi.
export function CusEmptyState({ title, description, actionLabel, onAction, className = "" }: Props) {
  return (
    <View className={`items-center gap-2 p-8 ${className}`}>
      <Text className="text-4xl">🗂️</Text>
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {description ? <Text className="text-center text-muted">{description}</Text> : null}
      {actionLabel && onAction ? (
        <CusButton title={actionLabel} onPress={onAction} className="mt-2 self-stretch" />
      ) : null}
    </View>
  );
}
