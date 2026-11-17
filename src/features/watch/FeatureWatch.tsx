import Octicons from "@expo/vector-icons/Octicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { CusButton, CusCard, CusText } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { useThemeColor } from "@/shared/theme/use-theme-color";
import {
  disconnectWatch,
  reconnectWatch,
  refreshWatchInfo,
  useWatchConnection,
} from "@/shared/watch/watch-connection";
import { missingNativeFunctions } from "@/shared/watch/measure";
import { FEATURE_KEYS, isAutoMeasureSupported, type WatchFeatureKey } from "@/shared/watch/watch-info";
import { BatteryIndicator } from "@/widgets/app-header/battery-indicator";

import { CallForwardCard } from "./components/call-forward-card";
import { WatchDevPanel } from "./WatchDevPanel";

// Header bosilganda ochiladigan sahifa: ulangan soat haqida ma'lumot (model, batareya, versiya, imkoniyatlar,
// soatdagi avto-o'lchash). Pastda 1-bosqichning sinov va diagnostika bloki (jurnal) yig'ilgan holda turadi.

const FEATURE_LABEL: Record<WatchFeatureKey, TranslationKey> = {
  bloodPressure: "watchInfo.feature.bloodPressure",
  heartRateDetect: "watchInfo.feature.heartRateDetect",
  temperature: "watchInfo.feature.temperature",
  autoMeasure: "watchInfo.feature.autoMeasure",
  textImagePush: "watchInfo.feature.textImagePush",
  sportModel: "watchInfo.feature.sportModel",
  bloodGlucose: "watchInfo.feature.bloodGlucose",
  bloodComponent: "watchInfo.feature.bloodComponent",
};

const AUTO_TYPE_LABEL: Record<string, TranslationKey> = {
  PULSE_RATE: "watchInfo.autoMeasure.type.PULSE_RATE",
  BLOOD_PRESSURE: "watchInfo.autoMeasure.type.BLOOD_PRESSURE",
  BLOOD_OXYGEN: "watchInfo.autoMeasure.type.BLOOD_OXYGEN",
  BODY_TEMPERATURE: "watchInfo.autoMeasure.type.BODY_TEMPERATURE",
  STRESS: "watchInfo.autoMeasure.type.STRESS",
  HRV: "watchInfo.autoMeasure.type.HRV",
};

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "muted" }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <CusText tone="muted" className="shrink">
        {label}
      </CusText>
      <CusText className="shrink-0 text-right font-semibold" tone={tone ?? "default"} selectable>
        {value}
      </CusText>
    </View>
  );
}

