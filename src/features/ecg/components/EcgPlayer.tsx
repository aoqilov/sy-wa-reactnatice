import Octicons from "@expo/vector-icons/Octicons";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";

import type { Polarity } from "../lib/ecg-analysis";
import { gainLabel } from "../lib/ecg-geometry";
import { EcgSweep, SWEEP_WINDOW_S as WINDOW_S, sweepGain } from "./EcgSweep";

const TICK_MS = 40;
const SPEEDS = [1, 2, 4] as const;

type Props = { samples: number[]; rate: number; sign: Polarity };

// Saqlangan EKG ni soatning rasmiy ilovasidagi kabi qayta o'ynatish: kulrang katak, qizil chiziq, ekran kengligiga
// sig'adigan 3 s lik oyna, yozuvchi monitordagidek yuradi (x1 — haqiqiy tezlik). Kataklar standart: kichik katak
// 0.04 s / 0.1 mV (10 mm/mV da), chapda 1 mV kalibrlash impulsi. Svg kichik (ekran kengligi), shuning uchun
// Android'da bitmap xotirasi muammo emas.
export function EcgPlayer({ samples, rate, sign }: Props) {
  const t = useT();
  const primary = useThemeColor("primary", "#1E6FEB");
  const [widthDp, setWidthDp] = useState(0);
  const total = samples.length;
  const windowN = Math.round(WINDOW_S * rate);
  // Yozilgan namunalar soni (yozuvchining joyi). Boshida birinchi oyna to'liq ko'rinadi.
  const [pos, setPos] = useState(() => Math.min(total, windowN));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  // Oxiriga yetgach o'zi to'xtaydi: `running` false bo'lib, taymer olib tashlanadi.
  const ended = pos >= total;
  const running = playing && !ended;

  useEffect(() => {
    if (!running) return;
    const step = Math.max(1, Math.round((rate * TICK_MS * speed) / 1000));
    const id = setInterval(() => setPos((p) => Math.min(total, p + step)), TICK_MS);
    return () => clearInterval(id);
  }, [running, speed, rate, total]);

  const gain = sweepGain(samples, sign);

  const play = () => {
    if (ended) {
      setPos(0); // oxiriga yetgan bo'lsa boshidan
      setPlaying(true);
      return;
    }
    setPlaying(!playing);
  };
  const replay = () => {
    setPos(0);
    setPlaying(true);
  };
  const changeSpeed = (dir: 1 | -1) => {
    const i = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, i + dir))]);
  };

  return (
    <View className="gap-3">
      <View className="self-stretch" onLayout={(e) => setWidthDp(e.nativeEvent.layout.width)}>
        {widthDp > 0 ? (
          <EcgSweep samples={samples} total={pos} rate={rate} sign={sign} gain={gain} widthDp={widthDp} head={running} />
        ) : null}
      </View>

      <CusText variant="caption" tone="muted" className="text-center">
        {(pos / rate).toFixed(1)} / {(total / rate).toFixed(0)} s · 25 mm/s · {gainLabel(gain, t("ecg.autoScale"))}
      </CusText>

      <View className="flex-row items-center justify-center gap-5">
        <Pressable accessibilityRole="button" accessibilityLabel={t("ecg.replay")} onPress={replay} hitSlop={10}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
            <Octicons name="sync" size={20} color={primary} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={running ? t("ecg.pause") : t("ecg.play")}
          onPress={play}
          hitSlop={10}
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Octicons name={running ? "pause" : "play"} size={28} color="#FFFFFF" />
          </View>
        </Pressable>

        <View className="flex-row items-center rounded-full bg-primary-soft px-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("ecg.slower")}
            onPress={() => changeSpeed(-1)}
            hitSlop={8}
            className="px-2 py-2"
          >
            <Octicons name="chevron-left" size={16} color={primary} />
          </Pressable>
          <CusText className="min-w-8 text-center font-semibold">x{speed}</CusText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("ecg.faster")}
            onPress={() => changeSpeed(1)}
            hitSlop={8}
            className="px-2 py-2"
          >
            <Octicons name="chevron-right" size={16} color={primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
