import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useProfile } from "@/features/profile";
import { useWatchConnection } from "@/shared/watch/watch-connection";

import {
  type ActivityGoals,
  activityAvailable,
  getGoals,
  loadCachedToday,
  loadGoals,
  readTodayActivity,
  saveGoals,
  subscribeGoals,
  syncPersonToWatch,
  type TodayActivity,
} from "../api/activity";

/** Soat ulangan va ilova ochiq bo'lsa, bugungi qadamlar shuncha vaqtda yangilanadi. */
const REFRESH_MS = 60_000;

export function useActivityGoals() {
  const [goals, setGoals] = useState<ActivityGoals>(getGoals);
  useEffect(() => {
    const off = subscribeGoals(setGoals);
    void loadGoals();
    return off;
  }, []);
  return { goals, save: saveGoals };
}

/**
 * Bugungi qadam, kkal, masofa. Avval keshdagi (bugungi) qiymat, so'ng soatdan o'qiladi: ulanganda, har daqiqada
 * va ilova oldinga chiqqanda. Soat band (o'lchov) bo'lsa o'qish keyingi safarga qoladi.
 */
export function useTodayActivity() {
  const { status } = useWatchConnection();
  const ready = status === "ready";
  const [today, setToday] = useState<TodayActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const fresh = await readTodayActivity();
      if (fresh) setToday(fresh);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadCachedToday().then((cached) => {
      if (active && cached) setToday((cur) => cur ?? cached);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !activityAvailable()) return;
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, REFRESH_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, refresh]);

  return { today, loading, refresh, ready, available: activityAvailable() };
}

/**
 * Profil (bo'y, vazn, yosh, jins) va maqsadlarni soatga yuboradi: ulanganda va ular o'zgarganda.
 * Ilova qobig'ida bir marta chaqiriladi.
 */
export function useWatchPersonSync() {
  const { profile } = useProfile();
  const { status } = useWatchConnection();
  const { goals } = useActivityGoals();
  const ready = status === "ready";

  useEffect(() => {
    if (!ready || !profile) return;
    // Ulanishdan so'ng soat boshqa buyruqlarni (parol, imkoniyatlar) bajarib bo'lsin.
    const timer = setTimeout(() => syncPersonToWatch(profile, goals), 1500);
    return () => clearTimeout(timer);
  }, [ready, profile, goals]);
}
