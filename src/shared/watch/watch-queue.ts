// Soat bir vaqtda bitta uzun o'qishni bajaradi (SDK buyruqlarni parallel bajarmaydi, javoblar aralashib ketadi).
// Uzoq davom etadigan o'qishlar (tarix sinxroni, uyqu) shu qulf orqali ketma-ket ishlaydi; qisqa so'rovlar
// (bugungi qadamlar) esa qulf band bo'lsa keyingi safarga qoldiriladi.

let current: string | null = null;

export function watchTaskRunning(): string | null {
  return current;
}

/** `fn` ni qulf ostida bajaradi. Qulf band bo'lsa `null` qaytaradi (chaqiruvchi "band" deb biladi). */
export async function runWatchTask<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  if (current !== null) return null;
  current = name;
  try {
    return await fn();
  } finally {
    current = null;
  }
}
