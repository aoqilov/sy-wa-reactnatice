import { StyleSheet, Text, View } from "react-native";

import { Profile } from "../api/get-profile";

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile.name}</Text>
      <Text>{profile.username}</Text>
      <Text>{profile.followers} followers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 4 },
  name: { fontSize: 22, fontWeight: "700" },
});
