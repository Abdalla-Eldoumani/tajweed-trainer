"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ColorLegend } from "@/components/learn/ColorLegend";
import { ResumeReading } from "@/components/home/ResumeReading";
import { StreakCounter } from "@/components/practice/StreakCounter";

// The daily verse pulls in the 53 KB verse-snapshot set and the 23 KB surah
// index, yet it renders nothing until after mount (the day pick is client-only
// to avoid a hydration mismatch). Loading it dynamically keeps that ~76 KB off
// the home route's initial JS without any behavior change; SSR rendered null
// here already.
const DailyVerse = dynamic(
  () => import("@/components/home/DailyVerse").then((m) => ({ default: m.DailyVerse })),
  { ssr: false, loading: () => null },
);
import { MedallionOrnament, OrnamentalDivider } from "@/components/ui/Ornament";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { getColorForClass } from "@/lib/tajweed-colors";
import learningPath from "@/data/content/learning-path.json";
import basmala from "@/data/basmala.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

// The color-coded-text feature card shows a single colored noon; its color comes
// from the single tajweed source (the idgham green) rather than a hardcoded hex.
const COLOR_CODED_DEMO = getColorForClass("idgham_ghunnah")?.hex ?? "#169200";

export default function HomePage() {
  const { getOverallCompletion } = useProgress();
  const { t, isAr } = useTranslation();

  const totalLessons: Record<string, number> = {};
  for (const m of modules) {
    totalLessons[m.id] = m.lessons_count;
  }
  const overall = getOverallCompletion(totalLessons);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative text-center py-10 islamic-pattern-bg rounded-xl overflow-hidden">
        <MedallionOrnament className="absolute inset-0 m-auto w-72 h-72 opacity-[0.07] pointer-events-none" />
        <p className="font-quran text-arabic-md text-gold-dark dark:text-gold-light mb-4 relative z-10" dir="rtl" lang="ar">
          {basmala.text}
        </p>
        <OrnamentalDivider className="max-w-xs mx-auto mb-4 relative z-10" />
        <h1 className="font-heading text-display font-bold relative z-10">
          {t("home.title")}
        </h1>
        <p className="font-arabic text-arabic-md text-text-muted mt-2 relative z-10" dir="rtl" lang="ar">
          تجويد القرآن الكريم
        </p>
        <p className="text-text-muted mt-4 max-w-md mx-auto relative z-10">
          {t("home.subtitle")}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
          <Link href="/learn">
            <Button size="lg">{t("home.startLearning")}</Button>
          </Link>
          <Link href="/practice">
            <Button variant="outline" size="lg">{t("nav.practice")}</Button>
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      {overall > 0 && (
        <Card variant="ornate">
          <h2 className="font-heading font-semibold text-body mb-3">{t("home.yourProgress")}</h2>
          <div className="flex items-center gap-4">
            <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">{overall}%</div>
            <div className="flex-1">
              <ProgressBar value={overall} />
            </div>
          </div>
        </Card>
      )}

      <StreakCounter />

      <ResumeReading />
      <DailyVerse />

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="text-h2 mb-2 text-gold-dark dark:text-gold font-heading font-bold">9</div>
          <h3 className="font-heading font-semibold text-small">{t("home.learningModules")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.learningModulesDesc")}</p>
        </Card>

        <Card>
          <div className="text-h2 mb-2 font-quran" style={{ color: COLOR_CODED_DEMO }} dir="rtl" lang="ar">ن</div>
          <h3 className="font-heading font-semibold text-small">{t("home.colorCodedText")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.colorCodedTextDesc")}</p>
        </Card>

        <Card>
          <div className="text-h2 mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-small">{t("home.audioExamples")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.audioExamplesDesc")}</p>
        </Card>

        <Card>
          <div className="text-h2 mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-small">{t("home.practiceQuizzes")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.practiceQuizzesDesc")}</p>
        </Card>

        <Card>
          <div className="text-h2 mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-small">{t("home.progressTracking")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.progressTrackingDesc")}</p>
        </Card>

        <Card>
          <div className="text-h2 mb-2 font-arabic text-primary dark:text-primary-light" dir="rtl" lang="ar">حفص</div>
          <h3 className="font-heading font-semibold text-small">{t("home.hafsAnAsim")}</h3>
          <p className="text-micro text-text-muted mt-1">{t("home.hafsAnAsimDesc")}</p>
        </Card>
      </div>

      {/* Color Legend */}
      <ColorLegend />

      {/* Learning Path Preview */}
      <div>
        <SectionHeading as="h2" className="mb-3">{t("home.learningPath")}</SectionHeading>
        <div className="space-y-2">
          {modules.map((module) => (
            <Link key={module.id} href={`/learn/${module.id}`}>
              <div className="flex items-center gap-3 p-3 min-h-[44px] rounded-lg hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark transition-colors">
                <span className="w-8 h-8 rounded-full bg-gold-light/30 text-gold-dark dark:bg-gold-dark/20 dark:text-gold-light flex items-center justify-center text-micro font-bold border border-gold-light/40 dark:border-gold-dark/30">
                  {module.order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium">{isAr ? module.title_ar : module.title_en}</p>
                  <p className="text-micro text-text-muted truncate">
                    {isAr && module.description_ar ? module.description_ar : module.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
