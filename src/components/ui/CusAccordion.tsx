import { ReactNode, useState } from "react";
import { LayoutAnimation, Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function CusAccordion({ title, children, defaultOpen = false, className = "" }: Props) {
  const [open, setOpen] = useState(defaultOpen);

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
        className="flex-row items-center justify-between px-4 py-3 active:bg-surface-alt"
      >
        <Text className="flex-1 text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-muted">{open ? "▴" : "▾"}</Text>
      </Pressable>

      {open ? <View className="border-t border-border px-4 py-3">{children}</View> : null}
    </View>
  );
}
