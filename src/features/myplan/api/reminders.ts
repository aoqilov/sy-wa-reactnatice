import { isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";

// Soatdagi eslatmalar: SDK'ning matnli budilnigi (text alarm). Soat belgilangan vaqtda o'z matnimizni ko'rsatib
// tebranadi — avtomatik o'lchab bo'lmaydigan o'lchovlar uchun (EKG: barmoqni elektrodga qo'yish kerak; nasosli bosim,
// shakar va h.k. ham). Eslatma soatning o'zida saqlanadi: telefon yoki ilova yopiq bo'lsa ham ishlaydi.
// Cheklov (SDK hujjati): soatda ko'pi bilan 10 ta matnli budilnik.

export type Reminder = { id: number; hour: number; minute: number; repeat: string; content: string; open: boolean };

export const MAX_REMINDERS = 10;
/** Har kuni. SDK demo ham "1111111" beradi; kunlar tartibi hujjatda yo'q, shuning uchun hozircha faqat "har kuni". */
export const EVERY_DAY = "1111111";

export type ReminderFailure = "notReady" | "busy" | "unsupported" | "full" | "failed" | "noReply" | "outdated";
export type ReminderResult = { ok: true; list: Reminder[] } | { ok: false; reason: ReminderFailure };

const TIMEOUT_MS = 8_000;

const asReminder = (r: Record<string, unknown>): Reminder | null =>
  typeof r.id === "number" && typeof r.hour === "number" && typeof r.minute === "number"
    ? {
        id: r.id,
        hour: r.hour,
        minute: r.minute,
        repeat: typeof r.repeat === "string" ? r.repeat : EVERY_DAY,
        content: typeof r.content === "string" ? r.content : "",
        open: r.open !== false,
      }
    : null;

/** Bitta amal: buyruqni yuboradi va soatning "textAlarm" javobini kutadi. */
function run(send: (w: NonNullable<typeof watchModule>) => void, okOps: string[]): Promise<ReminderResult> {
  const watch = watchModule;
  if (!watch || getWatchConnection().status !== "ready") return Promise.resolve({ ok: false, reason: "notReady" });
  if (isMeasuring()) return Promise.resolve({ ok: false, reason: "busy" });
  if (typeof watch.readTextAlarms !== "function") return Promise.resolve({ ok: false, reason: "outdated" });

  return new Promise((resolve) => {
    const done = (r: ReminderResult) => {
      clearTimeout(timer);
      sub.remove();
      resolve(r);
    };
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (e.type === "error" && typeof e.op === "string" && e.op.toLowerCase().includes("textalarm")) {
        return done({ ok: false, reason: "failed" });
      }
      if (e.type !== "textAlarm") return;
      const op = String(e.op);
      if (op === "UNSUPPORTED") return done({ ok: false, reason: "unsupported" });
      if (op === "ALARM_FULL") return done({ ok: false, reason: "full" });
      if (!okOps.includes(op)) {
        // Soat o'zi yuborgan xabarlar (masalan budilnik chalindi) — bizning amal javobi emas.
        if (op.endsWith("FAIL")) done({ ok: false, reason: "failed" });
        return;
      }
      const list = (Array.isArray(e.alarms) ? (e.alarms as Record<string, unknown>[]) : [])
        .map(asReminder)
        .filter((r): r is Reminder => r !== null)
        .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
      done({ ok: true, list });
    });
    const timer = setTimeout(() => done({ ok: false, reason: "noReply" }), TIMEOUT_MS);
    try {
      send(watch);
    } catch {
      done({ ok: false, reason: "failed" });
    }
  });
}

const READ_OK = ["READ_SUCCESS", "READ_SUCCESS_NULL", "READ_SUCCESS_SAVE", "READ_SUCCESS_SAME_CRC"];

export const readReminders = () => run((w) => w.readTextAlarms(), READ_OK);

export const addReminder = (hour: number, minute: number, content: string) =>
  run((w) => w.addTextAlarm(hour, minute, EVERY_DAY, content), ["SETTING_SUCCESS"]);

export const deleteReminder = (id: number) => run((w) => w.deleteTextAlarm(id), ["CLEAR_SUCCESS"]);

export const setReminderOpen = (id: number, open: boolean) =>
  run((w) => w.setTextAlarmOpen(id, open), ["SETTING_SUCCESS"]);
