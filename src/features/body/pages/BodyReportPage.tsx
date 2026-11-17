import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { useProfile } from "@/features/profile";
import { useT } from "@/shared/i18n/use-t";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { BodyResult } from "../components/body-result";
import { useBody } from "../hooks/use-body";
import { dateTimeText } from "../lib/format";
import { personFrom } from "../lib/norms";
import { BodyHowSheet } from "../modals/body-how-sheet";

// Bitta tana tarkibi natijasi (/history/body/[id]), EKG hisoboti kabi alohida sahifa: barcha ko'rsatkichlar oddiy matnda,
// oldingi o'lchovdan farqi bilan.
export function BodyReportPage({ id }: { id: string }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  const { entries } = useBody();
  const { profile } = useProfile();
  const [howOpen, setHowOpen] = useState(false);

  const index = entries ? entries.findIndex((e) => e.id === id) : -1;
  const entry = index >= 0 ? entries![index] : null;

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader
        title={t("body.result")}
        subtitle={entry ? dateTimeText(entry.at) : undefined}
        fallbackHref="/history/body"
      />

      {entries === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !entry ? (
        <CusText tone="danger" className="p-6 text-center">
          {t("body.notFound")}
        </CusText>
      ) : (
        <CusScrollView className="flex-1" contentContainerClassName="p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
          <BodyResult
            entry={entry}
            prev={entries[index + 1] ?? null}
            person={personFrom(profile)}
            onHow={() => setHowOpen(true)}
            onEditWeight={() => router.push("/profile/edit")}
          />
        </CusScrollView>
      )}

      <BodyHowSheet visible={howOpen} onClose={() => setHowOpen(false)} />
    </View>
  );
}
