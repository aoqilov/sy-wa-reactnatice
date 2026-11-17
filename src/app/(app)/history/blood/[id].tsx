import { useLocalSearchParams } from "expo-router";

import { BloodReportPage } from "@/features/history";

// /history/blood/<id> — bitta qon tahlili natijasi.
export default function BloodReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <BloodReportPage id={id} />;
}
