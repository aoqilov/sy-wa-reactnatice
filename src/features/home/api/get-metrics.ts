import type { ComponentProps } from "react";

import type Octicons from "@expo/vector-icons/Octicons";

export type MetricStatus = "normal" | "warning" | "danger";

export type MetricKey =
  | "pulse"
  | "pressurePump"
  | "pressureOptical"
  | "oxygen"
  | "temperature"
  | "ecg"
  | "blood"
  | "sugar";

export type Metric = {
  key: MetricKey;
  title: string;
  icon: ComponentProps<typeof Octicons>["name"];
  value: string; // "72", "120/80"
  unit: string; // "zarb/daq", "mmHg"
  status: MetricStatus;
  statusLabel: string; // "Normal", "Yuqori"
  updatedAt: string; // "2 daqiqa oldin"
  normalRange: string;
  summary: { min: string; avg: string; max: string }; // bugungi
  history: { time: string; value: string }[]; // oxirgi o'lchovlar
};

// Hozircha soxta (mock) ma'lumot. Keyin Bluetooth orqali soatdan o'qiladi.
export async function getMetrics(): Promise<Metric[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return [
    {
      key: "pulse",
      title: "Puls",
      icon: "pulse",
      value: "72",
      unit: "zarb/daq",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "2 daqiqa oldin",
      normalRange: "60-100 zarb/daq",
      summary: { min: "58", avg: "74", max: "112" },
      history: [
        { time: "16:50", value: "72" },
        { time: "16:20", value: "76" },
        { time: "15:50", value: "70" },
        { time: "15:20", value: "81" },
      ],
    },
    {
      key: "pressurePump",
      title: "Bosim (nasos)",
      icon: "meter",
      value: "126/82",
      unit: "mmHg",
      status: "warning",
      statusLabel: "Biroz yuqori",
      updatedAt: "15 daqiqa oldin",
      normalRange: "120/80 mmHg gacha",
      summary: { min: "112/74", avg: "122/80", max: "134/88" },
      history: [
        { time: "16:40", value: "126/82" },
        { time: "13:10", value: "122/80" },
        { time: "09:30", value: "118/78" },
      ],
    },
    {
      key: "pressureOptical",
      title: "Bosim (optik)",
      icon: "eye",
      value: "124/81",
      unit: "mmHg",
      status: "warning",
      statusLabel: "Biroz yuqori",
      updatedAt: "20 daqiqa oldin",
      normalRange: "120/80 mmHg gacha",
      summary: { min: "110/72", avg: "121/79", max: "132/86" },
      history: [
        { time: "16:35", value: "124/81" },
        { time: "12:50", value: "120/78" },
        { time: "09:10", value: "116/76" },
      ],
    },
    {
      key: "oxygen",
      title: "Kislorod",
      icon: "heart",
      value: "97",
      unit: "% SpO2",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "5 daqiqa oldin",
      normalRange: "95-100 %",
      summary: { min: "94", avg: "97", max: "99" },
      history: [
        { time: "16:48", value: "97" },
        { time: "16:18", value: "98" },
        { time: "15:48", value: "96" },
      ],
    },
    {
      key: "temperature",
      title: "Temperatura",
      icon: "flame",
      value: "36.7",
      unit: "°C",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "10 daqiqa oldin",
      normalRange: "36.1-37.2 °C",
      summary: { min: "36.2", avg: "36.6", max: "37.0" },
      history: [
        { time: "16:43", value: "36.7" },
        { time: "14:00", value: "36.5" },
        { time: "10:00", value: "36.4" },
      ],
    },
    {
      key: "ecg",
      title: "EKG",
      icon: "graph",
      value: "Normal",
      unit: "sinus ritm",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "1 soat oldin",
      normalRange: "Sinus ritm",
      summary: { min: "-", avg: "-", max: "-" },
      history: [
        { time: "15:55", value: "Sinus ritm" },
        { time: "09:40", value: "Sinus ritm" },
      ],
    },
    {
      key: "blood",
      title: "Qon tarkibi",
      icon: "beaker",
      value: "145",
      unit: "g/l gemoglobin",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "Kecha, 18:20",
      normalRange: "Erkak: 130-170, ayol: 120-150 g/l",
      summary: { min: "142", avg: "145", max: "148" },
      history: [
        { time: "Kecha 18:20", value: "145" },
        { time: "2 kun oldin", value: "143" },
        { time: "3 kun oldin", value: "146" },
      ],
    },
    {
      key: "sugar",
      title: "Shakar",
      icon: "sparkle",
      value: "5.4",
      unit: "mmol/l",
      status: "normal",
      statusLabel: "Normal",
      updatedAt: "40 daqiqa oldin",
      normalRange: "3.9-5.6 mmol/l (och qoringa)",
      summary: { min: "4.6", avg: "5.3", max: "6.8" },
      history: [
        { time: "16:10", value: "5.4" },
        { time: "12:30", value: "6.1" },
        { time: "07:40", value: "4.9" },
      ],
    },
  ];
}
