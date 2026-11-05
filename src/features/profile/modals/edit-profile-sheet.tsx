import { router } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export function EditProfileSheet() {
  return (
    <View style={styles.container}>
      {/* Tepadagi "tayoqcha" (handle) */}
      <View style={styles.handle} />

      <Text style={styles.title}>Edit profile</Text>

      <Button title="Close" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 16, alignItems: "center" },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: "#C7C7CC" },
  title: { fontSize: 18, fontWeight: "700" },
});
