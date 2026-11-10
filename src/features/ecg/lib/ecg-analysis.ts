// EKG tahlili (ilova tomonida, taxminiy): R tishlari, puls, qutblanish, o'rtacha kompleks va undagi P, Q, R, S, T
// nuqtalari hamda PR, QRS, QT intervallari. Bitta leadli soat signali uchun soddalashtirilgan usullar:
//  - R tishlari: Pan-Tompkins g'oyasi (hosila → kvadrat → 150 ms oyna → moslashuvchan chegara, 250 ms refrakter);
//  - o'rtacha kompleks: muntazam urishlar R bo'yicha tekislanib, har nuqtada mediana olinadi (shovqin kamayadi);
//  - T oxiri: urinma usuli (T tushishining eng tik joyidagi urinma izoliniyani kesgan nuqta).
// Natija tashxis emas: hisobotda "avto, taxminiy" deb ko'rsatiladi.

export type Polarity = 1 | -1;

/** O'rtacha kompleksdagi nuqtalar (kompleks massividagi indekslar). Topilmagani yo'q. */
export type BeatMarks = {
  pOn?: number;
  p?: number;
  qrsOn?: number;
  q?: number;
  r: number;
  s?: number;
  j?: number;
  t?: number;
  tEnd?: number;
};

/** Millisekundda; ishonchli chegaradan tashqaridagilar tashlanadi. */
export type BeatIntervals = { pr?: number; qrs?: number; qt?: number; qtc?: number };

export type MedianBeat = {
  /** Qutblanishi to'g'rilangan namunalar, mV. */
  samples: number[];
  /** Izoliniya (PR segmenti darajasi), mV. */
  baseline: number;
  marks: BeatMarks;
  intervals: BeatIntervals;
  /** Kompleks nechta urishdan olingan. */
  beats: number;
};

export type EcgAnalysis = {
  /** 1 — odatiy, -1 — signal teskari (masalan soat o'ng qo'lda): ko'rsatishda ko'paytiriladi. */
  sign: Polarity;
  /** R tishlarining indekslari (`samples` ichida). */
  peaks: number[];
  /** Mediana RR bo'yicha puls. */
  hr?: number;
  rrMs?: number;
  beat?: MedianBeat;
};

const sec = (s: number, rate: number) => Math.max(1, Math.round(s * rate));

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: ArrayLike<number>, from: number, to: number, p: number): number {
  const part: number[] = [];
  for (let i = from; i < to; i++) part.push(values[i]);
  if (!part.length) return 0;
  part.sort((a, b) => a - b);
  return part[Math.min(part.length - 1, Math.floor(part.length * p))];
}

/**
 * R tishlari va qutblanish. `sign` QRS ko'pchilik urishlarda pastga qarasa -1 (aniq ustunlik bo'lgandagina:
 * pastga og'ish yuqoriga og'ishdan 1.5 barobar katta).
 */
