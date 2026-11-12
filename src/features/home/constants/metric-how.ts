import type { MetricKey } from "../api/get-metrics";

export type HowSection = { heading: string; text: string };

// "Soat qanday o'lchaydi" tabi: soat ma'lumotni qanday oladi va ilova u bilan nima qiladi.
// Manba: synapse-soat veb ilovasidagi explain.ts (watch-rn.vercel.app). "Ilova nima qiladi" qismlari shu ilovaga
// moslab qayta yozilgan (docs/measurements.md, src/shared/watch/measure.ts). Baholash chegaralari "Standart" tabida.
// HRV, stress va tana tarkibi uchun matn yangi yozilgan. Tibbiy tashxis emas.

const NOTE: HowSection = {
  heading: "Hisoblash kim tomonidan",
  text: "Signalni qayta ishlash va yakuniy qiymatni hisoblash soatning ichki dasturida bajariladi (Veepoo SDK). Uning aniq algoritmi ochiq emas, shuning uchun bu yerda umumiy ishlash tamoyili va ilovaning o'z qadamlari yozilgan.",
};

const DISCLAIMER: HowSection = {
  heading: "Muhim",
  text: "Bu tibbiy asbob emas. Natija ma'lumot uchun va tashxis qo'yish yoki davolashni o'zgartirish uchun asos bo'la olmaydi. O'zingizni yomon his qilsangiz, shifokorga murojaat qiling.",
};

const PPG =
  "Soat orqasidagi yorug'lik diodlari (LED) teriga nur yuboradi, fotodiod qaytgan nurni o'qiydi. Har yurak urishida bilakdagi qon hajmi o'zgaradi va qaytgan nur biroz o'zgaradi. Bu usul fotopletizmografiya (PPG) deyiladi.";

