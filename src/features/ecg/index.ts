// Feature'ning "public API"si: tashqaridan faqat shu fayl orqali import qilinadi.
export { EcgLiveStrip } from "./components/EcgLiveStrip";
export { EcgRecordsSheet } from "./components/EcgRecordsSheet";
export { type EcgDevice, type EcgRecord, makeEcgRecord, saveEcgRecord } from "./lib/ecg-records";
