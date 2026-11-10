// EKG lentasi geometriyasi (millimetrda). Ekran ham, PDF ham shu hisobdan foydalanadi, shuning uchun masshtab bir xil:
// standart kardiograf qog'ozi — 25 mm/s, kuchaytirish 10 mm/mV (kerak bo'lsa 5 yoki 20, real apparatlardagi kabi),
// kichik katak 1 mm, katta katak 5 mm, boshida tanlangan kuchaytirishdagi 1 mV kalibrlash impulsi.

export const PAPER_SPEED_MM_S = 25;
export const GAIN_MM_MV = 10; // standart
export const ROW_SECONDS = 10;
export const ROW_HEIGHT_MM = 30;
/** Izoliniya (0 mV) qatorning tepasidan: R tishlariga yuqorida ko'proq joy. */
export const BASELINE_MM = 18;
/** Kalibrlash impulsi uchun chap tomondagi joy. */
export const CAL_WIDTH_MM = 7;
export const ROW_WIDTH_MM = CAL_WIDTH_MM + ROW_SECONDS * PAPER_SPEED_MM_S; // 257 mm

/** Android/iOS'da 1 dp ≈ 1/160 dyuym, demak 1 mm ≈ 6.3 dp (ekrandagi taxminiy haqiqiy o'lcham). */
export const DP_PER_MM = 160 / 25.4;

// Ko'rinish soatning rasmiy ilovasidagi kabi: oq fon, kulrang katak, ingichka qizil chiziq.
export const PAPER = {
  background: "#FFFFFF",
  minor: "#E8E8E8",
  major: "#C9C9C9",
  /** EKG chizig'i va kalibrlash impulsi. */
  ink: "#E5534B",
  /** Qavslar va ularning matni (o'rtacha kompleks). */
  text: "#2B2F36",
  /** Belgilar (R, intervallar) rangi: siyohdan ajralib turadi, chop etilganda ham ko'rinadi. */
  mark: "#1E6FEB",
  guide: "#8A94A6",
};

/** Lenta qatorining balandligi va izoliniya joyi (tepadan), mm. */
export type Lane = { heightMm: number; baselineMm: number };
export const ROW_LANE: Lane = { heightMm: ROW_HEIGHT_MM, baselineMm: BASELINE_MM };

/** Haqiqiy kardiograflardagi kuchaytirishlar, mm/mV. */
export const STANDARD_GAINS = [2.5, 5, 10, 20] as const;

/**
 * Kuchaytirish standart (mm/mV) mi? Standart bo'lmasa — signal mV da emas (soat xom ADC birligida beradi), chiziq
 * lentaga moslab masshtablangan: kalibrlash impulsi va "mm/mV" yozuvi ko'rsatilmaydi.
 */
export const isCalibratedGain = (gain: number) => (STANDARD_GAINS as readonly number[]).includes(gain);

/**
 * Kuchaytirishni tanlash (real kardiograflardagi 2.5/5/10/20 mm/mV): standart 10 ga ustunlik beriladi, signal
 * qatorga sig'masa 5 yoki 2.5 ga tushiriladi (tekis "tom" — kesilish — bo'lmasligi uchun), juda kichik signal
 * (cho'qqidan-cho'qqigacha < 0.7 mV) 20 bilan kattalashtiriladi. `lowMv`/`highMv` — izoliniyaga nisbatan chegaralar.
 *
 * 2.5 da ham sig'masa, qiymatlar mV bo'lishi mumkin emas (bilakdagi EKG 0.3–2 mV): E500 kabi soatlarda SDK qiymatni
 * mV ga o'girmay xom birlikda qaytaradi. Shunda kuchaytirish lentaga moslab tanlanadi (soatning rasmiy ilovasi va
 * veb ilova ham shunday chizadi) — aks holda chiziq yuqori-pastki chetda kesilib "to'rtburchak" bo'lib qoladi.
 */
