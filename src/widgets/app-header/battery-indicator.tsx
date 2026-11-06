import { View } from "react-native";

import { CusText } from "@/components/ui";

// Batareya belgisi: tashqi ramka, ichida foizga mos to'lgan qism, o'ngda kichik uchi.
export function BatteryIndicator({ level }: { level: number }) {
  const value = Math.max(0, Math.min(100, Math.round(level)));
  const fill = value <= 20 ? "bg-danger" : value <= 50 ? "bg-warning" : "bg-success";

  return (
    <View className="flex-row items-center gap-1.5">
      <View className="flex-row items-center">
        <View className="h-3.5 w-6 justify-center rounded-[3px] border border-muted p-px">
          <View className={`h-full rounded-[2px] ${fill}`} style={{ width: `${value}%` }} />
        </View>
        <View className="h-1.5 w-0.5 rounded-r-sm bg-muted" />
      </View>
      <CusText variant="caption" className="font-semibold">
        {value}%
      </CusText>
    </View>
  );
}
