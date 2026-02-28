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
        bg: {
          DEFAULT: "#FAFAF5",
          card: "#FFFFFF",
          dark: "#1A1A2E",
          "card-dark": "#2D2D44",
        },
        text: {
          DEFAULT: "#1A1A2E",
          muted: "#6B7280",
          dark: "#F5F5F5",
        },
        tajweed: {
          ghunnah: "#169200",
          ikhfaa: "#D98000",
          "idgham-ghunnah": "#9400A8",
          "idgham-no-ghunnah": "#0057D9",
          iqlab: "#26A69A",
          qalqalah: "#A30000",
          "madd-normal": "#E06050",
          "madd-obligatory": "#D50000",
          "madd-permissible": "#E8567F",
          "laam-shamsiyah": "#707070",
          silent: "#AAAAAA",
          "ikhfaa-shafawi": "#D98000",
          "idgham-shafawi": "#9400A8",
          "idgham-mutajanisayn": "#0057D9",
          "idgham-mutaqaribayn": "#0057D9",
          "ham-wasl": "#AAAAAA",
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
