import type { BeatIntervals, MedianBeat } from "./ecg-analysis";
import { gridPath, type Lane, type MmLabel, PAPER, PAPER_SPEED_MM_S, safePath, tracePoints, yOf } from "./ecg-geometry";

// O'rtacha kompleks rasmi (2-rasmdagi "Normal ECG" kabi): katakli qog'ozda bitta urish, P Q R S T harflari,
// ostida PR, QRS, QT qavslari va qiymatlari. Masshtab standart (25 mm/s, kuchaytirish mm/mV) — kataklar ma'nosi
// o'zgarmaydi, rasm faqat ekranga/varaqqa kattalashtirib chiqariladi. Barcha koordinatalar millimetrda.

export type BeatFigure = {
  widthMm: number;
  heightMm: number;
  gain: number;
  minor: string;
  major: string;
  trace: string;
  /** Nuqtalardan qavslargacha tushadigan uzuq chiziqlar. */
  guides: string;
  brackets: string;
  labels: MmLabel[];
};

const MARGIN_X = 1.5;
const TOP = 3; // harflar uchun joy
const BRACKET_ROW = 2.8;
const LETTER = 1.3;
const SMALL = 1.05;
/** To'lqin qismining eng katta balandligi, mm. Undan oshsa kuchaytirish kamayadi, oxirida chetda kesiladi. */
const MAX_TRACE_MM = 30;

/** `interval` — qavs ustidagi matn uchun: masalan ("PR", 176) → "PR 176 ms". */
export type IntervalText = (name: "PR" | "QRS" | "QT", ms: number) => string;

export function beatFigure(beat: MedianBeat, rate: number, intervalText: IntervalText): BeatFigure {
  const t = beat.samples.map((v) => (Number.isFinite(v) ? v - beat.baseline : 0));
  const high = Math.max(0, ...t);
  const low = Math.min(0, ...t);
  const span = high - low;
  // Standart 10 mm/mV (juda past signal — 20). Sig'masa 5, 2.5 ga tushiriladi; shunda ham sig'masa (masalan mV ga
  // o'girish xato bo'lib, qiymatlar juda katta) rasm baribir MAX_TRACE_MM dan oshmaydi, ortig'i chetda kesiladi.
  // Muhim: rasm balandligi cheklanmasa, Android'da react-native-svg ulkan bitmap yaratib, ilova OutOfMemoryError
  // bilan yopiladi.
  let standard = span < 0.7 ? 20 : 10;
  while (standard > 2.5 && span * standard > MAX_TRACE_MM) standard /= 2;
  // Sig'masa (soat qiymatni mV da emas, xom birlikda beradi) — rasm MAX_TRACE_MM ga moslab kichraytiriladi.
  const gain = span * standard > MAX_TRACE_MM ? MAX_TRACE_MM / span : standard;
  const up = high * gain;
  const down = -low * gain;
  const lane: Lane = { heightMm: TOP + up + down + 2.5, baselineMm: TOP + up };
  const traceWidth = (t.length / rate) * PAPER_SPEED_MM_S;
  const widthMm = Math.ceil(traceWidth + 2 * MARGIN_X);

  const { intervals } = beat;
  // Massivdan tashqaridagi nuqta (eski yoki buzuq tahlil) chizilmaydi: aks holda koordinata NaN bo'ladi.
  const inside = (k: number | undefined) => (k !== undefined && Number.isInteger(k) && k >= 0 && k < t.length ? k : undefined);
  const marks = {
    pOn: inside(beat.marks.pOn),
    p: inside(beat.marks.p),
    qrsOn: inside(beat.marks.qrsOn),
    q: inside(beat.marks.q),
    r: inside(beat.marks.r),
    s: inside(beat.marks.s),
    j: inside(beat.marks.j),
    t: inside(beat.marks.t),
    tEnd: inside(beat.marks.tEnd),
  };
  const xOf = (k: number) => MARGIN_X + (k / rate) * PAPER_SPEED_MM_S;
  const yAt = (k: number) => yOf(t[k], gain, lane);

  const labels: MmLabel[] = [];
  const letter = (k: number | undefined, text: string, below: boolean) => {
    if (k === undefined) return;
    labels.push({
      x: xOf(k),
      y: below ? yAt(k) + LETTER + 0.4 : yAt(k) - 0.6,
      text,
      size: LETTER,
      color: PAPER.mark,
      anchor: "middle",
    });
  };
  letter(marks.p, "P", false);
  letter(marks.q, "Q", true);
  letter(marks.r, "R", false);
  letter(marks.s, "S", true);
  if (marks.t !== undefined) letter(marks.t, "T", t[marks.t] < 0);

  // Qavslar: har biri alohida qatorda (QRS qisqa, matni qo'shnisiga tegmasin).
  const rows: { name: "PR" | "QRS" | "QT"; from?: number; to?: number; ms?: number }[] = [
    { name: "PR", from: marks.pOn, to: marks.qrsOn, ms: intervals.pr },
    { name: "QRS", from: marks.qrsOn, to: marks.j, ms: intervals.qrs },
    { name: "QT", from: marks.qrsOn, to: marks.tEnd, ms: intervals.qt },
  ];
  const shown = rows.filter(
    (r): r is { name: "PR" | "QRS" | "QT"; from: number; to: number; ms: number } =>
      r.from !== undefined && r.to !== undefined && r.ms !== undefined,
  );
  const bracketTop = lane.heightMm + 0.6;
  const heightMm = Math.ceil(bracketTop + shown.length * BRACKET_ROW + 0.6);

  const brackets: string[] = [];
  const guides = new Set<number>();
  shown.forEach((row, i) => {
    const y = bracketTop + (i + 1) * BRACKET_ROW - 0.6;
    const x1 = xOf(row.from);
    const x2 = xOf(row.to);
    // Uchlaridagi chiziqchalar faqat pastga: ustidagi matnni kesib o'tmasin.
    brackets.push(`M${x1.toFixed(2)} ${y}H${x2.toFixed(2)}M${x1.toFixed(2)} ${y}V${y + 0.6}M${x2.toFixed(2)} ${y}V${y + 0.6}`);
    labels.push({ x: (x1 + x2) / 2, y: y - 0.35, text: intervalText(row.name, row.ms), size: SMALL, color: PAPER.text, anchor: "middle" });
    guides.add(row.from);
    guides.add(row.to);
  });
  const guideBottom = heightMm - 0.3;
  const guidePath = [...guides]
    .map((k) => `M${xOf(k).toFixed(2)} ${yAt(k).toFixed(2)}V${guideBottom.toFixed(2)}`)
    .join("");

  return {
    widthMm,
    heightMm,
    gain,
    minor: safePath(gridPath(1, widthMm, heightMm)),
    major: safePath(gridPath(5, widthMm, heightMm)),
    trace: tracePoints(t, 0, t.length, rate, MARGIN_X, gain, 0.05, lane),
    guides: safePath(guidePath),
    brackets: safePath(brackets.join("")),
    labels: labels.filter((l) => Number.isFinite(l.x) && Number.isFinite(l.y)),
  };
}

/** Hisobot jadvali uchun: ilova o'zi hisoblagan intervallar. */
export function hasIntervals(intervals: BeatIntervals | undefined): boolean {
  return !!intervals && Object.values(intervals).some((v) => v !== undefined);
}
