import { type ReactElement, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import type { MetricKey } from "../api/get-metrics";
import { METRIC_COLORS, withAlpha } from "../constants/metric-colors";

// "Qanday o'lchanadi?" → Video tabi: har bir o'lchov uchun qisqa, takrorlanuvchi animatsiya. Video fayl emas: ilovaning o'zida
// react-native-svg + reanimated bilan chiziladi (yangi paket va katta fayl kerak emas, qorong'i/yorug' mavzuga mos).
// 1:1 (kvadrat) o'lchamda. Sahna tepadan ko'rinishdagi bilak, soat va o'lchovga xos ko'rsatkichdan iborat; hamma
// sahnalar bitta `t` (0..1, uzluksiz takrorlanadi) bo'yicha harakatlanadi.

const SIZE = 320; // kvadrat kanvas (viewBox 320×320)
const TOP = -53; // sahna balandligi ~160: tepada va pastda (izoh uchun joy) teng bo'shliq qolsin
const LOOP_MS = 4000;

// Bilak va soat (tepadan ko'rinish). Bilak markazi: (WX, WY).
const WX = 161;
const WY = 126;
const SKIN = "#F2C9A5";
const STRAP = "#475569";
const CASE = "#1E293B";
const SCREEN = "#0B1220";

const ACircle = Animated.createAnimatedComponent(Circle);
const ARect = Animated.createAnimatedComponent(Rect);
const ALine = Animated.createAnimatedComponent(Line);
const APath = Animated.createAnimatedComponent(Path);

type SceneProps = { t: SharedValue<number>; color: string; muted: string };

/** Yurak shakli (markaz cx, cy; masshtab s). Animatsiyada ham chaqiriladi, shuning uchun "worklet". */
function heartPath(cx: number, cy: number, s: number) {
  "worklet";
  return (
    `M ${cx} ${cy + 10 * s} ` +
    `C ${cx - 22 * s} ${cy - 6 * s}, ${cx - 12 * s} ${cy - 20 * s}, ${cx} ${cy - 8 * s} ` +
    `C ${cx + 12 * s} ${cy - 20 * s}, ${cx + 22 * s} ${cy - 6 * s}, ${cx} ${cy + 10 * s} Z`
  );
}

/** EKG chizig'i (P-QRS-T zarblari): yo'l va uning uzunligi (chiziladigandek ochilishi uchun). */
function ecgPath(x0: number, y0: number, beats: number, w: number) {
  const k = w / 70;
  const beat: [number, number][] = [
    [0, 0],
    [14, 0],
    [19, -5],
    [24, 0],
    [30, 0],
    [33, 4],
    [38, -30],
    [43, 12],
    [47, 0],
    [56, 0],
    [62, -8],
    [68, 0],
    [70, 0],
  ];
  const pts: [number, number][] = [];
  for (let b = 0; b < beats; b++) {
    for (const [dx, dy] of beat) pts.push([x0 + (b * 70 + dx) * k, y0 + dy * k]);
  }
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { d, length: Math.ceil(length) + 2 };
}

// ---- Umumiy qismlar ----

/** Bilak va kaft. */
function ArmBody() {
  return (
    <>
      <Rect x={30} y={104} width={170} height={44} rx={22} fill={SKIN} />
      <Rect x={190} y={108} width={88} height={36} rx={18} fill={SKIN} />
    </>
  );
}

function Strap() {
  return <Rect x={148} y={98} width={26} height={56} rx={5} fill={STRAP} />;
}

/** Soat korpusi va ekrani. */
function WatchCase({ accent }: { accent: string }) {
  return (
    <>
      <Rect x={139} y={108} width={44} height={36} rx={9} fill={CASE} />
      <Rect x={144} y={113} width={34} height={26} rx={6} fill={SCREEN} />
      <Rect x={150} y={123} width={22} height={3} rx={1.5} fill={accent} opacity={0.9} />
      <Rect x={150} y={129} width={14} height={3} rx={1.5} fill={accent} opacity={0.5} />
    </>
  );
}

/** Kichik yorliq ("Taxminiy baho"). */
function Chip({ x, y, label, color }: { x: number; y: number; label: string; color: string }) {
  return (
    <>
      <Rect x={x} y={y} width={label.length * 6.2 + 18} height={22} rx={11} fill={withAlpha(color, 0.18)} />
      <SvgText x={x + 9} y={y + 15} fontSize={11} fontWeight="600" fill={color}>
        {label}
      </SvgText>
    </>
  );
}

// ---- Puls: soatdan zarb to'lqinlari, yurak va EKG chizig'i ----

const PULSE_ECG = ecgPath(20, 52, 3, 70);

function PulseScene({ t, color }: SceneProps) {
  const ring1 = useAnimatedProps(() => {
    const p = (t.get() * 3) % 1;
    return { r: 20 + 44 * p, opacity: 0.55 * (1 - p) };
  });
  const ring2 = useAnimatedProps(() => {
    const p = (t.get() * 3 + 0.5) % 1;
    return { r: 20 + 44 * p, opacity: 0.55 * (1 - p) };
  });
  const heart = useAnimatedProps(() => {
    const p = (t.get() * 3) % 1;
    const s = 1 + (p < 0.25 ? 0.22 * Math.sin((Math.PI * p) / 0.25) : 0);
    return { d: heartPath(268, 52, s) };
  });
  const line = useAnimatedProps(() => {
    const p = Math.min(1, t.get() / 0.8);
    return { strokeDashoffset: PULSE_ECG.length * (1 - p), opacity: t.get() > 0.92 ? (1 - t.get()) / 0.08 : 1 };
  });

  return (
    <>
      <APath
        d={PULSE_ECG.d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${PULSE_ECG.length} ${PULSE_ECG.length}`}
        animatedProps={line}
      />
      <APath d={heartPath(268, 52, 1)} fill={color} animatedProps={heart} />
      <ArmBody />
      <Strap />
      <ACircle cx={WX} cy={WY} r={20} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring1} />
      <ACircle cx={WX} cy={WY} r={20} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring2} />
      <WatchCase accent={color} />
    </>
  );
}

// ---- Kislorod: qizil yorug'lik, ko'tarilayotgan pufakchalar va 30 soniyalik doira ----

const OX_R = 24;
const OX_CIRC = 2 * Math.PI * OX_R;
const BUBBLES = [141, 156, 170, 184];

function Bubble({ t, color, cx, index }: { t: SharedValue<number>; color: string; cx: number; index: number }) {
  const props = useAnimatedProps(() => {
    const p = (t.get() * 2 + index * 0.25) % 1;
    return { cy: 104 - 62 * p, opacity: 0.85 * Math.sin(Math.PI * p) };
  });
  return <ACircle cx={cx} r={5} fill="none" stroke={color} strokeWidth={1.8} animatedProps={props} />;
}

function OxygenScene({ t, color }: SceneProps) {
  const glow = useAnimatedProps(() => ({ opacity: 0.35 + 0.25 * Math.sin(t.get() * Math.PI * 6) }));
  const arc = useAnimatedProps(() => ({ strokeDashoffset: OX_CIRC * (1 - t.get()) }));

  return (
    <>
      <ArmBody />
      <Strap />
      <WatchCase accent="#EF4444" />
      <ACircle cx={WX} cy={WY} r={11} fill="#EF4444" animatedProps={glow} />
      {BUBBLES.map((cx, i) => (
        <Bubble key={cx} t={t} color={color} cx={cx} index={i} />
      ))}
      <Circle cx={268} cy={52} r={OX_R} fill="none" stroke={withAlpha(color, 0.25)} strokeWidth={5} />
      <ACircle
        cx={268}
        cy={52}
        r={OX_R}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${OX_CIRC} ${OX_CIRC}`}
        transform="rotate(-90 268 52)"
        animatedProps={arc}
      />
      <SvgText x={268} y={57} fontSize={13} fontWeight="700" fill={color} textAnchor="middle">
        30 s
      </SvgText>
    </>
  );
}

// ---- Bosim: bilakdagi yostiqcha shishadi, manometr strelkasi, yurak balandligi chizig'i ----

function PressureScene({ t, color, muted }: SceneProps) {
  const inflate = (v: number) => {
    "worklet";
    return interpolate(v, [0, 0.1, 0.55, 0.7, 0.9, 1], [0, 0, 1, 1, 0, 0]);
  };
  const strap = useAnimatedProps(() => {
    const k = inflate(t.get());
    return { x: 148 - 6 * k, width: 26 + 12 * k };
  });
  const tint = useAnimatedProps(() => {
    const k = inflate(t.get());
    return { x: 148 - 6 * k, width: 26 + 12 * k, opacity: 0.6 * k };
  });
  const needle = useAnimatedProps(() => {
    const a = Math.PI + Math.PI * 0.8 * inflate(t.get());
    return { x2: 262 + 24 * Math.cos(a), y2: 64 + 24 * Math.sin(a) };
  });

  return (
    <>
      <ArmBody />
      <ARect y={98} height={56} rx={5} fill={STRAP} animatedProps={strap} />
      <ARect y={98} height={56} rx={5} fill={color} animatedProps={tint} />
      <WatchCase accent={color} />

      {/* Yurak balandligi: qo'l shu chiziqda tursin */}
      <Line x1={12} y1={WY} x2={308} y2={WY} stroke={color} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.55} />
      <Path d={heartPath(24, 90, 0.7)} fill={color} />
      <SvgText x={42} y={94} fontSize={10.5} fill={muted}>
        yurak balandligi
      </SvgText>

      {/* Manometr */}
      <Path d="M 232 64 A 30 30 0 0 1 292 64" fill="none" stroke={withAlpha(color, 0.3)} strokeWidth={5} strokeLinecap="round" />
      <ALine x1={262} y1={64} stroke={color} strokeWidth={3} strokeLinecap="round" animatedProps={needle} />
      <Circle cx={262} cy={64} r={4.5} fill={color} />
      <SvgText x={262} y={84} fontSize={10} fill={muted} textAnchor="middle">
        mmHg
      </SvgText>
    </>
  );
}

