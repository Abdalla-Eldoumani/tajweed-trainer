"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ColorLegend } from "@/components/learn/ColorLegend";
import { useProgress } from "@/hooks/useProgress";
import learningPath from "@/data/content/learning-path.json";
import type { LearningModule } from "@/lib/types";

const modules = learningPath.modules as LearningModule[];

export default function HomePage() {
  const { progress, getOverallCompletion } = useProgress();

  const totalLessons: Record<string, number> = {};
  for (const m of modules) {
    totalLessons[m.id] = m.lessons_count;
  }
  const overall = getOverallCompletion(totalLessons);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold">
          Tajweed Trainer
        </h1>
        <p className="font-arabic text-arabic-md text-text-muted mt-2" dir="rtl" lang="ar">
          تجويد القرآن الكريم
        </p>
        <p className="text-text-muted mt-4 max-w-md mx-auto">
          Learn the rules of proper Quran recitation through interactive lessons,
          color-coded text, and audio examples.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/learn">
            <Button size="lg">Start Learning</Button>
          </Link>
          <Link href="/practice">
            <Button variant="outline" size="lg">Practice</Button>
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      {overall > 0 && (
        <Card>
          <h2 className="font-heading font-semibold mb-3">Your Progress</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-2xl font-bold text-primary dark:text-primary-light">{overall}%</div>
            <div className="flex-1">
              <ProgressBar value={overall} />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <span>Streak: {progress.streaks.currentStreak} days</span>
            <span>Best: {progress.streaks.longestStreak} days</span>
          </div>
        </Card>
      )}

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="text-2xl mb-2">9</div>
          <h3 className="font-heading font-semibold text-sm">Learning Modules</h3>
          <p className="text-xs text-text-muted mt-1">
            From articulation points to stopping rules, covering all essential tajweed topics.
          </p>
        </Card>

        <Card>
          <div className="text-2xl mb-2" style={{ color: "#169200" }}>A</div>
          <h3 className="font-heading font-semibold text-sm">Color-Coded Text</h3>
          <p className="text-xs text-text-muted mt-1">
            See tajweed rules highlighted in real Quranic text using the standard color-coding system.
          </p>
        </Card>

        <Card>
          <div className="text-2xl mb-2">&#x266B;</div>
          <h3 className="font-heading font-semibold text-sm">Audio Examples</h3>
          <p className="text-xs text-text-muted mt-1">
            Listen to correct pronunciation from renowned reciters like Al-Husary and Alafasy.
          </p>
        </Card>

        <Card>
          <div className="text-2xl mb-2">?</div>
          <h3 className="font-heading font-semibold text-sm">Practice Quizzes</h3>
          <p className="text-xs text-text-muted mt-1">
            Test your knowledge by identifying tajweed rules in real Quranic examples.
          </p>
        </Card>

        <Card>
          <div className="text-2xl mb-2">#</div>
          <h3 className="font-heading font-semibold text-sm">Progress Tracking</h3>
          <p className="text-xs text-text-muted mt-1">
            Track completed lessons, quiz scores, and maintain your daily practice streak.
          </p>
        </Card>

        <Card>
          <div className="text-2xl mb-2">Hafs</div>
          <h3 className="font-heading font-semibold text-sm">Hafs 'an 'Asim</h3>
          <p className="text-xs text-text-muted mt-1">
            All rules follow the most widely used Qira'ah globally, with verified scholarly sources.
          </p>
        </Card>
      </div>

      {/* Color Legend */}
      <ColorLegend />

      {/* Learning Path Preview */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-3">Learning Path</h2>
        <div className="space-y-2">
          {modules.map((module) => (
            <Link key={module.id} href={`/learn/${module.id}`}>
              <div className="flex items-center gap-3 p-3 min-h-[44px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light flex items-center justify-center text-xs font-bold">
                  {module.order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{module.title_en}</p>
                  <p className="text-xs text-text-muted truncate">{module.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
