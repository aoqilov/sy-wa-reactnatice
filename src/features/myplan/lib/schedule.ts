const pad = (n: number) => String(n).padStart(2, "0");

// "30 daqiqada", "2 soatda": "Har ..." deb ishlatiladi.
export function intervalText(min: number) {
  return min >= 60 && min % 60 === 0 ? `${min / 60} soatda` : `${min} daqiqada`;
}

// Kuniga taxminan nechta o'lchov bo'lishi.
export function perDay(min: number) {
  return Math.floor(1440 / min);
}

// Keyingi o'lchov vaqti (kun boshidan interval bo'yicha hisoblanadi).
export function nextRun(now: Date, min: number) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const next = (Math.floor(minutes / min) + 1) * min;
  const tomorrow = next >= 1440;
  const m = next % 1440;
  return `${tomorrow ? "ertaga " : ""}${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
