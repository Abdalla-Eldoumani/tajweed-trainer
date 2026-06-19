"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MasterySection } from "@/components/progress/MasterySection";
import { MemorizationTracker } from "@/components/memorization/MemorizationTracker";
import { MemorizationBreakdown } from "@/components/memorization/MemorizationBreakdown";
import { BulkMemorizationEntry } from "@/components/memorization/BulkMemorizationEntry";
import { useProgress } from "@/hooks/useProgress";
import { useReviews } from "@/hooks/useReviews";
import { useMemorization } from "@/hooks/useMemorization";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "@/lib/i18n";
import { MODULES } from "@/components/layout/nav-data";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function ProgressPage() {
  const { t, isAr } = useTranslation();
  const { progress, moduleProgress, getOverallCompletion, resetProgress } = useProgress();
  const { stats: reviewStatsFn } = useReviews();
  const reviewStats = reviewStatsFn();
  const { memorized, count: memorizedCount, mounted: memorizedMounted } = useMemorization();
  const { events: analyticsEvents } = useAnalytics();
  const insights = (() => {
    const routeViews: Record<string, number> = {};
    let quizStarts = 0;
    let quizFinishes = 0;
    for (const e of analyticsEvents) {
      if (e.type === "quiz.start") quizStarts += 1;
      else if (e.type === "quiz.finish") quizFinishes += 1;
      else if (e.type === "route.view" && e.meta) {
        routeViews[e.meta] = (routeViews[e.meta] ?? 0) + 1;
      }
    }
    const topRoutes = Object.entries(routeViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { quizStarts, quizFinishes, topRoutes, total: analyticsEvents.length };
  })();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Shared so the empty-state CTA in the tracker and the populated surface's own
  // trigger open the one bulk disclosure; the surface lives inside this section so
  // the headline and breakdown stay visible and the count visibly moves on confirm.
  const [bulkOpen, setBulkOpen] = useState(false);

  const totalLessons: Record<string, number> = {};
  for (const m of modules) {
    totalLessons[m.id] = m.lessons_count;
  }

  const overall = getOverallCompletion(totalLessons);

  const handleReset = () => {
    resetProgress();
    setShowResetConfirm(false);
  };

  const getModuleLabel = (id: string) => {
    const mod = MODULES.find((m) => m.id === id);
    return mod ? (isAr ? mod.labelAr : mod.label) : id;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("progress.title")}</h1>
        <p className="text-sm text-text-muted mt-2">{t("progress.description")}</p>
        <p className="text-xs text-text-muted mt-2">{t("progress.localData")}</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">{t("progress.overall")}</h2>
        <div className="text-3xl font-bold text-primary dark:text-primary-light mb-2">
          {overall}%
        </div>
        <ProgressBar value={overall} />
      </Card>

      {reviewStats.total > 0 && (
        <Card>
          <h2 className="font-heading font-semibold mb-3">{t("review.statsTitle")}</h2>
          <div className="flex flex-wrap gap-6 mb-2">
            <div>
              <div className="text-2xl font-bold text-primary dark:text-primary-light">
                {reviewStats.total}
              </div>
              <p className="text-xs text-text-muted">{t("review.statsTotal")}</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{reviewStats.mastered}</div>
              <p className="text-xs text-text-muted">{t("review.statsMastered")}</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {reviewStats.due}
              </div>
              <p className="text-xs text-text-muted">{t("review.statsDue")}</p>
            </div>
          </div>
          <p className="text-xs text-text-muted">{t("review.statsHelp")}</p>
        </Card>
      )}

      {/* Memorization tracker: the headline (or the empty state) plus the
          breakdown and bulk-entry surface when populated. The tracker owns the
          empty-vs-populated branch; the breakdown and bulk trigger gate on
          mount + count so they never flash before hydration. The bulk surface
          lives inside this section so the headline and breakdown stay visible
          and the count visibly moves the instant a bulk op confirms (the change
          bus re-renders all three together — no manual refresh). In the empty
          state the tracker's own CTA opens the same disclosure, so the surface
          hides its duplicate trigger there. */}
      <div className="space-y-6">
        <MemorizationTracker onOpenBulk={() => setBulkOpen(true)} />
        {memorizedMounted && memorizedCount > 0 && (
          <Card>
            <MemorizationBreakdown memorized={memorized} />
          </Card>
        )}
        {memorizedMounted && (
          <BulkMemorizationEntry
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            showTrigger={memorizedCount > 0}
          />
        )}
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">{t("progress.streak")}</h2>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-bold text-primary dark:text-primary-light">
              {progress.streaks.currentStreak}
            </div>
            <p className="text-xs text-text-muted">{t("progress.current")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{progress.streaks.longestStreak}</div>
            <p className="text-xs text-text-muted">{t("progress.longest")}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-heading font-semibold mb-3">{t("progress.moduleProgress")}</h2>
        <div className="space-y-3">
          {modules.map((module) => {
            const mp = moduleProgress(module.id);
            const completed = mp.lessonsCompleted.length;
            const total = module.lessons_count;

            return (
              <Card key={module.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium">
                      {isAr ? module.title_ar : module.title_en}
                    </h3>
                    {!isAr && (
                      <p className="text-xs text-text-muted font-arabic" dir="rtl" lang="ar">
                        {module.title_ar}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {completed}/{total}
                  </span>
                </div>
                <ProgressBar value={completed} max={total} />

                {mp.quizScores.length > 0 && (
                  <div className="mt-2 text-xs text-text-muted">
                    {t("progress.latestQuiz")}: {mp.quizScores[mp.quizScores.length - 1].score}%
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <MasterySection />

      {/* Quiz History */}
      {Object.values(progress.modules).some((m) => m.quizScores.length > 0) && (
        <div>
          <h2 className="font-heading font-semibold mb-3">{t("progress.quizHistory")}</h2>
          <Card>
            <div className="space-y-2">
              {Object.entries(progress.modules)
                .flatMap(([moduleId, m]) =>
                  m.quizScores.map((qs) => ({ ...qs, moduleId }))
                )
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((qs, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gold-light/30 dark:border-gold-dark/20 last:border-0">
                    <span className="text-text-muted truncate min-w-0 flex-1">{getModuleLabel(qs.moduleId)}</span>
                    <span className="font-medium shrink-0">{qs.score}%</span>
                    <span className="text-text-muted shrink-0">{new Date(qs.date).toLocaleDateString()}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {insights.total > 0 && (
        <Card>
          <h2 className="font-heading font-semibold mb-3">{t("insights.title")}</h2>
          <div className="flex flex-wrap gap-6 mb-3">
            <div>
              <div className="text-2xl font-bold text-primary dark:text-primary-light">
                {insights.quizStarts}
              </div>
              <p className="text-xs text-text-muted">{t("insights.quizStarts")}</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{insights.quizFinishes}</div>
              <p className="text-xs text-text-muted">{t("insights.quizFinishes")}</p>
            </div>
          </div>
          {insights.topRoutes.length > 0 && (
            <>
              <p className="text-xs font-medium mb-1">{t("insights.topRoutes")}</p>
              <ul className="text-xs text-text-muted space-y-1">
                {insights.topRoutes.map(([path, n]) => (
                  <li key={path} className="flex justify-between gap-2">
                    <span className="truncate min-w-0 flex-1">{path}</span>
                    <span className="shrink-0 font-medium">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-text-muted mt-3">{t("insights.localOnly")}</p>
        </Card>
      )}

      {/* Reset Progress */}
      <Card>
        <h2 className="font-heading font-semibold mb-2">{t("progress.resetProgress")}</h2>
        <p className="text-xs text-text-muted mb-3">
          {t("progress.resetDescription")}
        </p>
        {showResetConfirm ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">{t("progress.areYouSure")}</p>
            <Button variant="primary" size="sm" onClick={handleReset} className="bg-red-600 hover:bg-red-700">
              {t("progress.yesReset")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
              {t("progress.cancel")}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
            {t("progress.resetAll")}
          </Button>
        )}
      </Card>
    </div>
  );
}
