import { useState } from "react";
import { View } from "react-native";

import { WatchConnectScreen } from "@/features/watch";
import { useWatchConnection } from "@/shared/watch/watch-connection";

// Soat ulanmaguncha butun ilovani (header, tablar, hamma sahifa) to'liq ekran bilan to'sadi.
// Asosiy ilova ostida mountda qoladi (holati yo'qolmaydi), faqat tegib bo'lmaydi. Soat ulangach (yoki aloqa
// uzilsa) o'zi paydo bo'ladi/yo'qoladi.
export function WatchGate() {
  const { status } = useWatchConnection();
  // Faqat dev + soat moduli yo'q (Expo Go) holatida UI ustida ishlash uchun to'siqni o'tkazib yuborish mumkin.
  const [devSkip, setDevSkip] = useState(false);

  if (status === "ready") return null;
  if (__DEV__ && status === "unavailable" && devSkip) return null;

  return (
    // zIndex/elevation: Android'da tab bar (elevation) ustida turishi uchun
    <View className="absolute inset-0 bg-background" style={{ zIndex: 100, elevation: 100 }}>
      <WatchConnectScreen onDevSkip={() => setDevSkip(true)} />
    </View>
  );
}
