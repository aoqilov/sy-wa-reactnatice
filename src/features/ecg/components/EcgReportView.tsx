import { useMemo } from "react";
import { View } from "react-native";

import { CusCard, CusText } from "@/components/ui";
import { useProfile } from "@/features/profile";

import type { EcgRecord } from "../lib/ecg-records";
import {
  analyzeRecord,
  autoRows,
  type EcgPatient,
  headerRows,
  intervalText,
  measureRows,
  recordGain,
  reportT,
  type ReportRow,
  scaleText,
} from "../lib/ecg-report";
import { EcgBeatFigure } from "./EcgBeatFigure";
import { EcgPlayer } from "./EcgPlayer";

/** Tepadagi asosiy ko'rsatkich (soat ilovasidagi kabi): nomi va qiymati. */
function Pill({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      <View className="self-stretch items-center rounded-full bg-primary-soft px-2 py-1.5">
        <CusText variant="caption" className="font-semibold" numberOfLines={1}>
          {label}
        </CusText>
      </View>
      <CusText>
        <CusText className="font-semibold">{value ?? "—"}</CusText>
        {value !== undefined ? <CusText tone="muted"> {unit}</CusText> : null}
      </CusText>
    </View>
  );
}

function Rows({ rows }: { rows: ReportRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <View key={r.label} className="flex-row justify-between gap-3 py-1">
          <CusText tone="muted" className="shrink">
            {r.label}
          </CusText>
          <CusText className="shrink-0 text-right font-semibold" selectable>
            {r.value}
          </CusText>
        </View>
      ))}
    </>
  );
}

// Bitta EKG yozuvining to'liq hisoboti: tepada Puls/QT/HRV va yozuvni qayta o'ynatish (soat ilovasidagi kabi),
// ostida avvalgi PDF mazmuni — kim/qachon/qurilma, soat o'lchovlari, o'rtacha kompleks (P Q R S T, PR/QRS/QT).
// Mazmun shifokor uchun rus tilida (reportT), oldingi PDF dagi kabi.
export function EcgReportView({ record }: { record: EcgRecord }) {
  const { profile } = useProfile();
  // Bir necha ming nuqta: yozuv almashgandagina qayta hisoblanadi.
  const analysis = useMemo(() => analyzeRecord(record), [record]);
  const beatText = useMemo(() => intervalText(reportT), []);

  const rt = reportT;
  const gain = recordGain(record, analysis.sign);
  const patient: EcgPatient | null = profile
    ? {
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        age: profile.birthYear ? new Date().getFullYear() - profile.birthYear : null,
        sex: profile.gender ?? null,
      }
    : null;

  return (
    <View className="gap-3">
      {/* Soat ilovasidagi kabi: tepada asosiy ko'rsatkichlar, ostida yozuvni qayta o'ynatish */}
      <View className="flex-row gap-2">
        <Pill label={rt("ecg.pill.hr")} value={record.value} unit={rt("ecg.unit.bpm")} />
        <Pill label="QT" value={record.qt ?? analysis.beat?.intervals.qt} unit={rt("ecg.unit.ms")} />
        <Pill label="HRV" value={record.hrv} unit={rt("ecg.unit.ms")} />
      </View>
      <EcgPlayer samples={record.trace.samples} rate={record.trace.rate} sign={analysis.sign} />
      {analysis.sign < 0 ? (
        <CusText variant="caption" tone="muted">
          {rt("ecg.inverted")}
        </CusText>
      ) : null}

      <CusCard className="py-2">
        <Rows rows={headerRows(record, patient, rt)} />
      </CusCard>
      <CusCard className="py-2">
        <Rows rows={measureRows(record, rt)} />
      </CusCard>

      {analysis.beat ? (
        <CusCard className="gap-2 py-3">
          <CusText variant="heading">{rt("ecg.beat.title")}</CusText>
          <EcgBeatFigure beat={analysis.beat} rate={record.trace.rate} intervalText={beatText} />
          <Rows rows={autoRows(analysis, rt)} />
          <CusText variant="caption" tone="muted">
            {rt("ecg.beat.note", { n: analysis.beat.beats })}
          </CusText>
        </CusCard>
      ) : null}

      <CusText variant="caption" tone="muted">
        {scaleText(record, rt, gain)}
      </CusText>

      <CusText variant="caption" tone="muted">
        {rt("ecg.disclaimer")}
      </CusText>
    </View>
  );
}
