import { useCallback } from "react";

import { useLanguage } from "@/shared/settings/settings";

import { TranslationKey, translations } from "./translations";

export type TranslateParams = Record<string, string | number>;

// Til almashsa, `t` ishlatilgan hamma komponent o'zi qayta chiziladi.
export function useT() {
  const language = useLanguage();

  return useCallback(
    (key: TranslationKey, params?: TranslateParams) =>
      translations[language][key].replace(/\{(\w+)\}/g, (match, name: string) =>
        params && name in params ? String(params[name]) : match,
      ),
    [language],
  );
}
