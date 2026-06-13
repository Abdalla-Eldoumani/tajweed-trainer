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
        <h1 className="font-heading text-2xl font-bold">{t("learn.title")}</h1>
        <p className="text-sm text-text-muted mt-2">
          {t("learn.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const modProgress = moduleProgress(module.id);
          return (
            <ModuleCard
              key={module.id}
              module={module}
              completedLessons={modProgress.lessonsCompleted.length}
              locked={!isModuleUnlocked(progress, module.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
