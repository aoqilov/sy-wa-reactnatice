import { useEffect, useState } from "react";

import { getProfile, Profile } from "../api/get-profile";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading };
}
