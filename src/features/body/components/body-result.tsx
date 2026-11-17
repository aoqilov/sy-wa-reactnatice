import Octicons from "@expo/vector-icons/Octicons";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import type { BodyParts } from "@/shared/watch/measure";

import type { BodyEntry } from "../api/body";
import { whenText } from "../lib/format";
import { fatKgOf, fmt, GROUPS, type Level, levelOf, normFor, type Person, type RowDef } from "../lib/norms";

const LEVEL: Record<Level, TranslationKey> = { low: "body.level.low", normal: "body.level.normal", high: "body.level.high" };

type Props = {
  entry: BodyEntry;
  /** Oldingi o'lchov: o'zgarishlar shunga nisbatan. */
  prev: BodyEntry | null;
  person: Person;
  /** "?" — ko'rsatkichlar nimani anglatadi. */
  onHow?: () => void;
  /** Profildagi vaznni o'zgartirish. */
  onEditWeight?: () => void;
  /** Kartaning pastki qismi (masalan, "Batafsil" tugmasi). */
  footer?: ReactNode;
};

// Tana tarkibi natijasi, oddiy matn ko'rinishida: yog' ulushi, vazn tarkibi bir qatorda va to'rt guruhdagi barcha
// ko'rsatkichlar (qiymat, me'yor, oldingi o'lchovdan farq). Home va /history/body'da bir xil.
export function BodyResult({ entry, prev, person, onHow, onEditWeight, footer }: Props) {
  const t = useT();
  const muted = useThemeColor("muted", "#6B7385");
  const { parts } = entry;

  return (
    <CusCard className="gap-4">
      <View className="flex-row items-center gap-2">
        <CusText variant="heading" className="flex-1" numberOfLines={1}>
          {t("body.result")}
        </CusText>
        <CusText variant="caption" tone="muted">
          {whenText(entry.at, t)}
        </CusText>
        {onHow ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("body.how.title")} onPress={onHow} hitSlop={8}>
            <Octicons name="question" size={18} color={muted} />
          </Pressable>
        ) : null}
      </View>

      <Composition parts={parts} person={person} onEditWeight={onEditWeight} />

      {GROUPS.map((g) => {
        const rows = g.rows.filter((r) => parts[r.key] !== undefined);
        if (rows.length === 0) return null;
        return (
          <View key={g.title}>
            <CusText variant="caption" tone="muted" className="pb-1 font-semibold">
              {t(g.title)}
            </CusText>
            {rows.map((r, i) => (
              <Row key={r.key} row={r} parts={parts} prev={prev?.parts ?? null} person={person} first={i === 0} />
            ))}
          </View>
        );
      })}

      <CusText variant="caption" tone="muted">
        {t("body.disclaimer")}
      </CusText>
      {footer}
    </CusCard>
  );
}

const signed = (d: number, digits: number) => `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(digits)}`;

function Row({
  row,
  parts,
  prev,
  person,
  first,
}: {
  row: RowDef;
  parts: BodyParts;
  prev: BodyParts | null;
  person: Person;
  first: boolean;
}) {
  const t = useT();
  const value = parts[row.key] as number;
  const before = prev?.[row.key];
  const digits = row.key === "bmr" ? 0 : 1;
  const delta = before !== undefined ? value - before : null;
  const showDelta = delta !== null && Math.abs(delta) >= (digits === 0 ? 1 : 0.1);
  const norm = normFor(row.key, person);
  const unit = row.unit === "kcal" ? t("body.unit.kcal") : row.unit;

  // Ikkinchi qator: "Me'yorda (10–20) · oldingiga +0.6" — faqat bor qismlar.
  const notes = [
    norm ? `${t(LEVEL[levelOf(value, norm)])} (${norm.lo}–${norm.hi})` : null,
    showDelta ? t("body.prevDelta", { v: signed(delta, digits) }) : null,
  ].filter(Boolean);

  return (
    <View className={`gap-0.5 py-2 ${first ? "" : "border-t border-border"}`}>
      <View className="flex-row items-center gap-2">
        <CusText className="flex-1" numberOfLines={1}>
          {t(row.label)}
        </CusText>
        <CusText className="font-semibold">
          {fmt(value, row.key)}
          {unit ? ` ${unit}` : ""}
        </CusText>
      </View>
      {notes.length > 0 ? (
        <CusText variant="caption" tone="muted">
          {notes.join(" · ")}
        </CusText>
      ) : null}
    </View>
  );
}

/** Vazn tarkibi bir qatorda: yog' / mushak / suyak / qolgani (suv, a'zolar) — profildagi vazn bo'yicha. */
function Composition({ parts, person, onEditWeight }: { parts: BodyParts; person: Person; onEditWeight?: () => void }) {
  const t = useT();
  const w = person.weightKg;
  const fat = fatKgOf(parts, w);
  if (!w || fat === undefined) return null;
  const muscle = parts.muscleKg ?? 0;
  const bone = parts.boneKg ?? 0;
  const other = Math.max(0, w - fat - muscle - bone);
  const items = [
    [t("body.part.fat"), fat],
    [t("body.part.muscle"), muscle],
    [t("body.part.bone"), bone],
    [t("body.part.other"), other],
  ] as const;

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <CusText variant="caption" tone="muted" className="font-semibold">
          {t("body.composition", { kg: w })}
        </CusText>
        {onEditWeight ? (
          <Pressable accessibilityRole="button" onPress={onEditWeight} hitSlop={8}>
            <CusText variant="caption" tone="muted" className="underline">
              {t("body.editWeight")}
            </CusText>
          </Pressable>
        ) : null}
      </View>
      <CusText>
        {items
          .filter(([, kg]) => kg > 0)
          .map(([label, kg]) => `${label} ${kg.toFixed(1)} kg`)
          .join(" · ")}
      </CusText>
    </View>
  );
}
