import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

// Filtr va teg uchun: tanlangan bo'lsa ko'k, aks holda kulrang chegarali.
export function CusChip({ label, selected = false, onPress, className = "" }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`self-start rounded-full border px-4 py-2 ${
        selected ? "border-primary bg-primary" : "border-border bg-surface"
      } ${className}`}
    >
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-foreground"}`}>{label}</Text>
    </Pressable>
  );
}