export function FeatureWatch() {
  const t = useT();
  const { status, model, battery, info } = useWatchConnection();
  const [devOpen, setDevOpen] = useState(false);
  const primary = useThemeColor("primary", "#1E6FEB");
  const ready = status === "ready";
  const dash = "—";
  // O'rnatilgan APK'dagi native modul yangi o'lchovlarni (SpO2, bosim, harorat, EKG ...) biladimi.
  const missing = missingNativeFunctions();

  // Sahifa ochilganda batareya va avto-o'lchash sozlamasini yangilaymiz (soat ulangan bo'lsa).
  useEffect(() => {
    if (ready) refreshWatchInfo();
  }, [ready]);

  // Uzilgach ilovani "Soatni ulang" ekrani to'sadi, shuning uchun tasodifiy bosishdan oldin tasdiq so'raymiz.
  const confirmDisconnect = () => {
    Alert.alert(t("watchInfo.disconnect.title"), t("watchInfo.disconnect.message"), [
      { text: t("watchConnect.cancel"), style: "cancel" },
      { text: t("watchInfo.disconnect.confirm"), style: "destructive", onPress: disconnectWatch },
    ]);
  };

  const featureText = (key: WatchFeatureKey) => {
    const value = info.features[key];
    if (!value || value === "UNKONW") return t("watchInfo.unknown");
    return value === "UNSUPPORT" ? t("watchInfo.unsupported") : t("watchInfo.supported");
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-3 p-4 pb-28">
      {/* 1. Qisqacha: model, holat, batareya */}
      <CusCard className="items-center gap-2">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
          <Octicons name="clock" size={30} color={primary} />
        </View>
        <CusText variant="title">{model ?? t("watch.fallbackName")}</CusText>
        <CusText tone={ready ? "success" : "muted"} className="font-semibold">
          {ready ? t("watchInfo.connected") : t("watch.notConnected")}
        </CusText>
        {battery !== null ? <BatteryIndicator level={battery} /> : null}
        <View className="mt-1 flex-row gap-2">
          <CusButton
            title={t("watchInfo.refresh")}
            variant="outline"
            size="sm"
            disabled={!ready}
            onPress={refreshWatchInfo}
          />
          <CusButton
            title={t("watchInfo.disconnect")}
            variant="outline"
            size="sm"
            disabled={!ready}
            onPress={confirmDisconnect}
          />
        </View>
      </CusCard>

      {/* Soatga siferblat qo'yish: do'kondan tanlash va o'rnatish (/watch/dials) */}
      <CusCard className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
            <Octicons name="apps" size={20} color={primary} />
          </View>
          <CusText variant="heading" className="flex-1">
            {t("watchInfo.dials.title")}
          </CusText>
        </View>
        <CusText tone="muted">{t("watchInfo.dials.desc")}</CusText>
        <CusButton title={t("watchInfo.dials.open")} disabled={!ready} onPress={() => router.push("/watch/dials")} />
      </CusCard>

      {/* Telefon qo'ng'iroqlarini soatga uzatish (kalit) */}
      <CallForwardCard connected={ready} />

      {/* Versiya va imkoniyatlar soatdan ulanish paytida keladi: soat avval ulangan bo'lsa, qayta ulash kerak */}
      {ready && info.firmware === null ? (
        <CusCard className="gap-2">
          <CusText tone="muted">{t("watchInfo.incomplete")}</CusText>
          <CusButton title={t("watchInfo.reconnect")} variant="outline" size="sm" onPress={reconnectWatch} />
        </CusCard>
      ) : null}

      {/* 2. Qurilma */}
      <CusText variant="heading">{t("watchInfo.device")}</CusText>
      <CusCard className="py-2">
        <Row label={t("watchInfo.model")} value={model ?? dash} />
        <Row label={t("watchInfo.address")} value={info.address ?? dash} />
        <Row label={t("watchInfo.firmware")} value={info.firmware ?? dash} />
        <Row label={t("watchInfo.testFirmware")} value={info.testFirmware ?? dash} />
        <Row label={t("watchInfo.deviceNumber")} value={info.deviceNumber !== null ? String(info.deviceNumber) : dash} />
        <Row
          label={t("watchInfo.appModule")}
          value={missing.length === 0 ? t("watchInfo.appModule.ok") : t("watchInfo.appModule.old")}
          tone={missing.length === 0 ? "success" : "muted"}
        />
        <Row
          label={t("watchInfo.battery")}
          value={
            battery !== null
              ? `${battery}%${info.batteryLevel !== null ? ` · ${info.batteryLevel}/4` : ""}`
              : dash
          }
        />
      </CusCard>

      {/* 3. Imkoniyatlar (soat qaysi funksiyalarni qo'llab-quvvatlaydi) */}
      <CusText variant="heading">{t("watchInfo.features")}</CusText>
      <CusCard className="py-2">
        {FEATURE_KEYS.map((key) => {
          const text = featureText(key);
          return (
            <Row
              key={key}
              label={t(FEATURE_LABEL[key])}
              value={text}
              tone={text === t("watchInfo.supported") ? "success" : "muted"}
            />
          );
        })}
      </CusCard>

      {/* 4. Soatning o'zidagi avto-o'lchash sozlamasi ("Mening rejam" shunga yoziladi) */}
      <CusText variant="heading">{t("watchInfo.autoMeasure")}</CusText>
      <CusCard className="py-2">
        {info.autoMeasure === null ? (
          <CusText tone="muted" className="py-2">
            {isAutoMeasureSupported(info.features)
              ? t("watchInfo.autoMeasure.empty")
              : t("watchInfo.autoMeasure.unsupported")}
          </CusText>
        ) : (
          info.autoMeasure
            .filter((item) => item.type !== "HRV")
            .map((item) => (
              <Row
                key={item.type}
                label={AUTO_TYPE_LABEL[item.type] ? t(AUTO_TYPE_LABEL[item.type]) : item.type}
                value={
                  item.on
                    ? `${t("watchInfo.autoMeasure.every", { min: item.intervalMin })} · ${hhmm(item.startMin)}–${hhmm(item.endMin)}`
                    : t("watchInfo.autoMeasure.off")
                }
                tone={item.on ? "success" : "muted"}
              />
            ))
        )}
      </CusCard>

      {/* 5. Sinov va diagnostika (jurnal): odatda yopiq */}
      <CusButton
        title={devOpen ? t("watchInfo.dev.hide") : t("watchInfo.dev.show")}
        variant="ghost"
        size="sm"
        onPress={() => setDevOpen((v) => !v)}
      />
      {devOpen ? <WatchDevPanel /> : null}
    </ScrollView>
  );
}
