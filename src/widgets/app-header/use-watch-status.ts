// Soat holati. Hozircha soxta (mock) ma'lumot: keyin haqiqiy qurilmadan (Bluetooth/API) olinadi.
export type WatchStatus = {
  model: string;
  battery: number; // 0-100
};

export function useWatchStatus(): WatchStatus {
  return { model: "Watch X1", battery: 82 };
}