export const METRIC_HOW: Record<MetricKey, HowSection[]> = {
  pulse: [
    {
      heading: "Soat qanday o'lchaydi",
      text: `${PPG} Pulsatsiyalar sanalib, bir daqiqadagi zarbalarga (zarba/daq) aylantiriladi.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Soat 30 soniya davomida qiymatlarni oqim bilan yuboradi, joriy puls doira ichida ko'rinib turadi. Ilova 30–250 oralig'idagi qiymatlarni oladi va oxirgi 8 tasining medianasini natija qiladi (o'lchov boshidagi beqaror qiymatlar va bitta tasodifiy sakrash natijani buzmasligi uchun).",
    },
    {
      heading: "Aniqlikka ta'sir qiladi",
      text: "Qo'l harakati, bo'sh taqilgan tasma, sovuq qo'l yoki tatuirovka signalni buzishi mumkin. O'lchash paytida qimirlamang va soat bilakka zich tursin. Sport bilan shug'ullanadiganlarda tinch puls pastroq bo'lishi tabiiy.",
    },
    NOTE,
    DISCLAIMER,
  ],
  oxygen: [
    {
      heading: "Soat qanday o'lchaydi",
      text: `${PPG} Kislorod uchun ikki xil to'lqin uzunligidagi nur (qizil va infraqizil) ishlatiladi: kislorodga to'yingan va to'yinmagan gemoglobin ularni turlicha yutadi. Ikki signalning nisbatidan gemoglobinning necha foizi kislorod tashiyotgani (SpO₂) taxmin qilinadi.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Soat 30 soniya qiymat yuboradi. Ilova 70–100 % oralig'idagi qiymatlarni oladi va oxirgi 8 tasining medianasini ko'rsatadi.",
    },
    {
      heading: "Cheklov",
      text: "Bilakdan o'lchash barmoqqa qo'yiladigan tibbiy pulsoksimetrdan kamroq aniq. Past natija chiqsa, qayta o'lchab ko'ring: sovuq qo'l va harakat natijani pasaytirib ko'rsatadi.",
    },
    NOTE,
    DISCLAIMER,
  ],
  pressurePump: [
    {
      heading: "Soat qanday o'lchaydi",
      text: "Tasmadagi havo yostiqchasi (mini nasos) bilakni siqadi, keyin havo asta chiqariladi. Bu paytda arteriyadagi pulsatsiyalar bosim datchigi bilan o'qiladi. Manjetli apparatlarda keng qo'llaniladigan osillometrik usul shunga asoslanadi: pulsatsiya amplitudasidan sistolik (yuqori) va diastolik (pastki) bosim aniqlanadi.",
    },
    {
      heading: "Ilova nima qiladi",
      text: "Ilova soatga o'lchash buyrug'ini yuboradi: soat ekranida 3 soniya sanab, yostiqchani to'ldiradi. O'lchov taxminan 45 soniya davom etadi, yostiqchadagi bosim doira ichida jonli ko'rinadi. Hisoblashni soatning o'zi qiladi, ilova natijani tekshirib saqlaydi. Agar soat ilovadan boshlashga javob bermasa, bosimni soatning o'zida o'lchaysiz va ilova natijani soat xotirasidan o'qib oladi.",
    },
    {
      heading: "To'g'ri o'lchash",
      text: "Soatni yurak balandligida tuting, o'tirib, orqani suyab, qimirlamang va gapirmang. Soat qo'l holati va harakatni ichidagi harakat datchigi bilan tekshiradi va ogohlantiradi, lekin o'lchovni oxiriga yetkazadi. Soat bilakka juda bo'sh yoki juda qattiq taqilgan bo'lsa, natija xato chiqadi.",
    },
    NOTE,
    DISCLAIMER,
  ],
  temperature: [
    {
      heading: "Soat qanday o'lchaydi",
      text: "Soat orqasidagi harorat datchigi bilak terisining haroratini o'lchaydi. Teri harorati tana ichki haroratidan past bo'ladi, shuning uchun soat tana haroratini teri harorati asosida model bilan taxmin qiladi.",
    },
    {
      heading: "Ilova nima qiladi",
      text: "Soat o'lchash progressini yuboradi va 100 % bo'lganda o'zi yakunlaydi (ilova ko'pi bilan 2 daqiqa kutadi). Ilova 30–43 °C oralig'idagi oxirgi qiymatni 0,1 aniqlik bilan qabul qiladi.",
    },
    {
      heading: "Aniqlikka ta'sir qiladi",
      text: "Sovuq yoki issiq xona, yaqinda qilingan sport, qo'lning tashqarida turishi, ho'l teri natijani o'zgartiradi. Termometr o'rnini bosmaydi.",
    },
    NOTE,
    DISCLAIMER,
  ],
  ecg: [
    {
      heading: "Soat qanday o'lchaydi",
      text: "Soat orqasidagi elektrod bilak terisiga, korpusdagi metall elektrod esa boshqa qo'l barmog'iga tegadi. Shunda zanjir yopilib, yurakning elektr signali (mV) yozib olinadi. Bu bitta kanalli (bitta ulanishli) EKG: shifoxonadagi 12 ulanishli EKG ning o'rnini bosmaydi.",
    },
    {
      heading: "Ilova nima qiladi",
      text: "To'lqin o'lchash paytida jonli chiziladi. Soat yozuvni o'zi tugatguncha kutiladi (ko'pi bilan 3 daqiqa). 15 soniya ichida barmoq elektrodga tegmasa yoki barmoq ko'p marta ko'tarilsa, o'lchov to'xtaydi. Natijada puls, HRV, QT/QTc va nafas soni ko'rsatiladi, to'liq yozuv hisobot bilan Tarix sahifasida saqlanadi.",
    },
    {
      heading: "Atamalar",
      text: "HRV: bir urishdan keyingisigacha vaqt qanchalik o'zgarishi. QTc: yurakning qisqarib bo'shashish vaqti, puls bo'yicha tuzatilgan. Bu qiymatlar faqat taxminiy.",
    },
    {
      heading: "To'g'ri o'lchash",
      text: "Qo'llarni stolga qo'ying, qimirlamang, gapirmang. Quruq teri va elektrodga yengil bosish yaxshi signal beradi.",
    },
    NOTE,
    DISCLAIMER,
  ],
  sugar: [
    {
      heading: "Muhim ogohlantirish",
      text: "Bu o'lchov qon olinmasdan, bilakdan optik usulda taxmin qilinadi va juda kam ishonchli. Uni diabetni nazorat qilish, insulin yoki dori dozasini tanlash uchun ishlatmang. Faqat glyukometr yoki laboratoriya natijasi ishonchli.",
    },
    {
      heading: "Soat qanday o'lchaydi",
      text: `${PPG} Qon shakari terini teshmasdan, nurning qon va to'qimadan o'tishidagi o'zgarishlarga algoritm qo'llab taxmin qilinadi. Bunday usul invaziv bo'lmagan taxmin deyiladi: u glyukometrning o'rnini bosa olmaydi.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Soat taxminan bir daqiqa o'lchaydi va 0–100 % progress yuboradi, oxirida qiymatni mmol/L da va o'zining xavf bahosini beradi. Ilova 1–35 mmol/L dan tashqaridagi qiymatni qabul qilmaydi. Natija yonida \"taxminiy\" belgisi turadi.",
    },
    {
      heading: "Aniqlikka ta'sir qiladi",
      text: "Ovqatlanish vaqti, qo'lning harorati, harakat, tasmaning zichligi va shaxsga moslash (kalibrlash) natijani o'zgartiradi. Glyukometr bilan kalibrlash bu ilovada hali yo'q.",
    },
    NOTE,
    DISCLAIMER,
  ],
  blood: [
    {
      heading: "Soat qanday o'lchaydi",
      text: `Qon olinmaydi. ${PPG} Soat optik signalni algoritm bilan qayta ishlab, lipidlar (umumiy xolesterin, triglitseridlar, HDL, LDL) va siydik kislotasini taxmin qiladi. Bu invaziv bo'lmagan usul: natija taxmin, laboratoriya o'lchovi emas.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Soat taxminan bir daqiqa o'lchaydi va 0–100 % progress yuboradi. Oxirida xolesterin, TG, HDL, LDL (mmol/L) va siydik kislotasi (µmol/L) keladi. Ilova mantiqsiz qiymatlarni (juda kichik yoki juda katta) qabul qilmaydi va beshala ko'rsatkichni bitta kartada me'yori bilan ko'rsatadi.",
    },
    {
      heading: "Atamalar",
      text: "HDL — \"yaxshi\" xolesterin, LDL — \"yomon\" xolesterin, TG — triglitseridlar (qondagi yog'lar). Siydik kislotasi yuqori bo'lsa, bo'g'imlar (podagra) bilan bog'liq bo'lishi mumkin.",
    },
    {
      heading: "Cheklov",
      text: "Bu eng kam ishonchli o'lchovlardan biri. Qaror qilishdan oldin laboratoriya tahlili bilan taqqoslang. Soat bilakda zich tursin va o'lchash paytida qimirlamang.",
    },
    NOTE,
    DISCLAIMER,
  ],
  hrv: [
    {
      heading: "Soat qanday o'lchaydi",
      text: `${PPG} Soat har bir yurak urishining vaqtini aniqlaydi va ketma-ket urishlar orasidagi vaqt (millisekundlarda) qanchalik o'zgarishini hisoblaydi. Bu yurak urishi o'zgaruvchanligi (HRV) deyiladi.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Bu soatda HRV ni ilovadan boshlab bo'lmaydi: uni soat menyusidan o'lchaysiz. Ilova shu paytda soat xotirasini har 5 soniyada tekshirib turadi va yangi yozuv paydo bo'lishi bilan natijani oladi. O'lchov taxminan bir daqiqa davom etadi.",
    },
    {
      heading: "Atamalar",
      text: "HRV yuqoriroq bo'lsa, odatda organizm dam olgan va tiklangan bo'ladi; charchoq, stress, kasallik yoki kam uyquda u pasayadi. HRV har bir odamda turlicha, shuning uchun uni boshqalar bilan emas, o'zingizning oldingi natijalaringiz bilan solishtiring.",
    },
    {
      heading: "Aniqlikka ta'sir qiladi",
      text: "Harakat, gaplashish, chuqur nafas olish va bo'sh taqilgan soat natijani buzadi. Har kuni bir xil vaqtda (masalan, ertalab uyg'ongach), tinch o'tirgan holda o'lchang.",
    },
    NOTE,
    DISCLAIMER,
  ],
  stress: [
    {
      heading: "Soat qanday o'lchaydi",
      text: `${PPG} Stress to'g'ridan-to'g'ri o'lchanmaydi: soat puls va yurak urishlari oralig'ining o'zgaruvchanligini (HRV) tahlil qilib, asab tizimining zo'riqish darajasini 0 dan 100 gacha ball bilan baholaydi.`,
    },
    {
      heading: "Ilova nima qiladi",
      text: "Ilova soatga o'lchash buyrug'ini yuboradi, soat 0–100 % progress yuboradi va oxirida ballni beradi. Hisoblashni soatning o'zi qiladi.",
    },
    {
      heading: "Atamalar",
      text: "Ball qancha yuqori bo'lsa, organizm shuncha zo'riqqan. Bu ruhiy holat tashxisi emas: jismoniy yuklama, kofe, kasallik yoki kam uyqu ham ballni oshiradi.",
    },
    {
      heading: "Aniqlikka ta'sir qiladi",
      text: "O'lchashdan oldin bir necha daqiqa tinch o'tiring. Harakat, gaplashish va yaqinda qilingan sport natijani oshirib ko'rsatadi.",
    },
    NOTE,
    DISCLAIMER,
  ],
  bodyComp: [
    {
      heading: "Soat qanday o'lchaydi",
      text: "Soat elektrodlari orqali tanadan juda kuchsiz, sezilmaydigan tok o'tkaziladi va uning qarshiligi o'lchanadi. Yog' to'qimasi tokni yomon, suv va mushak esa yaxshi o'tkazadi. Bu usul bioimpedans tahlili (BIA) deyiladi: qarshilik bo'yicha yog', mushak va suv ulushi taxmin qilinadi.",
    },
    {
      heading: "Ilova nima qiladi",
      text: "O'lchash paytida boshqa qo'l barmog'i soatning metall qismiga tegib turishi kerak. Ilova soatga buyruq yuboradi va soat hisoblagan natijani oladi. Hisob bo'y, vazn, yosh va jinsga tayanadi: hozircha soatda H Band ilovasi orqali kiritilgan ma'lumotlar ishlatiladi.",
    },
    {
      heading: "Cheklov",
      text: "Bilakdagi bioimpedans tarozi yoki tibbiy BIA asbobidan kamroq aniq. Suv ichish, ovqatlanish, terlash va sport natijani o'zgartiradi: har gal bir xil sharoitda (masalan, ertalab och qoringa) o'lchang. Yurak stimulyatori (kardiostimulyator) bo'lsa yoki homiladorlikda bu o'lchovdan foydalanmang.",
    },
    NOTE,
    DISCLAIMER,
  ],
};
