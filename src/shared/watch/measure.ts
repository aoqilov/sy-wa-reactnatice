import watchModule, { type WatchEvent } from "../../../modules/veepoo-watch";
import { saveEcgDebug } from "./ecg-debug";
import { EcgTrace, setLiveEcg } from "./ecg-trace";

// Soatda qo'lda o'lchash: ilova soatga so'rov yuboradi (native modul), soat qiymatlarni oqim bilan qaytaradi.
// Taymerlar, chegaralar va xato mantig'i `synapse-soat/src/watch/session.ts` dan ko'chirilgan (haqiqiy soat
// bilan sinalgan). Bir vaqtda faqat bitta o'lchov: soat buyruqlarni parallel bajarmaydi.

export type MeasureKey =
  | "pulse"
  | "pressurePump"
  | "oxygen"
  | "temperature"
  | "ecg"
  | "sugar"
  | "blood"
  | "hrv"
  | "stress"
  | "bodyComp";

const MEASURABLE: readonly string[] = [
  "pulse",
  "pressurePump",
  "oxygen",
  "temperature",
  "ecg",
  "sugar",
  "blood",
  "hrv",
  "stress",
  "bodyComp",
];

/** Home'dagi o'lchov soatda o'lchanadimi. */
export function canMeasure(key: string): key is MeasureKey {
  return MEASURABLE.includes(key);
}

export type RawReading =
  | { key: "pulse" | "oxygen" | "temperature"; value: number }
  /** Shakar, mmol/l (optik, taxminiy). `risk` — soatning o'z bahosi. */
  | { key: "sugar"; value: number; risk?: GlucoseRisk }
  /** Qon tahlili (optik, taxminiy): beshta qiymat birga. */
  | { key: "blood"; parts: BloodParts }
  | { key: "pressurePump"; sys: number; dia: number; pulse?: number }
  /** HRV (ms), stress (0..100). */
  | { key: "hrv" | "stress"; value: number }
  /** Tana tarkibi (elektrod orqali, taxminiy). */
  | { key: "bodyComp"; body: BodyParts }
  /** EKG: `value` — o'rtacha puls; qolganlari soat bergan bo'lsa. `trace` — to'lqin (mV, 0.5 Hz filtrlangan). */
  | {
      key: "ecg";
      value: number;
      hrMin?: number;
      hrMax?: number;
      rr?: number; // ms
      qt?: number; // ms
      qtc?: number; // ms
      hrv?: number; // ms
      br?: number; // nafas, daqiqasiga
      contactPct: number; // holat paketlarining necha foizida barmoq elektrodda edi
      leadOffs: number; // barmoq necha marta ko'tarildi
      trace: { rate: number; samples: number[] };
    };

export type GlucoseRisk = "LOW" | "MIDDLE" | "HIGH";

/** Qon tahlili: siydik kislotasi µmol/l; umumiy xolesterin, triglitseridlar, HDL, LDL — mmol/l. */
export type BloodParts = { uricAcid: number; tcho: number; tag: number; hdl: number; ldl: number };

/**
 * Tana tarkibi (soatning 14 ta qiymati). % — tana vazniga nisbatan ulush, kg — massa, bmr — kkal/kun. Eski build'lar
 * faqat birinchi yettitasini beradi, shuning uchun qolganlari ixtiyoriy.
 */
export type BodyParts = {
  bmi: number;
  fatPct: number;
  musclePct?: number;
  muscleKg?: number;
  waterPct?: number;
  boneKg?: number;
  bmr?: number;
  /** Yog' massasi. */
  fatKg?: number;
  /** Yog'siz tana massasi (FFM). */
  ffmKg?: number;
  /** Teri osti yog'i. */
  subFatPct?: number;
  /** Suv massasi. */
  waterKg?: number;
  /** Skelet mushaklari ulushi. */
  skeletalPct?: number;
  proteinPct?: number;
  proteinKg?: number;
};

/** Tarjima kaliti: `measure.error.<kod>` */
export type MeasureError =
  | "unavailable"
  | "outdated"
  | "lost"
  | "busy"
  | "notWorn"
  | "charging"
  | "lowBattery"
  | "noData"
  | "noReply"
  | "bpFailed"
  | "cuffUnsupported"
  | "onWatchNone"
  | "posture"
  | "loose"
  | "heartError"
  | "slowDeflation"
  | "tooMuchPressure"
  | "poorSignal"
  | "moved"
  | "tempSensor"
  | "tempNoData"
  | "ecgNoContact"
  | "ecgLeadOff"
  | "ecgNoData"
  | "glucoseUnsupported"
  | "glucoseNoData"
  | "bloodUnsupported"
  | "bloodNoData"
  | "featureUnsupported"
  | "onWatchNoneHrv";

/** O'lchash davom etayotganda foydalanuvchiga ko'rsatiladigan ogohlantirish (xato emas). Tarjima kaliti: `measure.hint.<kod>` */
export type MeasureHint = "posture" | "moved" | "onWatch" | "onWatchHrv" | "ecgContact";

export type MeasureProgress = {
  /** 0..1 */
  progress: number;
  /** Doira ichida ko'rsatiladigan joriy qiymat (puls, yostiqchadagi bosim ...). */
  live: number | null;
  hint: MeasureHint | null;
};

export type MeasureHandlers = {
  onProgress: (p: MeasureProgress) => void;
  onDone: (reading: RawReading) => void;
  onError: (error: MeasureError) => void;
};

