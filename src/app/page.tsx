"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ColorLegend } from "@/components/learn/ColorLegend";
import { ModuleCard } from "@/components/learn/ModuleCard";
import { ResumeReading } from "@/components/home/ResumeReading";
import { RevisionDueCard } from "@/components/home/RevisionDueCard";
import { StreakCounter } from "@/components/practice/StreakCounter";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { isModuleUnlocked } from "@/lib/module-unlock";
import learningPath from "@/data/content/learning-path.json";
import basmala from "@/data/basmala.json";
import type { LearningModule } from "@/lib/types";

// The daily verse pulls in the 53 KB verse-snapshot set and the 23 KB surah
// index, yet it renders nothing until after mount (the day pick is client-only
// to avoid a hydration mismatch). Loading it dynamically keeps that ~76 KB off
// the home route's initial JS.
const DailyVerse = dynamic(
  () => import("@/components/home/DailyVerse").then((m) => ({ default: m.DailyVerse })),
  { ssr: false, loading: () => null },
);

const modules = learningPath.modules as LearningModule[];

export default function HomePage() {
  const { progress, moduleProgress, getOverallCompletion } = useProgress();
  const { t } = useTranslation();

  const overall = getOverallCompletion(modules.map((m) => m.id));
  const next = modules.find(
    (m) => isModuleUnlocked(progress, m.id) && moduleProgress(m.id).lessonsCompleted.length === 0,
  );
  const heroLabel = !next ? t("nav.allModules") : overall > 0 ? t("home.nextLesson") : t("home.startLearning");

  return (
    <div className="space-y-10">
      <header className="double-rule py-10 text-center">
        <p className="font-quran text-arabic-md text-gold-dark dark:text-gold-light" dir="rtl" lang="ar">
          {basmala.text}
        </p>
        <h1 className="font-heading text-display font-bold mt-4">{t("home.title")}</h1>
        <p className="font-arabic text-arabic-md text-text-muted mt-1" dir="rtl" lang="ar">
          تجويد القرآن الكريم
        </p>
        <p className="text-text-muted mt-4 max-w-md mx-auto">{t("home.subtitle")}</p>
        <p className="text-micro text-text-muted mt-2">{t("home.riwaya")}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={next ? `/learn/${next.id}` : "/learn"}>
            <Button size="lg" className="min-w-40">{heroLabel}</Button>
          </Link>
          <Link href="/practice">
            <Button variant="outline" size="lg" className="min-w-40">{t("nav.practice")}</Button>
          </Link>
        </div>
      </header>

      {overall > 0 && (
        <section aria-label={t("home.yourProgress")}>
          <div className="flex items-center gap-4">
            <div className="text-h2 font-bold text-primary dark:text-primary-light tabular-nums">{overall}%</div>
            <ProgressBar value={overall} label={t("home.yourProgress")} className="flex-1" />
          </div>
        </section>
      )}

      <ResumeReading />
      <RevisionDueCard />
      <StreakCounter />
      <DailyVerse />

      <section>
        <SectionHeading as="h2" rule className="mb-2">{t("home.learningPath")}</SectionHeading>
        <ol className="divide-y divide-[color:var(--gold-hairline)] border-b border-[color:var(--gold-hairline)]">
          {modules.map((module) => {
            const modProgress = moduleProgress(module.id);
            const scores = modProgress.quizScores;
            return (
              <li key={module.id}>
                <ModuleCard
                  module={module}
                  lessonDone={modProgress.lessonsCompleted.length > 0}
                  quizScore={scores.length > 0 ? scores[scores.length - 1].score : null}
                  locked={!isModuleUnlocked(progress, module.id)}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <ColorLegend />
    </div>
  );
}
