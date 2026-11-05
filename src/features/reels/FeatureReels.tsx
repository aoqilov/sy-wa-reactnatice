import { StyleSheet, Text, View } from "react-native";

export function FeatureReels() {
  return (
    <View style={styles.container}>
      <Text>Reels</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