export function detectRPeaks(x: number[], rate: number): { peaks: number[]; sign: Polarity } {
  const n = x.length;
  if (rate <= 0 || n < rate * 2) return { peaks: [], sign: 1 };

  // 1) Hosila (5 nuqtali) va kvadrat: QRS ning tik qirralari kuchayadi, P va T (sekin to'lqinlar) so'nadi.
  const energy = new Float64Array(n);
  for (let i = 2; i < n - 2; i++) {
    const d = (2 * x[i + 1] + x[i + 2] - x[i - 2] - 2 * x[i - 1]) / 8;
    energy[i] = d * d;
  }
  // 2) 150 ms siljuvchi oyna bo'yicha o'rtacha.
  const w = sec(0.15, rate);
  const mwi = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += energy[i];
    if (i >= w) acc -= energy[i - w];
    mwi[i] = acc / w;
  }

  // 3) Chegara har 5 s lik bo'lak uchun alohida: signal kuchi yozuv davomida o'zgaradi (barmoq bosimi).
  const block = sec(5, rate);
  const thresholds: number[] = [];
  for (let b = 0; b < n; b += block) thresholds.push(0.3 * percentile(mwi, b, Math.min(n, b + block), 0.98));
  const thresholdAt = (i: number) => thresholds[Math.min(thresholds.length - 1, Math.floor(i / block))];

  // 4) Chegaradan oshgan har bir hudud — bitta QRS nomzodi.
  const refractory = sec(0.25, rate);
  const tWaveWindow = sec(0.36, rate);
  const candidates: { at: number; from: number; to: number; slope: number }[] = [];
  let i = 0;
  while (i < n) {
    if (mwi[i] <= thresholdAt(i) || thresholdAt(i) <= 0) {
      i++;
      continue;
    }
    let end = i;
    while (end < n && mwi[end] > thresholdAt(end)) end++;
    // Oyna kechikadi: QRS taxminan [i - w, end] oralig'ida.
    const from = Math.max(0, i - w);
    const to = Math.min(n, end + 1);
    let at = from;
    let slope = 0;
    for (let k = from; k < to; k++) {
      if (Math.abs(x[k]) > Math.abs(x[at])) at = k;
      if (energy[k] > slope) slope = energy[k];
    }
    const prev = candidates[candidates.length - 1];
    if (prev && at - prev.at < refractory) {
      if (Math.abs(x[at]) > Math.abs(x[prev.at])) candidates[candidates.length - 1] = { at, from, to, slope };
    } else if (prev && at - prev.at < tWaveWindow && slope < 0.25 * prev.slope) {
      // Oldingi QRS ga juda yaqin va qiyaligi ikki barobar past (energiya kvadrat: 0.25): bu T to'lqini (Pan-Tompkins qoidasi).
    } else {
      candidates.push({ at, from, to, slope });
    }
    i = end + 1;
  }
  if (candidates.length < 2) return { peaks: candidates.map((c) => c.at), sign: 1 };

  // 5) Qutblanish: har nomzoddagi eng katta yuqoriga va pastga og'ish.
  const ups: number[] = [];
  const downs: number[] = [];
  for (const c of candidates) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let k = c.from; k < c.to; k++) {
      if (x[k] > hi) hi = x[k];
      if (x[k] < lo) lo = x[k];
    }
    ups.push(Math.max(0, hi));
    downs.push(Math.max(0, -lo));
  }
  const sign: Polarity = median(downs) > 1.5 * median(ups) ? -1 : 1;

  // 6) R — qutblanish hisobga olingan eng baland nuqta.
  const peaks = candidates.map((c) => {
    let at = c.from;
    for (let k = c.from; k < c.to; k++) if (sign * x[k] > sign * x[at]) at = k;
    return at;
  });
  return { peaks, sign };
}

/** Muntazam RR (mediana ±20%) bilan o'ralgan urishlar: ekstrasistola va artefaktlar o'rtachaga qo'shilmaydi. */
function regularBeats(peaks: number[], rrMedian: number): number[] {
  const ok = (rr: number) => Math.abs(rr - rrMedian) <= 0.2 * rrMedian;
  return peaks.filter((p, k) => {
    const before = k > 0 ? p - peaks[k - 1] : null;
    const after = k < peaks.length - 1 ? peaks[k + 1] - p : null;
    if (before === null && after === null) return false;
    return (before === null || ok(before)) && (after === null || ok(after));
  });
}

function within(ms: number | undefined, lo: number, hi: number): number | undefined {
  return ms !== undefined && Number.isFinite(ms) && ms >= lo && ms <= hi ? Math.round(ms) : undefined;
}

