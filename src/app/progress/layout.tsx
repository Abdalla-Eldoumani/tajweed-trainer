import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress | Tajweed Trainer",
  description: "Track your tajweed learning progress, quiz scores, and practice streaks.",
};

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
