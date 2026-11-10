import { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";

import { CusButton, CusText } from "@/components/ui";
import { ensureBluetoothPermissions } from "@/shared/watch/bluetooth-permissions";
import { shareEcgDebug } from "@/shared/watch/ecg-debug";
import { useWatchConnection } from "@/shared/watch/watch-connection";
import { clearWatchLog, logWatch, useWatchLog } from "@/shared/watch/watch-log";

import watchModule, { AutoMeasureType, type ScanEvent } from "../../../modules/veepoo-watch";

// VAQTINCHALIK: docs/watch-integration-plan.md, 1-bosqich (go/no-go sinovi). 4-bosqichda haqiqiy
// skan/ulanish ekrani bilan almashtiriladi va bu fayl o'chiriladi. Shuning uchun matnlar i18n'siz.
// Jurnal umumiy (shared/watch/watch-log.ts): Home'dagi o'lchovlarning kadrlari ham shu yerda ko'rinadi.

type Device = { id: string; name: string; rssi: number };

type WatchModule = NonNullable<typeof watchModule>;

// Native modul bor bo'lgandagina chaqiriladi (tashqi WatchDevPanel tekshiradi).
function WatchDevPanelInner({ watch }: { watch: WatchModule }) {
  const VeepooWatch = watch;
  const { status } = useWatchConnection();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const log = useWatchLog();
  const addLog = logWatch;

  useEffect(() => {
    const subscription = VeepooWatch.addListener("scan", (e: ScanEvent) => {
      if (e.state === "started") setScanning(true);
      else if (e.state === "stopped") setScanning(false);
      else if (e.state === "found" && e.id) {
        const device: Device = { id: e.id, name: e.name ?? "(nomsiz)", rssi: e.rssi ?? 0 };
        setDevices((prev) => [device, ...prev.filter((d) => d.id !== device.id)]);
      }
    });
    return () => subscription.remove();
  }, [VeepooWatch]);

  // Native chaqiruvlar xato bersa (masalan SDK ishga tushmasa) jurnalga yozamiz, ilova yiqilmaydi.
  const run = useCallback(
    (label: string, fn: () => void) => {
      try {
        addLog(`> ${label}`);
        fn();
      } catch (err) {
        addLog(`[XATO] ${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [addLog],
  );

  const startScan = useCallback(async () => {
    if (!(await ensureBluetoothPermissions()).granted) {
      addLog("[XATO] Bluetooth ruxsati berilmadi");
      return;
    }
    setDevices([]);
    run("startScan", () => VeepooWatch.startScan());
  }, [addLog, run, VeepooWatch]);

  const ready = status === "ready";

  return (
    <View className="gap-3">
      <CusText variant="heading">Soat sinovi (1-bosqich)</CusText>
      <CusText tone="muted" variant="caption">
        Holat: {status}
      </CusText>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <CusButton title="Skan" size="sm" disabled={scanning} onPress={startScan} />
        </View>
        <View className="flex-1">
          <CusButton
            title="Skanni to'xtatish"
            size="sm"
            variant="outline"
            disabled={!scanning}
            onPress={() => run("stopScan", () => VeepooWatch.stopScan())}
          />
        </View>
        <View className="flex-1">
          <CusButton
            title="Uzish"
            size="sm"
            variant="outline"
            onPress={() => run("disconnect", () => VeepooWatch.disconnect())}
          />
        </View>
      </View>

      {devices.map((d) => (
        <CusButton
          key={d.id}
          size="sm"
          variant="outline"
          title={`${d.name} · ${d.id} · ${d.rssi} dBm`}
          onPress={() => run(`connect ${d.id}`, () => VeepooWatch.connect(d.id, true))}
        />
      ))}

      <CusText variant="heading" className="mt-2">
        {"O'lchovlar"}
      </CusText>
      <View className="flex-row flex-wrap gap-2">
        <CusButton title="Batareya" size="sm" disabled={!ready} onPress={() => run("readBattery", () => VeepooWatch.readBattery())} />
        <CusButton title="Puls ▶" size="sm" disabled={!ready} onPress={() => run("startHeart", () => VeepooWatch.startHeart())} />
        <CusButton title="Puls ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopHeart", () => VeepooWatch.stopHeart())} />
        <CusButton title="SpO₂ ▶" size="sm" disabled={!ready} onPress={() => run("startSpo2", () => VeepooWatch.startSpo2())} />
        <CusButton title="SpO₂ ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopSpo2", () => VeepooWatch.stopSpo2())} />
        <CusButton title="Bosim (optik) ▶" size="sm" disabled={!ready} onPress={() => run("startBp", () => VeepooWatch.startBp())} />
        <CusButton title="Bosim (optik) ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopBp", () => VeepooWatch.stopBp())} />
        <CusButton title="EKG ▶" size="sm" disabled={!ready} onPress={() => run("startEcg", () => VeepooWatch.startEcg())} />
        <CusButton title="EKG ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopEcg", () => VeepooWatch.stopEcg())} />
        <CusButton
          title="EKG xom ma'lumotini ulashish"
          size="sm"
          variant="outline"
          onPress={() =>
            shareEcgDebug()
              .then((ok) => addLog(ok ? "EKG xom ma'lumoti ulashildi" : "[XATO] Hali EKG o'lchovi yo'q (Home'dan EKG o'lchang)"))
              .catch((err) => addLog(`[XATO] EKG ulashish: ${err instanceof Error ? err.message : String(err)}`))
          }
        />
        <CusButton title="Harorat ▶" size="sm" disabled={!ready} onPress={() => run("startTemp", () => VeepooWatch.startTemp())} />
        <CusButton title="Harorat ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopTemp", () => VeepooWatch.stopTemp())} />
        <CusButton title="Yostiqcha bosim ▶" size="sm" disabled={!ready} onPress={() => run("startCuffBp", () => VeepooWatch.startCuffBp(false))} />
        <CusButton title="Yostiqcha ■" size="sm" variant="outline" disabled={!ready} onPress={() => run("stopCuffBp", () => VeepooWatch.stopCuffBp())} />
        <CusButton title="Soatdagi bosim (oxirgi 30 daq)" size="sm" variant="outline" disabled={!ready} onPress={() => run("readManualBp", () => VeepooWatch.readManualBp(Math.floor(Date.now() / 1000) - 1800))} />
      </View>

      <CusText variant="heading" className="mt-2">
        Bildirishnoma
      </CusText>
      <View className="flex-row flex-wrap gap-2">
        <CusButton title="Kalitlarni o'qish" size="sm" variant="outline" disabled={!ready} onPress={() => run("readNotificationSwitches", () => VeepooWatch.readNotificationSwitches())} />
        <CusButton title="“Boshqa xabarlar” yoq" size="sm" variant="outline" disabled={!ready} onPress={() => run("setOtherNotifications(true)", () => VeepooWatch.setOtherNotifications(true))} />
        <CusButton title="Test: APP_CUSTOM_MSG" size="sm" disabled={!ready} onPress={() => run("sendNotification custom", () => VeepooWatch.sendNotification("Synapse Watch", "Puls o'lchovi 2 daqiqadan keyin. Qo'lingizni tinch tuting.", "custom"))} />
        <CusButton title="Test: OTHER" size="sm" disabled={!ready} onPress={() => run("sendNotification other", () => VeepooWatch.sendNotification("Synapse Watch", "Puls o'lchovi 2 daqiqadan keyin. Qo'lingizni tinch tuting.", "other"))} />
      </View>

      <CusText variant="heading" className="mt-2">
        {"Avto-o'lchash"}
      </CusText>
      <View className="flex-row flex-wrap gap-2">
        <CusButton title="Sozlamani o'qish" size="sm" variant="outline" disabled={!ready} onPress={() => run("readAutoMeasure", () => VeepooWatch.readAutoMeasure())} />
        <CusButton title="Puls: har 30 daq" size="sm" disabled={!ready} onPress={() => run("setAutoMeasure pulse 30", () => VeepooWatch.setAutoMeasure(AutoMeasureType.PulseRate, true, 30, -1, -1))} />
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <CusText variant="heading">Jurnal</CusText>
        <CusButton title="Tozalash" size="sm" variant="ghost" onPress={clearWatchLog} />
      </View>
      {log.map((line, i) => (
        <CusText key={`${i}-${line.slice(0, 12)}`} variant="caption" tone="muted" selectable>
          {line}
        </CusText>
      ))}
    </View>
  );
}

// Sinov va diagnostika bloki ("Soat ma'lumotlari" sahifasining pastida ochiladi).
export function WatchDevPanel() {
  if (Platform.OS !== "android") {
    return (
      <View className="items-center p-6">
        <CusText tone="muted">Sinov paneli hozircha faqat Android uchun.</CusText>
      </View>
    );
  }

  if (!watchModule) {
    return (
      <View className="items-center gap-2 p-6">
        <CusText variant="heading">Native modul topilmadi</CusText>
        <CusText tone="muted" className="text-center">
          {
            "Soat moduli (VeepooWatch) bu ilovaning ichida yo'q. Expo Go yoki eski build'da u bo'lmaydi: uni faqat modulni o'z ichiga olgan dev build bilan ishlatib bo'ladi (eas build --profile development)."
          }
        </CusText>
      </View>
    );
  }

  return <WatchDevPanelInner watch={watchModule} />;
}
