import Octicons from "@expo/vector-icons/Octicons";
import { ComponentProps, ReactNode, useState } from "react";
import { LayoutAnimation, Pressable, Text, View } from "react-native";

import { useThemeColor } from "@/shared/theme/use-theme-color";

type Props = {
  title: string;
  /** Yopiq holatda sarlavha ostida ko'rinadigan qisqa xulosa (masalan "175 sm · 72 kg"). */
  subtitle?: string;
  icon?: ComponentProps<typeof Octicons>["name"];
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

// Ochilib-yopiladigan blok: sarlavha bosilsa mazmun ochiladi. Chapda ixtiyoriy belgi, o'ngda strelka.
export function CusAccordion({ title, subtitle, icon, children, defaultOpen = false, className = "" }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View className={`overflow-hidden rounded-xl border border-border bg-surface ${className}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        className="flex-row items-center gap-3 px-4 py-3 active:bg-surface-alt"
      >
        {icon ? (
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
            <Octicons name={icon} size={18} color={primary} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          {subtitle && !open ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Octicons name={open ? "chevron-up" : "chevron-down"} size={18} color={muted} />
      </Pressable>

      {open ? <View className="border-t border-border px-4 py-3">{children}</View> : null}
    </View>
  );
}
