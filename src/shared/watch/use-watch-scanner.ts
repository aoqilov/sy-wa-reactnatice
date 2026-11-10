import { useCallback, useEffect, useRef, useState } from "react";

import watchModule from "../../../modules/veepoo-watch";
import { type BluetoothReadiness, ensureBluetoothReady } from "./bluetooth-ready";

export type FoundWatch = { id: string; name: string; rssi: number };

/** Skan yoki ulanishni boshlab bo'lmagan sabab. `bluetoothOff` — xato emas: foydalanuvchi Bluetooth'ni yoqmadi. */
export type ScanProblem = Exclude<BluetoothReadiness, "ready"> | "error";

// Skan o'zi to'xtamasa batareyani yeydi va ro'yxat cheksiz o'sadi: shuncha vaqtdan keyin to'xtatamiz.
const SCAN_TIMEOUT_MS = 20_000;

// Ulanish ekrani uchun: ruxsat so'rash, skan, topilgan soatlar ro'yxati va ulanishni boshlash.
// Ulanish natijasi shu hook'da emas, `useWatchConnection` orqali keladi.
export function useWatchScanner() {
  const [devices, setDevices] = useState<FoundWatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const [searched, setSearched] = useState(false); // kamida bitta skan tugagan: "topilmadi" deyish mumkin
  const [problem, setProblem] = useState<ScanProblem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    try {
      watchModule?.stopScan();
    } catch {
      // Skan allaqachon to'xtagan bo'lishi mumkin.
    }
  }, []);

  useEffect(() => {
    if (!watchModule) return;
    const subscription = watchModule.addListener("scan", (e) => {
      switch (e.state) {
        case "started":
          setScanning(true);
          break;
        case "stopped":
          setScanning(false);
          setSearched(true);
          break;
        case "bluetoothOff":
          clearTimeout(timer.current);
          setScanning(false);
          setProblem("bluetoothOff");
          break;
        case "found": {
          const id = e.id;
          if (!id) break;
          const found: FoundWatch = { id, name: e.name ?? id, rssi: e.rssi ?? 0 };
          // Bir soat qayta-qayta topiladi (signal o'zgaradi): yangilab, kuchli signal tepaga.
          setDevices((prev) => [found, ...prev.filter((d) => d.id !== id)].sort((a, b) => b.rssi - a.rssi));
          break;
        }
      }
    });
    // Bluetooth yoqilsa (tizim oynasidan yoki telefon sozlamasidan) "Bluetooth kerak" xabari o'z-o'zidan yo'qoladi.
    const bluetooth = watchModule.addListener("bluetooth", (e) => {
      if (e.on) setProblem((p) => (p === "bluetoothOff" ? null : p));
    });
    return () => {
      subscription.remove();
      bluetooth.remove();
      stop();
    };
  }, [stop]);

  /** Ruxsat va yoqilgan Bluetooth: bo'lmasa sababini `problem` ga yozib, false qaytaradi. */
  const prepare = useCallback(async () => {
    setProblem(null);
    const readiness = await ensureBluetoothReady();
    if (readiness === "ready") return true;
    setProblem(readiness);
    return false;
  }, []);

  const start = useCallback(async () => {
    if (!watchModule) return;
    if (!(await prepare())) return;

    setDevices([]);
    setSearched(false);
    try {
      watchModule.startScan();
      clearTimeout(timer.current);
      timer.current = setTimeout(stop, SCAN_TIMEOUT_MS);
    } catch {
      setProblem("error");
    }
  }, [prepare, stop]);

  // Qo'lda ulash: soat ekranida tasdiq so'raladi (native `confirmOnWatch = true`).
  const connect = useCallback(
    async (id: string) => {
      stop();
      if (!(await prepare())) return;
      try {
        watchModule?.connect(id, true);
      } catch {
        setProblem("error");
      }
    },
    [prepare, stop],
  );

  /** "Bluetooth'ni yoqish" tugmasi: tizim oynasini qayta chiqaradi. */
  const enableBluetooth = useCallback(async () => {
    await prepare();
  }, [prepare]);

  // Ulanish osilib qolsa foydalanuvchi qotib qolmasligi uchun (ekran butun ilovani to'sib turadi).
  const cancelConnect = useCallback(() => {
    try {
      watchModule?.disconnect();
    } catch {
      setProblem("error");
    }
  }, []);

  /**
   * "Qaytadan urinish": soat bilan Bluetooth aloqasini uzadi (osilib qolgan ulanish yoki SDK sessiyasi bo'shaydi) va
   * sahifani boshlang'ich holatga qaytaradi — skan to'xtaydi, topilganlar ro'yxati va xatolar tozalanadi.
   */
  const retry = useCallback(() => {
    stop();
    setScanning(false);
    setDevices([]);
    setSearched(false);
    setProblem(null);
    try {
      watchModule?.disconnect();
    } catch {
      // Aloqa allaqachon yo'q: tozalash yetarli.
    }
  }, [stop]);

  return { devices, scanning, searched, problem, start, stop, connect, cancelConnect, enableBluetooth, retry };
}
