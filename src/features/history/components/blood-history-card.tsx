import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { LayoutAnimation, Pressable, View } from "react-native";

import { CusBadge, CusCard, CusText } from "@/components/ui";
import { type BloodPartKey, bloodRows, bloodSummary, formatBlood } from "@/features/home/lib/blood";
import type { BloodParts } from "@/shared/watch/measure";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { type HistoryReading, SOURCE_LABEL } from "../api/get-history";
import type { Summary } from "../lib/summarize";
import { STATUS } from "./history-card";

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
function whenText(at: number, now: Date) {
  const d = new Date(at);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Bugun ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Kecha ${time}`;
  return `${d.getDate()}-${MONTHS[d.getMonth()]} ${time}`;
}

const mean = (xs: number[]) => xs.reduce((s, n) => s + n, 0) / xs.length;

type Props = { summary: Summary; now: Date };

// Qon tahlili tarixi: beshta ko'rsatkich — beshta accordion qatori. Yopiq qatorda davr bo'yicha o'rtacha qiymat,
// min/maks va holat; ochilganda shu ko'rsatkichning har bir o'lchovi (vaqti, manbasi, qiymati).
export function BloodHistoryCard({ summary: s, now }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const readings = s.readings.filter((r): r is HistoryReading & { blood: BloodParts } => r.blood !== undefined);
  const [open, setOpen] = useState<BloodPartKey | null>(null);

  const toggle = (key: BloodPartKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === key ? null : key));
  };

  // Davr bo'yicha o'rtacha: beshala ko'rsatkich alohida; holat shu o'rtachaga qarab (natija kartasidagi me'yorlar).
  const avg: BloodParts | null = readings.length
    ? {
        uricAcid: mean(readings.map((r) => r.blood.uricAcid)),
        tcho: mean(readings.map((r) => r.blood.tcho)),
        tag: mean(readings.map((r) => r.blood.tag)),
        hdl: mean(readings.map((r) => r.blood.hdl)),
        ldl: mean(readings.map((r) => r.blood.ldl)),
      }
    : null;
  const rows = avg ? bloodRows(avg) : [];
  const overall = avg ? bloodSummary(avg) : null;

  return (
    <CusCard className={`gap-3 ${readings.length === 0 ? "opacity-60" : ""}`}>
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
          <Octicons name={s.meta.icon} size={16} color={primary} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {s.meta.title}
        </CusText>
        {overall ? <CusBadge label={STATUS[overall.status].label} tone={STATUS[overall.status].tone} /> : null}
      </View>

      {readings.length === 0 ? (
        <CusText tone="muted">Bu davrda o&apos;lchov yo&apos;q</CusText>
      ) : (
        <>
          <CusText variant="caption" tone="muted">
            {readings.length} ta o&apos;lchov · oxirgisi {whenText(readings[0].at, now)} · qiymatlar davr bo&apos;yicha
            o&apos;rtacha
          </CusText>

          <View className="overflow-hidden rounded-xl border border-border">
            {rows.map((row, i) => {
              const key = row.key;
              const values = readings.map((r) => r.blood[key]);
              const expanded = open === key;
              return (
                <View key={key} className={i > 0 ? "border-t border-border" : ""}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => toggle(key)}
                    className="flex-row items-center gap-3 px-3 py-3 active:bg-surface-alt"
                  >
                    <View className="flex-1 gap-0.5">
                      <CusText className="font-semibold" numberOfLines={1}>
                        {row.label}
                      </CusText>
                      <CusText variant="caption" tone="muted" numberOfLines={1}>
                        Me&apos;yor: {row.normal} {row.unit}
                      </CusText>
                    </View>
                    <View className="items-end gap-0.5">
                      <CusText>
                        <CusText className="text-lg font-bold" tone={STATUS[row.status].tone}>
                          {row.value}
                        </CusText>
                        <CusText variant="caption" tone="muted">
                          {" "}
                          {row.unit}
                        </CusText>
                      </CusText>
                      {values.length > 1 ? (
                        <CusText variant="caption" tone="muted">
                          {formatBlood(key, Math.min(...values))}–{formatBlood(key, Math.max(...values))}
                        </CusText>
                      ) : null}
                    </View>
                    <CusText tone="muted">{expanded ? "▴" : "▾"}</CusText>
                  </Pressable>

                  {/* Ochilganda: shu ko'rsatkichning har bir o'lchovi (yangisi tepada) */}
                  {expanded ? (
                    <View className="border-t border-border bg-background px-3 py-1">
                      {readings.map((r) => {
                        const one = bloodRows(r.blood).find((x) => x.key === key);
                        if (!one) return null;
                        return (
                          <View key={r.id} className="flex-row items-center justify-between gap-3 py-2">
                            <CusText variant="caption" tone="muted" className="flex-1" numberOfLines={1}>
                              {whenText(r.at, now)} · {SOURCE_LABEL[r.source]}
                            </CusText>
                            <CusText className="font-semibold" tone={STATUS[one.status].tone}>
                              {one.value}
                            </CusText>
                            <CusBadge label={one.statusLabel} tone={STATUS[one.status].tone} />
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <CusText variant="caption" tone="muted">
            Taxminiy, laboratoriya tahlili o&apos;rnini bosmaydi
          </CusText>
        </>
      )}
    </CusCard>
  );
}
