"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MasterySection } from "@/components/progress/MasterySection";
import { WeakRulesSection } from "@/components/progress/WeakRulesSection";
import { ResumeListeningCard } from "@/components/progress/ResumeListeningCard";
import { MurajaahDashboard } from "@/components/progress/MurajaahDashboard";
import { MemorizationTracker } from "@/components/memorization/MemorizationTracker";
import { MemorizationBreakdown } from "@/components/memorization/MemorizationBreakdown";
import { MemorizationHeatmap } from "@/components/memorization/MemorizationHeatmap";
import { RevisionStreakCounter } from "@/components/memorization/RevisionStreakCounter";
import { BulkMemorizationEntry } from "@/components/memorization/BulkMemorizationEntry";
import { MemorizedReview } from "@/components/memorization/MemorizedReview";
import { ChainingDrill } from "@/components/memorization/ChainingDrill";
import { SegmentDrill } from "@/components/memorization/SegmentDrill";
import { TypingRecall } from "@/components/memorization/TypingRecall";
import { TikrarDrill } from "@/components/memorization/TikrarDrill";
import { ExamMode } from "@/components/memorization/ExamMode";
import { KhatmahCard } from "@/components/khatmah/KhatmahCard";
import { useProgress } from "@/hooks/useProgress";
import { useReviews } from "@/hooks/useReviews";
import { useMemorization } from "@/hooks/useMemorization";
import { useMemorizationReviews } from "@/hooks/useMemorizationReviews";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "@/lib/i18n";
import { getMemorizationReviewStats } from "@/lib/memorization-review";
import { toArabicIndic } from "@/lib/utils";
import { MODULES } from "@/components/layout/nav-data";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

// The milestone certificate draws a 1200x848 canvas and pulls the certificate
// drawing lib; it is a rare on-completion surface (most loads of /progress show
// only its calm empty line) and renders nothing before mount. Lazy-loaded so its
// weight stays off the /progress initial bundle; it splits into its own chunk and
// loads after mount. The placeholder matches its section footprint and is
// reduced-motion-safe.
const MilestoneCertificate = dynamic(
  () => import("@/components/progress/MilestoneCertificate").then((m) => ({ default: m.MilestoneCertificate })),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 rounded-xl bg-bg-subtle dark:bg-bg-subtle-dark animate-pulse motion-reduce:animate-none" />
    ),
  },
);

const modules = learningPath.modules as LearningModule[];

