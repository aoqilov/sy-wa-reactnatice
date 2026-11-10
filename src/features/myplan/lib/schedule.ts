const pad = (n: number) => String(n).padStart(2, "0");

export const DAY_END = 1439; // 23:59

/** Kun boshidan daqiqa → "08:00". */
export function hhmm(min: number) {
  const m = Math.max(0, Math.min(DAY_END, Math.round(min)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// "30 daqiqada", "2 soatda": "Har ..." deb ishlatiladi.
export function intervalText(min: number) {
  return min >= 60 && min % 60 === 0 ? `${min / 60} soatda` : `${min} daqiqada`;
}

/** Vaqt oynasi: butun kun bo'lsa "kun bo'yi", aks holda "08:00–22:00". */
export function windowText(startMin: number, endMin: number) {
  return startMin <= 0 && endMin >= DAY_END ? "kun bo'yi" : `${hhmm(startMin)}–${hhmm(endMin)}`;
}

/** Kuniga taxminan nechta o'lchov: vaqt oynasi ichida. */
export function perDay(min: number, startMin = 0, endMin = DAY_END) {
  if (min <= 0) return 0;
  return Math.floor(Math.max(0, endMin - startMin) / min) + 1;
}

/** Keyingi o'lchov vaqti: oyna boshidan interval bo'yicha; oynadan tashqarida bo'lsa — keyingi oyna boshi. */
export function nextRun(now: Date, min: number, startMin = 0, endMin = DAY_END) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (min <= 0) return "—";
  if (minutes < startMin) return hhmm(startMin);
  const next = startMin + (Math.floor((minutes - startMin) / min) + 1) * min;
  if (next > endMin || next >= 1440) return `ertaga ${hhmm(startMin)}`;
  return hhmm(next);
}
