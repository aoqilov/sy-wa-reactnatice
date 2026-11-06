import { Pressable, Text, View } from "react-native";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function CusCheckbox({ checked, onChange, label, disabled = false, className = "" }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={`flex-row items-center gap-3 ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-md border ${
          checked ? "border-primary bg-primary" : "border-border bg-surface"
        }`}
      >
        {checked ? <Text className="text-sm font-bold text-white">✓</Text> : null}
      </View>
      {label ? <Text className="text-base text-foreground">{label}</Text> : null}
    </Pressable>
  );
}
