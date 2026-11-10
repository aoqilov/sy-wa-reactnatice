import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusButton, CusCard, CusEmptyState, CusScrollView, CusText } from "@/components/ui";
import type { MetricKey } from "@/features/home/api/get-metrics";
import { useMetrics } from "@/features/home/hooks/use-metrics";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import type { SendFailure } from "./api/plans";
import { PlanCard } from "./components/plan-card";
import { RemindersSection } from "./components/reminders-section";
import { SyncStatus } from "./components/sync-status";
import { useNow } from "./hooks/use-now";
import { usePlans } from "./hooks/use-plans";
import { useReminders } from "./hooks/use-reminders";
import { PlanSheet } from "./modals/plan-sheet";
import { ReminderSheet } from "./modals/reminder-sheet";

const SEND_ERROR: Record<SendFailure, string> = {
  notReady: "Soat ulanmagan. Ulanib, qayta yuboring.",
  busy: "Hozir o'lchov ketyapti. Tugagach qayta yuboring.",
  notRead: "Soat jadvali hali o'qilmagan. Qayta o'qib, keyin yuboring.",
  rejected: "Soat ba'zi rejalarni saqlamadi",
};

// "Rejam": soatning o'z avto-o'lchash jadvali. Soat shu jadval bo'yicha o'zi o'lchaydi (telefon yoki ilova yopiq bo'lsa
// ham). Sahifa ochilganda jadval soatdan o'qiladi, o'zgarishlar "Soatga yuborish" bilan soatga yoziladi.
export function FeatureMyPlan() {
  const { metrics, loading } = useMetrics();
  const p = usePlans();
  const reminders = useReminders();
  const [reminderSheet, setReminderSheet] = useState({ open: false, nonce: 0 });
  const now = useNow();
  const tabBarSpace = useTabBarSpace();

  // Sheet: ochiq-yopiqligi, qaysi reja tahrirlanayotgani va `nonce`.
  // nonce har ochilganda o'zgaradi, shunda sheet qoralamasi yangidan boshlanadi.
  const [sheet, setSheet] = useState<{ open: boolean; editingKey: MetricKey | null; nonce: number }>({
    open: false,
    editingKey: null,
    nonce: 0,
  });
  const openSheet = (editingKey: MetricKey | null) => setSheet((s) => ({ open: true, editingKey, nonce: s.nonce + 1 }));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const planned = (key: MetricKey) => p.plans.some((x) => x.key === key);
  const canAdd = p.caps.some((c) => !planned(c.key));
  const failedTitles = p.error?.keys
    .map((k) => metrics.find((m) => m.key === k)?.title)
    .filter(Boolean)
    .join(", ");

  return (
    <View className="flex-1 bg-background">
      <CusScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4"
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <CusText variant="title">Rejam</CusText>
          <CusText tone="muted">
            Soat shu jadval bo&apos;yicha o&apos;zi o&apos;lchaydi: telefon yoki ilova yopiq bo&apos;lsa ham.
          </CusText>
        </View>

        <SyncStatus
          connected={p.connected}
          reading={p.reading}
          loaded={p.loaded}
          changes={p.changes}
          activeCount={p.activeCount}
          onRefresh={p.read}
        />

        {!p.loaded ? (
          p.reading ? (
            <CusCard className="items-center gap-2 py-6">
              <ActivityIndicator />
              <CusText tone="muted">Soatdagi jadval o&apos;qilmoqda…</CusText>
            </CusCard>
          ) : (
            <CusCard className="gap-2">
              <CusText className="font-semibold">Soat jadvali o&apos;qilmadi</CusText>
              <CusText variant="caption" tone="muted">
                {p.connected
                  ? "Soat avto-o'lchash sozlamasini yubormadi. Qayta urinib ko'ring."
                  : "Soat ulanmagan. Ulangach jadval o'qiladi."}
              </CusText>
              {p.connected ? <CusButton title="Qayta o'qish" variant="outline" size="sm" onPress={p.read} /> : null}
            </CusCard>
          )
        ) : p.caps.length === 0 ? (
          <CusCard>
            <CusEmptyState
              title="Avto-o'lchash yo'q"
              description="Bu soat ko'rsatkichlarni jadval bo'yicha o'zi o'lchashni qo'llab-quvvatlamaydi."
            />
          </CusCard>
        ) : p.plans.length === 0 ? (
          <CusCard>
            <CusEmptyState
              title="Hali reja yo'q"
              description="Soat avtomatik o'lchashi uchun reja qo'shing"
              actionLabel="Birinchi rejani qo'shish"
              onAction={() => openSheet(null)}
            />
          </CusCard>
        ) : (
          <>
            {p.plans.map((plan) => {
              const metric = metrics.find((m) => m.key === plan.key);
              if (!metric) return null;
              return (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  metric={metric}
                  now={now}
                  onEdit={() => openSheet(plan.key)}
                  onToggle={() => p.toggle(plan.key)}
                />
              );
            })}
            {canAdd ? <CusButton title="+ Reja qo'shish" variant="outline" onPress={() => openSheet(null)} /> : null}
          </>
        )}

        {p.error ? (
          <CusText tone="danger" className="text-center">
            {SEND_ERROR[p.error.reason]}
            {p.error.reason === "rejected" && failedTitles ? `: ${failedTitles}` : ""}
          </CusText>
        ) : null}

        {/* Soatga yuborish: faqat o'zgarish bo'lganda */}
        {p.changes > 0 ? (
          <View className="gap-2">
            <CusButton
              title={`Soatga yuborish (${p.changes} ta o'zgarish)`}
              loading={p.sending}
              disabled={!p.connected}
              onPress={p.send}
            />
            <CusButton title="Bekor qilish" variant="ghost" size="sm" disabled={p.sending} onPress={p.discard} />
          </View>
        ) : null}

        <RemindersSection
          list={reminders.list}
          busy={reminders.busy}
          error={reminders.error}
          supported={reminders.supported}
          onAdd={() => setReminderSheet((s) => ({ open: true, nonce: s.nonce + 1 }))}
          onRemove={(id) => void reminders.remove(id)}
          onToggle={(id, open) => void reminders.setOpen(id, open)}
          onRetry={() => void reminders.read()}
        />
      </CusScrollView>

      <PlanSheet
        key={sheet.nonce}
        visible={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        metrics={metrics}
        plans={p.plans}
        caps={p.caps}
        editingKey={sheet.editingKey}
        onSave={p.upsert}
        onDelete={p.remove}
      />

      <ReminderSheet
        key={`reminder-${reminderSheet.nonce}`}
        visible={reminderSheet.open}
        onClose={() => setReminderSheet((s) => ({ ...s, open: false }))}
        metrics={metrics}
        busy={reminders.busy}
        onAdd={reminders.add}
      />
    </View>
  );
}
