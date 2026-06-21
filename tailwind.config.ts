import type { Config } from "tailwindcss";

const config: Config = {
  // The dark variant matches all three dark grounds, not a single class, so
  // every existing `dark:` utility applies on night, sepia, and mihrab without
  // rewriting the component tree. Each selector is the ancestor form (the
  // attribute lives on <html>); the two light themes (vellum, pearl) do not
  // match. CSS-var consumers flip per theme through the [data-theme] blocks.
  darkMode: [
    "variant",
    [
      '[data-theme="night"] &',
      '[data-theme="sepia"] &',
      '[data-theme="mihrab"] &',
    ],
  ],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Manuscript palette: lapis ink for interaction, gold leaf for
        // ornament, vellum ivory for ground. Light values are duplicated as
        // CSS variables in globals.css for the var-driven surfaces (frames,
        // ornaments, tajweed); dark mode flips through the .dark variable
        // block plus explicit dark: utilities, matching the existing pattern.
        primary: {
          DEFAULT: "#1E4279",
          light: "#D9B45C",
          weak: "#2A5694",
        },
        "on-primary": "#FFFFFF",
        ink: "#101726",
        accent: "#B0552F",
        gold: {
          DEFAULT: "#D4A843",
          light: "#E3C77F",
          dark: "#8F6F1E",
          soft: "#E3C77F",
          deep: "#B8902F",
        },
        cream: {
          DEFAULT: "#F5F1E8",
          dark: "#ECE5D3",
        },
        bg: {
          DEFAULT: "#F5F1E8",
          card: "#FCFAF3",
          subtle: "#ECE5D3",
          "subtle-dark": "#1A2336",
          dark: "#0A0F1C",
          "card-dark": "#121A2E",
        },
        text: {
          DEFAULT: "#131B2E",
          muted: "#555F77",
          dark: "#EDEAE0",
        },
        border: "var(--border)",
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
        quran: ["var(--font-quran)", '"Amiri Quran"', '"Scheherazade New"', "serif"],
        arabic: ["var(--font-amiri)", "Amiri", "serif"],
        heading: ["var(--font-heading)", "Spectral", "serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", '"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "arabic-sm": ["clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)", { lineHeight: "2" }],
        "arabic-md": ["clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem)", { lineHeight: "2" }],
        "arabic-lg": ["clamp(1.625rem, 1.4rem + 0.7vw, 2rem)", { lineHeight: "2" }],
        "arabic-xl": ["clamp(1.875rem, 1.5rem + 1vw, 2.5rem)", { lineHeight: "2" }],
        // Named Latin UI type scale (size + line-height; weight and face are
        // applied at use sites). Weight: 600 headings, 500 micro/eyebrow, 400
        // body. Face: Spectral for display/h1/h2/h3 (font-heading), Inter for
        // body/small/micro (font-body). The @layer base h1..h6 rule already
        // sets Spectral and -0.01em on bare headings, so an element keeps the
        // right face without the named class. These names let SectionHeading
        // and pages pick a step without re-deriving line-height.
        display: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        h1: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h2: ["1.5rem", { lineHeight: "1.25" }],
        h3: ["1.25rem", { lineHeight: "1.3" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.6" }],
        small: ["0.875rem", { lineHeight: "1.5" }],
        micro: ["0.75rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};

export default config;
