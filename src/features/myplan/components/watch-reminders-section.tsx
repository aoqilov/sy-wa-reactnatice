import { ActivityIndicator, Pressable, View } from "react-native";

import { CusButton, CusCard, CusDivider, CusSwitch, CusText } from "@/components/ui";

import type { HealthRemind, HealthType, HeartWarning, LongSeat, WatchReminderFailure, WatchReminders } from "../api/watch-reminders";
import { hhmm } from "../lib/schedule";

export const HEALTH_LABEL: Record<HealthType, string> = {
  SEDENTARY: "Harakatsizlik (Get up and move)",
  DRINK_WATER: "Suv ichish",
  OVERLOOK: "Ko'zga dam berish",
  SPORTS: "Sport",
  TAKE_MEDICINE: "Dori ichish",
  READING: "Kitob o'qish",
  GOING_OUT: "Tashqariga chiqish",
  WASH: "Qo'l yuvish",
};

const ERROR_TEXT: Record<WatchReminderFailure, string> = {
  notReady: "Soat ulanmagan. Ulangach eslatmalar shu yerda chiqadi.",
  busy: "Soat hozir band (o'lchov yoki sinxron ketyapti). Birozdan keyin qayta urinib ko'ring.",
  outdated: "Bu bo'lim uchun ilovani yangilang.",
  failed: "Soat o'zgarishni saqlamadi. Qayta urinib ko'ring.",
  noReply: "Soat eslatmalar haqida javob bermadi. Bu soat ularni qo'llamasligi mumkin.",
};

export type EditTarget =
  | { kind: "health"; value: HealthRemind }
  | { kind: "longSeat"; value: LongSeat }
  | { kind: "heart"; value: HeartWarning };

type Props = {
  data: WatchReminders | null;
  loading: boolean;
  saving: boolean;
  error: WatchReminderFailure | null;
  saveError: WatchReminderFailure | null;
  connected: boolean;
  onRetry: () => void;
  onEdit: (t: EditTarget) => void;
  onToggle: (t: EditTarget) => void;
};

/** "Har 60 daqiqada · 09:00–18:00" */
const schedule = (minutes: number, start: number, end: number) => `Har ${minutes} daqiqada · ${hhmm(start)}–${hhmm(end)}`;

// "Rejam → Soatda": soatning o'zida saqlangan eslatmalar (salomatlik eslatmalari, harakatsizlik, puls ogohlantirishi).
// Kalit — tez yoqish/o'chirish; qatorni bosish — vaqt va oraliqni o'zgartirish. Har bir o'zgarish darhol soatga yoziladi.
export function WatchRemindersSection({ data, loading, saving, error, saveError, connected, onRetry, onEdit, onToggle }: Props) {
  const rows: { key: string; title: string; subtitle: string; target: EditTarget; on: boolean }[] = [];
  for (const h of data?.health ?? []) {
    rows.push({ key: h.type, title: HEALTH_LABEL[h.type], subtitle: schedule(h.interval, h.start, h.end), target: { kind: "health", value: h }, on: h.on });
  }
  if (data?.longSeat) {
    const l = data.longSeat;
    rows.unshift({
      key: "longSeat",
      title: HEALTH_LABEL.SEDENTARY,
      subtitle: `${l.threshold} daqiqa harakatsiz qolsangiz · ${hhmm(l.start)}–${hhmm(l.end)}`,
      target: { kind: "longSeat", value: l },
      on: l.on,
    });
  }
  const heart = data?.heart ?? null;

  return (
    <View className="gap-3">
      <CusText tone="muted">
        Soatning o&apos;zida saqlangan eslatmalar. Ular telefon va ilovasiz ham ishlaydi. O&apos;zgartirsangiz, darhol soatga
        yoziladi.
      </CusText>

      {!connected && !data ? (
        <CusCard>
          <CusText tone="muted">{ERROR_TEXT.notReady}</CusText>
        </CusCard>
      ) : loading && !data ? (
        <CusCard className="items-center gap-2 py-6">
          <ActivityIndicator />
          <CusText tone="muted">Soatdagi eslatmalar o&apos;qilmoqda…</CusText>
        </CusCard>
      ) : !data ? (
        <CusCard className="gap-3">
          <CusText>{error ? ERROR_TEXT[error] : "Eslatmalar hali o'qilmadi."}</CusText>
          {connected ? <CusButton title="Qayta o'qish" variant="outline" size="sm" onPress={onRetry} /> : null}
        </CusCard>
      ) : (
        <>
          {rows.length > 0 ? (
            <CusCard className="p-0">
              {rows.map((r, i) => (
                <View key={r.key}>
                  {i > 0 ? <CusDivider /> : null}
                  <Row title={r.title} subtitle={r.subtitle} on={r.on} disabled={saving} onPress={() => onEdit(r.target)} onToggle={() => onToggle(r.target)} />
                </View>
              ))}
            </CusCard>
          ) : null}

          {heart ? (
            <CusCard className="p-0">
              <Row
                title="Puls ogohlantirishi"
                subtitle={`Puls ${heart.low} dan past yoki ${heart.high} dan yuqori bo'lsa`}
                on={heart.on}
                disabled={saving}
                onPress={() => onEdit({ kind: "heart", value: heart })}
                onToggle={() => onToggle({ kind: "heart", value: heart })}
              />
            </CusCard>
          ) : null}

          {saveError ? (
            <CusText tone="danger" className="text-center">
              {ERROR_TEXT[saveError]}
            </CusText>
          ) : null}

          <CusButton title={loading ? "O'qilmoqda…" : "Soatdan qayta o'qish"} variant="ghost" size="sm" disabled={loading || saving || !connected} onPress={onRetry} />
        </>
      )}
    </View>
  );
}

function Row({
  title,
  subtitle,
  on,
  disabled,
  onPress,
  onToggle,
}: {
  title: string;
  subtitle: string;
  on: boolean;
  disabled: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} className="flex-1 active:opacity-70">
        <CusText className="font-semibold">{title}</CusText>
        <CusText variant="caption" tone="muted">
          {on ? subtitle : "O'chiq"}
        </CusText>
      </Pressable>
      <CusSwitch value={on} onValueChange={onToggle} disabled={disabled} />
    </View>
  );
}
