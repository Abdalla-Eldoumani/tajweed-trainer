"use client";

import { ModuleCard } from "@/components/learn/ModuleCard";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import { isModuleUnlocked } from "@/lib/module-unlock";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function LearnPage() {
  const { progress, moduleProgress } = useProgress();
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-h2 font-semibold">{t("learn.title")}</h1>
        <p className="text-small text-text-muted mt-2">
          {t("learn.description")}
        </p>
      </div>

      <ol className="divide-y divide-[color:var(--gold-hairline)] border-y border-[color:var(--gold-hairline)]">
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
    </div>
  );
}
