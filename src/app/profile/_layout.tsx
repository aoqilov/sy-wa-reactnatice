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
      <Stack.Screen
        name="edit"
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: [0.5, 1], // yarim va to'liq balandlik
          sheetGrabberVisible: false, // tayoqchani o'zimiz chizamiz
          sheetCornerRadius: 30,
        }}
      />
    </Stack>
  );
}
