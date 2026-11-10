import { useEffect, useRef, useState } from "react";

import { makeEcgRecord, saveEcgRecord } from "@/features/ecg";
import { useT } from "@/shared/i18n/use-t";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import {
  canMeasure,
  type MeasureHandlers,
  type MeasureProgress,
  startMeasure,
  startOnWatchBp,
} from "@/shared/watch/measure";

import { Metric } from "../api/get-metrics";
import { applyReadings, loadReadings, prependReading, saveReadings, type StoredReading, toStoredReading } from "../lib/readings";

type MetricKey = Metric["key"];

/** Joriy o'lchov: soatdan kelgan holat + doiradagi taymer uchun boshlangan vaqt va qolgan vaqt bahosi. */
type Run = MeasureProgress & { startedAt: number; remainingS: number | null };

/**
 * Qolgan vaqt (s): o'tgan vaqt va bajarilgan ulushdan (bir tekis tezlik deb). Boshida (5% gacha) baho ishonchsiz,
 * shuning uchun yo'q; doira ichida o'shanda foiz ko'rinadi.
 */
function remainingSeconds(progress: number, elapsedMs: number): number | null {
  if (progress < 0.05 || progress >= 1) return null;
  return Math.max(0, Math.round(((elapsedMs / progress) * (1 - progress)) / 1000));
}

/** Hozirgi vaqt (ms). Faqat hodisa ishlovchilarida chaqiriladi (o'lchov boshlanganda va soatdan foiz kelganda). */
const now = () => Date.now();

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * O'lchash paytida doira ichida nima ko'rinishi (`synapse-soat/src/ui/ChannelRow.tsx` andozasi):
 *  - soatning o'zida o'lchash: kutish belgisi;
 *  - nasosli bosim: soat ekrani ochilguncha "…", keyin yostiqchadagi joriy bosim;
 *  - harorat, shakar va qon tahlili: soat qiymat bermaydi, faqat foiz (yoki qolgan vaqt);
 *  - puls va SpO2: joriy qiymat, hali yo'q bo'lsa "--".
 */
function liveDisplay(
  key: MetricKey,
  run: Run,
  t: ReturnType<typeof useT>,
): { big: string; caption: string } {
  // Qolgan vaqt ma'lum bo'lsa ("0:18"), bo'lmasa foiz.
  const percent = run.remainingS !== null ? clock(run.remainingS) : `${Math.round(run.progress * 100)}%`;
  if (run.hint === "onWatch") return { big: "…", caption: t("measure.onWatch.caption") };
  if (key === "pressurePump") {
    return run.live === null
      ? { big: "…", caption: t("measure.note.opening") }
      : { big: String(run.live), caption: t("measure.note.cushion") };
  }
  if (key === "temperature") return { big: "…", caption: percent };
  // Shakar: soat qiymatni faqat oxirida beradi.
  if (key === "sugar") return { big: "…", caption: `${percent} · ${t("measure.note.glucose")}` };
  // Qon tahlili: beshta qiymat faqat oxirida (doira ostidagi kartada hammasi birga).
  if (key === "blood") return { big: "…", caption: `${percent} · ${t("measure.note.blood")}` };
  return run.live === null
    ? { big: "--", caption: t("measure.note.waitingSignal") }
    : { big: String(run.live), caption: `${t("measure.note.live")} · ${percent}` };
}

// Tanlangan o'lchov va soatda haqiqiy o'lchash jarayonini boshqaradi: "Boshlash" bosilganda soatga so'rov
// yuboriladi (shared/watch/measure.ts), natija saqlanadi va kartalarga qo'shiladi.
export function useMeasurement(metrics: Metric[]) {
  const t = useT();
  const [selectedKey, setSelectedKey] = useState<MetricKey>("pulse");
  const [run, setRun] = useState<Run | null>(null); // null = o'lchanmayapti
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<StoredReading[]>([]);
  const readingsRef = useRef<StoredReading[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);

  // Saqlangan o'lchovlarni o'qish; ekrandan chiqilsa, davom etayotgan o'lchash bekor qilinadi.
  useEffect(() => {
    loadReadings().then((saved) => {
      if (readingsRef.current.length > 0) return; // o'qish tugamaguncha yangi natija kelgan bo'lsa, uni bosib yubormaymiz
      readingsRef.current = saved;
      setReadings(saved);
    });
    return () => cancelRef.current?.();
  }, []);

  const items = metrics.map((m) => applyReadings(m, readings)); // hamma o'lchovlar (tanlagich uchun)
  const current = items.find((m) => m.key === selectedKey) ?? items[0];

  const stopRun = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setRun(null);
  };

  /** Bitta o'lchash oqimini ishga tushiradi va natijani/xatoni shu yerda qayta ishlaydi. */
  const begin = (runner: (handlers: MeasureHandlers) => () => void, key: MetricKey, viaWatch: boolean) => {
    const startedAt = now();
    setRun({ progress: 0, live: null, hint: viaWatch ? "onWatch" : null, startedAt, remainingS: null });
    cancelRef.current = runner({
      onProgress: (p) =>
        setRun({ ...p, startedAt, remainingS: remainingSeconds(p.progress, now() - startedAt) }),
      onDone: (raw) => {
        cancelRef.current = null;
        setRun(null);
        const next = prependReading(readingsRef.current, toStoredReading(raw));
        readingsRef.current = next;
        setReadings(next);
        saveReadings(next).catch(() => {}); // saqlanmasa ham natija ekranda qoladi
        // EKG: to'lqin bilan to'liq yozuv saqlanadi; hisoboti History sahifasida (EKG kartasi) ochiladi.
        if (raw.key === "ecg") {
          const watch = getWatchConnection();
          const record = makeEcgRecord(raw, {
            model: watch.model,
            firmware: watch.info.firmware,
            address: watch.info.address,
          });
          saveEcgRecord(record).catch(() => {});
        }
      },
      onError: (code) => {
        cancelRef.current = null;
        setRun(null);
        // Soat yostiqchani ilovadan boshlashga javob bermasa yoki qo'llab-quvvatlamasa: zaxira oqim: bosim soatning
        // o'zida o'lchanadi, ilova natijani soat xotirasidan o'qiydi (synapse-soat dagi kabi).
        if (key === "pressurePump" && !viaWatch && (code === "noReply" || code === "cuffUnsupported")) {
          begin(startOnWatchBp, key, true);
          return;
        }
        setError(t(`measure.error.${code}`));
      },
    });
  };

  return {
    items,
    current,
    selectedKey,
    select: (key: MetricKey) => {
      stopRun(); // boshqa o'lchovga o'tilsa, jarayon bekor qilinadi
      setError(null);
      setSelectedKey(key);
    },
    measuring: run !== null,
    /** 0..1 — doira chegarasi shuncha to'ladi (soat mili kabi). */
    progress: run?.progress ?? 0,
    display: run ? liveDisplay(selectedKey, run, t) : null, // doira ichidagi qiymat va izoh (o'lchash paytida)
    hint: run?.hint ? t(`measure.hint.${run.hint}`) : null, // o'lchash davomidagi ogohlantirish (xato emas)
    error,
    start: () => {
      if (run) return;
      setError(null);
      if (!canMeasure(selectedKey)) {
        setError(t("measure.unsupported"));
        return;
      }
      begin((handlers) => startMeasure(selectedKey, handlers), selectedKey, false);
    },
    cancel: stopRun,
    /** EKG hisoboti: o'lchov tugagach o'zi ochiladi, yozuvlar ro'yxatidan ham ochiladi. */
  };
}
