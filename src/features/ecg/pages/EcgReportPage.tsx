import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { EcgReportView } from "../components/EcgReportView";
import { type EcgRecord, loadEcgRecord } from "../lib/ecg-records";
import { formatDateTime, reportT } from "../lib/ecg-report";

// Bitta EKG yozuvining to'liq hisoboti — alohida sahifa (/history/ecg/[id]): qayta o'ynatish, o'lchovlar,
// o'rtacha kompleks. To'lqin fayldan o'qiladi (bir necha ming nuqta).
export function EcgReportPage({ id }: { id: string }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  // undefined — o'qilmoqda, null — topilmadi yoki o'qib bo'lmadi.
  const [record, setRecord] = useState<EcgRecord | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void loadEcgRecord(id).then((r) => {
      if (alive) setRecord(r);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader
        title={reportT("ecg.report.title")}
        subtitle={record ? formatDateTime(record.at) : undefined}
        fallbackHref="/history/ecg"
      />

      {record === undefined ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : record === null ? (
        <CusText tone="danger" className="p-6 text-center">
          {t("ecg.openError")}
        </CusText>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          <EcgReportView record={record} />
        </CusScrollView>
      )}
    </View>
  );
}
