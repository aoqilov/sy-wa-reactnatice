import { useLocalSearchParams } from "expo-router";

import { EcgReportPage } from "@/features/ecg";

// /history/ecg/<id> — bitta EKG yozuvining hisoboti.
export default function EcgReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EcgReportPage id={id} />;
}
