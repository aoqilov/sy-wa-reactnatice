import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CusSelectOption = { label: string; value: string };

type Props = {
  options: CusSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function CusSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Tanlang",
  error,
  disabled = false,
  className = "",
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className={`gap-1 ${className}`}>
      {label ? (
        <Text className={`text-sm font-medium ${open && !error ? "text-primary" : "text-foreground"}`}>
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="combobox"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`h-12 flex-row items-center justify-between rounded-xl border bg-surface px-3 ${
          error ? "border-danger" : open ? "border-primary" : "border-border"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <Text className={`text-base ${selected ? "text-foreground" : "text-subtle"}`}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="text-muted">▾</Text>
      </Pressable>

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          {/* Fon: butun ekranni egallaydi, bosilganda yopadi. Sheet bilan bir-birining ichida emas. */}
          <Pressable
            accessibilityLabel="Yopish"
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />

          <View
            className="bg-surface"
            style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
          >
            <View className="items-center py-3">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>
            <ScrollView bounces={false}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-4 py-3 ${
                      active ? "bg-primary-soft" : "active:bg-surface-alt"
                    }`}
                  >
                    <Text
                      className={`text-base ${active ? "font-semibold text-primary" : "text-foreground"}`}
                    >
                      {o.label}
                    </Text>
                    {active ? <Text className="text-primary">✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Modalning joylashuvi className ga bog'liq bo'lmasligi uchun oddiy style bilan yozilgan.
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { maxHeight: "60%", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});
