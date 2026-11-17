const pad = (n: number) => String(n).padStart(2, "0");

/** "16.11.2026 09:14" (EKG yozuvlari bilan bir xil ko'rinish). */
export function formatDateTime(at: number): string {
  const d = new Date(at);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
