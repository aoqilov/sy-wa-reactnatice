export type ScanEvent = {
  /** `bluetoothOff`: telefonda Bluetooth o'chiq, skan boshlanmadi. */
  state: 'started' | 'stopped' | 'found' | 'bluetoothOff';
  id?: string;
  name?: string | null;
  rssi?: number;
};

export type ConnectionState = 'connecting' | 'authenticating' | 'ready' | 'disconnected' | 'error';

/** Uzilish/xato sababining kodi (JS uni tarjima qiladi): `bluetoothOff` — telefonda Bluetooth o'chiq yoki o'chirildi. */
export type ConnectionReason = 'bluetoothOff';

export type ConnectionEvent = {
  state: ConnectionState;
  id?: string | null;
  message?: string | null;
  reason?: ConnectionReason | null;
};

/** Telefondagi Bluetooth yoqildi yoki o'chirildi (native BroadcastReceiver). */
export type BluetoothEvent = { on: boolean };

/**
 * Umumiy hodisa: `type` maydoni bo'yicha ajratiladi. 1-bosqichda xom shakl (SDK javoblari),
 * 2-bosqichda `synapse-soat` dagi hodisa shakllariga o'giriladi (docs/watch-integration-plan.md).
 */
export type WatchEvent = { type: string } & Record<string, unknown>;

export type VeepooWatchEvents = {
  scan: (event: ScanEvent) => void;
  connection: (event: ConnectionEvent) => void;
  event: (event: WatchEvent) => void;
  bluetooth: (event: BluetoothEvent) => void;
};

/** Bildirishnoma varianti: "custom" = ESocailMsg.APP_CUSTOM_MSG, "other" = ESocailMsg.OTHER. */
export type NotifyVariant = 'custom' | 'other';

/** Qo'ng'iroqlarni soatga uzatish: kalit, kuzatuv va telefon ruxsatlari. */
export type CallForwardStatus = {
  enabled: boolean;
  /** Telefon holati kuzatilyapti (ilova jarayoni tirik). */
  listening: boolean;
  phoneState: boolean;
  /** Android 9+: raqam faqat shu ruxsat bilan keladi. */
  callLog: boolean;
  /** Kontakt nomi. */
  contacts: boolean;
  /** Soatdan rad etish / javob berish. */
  answerCalls: boolean;
};

/** Android `EAutoMeasureType.value`. */
export const AutoMeasureType = {
  PulseRate: 0,
  BloodPressure: 1,
  BloodGlucose: 2,
  Stress: 3,
  BloodOxygen: 4,
  BodyTemperature: 5,
  Hrv: 7,
} as const;
