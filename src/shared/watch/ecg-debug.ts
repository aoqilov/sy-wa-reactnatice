import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { EcgTrace } from "./ecg-trace";

// Oxirgi EKG o'lchovining xom ma'lumoti (dev panel → "EKG xom ma'lumotini ulashish"). Chiziq shakli, chastota va
// amplitudani kompyuterda tekshirish uchun: filtrsiz mV, paketlar kelgan vaqtlar, soat aytgan chastotalar.
// Faqat oxirgisi saqlanadi (fayl qayta yoziladi), ilova qayta ochilganda ham qoladi.

const debugFile = () => new File(Paths.document, "ecg-debug-last.json");

/** Diagnostika: yozilmasa ham o'lchov natijasiga ta'sir qilmaydi, shuning uchun xatolar yutiladi. */
export async function saveEcgDebug(trace: EcgTrace): Promise<void> {
  try {
    if (trace.raw.length === 0) return;
    await debugFile().write(JSON.stringify(trace.dump()));
  } catch {
    // Yozib bo'lmadi: keyingi o'lchovda qayta urinadi.
  }
}

export function hasEcgDebug(): boolean {
  try {
    return debugFile().exists;
  } catch {
    return false;
  }
}

/** Ulashish oynasi (Telegram, email ...). Fayl yo'q bo'lsa false. */
export async function shareEcgDebug(): Promise<boolean> {
  const file = debugFile();
  if (!file.exists) return false;
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available");
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "EKG xom ma'lumoti" });
  return true;
}
