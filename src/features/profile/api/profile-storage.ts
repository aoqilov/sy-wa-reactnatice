import { getJSON, removeItem, setJSON } from "@/shared/storage/storage";

export type Gender = "male" | "female";

export type Profile = {
  firstName: string;
  lastName: string;
  birthYear: number; // yoshni shundan hisoblaymiz (yoshning o'zini saqlamaymiz, u har yili o'zgaradi)
  gender: Gender;
  heightCm: number;
  weightKg: number;
};

const PROFILE_KEY = "profile";

// Hozircha ma'lumot faqat shu qurilmada (AsyncStorage). Keyin backend qo'shilsa, faqat shu 3 funksiya o'zgaradi.
export function loadProfile() {
  return getJSON<Profile>(PROFILE_KEY);
}

export function saveProfile(profile: Profile) {
  return setJSON(PROFILE_KEY, profile);
}

export function clearProfile() {
  return removeItem(PROFILE_KEY);
}
