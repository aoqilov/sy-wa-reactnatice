import { useWatchConnection } from "@/shared/watch/watch-connection";

// Headerdagi soat holati: haqiqiy Bluetooth ulanishidan (shared/watch/watch-connection).
export type WatchStatus = {
  connected: boolean;
  connecting: boolean;
  model: string | null;
  battery: number | null; // 0-100, noma'lum bo'lsa null
};

export function useWatchStatus(): WatchStatus {
  const { status, model, battery } = useWatchConnection();
  return { connected: status === "ready", connecting: status === "connecting", model, battery };
}
