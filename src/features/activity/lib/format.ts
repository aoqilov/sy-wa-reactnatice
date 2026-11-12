/** 12500 → "12 500" (minglik bo'shliq bilan, til sozlamasidan qat'i nazar). */
export function formatInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Masofa: 1 km dan kam bo'lsa metrda, aks holda 2 xona aniqlikda km. */
export function formatDistance(km: number): { value: string; unit: "m" | "km" } {
  if (km < 1) return { value: String(Math.round(km * 1000)), unit: "m" };
  return { value: km.toFixed(2), unit: "km" };
}
