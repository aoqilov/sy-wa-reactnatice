import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewInstance,
  ScrollViewProps,
  TextInput,
} from "react-native";

// Fokusdagi input ustida qoldiriladigan joy (uning sarlavhasi — label ham ko'rinib tursin).
const TOP_GAP = 96;
// Klaviatura ochilib, ekran qayta o'lchanishi uchun kutish (ms).
const LAYOUT_DELAY = 100;

// CusInput fokus olganda shu funksiyani chaqiradi — scroll uni klaviatura ustiga olib chiqadi.
const ScrollToFocusedContext = createContext<(() => void) | null>(null);
export const useScrollToFocusedInput = () => useContext(ScrollToFocusedContext);

type Props = ScrollViewProps & {
  containerClassName?: string; // tashqi o'ram (KeyboardAvoidingView) uchun
  keyboardVerticalOffset?: number; // tepada header bo'lsa, uning balandligi
};

// Ichida input'lar bor uzun forma uchun: klaviatura chiqqanda kontent klaviatura ustiga ko'tariladi,
// fokusdagi input esa ko'rinadigan joyga suriladi.
//
// Muhim: Expo ilovalari Android'da edge-to-edge, ya'ni klaviatura chiqqanda oyna o'zi kichraymaydi.
// Shuning uchun `behavior="padding"` ikkala platformada ham berilishi shart (faqat iOS'da emas).
export function CusKeyboardScrollView({
  containerClassName = "flex-1",
  keyboardVerticalOffset = 0,
  children,
  ...rest
}: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToFocused = useCallback(() => {
    if (Platform.OS === "web") return; // web'da brauzer fokusdagi input'ni o'zi ko'rsatadi
    const scroll = scrollRef.current;
    const content = scroll?.getInnerViewRef();
    const input = TextInput.State.currentlyFocusedInput();
    if (!scroll || !content || !input) return;

    // Input'ning scroll kontentiga nisbatan joyi -> shu joyga (TOP_GAP bilan) suramiz.
    input.measureLayout(
      content,
      (_x, y) => scroll.scrollTo({ y: Math.max(0, y - TOP_GAP), animated: true }),
      () => {},
    );
  }, []);

  // Fokus bir input'dan boshqasiga o'tganda ham (klaviatura yopilmasdan) ishlashi uchun kechiktirib chaqiramiz.
  const scheduleScroll = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(scrollToFocused, LAYOUT_DELAY);
  }, [scrollToFocused]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", scheduleScroll);
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleScroll]);

  return (
    <KeyboardAvoidingView
      className={containerClassName}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollToFocusedContext.Provider value={scheduleScroll}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" {...rest}>
          {children}
        </ScrollView>
      </ScrollToFocusedContext.Provider>
    </KeyboardAvoidingView>
  );
}
