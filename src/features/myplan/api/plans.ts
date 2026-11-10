import type { MetricKey } from "@/features/home/api/get-metrics";
import { getJSON, setJSON } from "@/shared/storage/storage";
import { isMeasuring } from "@/shared/watch/measure";
import { getWatchConnection } from "@/shared/watch/watch-connection";
import type { AutoMeasureItem } from "@/shared/watch/watch-info";

import watchModule, { type WatchEvent } from "../../../../modules/veepoo-watch";

// "Rejam" = soatning o'z avto-o'lchash jadvali (qaror 6, docs/watch-integration-plan.md). Reja soatning o'ziga yoziladi
// (SDK setAutoMeasureSettingData), shuning uchun soat telefon yoki ilova yopiq bo'lsa ham o'lchayveradi.
// Haqiqat manbai — soat: sahifa ochilganda jadval soatdan o'qiladi (readAutoMeasure), o'zgarishlar "Soatga yuborish"
// bilan yoziladi va qayta o'qib tekshiriladi. Telefonda faqat qaysi o'lchovlar rejada turgani saqlanadi (o'chirilgan
// reja ham ro'yxatda qolishi uchun: soat "o'chiq" ni "rejada yo'q" dan ajratmaydi).

/** Reja: shu o'lchovni soat `intervalMin` daqiqada bir marta, `startMin`..`endMin` oynasida o'zi o'lchaydi. */
export type Plan = {
  key: MetricKey;
  intervalMin: number;
  enabled: boolean;
  startMin: number; // kun boshidan daqiqa
  endMin: number;
};

/** Soat shu o'lchov uchun nimaga ruxsat beradi (readAutoMeasure javobidan). */
export type PlanCapability = {
  key: MetricKey;
  typeValue: number;
  /** Oraliq shu qadamga karrali (daqiqa). */
  step: number;
  intervalModifiable: boolean;
  slotModifiable: boolean;
  minStart: number;
  maxEnd: number;
};

/** Ilova o'lchovi → soatning avto-o'lchash turi. EKG yo'q: u barmoqni elektrodga qo'yishni talab qiladi. */
const WATCH_TYPE: Partial<Record<MetricKey, string>> = {
  pulse: "PULSE_RATE",
  pressurePump: "BLOOD_PRESSURE",
  oxygen: "BLOOD_OXYGEN",
  temperature: "BODY_TEMPERATURE",
  sugar: "BLOOD_GLUCOSE",
  blood: "BLOOD_COMPOSITION",
};

const KEYS_STORAGE = "myplan.keys.v1";
const DAY_END = 1439; // 23:59
const RESULT_TIMEOUT_MS = 8_000;
const READ_TIMEOUT_MS = 8_000;
const GAP_MS = 400; // SDK buyruqlarni parallel bajarmaydi: ketma-ket, oraliq bilan

const keyOf = (type: string) =>
  (Object.keys(WATCH_TYPE) as MetricKey[]).find((k) => WATCH_TYPE[k] === type);

/** Soatdan kelgan jadvaldan: qaysi o'lchovlar rejaga qo'yilishi mumkin va qanday chegaralar bilan. */
export function capabilitiesFrom(items: AutoMeasureItem[]): PlanCapability[] {
  return items.flatMap((it) => {
    const key = keyOf(it.type);
    if (!key || it.typeValue === null) return [];
    const minStart = it.supportStartMin ?? 0;
    const maxEnd = it.supportEndMin && it.supportEndMin > minStart ? it.supportEndMin : DAY_END;
    return [
      {
        key,
        typeValue: it.typeValue,
        step: it.stepUnit && it.stepUnit > 0 ? it.stepUnit : 5,
        intervalModifiable: it.intervalModifiable,
        slotModifiable: it.slotModifiable,
        minStart,
        maxEnd,
      },
    ];
  });
}

/** Soatdagi holat → rejalar: soatda yoqilganlar va telefonda "rejada" deb saqlanganlar (o'chirilgan bo'lsa ham). */
export function plansFrom(items: AutoMeasureItem[], keys: MetricKey[]): Plan[] {
  return items.flatMap((it) => {
    const key = keyOf(it.type);
    if (!key || (!it.on && !keys.includes(key))) return [];
    const startMin = it.startMin;
    const endMin = it.endMin > it.startMin ? it.endMin : DAY_END;
    return [{ key, intervalMin: it.intervalMin, enabled: it.on, startMin, endMin }];
  });
}

