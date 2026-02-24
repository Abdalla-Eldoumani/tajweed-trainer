"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StreakCounter } from "@/components/practice/StreakCounter";

const QuizSession = dynamic(
  () => import("@/components/practice/QuizSession").then((mod) => ({ default: mod.QuizSession })),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />,
  }
);
import { getAvailableModules } from "@/lib/question-pool";

export default function PracticePage() {
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const modules = getAvailableModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Practice</h1>
        <p className="text-sm text-text-muted mt-2">
          Test your tajweed knowledge by identifying rules in Quranic examples.
        </p>
      </div>

      <StreakCounter />

      <div>
        <label htmlFor="module-filter" className="text-sm font-medium block mb-2">
          Filter by Module
        </label>
        <select
          id="module-filter"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-bg-card dark:bg-bg-card-dark text-sm"
        >
          <option value="">All Modules</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.count} examples)
            </option>
          ))}
        </select>
      </div>

      <QuizSession key={moduleFilter} moduleFilter={moduleFilter || undefined} />
    </div>
  );
}
