import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode; // masalan <CusAvatar />
  right?: ReactNode; // masalan <CusBadge />
  onPress?: () => void;
  className?: string;
};

export function CusListItem({ title, subtitle, left, right, onPress, className = "" }: Props) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-surface-alt ${className}`}
    >
      {left}
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}
