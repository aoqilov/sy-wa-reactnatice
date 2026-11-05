export type Profile = {
  id: string;
  name: string;
  username: string;
  followers: number;
};

// Hozircha soxta (mock) so'rov. Keyin fetch/axios bilan almashtiriladi.
export async function getProfile(): Promise<Profile> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { id: "1", name: "Ali Valiyev", username: "@ali", followers: 1240 };
}