const HR_MS = 30_000;
const SPO2_MS = 30_000;
const CUFF_REPLY_MS = 12_000; // soat yostiqchani to'ldirishdan oldin ekranida 3 s sanaydi
const CUFF_IDLE_MS = 30_000;
const CUFF_MAX_MS = 180_000;
const CUFF_TYPICAL_MS = 45_000; // faqat progress uchun: kadrlarda progress yo'q
const ON_WATCH_POLL_MS = 5_000; // soatning o'zida o'lchangan bosim: yangi yozuvni shuncha oraliqda so'raymiz
const ON_WATCH_SILENCE_MS = 6_000; // soat so'rovga javob bermasa, shundan keyin yana so'raymiz
const ON_WATCH_MAX_MS = 240_000;
const TEMP_IDLE_MS = 15_000;
const TEMP_MAX_MS = 120_000;
const ECG_IDLE_MS = 15_000;
const ECG_MAX_MS = 180_000;
const ECG_NO_CONTACT_S = 15; // holat soniyada bir keladi: shuncha soniya elektrodga tegilmasa, xato
const ECG_RESULT_GRACE_MS = 5_000; // progress 100% dan keyin natijani kutish
const ECG_FULL_RESULT_MS = 3_000; // qisman natijadan keyin to'liq natijani kutish
const GLUCOSE_IDLE_MS = 15_000; // soatdan shuncha vaqt hech narsa kelmasa, xato
const GLUCOSE_MAX_MS = 150_000;
const GLUCOSE_RESULT_GRACE_MS = 5_000; // progress 100% bo'lib qiymat yo'q bo'lsa, shuncha kutiladi
const BLOOD_IDLE_MS = 15_000;
const BLOOD_MAX_MS = 150_000;
const BLOOD_RESULT_GRACE_MS = 5_000;
const SAMPLES_USED = 8;
// HRV: soat foiz bermaydi, qiymatlarni oqim bilan yuboradi. Shuncha vaqtdan keyin borlari bilan yakunlanadi.
const HRV_EXPECTED_MS = 60_000;
const HRV_IDLE_MS = 20_000;
const HRV_MAX_MS = 90_000;
// Stress, tana tarkibi: soat foiz yuboradi va o'zi yakunlaydi.
const DETECT_IDLE_MS = 15_000;
const DETECT_MAX_MS = 150_000;
const BODY_NO_CONTACT = 15; // barmoq hali tegmagan: shuncha paket kutiladi
const BODY_LEAD_OFF = 4; // SDK: barmoq 4 marta ketma-ket ko'tarilsa, ilova o'lchovni to'xtatadi
// EKG paytida soat boshqa ishda: band (optik o'lchov va h.k.), zaryadda yoki batareya past.
const ECG_BUSY = ["BUSY", "DETECT_BP", "DETECT_HEART", "DETECT_AUTO_FIVE", "DETECT_SP", "DETECT_FTG", "DETECT_PPG", "CHARGING", "CHARG_LOW"];

const CUFF_ERROR: Record<string, MeasureError> = {
  POSTURE_ERROR: "posture",
  LOOSE: "loose",
  NOT_WEAR: "notWorn",
  TIME_OUT: "bpFailed",
  HEART_ERROR: "heartError",
  SLOW_DEFLATION: "slowDeflation",
  TOO_MUCH_PRESSURE: "tooMuchPressure",
  POOR_SIGNAL_QUALITY: "poorSignal",
  NOT_REMAINING_STATIONARY: "moved",
  CHARGING: "charging",
  LOW_POWER: "lowBattery",
  DEVICE_BUSY: "busy",
};
// Natija bilan birga kelishi mumkin bo'lgan holatlar: yurak balandligi (2) va qimirlash (10) xato emas.
const CUFF_OK_STATUS = ["EMPTY", "SUCCESS", "POSTURE_ERROR", "NOT_REMAINING_STATIONARY"];
const CUFF_IMMEDIATE = ["CHARGING", "LOW_POWER", "DEVICE_BUSY"];

const SPO2_BUSY = ["BUSY", "DETECT_BP", "DETECT_HEART", "DETECT_AUTO_FIVE", "DETECT_FTG", "DETECT_PPG"];

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function inRange(v: unknown, lo: number, hi: number): number | undefined {
  return typeof v === "number" && v >= lo && v <= hi ? v : undefined;
}

/** Soat bergan qon tahlili qiymatlari: hammasi oqilona chegarada bo'lsagina (o'lchov davomida 0 lar keladi). */
function bloodParts(e: WatchEvent): BloodParts | undefined {
  const uricAcid = inRange(e.uricAcid, 50, 1200);
  const tcho = inRange(e.tcho, 1, 20);
  const tag = inRange(e.tag, 0.1, 20);
  const hdl = inRange(e.hdl, 0.1, 6);
  const ldl = inRange(e.ldl, 0.1, 15);
  if (uricAcid === undefined || tcho === undefined || tag === undefined || hdl === undefined || ldl === undefined) {
    return undefined;
  }
  return { uricAcid, tcho, tag, hdl, ldl };
}

/** HRV, stress, tana tarkibi xatolari: SDK holat nomi (yoki native "UNSUPPORTED") → ilova xato kodi. */
function detectError(state: unknown): MeasureError {
  switch (String(state)) {
    case "UNSUPPORTED":
      return "featureUnsupported";
    case "BUSY":
      return "busy";
    case "LOW_POWER":
      return "lowBattery";
    case "WEAR_OFF":
      return "notWorn";
    default:
      return "noData";
  }
}

/** Qiymat oqilona oraliqda bo'lmasa tashlanadi (birlik noto'g'ri taxmin qilingan yoki soat 0 yuborgan). */
const BODY_RANGES: Record<Exclude<keyof BodyParts, "bmi" | "fatPct">, [number, number]> = {
  musclePct: [10, 95],
  muscleKg: [5, 150],
  waterPct: [20, 80],
  boneKg: [0.5, 10],
  bmr: [500, 4000],
  fatKg: [1, 200],
  ffmKg: [10, 200],
  subFatPct: [1, 60],
  waterKg: [5, 150],
  skeletalPct: [5, 70],
  proteinPct: [5, 30],
  proteinKg: [1, 50],
};

/**
 * Tana tarkibi natijasi (o'lchov "bodyDone" va soat tarixi "bodyHistory" yozuvlari uchun). SDK hujjatida qiymatlar
 * ba'zan "10 barobar" deyilgan: yog' ulushi oqilona chegaradan (2..60 %) katta bo'lsa, hammasi 10 ga bo'linadi.
 * Asosiy ikkitasi (BMI, yog' %) bo'lmasa natija yaroqsiz.
 */
