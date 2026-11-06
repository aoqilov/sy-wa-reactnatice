import { View } from "react-native";

import { CusChip } from "@/components/ui";
import { LANGUAGE_NAME } from "@/shared/i18n/translations";
import { LANGUAGES, setLanguage, useLanguage } from "@/shared/settings/settings";

// Tizim tili: o'zbekcha (lotin), русский, ўзбекча (kirill). Har biri o'z tilida yoziladi.
export function LanguagePicker() {
  const language = useLanguage();

  return (
    <View className="flex-row flex-wrap gap-2">
      {LANGUAGES.map((l) => (
        <CusChip key={l} label={LANGUAGE_NAME[l]} selected={language === l} onPress={() => setLanguage(l)} />
      ))}
    </View>
  );
}
