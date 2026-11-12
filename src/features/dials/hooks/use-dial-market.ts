import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useWatchConnection } from "@/shared/watch/watch-connection";

import { type DialInfo, loadMarket, type MarketResult, readDialInfo } from "../api/dials";

type Load = { status: "loading" } | { status: "done"; result: MarketResult; info: DialInfo | null };

const GAP_MS = 400; // SDK buyruqlarni parallel bajarmaydi: info'dan keyin biroz kutib ro'yxat so'raladi

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Siferblat do'koni holati: sahifa ochilganda soat ma'lumoti va serverdagi ro'yxat o'qiladi. */
export function useDialMarket() {
  const { status } = useWatchConnection();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  // Shu sessiyada o'rnatilgan siferblat (soat CRC'si qayta o'qilguncha "O'rnatilgan" shu bo'yicha).
  const [installedCrc, setInstalledCrc] = useState<string | null>(null);

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

  return { load, reload, installedCrc, setInstalledCrc, connected: status === "ready" };
}