// ---- Harorat: termometr to'lib boradi, soatdan issiqlik to'lqini ----

function TemperatureScene({ t, color, muted }: SceneProps) {
  const level = useAnimatedProps(() => {
    const h = interpolate(t.get(), [0, 0.65, 1], [10, 56, 56]);
    return { y: 92 - h, height: h };
  });
  const ring = useAnimatedProps(() => {
    const p = (t.get() * 2) % 1;
    return { r: 20 + 40 * p, opacity: 0.5 * (1 - p) };
  });

  return (
    <>
      <ArmBody />
      <Strap />
      <ACircle cx={WX} cy={WY} r={20} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring} />
      <WatchCase accent={color} />

      <Rect x={254} y={22} width={16} height={66} rx={8} fill="none" stroke={muted} strokeWidth={2} />
      <Circle cx={262} cy={92} r={12} fill={color} />
      <ARect x={259} width={6} rx={3} fill={color} animatedProps={level} />
      {[34, 48, 62].map((y) => (
        <Line key={y} x1={276} y1={y} x2={284} y2={y} stroke={muted} strokeWidth={2} strokeLinecap="round" />
      ))}
      <SvgText x={290} y={20} fontSize={11} fontWeight="600" fill={muted}>
        °C
      </SvgText>
    </>
  );
}

