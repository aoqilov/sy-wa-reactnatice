import { useLocalSearchParams } from "expo-router";

import { BodyReportPage } from "@/features/body";

// /history/body/<id> — bitta tana tarkibi natijasi.
export default function BodyReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <BodyReportPage id={id} />;
}
