import { Stack } from "expo-router";

// Tarix tabi ichidagi sahifalar: ro'yxat → o'lchov turi sahifasi → (EKG) yozuv hisoboti. Sarlavhalar o'zimizniki
// (CusPageHeader), shuning uchun Stack sarlavhasi o'chirilgan. Tab bar ichki sahifalarda ham ko'rinib turadi.
// anchor: ichki sahifaga to'g'ridan-to'g'ri kelinganda ham (Home'dan, havoladan) orqaga qaytish ro'yxatga olib boradi
// (SDK 58: `initialRouteName` o'rniga `unstable_settings.anchor`).
export const unstable_settings = {
  anchor: "index",
};

export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[metric]" />
      <Stack.Screen name="ecg/[id]" />
    </Stack>
  );
}
