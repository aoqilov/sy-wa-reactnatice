import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusScrollView } from "./CusScrollView";
import { CusText } from "./CusText";

type Snap = "half" | "full";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  initialSnap?: Snap; // qaysi pog'onada ochilishi: "half" (0.5, standart) yoki "full" (1)
  children: ReactNode;
};

const HALF_RATIO = 0.5; // 0.5: yarim ekran
const CLOSE_DISTANCE = 110; // shuncha pastga tortilsa yopiladi (yoki kichrayadi)
const EXPAND_DISTANCE = 60; // shuncha tepaga tortilsa to'liq ochiladi
const OFFSCREEN = 1200; // sheet ekrandan tashqarida turgan holati

// Pastdan chiqadigan oyna, ikki pog'onali: 0.5 (yarim) va 1 (to'liq).
// - Doim 0.5 da ochiladi (ma'lumot ko'p bo'lsa ichida scroll bo'ladi).
// - Tayoqchani tepaga tortsangiz 1 ga kengayadi. Pastga tortsangiz (0.5 da ham, 1 da ham) yopiladi.
// Ochilish/yopilish animatsiyasini Modal emas, o'zimiz boshqaramiz.
export function CusBottomSheet({ visible, onClose, title, initialSnap = "half", children }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const HALF = screenH * HALF_RATIO;
  const FULL = screenH - insets.top; // 1: tepada status bar uchun joy qoladi

  // progress: 0 = yopiq, 1 = ochiq. drag: barmoq bilan tortilgan masofa.
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const [heightAnim] = useState(() => new Animated.Value(initialSnap === "full" ? FULL : HALF));

  // Yopilish animatsiyasi tugamaguncha Modal ekranda qoladi.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  // Hozirgi pog'ona: har safar yarim (0.5) dan boshlanadi, foydalanuvchi tortib 1 ga chiqarishi mumkin.
  const [snap, setSnap] = useState<Snap>(initialSnap);
  const targetHeight = snap === "full" ? FULL : HALF;

  // Pog'ona o'zgarsa balandlik silliq o'zgaradi.
  useEffect(() => {
    Animated.timing(heightAnim, { toValue: targetHeight, duration: 220, useNativeDriver: false }).start();
  }, [targetHeight, heightAnim]);

  // Ochilish va yopilish.
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          setSnap(initialSnap);
        }
      });
    }
  }, [visible, mounted, progress, drag, initialSnap]);

  // onClose yoki pog'ona o'zgarsa PanResponder qayta yaratiladi (surish paytida bunday bo'lmaydi).
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) drag.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy < -EXPAND_DISTANCE || g.vy < -0.8) {
            // tepaga tortildi: to'liq ochiladi
            setSnap("full");
            Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          } else if (g.dy > CLOSE_DISTANCE || g.vy > 1) {
            // pastga tortildi: qaysi pog'onada bo'lishidan qat'i nazar, to'g'ridan-to'g'ri yopiladi
            onClose(); // yopilish animatsiyasi yuqoridagi effect'da, tortilgan joydan davom etadi
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [onClose, drag],
  );

  if (!mounted) return null;

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [OFFSCREEN, 0] });
  const translateY = Animated.add(slide, drag);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable accessibilityLabel="Yopish" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Tashqi qatlam: faqat siljish (native animatsiya). Balandlik ichki qatlamda (JS animatsiya). */}
        <Animated.View className="overflow-hidden bg-surface" style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Animated.View style={{ height: heightAnim, paddingBottom: insets.bottom + 8 }}>
            {/* Shu qism tortiladi: tayoqcha va sarlavha */}
            <View
              {...panResponder.panHandlers}
              className="items-center gap-3 px-4 pb-2 pt-3"
            >
              <View className="h-1.5 w-10 rounded-full bg-border" />
              {title ? <CusText variant="heading">{title}</CusText> : null}
            </View>

            <CusScrollView
              style={styles.scroll}
              contentContainerClassName="gap-4 p-4"
              bounces={false}
            >
              {children}
            </CusScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Joylashuv className ga bog'liq bo'lmasligi uchun oddiy style bilan yozilgan.
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scroll: { flex: 1 },
});
