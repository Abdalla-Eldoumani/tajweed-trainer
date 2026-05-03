import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Due | Tajweed Trainer",
  description: "Spaced-repetition review of questions you've answered before.",
};

export default function ReviewPracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
