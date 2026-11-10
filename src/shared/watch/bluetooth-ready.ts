import watchModule from "../../../modules/veepoo-watch";
import { ensureBluetoothPermissions } from "./bluetooth-permissions";

/** Skan yoki ulanishdan oldingi tekshiruv natijasi. */
export type BluetoothReadiness = "ready" | "permission" | "permissionBlocked" | "bluetoothOff";

/**
 * Skan va ulanishdan oldin: ruxsatlarni so'raydi, Bluetooth o'chiq bo'lsa Android'ning "Bluetooth'ni yoqing"
 * tizim oynasini chiqaradi. Ruxsat oldin so'raladi, chunki Android 12+ da oyna uchun BLUETOOTH_CONNECT kerak.
 * `bluetoothOff` — foydalanuvchi oynada rad etdi (yoki oynani ochib bo'lmadi).
 */
export async function ensureBluetoothReady(): Promise<BluetoothReadiness> {
  const permission = await ensureBluetoothPermissions();
  if (!permission.granted) return permission.blocked ? "permissionBlocked" : "permission";

  // Eski build'da bu funksiyalar yo'q: native qism o'zi "bluetoothOff" ni bildiradi.
  if (!watchModule || typeof watchModule.isBluetoothEnabled !== "function") return "ready";
  if (watchModule.isBluetoothEnabled()) return "ready";
  try {
    return (await watchModule.requestEnableBluetooth()) ? "ready" : "bluetoothOff";
  } catch {
    return "bluetoothOff";
  }
}
