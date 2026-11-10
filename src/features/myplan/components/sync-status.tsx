import { ActivityIndicator, Pressable, View } from "react-native";

import { CusCard, CusText } from "@/components/ui";

type Props = {
  connected: boolean;
  reading: boolean; // jadval soatdan o'qilmoqda
  loaded: boolean; // jadval kamida bir marta o'qilgan
  changes: number; // soatga yuborilmagan o'zgarishlar
  activeCount: number; // faol rejalar
  onRefresh: () => void;
};

// Tepadagi holat paneli: soat bilan sinxronmi yoki yuborilmagan o'zgarish bormi; "Qayta o'qish".
export function SyncStatus({ connected, reading, loaded, changes, activeCount, onRefresh }: Props) {
  const synced = loaded && changes === 0;
  const title = !connected
    ? "Soat ulanmagan"
    : reading
      ? "Soatdan o'qilmoqda…"
      : !loaded
        ? "Jadval hali o'qilmagan"
        : synced
          ? "Soat bilan sinxron"
          : `${changes} ta o'zgarish soatga yuborilmagan`;

  return (
    <CusCard className="flex-row items-center gap-3 py-3">
      {reading ? (
        <ActivityIndicator size="small" />
      ) : (
        <View className={`h-3 w-3 rounded-full ${synced && connected ? "bg-success" : "bg-warning"}`} />
      )}
      <View className="flex-1">
        <CusText className="font-semibold">{title}</CusText>
        <CusText variant="caption" tone="muted">
          {activeCount} ta reja faol
        </CusText>
      </View>
      {connected && !reading ? (
        <Pressable accessibilityRole="button" onPress={onRefresh} hitSlop={8}>
          <CusText variant="caption" tone="primary" className="font-semibold">
            Qayta o&apos;qish
          </CusText>
        </Pressable>
      ) : null}
    </CusCard>
  );
}
