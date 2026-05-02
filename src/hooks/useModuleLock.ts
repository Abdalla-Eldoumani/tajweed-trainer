"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export interface ModuleLockState {
  locked: boolean;
  mounted: boolean;
  prereqId: string | null;
  prereqTitleEn: string | null;
  prereqTitleAr: string | null;
}

// Lock state is deliberately false until after client mount. Server renders the
// unlocked path; the gating route uses the existing loading skeleton during the
// hydration window so a locked URL never flashes module content before the gate.
export function useModuleLock(moduleId: string): ModuleLockState {
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const module = modules.find((m) => m.id === moduleId);
  const prereqId = module?.prerequisite ?? null;
  const prereq = prereqId ? modules.find((m) => m.id === prereqId) ?? null : null;

  const prereqLessonsCompleted = prereqId
    ? progress.modules[prereqId]?.lessonsCompleted.length ?? 0
    : 0;

  // Unlock rule mirrors /learn/page.tsx: any lesson complete in the prereq.
  const locked = mounted && prereqId !== null && prereqLessonsCompleted === 0;

  return {
    locked,
    mounted,
    prereqId,
    prereqTitleEn: prereq?.title_en ?? null,
    prereqTitleAr: prereq?.title_ar ?? null,
  };
}
