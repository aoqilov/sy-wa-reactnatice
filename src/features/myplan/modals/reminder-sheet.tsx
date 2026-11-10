import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { CusBottomSheet, CusButton, CusCard, CusChip, CusText } from "@/components/ui";
import type { Metric, MetricKey } from "@/features/home/api/get-metrics";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { hhmm } from "../lib/schedule";

const STEP = 15; // daqiqa
const DAY = 1440;

/** Eslatma matni soat ekranida chiqadi: qisqa bo'lsin. */
export const reminderText = (metric: Metric) => `${metric.title} o'lchash vaqti`;

/** EKG birinchi: u avtomatik o'lchanmaydi, eslatma asosan shu uchun. */
const ORDER: MetricKey[] = ["ecg", "pressurePump", "sugar", "blood", "pulse", "oxygen", "temperature"];

type Props = {
  visible: boolean;
  onClose: () => void;
  metrics: Metric[];
  busy: boolean;
  onAdd: (hour: number, minute: number, content: string) => Promise<boolean>;
};

// Soatga eslatma qo'shish: qaysi o'lchov va qaysi vaqtda (har kuni). Soat shu vaqtda matnni ko'rsatib tebranadi.
export function ReminderSheet({ visible, onClose, metrics, busy, onAdd }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");
  const [key, setKey] = useState<MetricKey>("ecg");
  const [time, setTime] = useState(9 * 60); // 09:00

  const ordered = ORDER.map((k) => metrics.find((m) => m.key === k)).filter((m): m is Metric => !!m);
  const metric = ordered.find((m) => m.key === key) ?? ordered[0];
  const move = (dir: 1 | -1) => setTime((t) => (t + dir * STEP + DAY) % DAY);

  return (
    <CusBottomSheet visible={visible} onClose={onClose} initialSnap="full" title="Soatga eslatma">
      <View className="gap-2">
        <CusText variant="heading">1. Nima uchun eslatma?</CusText>
        <View className="flex-row flex-wrap gap-2">
          {ordered.map((m) => (
            <CusChip key={m.key} label={m.title} selected={m.key === metric?.key} onPress={() => setKey(m.key)} />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <CusText variant="heading">2. Qaysi vaqtda? (har kuni)</CusText>
        <View className="flex-row flex-wrap gap-2">
          {[8 * 60, 9 * 60, 13 * 60, 20 * 60].map((t) => (
            <CusChip key={t} label={hhmm(t)} selected={time === t} onPress={() => setTime(t)} />
          ))}
        </View>
        <View className="flex-row items-center justify-center gap-6">
          <Pressable
            accessibilityLabel="15 daqiqa oldinroq"
            onPress={() => move(-1)}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft"
          >
            <Octicons name="dash" size={20} color={primary} />
          </Pressable>
          <CusText className="text-3xl font-bold" style={{ minWidth: 96, textAlign: "center" }}>
            {hhmm(time)}
          </CusText>
          <Pressable
            accessibilityLabel="15 daqiqa keyinroq"
            onPress={() => move(1)}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface active:bg-primary-soft"
          >
            <Octicons name="plus" size={20} color={primary} />
          </Pressable>
        </View>
      </View>

      <CusCard className="flex-row items-center gap-2">
        <Octicons name="bell" size={16} color={muted} />
        <CusText className="flex-1">
          {metric ? `Soat har kuni ${hhmm(time)} da "${reminderText(metric)}" deb eslatadi.` : "O'lchovni tanlang."}
        </CusText>
      </CusCard>

      <CusButton
        title="Soatga qo'shish"
        loading={busy}
        disabled={!metric}
        onPress={async () => {
          if (!metric) return;
          const ok = await onAdd(Math.floor(time / 60), time % 60, reminderText(metric));
          if (ok) onClose();
        }}
      />
    </CusBottomSheet>
  );
}
