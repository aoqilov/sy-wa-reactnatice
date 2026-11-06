import { View } from "react-native";

export function CusDivider({ className = "" }: { className?: string }) {
  return <View className={`h-px bg-border ${className}`} />;
}
