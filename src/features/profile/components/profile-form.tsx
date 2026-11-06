import { useState } from "react";
import { View } from "react-native";

import { CusButton, CusChip, CusInput, CusText } from "@/components/ui";
import { useT } from "@/shared/i18n/use-t";

import type { Gender, Profile } from "../api/profile-storage";
import {
  EMPTY_FORM,
  FormError,
  GENDER_KEY,
  ProfileFormErrors,
  ProfileFormValues,
  validateProfileForm,
} from "../lib/profile-utils";

type Props = {
  initialValues?: ProfileFormValues;
  submitLabel: string;
  onSubmit: (profile: Profile) => Promise<void>;
};

const GENDERS: Gender[] = ["male", "female"];

// Login va "Edit profile" ikkalasida bir xil forma ishlatiladi.
export function ProfileForm({ initialValues = EMPTY_FORM, submitLabel, onSubmit }: Props) {
  const t = useT();
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // Xato kaliti hozirgi tilga o'giriladi (til almashsa ham xato matni mos bo'ladi).
  const errorText = (error?: FormError) => (error ? t(error.key, error.params) : undefined);

  // Bitta maydon o'zgarganda faqat o'sha maydonning xatosini tozalaymiz.
  const setField = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const result = validateProfileForm(values);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(false);
    try {
      await onSubmit(result.profile);
    } catch {
      setSubmitError(true);
      setSubmitting(false);
    }
    // Muvaffaqiyatli bo'lsa ekran o'zi yopiladi/almashadi, shuning uchun submitting'ni qaytarmaymiz.
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <CusInput
          className="flex-1"
          label={t("form.firstName")}
          value={values.firstName}
          onChangeText={(v) => setField("firstName", v)}
          error={errorText(errors.firstName)}
          autoCapitalize="words"
          autoComplete="given-name"
          returnKeyType="next"
        />
        <CusInput
          className="flex-1"
          label={t("form.lastName")}
          value={values.lastName}
          onChangeText={(v) => setField("lastName", v)}
          error={errorText(errors.lastName)}
          autoCapitalize="words"
          autoComplete="family-name"
          returnKeyType="next"
        />
      </View>

      <CusInput
        label={t("form.birthYear")}
        placeholder="1995"
        value={values.birthYear}
        onChangeText={(v) => setField("birthYear", v.replace(/\D/g, ""))}
        error={errorText(errors.birthYear)}
        keyboardType="number-pad"
        maxLength={4}
      />

      <View className="gap-1">
        <CusText className="text-sm font-medium">{t("form.gender")}</CusText>
        <View className="flex-row gap-2">
          {GENDERS.map((g) => (
            <CusChip
              key={g}
              label={t(GENDER_KEY[g])}
              selected={values.gender === g}
              onPress={() => setField("gender", g)}
            />
          ))}
        </View>
        {errors.gender ? (
          <CusText variant="caption" tone="danger">
            {errorText(errors.gender)}
          </CusText>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <CusInput
          className="flex-1"
          label={t("form.height")}
          placeholder="175"
          value={values.heightCm}
          onChangeText={(v) => setField("heightCm", v.replace(/\D/g, ""))}
          error={errorText(errors.heightCm)}
          keyboardType="number-pad"
          maxLength={3}
        />
        <CusInput
          className="flex-1"
          label={t("form.weight")}
          placeholder="72.5"
          value={values.weightKg}
          onChangeText={(v) => setField("weightKg", v.replace(/[^0-9.,]/g, ""))}
          error={errorText(errors.weightKg)}
          keyboardType="decimal-pad"
          maxLength={6}
        />
      </View>

      {submitError ? <CusText tone="danger">{t("form.saveError")}</CusText> : null}

      <CusButton title={submitLabel} onPress={handleSubmit} loading={submitting} />
    </View>
  );
}
