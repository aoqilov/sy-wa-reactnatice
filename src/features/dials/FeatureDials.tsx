import { useState } from "react";
import { ActivityIndicator, Pressable, useWindowDimensions, View } from "react-native";

import { CusAccordion, CusButton, CusCard, CusImage, CusPageHeader, CusScrollView, CusText } from "@/components/ui";
import { reconnectWatch, useWatchConnection } from "@/shared/watch/watch-connection";
import { useTabBarSpace } from "@/widgets/app-tabs/AppTabs";

import { type DialInfo, isCurrentDial, type MarketDevice, type MarketDial, type MarketFailure } from "./api/dials";
import { InstallModal } from "./components/install-modal";
import { useDialMarket } from "./hooks/use-dial-market";

const COLS = 3;
const GAP = 12;
const PADDING = 16;
const MAX_WIDTH = 600; // planshetda kataklar haddan tashqari kattalashmasin
const PREVIEW_RATIO = 0.82; // soat ekrani (to'rtburchak) nisbati

const FAILURE_TEXT: Record<MarketFailure, string> = {
  notReady: "Soat ulanmagan. Ulangach siferblatlar shu yerda chiqadi.",
  busy: "Soat hozir band (o'lchov ketyapti). Tugagach qayta urinib ko'ring.",
  outdated: "Siferblatlar uchun ilovani yangilang.",
  noDevice: "Soat haqidagi ma'lumot to'liq emas. Soatni qayta ulang.",
  unsupported: "Bu soat siferblat do'konini qo'llab-quvvatlamaydi.",
  noInfo: "Soat siferblat ma'lumotini bermadi. Qayta urinib ko'ring.",
  network: "Serverdan ro'yxatni olib bo'lmadi. Internetni tekshiring.",
  noReply: "Javob kelmadi. Qayta urinib ko'ring.",
};

// Soat siferblati do'koni: Veepoo serveridagi siferblatlar 3 ustunli to'rda, har birining ostida "O'rnatilgan" yoki
// "O'rnatish". O'rnatish — markazdagi oynada (yuklab olish va soatga uzatish, ~2 daqiqa).
export function FeatureDials() {
  const { load, reload, installedCrc, setInstalledCrc, connected } = useDialMarket();
  const { battery } = useWatchConnection();
  const { width } = useWindowDimensions();
  const tabBarSpace = useTabBarSpace();
  const [target, setTarget] = useState<MarketDial | null>(null);
  // Soat "mos emas" deb rad etganlari (fileUrl): shu sessiyada ro'yxatda qayta ko'rsatilmaydi.
  const [rejected, setRejected] = useState<Set<string>>(() => new Set());

  const itemWidth = (Math.min(width, MAX_WIDTH) - PADDING * 2 - GAP * (COLS - 1)) / COLS;
  const result = load.status === "done" ? load.result : null;
  const dials = result?.ok ? result.items.filter((d) => !rejected.has(d.fileUrl)) : [];
  const { firmware, testFirmware } = useWatchConnection().info;
  const currentCrc = result?.ok ? result.currentCrc : null;
  const installed = (d: MarketDial) => (installedCrc !== null ? d.crc === installedCrc : isCurrentDial(d, currentCrc));

  return (
    <View className="flex-1 bg-background">
      <CusPageHeader title="Soatga siferblat qo'yish" fallbackHref="/watch" />

      <CusScrollView contentContainerClassName="gap-4 p-4" contentContainerStyle={{ paddingBottom: tabBarSpace }}>
        {!connected ? (
          <CusCard>
            <CusText tone="muted">{FAILURE_TEXT.notReady}</CusText>
          </CusCard>
        ) : load.status === "loading" ? (
          <CusCard className="items-center gap-2 py-8">
            <ActivityIndicator />
            <CusText tone="muted">Siferblatlar yuklanmoqda…</CusText>
          </CusCard>
        ) : result && !result.ok ? (
          <CusCard className="gap-3">
            <CusText>{FAILURE_TEXT[result.reason]}</CusText>
            {result.message ? (
              <CusText variant="caption" tone="muted">
                {result.message}
              </CusText>
            ) : null}
            {result.reason === "noDevice" ? (
              <CusButton title="Qayta ulash" variant="outline" size="sm" onPress={reconnectWatch} />
            ) : result.reason !== "unsupported" && result.reason !== "outdated" ? (
              <CusButton title="Qayta urinish" variant="outline" size="sm" onPress={() => void reload()} />
            ) : null}
          </CusCard>
        ) : result && result.ok && dials.length === 0 ? (
          <CusCard className="gap-3">
            <CusText>Server bu soat uchun siferblat bermadi.</CusText>
            <CusText variant="caption" tone="muted">
              Sabab: ilovamiz Veepoo serverida hali ro&apos;yxatdan o&apos;tmagan bo&apos;lishi mumkin (server ro&apos;yxatni ilova
              nomiga qarab beradi).
            </CusText>
            <CusButton title="Qayta urinish" variant="outline" size="sm" onPress={() => void reload()} />
          </CusCard>
        ) : result && result.ok ? (
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {dials.map((d) => (
              <DialCell key={d.fileUrl} dial={d} width={itemWidth} installed={installed(d)} onInstall={() => setTarget(d)} />
            ))}
          </View>
        ) : null}

        {load.status === "done" ? (
          <Diagnostics
            info={load.info}
            market={result?.ok ? { ...result.device, count: dials.length, rejected: rejected.size } : null}
            crc={currentCrc}
            firmware={firmware}
            testFirmware={testFirmware}
            protocols={[...new Set(dials.map((d) => d.binProtocol).filter(Boolean))].join(", ")}
          />
        ) : null}
      </CusScrollView>

      <InstallModal
        key={target?.fileUrl ?? "none"}
        dial={target}
        battery={battery}
        onClose={() => setTarget(null)}
        onInstalled={(d) => setInstalledCrc(d.crc)}
        onIncompatible={(d) => setRejected((s) => new Set(s).add(d.fileUrl))}
      />
    </View>
  );
}

