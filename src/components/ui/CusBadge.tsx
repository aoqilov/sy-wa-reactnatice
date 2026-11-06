import { Text, View } from "react-native";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

type Props = { label: string; tone?: Tone; className?: string };

const toneStyles: Record<Tone, { box: string; text: string }> = {
  success: { box: "bg-success-soft", text: "text-success" },
  warning: { box: "bg-warning-soft", text: "text-warning" },
  danger: { box: "bg-danger-soft", text: "text-danger" },
  info: { box: "bg-info-soft", text: "text-info" },
  neutral: { box: "bg-neutral-soft", text: "text-neutral" },
};

export function CusBadge({ label, tone = "neutral", className = "" }: Props) {
  const t = toneStyles[tone];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${t.box} ${className}`}>
      <Text className={`text-xs font-semibold uppercase ${t.text}`}>{label}</Text>
    </View>
  );
}
