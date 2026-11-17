// Faqat dev + soat moduli yo'q (Expo Go) holati: UI ustida ishlash uchun namuna kechalar. Native "sleepData" hodisasi
// shaklida yasaladi va haqiqiy o'girish (`toSegment`) orqali o'tadi, shuning uchun dekodlash ham sinaladi.
// Telefonga saqlanmaydi, release build'ga ta'sir qilmaydi.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Oddiy deterministik tasodifiy (har ochilganda bir xil kechalar). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const time = (ms: number) => {
  const d = new Date(ms);
  return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
};

/**
 * Aniq uyqu qatori (belgi = 1 daqiqa): ~90 daqiqalik sikllar — yengil → chuqur → yengil → REM, ba'zan qisqa uyg'onish.
 * Tunning boshida chuqur ko'proq, oxirida REM ko'proq (haqiqiy uyquga o'xshash).
 */
function preciseLine(minutes: number, rand: () => number): string {
  let line = "";
  let cycle = 0;
  while (line.length < minutes) {
    const late = cycle / 5;
    line += "1".repeat(10 + Math.floor(rand() * 15)); // yengil
    line += "0".repeat(Math.max(5, Math.floor((35 - late * 25) * (0.7 + rand() * 0.6)))); // chuqur
    line += "1".repeat(8 + Math.floor(rand() * 10));
    line += "2".repeat(Math.floor((10 + late * 20) * (0.7 + rand() * 0.6))); // REM
    if (rand() < 0.35) line += "4".repeat(2 + Math.floor(rand() * 6)); // uyg'onish
    cycle++;
  }
  return line.slice(0, minutes);
}

/** Oddiy uyqu qatori (belgi = 5 daqiqa): 0 yengil, 1 chuqur, 2 uyg'oq. */
function normalLine(minutes: number, rand: () => number): string {
  const n = Math.round(minutes / 5);
  let line = "";
  while (line.length < n) {
    line += "0".repeat(2 + Math.floor(rand() * 4));
    line += "1".repeat(2 + Math.floor(rand() * 4));
    if (rand() < 0.25) line += "2";
  }
  return line.slice(0, n);
}

const count = (line: string, ch: string) => line.split("").filter((c) => c === ch).length;

/** Oxirgi `nights` kecha (ba'zi kechalar tushib qolgan: soat taqilmagan). Oxirgi 5 tasi oddiy uyqu. */
export function demoSleepRecords(nights = 30): Record<string, unknown>[] {
  const rand = rng(20261116);
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const out: Record<string, unknown>[] = [];

  for (let i = 0; i < nights; i++) {
    if (i > 0 && rand() < 0.12) continue; // soat taqilmagan kecha
    const wakeDay = base - i * DAY_MS;
    const bedMin = 22 * 60 + 15 + Math.floor(rand() * 120) - 30; // ~22:00 .. 00:15
    const sleepMin = 330 + Math.floor(rand() * 170); // 5.5 .. 8.3 soat
    const down = wakeDay - DAY_MS + bedMin * 60_000;
    const up = down + sleepMin * 60_000;
    const precise = i < nights - 5;

    if (precise) {
      const line = preciseLine(sleepMin, rand);
      const deep = count(line, "0");
      const light = count(line, "1");
      const rem = count(line, "2");
      const awake = count(line, "4");
      out.push({
        down: time(down),
        up: time(up),
        all: deep + light + rem,
        deep,
        light,
        wake: Math.max(0, line.split(/4+/).length - 1),
        quality: 1 + Math.floor(rand() * 4),
        line,
        precise: true,
        pointSec: 60,
        deepScore: 60 + Math.floor(rand() * 40),
        efficiencyScore: 55 + Math.floor(rand() * 45),
        fallAsleepScore: 60 + Math.floor(rand() * 40),
        timeScore: Math.min(100, Math.round((sleepMin / 480) * 100)),
        getUpScore: Math.max(40, 100 - awake * 3),
        insomniaScore: 0,
        insomniaTimes: 0,
        firstDeepMin: 10 + Math.floor(rand() * 20),
      });
    } else {
      const line = normalLine(sleepMin, rand);
      out.push({
        down: time(down),
        up: time(up),
        all: (count(line, "0") + count(line, "1")) * 5,
        deep: count(line, "1") * 5,
        light: count(line, "0") * 5,
        wake: count(line, "2"),
        quality: 2 + Math.floor(rand() * 3),
        line,
        precise: false,
      });
    }
  }
  return out;
}
