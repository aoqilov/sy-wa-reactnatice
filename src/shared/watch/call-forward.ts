import { useCallback, useEffect, useState } from "react";
import { AppState, type Permission, PermissionsAndroid, Platform } from "react-native";

import watchModule, { type CallForwardStatus } from "../../../modules/veepoo-watch";

// Telefon qo'ng'iroqlarini soatga uzatish: kalit native qismda saqlanadi (CallBridge.kt), ruxsatlar shu yerda so'raladi.
// Asosiy ruxsat — READ_PHONE_STATE (qo'ng'iroq kelganini bilish). Qolganlari ixtiyoriy: raqam (qo'ng'iroqlar jurnali),
// kontakt nomi, soatdan rad etish/javob berish. Ular rad etilsa ham uzatish ishlaydi, faqat imkoniyati kamroq.

export type CallForwardResult = { ok: true } | { ok: false; reason: "denied" | "blocked" | "unavailable" };

const EMPTY: CallForwardStatus = {
  enabled: false,
  listening: false,
  phoneState: false,
  callLog: false,
  contacts: false,
  answerCalls: false,
};

/** O'rnatilgan APK bu funksiyani biladimi (eski build'da yo'q). */
export function callForwardAvailable(): boolean {
  return Platform.OS === "android" && !!watchModule && typeof watchModule.setCallForwarding === "function";
}

function readStatus(): CallForwardStatus {
  if (!callForwardAvailable() || !watchModule) return EMPTY;
  try {
    return watchModule.getCallForwardStatus();
  } catch {
    return EMPTY;
  }
}

async function requestPermissions(): Promise<"granted" | "denied" | "blocked"> {
  const P = PermissionsAndroid.PERMISSIONS;
  const required = P.READ_PHONE_STATE;
  const optional: Permission[] = [P.READ_CALL_LOG, P.READ_CONTACTS];
  if ((Platform.Version as number) >= 26) optional.push(P.ANSWER_PHONE_CALLS);
  const result = await PermissionsAndroid.requestMultiple([required, ...optional]);
  if (result[required] === PermissionsAndroid.RESULTS.GRANTED) return "granted";
  return result[required] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
}

export async function setCallForwarding(on: boolean): Promise<CallForwardResult> {
  const watch = watchModule;
  if (!callForwardAvailable() || !watch) return { ok: false, reason: "unavailable" };
  if (on) {
    const perm = await requestPermissions();
    if (perm !== "granted") return { ok: false, reason: perm };
  }
  watch.setCallForwarding(on);
  return { ok: true };
}

/** Kalit va ruxsatlar holati. Ilova oldinga chiqqanda yangilanadi (ruxsat sozlamalardan berilgan bo'lishi mumkin). */
export function useCallForward() {
  const [status, setStatus] = useState<CallForwardStatus>(readStatus);
  const refresh = useCallback(() => setStatus(readStatus()), []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    const events = watchModule?.addListener("event", (e) => {
      if (e.type === "callForward") refresh();
    });
    return () => {
      sub.remove();
      events?.remove();
    };
  }, [refresh]);

  return { status, refresh, available: callForwardAvailable() };
}
