import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { useWatchConnection } from "@/shared/watch/watch-connection";

import { type DialInfo, loadMarket, type MarketDial, type MarketResult, readDialInfo } from "../api/dials";
import { type InstalledDial, loadInstalledDials, rememberInstalledDial } from "../api/installed-dials";

type Load = { status: "loading" } | { status: "done"; result: MarketResult; info: DialInfo | null };

const GAP_MS = 400; // SDK buyruqlarni parallel bajarmaydi: info'dan keyin biroz kutib ro'yxat so'raladi

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Siferblat do'koni holati: sahifa ochilganda soat ma'lumoti va serverdagi ro'yxat o'qiladi. */
export function useDialMarket() {
  const { status } = useWatchConnection();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  // Shu sessiyada o'rnatilgan siferblat (soat CRC'si qayta o'qilguncha "O'rnatilgan" shu bo'yicha).
  const [installedCrc, setInstalledCrc] = useState<string | null>(null);
  // Ilova orqali oldin o'rnatilganlar (telefonda saqlanadi), eng yangisi birinchi.
  const [history, setHistory] = useState<InstalledDial[]>([]);

  useEffect(() => {
    let alive = true;
    void loadInstalledDials().then((list) => {
      if (alive) setHistory(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const markInstalled = useCallback((dial: MarketDial) => {
    setInstalledCrc(dial.crc);
    void rememberInstalledDial(dial).then(setHistory);
  }, []);

  const reload = useCallback(async () => {
    setLoad({ status: "loading" });
    const info = await readDialInfo();
    await wait(GAP_MS);
    const result = await loadMarket();
    setLoad({ status: "done", result, info });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (status === "ready") void reload();
    }, [status, reload]),
  );

  return { load, reload, installedCrc, markInstalled, history, connected: status === "ready" };
}
