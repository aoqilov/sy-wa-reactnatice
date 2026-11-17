import Octicons from "@expo/vector-icons/Octicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusCard, CusDivider, CusListItem, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { bloodSummary } from "@/features/home/lib/blood";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { getHistory, type HistoryReading, SOURCE_LABEL } from "../api/get-history";
import { formatDateTime } from "../lib/format-date";

// Qon tahlili yozuvlari (/history/blood), EKG yozuvlari kabi: sana, qisqa xulosa va manba. Bittasi bosilsa, natija
// o'z sahifasida (/history/blood/[id]) oddiy matn ko'rinishida ochiladi. Sahifa har ochilganda qayta o'qiladi.
export function BloodRecordsPage() {
  const router = useRouter();
  const muted = useThemeColor("muted", "#6B7385");
  const tabBarSpace = useTabBarSpace();
  const [items, setItems] = useState<HistoryReading[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getHistory().then(({ readings }) => setItems(readings.filter((r) => r.key === "blood" && r.blood)));
    }, []),
  );

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title="Qon tahlili" subtitle="Yozuvlar" fallbackHref="/history" />

      {items === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <CusText tone="muted" className="p-6 text-center">
          Hali qon tahlili yozuvlari yo&apos;q. Bosh sahifada &quot;Qon tahlili&quot;ni tanlab o&apos;lchang.
        </CusText>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          <CusCard className="p-0">
            {items.map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <CusDivider /> : null}
                <CusListItem
                  title={formatDateTime(item.at)}
                  subtitle={`${item.blood ? bloodSummary(item.blood).label : item.value} · ${SOURCE_LABEL[item.source]}`}
                  left={<Octicons name="beaker" size={18} color={muted} />}
                  right={<Octicons name="chevron-right" size={18} color={muted} />}
                  onPress={() => router.push({ pathname: "/history/blood/[id]", params: { id: item.id } })}
                />
              </View>
            ))}
          </CusCard>
        </CusScrollView>
      )}
    </View>
  );
}
