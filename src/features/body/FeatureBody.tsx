import Octicons from "@expo/vector-icons/Octicons";
import { useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, View } from "react-native";

import { CusCard, CusDivider, CusListItem, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { useBody } from "./hooks/use-body";
import { dateTimeText } from "./lib/format";

const ERROR_TEXT: Record<string, TranslationKey> = {
  busy: "body.sync.busy",
  noReply: "body.sync.noReply",
  unsupported: "body.sync.unsupported",
};

// Tana tarkibi yozuvlari (/history/body), EKG yozuvlari kabi: sana, qisqa qiymatlar va manba. Bittasi bosilsa, natija
// o'z sahifasida (/history/body/[id]) ochiladi. Ochilganda soatning o'zida o'lchanganlar ham o'qiladi.
export function FeatureBody() {
  const t = useT();
  const router = useRouter();
  const primary = useThemeColor("primary", "#1E6FEB");
  const muted = useThemeColor("muted", "#6B7385");
  const tabBarSpace = useTabBarSpace();
  const { entries, syncing, error, ready, demo, refresh } = useBody({ autoSync: true });

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title={t("body.title")} subtitle={t("body.records")} fallbackHref="/history" />
      {demo || syncing || error ? (
        <View className="flex-row items-center justify-center gap-2 px-4 pb-1">
          {syncing ? <ActivityIndicator size="small" /> : null}
          <CusText variant="caption" tone="muted">
            {demo ? t("body.sync.demo") : syncing ? t("body.sync.running") : error ? t(ERROR_TEXT[error] ?? "body.sync.noReply") : ""}
          </CusText>
        </View>
      ) : null}

      {entries === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <CusScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
          refreshControl={
            <RefreshControl
              refreshing={syncing}
              onRefresh={() => {
                if (ready) void refresh();
              }}
              enabled={ready}
              colors={[primary]}
              tintColor={primary}
            />
          }
        >
          {entries.length === 0 ? (
            <CusText tone="muted" className="p-2 text-center">
              {t("body.empty.text")}
            </CusText>
          ) : (
            <CusCard className="p-0">
              {entries.map((e, i) => (
                <View key={e.id}>
                  {i > 0 ? <CusDivider /> : null}
                  <CusListItem
                    title={dateTimeText(e.at)}
                    subtitle={[
                      `${t("body.fatPct")} ${e.parts.fatPct.toFixed(1)} %`,
                      `BMI ${e.parts.bmi.toFixed(1)}`,
                      t(e.source === "watch" ? "body.source.watch" : "body.source.app"),
                    ].join(" · ")}
                    left={<Octicons name="person" size={18} color={muted} />}
                    right={<Octicons name="chevron-right" size={18} color={muted} />}
                    onPress={() => router.push({ pathname: "/history/body/[id]", params: { id: e.id } })}
                  />
                </View>
              ))}
            </CusCard>
          )}
        </CusScrollView>
      )}
    </View>
  );
}
