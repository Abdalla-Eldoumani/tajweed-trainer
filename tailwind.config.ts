import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#165E2A",
          light: "#4CAF50",
          weak: "#2E7D44",
        },
        accent: "#D4A574",
        gold: {
          DEFAULT: "#B68A2E",
          light: "#D8BE86",
          dark: "#8B7332",
          soft: "#D8BE86",
        },
        cream: {
          DEFAULT: "#F7F3EA",
          dark: "#EFE8D8",
        },
        bg: {
          DEFAULT: "#F7F3EA",
          card: "#FFFFFF",
          subtle: "#EFE8D8",
          dark: "#0B1020",
          "card-dark": "#141A2C",
        },
        text: {
          DEFAULT: "#1A1F2E",
          muted: "#5B6472",
          dark: "#ECEFF6",
        },
        tajweed: {
          // Only text-tajweed-qalqalah is consumed (the qalqalah lesson letter).
          // This is a MANUAL MIRROR of the active "new" scheme value for `qalaqah`
          // in src/lib/tajweed-colors.ts; it does NOT auto-track SCHEME, so if you
          // flip SCHEME to "classic" update this hex too (classic qalaqah = #DD0008).
          // The mushaf and legend read colors from CSS variables and the map, not
          // from Tailwind tokens, so no other tajweed token belongs here.
          qalqalah: "#009EE6",
        },
      },
      fontFamily: {
        quran: ['"Amiri Quran"', '"Scheherazade New"', "serif"],
        arabic: ["Amiri", "serif"],
        heading: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "arabic-sm": ["clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)", { lineHeight: "2" }],
        "arabic-md": ["clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem)", { lineHeight: "2" }],
        "arabic-lg": ["clamp(1.625rem, 1.4rem + 0.7vw, 2rem)", { lineHeight: "2" }],
        "arabic-xl": ["clamp(1.875rem, 1.5rem + 1vw, 2.5rem)", { lineHeight: "2" }],
      },
    },
  },
  plugins: [],
};

export default config;
