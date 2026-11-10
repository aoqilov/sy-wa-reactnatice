// Feature'ning "public API"si: tashqaridan faqat shu fayl orqali import qilinadi.
export { EcgLiveStrip } from "./components/EcgLiveStrip";
export { EcgRecordsPage } from "./pages/EcgRecordsPage";
export { EcgReportPage } from "./pages/EcgReportPage";
export { type EcgDevice, type EcgRecord, makeEcgRecord, saveEcgRecord } from "./lib/ecg-records";
