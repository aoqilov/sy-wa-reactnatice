import Octicons from "@expo/vector-icons/Octicons";
import { ActivityIndicator, Pressable, View } from "react-native";

import { CusButton, CusCard, CusDivider, CusSwitch, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { MAX_REMINDERS, type Reminder, type ReminderFailure } from "../api/reminders";
import { hhmm } from "../lib/schedule";

const ERROR: Record<ReminderFailure, string> = {
  notReady: "Soat ulanmagan.",
  busy: "Hozir o'lchov ketyapti. Tugagach qayta urinib ko'ring.",
  unsupported: "Bu soatda eslatma (matnli budilnik) yo'q.",
  full: `Soatda eslatmalar to'lgan (ko'pi bilan ${MAX_REMINDERS} ta). Birini o'chiring.`,
  failed: "Soat amalni bajarmadi. Qayta urinib ko'ring.",
  noReply: "Soat javob bermadi. Qayta urinib ko'ring.",
  outdated: "Eslatmalar uchun ilovani yangilang.",
};

type Props = {
  list: Reminder[] | null;
  busy: boolean;
  error: ReminderFailure | null;
  supported: boolean;
  onAdd: () => void;
  onRemove: (id: number) => void;
  onToggle: (id: number, open: boolean) => void;
  onRetry: () => void;
};

// "Soatdagi eslatmalar": avtomatik o'lchab bo'lmaydigan o'lchovlar (EKG va h.k.) uchun soat belgilangan vaqtda
// o'zi eslatadi. Ro'yxat soatdagi matnli budilniklar (boshqa ilovadan qo'yilganlari ham ko'rinadi).
export function RemindersSection({ list, busy, error, supported, onAdd, onRemove, onToggle, onRetry }: Props) {
  const muted = useThemeColor("muted", "#6B7385");
  const danger = useThemeColor("danger", "#E5484D");

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <CusText variant="heading" className="flex-1">
          Soatdagi eslatmalar
        </CusText>
        {busy ? <ActivityIndicator size="small" /> : null}
      </View>
      <CusText variant="caption" tone="muted">
        Soat avtomatik o&apos;lchay olmaydigan o&apos;lchovlar uchun (masalan EKG: barmoqni elektrodga qo&apos;yish kerak). Soat har
        kuni shu vaqtda eslatadi, ilova yopiq bo&apos;lsa ham.
      </CusText>

      {!supported ? (
        <CusText tone="muted">{ERROR.unsupported}</CusText>
      ) : list === null ? (
        <CusCard className="items-center gap-2 py-4">
          {busy ? (
            <CusText tone="muted">Soatdan o&apos;qilmoqda…</CusText>
          ) : (
            <CusButton title="Eslatmalarni o'qish" variant="outline" size="sm" onPress={onRetry} />
          )}
        </CusCard>
      ) : (
        <>
          {list.length > 0 ? (
            <CusCard className="p-0">
              {list.map((r, i) => (
                <View key={r.id}>
                  {i > 0 ? <CusDivider /> : null}
                  <View className={`flex-row items-center gap-3 px-4 py-3 ${r.open ? "" : "opacity-60"}`}>
                    <CusText className="text-xl font-bold">{hhmm(r.hour * 60 + r.minute)}</CusText>
                    <CusText className="flex-1" numberOfLines={2}>
                      {r.content || "Budilnik"}
                    </CusText>
                    <CusSwitch value={r.open} onValueChange={(v) => onToggle(r.id, v)} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Eslatmani o'chirish"
                      disabled={busy}
                      onPress={() => onRemove(r.id)}
                      hitSlop={8}
                    >
                      <Octicons name="trash" size={18} color={busy ? muted : danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </CusCard>
          ) : (
            <CusText tone="muted">Hali eslatma yo&apos;q.</CusText>
          )}
          <CusButton
            title={`+ Eslatma qo'shish (${list.length}/${MAX_REMINDERS})`}
            variant="outline"
            disabled={busy || list.length >= MAX_REMINDERS}
            onPress={onAdd}
          />
        </>
      )}

      {error && error !== "unsupported" ? (
        <CusText variant="caption" tone="danger">
          {ERROR[error]}
        </CusText>
      ) : null}
    </View>
  );
}
