import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ConnectionEvent, NotifyVariant, VeepooWatchEvents } from './VeepooWatch.types';

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

  readAutoMeasure(): void;
  /** `startMin`/`endMin` manfiy bo'lsa soatdagi joriy oraliq saqlanadi. */
  setAutoMeasure(typeValue: number, on: boolean, intervalMin: number, startMin: number, endMin: number): void;
}

// Native modulni JSI orqali yuklaydi. Web'da `VeepooWatch.web.ts` (bo'sh stub) ishlatiladi.
// Modul faqat uni o'z ichiga olgan dev build'da bor. Expo Go'da, eski build'da va iOS'da (iOS qismi
// hali yozilmagan) u topilmaydi: `requireNativeModule` import paytida xato tashlab, butun ekranni
// yiqitardi, shuning uchun `null` qaytaramiz va chaqiruvchi tekshiradi.
export default requireOptionalNativeModule<VeepooWatchModule>('VeepooWatch');
