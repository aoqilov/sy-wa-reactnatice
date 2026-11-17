import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CusButton } from "@/components/ui/CusButton";
import { CusText } from "@/components/ui/CusText";
import {
  clearDebugLog,
  DEBUG_CONSOLE_ENABLED,
  type DebugEntry,
  type DebugLevel,
  debugLogText,
  useDebugLog,
} from "@/shared/debug/debug-log";

// Ilova ichidagi konsol: iOS sinovsiz yozilgan, birinchi ishga tushirishda xatolarni shu yerdan ko'rib, joyida
// tuzatamiz. Har qanday ekranda (soat ulanish ekrani ustida ham) chap pastda kichik tugma: qizil son — oxirgi
// ochilgandan beri yangi xatolar. Ichida: filtr, har yozuvni bosib to'liq ochish, "Ulashish" (matnni yuborish).

type Filter = "all" | "error" | "warn";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "error", label: "Xatolar" },
  { key: "warn", label: "Ogohlantirish" },
];

const LEVEL_STYLE: Record<DebugLevel, { text: string; mark: string }> = {
  error: { text: "text-danger", mark: "bg-danger" },
  warn: { text: "text-warning", mark: "bg-warning" },
  info: { text: "text-muted", mark: "bg-border" },
};

export function DebugConsole() {
  if (!DEBUG_CONSOLE_ENABLED) return null;
  return <DebugConsoleInner />;
}

function DebugConsoleInner() {
  const entries = useDebugLog();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // Tugmadagi son: oxirgi marta ochilgandan keyingi xatolar.
  const [seenId, setSeenId] = useState(0);

  const unseenErrors = entries.filter((e) => e.level === "error" && e.id > seenId).length;
  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.level === filter)),
    [entries, filter],
  );

  const show = () => {
    setSeenId(entries[0]?.id ?? 0);
    setOpen(true);
  };
  const hide = () => {
    setSeenId((prev) => entries[0]?.id ?? prev);
    setOpen(false);
  };
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const share = () => {
    Share.share({ message: debugLogText(visible) || "Konsol bo'sh" }).catch(() => {});
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diagnostika konsoli"
        onPress={show}
        style={{ position: "absolute", left: 12, bottom: insets.bottom + 96, zIndex: 1000, elevation: 1000 }}
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
      >
        <Text className="text-base font-bold text-foreground">{">_"}</Text>
        {unseenErrors > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-danger px-1">
            <Text className="text-xs font-bold text-white">{unseenErrors > 99 ? "99+" : unseenErrors}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={hide} presentationStyle="fullScreen">
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <CusText variant="heading">Konsol</CusText>
            <CusText tone="muted">{`${entries.length} yozuv`}</CusText>
          </View>

          <View className="flex-row gap-2 px-4 pb-3">
            {FILTERS.map((f) => {
              const active = f.key === filter;
              const count = f.key === "all" ? entries.length : entries.filter((e) => e.level === f.key).length;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                >
                  <Text className={`text-sm ${active ? "font-semibold text-white" : "text-foreground"}`}>
                    {`${f.label} ${count}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={visible}
            keyExtractor={(e) => String(e.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            ListEmptyComponent={
              <CusText tone="muted" className="pt-8 text-center">
                {"Hozircha yozuv yo'q"}
              </CusText>
            }
            renderItem={({ item }) => (
              <EntryRow entry={item} expanded={expanded.has(item.id)} onPress={() => toggle(item.id)} />
            )}
          />

          <View className="flex-row gap-2 border-t border-border px-4 pt-3">
            <View className="flex-1">
              <CusButton title="Ulashish" variant="outline" size="sm" onPress={share} />
            </View>
            <View className="flex-1">
              <CusButton title="Tozalash" variant="outline" size="sm" onPress={clearDebugLog} />
            </View>
            <View className="flex-1">
              <CusButton title="Yopish" size="sm" onPress={hide} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function EntryRow({ entry, expanded, onPress }: { entry: DebugEntry; expanded: boolean; onPress: () => void }) {
  const style = LEVEL_STYLE[entry.level];
  return (
    <Pressable onPress={onPress} className="flex-row overflow-hidden rounded-xl border border-border bg-surface">
      <View className={`w-1 ${style.mark}`} />
      <View className="flex-1 gap-1 p-3">
        <View className="flex-row justify-between gap-2">
          <Text className={`flex-shrink text-xs font-semibold ${style.text}`} numberOfLines={1}>
            {entry.source}
          </Text>
          <Text className="text-xs text-muted">{new Date(entry.at).toLocaleTimeString()}</Text>
        </View>
        <Text selectable className="font-mono text-xs text-foreground" numberOfLines={expanded ? undefined : 4}>
          {entry.message || "—"}
        </Text>
      </View>
    </Pressable>
  );
}
