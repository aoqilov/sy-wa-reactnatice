import { View } from "react-native";

const HEIGHT = 36;
const MIN_BAR = 6;

// Kichik ustunli grafik. null = shu kuni o'lchov yo'q (kulrang nuqta).
export function MiniBars({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  return (
    <View className="flex-row items-end gap-1" style={{ height: HEIGHT }}>
      {values.map((v, i) =>
        v === null ? (
          <View key={i} className="rounded-full bg-border" style={{ width: 5, height: 4 }} />
        ) : (
          <View
            key={i}
            className="rounded-full bg-primary"
            style={{ width: 5, height: MIN_BAR + ((v - min) / range) * (HEIGHT - MIN_BAR) }}
          />
        ),
      )}
    </View>
  );
}
