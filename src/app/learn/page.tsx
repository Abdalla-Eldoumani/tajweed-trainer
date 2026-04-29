"use client";

import { ModuleCard } from "@/components/learn/ModuleCard";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function LearnPage() {
  const { moduleProgress } = useProgress();
  const { t, isAr } = useTranslation();

  const isModuleUnlocked = (module: LearningModule): boolean => {
    if (!module.prerequisite) return true;
    const prereq = modules.find((m) => m.id === module.prerequisite);
    if (!prereq) return true;
    const progress = moduleProgress(prereq.id);
    return progress.lessonsCompleted.length > 0;
  };

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
          const progress = moduleProgress(module.id);
          return (
            <ModuleCard
              key={module.id}
              module={module}
              completedLessons={progress.lessonsCompleted.length}
              locked={!isModuleUnlocked(module)}
            />
          );
        })}
      </div>
    </div>
  );
}
