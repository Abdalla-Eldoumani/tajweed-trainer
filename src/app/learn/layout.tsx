import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Tajweed | Tajweed Trainer",
  description: "Interactive tajweed learning modules covering articulation points, noon sakinah, meem sakinah, qalqalah, madd, and more.",
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
