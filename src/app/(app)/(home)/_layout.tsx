import { Stack } from "expo-router";

// Bosh sahifa tabi ichidagi sahifalar: kartalar to'ri → o'lchov sahifasi (doira va bugungi natijalar).
// Tab bar ichki sahifada ham ko'rinib turadi. anchor: o'lchov sahifasiga to'g'ridan-to'g'ri kelinganda ham orqaga
// qaytish kartalar to'riga olib boradi.
export const unstable_settings = {
  anchor: "index",
};

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="measure/[metric]" />
    </Stack>
  );
}
