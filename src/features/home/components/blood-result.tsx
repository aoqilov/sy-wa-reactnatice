import { View } from "react-native";

import { CusBadge, CusCard, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import type { MetricStatus } from "../api/get-metrics";
import type { BloodRow } from "../lib/blood";

const TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};

type Props = { rows: BloodRow[]; updatedAt: string };

// Qon tahlilining oxirgi natijasi: beshta ko'rsatkich bitta kartada (soatning rasmiy ilovasidagi kabi). Har qatorda
// nomi, me'yori, qiymati va holati.
export function BloodResult({ rows, updatedAt }: Props) {
  const t = useT();
  return (
    <CusCard className="gap-1 py-3">
      <View className="flex-row items-center justify-between pb-1">
        <CusText variant="heading">Qon tahlili natijasi</CusText>
        <CusText variant="caption" tone="muted">
          {updatedAt}
        </CusText>
      </View>
      {rows.map((r, i) => (
        <View
          key={r.key}
          className={`flex-row items-center justify-between gap-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}
        >
          <View className="shrink gap-0.5">
            <CusText className="font-semibold">{r.label}</CusText>
            <CusText variant="caption" tone="muted">
              Me&apos;yor: {r.normal} {r.unit}
            </CusText>
          </View>
          <View className="items-end gap-1">
            <CusText>
              <CusText className="text-lg font-bold" tone={TONE[r.status]}>
                {r.value}
              </CusText>
              <CusText variant="caption" tone="muted">
                {" "}
                {r.unit}
              </CusText>
            </CusText>
            <CusBadge label={r.statusLabel} tone={TONE[r.status]} className="self-end" />
          </View>
        </View>
      ))}
      <CusText variant="caption" tone="muted" className="pt-1">
        {t("measure.note.blood")}
      </CusText>
    </CusCard>
  );
}
