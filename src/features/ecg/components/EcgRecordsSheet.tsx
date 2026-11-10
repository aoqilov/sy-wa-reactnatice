import Octicons from "@expo/vector-icons/Octicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusBottomSheet, CusButton, CusListItem, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { type EcgRecord, type EcgRecordSummary, listEcgRecords, loadEcgRecord } from "../lib/ecg-records";
import { formatDateTime, reportT } from "../lib/ecg-report";
import { EcgReportView } from "./EcgReportView";

type Props = { visible: boolean; onClose: () => void };

// Saqlangan EKG yozuvlari (History sahifasidagi EKG kartasi): ro'yxat, bittasi bosilsa shu sheet ichida uning
// to'liq hisoboti. Bitta Modal: ikkita sheet ketma-ket ochilib-yopilmaydi.
export function EcgRecordsSheet({ visible, onClose }: Props) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const [items, setItems] = useState<EcgRecordSummary[] | null>(null);
  const [record, setRecord] = useState<EcgRecord | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Har ochilishda ro'yxatdan boshlanadi (render paytida holatni moslash: effektsiz).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setRecord(null);
      setFailed(false);
    }
  }

  useEffect(() => {
    if (!visible) return;
    listEcgRecords().then(setItems);
  }, [visible]);

  const open = async (id: string) => {
    setLoadingId(id);
    setFailed(false);
    const loaded = await loadEcgRecord(id);
    setLoadingId(null);
    if (loaded) setRecord(loaded);
    else setFailed(true);
  };

  return (
    <CusBottomSheet
      visible={visible}
      onClose={onClose}
      initialSnap="full"
      title={record ? reportT("ecg.report.title") : t("ecg.records")}
    >
      {record ? (
        <View className="gap-3">
          <View className="items-start">
            <CusButton title={t("ecg.backToList")} variant="ghost" size="sm" onPress={() => setRecord(null)} />
          </View>
          <EcgReportView record={record} />
        </View>
      ) : items === null ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <CusText tone="muted" className="p-4 text-center">
          {t("ecg.noRecords")}
        </CusText>
      ) : (
        <View>
          {failed ? (
            <CusText tone="danger" className="pb-2 text-center">
              {t("ecg.openError")}
            </CusText>
          ) : null}
          {items.map((item) => (
            <CusListItem
              key={item.id}
              title={formatDateTime(item.at)}
              subtitle={[
                `${item.value} ${t("ecg.unit.bpm")}`,
                t("ecg.seconds", { s: item.durationS }),
                item.qtc !== undefined ? `QTc ${item.qtc} ${t("ecg.unit.ms")}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              left={<Octicons name="graph" size={18} color={muted} />}
              right={
                loadingId === item.id ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Octicons name="chevron-right" size={18} color={muted} />
                )
              }
              onPress={() => open(item.id)}
            />
          ))}
        </View>
      )}
    </CusBottomSheet>
  );
}
