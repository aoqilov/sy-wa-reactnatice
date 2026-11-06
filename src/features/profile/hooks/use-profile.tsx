import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { clearProfile, loadProfile, Profile, saveProfile } from "../api/profile-storage";

type ProfileContextValue = {
  profile: Profile | null; // null — foydalanuvchi hali /login'dan o'tmagan
  loading: boolean; // saqlangan ma'lumot xotiradan o'qilguncha true
  save: (profile: Profile) => Promise<void>;
  clear: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Profil butun ilova uchun bitta joyda turadi: root layout (kirish/chiqish qarori),
// login, profil va tahrirlash ekrani — hammasi bir xil holatni ko'radi.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ilova ochilganda bir marta: xotirada profil bo'lsa o'qib olamiz.
  useEffect(() => {
    let active = true;
    loadProfile()
      .then((stored) => {
        if (active) setProfile(stored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async (next: Profile) => {
    await saveProfile(next); // avval xotiraga yozamiz — yozilmasa holat ham o'zgarmaydi
    setProfile(next);
  }, []);

  const clear = useCallback(async () => {
    await clearProfile();
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ profile, loading, save, clear }), [profile, loading, save, clear]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile faqat <ProfileProvider> ichida ishlaydi");
  return ctx;
}
