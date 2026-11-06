import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { CusBottomSheet, CusButton, CusCard, CusChip, CusText } from "@/components/ui";
import type { Metric, MetricKey } from "@/features/home/api/get-metrics";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { Plan } from "../api/plans";
import { intervalText, perDay } from "../lib/schedule";

const PRESETS = [5, 10, 15, 30, 60, 120]; // tayyor intervallar (daqiqa)
const MIN = 1;
const MAX = 1440; // 24 soat
const GAP = 8;
const PADDING = 16; // sheet ichki chetlari (CusBottomSheet: p-4)

type Props = {
  visible: boolean;
  onClose: () => void;
  metrics: Metric[];
  plans: Plan[];
  editingKey: MetricKey | null; // null = yangi reja
  onSave: (plan: Plan) => void;
  onDelete: (key: MetricKey) => void;
};

// Reja qo'shish yoki tahrirlash. Ochilganda `key` o'zgartiriladi (ota komponentda), shuning uchun
// qoralama (draft) har safar yangi boshlanadi.
export function PlanSheet({ visible, onClose, metrics, plans, editingKey, onSave, onDelete }: Props) {
  const { width } = useWindowDimensions();
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");

  const editing = editingKey ? plans.find((p) => p.key === editingKey) : undefined;
  const [selectedKey, setSelectedKey] = useState<MetricKey | null>(editingKey);
  const [interval, setIntervalMin] = useState(editing?.intervalMin ?? 30);

  const itemWidth = (width - PADDING * 2 - GAP) / 2;
  const selected = metrics.find((m) => m.key === selectedKey);

  // Tugmalar qadami: 60 gacha 5 daqiqa, 60 dan keyin 15 daqiqa. 60 ning o'zida yo'nalishga qarab (55 <-> 60 <-> 75).
  const step = (dir: 1 | -1) => {
    const size = (dir === 1 ? interval >= 60 : interval > 60) ? 15 : 5;
    setIntervalMin((v) => Math.min(MAX, Math.max(MIN, v + dir * size)));
  };

  return (
    <CusBottomSheet
      visible={visible}
      onClose={onClose}
      initialSnap="full"
      title={editing ? "Rejani tahrirlash" : "Yangi reja"}
    >
      {/* 1. Nimani o'lchaymiz */}
      <View className="gap-2">
        <CusText variant="heading">1. Nimani o&apos;lchaymiz?</CusText>
        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {metrics.map((m) => {
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
                <CusText
                  variant="caption"
                  tone={active ? "primary" : "default"}
                  className="flex-1 font-semibold"
                  numberOfLines={1}
                >
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
      </View>

      {/* 2. Interval */}
      <View className="gap-3">
        <CusText variant="heading">2. Necha daqiqada bir marta?</CusText>

        <View className="flex-row flex-wrap gap-2">
          {PRESETS.map((p) => (
            <CusChip key={p} label={`${p} daq`} selected={interval === p} onPress={() => setIntervalMin(p)} />
          ))}
        </View>

        {/* O'zim tanlayman: − qiymat + */}
        <View className="flex-row items-center justify-center gap-6">
          <Pressable
            accessibilityLabel="Kamaytirish"
            onPress={() => step(-1)}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft"
          >
            <Octicons name="dash" size={20} color={primary} />
          </Pressable>
          <View className="items-center" style={{ minWidth: 96 }}>
            <CusText className="text-3xl font-bold">{interval}</CusText>
            <CusText variant="caption" tone="muted">
              daqiqa
            </CusText>
          </View>
          <Pressable
            accessibilityLabel="Ko'paytirish"
            onPress={() => step(1)}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft"
          >
            <Octicons name="plus" size={20} color={primary} />
          </Pressable>
        </View>

        <CusText variant="caption" tone="muted" className="text-center">
          Kuniga ~{perDay(interval)} ta o&apos;lchov
        </CusText>
      </View>

      {/* Xulosa */}
      <CusCard className="flex-row items-center gap-2">
        <Octicons name="info" size={16} color={primary} />
        <CusText className="flex-1">
          {selected
            ? `${selected.title} har ${intervalText(interval)} o'lchanadi.`
            : "Avval o'lchovni tanlang."}
        </CusText>
      </CusCard>

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
