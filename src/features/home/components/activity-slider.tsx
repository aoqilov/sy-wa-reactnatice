import { router } from "expo-router";
import { type ReactElement, useState } from "react";
import { FlatList, useWindowDimensions, View } from "react-native";

import { useActivityGoals, useTodayActivity } from "@/features/activity";
import { SleepSlide, useSleep } from "@/features/sleep";

import { StepsSlide } from "./steps-slide";

const PADDING = 16; // ekran chetidan
const GAP = 12; // slaydlar orasida

// Home tepasidagi gorizontal slayder: Qadamlar va Uyqu (soatda qaysi biri bor bo'lsa). Qo'lda suriladi, har safar
// bitta slaydga to'xtaydi; ostida nuqtalar. Bittasi bo'lsa nuqtalar yo'q, hech biri bo'lmasa slayder chiqmaydi.
export function ActivitySlider() {
  const { width } = useWindowDimensions();
  const slideWidth = width - PADDING * 2;
  const interval = slideWidth + GAP;
  const [index, setIndex] = useState(0);

  const activity = useTodayActivity();
  const { goals, save: saveGoals } = useActivityGoals();
  const sleep = useSleep();

  const slides: { key: string; render: () => ReactElement }[] = [];
  if (activity.available) {
    slides.push({
      key: "steps",
      render: () => (
        <StepsSlide
          today={activity.today}
          goals={goals}
          ready={activity.ready}
          width={slideWidth}
          onSaveGoals={(g) => void saveGoals(g)}
          onPress={() => router.push("/history/steps", { withAnchor: true })}
        />
      ),
    });
  }
  if (sleep.available) {
    slides.push({
      key: "sleep",
      render: () => (
        <SleepSlide
          night={sleep.nights?.[0] ?? null}
          goalMin={goals.sleepMin}
          ready={sleep.ready}
          syncing={sleep.syncing}
          width={slideWidth}
          onPress={() => router.push("/history/sleep", { withAnchor: true })}
        />
      ),
    });
  }

  if (slides.length === 0) return null;

  return (
    <View className="gap-2">
      <FlatList
        data={slides}
        keyExtractor={(s) => s.key}
        renderItem={({ item }) => item.render()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEnabled={slides.length > 1}
        contentContainerStyle={{ paddingHorizontal: PADDING, gap: GAP }}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / interval);
          if (next !== index) setIndex(next);
        }}
        scrollEventThrottle={32}
      />

      {slides.length > 1 ? (
        <View className="flex-row justify-center gap-1.5">
          {slides.map((s, i) => (
            <View
              key={s.key}
              className={`h-1.5 rounded-full ${i === index ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
