import { PracticeHub } from "@/components/practice/PracticeHub";
import { getAvailableModules } from "@/lib/question-pool";

// Server component: the question pool (all lesson content) is walked here at
// build time to derive per-module counts, which pass to the client hub as
// plain props. The pool itself never enters the client bundle.
export default function PracticePage() {
  const counts: Record<string, number> = {};
  let totalQuestions = 0;
  for (const m of getAvailableModules()) {
    counts[m.id] = m.count;
    totalQuestions += m.count;
  }
  return <PracticeHub counts={counts} totalQuestions={totalQuestions} />;
}
