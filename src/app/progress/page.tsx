"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { MODULES } from "@/components/layout/nav-data";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function ProgressPage() {
  const { t, isAr } = useTranslation();
  const { progress, moduleProgress, getOverallCompletion, resetProgress } = useProgress();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">{t("progress.overall")}</h2>
        <div className="text-3xl font-bold text-primary dark:text-primary-light mb-2">
          {overall}%
        </div>
        <ProgressBar value={overall} />
      </Card>

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