// ---- EKG: boshqa qo'l barmog'i elektrodga tegadi, to'lqin chiziladi ----

const ECG_SCENE = ecgPath(190, 60, 2, 54);

/** Barmoq 0..1: 0 — uzoqda, 1 — elektrodga tegib turibdi (sikl boshida tushadi, oxirida ko'tariladi). */
function touchAmount(v: number) {
  "worklet";
  return interpolate(v, [0, 0.2, 0.3, 0.9, 1], [0, 0, 1, 1, 0]);
}

/** Boshqa qo'l barmog'i soat korpusining tepasidagi elektrodga tegadi; tegib turganda halqa pulsatsiyasi. */
function FingerTouch({ t, color }: { t: SharedValue<number>; color: string }) {
  const finger = useAnimatedProps(() => {
    const bottom = 62 + 44 * touchAmount(t.get());
    return { y: bottom - 80 };
  });
  const glow = useAnimatedProps(() => {
    const k = touchAmount(t.get());
    return { r: 6 + 8 * ((t.get() * 4) % 1), opacity: 0.8 * k * (1 - ((t.get() * 4) % 1)) };
  });
  return (
    <>
      <ARect x={151} width={20} height={80} rx={10} fill={SKIN} animatedProps={finger} />
      <ACircle cx={WX} cy={108} fill="none" stroke={color} strokeWidth={2.5} animatedProps={glow} />
    </>
  );
}