export function parseBodyParts(e: Record<string, unknown>): BodyParts | undefined {
  const raw = (k: string) => {
    const v = e[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const scale = (raw("fatPct") ?? 0) > 60 ? 0.1 : 1;
  const get = (k: string) => {
    const v = raw(k);
    return v !== undefined && v > 0 ? Math.round(v * scale * 10) / 10 : undefined;
  };
  const bmi = inRange(get("bmi"), 5, 80);
  const fatPct = inRange(get("fatPct"), 2, 60);
  if (bmi === undefined || fatPct === undefined) return undefined;
  const parts: BodyParts = { bmi, fatPct };
  for (const [k, [lo, hi]] of Object.entries(BODY_RANGES) as [keyof typeof BODY_RANGES, [number, number]][]) {
    const v = inRange(get(k), lo, hi);
    if (v !== undefined) parts[k] = v;
  }
  return parts;
}

/** Musbat son bo'lsa o'zi, aks holda undefined (soat yo'q qiymatni 0 deb yuboradi). */
function positive(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

const noop = () => {};

/** Hozir soatda o'lchov ketyaptimi: History sinxroni shu paytda soatga so'rov yubormaydi (soat bir ishni bajaradi). */
let activeMeasures = 0;
export const isMeasuring = () => activeMeasures > 0;

/**
 * Soatni boshqa uzoq ish (siferblat uzatish) uchun band qiladi: shu paytda o'lchov, rutina va tarix sinxroni
 * boshlanmaydi (ular `isMeasuring()` ni tekshiradi). Qaytgan funksiya bandlikni bo'shatadi (bir marta).
 */
export function holdWatch(): () => void {
  activeMeasures += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeMeasures -= 1;
  };
}

/** O'lchashni boshlaydi. Qaytgan funksiya o'lchashni bekor qiladi (soatga to'xtatish buyrug'i yuboriladi). */
export function startMeasure(key: MeasureKey, handlers: MeasureHandlers): () => void {
  const watch = watchModule;
  if (!watch) {
    handlers.onError("unavailable");
    return noop;
  }

  const startedAt = Date.now();
  let over = false;
  activeMeasures += 1;
  let stopNative: () => void = noop;
  // `synapse-soat` andozasi: soat o'zi yakunlaydigan o'lchovlarda (bosim, harorat) muvaffaqiyatdan keyin to'xtatish
  // buyrug'i yuborilmaydi, faqat xato yoki bekor qilishda. Oqim bilan ketadigan o'lchovlarda (puls, SpO2) esa har doim.
  let stopOnSuccess = false;
  let finishedBySelf = false; // soat o'lchovni o'zi to'liq yakunladi: to'xtatish buyrug'i kerak emas (EKG)
  let onTeardown: () => void = noop; // o'lchov tugaganda (har qanday sabab bilan) bajariladi
  let onEvent: (e: WatchEvent) => void = noop;
  let ticker: ReturnType<typeof setInterval> | undefined;
  const subscriptions: { remove: () => void }[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cancelLater = (t: ReturnType<typeof setTimeout> | undefined) => {
    if (!t) return;
    clearTimeout(t);
    timers.delete(t);
  };

  const teardown = (sendStop: boolean) => {
    if (!over) activeMeasures -= 1;
    over = true;
    subscriptions.forEach((s) => s.remove());
    timers.forEach(clearTimeout);
    timers.clear();
    clearInterval(ticker);
    onTeardown();
    if (!sendStop) return;
    try {
      stopNative();
    } catch {
      // Aloqa uzilgan bo'lishi mumkin: soat o'zi to'xtaydi.
    }
  };
  const done = (reading: RawReading) => {
    if (over) return;
    teardown(stopOnSuccess && !finishedBySelf);
    handlers.onDone(reading);
  };
  const fail = (error: MeasureError) => {
    if (over) return;
    teardown(true);
    handlers.onError(error);
  };
  const progress = (p: number, live: number | null, hint: MeasureHint | null = null) => {
    if (!over) handlers.onProgress({ progress: Math.max(0, Math.min(1, p)), live, hint });
  };
  const elapsed = () => Date.now() - startedAt;

  subscriptions.push(
    watch.addListener("connection", (c) => {
      if (c.state === "disconnected" || c.state === "error") fail("lost");
    }),
    watch.addListener("event", (e) => {
      if (!over) onEvent(e);
    }),
  );

  let startNative: () => void = noop;

  switch (key) {
    case "pulse": {
      const samples: number[] = [];
      let live: number | null = null;
      let busy = 0;
      let wear = 0;
      stopOnSuccess = true;
      startNative = () => watch.startHeart();
      stopNative = () => watch.stopHeart();
      onEvent = (e) => {
        if (e.type !== "heart") return;
        if (e.status === "STATE_LOW_BATTERY") return fail("lowBattery");
        // iOS: xato holati o'lchovni darhol tugatadi (paket qayta kelmaydi) — native `final: true` qo'shadi.
        if (e.final === true) return fail(e.status === "STATE_HEART_BUSY" ? "busy" : "notWorn");
        // SDK hujjati: avval "band", keyin "taqilmagan"; o'tish paketlariga bir necha marta toqat qilamiz.
        busy = e.status === "STATE_HEART_BUSY" ? busy + 1 : 0;
        wear = e.status === "STATE_HEART_WEAR_ERROR" ? wear + 1 : 0;
        if (busy >= 3) return fail("busy");
        if (wear >= 3) return fail("notWorn");
        const v = inRange(e.value, 30, 250);
        if (v !== undefined) {
          samples.push(v);
          live = v;
        }
      };
      ticker = setInterval(() => {
        const p = elapsed() / HR_MS;
        progress(p, live);
        if (p < 1) return;
        if (samples.length === 0) return fail("noData");
        done({ key, value: median(samples.slice(-SAMPLES_USED)) });
      }, 250);
      break;
    }

    case "oxygen": {
      const samples: number[] = [];
      let live: number | null = null;
      let busy = 0;
      let wear = 0;
      stopOnSuccess = true;
      startNative = () => watch.startSpo2();
      stopNative = () => watch.stopSpo2();
      onEvent = (e) => {
        if (e.type !== "spo2") return;
        const state = String(e.deviceState);
        if (state === "CHARGING") return fail("charging");
        if (state === "CHARG_LOW") return fail("lowBattery");
        // iOS: xato holati o'lchovni darhol tugatadi (`final`).
        if (e.final === true) {
          return fail(state === "UNPASS_WEAR" ? "notWorn" : state === "UNSUPPORTED" ? "featureUnsupported" : "busy");
        }
        busy = SPO2_BUSY.includes(state) ? busy + 1 : 0;
        wear = state === "UNPASS_WEAR" ? wear + 1 : 0;
        if (busy >= 3) return fail("busy");
        if (wear >= 3) return fail("notWorn");
        const v = inRange(e.value, 70, 100);
        if (v !== undefined) {
          samples.push(v);
          live = v;
        }
      };
      ticker = setInterval(() => {
        const p = elapsed() / SPO2_MS;
        progress(p, live);
        if (p < 1) return;
        if (samples.length === 0) return fail("noData");
        done({ key, value: median(samples.slice(-SAMPLES_USED)) });
      }, 250);
      break;
    }

    case "pressurePump": {
      let bad = 0;
      let idle: ReturnType<typeof setTimeout> | undefined = later(() => fail("noReply"), CUFF_REPLY_MS);
      startNative = () => watch.startCuffBp(false);
      stopNative = () => watch.stopCuffBp();
      onEvent = (e) => {
        if (e.type !== "cuffBp") return;
        cancelLater(idle);
        idle = later(() => fail("bpFailed"), CUFF_IDLE_MS);

        // SDK qurilmada SportModel yo'q deb hisoblasa, buyruqni umuman yubormaydi (native qism xabar beradi).
        if (e.unsupported === true) return fail("cuffUnsupported");

        const status = String(e.status);
        // Native qism (VPCuffBPTestData) qiymatlarni `sbp`/`dbp` nomi bilan yuboradi. Avval bu yerda `sys`/`dia`
        // o'qilardi — natija hech qachon ko'rinmas, soat tugatganda oxirgi holat (ko'pincha qo'l holati) xato bo'lardi.
        const sys = inRange(e.sbp ?? e.sys, 50, 300);
        const dia = inRange(e.dbp ?? e.dia, 20, 250);
        const valid = sys !== undefined && dia !== undefined && sys > dia;
        // `flag` — soat o'lchovni tugatgani. AAR bytecode'idan tasdiqlangan (vp_t.handler): flag = (kadr[5] == 10),
        // `synapse-soat` dagi `done` bilan bir xil.
        if (e.flag === true) {
          if (!valid || !CUFF_OK_STATUS.includes(status)) return fail(CUFF_ERROR[status] ?? "bpFailed");
          return done({ key, sys, dia, pulse: inRange(e.heart, 30, 250) });
        }
        if (CUFF_IMMEDIATE.includes(status)) return fail(CUFF_ERROR[status]);

        // Qo'l holati (2) va qimirlash (10): soat harakat datchigi (G-sensor) bo'yicha o'zi baholaydi va o'lchovni
        // baribir davom ettirib, natija beradi. Shuning uchun ilova bu holatda o'lchovni HECH QACHON o'zi uzmaydi:
        // faqat ogohlantirish ko'rsatadi, yakuniy xulosa soatniki (flag). Avval 15 s dan keyin uzilardi — qo'lni
        // ideal tutmagan odamda o'lchov oxiriga yetmasdi.
        let hint: MeasureHint | null = null;
        if (status === "POSTURE_ERROR" || status === "NOT_REMAINING_STATIONARY") {
          hint = status === "POSTURE_ERROR" ? "posture" : "moved";
          bad = 0;
        } else {
          // Boshqa holatlar o'tib ketishi mumkin: faqat takrorlansa xato.
          bad = status !== "EMPTY" && status !== "SUCCESS" ? bad + 1 : 0;
          if (bad >= 3) return fail(CUFF_ERROR[status] ?? "bpFailed");
        }
        progress(Math.min(0.95, elapsed() / CUFF_TYPICAL_MS), typeof e.pressure === "number" ? e.pressure : null, hint);
      };
      later(() => fail("bpFailed"), CUFF_MAX_MS);
      break;
    }

    case "temperature": {
      // Vendor demo (BodyTemperatureDetectActivity.java) bo'yicha: `progress == 100` — o'lchov tugadi;
      // `deviceState` 0 va 7 — qiymat yaroqli, 1-6 — band, 8 — batareya past, 9 — sensor xatosi;
      // `oprate` 0 — qo'llab-quvvatlanmaydi, 2 — o'lchash to'xtagan.
      let last: number | undefined;
      let busy = 0;
      let sensor = 0;
      let idle: ReturnType<typeof setTimeout> | undefined;
      const touch = () => {
        cancelLater(idle);
        idle = later(() => fail("tempNoData"), TEMP_IDLE_MS);
      };
      startNative = () => watch.startTemp();
      stopNative = () => watch.stopTemp();
      onEvent = (e) => {
        if (e.type !== "temp") return;
        touch();
        if (e.notWorn === true) return fail("notWorn"); // iOS: soat taqilmagan (VPTemperatureTestStateNotWear)
        const oprate = typeof e.oprate === "number" ? e.oprate : 1;
        if (oprate === 0) return fail("tempNoData");
        if (oprate === 2) return;
        const state = typeof e.deviceState === "number" ? e.deviceState : 0;
        if (state === 8) return fail("lowBattery");
        if (state === 9) {
          if (++sensor >= 3) fail("tempSensor");
          return;
        }
        if (state >= 1 && state <= 6) {
          if (++busy >= 3) fail("busy");
          return;
        }
        busy = 0;
        sensor = 0;
        const percent = typeof e.progress === "number" ? e.progress : 0;
        const t = inRange(e.temp, 30, 43);
        if (t !== undefined) last = t;
        if (percent >= 100) {
          if (last === undefined) return fail("tempSensor");
          return done({ key, value: Math.round(last * 10) / 10 });
        }
        progress(percent / 100, last ?? null);
      };
      touch();
      later(() => fail("tempNoData"), TEMP_MAX_MS);
      break;
    }

    case "sugar": {
      // SDK (IBloodGlucoseChangeListener, vendor demo BloodGlucoseActivity): "glucose" — progress 0..100 va qiymat
      // (mmol/l; o'lchov davomida 0 bo'lishi mumkin), oxirida "glucoseStop". Soat o'zi yakunlaydi: muvaffaqiyatdan
      // keyin to'xtatish buyrug'i yuborilmaydi. "glucoseError" — boshlanmadi: NONSUPPORT, LOW_POWER, BUSY, WEARING_ERROR.
      let last: number | undefined;
      let risk: GlucoseRisk | undefined;
      let unsupported = false; // SDK qurilma sozlamasida shakar yo'q (javob kelmasa, sababi shu)
      let idle: ReturnType<typeof setTimeout> | undefined;
      let grace: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (last === undefined) return fail(unsupported ? "glucoseUnsupported" : "glucoseNoData");
        done({ key, value: Math.round(last * 10) / 10, risk });
      };
      const touch = () => {
        cancelLater(idle);
        idle = later(() => fail(unsupported ? "glucoseUnsupported" : "glucoseNoData"), GLUCOSE_IDLE_MS);
      };
      startNative = () => watch.startGlucose();
      stopNative = () => watch.stopGlucose();
      onEvent = (e) => {
        if (e.type === "glucoseSupport") {
          unsupported = e.detect === false && e.any === false;
          return;
        }
        if (e.type === "glucoseError") {
          const status = String(e.status);
          if (status === "NONSUPPORT") return fail("glucoseUnsupported");
          if (status === "LOW_POWER") return fail("lowBattery");
          if (status === "BUSY") return fail("busy");
          if (status === "WEARING_ERROR") return fail("notWorn");
          return fail("glucoseNoData");
        }
        if (e.type === "glucoseStop") return finish();
        if (e.type !== "glucose") return;
        touch();
        const v = inRange(e.value, 1, 35);
        if (v !== undefined) last = v;
        if (e.risk === "LOW" || e.risk === "MIDDLE" || e.risk === "HIGH") risk = e.risk;
        const percent = typeof e.progress === "number" ? e.progress : 0;
        if (percent >= 100) {
          if (last !== undefined) return finish();
          if (!grace) grace = later(finish, GLUCOSE_RESULT_GRACE_MS); // qiymat keyingi paketda kelishi mumkin
          return;
        }
        progress(percent / 100, null);
      };
      touch();
      later(finish, GLUCOSE_MAX_MS);
      break;
    }

    case "blood": {
      // SDK (IBloodComponentDetectListener, vendor demo BloodComponentDetectActivity): "blood" — progress va joriy
      // qiymatlar, progress 100 da "bloodDone" (yakuniy), to'xtaganda "bloodStop". Soat o'zi yakunlaydi.
      // "bloodError": UNSUPPORTED (native tekshiruvi), LOW_POWER, BUSY, WEAR_ERROR, UNKNOWN.
      let last: BloodParts | undefined;
      let idle: ReturnType<typeof setTimeout> | undefined;
      let grace: ReturnType<typeof setTimeout> | undefined;
      const finish = () => (last ? done({ key, parts: last }) : fail("bloodNoData"));
      const touch = () => {
        cancelLater(idle);
        idle = later(() => fail("bloodNoData"), BLOOD_IDLE_MS);
      };
      startNative = () => watch.startBloodComponent();
      stopNative = () => watch.stopBloodComponent();
      onEvent = (e) => {
        if (e.type === "bloodError") {
          const state = String(e.state);
          if (state === "UNSUPPORTED") return fail("bloodUnsupported");
          if (state === "LOW_POWER") return fail("lowBattery");
          if (state === "BUSY") return fail("busy");
          if (state === "WEAR_ERROR") return fail("notWorn");
          return fail("bloodNoData");
        }
        if (e.type === "bloodStop") return finish();
        if (e.type === "bloodDone") {
          last = bloodParts(e) ?? last;
          return finish();
        }
        if (e.type !== "blood") return;
        touch();
        const parts = bloodParts(e);
        if (parts) last = parts;
        const percent = typeof e.progress === "number" ? e.progress : 0;
        if (percent >= 100) {
          // Yakuniy natija ("bloodDone") odatda shu paketdan keyin keladi.
          if (!grace) grace = later(finish, BLOOD_RESULT_GRACE_MS);
          return;
        }
        progress(percent / 100, null);
      };
      touch();
      later(finish, BLOOD_MAX_MS);
      break;
    }

    case "ecg": {
      // `synapse-soat` dagi measureEcg andozasi: holat soniyada bir keladi ("ecg", dataType 1), natija oxirida
      // (dataType 2 — qisman, 4 — to'liq, yoki "ecgResult"). Elektrod aloqasi `wear`: 0 — barmoq tegib turibdi.
      type Summary = { hr?: number; hrv?: number; qt?: number; qtc?: number; br?: number; rr?: number };
      const hrs: number[] = [];
      const trace = new EcgTrace();
      setLiveEcg(trace);
      let result: Summary = {}; // soat yuborgan yakuniy natija
      let summary: Summary = {}; // soniyalik holatdagi o'rtacha qiymatlar (natija kelmasa, shular bilan)
      let contacted = false;
      let lostStreak = 0;
      let leadOffs = 0;
      let statusStreak = 0;
      let statusPackets = 0;
      let contactPackets = 0;
      let idle: ReturnType<typeof setTimeout> | undefined;
      let grace: ReturnType<typeof setTimeout> | undefined;
      stopOnSuccess = true;
      onTeardown = () => {
        setLiveEcg(null);
        // Muvaffaqiyatsiz o'lchov ham saqlanadi: "nega chiqmadi" ni aynan shundan ko'ramiz.
        void saveEcgDebug(trace);
      };

      const pick = (k: keyof Summary, lo: number, hi: number) => inRange(result[k], lo, hi) ?? inRange(summary[k], lo, hi);
      const finish = (error?: MeasureError) => {
        if (error) return fail(error);
        trace.finish();
        const hr = pick("hr", 30, 250) ?? (hrs.length ? median(hrs) : undefined);
        if (hr === undefined) return fail("ecgNoData");
        done({
          key,
          value: Math.round(hr),
          hrMin: hrs.length ? Math.min(...hrs) : undefined,
          hrMax: hrs.length ? Math.max(...hrs) : undefined,
          // RR: soat bergan o'rtacha (6 s), bo'lmasa pulsdan: 60000 / puls.
          rr: pick("rr", 250, 2500) ?? Math.round(60000 / hr),
          qt: pick("qt", 200, 700),
          qtc: pick("qtc", 250, 700),
          hrv: pick("hrv", 1, 300),
          br: pick("br", 4, 60),
          contactPct: statusPackets ? Math.round((contactPackets / statusPackets) * 100) : 0,
          leadOffs,
          trace: { rate: trace.rate, samples: trace.samples.map((s) => Math.round(s * 1000) / 1000) },
        });
      };
      const touch = () => {
        cancelLater(idle);
        idle = later(() => finish("ecgNoData"), ECG_IDLE_MS);
      };
      const waitResult = (ms: number) => {
        cancelLater(grace);
        grace = later(() => finish(), ms);
      };

      startNative = () => watch.startEcg();
      stopNative = () => watch.stopEcg();
      onEvent = (e) => {
        if (e.type === "ecgInfo") return trace.setReportedRates(positive(e.drawFrequency), positive(e.frequency));
        if (e.type === "ecgWave") {
          if (typeof e.ecgType === "number" && e.ecgType > 0) trace.ecgType = e.ecgType;
          if (Array.isArray(e.adc)) for (const v of e.adc) if (typeof v === "number") trace.adc.push(v);
          if (Array.isArray(e.mv)) trace.push(e.mv);
          return touch(); // to'lqin kelyapti: soat ishlayapti
        }
        if (e.type === "ecgResult") {
          touch();
          // "ecgResult" da QT (QTc emas) keladi: aveQT / qtTime.
          result = { ...result, hr: positive(e.hr), hrv: positive(e.hrv), qt: positive(e.qtc), br: positive(e.br) };
          return waitResult(ECG_FULL_RESULT_MS);
        }
        if (e.type !== "ecg") return;
        touch();

        const hrv = e.hrv === 255 ? undefined : positive(e.hrv); // 255 — yaroqsiz (SDK hujjati)
        if (e.dataType === 2 || e.dataType === 4) {
          result = { ...result, hr: positive(e.hr2), hrv, qtc: positive(e.qtc), br: positive(e.br2), rr: positive(e.rr2) };
          if (e.dataType === 4) {
            finishedBySelf = true; // soat o'zi to'liq yakunladi
            return finish();
          }
          return waitResult(ECG_FULL_RESULT_MS); // to'liq natijani biroz kutamiz
        }
        if (e.dataType === 3) return finish("ecgNoData"); // soat: o'lchov muvaffaqiyatsiz
        if (e.dataType !== 1) return;

        // Soat zaryadda, batareya past yoki boshqa o'lchov bilan band: o'tish paketlariga bir necha marta toqat.
        const state = String(e.deviceState);
        if (e.final === true) return finish("busy"); // iOS: band holati o'lchovni darhol tugatadi
        statusStreak = ECG_BUSY.includes(state) ? statusStreak + 1 : 0;
        if (statusStreak >= 3) {
          return finish(state === "CHARGING" ? "charging" : state === "CHARG_LOW" ? "lowBattery" : "busy");
        }

        const contact = e.wear === 0;
        statusPackets += 1;
        if (contact) {
          contactPackets += 1;
          contacted = true;
          lostStreak = 0;
        } else {
          if (contacted && lostStreak === 0) leadOffs++;
          lostStreak++;
        }
        // SDK hujjati: barmoq 4 martadan ko'p ko'tarilsa, ilova o'lchovni tugatishi kerak.
        if (leadOffs > 4) return finish("ecgLeadOff");
        if (lostStreak >= ECG_NO_CONTACT_S) return finish("ecgNoContact");

        const hr1 = inRange(e.hr1, 30, 250);
        if (contact && hr1 !== undefined) hrs.push(hr1);
        summary = {
          hr: positive(e.hr2) ?? summary.hr,
          hrv: hrv ?? summary.hrv,
          qtc: positive(e.qtc) ?? summary.qtc,
          br: positive(e.br2) ?? summary.br,
          rr: positive(e.rr2) ?? summary.rr,
        };

        const p = Math.min(1, (typeof e.progress === "number" ? e.progress : 0) / 100);
        progress(p, contact && hrs.length ? hrs[hrs.length - 1] : null, contact ? null : "ecgContact");
        // Natija odatda 100% dan keyin keladi; kelmasa, borlari bilan yakunlaymiz.
        if (p >= 1 && !grace) waitResult(ECG_RESULT_GRACE_MS);
      };
      touch();
      later(() => finish(), ECG_MAX_MS);
      break;
    }

    case "hrv": {
      // SDK (IHrvDetectListener): qiymatlar o'lchov davomida keladi ("hrv"), foiz yo'q; soat to'xtasa "hrvStop".
      // Progress vaqt bo'yicha; HRV_EXPECTED_MS dan keyin (yoki soat to'xtasa) oxirgi qiymatlar medianasi.
      const samples: number[] = [];
      let live: number | null = null;
      let idle: ReturnType<typeof setTimeout> | undefined;
      stopOnSuccess = true;
      const finish = () =>
        samples.length ? done({ key, value: median(samples.slice(-SAMPLES_USED)) }) : fail("noData");
      const touch = () => {
        cancelLater(idle);
        idle = later(finish, HRV_IDLE_MS);
      };
      startNative = () => watch.startHrv();
      stopNative = () => watch.stopHrv();
      onEvent = (e) => {
        if (e.type === "hrvError") return fail(detectError(e.state));
        if (e.type === "hrvStop") return finish();
        if (e.type !== "hrv") return;
        touch();
        const v = inRange(e.value, 5, 300);
        if (v !== undefined) {
          samples.push(v);
          live = v;
        }
      };
      ticker = setInterval(() => {
        progress(Math.min(0.97, elapsed() / HRV_EXPECTED_MS), live);
        if (elapsed() >= HRV_EXPECTED_MS && samples.length > 0) finish();
      }, 250);
      touch();
      later(finish, HRV_MAX_MS);
      break;
    }

    case "stress": {
      // SDK (IPressureDetectListener): "stress" {progress}, "stressDone" {value 0..100}. Soat o'zi yakunlaydi.
      let idle: ReturnType<typeof setTimeout> | undefined;
      const touch = () => {
        cancelLater(idle);
        idle = later(() => fail("noData"), DETECT_IDLE_MS);
      };
      startNative = () => watch.startStress();
      stopNative = () => watch.stopStress();
      onEvent = (e) => {
        if (e.type === "stressError") return fail(detectError(e.state));
        if (e.type === "stressStop") return fail("noData"); // natijasiz to'xtadi
        if (e.type === "stressDone") {
          const v = inRange(e.value, 0, 100);
          if (v === undefined) return fail("noData");
          finishedBySelf = true;
          return done({ key, value: Math.round(v) });
        }
        if (e.type !== "stress") return;
        touch();
        progress((typeof e.progress === "number" ? e.progress : 0) / 100, null);
      };
      touch();
      later(() => fail("noData"), DETECT_MAX_MS);
      break;
    }

    case "bodyComp": {
      // SDK (IBodyComponentDetectListener): "body" {progress, lead}, "bodyDone" {qiymatlar}. Elektrod orqali: barmoq
      // soatning metall qismiga tegib turishi kerak (lead 0). Barmoq ketma-ket ko'tarilsa o'lchov to'xtatiladi.
      let contacted = false;
      let offStreak = 0;
      let idle: ReturnType<typeof setTimeout> | undefined;
      stopOnSuccess = true;
      const touch = () => {
        cancelLater(idle);
        idle = later(() => fail("noData"), DETECT_IDLE_MS);
      };
      startNative = () => watch.startBodyComp();
      stopNative = () => watch.stopBodyComp();
      onEvent = (e) => {
        if (e.type === "bodyError") return fail(detectError(e.state));
        if (e.type === "bodyStop") return fail("noData"); // natijasiz to'xtadi
        if (e.type === "bodyDone") {
          const parts = parseBodyParts(e);
          if (!parts) return fail("noData");
          finishedBySelf = true;
          return done({ key, body: parts });
        }
        if (e.type !== "body") return;
        touch();
        const contact = e.lead === 0;
        if (contact) {
          contacted = true;
          offStreak = 0;
        } else {
          offStreak += 1;
          if (!contacted && offStreak >= BODY_NO_CONTACT) return fail("ecgNoContact");
          if (contacted && offStreak >= BODY_LEAD_OFF) return fail("ecgLeadOff");
        }
        progress((typeof e.progress === "number" ? e.progress : 0) / 100, null, contact ? null : "ecgContact");
      };
      touch();
      later(() => fail("noData"), DETECT_MAX_MS);
      break;
    }
  }

  progress(0, null);
  try {
    startNative();
  } catch (err) {
    // TypeError: bu funksiya o'rnatilgan build'da yo'q (modul eski). Boshqa xato: soatga yetib bormadi.
    fail(err instanceof TypeError ? "outdated" : "noReply");
  }

  return () => {
    if (!over) teardown(true);
  };
}

/**
 * HRV soatning o'zida o'lchanadi, ilova natijani soat xotirasidan kutadi. S105 uni ilovadan boshlashga ruxsat bermaydi:
 * `isSupportHrvAppDetect` false, SDK `startDetectHrv` buyrug'ini yubormaydi (AAR bayt-kodi:
 * FunctionCheckUtil.checkHrvAppDetect). Shuning uchun `startOnWatchBp` andozasi: har 5 s da `readManualData(since, ["hrv"])`,
 * `since` dan yangi yozuv chiqquncha.
 */
export function startOnWatchManual(key: "hrv", handlers: MeasureHandlers): () => void {
  const watch = watchModule;
  if (!watch) {
    handlers.onError("unavailable");
    return noop;
  }

  const kind = key; // native "manualData" turi o'lchov kaliti bilan bir xil
  const since = Math.floor(Date.now() / 1000) - 30; // bosishdan sal oldin tugagan o'lchov ham hisoblanadi
  let over = false;
  activeMeasures += 1;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  const subscriptions: { remove: () => void }[] = [];

  const teardown = () => {
    if (!over) activeMeasures -= 1;
    over = true;
    subscriptions.forEach((s) => s.remove());
    clearTimeout(pollTimer);
    clearTimeout(silenceTimer);
    clearTimeout(capTimer);
  };
  const done = (value: number) => {
    if (over) return;
    teardown();
    handlers.onDone({ key, value });
  };
  const fail = (error: MeasureError) => {
    if (over) return;
    teardown();
    handlers.onError(error);
  };

  /** Yozuvdan qiymat: HRV — ms qiymatlar ro'yxatining medianasi. */
  const valueOf = (r: Record<string, unknown>): number | undefined => {
    const values = (Array.isArray(r.values) ? r.values : []).filter(
      (v): v is number => typeof v === "number" && v >= 5 && v <= 300,
    );
    return values.length ? median(values) : undefined;
  };

  const again = () => {
    clearTimeout(silenceTimer);
    clearTimeout(pollTimer);
    pollTimer = setTimeout(ask, ON_WATCH_POLL_MS);
  };
  const ask = () => {
    if (over) return;
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(again, ON_WATCH_SILENCE_MS);
    try {
      watch.readManualData(since, [kind]);
    } catch (err) {
      fail(err instanceof TypeError ? "outdated" : "noReply");
    }
  };

  subscriptions.push(
    watch.addListener("connection", (c) => {
      if (c.state === "disconnected" || c.state === "error") fail("lost");
    }),
    watch.addListener("event", (e) => {
      if (over || e.type !== "manualData") return;
      if (e.kind === kind && Array.isArray(e.records)) {
        const found = (e.records as Record<string, unknown>[])
          .filter((r) => typeof r.at === "number" && r.at >= since && valueOf(r) !== undefined)
          .sort((a, b) => Number(b.at) - Number(a.at))[0];
        if (found) return done(valueOf(found) as number);
      }
      // O'qish tugadi, lekin yangi yozuv yo'q: biroz kutib, yana so'raymiz.
      if (e.complete === true || e.failed === true) again();
    }),
  );

  const capTimer = setTimeout(() => fail("onWatchNoneHrv"), ON_WATCH_MAX_MS);
  handlers.onProgress({ progress: 0, live: null, hint: "onWatchHrv" });
  ask();

  return () => {
    if (!over) teardown();
  };
}

/**
 * Nasosli bosim soatning o'zida boshlanadi, ilova esa soat xotirasidagi yangi yozuvni kutadi. Bu SDK hujjatida
 * yozilgan rasmiy yo'l (`readDeviceManualData`, faqat nasosli bosimi bor soatlar uchun); ilovadan nasosni
 * boshlash hujjatlashtirilmagan va ba'zi holatlarda ishlamaydi. `synapse-soat` dagi `measureBpOnWatch` ning
 * ekvivalenti: har 5 s da yozuvlar o'qiladi, `since` dan yangisi chiqquncha.
 */
export function startOnWatchBp(handlers: MeasureHandlers): () => void {
  const watch = watchModule;
  if (!watch) {
    handlers.onError("unavailable");
    return noop;
  }

  const key = "pressurePump" as const;
  const since = Math.floor(Date.now() / 1000) - 30; // bosishdan sal oldin tugagan o'lchov ham hisoblanadi
  let over = false;
  activeMeasures += 1;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  const subscriptions: { remove: () => void }[] = [];

  const teardown = () => {
    if (!over) activeMeasures -= 1;
    over = true;
    subscriptions.forEach((s) => s.remove());
    clearTimeout(pollTimer);
    clearTimeout(silenceTimer);
    clearTimeout(capTimer);
  };
  const done = (sys: number, dia: number, pulse: number | undefined) => {
    if (over) return;
    teardown();
    handlers.onDone({ key, sys, dia, pulse });
  };
  const fail = (error: MeasureError) => {
    if (over) return;
    teardown();
    handlers.onError(error);
  };

  const again = () => {
    clearTimeout(silenceTimer);
    clearTimeout(pollTimer);
    pollTimer = setTimeout(ask, ON_WATCH_POLL_MS);
  };
  const ask = () => {
    if (over) return;
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(again, ON_WATCH_SILENCE_MS);
    try {
      watch.readManualBp(since);
    } catch (err) {
      // TypeError: bu funksiya o'rnatilgan build'da yo'q (modul eski).
      fail(err instanceof TypeError ? "outdated" : "noReply");
    }
  };

  subscriptions.push(
    watch.addListener("connection", (c) => {
      if (c.state === "disconnected" || c.state === "error") fail("lost");
    }),
    watch.addListener("event", (e) => {
      if (over || e.type !== "manualBp") return;
      if (Array.isArray(e.records)) {
        const found = (e.records as Record<string, unknown>[])
          .filter((r) => {
            // `synapse-soat` andozasi (toHistoryItem): turidan qat'i nazar yaroqli yuqori/quyi bosimli har bir yangi
            // yozuv natija. (Nasosli yozuvni `mode`/`version` ajratadi, lekin ularga tayanib yozuvni tashlab yubormaymiz.)
            const sys = inRange(r.sys, 50, 300);
            const dia = inRange(r.dia, 20, 250);
            return typeof r.at === "number" && r.at >= since && sys !== undefined && dia !== undefined && sys > dia;
          })
          .sort((a, b) => Number(b.at) - Number(a.at))[0];
        if (found) return done(Number(found.sys), Number(found.dia), inRange(found.hr, 30, 250));
      }
      // O'qish tugadi (yoki soat o'qiy olmadi), lekin yangi yozuv yo'q: biroz kutib, yana so'raymiz.
      if (e.complete === true || e.failed === true || Array.isArray(e.records)) again();
    }),
  );

  const capTimer = setTimeout(() => fail("onWatchNone"), ON_WATCH_MAX_MS);
  handlers.onProgress({ progress: 0, live: null, hint: "onWatch" });
  ask();

  return () => {
    if (!over) teardown();
  };
}

/**
 * O'rnatilgan APK'dagi native modulda kerakli funksiyalar bormi. Kod (JS) Metro orqali yangilanadi, native modul esa
 * faqat yangi APK bilan, shuning uchun eski APK'da yangi o'lchovlar "outdated" xatosini beradi. Sahifada ko'rsatish uchun.
 */
export function missingNativeFunctions(): string[] {
  const watch = watchModule as unknown as Record<string, unknown> | null;
  if (!watch) return [];
  const required = ["getConnectionState", "startSpo2", "startTemp", "startEcg", "readManualBp"];
  return required.filter((name) => typeof watch[name] !== "function");
}