/** O'rtacha kompleksdagi P, QRS, T nuqtalari. `r` — R ning indeksi, `rr` — mediana RR (namunada). */
function findMarks(t: number[], r: number, rate: number, rr: number): { marks: BeatMarks; baseline: number; intervals: BeatIntervals } | null {
  const len = t.length;
  const slope = (k: number) => (k <= 0 || k >= len - 1 ? 0 : Math.abs(t[k + 1] - t[k - 1]) / 2);

  // Izoliniya: R dan 30–200 ms oldingi eng tekis 20 ms lik oyna (PR segmenti). P cho'qqisi ham tekis bo'lishi mumkin,
  // shuning uchun deyarli eng tekislar orasidan R ga eng yaqini olinadi. Yuqori pulsda TP segmenti yo'qoladi, PR qoladi.
  const win = sec(0.02, rate);
  const from0 = Math.max(1, r - sec(0.2, rate));
  const to0 = r - sec(0.03, rate) - win;
  let baseline0 = median(t.slice(0, Math.max(1, r - sec(0.1, rate))));
  if (from0 < to0) {
    const costs: [number, number][] = [];
    for (let k = from0; k <= to0; k++) {
      let c = 0;
      for (let m = k; m < k + win; m++) c += slope(m);
      costs.push([k, c]);
    }
    const minCost = Math.min(...costs.map(([, c]) => c));
    const pick = costs.filter(([, c]) => c <= 1.5 * minCost + 1e-4).pop();
    if (pick) baseline0 = t.slice(pick[0], pick[0] + win).reduce((sum, v) => sum + v, 0) / win;
  }
  const rAmp = t[r] - baseline0;
  if (rAmp < 0.08) return null; // R juda past: signal shovqindan ajralmaydi

  let sMax = 0;
  for (let k = Math.max(1, r - sec(0.06, rate)); k < Math.min(len - 1, r + sec(0.06, rate)); k++) sMax = Math.max(sMax, slope(k));
  const near = Math.max(0.02, 0.05 * rAmp); // izoliniyaga "yaqin" chegarasi, mV
  const settled = (k: number, base: number, tolerance = near) => slope(k) < 0.1 * sMax && Math.abs(t[k] - base) < tolerance;

  const minIn = (from: number, to: number) => {
    let at = from;
    for (let k = from; k <= to; k++) if (t[k] < t[at]) at = k;
    return at;
  };
  const dip = 0.02; // mV: shundan chuqurroq bo'lsagina Q/S deb belgilanadi

  // Q: R dan 80 ms oldingacha eng past nuqta (izoliniyadan pastda bo'lsa).
  const qIdx = minIn(Math.max(0, r - sec(0.08, rate)), r);
  const q = qIdx !== r && t[qIdx] < baseline0 - dip ? qIdx : undefined;

  // QRS boshi: Q (yoki R) dan chapga, signal izoliniyaga qaytib, qiyalik so'ngan birinchi nuqta (Q nuqtasining
  // o'zida ham qiyalik nolga teng, shuning uchun izoliniyaga yaqinlik ham talab qilinadi).
  let qrsOn: number | undefined;
  const lowest = Math.max(1, r - sec(0.15, rate));
  let start = q ?? r;
  // Q bor bo'lsa, avval uning tushish qismidan o'tamiz: izoliniyaga qaytgan joydan keyin qidiriladi.
  while (q !== undefined && start > lowest && t[start] < baseline0 - 0.5 * near) start--;
  for (let k = start; k >= lowest; k--) {
    if (settled(k, baseline0)) {
      qrsOn = k;
      break;
    }
  }
  const baseline = baseline0;
  const sIdx = minIn(r, Math.min(len - 1, r + sec(0.1, rate)));
  const s = sIdx !== r && t[sIdx] < baseline - dip ? sIdx : undefined;

  // J nuqta (QRS oxiri): S (yoki R) dan o'ngga, qiyalik so'nib, izoliniyaga yaqin (ST biroz ko'tarilgan bo'lishi mumkin).
  let j: number | undefined;
  for (let k = s ?? r; k <= Math.min(len - 2, r + sec(0.12, rate)); k++) {
    if (settled(k, baseline, Math.max(near, 0.15 * rAmp))) {
      j = k;
      break;
    }
  }

  // T: J dan keyin, izoliniyadan eng uzoq nuqta (T teskari ham bo'lishi mumkin).
  let tPeak: number | undefined;
  let tEnd: number | undefined;
  const tFrom = (j ?? r + sec(0.08, rate)) + sec(0.04, rate);
  const tTo = Math.min(len - 2, r + Math.min(sec(0.5, rate), Math.round(0.75 * rr)));
  if (tFrom < tTo) {
    let at = tFrom;
    for (let k = tFrom; k <= tTo; k++) if (Math.abs(t[k] - baseline) > Math.abs(t[at] - baseline)) at = k;
    const tAmp = t[at] - baseline;
    if (Math.abs(tAmp) >= 0.04 && Math.abs(tAmp) >= 0.05 * rAmp) {
      tPeak = at;
      // Urinma usuli: T cho'qqisidan keyingi eng tik tushish joyidagi urinma izoliniyani qayerda kesadi.
      const dir = Math.sign(tAmp);
      let steep = at;
      let best = 0;
      for (let k = at + 1; k < Math.min(len - 1, at + sec(0.2, rate)); k++) {
        const d = -dir * (t[k + 1] - t[k - 1]) / 2;
        if (d > best) {
          best = d;
          steep = k;
        }
      }
      if (best > 0) {
        const m = (t[steep + 1] - t[steep - 1]) / 2;
        const cross = steep + (baseline - t[steep]) / m;
        // Yaxlitlangach ham massiv ichida qolsin (aks holda rasmda NaN koordinata bo'ladi).
        if (Number.isFinite(cross) && cross > at && cross <= len - 1) tEnd = Math.min(len - 1, Math.round(cross));
      }
    }
  }

  // P: QRS boshidan 40–300 ms oldin, izoliniyadan yuqoridagi eng baland nuqta (I leadda P musbat).
  let p: number | undefined;
  let pOn: number | undefined;
  if (qrsOn !== undefined) {
    const pFrom = Math.max(1, qrsOn - sec(0.3, rate));
    const pTo = qrsOn - sec(0.04, rate);
    if (pFrom < pTo) {
      let at = pFrom;
      for (let k = pFrom; k <= pTo; k++) if (t[k] > t[at]) at = k;
      const pAmp = t[at] - baseline;
      if (pAmp >= 0.03 && pAmp < 0.5 * rAmp) {
        p = at;
        for (let k = at; k >= Math.max(0, at - sec(0.1, rate)); k--) {
          if (t[k] - baseline < 0.15 * pAmp) {
            pOn = k;
            break;
          }
        }
      }
    }
  }

  const ms = (a?: number, b?: number) => (a === undefined || b === undefined ? undefined : ((b - a) / rate) * 1000);
  const qt = within(ms(qrsOn, tEnd), 200, 650);
  const rrS = rr / rate;
  const intervals: BeatIntervals = {
    pr: within(ms(pOn, qrsOn), 80, 360),
    qrs: within(ms(qrsOn, j), 40, 200),
    qt,
    qtc: qt !== undefined ? within(qt / Math.sqrt(rrS), 250, 700) : undefined, // Bazett
  };
  return { marks: { pOn, p, qrsOn, q, r, s, j, t: tPeak, tEnd }, baseline, intervals };
}

