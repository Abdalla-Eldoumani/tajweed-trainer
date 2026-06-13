// Single source of truth for module gating. The rule lived as four separate
// copies (useModuleLock, /learn/page, Sidebar, MobileDrawer) and they unlocked
// on "any lesson complete in the prerequisite", which let the next module open
// before the learner ever sat the prerequisite's practice quiz. Every gate now
// reads these functions, and the rule is: a module unlocks when its
// prerequisite's practice quiz has been finished at least once.
//
// "Finished" means the prerequisite module carries at least one saved quiz
// score. Only the per-module quiz writes scores under a module id (mixed and
// review sessions save under their own keys), so presence is completion. No
// pass mark is applied: sitting the quiz is the gate, the score is feedback.

import learningPath from "@/data/content/learning-path.json";
import type { LearningModule, TajweedProgress } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export function getLearningModules(): LearningModule[] {
  return modules;
}

export function getModuleById(moduleId: string): LearningModule | null {
  return modules.find((m) => m.id === moduleId) ?? null;
}

export function getPrerequisite(moduleId: string): LearningModule | null {
  const mod = getModuleById(moduleId);
  if (!mod?.prerequisite) return null;
  return getModuleById(mod.prerequisite);
}

// True once the module's own practice quiz has been completed at least once.
export function isQuizFinished(progress: TajweedProgress, moduleId: string): boolean {
  return (progress.modules[moduleId]?.quizScores.length ?? 0) > 0;
}

// True when the module has no prerequisite, or the prerequisite's practice
// quiz has been finished. An unknown prerequisite id fails open so a content
// typo can never brick the learning path.
export function isModuleUnlocked(progress: TajweedProgress, moduleId: string): boolean {
  const mod = getModuleById(moduleId);
  if (!mod?.prerequisite) return true;
  const prereq = getModuleById(mod.prerequisite);
  if (!prereq) return true;
  return isQuizFinished(progress, prereq.id);
}

// Locked ids for the nav surfaces (sidebar, mobile drawer) in one pass.
export function getLockedModuleIds(progress: TajweedProgress): Set<string> {
  const locked = new Set<string>();
  for (const mod of modules) {
    if (!isModuleUnlocked(progress, mod.id)) locked.add(mod.id);
  }
  return locked;
}
