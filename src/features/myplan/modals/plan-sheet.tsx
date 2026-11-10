import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { CusBottomSheet, CusButton, CusCard, CusChip, CusText } from "@/components/ui";
import type { Metric, MetricKey } from "@/features/home/api/get-metrics";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Plan, PlanCapability } from "../api/plans";
import { DAY_END, hhmm, intervalText, perDay, windowText } from "../lib/schedule";

const PREFERRED = [5, 10, 15, 30, 60, 120, 180, 240]; // tayyor intervallar (daqiqa), soat qadamiga moslab olinadi
const MAX_INTERVAL = 1440;
const WINDOW_STEP = 30; // vaqt oynasi chegaralari 30 daqiqalik qadam bilan
const GAP = 8;
const PADDING = 16; // sheet ichki chetlari (CusBottomSheet: p-4)

type Props = {
  visible: boolean;
  onClose: () => void;
  metrics: Metric[];
  plans: Plan[];
  /** Soat qo'llab-quvvatlagan o'lchovlar va ularning chegaralari: faqat shular tanlanadi. */
  caps: PlanCapability[];
  editingKey: MetricKey | null; // null = yangi reja
  onSave: (plan: Plan) => void;
  onDelete: (key: MetricKey) => void;
};

/** Soat qadamiga karrali va 1 kungacha bo'lgan tayyor intervallar. */
function presetsFor(step: number) {
  const list = PREFERRED.filter((v) => v >= step && v % step === 0);
  return list.length ? list : [step, step * 2, step * 4].filter((v) => v <= MAX_INTERVAL);
}

/** Intervalni soat qadamiga moslash (eng yaqin karrali). */
const snap = (v: number, step: number) => Math.min(MAX_INTERVAL, Math.max(step, Math.round(v / step) * step));

