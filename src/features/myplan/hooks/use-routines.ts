import { useEffect, useSyncExternalStore } from "react";

import {
  getRoutines,
  loadRoutines,
  removeRoutine,
  routinesLoaded,
  subscribeRoutines,
  toggleRoutine,
  upsertRoutine,
} from "../api/routines";

/** Rutinalar (telefonda saqlanadi): ro'yxat va o'zgartirish amallari. Ro'yxat umumiy: ishga tushirgich ham shuni o'qiydi. */
export function useRoutines() {
  const routines = useSyncExternalStore(subscribeRoutines, getRoutines, getRoutines);
  const loaded = useSyncExternalStore(subscribeRoutines, routinesLoaded, routinesLoaded);

  useEffect(() => {
    void loadRoutines();
  }, []);

  return { routines, loaded, upsert: upsertRoutine, remove: removeRoutine, toggle: toggleRoutine };
}
