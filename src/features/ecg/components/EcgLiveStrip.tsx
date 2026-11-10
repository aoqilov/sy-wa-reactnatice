import { useEffect, useState, useSyncExternalStore } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { type EcgTrace, getLiveEcg, subscribeLiveEcg } from "@/shared/watch/ecg-trace";

import { analyzeEcg, type Polarity } from "../lib/ecg-analysis";
import { GAIN_MM_MV, gainLabel, isCalibratedGain } from "../lib/ecg-geometry";
import { EcgSweep, sweepGain } from "./EcgSweep";

const REFRESH_MS = 40; // ~25 kadr/s, hisobotdagi qayta o'ynatish bilan bir xil
const ANALYZE_EVERY_MS = 1000;
const ANALYZE_WINDOW_S = 8; // puls oxirgi shuncha soniyadan
const POLARITY_MIN_BEATS = 5;
const GAINS = [5, 10, 20] as const;
/**
 * Soat namunalarni paketlab (soniyasiga ~4 marta) yuboradi. Chiziq paket kelganda sakramasligi uchun yozuvchi
 * kelgan ma'lumotdan shuncha orqada, haqiqiy tezlikda bir tekis yuradi (hisobotdagi qayta o'ynatish kabi).
 */
const LAG_S = 0.5;
/** Orqada qolish bundan oshsa (masalan ilova fonda turgan), yozuvchi oldinga sakraydi. */
const MAX_LAG_S = 2;
/** Kuchaytirish shundan ko'p farq qilsagina yangilanadi: chiziq balandligi har soniyada "titramaydi". */
const GAIN_CHANGE = 0.15;

/** Kadr: yozuvchining joyi va o'lchov davomida qabul qilingan qarorlar. */
type Frame = { total: number; rate: number; gain: number; sign: Polarity; hr: number | null };

/**
 * Har 40 ms da kadr. Yozuvchi kelgan namunalardan LAG_S orqada bir tekis yuradi; ma'lumot tugab qolsa to'xtab,
 * yana LAG_S yig'ilgach davom etadi. Kuchaytirish hisobotdagi bilan bir xil hisoblanadi (sweepGain: shu paytgacha
 * yozilgan hammasi bo'yicha), soniyada bir marta. Qutblanish bir necha urishdan keyin bir marta qotiriladi.
 */
function useLiveFrame(trace: EcgTrace): Frame {
  const [frame, setFrame] = useState<Frame>({ total: 0, rate: trace.rate, gain: GAIN_MM_MV, sign: 1, hr: null });

  useEffect(() => {
    let gain: number = GAIN_MM_MV;
    let sign: Polarity | null = null;
    let hr: number | null = null;
    let analyzedAt = 0;
    let cursor = 0; // yozuvchi (namuna, kasr)
    let waiting = true; // ma'lumot yig'ilmoqda
    let tickAt = Date.now();

    const id = setInterval(() => {
      const total = trace.samples.length;
      const rate = trace.rate;
      const now = Date.now();
      const dt = now - tickAt;
      tickAt = now;

      const lagN = LAG_S * rate;
      if (waiting) {
        if (total - cursor >= lagN) waiting = false;
      } else {
        cursor += (rate * dt) / 1000;
        if (cursor >= total) {
          cursor = total; // ma'lumot tugadi: to'xtab, yana yig'iladi
          waiting = true;
        }
      }
      if (total - cursor > MAX_LAG_S * rate) cursor = total - lagN;

      if (now - analyzedAt >= ANALYZE_EVERY_MS && total >= 0.5 * rate) {
        analyzedAt = now;
        if (trace.seconds >= 3) {
          const from = Math.max(0, total - Math.round(ANALYZE_WINDOW_S * rate));
          const analysis = analyzeEcg(trace.samples.slice(from), rate);
          hr = analysis.hr ?? null;
          if (sign === null && analysis.hr !== undefined && analysis.peaks.length >= POLARITY_MIN_BEATS) {
            sign = analysis.sign;
          }
        }
        const next = sweepGain(trace.samples, sign ?? 1);
        if (Math.abs(next - gain) / gain > GAIN_CHANGE || isCalibratedGain(next) !== isCalibratedGain(gain)) gain = next;
      }
      setFrame({ total: Math.floor(cursor), rate, gain, sign: sign ?? 1, hr });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [trace]);

  return frame;
}

// O'lchash paytidagi jonli EKG — hisobotdagi qayta o'ynatish bilan bir xil lenta (EcgSweep): 3 s lik oyna ekran
// kengligiga sig'adi, chiziq chapdan o'ngga "yugurib" yoziladi, oxiriga yetgach eski yozuv ustidan boshidan yozadi.
// Chiziqni bosib kuchaytirishni almashtirish mumkin. Signal teskari bo'lsa (soat o'ng qo'lda)
// bir necha urishdan keyin ag'darib ko'rsatiladi. Namunalar React holatidan tashqarida (EcgTrace) to'planadi.
export function EcgLiveStrip() {
  const trace = useSyncExternalStore(subscribeLiveEcg, getLiveEcg, getLiveEcg);
  if (!trace) return null;
  // Yangi o'lchov — yangi komponent: qotirilgan qarorlar va qo'lda tanlangan kuchaytirish boshidan.
  return <LiveStrip key={trace.id} trace={trace} />;
}

function LiveStrip({ trace }: { trace: EcgTrace }) {
  const t = useT();
  const [widthDp, setWidthDp] = useState(0);
  const [manualGain, setManualGain] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const { total, rate, gain: autoGain, sign, hr } = useLiveFrame(trace);
  // mV da: standart 5/10/20 mm/mV. Xom birlikda (masshtab moslangan): bosish balandlikni x1 → x2 → x0.5 qiladi.
  const autoCalibrated = isCalibratedGain(autoGain);
  const gain = autoCalibrated ? (manualGain ?? autoGain) : autoGain * zoom;

  const nextGain = () => {
    if (!autoCalibrated) {
      setZoom((z) => (z === 1 ? 2 : z === 2 ? 0.5 : 1));
      return;
    }
    const i = GAINS.indexOf(gain as (typeof GAINS)[number]);
    setManualGain(GAINS[(i + 1) % GAINS.length]);
  };

  return (
    <View className="self-stretch px-4" onLayout={(e) => setWidthDp(e.nativeEvent.layout.width - 32)}>
      <View className="mb-1 flex-row items-center justify-between">
        <CusText variant="caption" tone="muted">
          {t("ecg.live")} · 25 mm/s · {gainLabel(gain, t("ecg.autoScale"))}
        </CusText>
        {hr !== null ? (
          <CusText variant="caption" className="font-semibold">
            ♥ {hr} {t("ecg.unit.bpm")}
          </CusText>
        ) : null}
      </View>
      {widthDp > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("ecg.liveGainHint")} onPress={nextGain}>
          <EcgSweep samples={trace.samples} total={total} rate={rate} sign={sign} gain={gain} widthDp={widthDp} head />
        </Pressable>
      ) : null}
      <CusText variant="caption" tone="muted" className="mt-1 text-center">
        {t("ecg.liveGainHint")}
      </CusText>
    </View>
  );
}