/** Butun yozuv tahlili (hisobot). Live uchun ham ishlaydi, lekin oxirgi bir necha soniyaga berish kerak. */
export function analyzeEcg(samples: number[], rate: number): EcgAnalysis {
  const { peaks, sign } = detectRPeaks(samples, rate);
  if (peaks.length < 3) return { sign, peaks };

  const rrs: number[] = [];
  for (let k = 1; k < peaks.length; k++) {
    const rr = peaks[k] - peaks[k - 1];
    if (rr >= 0.3 * rate && rr <= 2 * rate) rrs.push(rr);
  }
  if (rrs.length < 2) return { sign, peaks };
  const rr = median(rrs);
  // Shovqin ham "cho'qqi" beradi, lekin tartibsiz: RR larning ko'pchiligi medianaga yaqin bo'lmasa, bu ritm emas.
  const regular = rrs.filter((v) => Math.abs(v - rr) <= 0.2 * rr).length / rrs.length;
  if (regular < 0.6) return { sign, peaks: [] };
  const rrMs = Math.round((rr / rate) * 1000);
  const result: EcgAnalysis = { sign, peaks, rrMs, hr: Math.round(60000 / rrMs) };

  // O'rtacha kompleks: R dan oldin P uchun joy, keyin T oxirigacha (yuqori pulsda qo'shni urishga kirmaslik uchun qisqaroq).
  const pre = Math.round(Math.min(0.35, Math.max(0.2, (0.45 * rr) / rate)) * rate);
  const post = Math.round(Math.min(0.6, Math.max(0.4, (0.75 * rr) / rate)) * rate);
  const beats = regularBeats(peaks, rr).filter((p) => p - pre >= 0 && p + post < samples.length);
  if (beats.length < 3) return result;

  const template: number[] = [];
  const column: number[] = new Array(beats.length);
  for (let k = -pre; k <= post; k++) {
    for (let b = 0; b < beats.length; b++) column[b] = sign * samples[beats[b] + k];
    template.push(median(column));
  }
  const found = findMarks(template, pre, rate, rr);
  if (found) result.beat = { samples: template, beats: beats.length, ...found };
  return result;
}
