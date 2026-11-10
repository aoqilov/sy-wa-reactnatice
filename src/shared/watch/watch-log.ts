import { useSyncExternalStore } from "react";

// Soat bilan almashinuvning umumiy jurnali (diagnostika): ulanish holatlari va soatdan kelgan hodisalar.
// Ilovaning butun ishlash vaqtida saqlanadi, ya'ni Home'dan boshlangan o'lchovning kadrlarini ham keyin
// `/watch` panelida ko'rish mumkin. Eng yangi qator tepada.

const MAX_LINES = 300;

let lines: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function logWatch(line: string) {
  lines = [`${new Date().toLocaleTimeString()}  ${line}`, ...lines].slice(0, MAX_LINES);
  notify();
}

export function clearWatchLog() {
  lines = [];
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWatchLog(): string[] {
  return useSyncExternalStore(subscribe, () => lines, () => lines);
}
