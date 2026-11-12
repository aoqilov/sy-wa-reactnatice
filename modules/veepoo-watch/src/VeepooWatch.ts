import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { CallForwardStatus, ConnectionEvent, NotifyVariant, VeepooWatchEvents } from './VeepooWatch.types';

declare class VeepooWatchModule extends NativeModule<VeepooWatchEvents> {
  /** Native qismdagi joriy ulanish holati (JS qayta yuklangandan keyin holatni tiklash uchun). */
  getConnectionState(): ConnectionEvent;
  isBluetoothEnabled(): boolean;
  /** Android'ning "Bluetooth'ni yoqing" tizim oynasi. true — yoqildi, false — rad etildi. */
  requestEnableBluetooth(): Promise<boolean>;
  startScan(): void;
  stopScan(): void;
  /** `confirmOnWatch`: true — qo'lda ulash (soat ekranida tasdiq), false — avto-qayta ulash. */
  connect(id: string, confirmOnWatch: boolean): void;
  disconnect(): void;

  readBattery(): void;
  startHeart(): void;
  stopHeart(): void;
  startSpo2(): void;
  stopSpo2(): void;
  /** Optik qon bosimi (umumiy rejim). */
  /** EKG: hodisalar "ecg" (soniyada holat), "ecgResult" (natija), "ecgWave" (to'lqin nuqtalari soni). */
  startEcg(): void;
  stopEcg(): void;
  startTemp(): void;
  stopTemp(): void;
  /**
   * Shakar (optik, taxminiy). Hodisalar: "glucose" {progress 0..100, value mmol/l, risk NONE|LOW|MIDDLE|HIGH},
   * "glucoseError" {status NONSUPPORT|LOW_POWER|BUSY|WEARING_ERROR}, "glucoseStop", "glucoseSupport" {detect, any}.
   */
  startGlucose(): void;
  stopGlucose(): void;
  /**
   * Qon tahlili (Normal rejim). Hodisalar: "blood" {progress, uricAcid µmol/l, tcho, tag, hdl, ldl mmol/l},
   * "bloodDone" {qiymatlar}, "bloodError" {state UNSUPPORTED|LOW_POWER|BUSY|WEAR_ERROR|UNKNOWN}, "bloodStop".
   */
  startBloodComponent(): void;
  stopBloodComponent(): void;
  /** HRV (ms). Hodisalar: "hrv" {value}, "hrvError" {state}, "hrvStop". */
  startHrv(): void;
  stopHrv(): void;
  /** Stress 0..100. Hodisalar: "stress" {progress}, "stressDone" {value}, "stressError" {state}, "stressStop". */
  startStress(): void;
  stopStress(): void;
  /** MET. Hodisalar: "met" {progress, value}, "metError" {state}, "metStop". */
  startMet(): void;
  stopMet(): void;
  /**
   * Tana tarkibi (elektrod orqali). Hodisalar: "body" {progress, lead (0 — barmoq tegib turibdi)},
   * "bodyDone" {bmi, fatPct, musclePct, muscleKg, waterPct, boneKg, bmr}, "bodyError" {state}, "bodyStop".
   */
  startBodyComp(): void;
  stopBodyComp(): void;
  startCuffBp(rawFlag: boolean): void;
  stopCuffBp(): void;
  /** Soatning o'zida o'lchangan bosim yozuvlarini o'qish: natija "manualBp" hodisasi bilan keladi. `sinceSec` — epoch soniya. */
  readManualBp(sinceSec: number): void;
  /**
   * History sinxroni: soat xotirasidagi yozuvlar. `kinds`: "bp" | "hr" | "spo2" | "temp" | "glucose" | "blood".
   * Hodisa "manualData": `{kind, records}` har tur uchun, oxirida `{complete}` yoki `{failed}`.
   */
  readManualData(sinceSec: number, kinds: string[]): void;
  /**
   * Soatning kunlik 5 daqiqalik ma'lumoti (avto-o'lchovlar), bugundan `days` kun. Hodisa "dailyData":
   * `{records}` (har yozuv: y, mo, d, h, mi va hr / hrs / sys / dia / temp / spo2 / glucose / blood), oxirida
   * `{complete}` yoki `{timeout}`.
   */
  readDailyData(days: number): void;
  /** Soatdagi matnli budilniklar. Hodisa "textAlarm": `{op, alarms: [{id, hour, minute, repeat, content, open}]}`. */
  readTextAlarms(): void;
  /** `repeat`: 7 belgi, masalan "1111111" (har kuni). */
  addTextAlarm(hour: number, minute: number, repeat: string, content: string): void;
  deleteTextAlarm(id: number): void;
  setTextAlarmOpen(id: number, open: boolean): void;

