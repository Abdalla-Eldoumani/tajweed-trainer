import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice | Tajweed Trainer",
  description: "Test your tajweed knowledge by identifying rules in Quranic examples.",
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
