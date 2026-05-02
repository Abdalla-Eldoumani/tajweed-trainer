import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Module Practice | Tajweed Trainer",
  description: "Practice questions filtered to a single tajweed module.",
};

export default function ModulePracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
