import { notFound, redirect } from "next/navigation";
import { getStartPageForSurah } from "@/lib/quran-api";

interface SurahRedirectRouteProps {
  params: { surah: string };
}

export default function SurahRedirectRoute({ params }: SurahRedirectRouteProps) {
  // Strict validation: only positive integers 1..114, no leading zeros.
  if (!/^[1-9]\d*$/.test(params.surah)) notFound();
  const surahNum = parseInt(params.surah, 10);
  if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
    notFound();
  }
  const startPage = getStartPageForSurah(surahNum);
  if (!Number.isInteger(startPage) || startPage < 1 || startPage > 604) {
    notFound();
  }
  redirect(`/mushaf/page/${startPage}`);
}
