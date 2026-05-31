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
          DEFAULT: "#1B5E20",
          light: "#4CAF50",
        },
        accent: "#D4A574",
        gold: {
          DEFAULT: "#C5A55A",
          light: "#E8D5A3",
          dark: "#8B7332",
        },
        cream: {
          DEFAULT: "#FDF8F0",
          dark: "#F5EDE0",
        },
        bg: {
          DEFAULT: "#FDF8F0",
          card: "#FFFDF9",
          dark: "#1A1A2E",
          "card-dark": "#2D2D44",
        },
        text: {
          DEFAULT: "#1A1A2E",
          muted: "#6B7280",
          dark: "#F5F5F5",
        },
        tajweed: {
          // Only text-tajweed-qalqalah is consumed (the qalqalah lesson letter);
          // its value tracks the active scheme in src/lib/tajweed-colors.ts. The
          // mushaf and legend read colors from CSS variables and the map, not
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
