import { getJSON, setJSON } from "@/shared/storage/storage";

// Oxirgi muvaffaqiyatli ulangan soat: ulanish ekranida qayta skan qilmasdan tez ulanish uchun.
export type LastWatch = { id: string; name: string | null };

const KEY = "watch.last";

export function loadLastWatch(): Promise<LastWatch | null> {
  return getJSON<LastWatch>(KEY);
}

export function saveLastWatch(watch: LastWatch): Promise<void> {
  return setJSON(KEY, watch);
}
