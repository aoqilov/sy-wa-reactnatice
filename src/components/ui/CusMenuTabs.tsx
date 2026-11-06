import { Pressable, ScrollView, Text, View } from "react-native";

export type CusMenuTab = { label: string; value: string };

type Props = {
  tabs: CusMenuTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

// Tepadagi gorizontal menyu: aktiv tabning tagida ko'k chiziq bor. Tablar ko'p bo'lsa, surib ko'riladi.
export function CusMenuTabs({ tabs, value, onChange, className = "" }: Props) {
  return (
    <View className={`border-b border-border bg-surface ${className}`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-2">
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <Pressable
              key={t.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(t.value)}
              className={`border-b-2 px-4 py-3 ${active ? "border-primary" : "border-transparent"}`}
            >
              <Text className={`text-base ${active ? "font-semibold text-primary" : "text-muted"}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
