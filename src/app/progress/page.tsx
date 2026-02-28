"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useProgress } from "@/hooks/useProgress";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function ProgressPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Your Progress</h1>
        <p className="text-sm text-text-muted mt-2">Track your tajweed learning journey.</p>
      </div>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Overall Completion</h2>
        <div className="text-3xl font-bold text-primary dark:text-primary-light mb-2">
          {overall}%
        </div>
        <ProgressBar value={overall} />
      </Card>

      <Card>
        <h2 className="font-heading font-semibold mb-3">Streak</h2>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-bold text-primary dark:text-primary-light">
              {progress.streaks.currentStreak}
            </div>
            <p className="text-xs text-text-muted">Current</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{progress.streaks.longestStreak}</div>
            <p className="text-xs text-text-muted">Longest</p>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-heading font-semibold mb-3">Module Progress</h2>
        <div className="space-y-3">
          {modules.map((module) => {
            const mp = moduleProgress(module.id);
            const completed = mp.lessonsCompleted.length;
            const total = module.lessons_count;

            return (
              <Card key={module.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium">{module.title_en}</h3>
                    <p className="text-xs text-text-muted font-arabic" dir="rtl" lang="ar">
                      {module.title_ar}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {completed}/{total}
                  </span>
                </div>
                <ProgressBar value={completed} max={total} />

                {mp.quizScores.length > 0 && (
                  <div className="mt-2 text-xs text-text-muted">
                    Latest quiz: {mp.quizScores[mp.quizScores.length - 1].score}%
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
          <h2 className="font-heading font-semibold mb-3">Quiz History</h2>
          <Card>
            <div className="space-y-2">
              {Object.entries(progress.modules)
                .flatMap(([moduleId, m]) =>
                  m.quizScores.map((qs) => ({ ...qs, moduleId }))
                )
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 10)
                .map((qs, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-text-muted truncate min-w-0 flex-1">{qs.moduleId}</span>
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
        <h2 className="font-heading font-semibold mb-2">Reset Progress</h2>
        <p className="text-xs text-text-muted mb-3">
          Clear all completed lessons, quiz scores, and streaks. Your settings will be kept.
        </p>
        {showResetConfirm ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">Are you sure?</p>
            <Button variant="primary" size="sm" onClick={handleReset} className="bg-red-600 hover:bg-red-700">
              Yes, reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset All Progress
          </Button>
        )}
      </Card>
    </div>
  );
}
