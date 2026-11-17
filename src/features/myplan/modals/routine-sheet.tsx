import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { CusBottomSheet, CusButton, CusCard, CusChip, CusText } from "@/components/ui";
import type { Metric, MetricKey } from "@/features/home/api/get-metrics";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { INTERVALS, type Routine, ROUTINE_KEYS } from "../api/routines";
import { DAY_END, intervalText, perDay } from "../lib/schedule";

const GAP = 8;
const PADDING = 16; // sheet ichki chetlari (CusBottomSheet: p-4)
const DEFAULT_INTERVAL = 30;

type Props = {
  visible: boolean;
  onClose: () => void;
  metrics: Metric[];
  routines: Routine[];
  editingKey: MetricKey | null; // null = yangi rutina
  onSave: (routine: Routine) => void;
  onDelete: (key: MetricKey) => void;
};

/** "5 daq", "1 soat", "2 soat". */
const label = (min: number) => (min >= 60 && min % 60 === 0 ? `${min / 60} soat` : `${min} daq`);

// Rutina qo'shish yoki tahrirlash: 1) o'lchov, 2) necha daqiqada bir marta, 3) saqlash. Ochilganda `key` o'zgartiriladi
// (ota komponentda), shuning uchun qoralama har safar yangi boshlanadi.
export function RoutineSheet({ visible, onClose, metrics, routines, editingKey, onSave, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");

  const editing = editingKey ? routines.find((r) => r.key === editingKey) : undefined;
  const [selectedKey, setSelectedKey] = useState<MetricKey | null>(editingKey);
  const [interval, setIntervalMin] = useState<number>(editing?.intervalMin ?? DEFAULT_INTERVAL);

  const itemWidth = (width - PADDING * 2 - GAP) / 2;
  const selectable = metrics.filter((m) => ROUTINE_KEYS.includes(m.key));
  const selected = metrics.find((m) => m.key === selectedKey);

  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" title={editing ? "Rutinani tahrirlash" : "Yangi rutina"}>
      {/* 1. Nimani o'lchaymiz */}
      <View className="gap-2">
        <CusText variant="heading">1. Nimani o&apos;lchaymiz?</CusText>
        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {selectable.map((m) => {
            const taken = routines.some((r) => r.key === m.key) && m.key !== editingKey;
            // Tahrirlashda o'lchov o'zgarmaydi; yangi rutinada rutinasi bor o'lchovlar tanlanmaydi
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
        <CusText variant="caption" tone="muted">
          EKG va tana tarkibi rutinaga qo&apos;shilmaydi: ular uchun barmoqni elektrodga qo&apos;yish kerak.
        </CusText>
      </View>

      {/* 2. Vaqt */}
      <View className="gap-2">
        <CusText variant="heading">2. Necha daqiqada bir marta?</CusText>
        <View className="flex-row flex-wrap gap-2">
          {INTERVALS.map((p) => (
            <CusChip key={p} label={label(p)} selected={interval === p} onPress={() => setIntervalMin(p)} />
          ))}
        </View>
      </View>

      {/* Xulosa */}
      <CusCard className="flex-row items-center gap-2">
        <Octicons name="info" size={16} color={primary} />
        <CusText className="flex-1">
          {selected
            ? `${selected.title} har ${intervalText(interval)} o'lchanadi: kuniga ~${perDay(interval, 0, DAY_END)} ta.`
            : "Avval o'lchovni tanlang."}
        </CusText>
      </CusCard>

      {/* 3. Saqlash */}
      <CusButton
        title="Saqlash"
        disabled={!selected}
        onPress={() => {
          if (!selectedKey) return;
          onSave({ key: selectedKey, intervalMin: interval, enabled: editing?.enabled ?? true });
          onClose();
        }}
      />
      {editing ? (
        <CusButton
          title="Rutinani o'chirish"
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