function EcgScene({ t, color }: SceneProps) {
  const line = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, (t.get() - 0.3) / 0.55));
    return { strokeDashoffset: ECG_SCENE.length * (1 - p), opacity: t.get() > 0.92 ? (1 - t.get()) / 0.08 : 1 };
  });

  return (
    <>
      <ArmBody />
      <Strap />
      <WatchCase accent={color} />
      <FingerTouch t={t} color={color} />
      <APath
        d={ECG_SCENE.d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${ECG_SCENE.length} ${ECG_SCENE.length}`}
        animatedProps={line}
      />
    </>
  );
}

// ---- Shakar: soatdan tomchiga signal oqadi (taxminiy baho) ----

function SugarScene({ t, color }: SceneProps) {
  const flow = useAnimatedProps(() => ({ strokeDashoffset: -(t.get() * 11 * 8) }));
  const ring = useAnimatedProps(() => {
    const p = (t.get() * 2) % 1;
    return { r: 22 + 14 * p, opacity: 0.5 * (1 - p) };
  });

  return (
    <>
      <ArmBody />
      <Strap />
      <WatchCase accent={color} />
      <ALine
        x1={WX}
        y1={106}
        x2={250}
        y2={70}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="5 6"
        animatedProps={flow}
      />
      <ACircle cx={262} cy={62} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring} />
      <Path d="M 262 40 C 264 48, 276 58, 276 68 A 14 14 0 0 1 248 68 C 248 58, 260 48, 262 40 Z" fill={color} />
      <Chip x={16} y={16} label="Taxminiy baho" color={color} />
    </>
  );
}

// ---- Qon tahlili: besh ko'rsatkich ustunchalari o'sib-kamayadi (taxminiy baho) ----

function Bar({ t, color, x, index }: { t: SharedValue<number>; color: string; x: number; index: number }) {
  const props = useAnimatedProps(() => {
    const h = 12 + 28 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t.get() * 2 + index * 0.18)));
    return { y: 96 - h, height: h };
  });
  return <ARect x={x} width={9} rx={3} fill={color} opacity={0.55 + index * 0.1} animatedProps={props} />;
}

function BloodScene({ t, color }: SceneProps) {
  const flow = useAnimatedProps(() => ({ strokeDashoffset: -(t.get() * 11 * 8) }));

  return (
    <>
      <ArmBody />
      <Strap />
      <WatchCase accent={color} />
      <ALine
        x1={WX}
        y1={106}
        x2={226}
        y2={76}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="5 6"
        animatedProps={flow}
      />
      <Line x1={226} y1={100} x2={296} y2={100} stroke={withAlpha(color, 0.4)} strokeWidth={2} strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Bar key={i} t={t} color={color} x={232 + i * 13} index={i} />
      ))}
      <Chip x={16} y={16} label="Taxminiy baho" color={color} />
    </>
  );
}

// ---- HRV: urishlar orasidagi vaqt har xil (notekis EKG), soatdan zarb to'lqinlari ----

/** Kengligi har xil zarblar: R-R oraliqlari o'zgarib turadi (HRV aynan shu farq). */
const HRV_ECG = (() => {
  const parts = [56, 74, 50, 66].map((w, i, all) => {
    const x0 = 20 + all.slice(0, i).reduce((s, v) => s + v, 0);
    return ecgPath(x0, 52, 1, w);
  });
  return { d: parts.map((p) => p.d).join(" "), length: parts.reduce((s, p) => s + p.length, 0) };
})();

function HrvScene({ t, color, muted }: SceneProps) {
  const ring = useAnimatedProps(() => {
    const p = (t.get() * 3) % 1;
    return { r: 20 + 44 * p, opacity: 0.5 * (1 - p) };
  });
  const line = useAnimatedProps(() => {
    const p = Math.min(1, t.get() / 0.8);
    return { strokeDashoffset: HRV_ECG.length * (1 - p), opacity: t.get() > 0.92 ? (1 - t.get()) / 0.08 : 1 };
  });

  return (
    <>
      <APath
        d={HRV_ECG.d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${HRV_ECG.length} ${HRV_ECG.length}`}
        animatedProps={line}
      />
      <SvgText x={290} y={40} fontSize={12} fontWeight="700" fill={muted} textAnchor="end">
        R–R
      </SvgText>
      <ArmBody />
      <Strap />
      <ACircle cx={WX} cy={WY} r={20} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring} />
      <WatchCase accent={color} />
    </>
  );
}

// ---- Stress: shkala strelkasi pastdan o'rtaga tebranadi, soatdan to'lqin ----

