import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { CusButton, CusText } from "@/components/ui";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import { EMPTY_VALUE, Metric, MetricStatus } from "../api/get-metrics";

const TONE: Record<MetricStatus, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};

type Props = {
  metric: Metric;
  measuring: boolean;
  /** 0..1 — o'lchov qancha bajarilgani (shared/watch/measure.ts). */
  progress: number;
  // O'lchash paytida doira ichida ko'rinadigan qiymat va izoh (hooks/use-measurement.ts: liveDisplay).
  display: { big: string; caption: string } | null;
  onStart: () => void;
  onCancel: () => void;
};

const SIZE = 264;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HAND = 18; // mil uchidagi nuqta
// Soat foizni sekundiga ~1 marta yuboradi: yoy keyingi qiymatgacha shuncha vaqtda bir tekis yetadi (sakramaydi).
const STEP_MS = 1000;
const SPIN_MS = 2400; // foiz hali yo'q paytda milning bir aylanishi ("kutilmoqda")

// Doira ichidagi katta son (qiymat va hisoblagich). Uzun qiymat ("128/84") sig'masa, o'zi kichrayadi.
const NUMBER_STYLE = { fontSize: 54, lineHeight: 72, width: SIZE - 40, textAlign: "center" } as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Katta doira: o'lchov nomi, qiymat, birlik va "Boshlash" tugmasi.
// O'lchash vaqtida chegarasi soat mili kabi: tepadan (soat 12 dan) boshlab soat yo'nalishida o'lchov bajarilgan
// sari to'lib boradi, uchida mil (nuqta) aylanadi. Aylana yopilganda o'lchov tugaydi. Soat hali foiz bermagan
// bo'lsa (masalan soat ekrani ochilmoqda) mil to'xtamay sekin aylanadi: ilova qotmagan, kutilmoqda.
export function MeasureCircle({ metric, measuring, progress, display, onStart, onCancel }: Props) {
  const primary = useThemeColor("primary", "#1E6FEB");
  const track = useThemeColor("border", "#E5E8EE");

  const fill = useSharedValue(0); // 0..1, yoy
  const spin = useSharedValue(0); // gradus, kutish paytidagi aylanish
  const waiting = useSharedValue(0); // 1 — foiz yo'q, mil "spin" bo'yicha aylanadi
  const visible = useSharedValue(0); // mil ko'rinishi

  const indeterminate = measuring && progress <= 0;
  const measured = metric.value !== EMPTY_VALUE; // oxirgi o'lchov bor: qiymat holat rangida

  useEffect(() => {
    if (measuring) {
      visible.set(withTiming(1, { duration: 200 }));
      fill.set(withTiming(Math.min(1, Math.max(0, progress)), { duration: STEP_MS, easing: Easing.linear }));
      return;
    }
    // Tugadi: oxiriga yaqin bo'lsa avval to'liq yopiladi, keyin o'chadi; bekor qilinsa darhol orqaga qaytadi.
    visible.set(withTiming(0, { duration: 250 }));
    fill.set(
      fill.get() > 0.85
        ? withSequence(withTiming(1, { duration: 250 }), withTiming(0, { duration: 450 }))
        : withTiming(0, { duration: 300 }),
    );
  }, [measuring, progress, fill, visible]);

  useEffect(() => {
    if (indeterminate) {
      waiting.set(1);
      spin.set(0);
      spin.set(withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1));
    } else {
      waiting.set(0);
      cancelAnimation(spin);
    }
  }, [indeterminate, spin, waiting]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - fill.get()),
  }));

  // Mil: butun doira o'lchamidagi qatlam markaz atrofida aylanadi, nuqta uning tepasida (halqa ustida).
  const handStyle = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ rotate: `${waiting.get() ? spin.get() : fill.get() * 360}deg` }],
  }));

  return (
    <View style={styles.box} className="items-center justify-center gap-1 rounded-full bg-surface">
      {/* Halqa: kulrang yo'l va ustida to'lib boruvchi yoy (Svg -90° burilgan: boshlanish soat 12 da). */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={track} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            fill="none"
            animatedProps={arcProps}
          />
        </Svg>
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, handStyle]}>
        <View style={[styles.hand, { backgroundColor: primary }]} />
      </Animated.View>

      <CusText tone="muted">{metric.title}</CusText>

      {measuring ? (
        <>
          <CusText className="font-bold" style={NUMBER_STYLE} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {display?.big ?? "…"}
          </CusText>
          <CusText variant="caption" tone="muted" className="px-6 text-center" numberOfLines={2}>
            {display?.caption ?? ""}
          </CusText>
          <CusButton
            title="Bekor qilish"
            variant="outline"
            className="mt-3 h-10"
            onPress={onCancel}
          />
        </>
      ) : (
        <>
          <CusText
            className="font-bold"
            tone={measured ? TONE[metric.status] : "default"}
            style={NUMBER_STYLE}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {metric.value}
          </CusText>
          <CusText variant="caption" tone="muted">
            {metric.unit}
          </CusText>
          {/* Oxirgi o'lchov: qachon o'lchangani (avval doira ostidagi alohida kartada edi) */}
          <CusText variant="caption" tone="muted" className="px-8 text-center" numberOfLines={1}>
            {measured ? `Oxirgi o'lchov: ${metric.updatedAt}` : metric.updatedAt}
          </CusText>
          <CusButton
            title="Boshlash"
            className="mt-3 h-10 px-8"
            onPress={onStart}
          />
        </>
      )}
    </View>
  );
}

// O'lcham va doira shakli className ga bog'liq bo'lmasligi uchun style bilan berilgan.
const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
  ring: { transform: [{ rotate: "-90deg" }] },
  hand: {
    position: "absolute",
    top: STROKE / 2 - HAND / 2,
    left: SIZE / 2 - HAND / 2,
    width: HAND,
    height: HAND,
    borderRadius: HAND / 2,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
