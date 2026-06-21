import type { TajweedProgress } from "./types";

// Per-MODULE (not per-rule) most-missed ranking. Per-rule is deliberately not
// attempted: the authored questions carry no rule id and their options are
// factual answers, not rule names (question-pool sets rule_applied to the literal
// option label), so deriving a rule from an option would fabricate a
// classification (CONST-01). Each of the nine modules is a tajweed rule family,
// so attributing misses to the module is honest and links cleanly to
// /practice/[module]. This lib returns moduleId + counts only; it never holds a
// display name (those come from verified nav-data, never authored here).

export interface ModuleMissCount {
  moduleId: string;
  missed: number; // sum of (timesSeen - timesCorrect), clamped at 0, over the module's reviewed questions
  seen: number; // sum of timesSeen over the module's reviewed questions
}

// Pure aggregation of saved progress into per-module miss rows. The caller passes
// the question -> module map (built from the pool) and the module id order, so
// this function has no content or storage imports (mirrors mastery.ts). `today`
// is accepted for signature parity with mastery.ts / the verify pattern; this
// metric is history-based, so it is unused.
export function getMissedByModule(
  progress: TajweedProgress,
  questionModuleMap: Record<string, string>,
  moduleIds: string[],
  today: string,
): ModuleMissCount[] {
  void today;

  // One pass over reviews, attributing each question's misses to its module.
  const agg: Record<string, { missed: number; seen: number }> = {};
  for (const [qid, state] of Object.entries(progress.reviews ?? {})) {
    const m = questionModuleMap[qid];
    if (!m) continue;
    const a = (agg[m] ??= { missed: 0, seen: 0 });
    a.missed += Math.max(0, state.timesSeen - state.timesCorrect);
    a.seen += state.timesSeen;
  }

  const rows: ModuleMissCount[] = moduleIds.map((moduleId) => {
    const a = agg[moduleId] ?? { missed: 0, seen: 0 };
    return { moduleId, missed: a.missed, seen: a.seen };
  });

  // Most-missed first. A module the user never practiced (seen 0) is never
  // surfaced as "weak", so it always sorts after any practiced module. Remaining
  // ties break by the caller's moduleIds order, so the result is stable.
  const orderOf = new Map(moduleIds.map((id, i) => [id, i]));
  return rows.sort((x, y) => {
    const xUnseen = x.seen === 0 ? 1 : 0;
    const yUnseen = y.seen === 0 ? 1 : 0;
    if (xUnseen !== yUnseen) return xUnseen - yUnseen;
    if (x.missed !== y.missed) return y.missed - x.missed;
    return (orderOf.get(x.moduleId) ?? 0) - (orderOf.get(y.moduleId) ?? 0);
  });
}
