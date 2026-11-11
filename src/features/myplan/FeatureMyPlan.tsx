import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusButton, CusCard, CusEmptyState, CusMenuTabs, CusScrollView, CusText } from "@/components/ui";
import type { MetricKey } from "@/features/home/api/get-metrics";
import { useMetrics } from "@/features/home/hooks/use-metrics";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import type { SendFailure } from "./api/plans";
import { PlanCard } from "./components/plan-card";
import { RemindersSection } from "./components/reminders-section";
import { RoutinesSection } from "./components/routines-section";
import { SyncStatus } from "./components/sync-status";
import { useNow } from "./hooks/use-now";
import { usePlans } from "./hooks/use-plans";
import { useReminders } from "./hooks/use-reminders";
import { useRoutines } from "./hooks/use-routines";
import { PlanSheet } from "./modals/plan-sheet";
import { ReminderSheet } from "./modals/reminder-sheet";
import { RoutineSheet } from "./modals/routine-sheet";

const SEND_ERROR: Record<SendFailure, string> = {
  notReady: "Soat ulanmagan. Ulanib, qayta yuboring.",
  busy: "Hozir o'lchov ketyapti. Tugagach qayta yuboring.",
  notRead: "Soat jadvali hali o'qilmagan. Qayta o'qib, keyin yuboring.",
  rejected: "Soat ba'zi rejalarni saqlamadi",
};

type TabKey = "notify" | "routines";

// Eslatmalar — oddiy bildirishnomalar: soat belgilangan vaqtda matn ko'rsatib tebranadi.
// Rutinalar — muntazam o'lchash: "o'lchov + necha daqiqada bir marta". Soat intervalni o'zi saqlay olsa (SDK
// `isSupportAutoMeasure`), jadval soatning o'ziga yoziladi; aks holda (S105/E500) jadvalni ilova yuritadi.
const TABS: { label: string; value: TabKey }[] = [
  { label: "Eslatmalar", value: "notify" },
  { label: "Rutinalar", value: "routines" },
];

// "Rejam": ikki tab. "Eslatmalar" — soatdagi matnli eslatmalar, "Rutinalar" — muntazam o'lchash jadvali.
export function FeatureMyPlan() {
  const { metrics, loading } = useMetrics();
  const [tab, setTab] = useState<TabKey>("notify");
  // Soatning o'z jadvali (faqat intervalni qo'llaydigan soatda; Rutinalar tabi ochiqligida soatdan o'qiladi).
  const p = usePlans(tab === "routines");
  // Ilova yuritadigan rutinalar (telefonda saqlanadi).
  const routines = useRoutines();
  const [routineSheet, setRoutineSheet] = useState<{ open: boolean; editingKey: MetricKey | null; nonce: number }>({
    open: false,
    editingKey: null,
    nonce: 0,
  });
  const openRoutineSheet = (editingKey: MetricKey | null) =>
    setRoutineSheet((s) => ({ open: true, editingKey, nonce: s.nonce + 1 }));
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
      <View className="px-4 pb-3 pt-4">
        <CusText variant="title">Rejam</CusText>
      </View>
      <CusMenuTabs tabs={TABS} value={tab} onChange={(v) => setTab(v as TabKey)} />

      <CusScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4"
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "notify" ? (
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
        ) : !p.supported ? (
          // Soat intervalli jadvalni qo'llamaydi (S105/E500): soatdan so'ramaymiz (SDK "This feature is not supported"
          // Toast'ini ko'rsatib, javob bermaydi). Jadvalni ilova yuritadi (lib/routine-runner.ts).
          <RoutinesSection
            routines={routines.routines}
            metrics={metrics}
            now={now}
            onAdd={() => openRoutineSheet(null)}
            onEdit={openRoutineSheet}
            onToggle={routines.toggle}
          />
        ) : (
          <>
            <CusText tone="muted">
              Soat shu jadval bo&apos;yicha o&apos;zi o&apos;lchaydi: telefon yoki ilova yopiq bo&apos;lsa ham.
            </CusText>

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
                      ? "Soat avto-o'lchash sozlamasini yubormadi. Qayta urinib ko'ring. Takrorlansa, bu soat jadvalni qo'llab-quvvatlamasligi mumkin."
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
          </>
        )}
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

      <RoutineSheet
        key={`routine-${routineSheet.nonce}`}
        visible={routineSheet.open}
        onClose={() => setRoutineSheet((s) => ({ ...s, open: false }))}
        metrics={metrics}
        routines={routines.routines}
        editingKey={routineSheet.editingKey}
        onSave={routines.upsert}
        onDelete={routines.remove}
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
