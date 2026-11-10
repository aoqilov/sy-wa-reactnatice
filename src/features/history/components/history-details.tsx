import { View } from "react-native";

import { CusBadge, CusCard, CusDivider, CusListItem, CusText } from "@/components/ui";

import { HistoryReading, SOURCE_LABEL } from "../api/get-history";
import { Summary } from "../lib/summarize";
import { STATUS } from "./history-card";
import { MiniBars } from "./mini-bars";

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

type Props = { summary: Summary; now: Date };

// Bitta o'lchov turi sahifasining mazmuni: davr xulosasi (min / o'rtacha / maks, grafik) va har bir o'lchov,
// kunlar bo'yicha guruhlangan (yangisi tepada). Har yozuvda vaqti, manbasi (Soat / Ilova) va qo'shimcha ma'lumot.
export function HistoryDetails({ summary: s, now }: Props) {
  if (s.count === 0) {
    return (
      <CusText tone="muted" className="p-6 text-center">
        Bu davrda o&apos;lchov yo&apos;q
      </CusText>
    );
  }

  const groups: { label: string; items: HistoryReading[] }[] = [];
  s.readings.forEach((r) => {
    const label = dayLabel(r.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  });

  return (
    <View className="gap-3">
      <CusCard className="gap-3">
        <View className="flex-row">
          <Stat label="Min" value={s.min ?? "—"} />
          <Stat label="O'rtacha" value={s.avg ?? "—"} />
          <Stat label="Maks" value={s.max ?? "—"} />
        </View>
        {s.bars.length > 1 ? (
          <View className="items-center">
            <MiniBars values={s.bars} />
          </View>
        ) : null}
        <CusText variant="caption" tone="muted" className="text-center">
          {s.count} ta o&apos;lchov · {s.meta.unit}
        </CusText>
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
                  subtitle={[timeOf(r.at), SOURCE_LABEL[r.source], r.note].filter(Boolean).join(" · ")}
                  right={<CusBadge label={STATUS[r.status].label} tone={STATUS[r.status].tone} />}
                />
              </View>
            ))}
          </CusCard>
        </View>
      ))}
    </View>
  );
}
