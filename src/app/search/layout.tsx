import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Tajweed Trainer",
  description: "Search across surahs, modules, rules, and Waqf symbols.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
