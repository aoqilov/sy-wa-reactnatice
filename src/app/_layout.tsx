import "../../global.css";

import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PINK = "#EC4899";
const BLUE = "#1E63E9";

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar animated style="auto" />
      {/* Faqat status bar balandligidagi pushti chiziq */}
      {/* <View style={{ height: insets.top, backgroundColor: PINK }} /> */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: BLUE,
            borderTopWidth: 2,
            borderTopColor: PINK,
            height: 70 + insets.bottom, // pastki safe area ham ichiga kiradi
          },
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
          tabBarLabelStyle: { fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>⌂</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>⌕</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: "News",
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>▤</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="reels"
          options={{
            title: "Reels",
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>▶</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>☺</Text>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