export function gainFor(lowMv: number, highMv: number, lane: Lane = ROW_LANE): number {
  const up = lane.baselineMm - 0.5;
  const down = lane.heightMm - lane.baselineMm - 0.5;
  const fits = (g: number) => highMv * g <= up && -lowMv * g <= down;
  if (fits(GAIN_MM_MV)) return highMv - lowMv > 0 && highMv - lowMv < 0.7 && fits(20) ? 20 : GAIN_MM_MV;
  if (fits(5)) return 5;
  if (fits(2.5)) return 2.5;
  const fit = 0.75 * Math.min(highMv > 0 ? up / highMv : Infinity, lowMv < 0 ? down / -lowMv : Infinity);
  return Number.isFinite(fit) && fit > 0 ? fit : 2.5;
}

/** Lenta ostidagi masshtab yozuvi: "10 mm/mV" yoki masshtab moslangan bo'lsa — `auto`. */
export const gainLabel = (gain: number, auto: string) => (isCalibratedGain(gain) ? `${gain} mm/mV` : auto);

/** Butun yozuvning chegaralari (mV): chetdagi 0.5% nuqtalar (artefaktlar) hisobga olinmaydi. */
export function robustRange(samples: number[]): [number, number] {
  if (samples.length < 10) return [0, 0];
  const sorted = [...samples].sort((a, b) => a - b);
  const k = Math.floor(sorted.length * 0.005);
  return [sorted[k], sorted[sorted.length - 1 - k]];
}

/** Kichik (1 mm) yoki katta (5 mm) katak chiziqlari bitta yo'l bilan. */
export function gridPath(stepMm: number, widthMm = ROW_WIDTH_MM, heightMm = ROW_HEIGHT_MM): string {
  const parts: string[] = [];
  for (let x = 0; x <= widthMm + 1e-6; x += stepMm) parts.push(`M${x.toFixed(2)} 0V${heightMm}`);
  for (let y = 0; y <= heightMm + 1e-6; y += stepMm) parts.push(`M0 ${y.toFixed(2)}H${widthMm}`);
  return parts.join("");
}

/** 1 mV balandlikdagi (kuchaytirishga qarab 5/10/20 mm), 0.2 s (5 mm) kenglikdagi to'rtburchak impuls. */
export function calibrationPath(gain = GAIN_MM_MV, lane: Lane = ROW_LANE): string {
  const x0 = 1;
  const base = lane.baselineMm;
  const top = base - gain;
  return `M${x0} ${base}H${x0 + 0.5}V${top}H${x0 + 5.5}V${base}H${CAL_WIDTH_MM - 0.5}`;
}

/** Yozuvni 10 soniyalik qatorlarga bo'lish. */
export function rowStarts(durationS: number): number[] {
  const rows: number[] = [];
  for (let s = 0; s < Math.max(durationS, 0.001); s += ROW_SECONDS) rows.push(s);
  return rows;
}

/** mV → lentadagi y (mm). Lentadan chiqib ketadigan qism chetda kesiladi; son bo'lmagan qiymat izoliniyada. */
export const yOf = (mv: number, gain: number, lane: Lane = ROW_LANE) => {
  const y = lane.baselineMm - mv * gain;
  return Number.isFinite(y) ? Math.min(lane.heightMm - 0.3, Math.max(0.3, y)) : lane.baselineMm;
};

/**
 * Android'da react-native-svg yo'l (path/points) ichidagi NaN/Infinity da native xato tashlaydi va ilova yopiladi.
 * Shuning uchun chizishdan oldin har bir yo'l tekshiriladi: buzuq bo'lsa, umuman chizilmaydi.
 */
export function safePath(d: string): string {
  return /NaN|Infinity|undefined/.test(d) ? "" : d;
}

