import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";

import { Period, PERIODS } from "../lib/summarize";

type Props = {
  value: Period;
  onChange: (period: Period) => void;
};

// Davr tanlash: Bugun | Kecha | 3 kun | 7 kun | 15 kun. Hammasi bir qatorga teng kenglikda sig'adi.
export function PeriodTabs({ value, onChange }: Props) {
  return (
    <View className="flex-row border-b border-border bg-surface px-2">
      {PERIODS.map((p) => {
        const active = p.value === value;
        return (
          <Pressable
            key={p.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(p.value)}
            className={`flex-1 items-center border-b-2 py-3 ${
              active ? "border-primary" : "border-transparent"
            }`}
          >
            <CusText
              variant="caption"
              tone={active ? "primary" : "muted"}
              className={active ? "font-bold" : "font-medium"}
              numberOfLines={1}
            >
              {p.label}
            </CusText>
          </Pressable>
        );
      })}
    </View>
  );
}
