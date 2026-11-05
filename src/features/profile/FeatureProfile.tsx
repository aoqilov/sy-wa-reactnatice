import { router } from "expo-router";
import { ActivityIndicator, Button, StyleSheet, View } from "react-native";

import { ProfileHeader } from "./components/profile-header";
import { useProfile } from "./hooks/use-profile";

export function FeatureProfile() {
  const { profile, loading } = useProfile();

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ProfileHeader profile={profile} />
      <Button title="Settings" onPress={() => router.push("/profile/settings")} />
      <Button title="Edit" onPress={() => router.push("/profile/edit")} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
});