/**
 * `samples[from..to)` ni chiziq nuqtalariga aylantiradi ("x,y x,y ..." mm da). `bucketMm` kengligidagi har bo'lakdan
 * eng past va eng baland nuqta olinadi: nuqtalar soni kamayadi, lekin QRS cho'qqilari yo'qolmaydi.
 */
export function tracePoints(
  samples: number[],
  from: number,
  to: number,
  rate: number,
  xStartMm: number,
  gain: number,
  bucketMm: number,
  lane: Lane = ROW_LANE,
  /** -1 — teskari signal ag'dariladi (ecg-analysis). */
  sign = 1,
): string {
  if (rate <= 0 || to <= from) return "";
  const mmPerSample = PAPER_SPEED_MM_S / rate;
  const perBucket = Math.max(1, Math.floor(bucketMm / mmPerSample));
  const x = (i: number) => xStartMm + (i - from) * mmPerSample;
  const out: string[] = [];
  for (let i = from; i < to; i += perBucket) {
    const end = Math.min(to, i + perBucket);
    if (perBucket === 1) {
      if (Number.isFinite(samples[i])) out.push(`${x(i).toFixed(2)},${yOf(sign * samples[i], gain, lane).toFixed(2)}`);
      continue;
    }
    let lo = i;
    let hi = i;
    for (let j = i; j < end; j++) {
      if (samples[j] < samples[lo]) lo = j;
      if (samples[j] > samples[hi]) hi = j;
    }
    // Vaqt tartibini saqlaymiz: avval qaysi biri kelgan bo'lsa, o'sha.
    for (const j of lo < hi ? [lo, hi] : [hi, lo]) {
      if (Number.isFinite(samples[j])) out.push(`${x(j).toFixed(2)},${yOf(sign * samples[j], gain, lane).toFixed(2)}`);
    }
  }
  // Polyline kamida ikki nuqta talab qiladi; buzuq son bo'lsa chizilmaydi (safePath).
  return out.length >= 2 ? safePath(out.join(" ")) : "";
}

/**
 * Kardiomonitordagi kabi "yozuvchi": `total` ta namuna yozilgan, chiziq oynada chapdan o'ngga yuradi, oxiriga yetgach
 * boshidan davom etib eski yozuv ustidan yozadi (yozuvchi oldida `gapS` bo'sh joy). Jonli o'lchov ham, saqlangan
 * yozuvni qayta o'ynatish ham shuni chizadi. `xStart` — oynaning chap cheti (kalibrlash joyidan keyin), mm.
 */
export function sweepTrace(
  samples: number[],
  total: number,
  rate: number,
  widthMm: number,
  xStart: number,
  gain: number,
  lane: Lane,
  sign = 1,
  bucketMm = 0.16,
  gapS = 0.15,
): { current: string; previous: string; headX: number; headY: number } {
  const mmPerSample = PAPER_SPEED_MM_S / rate;
  const windowN = Math.max(1, Math.floor(Math.max(1, widthMm - xStart) / mmPerSample));
  const head = total % windowN; // yozuvchining oynadagi joyi
  const cycleStart = total - head; // joriy aylanishning boshidagi namuna
  const gapN = Math.round(gapS * rate);
  const current = tracePoints(samples, cycleStart, total, rate, xStart, gain, bucketMm, lane, sign);
  const prevFrom = cycleStart - windowN + head + gapN;
  const previous =
    prevFrom >= 0 && prevFrom < cycleStart
      ? tracePoints(samples, prevFrom, cycleStart, rate, xStart + (head + gapN) * mmPerSample, gain, bucketMm, lane, sign)
      : "";
  const last = total > 0 ? sign * samples[total - 1] : 0;
  return { current, previous, headX: xStart + head * mmPerSample, headY: yOf(last, gain, lane) };
}

/** Lentadagi matn (mm koordinatalarda): ekran (react-native-svg) va PDF (HTML svg) bir xil chizadi. */
export type MmLabel = { x: number; y: number; text: string; size: number; color: string; anchor: "start" | "middle" };
