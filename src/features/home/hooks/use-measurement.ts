import { useEffect, useState } from "react";

import { Metric } from "../api/get-metrics";

type MetricKey = Metric["key"];
type Reading = Pick<Metric, "value" | "status" | "statusLabel">;

const DURATION = 5; // soxta o'lchash davomiyligi (soniya). Haqiqiy soatda soatning javobi bilan almashadi.

const pad = (n: number) => String(n).padStart(2, "0");
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

// Soxta (mock) o'lchov natijasi. Keyin soatdan keladigan qiymat bilan almashtiriladi.
function fakeReading(key: MetricKey): Reading {
  const normal = { status: "normal", statusLabel: "Normal" } as const;
  switch (key) {
    case "pulse":
      return { value: String(rand(62, 92)), ...normal };
    case "pressurePump":
    case "pressureOptical":
      return { value: `${rand(110, 125)}/${rand(70, 82)}`, ...normal };
    case "ecg":
      return { value: "Normal", ...normal };
    case "oxygen":
      return { value: String(rand(95, 99)), ...normal };
    case "temperature":
      return { value: (36.2 + Math.random() * 0.8).toFixed(1), ...normal };
    case "blood":
      return { value: String(rand(135, 155)), ...normal };
    case "sugar":
      return { value: (4.5 + Math.random() * 1).toFixed(1), ...normal };
  }
}

// Tanlangan o'lchov, o'lchash jarayoni (hisoblagich) va yangi natijalarni boshqaradi.
export function useMeasurement(metrics: Metric[]) {
  const [selectedKey, setSelectedKey] = useState<MetricKey>("pulse");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null); // null = o'lchanmayapti
  const [readings, setReadings] = useState<Partial<Record<MetricKey, Reading & { time: string }>>>({});

  // Hisoblagich: har soniyada kamayadi, 0 ga yetganda natija saqlanadi.
  useEffect(() => {
    if (secondsLeft === null) return;
    const id = setTimeout(() => {
      if (secondsLeft <= 1) {
        const now = new Date();
        setReadings((prev) => ({
          ...prev,
          [selectedKey]: { ...fakeReading(selectedKey), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
        }));
        setSecondsLeft(null);
      } else {
        setSecondsLeft(secondsLeft - 1);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, selectedKey]);

  // Yangi o'lchov bo'lsa, u ustiga yoziladi va tarixning boshiga qo'shiladi.
  const withFresh = (m: Metric): Metric => {
    const fresh = readings[m.key];
    if (!fresh) return m;
    return {
      ...m,
      value: fresh.value,
      status: fresh.status,
      statusLabel: fresh.statusLabel,
      updatedAt: "Hozirgina",
      history: [{ time: fresh.time, value: fresh.value }, ...m.history],
    };
  };

  const items = metrics.map(withFresh); // hamma o'lchovlar (tanlagich uchun)
  const current = items.find((m) => m.key === selectedKey) ?? items[0];

  return {
    items,
    current,
    selectedKey,
    select: (key: MetricKey) => {
      setSecondsLeft(null); // boshqa o'lchovga o'tilsa, jarayon bekor qilinadi
      setSelectedKey(key);
    },
    measuring: secondsLeft !== null,
    secondsLeft: secondsLeft ?? 0,
    start: () => setSecondsLeft(DURATION),
    cancel: () => setSecondsLeft(null),
  };
}
