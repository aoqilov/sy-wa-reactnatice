import { type Permission, PermissionsAndroid, Platform } from "react-native";

export type BluetoothPermissionResult = {
  granted: boolean;
  /** "Boshqa so'ramaslik" tanlangan: tizim oynasi endi chiqmaydi, faqat sozlamalardan berish mumkin. */
  blocked: boolean;
};

// Android: 12+ da BLUETOOTH_SCAN/CONNECT, 11 va eskida skan uchun joylashuv. 13+ da bildirishnoma ruxsati ham
// so'raladi, lekin u rad etilsa ham Bluetooth ishlayveradi, shuning uchun natijaga ta'sir qilmaydi.
export async function ensureBluetoothPermissions(): Promise<BluetoothPermissionResult> {
  if (Platform.OS !== "android") return { granted: false, blocked: false };

  const api = Platform.Version as number;
  const required: Permission[] =
    api >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const wanted: Permission[] = api >= 33 ? [...required, PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] : required;

  const result = await PermissionsAndroid.requestMultiple(wanted);
  return {
    granted: required.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED),
    blocked: required.some((p) => result[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN),
  };
}
