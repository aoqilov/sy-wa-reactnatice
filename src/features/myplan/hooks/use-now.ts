import { useEffect, useState } from "react";

// Hozirgi vaqt: "Keyingisi: 14:30" yangilanib turishi uchun har 30 soniyada yangilanadi.
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);

  return now;
}
