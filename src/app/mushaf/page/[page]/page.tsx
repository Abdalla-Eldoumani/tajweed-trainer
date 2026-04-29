import { notFound } from "next/navigation";
import { MushafReader } from "@/components/mushaf/MushafReader";
import { getTajweedPage, getChaptersIndex, getBundledChaptersIndex } from "@/lib/quran-api";

interface MushafPageRouteProps {
  params: { page: string };
}

const TOTAL_PAGES = 604;

export async function generateStaticParams() {
  // Statically pre-render the most common entry points (first juz, last juz, surah starts on early pages)
  const pages = [1, 2, 3, 4, 5, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582, 602, 604];
  return pages.map((p) => ({ page: String(p) }));
}

export const revalidate = 60 * 60 * 24; // 24 hours for ISR pages

export async function generateMetadata({ params }: MushafPageRouteProps) {
  const pageNum = parseInt(params.page, 10);
  return {
    title: `Page ${pageNum} | Mushaf | Tajweed Trainer`,
  };
}

export default async function MushafPageRoute({ params }: MushafPageRouteProps) {
  // Strict validation: only positive integers without leading zeros, in range.
  if (!/^[1-9]\d*$/.test(params.page)) notFound();
  const pageNum = parseInt(params.page, 10);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > TOTAL_PAGES) {
    notFound();
  }

  let data;
  try {
    data = await getTajweedPage(pageNum);
  } catch {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm text-text-muted">Could not load this page. Please try again.</p>
      </div>
    );
  }

  const surahs = await getChaptersIndex().catch(() => getBundledChaptersIndex());

  return <MushafReader page={pageNum} data={data} surahs={surahs} />;
}
