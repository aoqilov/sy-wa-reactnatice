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
  startBp(): void;
  stopBp(): void;
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
