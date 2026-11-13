import { NativeModule, registerWebModule } from 'expo';

import type { CallForwardStatus, ConnectionEvent, NotifyVariant, VeepooWatchEvents } from './VeepooWatch.types';

// Web build maqsad emas (docs/watch-integration-plan.md, qaror 5). Bu stub faqat web'da import yiqilmasligi uchun.
class VeepooWatchWeb extends NativeModule<VeepooWatchEvents> {
  getConnectionState(): ConnectionEvent {
    return { state: 'disconnected', id: null, message: null };
  }
  isBluetoothEnabled(): boolean {
    return false;
  }
  async requestEnableBluetooth(): Promise<boolean> {
    return false;
  }
  startScan(): void {}
  stopScan(): void {}
  connect(_id: string, _confirmOnWatch: boolean): void {}
  disconnect(): void {}

  readBattery(): void {}
  startHeart(): void {}
  stopHeart(): void {}
  startSpo2(): void {}
  stopSpo2(): void {}
  startEcg(): void {}
  stopEcg(): void {}
  startTemp(): void {}
  stopTemp(): void {}
  startGlucose(): void {}
  stopGlucose(): void {}
  startBloodComponent(): void {}
  stopBloodComponent(): void {}
  startHrv(): void {}
  stopHrv(): void {}
  startStress(): void {}
  stopStress(): void {}
  startMet(): void {}
  stopMet(): void {}
  startBodyComp(): void {}
  stopBodyComp(): void {}
  startCuffBp(_rawFlag: boolean): void {}
  stopCuffBp(): void {}
  readManualBp(_sinceSec: number): void {}
  readManualData(): void {}
  readDailyData(): void {}
  readDailyDay(): void {}
  readTextAlarms(): void {}
  addTextAlarm(): void {}
  deleteTextAlarm(): void {}
  setTextAlarmOpen(): void {}

  readNotificationSwitches(): void {}
  setOtherNotifications(_on: boolean): void {}
  sendNotification(_title: string, _body: string, _variant: NotifyVariant): void {}

  setCallNotifications(_on: boolean): void {}
  sendIncomingCall(_name: string, _number: string): void {}
  endIncomingCall(): void {}
  setCallForwarding(_on: boolean): void {}
  getCallForwardStatus(): CallForwardStatus {
    return { enabled: false, listening: false, phoneState: false, callLog: false, contacts: false, answerCalls: false };
  }

  readSteps(): void {}
  syncPersonInfo(): void {}

  readAutoMeasure(): void {}
  setAutoMeasure(
    _typeValue: number,
    _on: boolean,
    _intervalMin: number,
    _startMin: number,
    _endMin: number
  ): void {}

  readDialInfo(): void {}
  loadDialMarket(_deviceNumber: string, _deviceTestVersion: string): void {}
  installDial(_fileUrl: string, _crc: string): void {}
  readAutoSwitches(): void {}
  setAutoSwitch(_key: string, _on: boolean): void {}
  readSpo2Night(): void {}
  setSpo2Night(_on: boolean, _startMin: number, _endMin: number): void {}
}

export default registerWebModule(VeepooWatchWeb, 'VeepooWatch');
