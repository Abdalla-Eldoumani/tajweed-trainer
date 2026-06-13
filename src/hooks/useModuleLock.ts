"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import { getPrerequisite, isModuleUnlocked, isQuizFinished } from "@/lib/module-unlock";

export interface ModuleLockState {
  locked: boolean;
  mounted: boolean;
  prereqId: string | null;
  prereqTitleEn: string | null;
  prereqTitleAr: string | null;
  // True when the prerequisite's practice quiz has been finished. The locked
  // screen uses this to point the learner at the right next step.
  prereqQuizFinished: boolean;
}

// Lock state is deliberately false until after client mount. Server renders the
// unlocked path; the gating route uses the existing loading skeleton during the
// hydration window so a locked URL never flashes module content before the gate.
// The unlock rule itself lives in src/lib/module-unlock.ts and is shared with
// /learn, the sidebar, the mobile drawer, and the practice hub: a module opens
// once its prerequisite's practice quiz has been finished.
export function useModuleLock(moduleId: string): ModuleLockState {
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const prereq = getPrerequisite(moduleId);
  const locked = mounted && !isModuleUnlocked(progress, moduleId);

  return {
    locked,
    mounted,
    prereqId: prereq?.id ?? null,
    prereqTitleEn: prereq?.title_en ?? null,
    prereqTitleAr: prereq?.title_ar ?? null,
    prereqQuizFinished: prereq ? isQuizFinished(progress, prereq.id) : true,
  };
}
