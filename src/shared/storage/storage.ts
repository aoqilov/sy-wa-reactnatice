import AsyncStorage from "@react-native-async-storage/async-storage";

// React Native'da brauzerdagi `localStorage` yo'q. Uning o'rniga AsyncStorage ishlatiladi:
//  - telefon xotirasida saqlaydi (ilova yopilib ochilsa ham yo'qolmaydi)
//  - faqat matn (string) saqlaydi, shuning uchun obyektlarni JSON qilamiz
//  - hamma funksiyasi async (await kerak), localStorage'dan farqi shu
//  - web'da o'zi brauzer localStorage'iga yozadi, ya'ni bitta kod hamma platformada ishlaydi
export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Buzilgan yoki o'qib bo'lmaydigan ma'lumot — "saqlanmagan" deb hisoblaymiz.
    return null;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
