import { useEffect, useMemo, useState } from "react";

import { loadStepDays, subscribeStepHistory } from "@/shared/watch/step-history";

import { loadCachedToday, type TodayActivity } from "../api/activity";
import { loadStepHistory, type StepDay, withToday } from "../api/step-history";

/**
 * Kunlar bo'yicha qadamlar (yangisi birinchi). Saqlangani History sinxronidan keladi (soatning 5 daqiqalik ma'lumoti),
 * bugungi kun `today` (jonli `readSportStep`) yoki berilmasa keshdagi bugungi qiymat bilan to'ldiriladi.
 * Soatdan o'zi o'qimaydi: jonli qiymatni chaqiruvchi beradi (Home va qadam sahifasi `useTodayActivity` bilan).
 */
export function useStepHistory(today?: TodayActivity | null) {
  const [days, setDays] = useState<StepDay[] | null>(null);
  const [cached, setCached] = useState<TodayActivity | null>(null);

  useEffect(() => {
    let active = true;
    void loadStepHistory().then((d) => active && setDays(d));
    void loadCachedToday().then((c) => active && setCached(c));
    const off = subscribeStepHistory(() => {
      void loadStepDays().then((d) => active && setDays([...d]));
    });
    return () => {
      active = false;
      off();
    };
  }, []);

  const live = today ?? cached;
  return useMemo(() => (days ? withToday(days, live) : null), [days, live]);
}
