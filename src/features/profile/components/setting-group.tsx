import { ReactNode } from "react";
import { View } from "react-native";

import { CusText } from "@/components/ui";

// Sozlamalar kartasi ichidagi bitta blok: tepada nomi, pastda tanlov tugmalari.
export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <CusText className="text-sm font-medium">{title}</CusText>
      {children}
    </View>
  );
}