function StressScene({ t, color, muted }: SceneProps) {
  const needle = useAnimatedProps(() => {
    const k = 0.25 + 0.2 * Math.sin(t.get() * Math.PI * 2);
    const a = Math.PI + Math.PI * k;
    return { x2: 262 + 24 * Math.cos(a), y2: 64 + 24 * Math.sin(a) };
  });
  const ring = useAnimatedProps(() => {
    const p = (t.get() * 2) % 1;
    return { r: 20 + 40 * p, opacity: 0.5 * (1 - p) };
  });

  return (
    <>
      <ArmBody />
      <Strap />
      <ACircle cx={WX} cy={WY} r={20} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring} />
      <WatchCase accent={color} />
      <Path d="M 232 64 A 30 30 0 0 1 262 34" fill="none" stroke={withAlpha(color, 0.45)} strokeWidth={5} strokeLinecap="round" />
      <Path d="M 262 34 A 30 30 0 0 1 292 64" fill="none" stroke={withAlpha("#EF4444", 0.45)} strokeWidth={5} strokeLinecap="round" />
      <ALine x1={262} y1={64} stroke={color} strokeWidth={3} strokeLinecap="round" animatedProps={needle} />
      <Circle cx={262} cy={64} r={4.5} fill={color} />
      <SvgText x={262} y={84} fontSize={10} fill={muted} textAnchor="middle">
        0–100
      </SvgText>
    </>
  );
}

// ---- Tana tarkibi: barmoq elektrodga tegadi, odam siluetida ulush to'ladi ----

function BodyScene({ t, color, muted }: SceneProps) {
  const level = useAnimatedProps(() => {
    const k = interpolate(t.get(), [0, 0.3, 0.85, 1], [0, 0, 1, 1]);
    const h = 44 * k;
    return { y: 96 - h, height: h };
  });

  return (
    <>
      <ArmBody />
      <Strap />
      <WatchCase accent={color} />
      <FingerTouch t={t} color={color} />
      {/* Odam: bosh va tana; tana ichida ulush (yog' %) pastdan to'ladi */}
      <Circle cx={262} cy={30} r={11} fill="none" stroke={muted} strokeWidth={2} />
      <Rect x={246} y={46} width={32} height={50} rx={12} fill={withAlpha(color, 0.15)} stroke={muted} strokeWidth={2} />
      <ARect x={248} width={28} rx={10} fill={color} opacity={0.75} animatedProps={level} />
      <Chip x={16} y={16} label="Taxminiy baho" color={color} />
    </>
  );
}

const SCENES: Record<MetricKey, (props: SceneProps) => ReactElement> = {
  pulse: PulseScene,
  oxygen: OxygenScene,
  pressurePump: PressureScene,
  temperature: TemperatureScene,
  ecg: EcgScene,
  sugar: SugarScene,
  blood: BloodScene,
  hrv: HrvScene,
  stress: StressScene,
  bodyComp: BodyScene,
};

// Animatsiya ostidagi qisqa izoh: qo'llanmadagi (Matn tabi) qadamlarga mos.
const CAPTIONS: Record<MetricKey, string> = {
  pulse: "Qo'lni stolga qo'ying, yurak balandligida tinch tuting.",
  oxygen: "Soatni zich taqing va 30 soniya qimirlamang.",
  pressurePump: "Tirsakni stolga tirang. Soat yurak balandligida bo'lsin.",
  temperature: "Soat teriga zich tegib tursin. Natijani kuting.",
  ecg: "Boshqa qo'l barmog'ini elektrodga bosmasdan tekkizing va qimirlamang.",
  sugar: "Soatni zich taqing. Qiymat taxminiy, tashxis emas.",
  blood: "Soatni zich taqing. Natija taxminiy, tashxis emas.",
  hrv: "Tinch o'tiring, qo'l stolda. Bir daqiqa qimirlamang.",
  stress: "Bir necha daqiqa dam oling, so'ng qo'lni tinch tuting.",
  bodyComp: "Barmoqni elektrodga tekkizing. Natija taxminiy, tashxis emas.",
};

type Props = { metricKey: MetricKey };

// 1:1 (kvadrat) animatsiya kartasi. Tizimda "harakatni kamaytirish" yoqilgan bo'lsa, harakatsiz bitta kadr ko'rsatiladi.
export function GuideAnimation({ metricKey }: Props) {
  const color = METRIC_COLORS[metricKey];
  const muted = useThemeColor("muted", "#6B7385");
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.set(0.5);
      return;
    }
    t.set(0);
    t.set(withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const Scene = SCENES[metricKey];

  return (
    <View
      style={{
        width: "100%",
        maxWidth: 420,
        aspectRatio: 1,
        alignSelf: "center",
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: withAlpha(color, 0.1),
      }}
    >
      <Svg width="100%" height="100%" viewBox={`0 ${TOP} ${SIZE} ${SIZE}`}>
        <Scene t={t} color={color} muted={muted} />
      </Svg>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
        <CusText tone="muted" className="text-center">
          {CAPTIONS[metricKey]}
        </CusText>
      </View>
    </View>
  );
}
