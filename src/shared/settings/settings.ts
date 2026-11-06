import { colorScheme, rem } from "nativewind";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { getJSON, setJSON } from "@/shared/storage/storage";

export type ThemeMode = "system" | "light" | "dark";
export type Language = "uz" | "ru" | "uz-Cyrl"; // lotin, rus, kirill (o'zbekcha)
export type UiSize = "small" | "medium" | "large" | "xlarge";

export type Settings = {
  language: Language;
  uiSize: UiSize;
  theme: ThemeMode;
};

export const LANGUAGES: Language[] = ["uz", "ru", "uz-Cyrl"];
export const UI_SIZES: UiSize[] = ["small", "medium", "large", "xlarge"];
export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

// Har bir o'lcham `rem` ni shuncha marta kattalashtiradi/kichraytiradi ("medium" — hozirgi ko'rinish).
export const UI_SCALE: Record<UiSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

// NativeWind'da rem: native'da 14, web'da brauzerning 16 si.
const BASE_REM = Platform.OS === "web" ? 16 : 14;

const DEFAULTS: Settings = { language: "uz", uiSize: "medium", theme: "system" };
const STORAGE_KEY = "settings";

// `loaded` — saqlangan sozlamalar xotiradan o'qib bo'lingani (shundan keyin splash yopiladi).
type State = Settings & { loaded: boolean };

let state: State = { ...DEFAULTS, loaded: false };
const listeners = new Set<() => void>();

// Sozlama qiymatini ilovaga haqiqatan qo'llaydi: tema va masshtab.
function apply(s: Settings) {
  colorScheme.set(s.theme); // global.css dagi light/dark qiymatlar shu orqali almashadi
  rem.set(BASE_REM * UI_SCALE[s.uiSize]);
}

function commit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function update(patch: Partial<Settings>) {
  const next = { ...state, ...patch };
  apply(next);
  commit(next);
  const { language, uiSize, theme } = next;
  // Xotiraga yozish xato bersa ham sozlama shu seansda ishlayveradi.
  setJSON<Settings>(STORAGE_KEY, { language, uiSize, theme }).catch(() => {});
}

// Xotirada eskirgan/buzilgan qiymat bo'lsa, o'rniga standart qiymat olinadi.
function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export async function loadSettings() {
  const stored = await getJSON<Partial<Settings>>(STORAGE_KEY);
  const settings: Settings = {
    language: pick(stored?.language, LANGUAGES, DEFAULTS.language),
    uiSize: pick(stored?.uiSize, UI_SIZES, DEFAULTS.uiSize),
    theme: pick(stored?.theme, THEME_MODES, DEFAULTS.theme),
  };
  apply(settings);
  commit({ ...settings, loaded: true });
}

export const setLanguage = (language: Language) => update({ language });
export const setUiSize = (uiSize: UiSize) => update({ uiSize });
export const setThemeMode = (theme: ThemeMode) => update({ theme });

function useSetting<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
    () => select(state),
  );
}

export const useLanguage = () => useSetting((s) => s.language);
export const useUiSize = () => useSetting((s) => s.uiSize);
export const useThemeMode = () => useSetting((s) => s.theme);
export const useSettingsLoaded = () => useSetting((s) => s.loaded);

// Qo'lda piksel berilgan joylar (masalan tugma balandligi) shu bilan masshtablanadi.
export const useUiScale = () => UI_SCALE[useUiSize()];
