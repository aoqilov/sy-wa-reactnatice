import { View } from "react-native";

import { CusBadge, CusBottomSheet, CusCard, CusDivider, CusListItem, CusText } from "@/components/ui";

import { HistoryReading } from "../api/get-history";
import { STATUS } from "../components/history-card";
import { PERIODS, Period, Summary } from "../lib/summarize";

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

const pad = (n: number) => String(n).padStart(2, "0");
const timeOf = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function dayLabel(at: number, now: Date) {
  const d = new Date(at);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, now)) return "Bugun";
  if (sameDay(d, yesterday)) return "Kecha";
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

type Props = {
  summary: Summary;
  period: Period;
  now: Date;
  visible: boolean;
  onClose: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <CusText variant="caption" tone="muted">
        {label}
      </CusText>
      <CusText variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </CusText>
    </View>
  );
}

// Tanlangan o'lchov va davr bo'yicha har bir o'lchov (kun bo'yicha guruhlangan).
export function HistoryDetailsSheet({ summary: s, period, now, visible, onClose }: Props) {
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  // Kun bo'yicha guruhlash (readings yangisidan eskisiga tartiblangan)
  const groups: { label: string; items: HistoryReading[] }[] = [];
  s.readings.forEach((r) => {
    const label = dayLabel(r.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  });

  return (
    <CusBottomSheet visible={visible} onClose={onClose} title={`${s.meta.title}: ${periodLabel}`}>
      {s.count === 0 ? (
        <CusText tone="muted" className="text-center">
          Bu davrda o&apos;lchov yo&apos;q
        </CusText>
      ) : (
        <>
          <CusCard className="flex-row">
            <Stat label="Min" value={s.min ?? "—"} />
            <Stat label="O'rtacha" value={s.avg ?? "—"} />
            <Stat label="Maks" value={s.max ?? "—"} />
          </CusCard>

          {groups.map((g) => (
            <View key={g.label} className="gap-2">
              <CusText variant="heading">{g.label}</CusText>
              <CusCard className="p-0">
                {g.items.map((r, i) => (
                  <View key={r.id}>
                    {i > 0 ? <CusDivider /> : null}
                    <CusListItem
                      title={`${r.value} ${s.meta.unit}`}
                      subtitle={timeOf(r.at)}
                      right={<CusBadge label={STATUS[r.status].label} tone={STATUS[r.status].tone} />}
                    />
                  </View>
                ))}
              </CusCard>
            </View>
          ))}
        </>
      )}
    </CusBottomSheet>
  );
}