// Reja qo'shish yoki tahrirlash. Ochilganda `key` o'zgartiriladi (ota komponentda), shuning uchun qoralama (draft)
// har safar yangi boshlanadi. Tanlovlar soat ruxsat bergani bilan cheklangan: o'lchov turlari (avto-o'lchashi
// bor), interval (soat qadamiga karrali), vaqt oynasi (soat chegaralari ichida). Soat interval yoki oynani
// o'zgartirishga ruxsat bermasa, ular faqat ko'rsatiladi.
export function PlanSheet({ visible, onClose, metrics, plans, caps, editingKey, onSave, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");

  const editing = editingKey ? plans.find((p) => p.key === editingKey) : undefined;
  const [selectedKey, setSelectedKey] = useState<MetricKey | null>(editingKey);
  const cap = caps.find((c) => c.key === selectedKey);
  const step = cap?.step ?? 5;
  const [interval, setIntervalMin] = useState(editing?.intervalMin ?? 30);
  const [start, setStart] = useState(editing?.startMin ?? 0);
  const [end, setEnd] = useState(editing?.endMin ?? DAY_END);

  // Tanlangan o'lchov chegaralariga moslangan qiymatlar (o'lchov almashsa ham to'g'ri qoladi).
  const minStart = cap?.minStart ?? 0;
  const maxEnd = cap?.maxEnd ?? DAY_END;
  const intervalValue = snap(interval, step);
  const startValue = Math.max(minStart, Math.min(start, maxEnd - WINDOW_STEP));
  const endValue = Math.min(maxEnd, Math.max(end, startValue + WINDOW_STEP));

  const itemWidth = (width - PADDING * 2 - GAP) / 2;
  const selected = metrics.find((m) => m.key === selectedKey);
  const selectable = metrics.filter((m) => caps.some((c) => c.key === m.key));

  const stepInterval = (dir: 1 | -1) => setIntervalMin(snap(intervalValue + dir * step, step));
  const moveStart = (dir: 1 | -1) => setStart(Math.max(minStart, Math.min(endValue - WINDOW_STEP, startValue + dir * WINDOW_STEP)));
  const moveEnd = (dir: 1 | -1) => setEnd(Math.min(maxEnd, Math.max(startValue + WINDOW_STEP, endValue + dir * WINDOW_STEP)));

  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" title={editing ? "Rejani tahrirlash" : "Yangi reja"}>
      {/* 1. Nimani o'lchaymiz */}
      <View className="gap-2">
        <CusText variant="heading">1. Nimani o&apos;lchaymiz?</CusText>
        {selectable.length === 0 ? (
          <CusText tone="muted">Soat avto-o&apos;lchash imkoniyatlarini hali bermadi.</CusText>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {selectable.map((m) => {
              const taken = plans.some((p) => p.key === m.key) && m.key !== editingKey;
              // Tahrirlashda o'lchov o'zgarmaydi; yangi rejada rejasi bor o'lchovlar tanlanmaydi
              const disabled = editingKey ? m.key !== editingKey : taken;
              const active = m.key === selectedKey;
              return (
                <Pressable
                  key={m.key}
                  disabled={disabled}
                  onPress={() => setSelectedKey(m.key)}
                  style={{ width: itemWidth, opacity: disabled ? 0.4 : 1 }}
                  className={`flex-row items-center gap-2 rounded-xl border px-3 py-3 ${
                    active ? "border-primary bg-primary-soft" : "border-border bg-surface"
                  }`}
                >
                  <Octicons name={m.icon} size={16} color={active ? primary : muted} />
                  <CusText variant="caption" tone={active ? "primary" : "default"} className="flex-1 font-semibold" numberOfLines={1}>
                    {m.title}
                  </CusText>
                  {active ? <Octicons name="check" size={14} color={primary} /> : null}
                  {taken && !editingKey ? (
                    <CusText variant="caption" tone="muted">
                      bor
                    </CusText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
        <CusText variant="caption" tone="muted">
          Faqat soat o&apos;zi avtomatik o&apos;lchay oladigan ko&apos;rsatkichlar. EKG uchun barmoqni elektrodga qo&apos;yish kerak,
          shuning uchun u rejaga qo&apos;shilmaydi.
        </CusText>
      </View>

      {/* 2. Interval */}
      <View className="gap-3">
        <CusText variant="heading">2. Necha daqiqada bir marta?</CusText>
        {cap && !cap.intervalModifiable ? (
          <CusText tone="muted">Soat bu o&apos;lchov uchun oraliqni o&apos;zgartirishga ruxsat bermaydi: har {intervalText(intervalValue)}.</CusText>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2">
              {presetsFor(step).map((p) => (
                <CusChip key={p} label={p >= 60 && p % 60 === 0 ? `${p / 60} soat` : `${p} daq`} selected={intervalValue === p} onPress={() => setIntervalMin(p)} />
              ))}
            </View>
            <Stepper
              value={String(intervalValue)}
              unit="daqiqa"
              onMinus={() => stepInterval(-1)}
              onPlus={() => stepInterval(1)}
              primary={primary}
            />
            <CusText variant="caption" tone="muted" className="text-center">
              Soat qadami: {step} daqiqa
            </CusText>
          </>
        )}
      </View>

      {/* 3. Vaqt oynasi */}
      <View className="gap-3">
        <CusText variant="heading">3. Qaysi vaqtda?</CusText>
        {cap && !cap.slotModifiable ? (
          <CusText tone="muted">Soat vaqt oynasini o&apos;zgartirishga ruxsat bermaydi: {windowText(startValue, endValue)}.</CusText>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2">
              <CusChip
                label="Kun bo'yi"
                selected={startValue === minStart && endValue === maxEnd}
                onPress={() => {
                  setStart(minStart);
                  setEnd(maxEnd);
                }}
              />
              <CusChip
                label="08:00–22:00"
                selected={startValue === Math.max(minStart, 480) && endValue === Math.min(maxEnd, 1320)}
                onPress={() => {
                  setStart(480);
                  setEnd(1320);
                }}
              />
            </View>
            <View className="flex-row justify-around">
              <View className="items-center gap-1">
                <CusText variant="caption" tone="muted">
                  Boshlanishi
                </CusText>
                <Stepper value={hhmm(startValue)} onMinus={() => moveStart(-1)} onPlus={() => moveStart(1)} primary={primary} small />
              </View>
              <View className="items-center gap-1">
                <CusText variant="caption" tone="muted">
                  Tugashi
                </CusText>
                <Stepper value={hhmm(endValue)} onMinus={() => moveEnd(-1)} onPlus={() => moveEnd(1)} primary={primary} small />
              </View>
            </View>
          </>
        )}
      </View>

      {/* Xulosa */}
      <CusCard className="flex-row items-center gap-2">
        <Octicons name="info" size={16} color={primary} />
        <CusText className="flex-1">
          {selected
            ? `${selected.title} har ${intervalText(intervalValue)}, ${windowText(startValue, endValue)} o'lchanadi: kuniga ~${perDay(intervalValue, startValue, endValue)} ta.`
            : "Avval o'lchovni tanlang."}
        </CusText>
      </CusCard>

      <CusButton
        title="Saqlash"
        disabled={!selected || !cap}
        onPress={() => {
          if (!selectedKey) return;
          onSave({
            key: selectedKey,
            intervalMin: intervalValue,
            startMin: startValue,
            endMin: endValue,
            enabled: editing?.enabled ?? true,
          });
          onClose();
        }}
      />
      {editing ? (
        <CusButton
          title="Rejani o'chirish"
          variant="outline"
          onPress={() => {
            onDelete(editing.key);
            onClose();
          }}
        />
      ) : null}
    </CusBottomSheet>
  );
}

type StepperProps = {
  value: string;
  unit?: string;
  onMinus: () => void;
  onPlus: () => void;
  primary: string;
  small?: boolean;
};

/** − qiymat + */
function Stepper({ value, unit, onMinus, onPlus, primary, small = false }: StepperProps) {
  const size = small ? "h-10 w-10" : "h-12 w-12";
  return (
    <View className={`flex-row items-center justify-center ${small ? "gap-3" : "gap-6"}`}>
      <Pressable
        accessibilityLabel="Kamaytirish"
        onPress={onMinus}
        className={`${size} items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft`}
      >
        <Octicons name="dash" size={small ? 16 : 20} color={primary} />
      </Pressable>
      <View className="items-center" style={{ minWidth: small ? 64 : 96 }}>
        <CusText className={small ? "text-xl font-bold" : "text-3xl font-bold"}>{value}</CusText>
        {unit ? (
          <CusText variant="caption" tone="muted">
            {unit}
          </CusText>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel="Ko'paytirish"
        onPress={onPlus}
        className={`${size} items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft`}
      >
        <Octicons name="plus" size={small ? 16 : 20} color={primary} />
      </Pressable>
    </View>
  );
}
