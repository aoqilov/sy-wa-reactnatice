/** @type {import('tailwindcss').Config} */

// Qiymatlar global.css dagi CSS o'zgaruvchilaridan olinadi (light va dark o'sha yerda).
const v = (name) => `var(--${name})`;
const status = (name) => ({ DEFAULT: v(name), soft: v(`${name}-soft`) });

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class": tema ilova sozlamasidan qo'lda almashadi (colorScheme.set). "media" bo'lsa web'da NativeWind
  // "Cannot manually set color scheme" xatosini beradi. Telefonda global.css dagi @media (prefers-color-scheme)
  // baribir ilova tanlagan temaga qarab ishlaydi.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: v("primary"), dark: v("primary-dark"), soft: v("primary-soft") },
        background: v("background"),
        surface: v("surface"),
        "surface-alt": v("surface-alt"),
        border: v("border"),
        foreground: v("foreground"),
        muted: v("muted"),
        subtle: v("subtle"),
        success: status("success"),
        warning: status("warning"),
        danger: status("danger"),
        info: status("info"),
        neutral: status("neutral"),
      },
    },
  },
  plugins: [],
};
