"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ColorLegend } from "@/components/learn/ColorLegend";
import { MedallionOrnament, OrnamentalDivider } from "@/components/ui/Ornament";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function HomePage() {
  const { progress, getOverallCompletion } = useProgress();
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
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <OrnamentalDivider className="max-w-xs mx-auto mb-4 relative z-10" />
        <h1 className="font-heading text-3xl sm:text-4xl font-bold relative z-10">
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
          <h2 className="font-heading font-semibold mb-3">{t("home.yourProgress")}</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-2xl font-bold text-primary dark:text-primary-light">{overall}%</div>
            <div className="flex-1">
              <ProgressBar value={overall} />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <span>{t("home.streak")}: {progress.streaks.currentStreak} {t("home.streakDays")}</span>
            <span>{t("home.best")}: {progress.streaks.longestStreak} {t("home.streakDays")}</span>
          </div>
        </Card>
      )}

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="text-2xl mb-2 text-gold-dark dark:text-gold font-heading font-bold">9</div>
          <h3 className="font-heading font-semibold text-sm">{t("home.learningModules")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.learningModulesDesc")}</p>
        </Card>

        <Card>
          <div className="text-2xl mb-2 font-quran" style={{ color: "#169200" }} dir="rtl" lang="ar">ن</div>
          <h3 className="font-heading font-semibold text-sm">{t("home.colorCodedText")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.colorCodedTextDesc")}</p>
        </Card>

        <Card>
          <div className="text-2xl mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-sm">{t("home.audioExamples")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.audioExamplesDesc")}</p>
        </Card>

        <Card>
          <div className="text-2xl mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-sm">{t("home.practiceQuizzes")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.practiceQuizzesDesc")}</p>
        </Card>

        <Card>
          <div className="text-2xl mb-2 text-gold-dark dark:text-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="font-heading font-semibold text-sm">{t("home.progressTracking")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.progressTrackingDesc")}</p>
        </Card>

        <Card>
          <div className="text-2xl mb-2 font-arabic text-primary dark:text-primary-light" dir="rtl" lang="ar">حفص</div>
          <h3 className="font-heading font-semibold text-sm">{t("home.hafsAnAsim")}</h3>
          <p className="text-xs text-text-muted mt-1">{t("home.hafsAnAsimDesc")}</p>
        </Card>
      </div>

      {/* Color Legend */}
      <ColorLegend />

      {/* Learning Path Preview */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-3">{t("home.learningPath")}</h2>
        <div className="space-y-2">
          {modules.map((module) => (
            <Link key={module.id} href={`/learn/${module.id}`}>
              <div className="flex items-center gap-3 p-3 min-h-[44px] rounded-lg hover:bg-cream-dark dark:hover:bg-gray-800 transition-colors">
                <span className="w-8 h-8 rounded-full bg-gold-light/30 text-gold-dark dark:bg-gold-dark/20 dark:text-gold-light flex items-center justify-center text-xs font-bold border border-gold-light/40 dark:border-gold-dark/30">
                  {module.order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{isAr ? module.title_ar : module.title_en}</p>
                  <p className="text-xs text-text-muted truncate">
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
