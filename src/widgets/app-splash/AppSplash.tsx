import { SplashScreen } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

const LOGO = require("../../../assets/images/splash-logo.png");

// Logo o'lchami (manba 616×920 — nisbatini saqlaymiz).
const LOGO_W = 96;
const LOGO_H = Math.round((LOGO_W * 920) / 616);

// Jami ~3 s: logo asta paydo bo'ladi → ostida yozuv chiqadi → biroz turadi → ekran so'nadi.
const LOGO_MS = 1200;
const TEXT_DELAY_MS = 900;
const TEXT_MS = 900;
const TEXT_RISE = 30; // ≈ yozuvning bir qator balandligi (fontSize 24)
const FADE_OUT_AT_MS = 2700;
const FADE_OUT_MS = 300;

// Native splash (app.json → expo-splash-screen) faqat oq fon. Shu komponent birinchi kadrda uning ustiga chiqadi va
// native splash'ni yopadi — ko'zga bitta uzluksiz ekran bo'lib ko'rinadi. Ilova `ready` bo'lmaguncha yopilmaydi.
export function AppSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useSharedValue(0);
  const text = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const easing = Easing.out(Easing.quad);
    logo.value = withTiming(1, { duration: LOGO_MS, easing });
    text.value = withDelay(TEXT_DELAY_MS, withTiming(1, { duration: TEXT_MS, easing }));
    const timer = setTimeout(() => setMinDone(true), FADE_OUT_AT_MS);
    return () => clearTimeout(timer);
  }, [logo, text]);

  useEffect(() => {
    if (!minDone || !ready) return;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS });
    const timer = setTimeout(onDone, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [minDone, ready, opacity, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value }));
  // Yozuv o'z joyidan bir qator (o'z balandligi) pastdan ko'tarilib chiqadi.
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * TEXT_RISE }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      onLayout={() => SplashScreen.hide()}
      pointerEvents={minDone && ready ? "none" : "auto"}
    >
      <Animated.Image source={LOGO} style={[{ width: LOGO_W, height: LOGO_H }, logoStyle]} resizeMode="contain" />
      <Animated.Text style={[styles.title, textStyle]}>synapse-watch</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    zIndex: 100,
  },
  title: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#1E6FEB",
  },
});