export async function loadPlanKeys(): Promise<MetricKey[]> {
  return (await getJSON<MetricKey[]>(KEYS_STORAGE)) ?? [];
}

export function savePlanKeys(keys: MetricKey[]): Promise<void> {
  return setJSON(KEYS_STORAGE, keys);
}

/** Soatning avto-o'lchash jadvalini qayta o'qishni so'raydi (natija watch-connection'dagi `info.autoMeasure` ga). */
export function requestWatchPlans(): boolean {
  if (!watchModule || getWatchConnection().status !== "ready") return false;
  try {
    watchModule.readAutoMeasure();
    return true;
  } catch {
    return false;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Bitta "autoMeasureResult" (yoki jadval) javobini kutadi. */
function waitFor(match: (e: WatchEvent) => boolean | undefined, ms: number): Promise<WatchEvent | null> {
  const watch = watchModule;
  if (!watch) return Promise.resolve(null);
  return new Promise((resolve) => {
    const sub = watch.addListener("event", (e: WatchEvent) => {
      if (!match(e)) return;
      clearTimeout(timer);
      sub.remove();
      resolve(e);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(null);
    }, ms);
  });
}

export type SendFailure = "notReady" | "busy" | "notRead" | "rejected";
export type SendResult = { ok: true } | { ok: false; reason: SendFailure; failedKeys: MetricKey[] };

/**
 * O'zgargan rejalarni soatga yozadi: har bir o'lchov uchun alohida buyruq, ketma-ket, soat "saqlandi" deb javob
 * bergach keyingisi. Rejadan olib tashlangan o'lchov soatda o'chiriladi. Oxirida jadval qayta o'qiladi.
 * Native `setAutoMeasure` soatdan o'qilgan sozlamani o'zgartirib yozadi, shuning uchun avval jadval o'qilgan bo'lishi kerak.
 */
export async function sendPlansToWatch(
  plans: Plan[],
  saved: Plan[],
  caps: PlanCapability[],
): Promise<SendResult> {
  const watch = watchModule;
  if (!watch || getWatchConnection().status !== "ready") return { ok: false, reason: "notReady", failedKeys: [] };
  if (isMeasuring()) return { ok: false, reason: "busy", failedKeys: [] };

  // Yoziladiganlar: yangi yoki o'zgargan rejalar, va rejadan olib tashlanib soatda hali yoqiq turganlar (o'chiriladi).
  const writes: Plan[] = [
    ...plans.filter((p) => {
      const s = saved.find((x) => x.key === p.key);
      return !s || s.enabled !== p.enabled || s.intervalMin !== p.intervalMin || s.startMin !== p.startMin || s.endMin !== p.endMin;
    }),
    ...saved.filter((s) => s.enabled && !plans.some((p) => p.key === s.key)).map((s) => ({ ...s, enabled: false })),
  ];

  const failed: MetricKey[] = [];
  for (const p of writes) {
    const cap = caps.find((c) => c.key === p.key);
    if (!cap) {
      failed.push(p.key);
      continue;
    }
    const result = waitFor((e) => e.type === "autoMeasureResult" || (e.type === "error" && e.op === "setAutoMeasure"), RESULT_TIMEOUT_MS);
    try {
      watch.setAutoMeasure(
        cap.typeValue,
        p.enabled,
        p.intervalMin,
        cap.slotModifiable ? p.startMin : -1,
        cap.slotModifiable ? p.endMin : -1,
      );
    } catch {
      failed.push(p.key);
      continue;
    }
    const e = await result;
    if (!e || e.type === "error" || e.ok !== true) failed.push(p.key);
    await wait(GAP_MS);
  }

  // Soatda haqiqatda nima turganini qayta o'qiymiz (sahifa shu bilan yangilanadi).
  const reread = waitFor((e) => e.type === "autoMeasure", READ_TIMEOUT_MS);
  requestWatchPlans();
  await reread;

  if (failed.length) return { ok: false, reason: "rejected", failedKeys: failed };
  return { ok: true };
}
