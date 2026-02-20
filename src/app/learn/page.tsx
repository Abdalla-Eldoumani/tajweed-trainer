"use client";

import { ModuleCard } from "@/components/learn/ModuleCard";
import { useProgress } from "@/hooks/useProgress";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function LearnPage() {
  const { moduleProgress } = useProgress();

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
        <h1 className="font-heading text-2xl font-bold">Learn Tajweed</h1>
        <p className="font-arabic text-lg text-text-muted mt-1" dir="rtl" lang="ar">
          {learningPath.title_ar}
        </p>
        <p className="text-sm text-text-muted mt-2">
          {learningPath.description}
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
