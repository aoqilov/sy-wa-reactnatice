// `synapse-soat/src/watch/ecgTrace.ts` dan ko'chirilgan (haqiqiy soat bilan sinalgan).
//
// Bitta EKG yozuvi. Namunalar soatdan paketlarda keladi (native qism ularni SDK'ning EcgUtil'i bilan mV ga
// aylantiradi). Filtrlar — kardiomonitorlardagi standart "monitor" rejimi:
//  - 0.5 Hz yuqori chastotali (synapse-soat'dan): nafas va qo'l harakati to'lqinni chiziqdan surib yubormaydi;
//  - 40 Hz past chastotali: mushak titrashi shovqinini kesadi, chiziq silliq bo'ladi;
//  - 50 Hz to'siq (notch): elektr tarmog'i shovqini (O'zbekistonda 50 Hz).
// Hisobotda filtr "0.5–40 Гц, 50 Гц" deb yoziladi.

const HIGH_PASS_HZ = 0.5;
const LOW_PASS_HZ = 40;
const NOTCH_HZ = 50;
const DEFAULT_RATE = 250;
const SPAN_S = 3;

/** Ikkinchi tartibli filtr (RBJ "Audio EQ Cookbook"), Direct Form I. */
class Biquad {
  private b = [1, 0, 0];
  private a = [0, 0];
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private fs = 0;
  private readonly kind: "lowpass" | "notch";
  private readonly f0: number;
  private readonly q: number;

  constructor(kind: "lowpass" | "notch", f0: number, q: number) {
    this.kind = kind;
    this.f0 = f0;
    this.q = q;
  }

  /** Chastota o'zgarganda (boshida taxminiy, keyin aniqlanadi) koeffitsientlar qayta hisoblanadi. */
  setRate(fs: number) {
    if (Math.abs(fs - this.fs) < 1) return;
    this.fs = fs;
    const w0 = (2 * Math.PI * this.f0) / fs;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * this.q);
    const a0 = 1 + alpha;
    this.b =
      this.kind === "lowpass"
        ? [(1 - cos) / 2 / a0, (1 - cos) / a0, (1 - cos) / 2 / a0]
        : [1 / a0, (-2 * cos) / a0, 1 / a0];
    this.a = [(-2 * cos) / a0, (1 - alpha) / a0];
  }

  /** Nyquist chastotasidan past bo'lsagina ishlaydi (aks holda signal o'zgarmaydi). */
  active() {
    return this.fs > 2.2 * this.f0;
  }

  step(x: number) {
    const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a[0] * this.y1 - this.a[1] * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Diagnostika uchun xom yozuv (dev paneldan JSON qilib ulashiladi): mV ga o'girilgan, lekin filtrlanmagan. */
export type EcgDebugDump = {
  at: number;
  /** Soat aytgan chastotalar: [drawFrequency, frequency]. */
  reportedRates: number[];
  /** Ilova tanlagan chastota. */
  rate: number;
  ecgType: number | null;
  /** Har paket: [kelgan vaqti (ms, yozuv boshidan), nuqtalar soni]. */
  packets: [number, number][];
  /** Soatdan kelgan xom ADC (mV ga o'girishdan oldin). Eski build'da bo'sh. */
  adc: number[];
  raw: number[];
  filtered: number[];
};

let nextTraceId = 1;

export class EcgTrace {
  /** Har o'lchovga alohida: jonli chiziq yangi o'lchovda holatini boshidan boshlaydi. */
  readonly id = nextTraceId++;
  readonly samples: number[] = [];
  /** Filtrsiz namunalar (mV): faqat diagnostika uchun. */
  readonly raw: number[] = [];
  readonly packets: [number, number][] = [];
  /** Xom ADC (diagnostika). */
  readonly adc: number[] = [];
  ecgType: number | null = null;
  /** Oxirgi 3 s ning cho'qqidan-cho'qqigacha amplitudasi, mV. */
  span = 0;
  /** Oxirgi 3 s ning eng past va eng baland qiymati, mV (jonli chiziq kuchaytirishni shundan tanlaydi). */
  low = 0;
  high = 0;
  private reported: number[] = [];
  private firstAt = 0;
  private firstLen = 0;
  private lastAt = 0;
  private frozen = 0;
  private prevX = NaN;
  private prevY = 0;
  private readonly lowPass = new Biquad("lowpass", LOW_PASS_HZ, Math.SQRT1_2);
  private readonly notch = new Biquad("notch", NOTCH_HZ, 25);

  /** Soat o'lchov boshida ikkita chastota aytadi; paketlar qaysi biriga mos kelishi modelga bog'liq. */
  setReportedRates(...hz: (number | undefined)[]) {
    this.reported = hz.filter((v): v is number => typeof v === "number" && v >= 50 && v <= 1000);
  }

  push(values: unknown[], at = Date.now()) {
    if (this.frozen) return;
    if (!this.samples.length) {
      this.firstAt = at;
      this.firstLen = values.length;
    }
    this.lastAt = at;
    this.packets.push([at - this.firstAt, values.length]);
    const rate = this.rate;
    const rc = 1 / (2 * Math.PI * HIGH_PASS_HZ);
    const a = rc / (rc + 1 / rate);
    this.lowPass.setRate(rate);
    this.notch.setRate(rate);
    for (const v of values) {
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      this.raw.push(v);
      this.prevY = Number.isNaN(this.prevX) ? 0 : a * (this.prevY + v - this.prevX);
      this.prevX = v;
      let y = this.prevY;
      if (this.notch.active()) y = this.notch.step(y);
      if (this.lowPass.active()) y = this.lowPass.step(y);
      this.samples.push(y);
    }
    const n = Math.min(this.samples.length, Math.round(this.rate * SPAN_S));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = this.samples.length - n; i < this.samples.length; i++) {
      const s = this.samples[i];
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    this.span = n ? hi - lo : 0;
    this.low = n ? lo : 0;
    this.high = n ? hi : 0;
  }

  /** Soniyadagi namunalar: kelish tezligidan hisoblanadi, soat aytgan chastotaga yaqin bo'lsa o'shanga tenglanadi. */
  get rate(): number {
    if (this.frozen) return this.frozen;
    const elapsed = (this.lastAt - this.firstAt) / 1000;
    const counted = elapsed >= 2 ? (this.samples.length - this.firstLen) / elapsed : 0;
    if (counted < 50 || counted > 1000) return this.reported[0] ?? DEFAULT_RATE;
    return this.reported.find((r) => Math.abs(r - counted) / r < 0.15) ?? counted;
  }

  get seconds() {
    return this.samples.length / this.rate;
  }

  /** Yozuvni yakunlaydi: chastota qotadi, keyin qayta ko'rsatish yozilgan tezlikda bo'ladi. */
  finish() {
    this.frozen = this.rate;
  }

  dump(): EcgDebugDump {
    const round = (v: number) => Math.round(v * 10000) / 10000;
    return {
      at: Date.now(),
      reportedRates: this.reported,
      rate: this.rate,
      ecgType: this.ecgType,
      packets: this.packets,
      adc: this.adc,
      raw: this.raw.map(round),
      filtered: this.samples.map(round),
    };
  }
}

// ---- O'lchash paytidagi jonli to'lqin (Home'dagi chiziq shuni o'qiydi) ----

let live: EcgTrace | null = null;
const listeners = new Set<() => void>();

export function setLiveEcg(trace: EcgTrace | null) {
  live = trace;
  listeners.forEach((l) => l());
}

export function subscribeLiveEcg(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveEcg() {
  return live;
}
