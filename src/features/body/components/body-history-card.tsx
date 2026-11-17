import Octicons from "@expo/vector-icons/Octicons";
import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { useBody } from "../hooks/use-body";
import { whenText } from "../lib/format";

// History ro'yxatidagi "Tana tarkibi" kartasi: oxirgi o'lchov (yog' %, mushak kg, BMI) va o'lchovlar soni.
export function BodyHistoryCard({ onPress }: { onPress: () => void }) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const { entries } = useBody();
  const list = entries ?? [];
  const last = list[0];

  return (
    <CusCard onPress={onPress} className={`gap-3 ${last ? "" : "opacity-60"}`}>
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface-alt">
          <Octicons name="person" size={16} color={muted} />
        </View>
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {t("body.title")}
        </CusText>
        {last ? (
          <CusText variant="caption" tone="muted">
            {whenText(last.at, t)}
          </CusText>
        ) : null}
      </View>

      {!last ? (
        <CusText tone="muted">{t("body.empty.short")}</CusText>
      ) : (
        <>
          <View className="flex-row gap-6">
            <Stat value={`${last.parts.fatPct.toFixed(1)} %`} label={t("body.fatPct")} />
            {last.parts.muscleKg !== undefined ? <Stat value={`${last.parts.muscleKg.toFixed(1)} kg`} label={t("body.muscleKg")} /> : null}
            <Stat value={last.parts.bmi.toFixed(1)} label={t("body.bmi")} />
          </View>
          <View className="flex-row items-center justify-between">
            <CusText variant="caption" tone="muted" className="flex-1">
              {t("body.count", { n: list.length })}
            </CusText>
            <Octicons name="chevron-right" size={16} color={muted} />
          </View>
        </>
      )}
    </CusCard>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <CusText className="text-xl font-bold">{value}</CusText>
      <CusText variant="caption" tone="muted">
        {label}
      </CusText>
    </View>
  );
}
