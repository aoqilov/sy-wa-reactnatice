import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusCard, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { bloodRows, bloodSummary } from "@/features/home/lib/blood";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { getHistory, type HistoryReading, SOURCE_LABEL } from "../api/get-history";
import { formatDateTime } from "../lib/format-date";

// Bitta qon tahlili natijasi (/history/blood/[id]), EKG hisoboti kabi oddiy matn: sana, manba, xulosa va har bir
// ko'rsatkichning qiymati, me'yori va holati.
export function BloodReportPage({ id }: { id: string }) {
  const tabBarSpace = useTabBarSpace();
  // undefined — o'qilmoqda, null — topilmadi.
  const [record, setRecord] = useState<HistoryReading | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void getHistory().then(({ readings }) => {
      if (alive) setRecord(readings.find((r) => r.id === id && r.blood) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader
        title="Qon tahlili natijasi"
        subtitle={record ? formatDateTime(record.at) : undefined}
        fallbackHref="/history/blood"
      />

      {record === undefined ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : record === null || !record.blood ? (
        <CusText tone="danger" className="p-6 text-center">
          Yozuv topilmadi.
        </CusText>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="gap-3 p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          <CusCard>
            <Line label="Sana" value={formatDateTime(record.at)} />
            <Line label="Manba" value={SOURCE_LABEL[record.source]} />
            <Line label="Xulosa" value={bloodSummary(record.blood).label} />
          </CusCard>

          <CusCard>
            <CusText variant="heading" className="pb-1">
              Ko&apos;rsatkichlar
            </CusText>
            {bloodRows(record.blood).map((r, i) => (
              <View key={r.key} className={`gap-0.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}>
                <CusText className="font-semibold">{r.label}</CusText>
                <CusText>
                  {r.value} {r.unit}
                </CusText>
                <CusText variant="caption" tone="muted">
                  Me&apos;yor: {r.normal} {r.unit} · {r.statusLabel}
                </CusText>
              </View>
            ))}
          </CusCard>

          <CusText variant="caption" tone="muted" className="px-1">
            Natija soat bo&apos;yicha taxminiy, laboratoriya tahlili yoki tibbiy tashxis o&apos;rnini bosmaydi.
          </CusText>
        </CusScrollView>
      )}
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3 py-1.5">
      <CusText tone="muted">{label}</CusText>
      <CusText className="shrink text-right font-semibold">{value}</CusText>
    </View>
  );
}
