import { StyleSheet, Text, View } from "react-native";

export function FeatureNews() {
  return (
    <View style={styles.container}>
      <Text>News</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
