import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  addReminder,
  deleteReminder,
  readReminders,
  type Reminder,
  type ReminderFailure,
  type ReminderResult,
  setReminderOpen,
} from "../api/reminders";

/** Avto-o'lchash jadvali o'qilib bo'lishini kutamiz: soat buyruqlarni parallel bajarmaydi. */
const READ_DELAY_MS = 1_500;

/** Soatdagi eslatmalar (matnli budilnik): ro'yxat soatdan o'qiladi, har bir amal soatga darhol yoziladi. */
export function useReminders() {
  const { status } = useWatchConnection();
  const [list, setList] = useState<Reminder[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReminderFailure | null>(null);
  const [supported, setSupported] = useState(true);
  const busyRef = useRef(false);

  const exec = useCallback(async (action: () => Promise<ReminderResult>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    const r = await action();
    busyRef.current = false;
    setBusy(false);
    if (r.ok) {
      setList(r.list);
      setError(null);
      return true;
    }
    if (r.reason === "unsupported") setSupported(false);
    setError(r.reason);
    return false;
  }, []);

  const read = useCallback(() => exec(readReminders), [exec]);

  useFocusEffect(
    useCallback(() => {
      if (status !== "ready") return;
      const id = setTimeout(() => void read(), READ_DELAY_MS);
      return () => clearTimeout(id);
    }, [status, read]),
  );

  return {
    list,
    busy,
    error,
    supported,
    read,
    add: (hour: number, minute: number, content: string) => exec(() => addReminder(hour, minute, content)),
    remove: (id: number) => exec(() => deleteReminder(id)),
    setOpen: (id: number, open: boolean) => exec(() => setReminderOpen(id, open)),
  };
}
