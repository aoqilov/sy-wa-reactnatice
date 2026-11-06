import { Text, View } from "react-native";

import { CusImage } from "./CusImage";

type Size = "sm" | "md" | "lg";

type Props = {
  name: string;
  uri?: string;
  size?: Size;
  className?: string;
};

const sizeStyles: Record<Size, { box: string; text: string }> = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  md: { box: "h-12 w-12", text: "text-base" },
  lg: { box: "h-20 w-20", text: "text-2xl" },
};

// Rasm bo'lsa rasm, bo'lmasa ismning bosh harflari chiqadi.
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function CusAvatar({ name, uri, size = "md", className = "" }: Props) {
  const s = sizeStyles[size];

  if (uri) {
    return <CusImage source={{ uri }} className={`${s.box} rounded-full ${className}`} />;
  }

  return (
    <View className={`${s.box} items-center justify-center rounded-full bg-primary-soft ${className}`}>
      <Text className={`font-semibold text-primary ${s.text}`}>{initials(name)}</Text>
    </View>
  );
}
