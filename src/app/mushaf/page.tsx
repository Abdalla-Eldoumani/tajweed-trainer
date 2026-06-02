import { MushafIndex } from "@/components/mushaf/MushafIndex";
import { getChaptersIndex } from "@/lib/quran-api";

export const metadata = {
  title: "Mushaf | Tajweed Trainer",
};

export const revalidate = 604800; // 7 days (in seconds)

export default async function MushafIndexPage() {
  const surahs = await getChaptersIndex();
  return <MushafIndex surahs={surahs} />;
}
