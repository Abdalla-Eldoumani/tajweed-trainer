import { MushafIndex } from "@/components/mushaf/MushafIndex";
import { getChaptersIndex } from "@/lib/quran-api";

export const metadata = {
  title: "Mushaf | Tajweed Trainer",
};

export const revalidate = 60 * 60 * 24 * 7; // 7 days

export default async function MushafIndexPage() {
  const surahs = await getChaptersIndex();
  return <MushafIndex surahs={surahs} />;
}
