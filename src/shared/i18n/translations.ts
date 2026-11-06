import type { Language } from "@/shared/settings/settings";

// Kalitlar `uz` dan olinadi. `ru` va `uz-Cyrl` ham xuddi shu kalitlarga ega bo'lishi shart —
// biror tarjima unutilsa, TypeScript xato beradi.
// Matn ichidagi {nom} — joyiga qiymat qo'yiladi: t("key", { nom: 5 }).
const uz = {
  // Tab bar
  "tabs.home": "Bosh sahifa",
  "tabs.history": "Tarix",
  "tabs.myplan": "Rejam",
  "tabs.profile": "Profil",

  // Login
  "login.title": "Xush kelibsiz",
  "login.subtitle": "O'zingiz haqingizda qisqacha ma'lumot kiriting. Ma'lumotlar faqat shu qurilmada saqlanadi.",
  "login.submit": "Davom etish",

  // Forma
  "form.firstName": "Ism",
  "form.lastName": "Familiya",
  "form.birthYear": "Tug'ilgan yil",
  "form.gender": "Jins",
  "form.height": "Bo'yi (sm)",
  "form.weight": "Vazni (kg)",
  "form.save": "Saqlash",
  "form.saveError": "Ma'lumotni saqlab bo'lmadi. Qayta urinib ko'ring.",
  "gender.male": "Erkak",
  "gender.female": "Ayol",

  // Forma xatolari
  "error.firstName": "Ismingizni kiriting",
  "error.lastName": "Familiyangizni kiriting",
  "error.birthYear.required": "Tug'ilgan yilingizni kiriting",
  "error.birthYear.range": "Yil {min} dan {max} gacha bo'lishi kerak",
  "error.gender": "Jinsingizni tanlang",
  "error.height.required": "Bo'yingizni kiriting",
  "error.height.range": "Bo'y 50 dan 250 sm gacha bo'lishi kerak",
  "error.weight.required": "Vazningizni kiriting",
  "error.weight.range": "Vazn 20 dan 300 kg gacha bo'lishi kerak",

  // Profil sahifasi
  "profile.ageGender": "{age} yosh · {gender}",
  "profile.born": "Tug'ilgan yil",
  "profile.height": "Bo'y",
  "profile.weight": "Vazn",
  "profile.unit.cm": "sm",
  "profile.unit.kg": "kg",
  "profile.settings": "Sozlamalar",
  "profile.language": "Tizim tili",
  "profile.uiSize": "Interfeys kattaligi",
  "profile.theme": "Mavzu",
  "profile.edit": "Profilni tahrirlash",
  "profile.logout": "Chiqish",
  "profile.uiPreview": "UI namunalari",

  // Mavzu va o'lchamlar
  "theme.system": "Tizim",
  "theme.light": "Yorug'",
  "theme.dark": "Qorong'u",
  "size.small": "Kichik",
  "size.medium": "O'rtacha",
  "size.large": "Katta",
  "size.xlarge": "Juda katta",
};

export type TranslationKey = keyof typeof uz;
type Dictionary = Record<TranslationKey, string>;

