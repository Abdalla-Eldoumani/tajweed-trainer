import { notFound, redirect } from "next/navigation";
import { getStartPageForSurah } from "@/lib/quran-api";

interface SurahRedirectRouteProps {
  params: { surah: string };
}

export default function SurahRedirectRoute({ params }: SurahRedirectRouteProps) {
  const surahNum = parseInt(params.surah, 10);
  if (Number.isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    notFound();
  }
  const startPage = getStartPageForSurah(surahNum);
  redirect(`/mushaf/page/${startPage}`);
}