function DialCell({
  dial,
  width,
  installed,
  onInstall,
}: {
  dial: MarketDial;
  width: number;
  installed: boolean;
  onInstall: () => void;
}) {
  return (
    <View className="items-center gap-2" style={{ width }}>
      <CusImage
        source={{ uri: dial.previewUrl }}
        accessibilityLabel={dial.name || "Siferblat"}
        style={{ width, aspectRatio: PREVIEW_RATIO, borderRadius: 14 }}
      />
      {installed ? (
        <View className="rounded-full bg-primary px-3 py-1">
          <CusText variant="caption" className="font-semibold text-white">
            O&apos;rnatilgan
          </CusText>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${dial.name || "Siferblat"}ni o'rnatish`}
          onPress={onInstall}
          hitSlop={6}
          className="rounded-full border border-border bg-surface px-3 py-1 active:bg-surface-alt"
        >
          <CusText variant="caption" className="font-semibold">
            O&apos;rnatish
          </CusText>
        </Pressable>
      )}
    </View>
  );
}

/** Sinov bosqichi uchun: soat nimani qo'llashi (do'kon ishlamasa sababini ko'rish uchun). */
function Diagnostics({
  info,
  market,
  crc,
  firmware,
  testFirmware,
  protocols,
}: {
  info: DialInfo | null;
  market: (MarketDevice & { count: number; rejected: number }) | null;
  crc: number | null;
  firmware: string | null;
  testFirmware: string | null;
  protocols: string;
}) {
  const dash = (v: string | null | undefined) => (v ? v : "—");
  const rows: [string, string][] = info
    ? [
        ["Chip platformasi", info.jl ? "Jieli" : "Oddiy"],
        ["Do'kon qo'llanadi", info.serverUi ? "Ha" : "Yo'q"],
        ["Uzatish turi (bigTranType)", String(info.bigTranType)],
        ["Server siferblatlari soni", String(info.serverCount)],
        ["Ekran uslubi", info.screenStyle ? "Ha" : "Yo'q"],
        ["Ilova", `${info.appPackage} ${info.appVersion}`],
      ]
    : [["Soat ma'lumoti", "o'qilmadi"]];
  rows.push(
    ["Firmware versiyasi", dash(firmware)],
    ["Test versiyasi (serverga)", dash(testFirmware)],
    ["Soat fayl turi (binDataType)", dash(market?.binDataType)],
    ["Soat ekran shakli", dash(market?.shape)],
    ["Siferblatlar binProtocol", dash(protocols)],
    ["Hozirgi siferblat CRC", crc !== null ? String(crc) : "—"],
    ["Ro'yxatda", market ? `${market.count} ta` : "—"],
    ["Server mos emas degan", market ? `${market.hidden} ta` : "—"],
    ["Soat rad etgan", market ? `${market.rejected} ta` : "—"],
  );
  return (
    <CusAccordion title="Texnik ma'lumot" icon="tools">
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between gap-3 py-1.5">
          <CusText variant="caption" tone="muted" className="shrink">
            {label}
          </CusText>
          <CusText variant="caption" className="shrink-0 font-semibold">
            {value}
          </CusText>
        </View>
      ))}
    </CusAccordion>
  );
}
