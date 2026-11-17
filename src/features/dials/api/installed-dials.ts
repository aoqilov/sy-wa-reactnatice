import { getJSON, setJSON } from "@/shared/storage/storage";

import type { MarketDial } from "./dials";

// Ilova orqali soatga o'rnatilgan siferblatlar tarixi (telefonda). Soat o'zi faqat hozirgi siferblat CRC'sini beradi,
// shuning uchun "oldin o'rnatganlar" ro'yxatini ilova o'zi yuritadi. Eng yangisi birinchi.

const KEY = "dials.installed.v1";
const MAX = 12;

export type InstalledDial = { fileUrl: string; crc: string; name: string; at: number };

export async function loadInstalledDials(): Promise<InstalledDial[]> {
  const list = await getJSON<InstalledDial[]>(KEY);
  return Array.isArray(list) ? list.filter((d) => typeof d?.fileUrl === "string") : [];
}

/** O'rnatilganini tarix boshiga qo'yadi (bir xil fayl takrorlanmaydi) va yangi ro'yxatni qaytaradi. */
export async function rememberInstalledDial(dial: MarketDial): Promise<InstalledDial[]> {
  const prev = await loadInstalledDials();
  const next = [
    { fileUrl: dial.fileUrl, crc: dial.crc, name: dial.name, at: Date.now() },
    ...prev.filter((d) => d.fileUrl !== dial.fileUrl),
  ].slice(0, MAX);
  try {
    await setJSON(KEY, next);
  } catch {
    // Saqlab bo'lmasa ham shu sessiyada ro'yxat ko'rinadi.
  }
  return next;
}
