import { useUnstableNativeVariable } from "nativewind";

// Tab bar kabi `className` olmaydigan joylar uchun: global.css dagi o'zgaruvchini
// (light/dark ga qarab) qaytaradi. Topilmasa, `fallback` ishlatiladi.
export function useThemeColor(name: string, fallback: string): string {
  const value = useUnstableNativeVariable(`--${name}`);
  return typeof value === "string" && value ? value : fallback;
}