export default function ProgressPage() {
  const { t, isAr } = useTranslation();
  const { progress, moduleProgress, getOverallCompletion, resetProgress } = useProgress();
  const { stats: reviewStatsFn } = useReviews();
  const reviewStats = reviewStatsFn();
  const { memorized, count: memorizedCount, mounted: memorizedMounted } = useMemorization();
  // The hook's reviews map (not a storage read) so the due count re-renders
  // through the change bus when a recall session records a result.
  const { reviews: memorizationReviews } = useMemorizationReviews();
  const memorizationReviewStats = getMemorizationReviewStats(memorized, memorizationReviews, new Date());
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

  const num = (n: number) => (isAr ? toArabicIndic(n) : String(n));

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading as="h2" rule>{t("progress.title")}</SectionHeading>
        <p className="text-sm text-text-muted mt-2">{t("progress.description")}</p>
        <p className="text-xs text-text-muted mt-2">{t("progress.localData")}</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold text-h3 mb-3">{t("progress.overall")}</h2>
        <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums mb-2">
          {overall}%
        </div>
        <ProgressBar value={overall} />
      </Card>

      {/* Resume listening: restarts playback at the last verse the user PLAYED
          (distinct from resume-reading, the last page read). Sits near the top as
          a quick "pick up where you were" affordance; the card hides itself when
          there is no playback to resume and routes through the one player engine. */}
      <ResumeListeningCard />

      {reviewStats.total > 0 && (
        <Card>
          <h2 className="font-heading font-semibold text-h3 mb-3">{t("review.statsTitle")}</h2>
          <div className="flex flex-wrap gap-6 mb-2">
            <div>
              <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">
                {reviewStats.total}
              </div>
              <p className="text-xs text-text-muted">{t("review.statsTotal")}</p>
            </div>
            <div>
              <div className="text-h2 font-bold text-accent tabular-nums">{reviewStats.mastered}</div>
              <p className="text-xs text-text-muted">{t("review.statsMastered")}</p>
            </div>
            <div>
              <div className="text-h2 font-bold text-red-600 dark:text-red-400 tabular-nums">
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
          bus re-renders all three together, no manual refresh). In the empty
          state the tracker's own CTA opens the same disclosure, so the surface
          hides its duplicate trigger there. */}
      <div className="space-y-6">
        {/* Today's revision dashboard: the honest due count, the balanced
            new/recent/consolidated breakdown, the daily-new cap status, and a CTA
            that scrolls to the one recall-review card below (via the id anchor). It
            reads the SAME composeToday the recall session snapshots, so overview
            and session never diverge. Gated like the rest of the memorization
            section so it never flashes before hydration. */}
        {memorizedMounted && memorizedCount > 0 && <MurajaahDashboard />}
        <MemorizationTracker onOpenBulk={() => setBulkOpen(true)} />
        {memorizedMounted && memorizedCount > 0 && (
          <Card>
            <MemorizationBreakdown memorized={memorized} />
          </Card>
        )}
        {/* Memorization health: the STAT-01 freshness facet (per-juz aging bars)
            and the STAT-02 error heatmap by juz / surah / page. Reads the pure
            memorization-strength lib over the memorized set and the reviews map;
            renders only scope names, counts, and manuscript-palette colors — no
            verse text. Sits between "what I've memorized" and "how due it is". */}
        {memorizedMounted && memorizedCount > 0 && (
          <Card>
            <MemorizationHeatmap />
          </Card>
        )}
        {memorizedMounted && (
          <BulkMemorizationEntry
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            showTrigger={memorizedCount > 0}
          />
        )}
        {/* A visible due/total/mastered line above the recall self-test, so the
            user sees how many memorized verses are due before opening the session.
            The stats come from getMemorizationReviewStats over the memorized set
            (its total counts a freshly memorized verse even before it has a review
            entry) using the hook's reviews map, so it re-renders through the change
            bus after each graded verse. Mirrors the spaced-review stats Card; gated
            on mount + count like the rest of the tracker section. */}
        {memorizedMounted && memorizedCount > 0 && (
          <Card>
            <h2 className="font-heading font-semibold text-h3 mb-3">{t("memorize.reviewStatsTitle")}</h2>
            <div className="flex flex-wrap gap-6 mb-2">
              <div>
                <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">
                  {num(memorizationReviewStats.total)}
                </div>
                <p className="text-xs text-text-muted">{t("memorize.reviewTotal")}</p>
              </div>
              <div>
                <div className="text-h2 font-bold text-accent tabular-nums">
                  {num(memorizationReviewStats.mastered)}
                </div>
                <p className="text-xs text-text-muted">{t("memorize.reviewMastered")}</p>
              </div>
              <div>
                <div className="text-h2 font-bold text-red-600 dark:text-red-400 tabular-nums">
                  {num(memorizationReviewStats.due)}
                </div>
                <p className="text-xs text-text-muted">{t("memorize.reviewDueNow")}</p>
              </div>
            </div>
            <p className="text-xs text-text-muted">{t("memorize.reviewStatsHelp")}</p>
          </Card>
        )}

        {/* Revision streak (STAT-03): the memorization revision streak the store
            now tracks and the recall path updates on every graded verse —
            consecutive days with at least one revision, plus a 7-day pill row.
            Reads progress.memorizationStreak with a DISTINCT label so it never
            reads as (or collides in a locator with) the practice-streak Card lower
            on the page. Same mount + count gate as the rest of the section. */}
        {memorizedMounted && memorizedCount > 0 && <RevisionStreakCounter />}

        {/* Review entry lives inside the tracker section so the user goes from
            "here's what I've memorized" straight into "test me on it" (F1). Shown
            only when something is memorized; the session reuses the Leitner
            machinery over the separate memorizationReviews keyspace and opens in
            place. The component owns its own due-vs-empty branch. */}
        {/* The one recall-review instance. The id anchor is the scroll target
            for the dashboard's "Begin today's revision" CTA — do NOT mount a
            second review (locator/keyboard collision with the four drills). */}
        <div id="murajaah-review-anchor" className="scroll-mt-20">
          {memorizedMounted && memorizedCount > 0 && <MemorizedReview />}
        </div>

        {/* Chaining drill: sits beside the recall self-test and drills the seams
            between memorized units (verse / page / juz) — cue the tail, recall
            the head — feeding the SAME memorizationReviews SM-2 scheduler through
            recordReview. Gated on mount + count like the rest of the section. */}
        {memorizedMounted && memorizedCount > 0 && <ChainingDrill />}

        {/* Segment drill: the THIRD keyboard drill on /progress. Breaks one
            memorized verse into word-boundary chunks, drills each, chains them,
            then records ONE optional whole-verse grade through the same
            memorizationReviews scheduler. Its grade keys (1-4) are root-scoped so
            they never cross-fire with the review or chaining drills. Same
            mount + count gate. */}
        {memorizedMounted && memorizedCount > 0 && <SegmentDrill />}

        {/* Typing recall: the FOURTH keyboard drill on /progress. Type the next
            word of a memorized verse from memory (checked by wordsMatch against
            the stored textUthmani, exact or diacritic-insensitive per the
            Settings toggle), then record ONE whole-verse grade through the same
            memorizationReviews scheduler. Its grade keys (1-4) are root-scoped
            and its typing input is INPUT-guarded, so it never cross-fires with
            the review, chaining, or segment drills. Same mount + count gate. */}
        {memorizedMounted && memorizedCount > 0 && <TypingRecall />}

        {/* Tikrar rep counter (EXAM-01): pick a memorized verse and loop it via
            the one player engine, counting reps toward a session target that add
            to the verse's cumulative cross-day total. It is a COUNTER, not a
            graded drill — no SM-2 grade and no document-level key handler (buttons
            only), so it can never cross-fire the five drills' grade keys. Same
            mount + count gate. */}
        {memorizedMounted && memorizedCount > 0 && <TikrarDrill />}

        {/* Timed exam (EXAM-02): pick a scope, run a timed no-peek session over
            its memorized verses (verse hidden until self-marked), and log a
            percent-recalled score. It is a self-graded MEASUREMENT — no SM-2
            write, no streak touch, and no document-level grade keys (buttons
            only), so it cannot cross-fire the other drills. Same mount + count
            gate. */}
        {memorizedMounted && memorizedCount > 0 && <ExamMode />}
      </div>

      {/* Khatmah planner: an opt-in Quran-completion goal that tracks the
          reader position the app already records. Lives beside the memorization
          tracker because both are reading-progress motivators; the card owns its
          empty / setup / active branches and gates on its own mounted flag. */}
      <KhatmahCard />

      {/* Milestone certificate: a reading-achievement surface beside the hifz
          tracker and khatmah. Reachable once a juz is fully memorized or a khatmah
          is complete; before that it shows a calm, non-nagging line. Owns its own
          mounted gate and renders/saves the certificate entirely on-device. */}
      <MilestoneCertificate />

      <Card>
        <h2 className="font-heading font-semibold text-h3 mb-3">{t("progress.streak")}</h2>
        <div className="flex gap-6">
          <div>
            <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">
              {progress.streaks.currentStreak}
            </div>
            <p className="text-xs text-text-muted">{t("progress.current")}</p>
          </div>
          <div>
            <div className="text-h2 font-bold text-accent tabular-nums">{progress.streaks.longestStreak}</div>
            <p className="text-xs text-text-muted">{t("progress.longest")}</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-heading font-semibold text-h3 mb-3">{t("progress.moduleProgress")}</h2>
        <div className="space-y-3">
          {modules.map((module) => {
            const mp = moduleProgress(module.id);
            const completed = mp.lessonsCompleted.length;
            const total = module.lessons_count;

            return (
              <Card key={module.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-heading font-semibold text-h3">
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

      {/* Weak rules: the user's most-missed rule areas (modules) ranked from their
          own quiz history, each linking to targeted practice. Sits beside mastery
          since both are practice-history surfaces; owns its mounted gate and shows
          only modules with misses (honest per-module framing, no authored content). */}
      <WeakRulesSection />

      {/* Quiz History */}
      {Object.values(progress.modules).some((m) => m.quizScores.length > 0) && (
        <div>
          <h2 className="font-heading font-semibold text-h3 mb-3">{t("progress.quizHistory")}</h2>
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
          <h2 className="font-heading font-semibold text-h3 mb-3">{t("insights.title")}</h2>
          <div className="flex flex-wrap gap-6 mb-3">
            <div>
              <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">
                {insights.quizStarts}
              </div>
              <p className="text-xs text-text-muted">{t("insights.quizStarts")}</p>
            </div>
            <div>
              <div className="text-h2 font-bold text-accent tabular-nums">{insights.quizFinishes}</div>
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
        <h2 className="font-heading font-semibold text-h3 mb-2">{t("progress.resetProgress")}</h2>
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
