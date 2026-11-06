import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";

type Props = {
  changes: number; // soatga yuborilmagan o'zgarishlar
  activeCount: number; // faol rejalar
};

// Tepadagi holat paneli: soat bilan sinxronmi yoki yuborilmagan o'zgarish bormi.
export function SyncStatus({ changes, activeCount }: Props) {
  const synced = changes === 0;

  return (
    <CusCard className="flex-row items-center gap-3 py-3">
      <View
        className={`h-3 w-3 rounded-full ${synced ? "bg-success" : "bg-warning"}`}
      />
      <View className="flex-1">
        <CusText className="font-semibold">
          {synced ? "Soat bilan sinxron" : `${changes} ta o'zgarish soatga yuborilmagan`}
        </CusText>
        <CusText variant="caption" tone="muted">
          {activeCount} ta reja faol
        </CusText>
      </View>
    </CusCard>
  );
}
