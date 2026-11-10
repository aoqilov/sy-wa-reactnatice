import Octicons from "@expo/vector-icons/Octicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusCard, CusDivider, CusListItem, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { type EcgRecordSummary, listEcgRecords } from "../lib/ecg-records";
import { formatDateTime } from "../lib/ecg-report";

// Saqlangan EKG yozuvlari — alohida sahifa (/history/ecg). Bittasi bosilsa, uning to'liq hisoboti o'z sahifasida
// (/history/ecg/[id]) ochiladi. Ro'yxat sahifa har ochilganda qayta o'qiladi (Home'da yangi EKG o'lchangan bo'lishi mumkin).
export function EcgRecordsPage() {
  const t = useT();
  const router = useRouter();
  const muted = useThemeColor("muted", "#6B7385");
  const tabBarSpace = useTabBarSpace();
  const [items, setItems] = useState<EcgRecordSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void listEcgRecords().then(setItems);
    }, []),
  );

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title={t("ecg.records")} fallbackHref="/history" />

      {items === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <CusText tone="muted" className="p-6 text-center">
          {t("ecg.noRecords")}
        </CusText>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          <CusCard className="p-0">
            {items.map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <CusDivider /> : null}
                <CusListItem
                  title={formatDateTime(item.at)}
                  subtitle={[
                    `${item.value} ${t("ecg.unit.bpm")}`,
                    t("ecg.seconds", { s: item.durationS }),
                    item.qtc !== undefined ? `QTc ${item.qtc} ${t("ecg.unit.ms")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  left={<Octicons name="graph" size={18} color={muted} />}
                  right={<Octicons name="chevron-right" size={18} color={muted} />}
                  onPress={() => router.push({ pathname: "/history/ecg/[id]", params: { id: item.id } })}
                />
              </View>
            ))}
          </CusCard>
        </CusScrollView>
      )}
    </View>
  );
}
