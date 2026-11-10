import { useCallback } from "react";

import { type Language, useLanguage } from "@/shared/settings/settings";

import { TranslationKey, translations } from "./translations";

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

/** Belgilangan til uchun tarjimon (masalan, shifokor hisoboti doim rus tilida). */
export function translator(language: Language): Translate {
  return (key, params) =>
    translations[language][key].replace(/\{(\w+)\}/g, (match, name: string) =>
      params && name in params ? String(params[name]) : match,
    );
}

// Til almashsa, `t` ishlatilgan hamma komponent o'zi qayta chiziladi.
export function useT(): Translate {
  const language = useLanguage();

  return useCallback<Translate>((key, params) => translator(language)(key, params), [language]);
}
