import { Switch, Text, View } from "react-native";

import { useThemeColor } from "@/shared/theme/use-theme-color";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function CusSwitch({ value, onValueChange, label, disabled = false, className = "" }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const border = useThemeColor("border", "#E5E8EE");

  return (
    <View className={`flex-row items-center justify-between ${disabled ? "opacity-50" : ""} ${className}`}>
      {label ? <Text className="text-base text-foreground">{label}</Text> : <View />}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: border, true: primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
