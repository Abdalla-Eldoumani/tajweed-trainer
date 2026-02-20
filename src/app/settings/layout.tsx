import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Tajweed Trainer",
  description: "Customize your reciter, playback speed, font size, and display preferences.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
