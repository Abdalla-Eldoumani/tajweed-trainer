import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tajweed Trainer",
    short_name: "Tajweed",
    description:
      "Learn Tajweed rules for proper Quran recitation through interactive lessons, color-coded text, and audio examples.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F1E8",
    theme_color: "#0E1626",
    lang: "en",
    dir: "ltr",
    categories: ["education", "books", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
