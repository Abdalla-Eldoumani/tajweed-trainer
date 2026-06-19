import { MushafBookmarks } from "@/components/mushaf/MushafBookmarks";
import { getChaptersIndex } from "@/lib/quran-api";

export const metadata = {
  title: "Bookmarked verses | Tajweed Trainer",
};

export const revalidate = 604800; // 7 days (in seconds)

export default async function MushafBookmarksPage() {
  // Surah headers resolved server-side (bundled fallback) so the client view can
  // label each verse without a round-trip, mirroring the index route.
  const surahs = await getChaptersIndex();
  return <MushafBookmarks surahs={surahs} />;
}