  readNotificationSwitches(): void;
  setOtherNotifications(on: boolean): void;
  sendNotification(title: string, body: string, variant: NotifyVariant): void;

  /** Soatdagi "qo'ng'iroq eslatmasi" kaliti. Javob "socialSwitch" hodisasida (`phone`). */
  setCallNotifications(on: boolean): void;
  /**
   * Soatga kiruvchi qo'ng'iroqni ko'rsatadi (sinov). Hodisalar: "callSent"; soatdagi tugmalar —
   * "phoneControl" {action: "reject" | "silence" | "answer"}.
   */
  sendIncomingCall(name: string, number: string): void;
  /** Qo'ng'iroq tugadi / javob berildi: soat qo'ng'iroq ekranini yopadi. Hodisa "callEnded". */
  endIncomingCall(): void;

  /**
   * Haqiqiy qo'ng'iroqlarni soatga uzatish (kalit saqlanadi, ilova qayta ochilganda ham yoqiq qoladi).
   * Ruxsatlarni JS oldindan so'raydi. Hodisalar: "callForward" (holat), "callIncoming", "callAction" {action, ok}.
   */
  setCallForwarding(on: boolean): void;
  getCallForwardStatus(): CallForwardStatus;

  /** Bugungi jami. Hodisa "sportStep" {step, kcal, dis (km)}. */
  readSteps(): void;
  /** Soatga shaxsiy ma'lumot va maqsadlar (kkal/masofa hisobi, maqsad halqasi). Hodisa "personInfo" {status}. */
  syncPersonInfo(male: boolean, heightCm: number, weightKg: number, age: number, stepGoal: number, sleepGoalMin: number): void;

  readAutoMeasure(): void;
  /** `startMin`/`endMin` manfiy bo'lsa soatdagi joriy oraliq saqlanadi. */
  setAutoMeasure(typeValue: number, on: boolean, intervalMin: number, startMin: number, endMin: number): void;

  /** Soat siferblatlarni qanday qo'llashi. Hodisa "dialInfo" {jl, screenStyle, serverUi, bigTranType, serverCount, appPackage, appVersion}. */
  readDialInfo(): void;
  /**
   * Siferblat do'koni ro'yxati (Veepoo serveri). Hodisa "dialMarket": `{items: [{crc, name, previewUrl, fileUrl, shape,
   * size, available}], currentCrc, shape}` yoki `{error: UNSUPPORTED | NO_INFO | NETWORK, message}`.
   */
  loadDialMarket(deviceNumber: string, deviceTestVersion: string): void;
  /** Yuklab olib soatga o'rnatadi. Hodisa "dialInstall" {stage: download | prepare | clear | transfer | done | error, progress, error?}. */
  installDial(fileUrl: string, crc: string): void;

  /**
   * Avto-o'lchash kalitlari (intervalsiz): S105/E500 intervalli `readAutoMeasure` ni qo'llamaydi, lekin shu kalitlarni biladi.
   * Hodisa "autoSwitches": `{status, heartRate, bloodPressure, hrv, temperature, bloodGlucose, bloodComponent}` — `status`
   * READ_SUCCESS | SETTING_SUCCESS | FAIL | UNKNOW, qolganlari `EFunctionStatus` nomi (SUPPORT_OPEN | SUPPORT_CLOSE | UNSUPPORT).
   */
  readAutoSwitches(): void;
  /** `key`: heartRate | bloodPressure | hrv | temperature | bloodGlucose | bloodComponent. Avval `readAutoSwitches` kerak. */
  setAutoSwitch(key: string, on: boolean): void;
  /** Kechasi SpO2 avto-o'lchash. Hodisa "spo2Night": `{result, open, startMin, endMin}` (`result` — `EAllSetStatus` nomi). */
  readSpo2Night(): void;
  /** `startMin`/`endMin` — kun boshidan daqiqa (masalan 22:00 = 1320 .. 08:00 = 480). */
  setSpo2Night(on: boolean, startMin: number, endMin: number): void;
}

// Native modulni JSI orqali yuklaydi. Web'da `VeepooWatch.web.ts` (bo'sh stub) ishlatiladi.
// Modul faqat uni o'z ichiga olgan dev build'da bor. Expo Go'da, eski build'da va iOS'da (iOS qismi
// hali yozilmagan) u topilmaydi: `requireNativeModule` import paytida xato tashlab, butun ekranni
// yiqitardi, shuning uchun `null` qaytaramiz va chaqiruvchi tekshiradi.
export default requireOptionalNativeModule<VeepooWatchModule>('VeepooWatch');
