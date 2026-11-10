import { Directory, File, Paths } from "expo-file-system";

import { getJSON, setJSON } from "@/shared/storage/storage";
import type { RawReading } from "@/shared/watch/measure";

// EKG yozuvlari: shifokorga ko'rsatish uchun to'lqin bilan birga saqlanadi.
//  - to'lqin (bir necha ming nuqta) — alohida JSON fayl (Paths.document/ecg/<id>.json);
//  - ro'yxat (qisqa ma'lumot) — AsyncStorage, tez ochilishi uchun.

type EcgReading = Extract<RawReading, { key: "ecg" }>;

/** Yozuv paytidagi soat (hisobotda "Qurilma"). */
export type EcgDevice = { model: string | null; firmware: string | null; address: string | null };

export type EcgRecord = Omit<EcgReading, "key"> & {
  id: string;
  at: number; // ms
  durationS: number;
  device: EcgDevice;
};

/** Ro'yxat uchun: to'lqinsiz. */
export type EcgRecordSummary = Pick<EcgRecord, "id" | "at" | "value" | "durationS" | "qtc" | "hrv">;

const INDEX_KEY = "ecg.index.v1";
const MAX_RECORDS = 50;

const directory = () => new Directory(Paths.document, "ecg");
const recordFile = (id: string) => new File(directory(), `${id}.json`);

export function makeEcgRecord(reading: EcgReading, device: EcgDevice, at = Date.now()): EcgRecord {
  const { key: _key, ...rest } = reading;
  return {
    ...rest,
    id: String(at),
    at,
    durationS: reading.trace.rate > 0 ? Math.round(reading.trace.samples.length / reading.trace.rate) : 0,
    device,
  };
}

export async function listEcgRecords(): Promise<EcgRecordSummary[]> {
  return (await getJSON<EcgRecordSummary[]>(INDEX_KEY)) ?? [];
}

export async function saveEcgRecord(record: EcgRecord): Promise<void> {
  const dir = directory();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  await recordFile(record.id).write(JSON.stringify(record));

  const summary: EcgRecordSummary = {
    id: record.id,
    at: record.at,
    value: record.value,
    durationS: record.durationS,
    qtc: record.qtc,
    hrv: record.hrv,
  };
  const index = [summary, ...(await listEcgRecords()).filter((r) => r.id !== record.id)];
  // Eng eskilarini (fayli bilan) o'chirib, xotirani cheksiz o'stirmaymiz.
  for (const old of index.slice(MAX_RECORDS)) {
    try {
      const file = recordFile(old.id);
      if (file.exists) file.delete();
    } catch {
      // O'chirib bo'lmasa ham ro'yxatdan chiqariladi.
    }
  }
  await setJSON(INDEX_KEY, index.slice(0, MAX_RECORDS));
}

export async function loadEcgRecord(id: string): Promise<EcgRecord | null> {
  try {
    const file = recordFile(id);
    if (!file.exists) return null;
    return JSON.parse(await file.text()) as EcgRecord;
  } catch {
    return null;
  }
}
