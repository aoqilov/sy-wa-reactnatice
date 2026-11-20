import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="preview" options={{ title: "UI preview" }} />
      <Stack.Screen
        name="edit"
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: [1], // forma uzun, shuning uchun to'liq balandlik
          sheetGrabberVisible: false, // tayoqchani o'zimiz chizamiz
          sheetCornerRadius: 30,
        }}
      />
    </Stack>
  );
}
