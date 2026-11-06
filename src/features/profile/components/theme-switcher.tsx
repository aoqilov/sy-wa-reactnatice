import { View } from "react-native";

import { CusChip } from "@/components/ui";
import type { TranslationKey } from "@/shared/i18n/translations";
import { useT } from "@/shared/i18n/use-t";
import { setThemeMode, THEME_MODES, ThemeMode, useThemeMode } from "@/shared/settings/settings";

const LABEL_KEY: Record<ThemeMode, TranslationKey> = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
};

export function ThemeSwitcher() {
  const t = useT();
  const mode = useThemeMode();

  return (
    <View className="flex-row flex-wrap gap-2">
      {THEME_MODES.map((m) => (
        <CusChip key={m} label={t(LABEL_KEY[m])} selected={mode === m} onPress={() => setThemeMode(m)} />
      ))}
    </View>
  );
}
