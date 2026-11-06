import { View } from "react-native";

import { CusButton, CusText } from "@/components/ui";

import { Metric } from "../api/get-metrics";

type Props = {
  metric: Metric;
  measuring: boolean;
  secondsLeft: number;
  onStart: () => void;
  onCancel: () => void;
};

const SIZE = 264;
// Doira ichidagi katta son (qiymat va hisoblagich). Uzun qiymat ("128/84") sig'masa, o'zi kichrayadi.
const NUMBER_STYLE = { fontSize: 54, lineHeight: 72, width: SIZE - 40, textAlign: "center" } as const;

// Katta doira: o'lchov nomi, qiymat, birlik va "Boshlash" tugmasi.
// O'lchash vaqtida doira ko'k chiziq bilan o'ralib, qolgan soniyalar ko'rsatiladi.
export function MeasureCircle({
  metric,
  measuring,
  secondsLeft,
  onStart,
  onCancel,
}: Props) {
  return (
    <View
      // O'lcham va doira shakli className ga bog'liq bo'lmasligi uchun style bilan berilgan.
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 8,
      }}
      className={`items-center justify-center gap-1 bg-surface ${
        measuring ? "border-primary" : "border-border"
      }`}
    >
      <CusText tone="muted">{metric.title}</CusText>

      {measuring ? (
        <>
          <CusText className="font-bold" style={NUMBER_STYLE}>
            {secondsLeft}
          </CusText>
          <CusText variant="caption" tone="muted">
            O&apos;lchanmoqda…
          </CusText>
          <CusButton
            title="Bekor qilish"
            variant="outline"
            className="mt-3 h-10"
            onPress={onCancel}
          />
        </>
      ) : (
        <>
          <CusText
            className="font-bold"
            style={NUMBER_STYLE}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {metric.value}
          </CusText>
          <CusText variant="caption" tone="muted">
            {metric.unit}
          </CusText>
          <CusButton
            title="Boshlash"
            className="mt-3 h-10 px-8"
            onPress={onStart}
          />
        </>
      )}
    </View>
  );
}
