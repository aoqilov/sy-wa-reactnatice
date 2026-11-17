import { Stack } from "expo-router";

// Soat bo'limi (header'dagi soat tugmasi): "Soat ma'lumotlari" va uning ichidagi "Soat ekrani".
export default function WatchLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Watch" }} />
      <Stack.Screen name="dials" options={{ title: "Watch faces" }} />
    </Stack>
  );
}