const ru: Dictionary = {
  "tabs.home": "Главная",
  "tabs.history": "История",
  "tabs.myplan": "Мой план",
  "tabs.profile": "Профиль",

  "login.title": "Добро пожаловать",
  "login.subtitle": "Расскажите немного о себе. Данные хранятся только на этом устройстве.",
  "login.submit": "Продолжить",

  "form.firstName": "Имя",
  "form.lastName": "Фамилия",
  "form.birthYear": "Год рождения",
  "form.gender": "Пол",
  "form.height": "Рост (см)",
  "form.weight": "Вес (кг)",
  "form.save": "Сохранить",
  "form.saveError": "Не удалось сохранить данные. Попробуйте ещё раз.",
  "gender.male": "Мужской",
  "gender.female": "Женский",

  "error.firstName": "Введите имя",
  "error.lastName": "Введите фамилию",
  "error.birthYear.required": "Введите год рождения",
  "error.birthYear.range": "Год должен быть от {min} до {max}",
  "error.gender": "Выберите пол",
  "error.height.required": "Введите рост",
  "error.height.range": "Рост должен быть от 50 до 250 см",
  "error.weight.required": "Введите вес",
  "error.weight.range": "Вес должен быть от 20 до 300 кг",

  // Русском языке возраст склоняется (21 год, 22 года, 25 лет), поэтому пишем "Возраст: N".
  "profile.ageGender": "Возраст: {age} · {gender}",
  "profile.born": "Год рождения",
  "profile.height": "Рост",
  "profile.weight": "Вес",
  "profile.unit.cm": "см",
  "profile.unit.kg": "кг",
  "profile.settings": "Настройки",
  "profile.language": "Язык системы",
  "profile.uiSize": "Размер интерфейса",
  "profile.theme": "Тема",
  "profile.edit": "Редактировать профиль",
  "profile.logout": "Выйти",
  "profile.uiPreview": "Примеры UI",

  "theme.system": "Системная",
  "theme.light": "Светлая",
  "theme.dark": "Тёмная",
  "size.small": "Маленький",
  "size.medium": "Средний",
  "size.large": "Большой",
  "size.xlarge": "Очень большой",
};

const uzCyrl: Dictionary = {
  "tabs.home": "Бош саҳифа",
  "tabs.history": "Тарих",
  "tabs.myplan": "Режам",
  "tabs.profile": "Профил",

  "login.title": "Хуш келибсиз",
  "login.subtitle": "Ўзингиз ҳақингизда қисқача маълумот киритинг. Маълумотлар фақат шу қурилмада сақланади.",
  "login.submit": "Давом этиш",

  "form.firstName": "Исм",
  "form.lastName": "Фамилия",
  "form.birthYear": "Туғилган йил",
  "form.gender": "Жинс",
  "form.height": "Бўйи (см)",
  "form.weight": "Вазни (кг)",
  "form.save": "Сақлаш",
  "form.saveError": "Маълумотни сақлаб бўлмади. Қайта уриниб кўринг.",
  "gender.male": "Эркак",
  "gender.female": "Аёл",

  "error.firstName": "Исмингизни киритинг",
  "error.lastName": "Фамилиянгизни киритинг",
  "error.birthYear.required": "Туғилган йилингизни киритинг",
  "error.birthYear.range": "Йил {min} дан {max} гача бўлиши керак",
  "error.gender": "Жинсингизни танланг",
  "error.height.required": "Бўйингизни киритинг",
  "error.height.range": "Бўй 50 дан 250 см гача бўлиши керак",
  "error.weight.required": "Вазнингизни киритинг",
  "error.weight.range": "Вазн 20 дан 300 кг гача бўлиши керак",

  "profile.ageGender": "{age} ёш · {gender}",
  "profile.born": "Туғилган йил",
  "profile.height": "Бўй",
  "profile.weight": "Вазн",
  "profile.unit.cm": "см",
  "profile.unit.kg": "кг",
  "profile.settings": "Созламалар",
  "profile.language": "Тизим тили",
  "profile.uiSize": "Интерфейс катталиги",
  "profile.theme": "Мавзу",
  "profile.edit": "Профилни таҳрирлаш",
  "profile.logout": "Чиқиш",
  "profile.uiPreview": "UI намуналари",

  "theme.system": "Тизим",
  "theme.light": "Ёруғ",
  "theme.dark": "Қоронғи",
  "size.small": "Кичик",
  "size.medium": "Ўртача",
  "size.large": "Катта",
  "size.xlarge": "Жуда катта",
};

export const translations: Record<Language, Dictionary> = { uz, ru, "uz-Cyrl": uzCyrl };

// Til tanlash tugmalarida har bir til o'z nomi bilan yoziladi (til almashganda ham o'zgarmaydi).
export const LANGUAGE_NAME: Record<Language, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  "uz-Cyrl": "Ўзбекча",
};
