import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusButton, CusCard, CusEmptyState, CusScrollView, CusText } from "@/components/ui";
import type { MetricKey } from "@/features/home/api/get-metrics";
import { useMetrics } from "@/features/home/hooks/use-metrics";

import { PlanCard } from "./components/plan-card";
import { SyncStatus } from "./components/sync-status";
import { useNow } from "./hooks/use-now";
import { usePlans } from "./hooks/use-plans";
import { PlanSheet } from "./modals/plan-sheet";

export function FeatureMyPlan() {
  const { metrics, loading } = useMetrics();
  const { plans, upsert, remove, toggle, send, sending, changes, activeCount } = usePlans();
  const now = useNow();

  // Sheet: ochiq-yopiqligi, qaysi reja tahrirlanayotgani va `nonce`.
  // nonce har ochilganda o'zgaradi, shunda sheet qoralamasi yangidan boshlanadi.
  const [sheet, setSheet] = useState<{ open: boolean; editingKey: MetricKey | null; nonce: number }>({
    open: false,
    editingKey: null,
    nonce: 0,
  });
  const openSheet = (editingKey: MetricKey | null) =>
    setSheet((s) => ({ open: true, editingKey, nonce: s.nonce + 1 }));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <CusScrollView contentContainerClassName="gap-4 p-4 pb-32" keyboardShouldPersistTaps="handled">
        <View className="gap-1">
          <CusText variant="title">My plan</CusText>
          <CusText tone="muted">Soat shu jadval bo&apos;yicha o&apos;zi o&apos;lchaydi.</CusText>
        </View>

        <SyncStatus changes={changes} activeCount={activeCount} />

        {plans.length === 0 ? (
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
            {plans.map((p) => {
              const metric = metrics.find((m) => m.key === p.key);
              if (!metric) return null;
              return (
                <PlanCard
                  key={p.key}
                  plan={p}
                  metric={metric}
                  now={now}
                  onEdit={() => openSheet(p.key)}
                  onToggle={() => toggle(p.key)}
                />
              );
            })}
            {plans.length < metrics.length ? (
              <CusButton title="+ Reja qo'shish" variant="outline" onPress={() => openSheet(null)} />
            ) : null}
          </>
        )}

        {/* Soatga yuborish: faqat o'zgarish bo'lganda */}
        {changes > 0 ? (
          <CusButton title={`Soatga yuborish (${changes} ta o'zgarish)`} loading={sending} onPress={send} />
        ) : null}
      </CusScrollView>

      <PlanSheet
        key={sheet.nonce}
        visible={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        metrics={metrics}
        plans={plans}
        editingKey={sheet.editingKey}
        onSave={upsert}
        onDelete={remove}
      />
    </View>
  );
}
