import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mixed Review | Tajweed Trainer",
  description: "Mixed-module practice quiz drawn from every tajweed topic.",
};

export default function MixedPracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
