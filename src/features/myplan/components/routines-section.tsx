import { View } from "react-native";

import { CusButton, CusCard, CusEmptyState, CusText } from "@/components/ui";
import type { Metric, MetricKey } from "@/features/home/api/get-metrics";

import type { Plan } from "../api/plans";
import { type Routine, ROUTINE_KEYS } from "../api/routines";
import { DAY_END } from "../lib/schedule";
import { PlanCard } from "./plan-card";

type Props = {
  routines: Routine[];
  metrics: Metric[];
  now: Date;
  onAdd: () => void;
  onEdit: (key: MetricKey) => void;
  onToggle: (key: MetricKey) => void;
};

// "Rutinalar": bo'sh boshlanadi; "Qo'shish" → o'lchov → interval → saqlash. Rutina kartasi: o'lchov, interval, kuniga
// nechta o'lchov va keyingi o'lchov vaqti. Jadvalni ilova yuritadi (lib/routine-runner.ts).
export function RoutinesSection({ routines, metrics, now, onAdd, onEdit, onToggle }: Props) {
  const canAdd = ROUTINE_KEYS.some((k) => !routines.some((r) => r.key === k));

  return (
    <View className="gap-4">
      <CusText tone="muted">Ilova soatdan shu jadval bo&apos;yicha o&apos;lchashni so&apos;raydi va natijani saqlaydi.</CusText>

      {routines.length === 0 ? (
        <CusCard>
          <CusEmptyState
            title="Hali rutina yo'q"
            description="Qaysi ko'rsatkich qancha vaqtda bir marta o'lchanishini belgilang"
            actionLabel="Birinchi rutinani qo'shish"
            onAction={onAdd}
          />
        </CusCard>
      ) : (
        <>
          {routines.map((r) => {
            const metric = metrics.find((m) => m.key === r.key);
            if (!metric) return null;
            // Rutina kun bo'yi ishlaydi: PlanCard shu ko'rinishdagi `Plan` bilan chiziladi.
            const plan: Plan = { key: r.key, intervalMin: r.intervalMin, enabled: r.enabled, startMin: 0, endMin: DAY_END };
            return (
              <PlanCard
                key={r.key}
                plan={plan}
                metric={metric}
                now={now}
                onEdit={() => onEdit(r.key)}
                onToggle={() => onToggle(r.key)}
              />
            );
          })}
          {canAdd ? <CusButton title="+ Rutina qo'shish" variant="outline" onPress={onAdd} /> : null}
        </>
      )}

      <CusText variant="caption" tone="muted">
        Rutinalar ilova ochiq va soat ulangan bo&apos;lganda ishlaydi. Ilova yopiq bo&apos;lsa, o&apos;lchov bo&apos;lmaydi. Natijalar
        «Tarix» da ko&apos;rinadi.
      </CusText>
    </View>
  );
}
