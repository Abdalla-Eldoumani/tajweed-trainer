"use client";

import { useState, useCallback, useMemo } from "react";
import { PracticeQuestion } from "./PracticeQuestion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getRandomQuestions, hasQuestionsForModule, getDueQuestions } from "@/lib/question-pool";
import { useProgress } from "@/hooks/useProgress";
import { useReviews } from "@/hooks/useReviews";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "@/lib/i18n";
import type { PracticeQuestion as PracticeQuestionType } from "@/lib/types";

export type QuizMode = "random" | "review";

interface QuizSessionProps {
  moduleFilter?: string;
  mode?: QuizMode;
}

export function QuizSession({ moduleFilter, mode = "random" }: QuizSessionProps) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<PracticeQuestionType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { saveQuizScore, updateStreak } = useProgress();
  const { dueIds, recordReview } = useReviews();
  const { record: recordAnalytics } = useAnalytics();

  const hasQuestions = useMemo(() => hasQuestionsForModule(moduleFilter), [moduleFilter]);
  const dueCount = useMemo(() => (mode === "review" ? dueIds().length : 0), [mode, dueIds]);

  const startQuiz = useCallback(() => {
    const qs = mode === "review" ? getDueQuestions(dueIds(), 10) : getRandomQuestions(10, moduleFilter);
    if (qs.length === 0) return;
    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setStarted(true);
    setTransitioning(false);
    recordAnalytics(mode === "review" ? "review.start" : "quiz.start", moduleFilter);
  }, [mode, dueIds, moduleFilter, recordAnalytics]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) setScore((s) => s + 1);
      setTransitioning(true);

      const currentQuestion = questions[currentIndex];
      if (currentQuestion?.questionId) {
        recordReview(currentQuestion.questionId, correct);
      }

      // 3000ms gives users a beat to read the post-answer feedback before
      // auto-advancing.
      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          setFinished(true);
          const finalScore = correct ? score + 1 : score;
          const percentage = Math.round((finalScore / questions.length) * 100);
          const moduleKey = mode === "review" ? "review" : moduleFilter ?? "mixed";
          saveQuizScore(moduleKey, mode === "review" ? "review" : "quiz", percentage);
          updateStreak();
          recordAnalytics("quiz.finish", `${moduleKey}:${percentage}`);
        } else {
          setCurrentIndex((i) => i + 1);
        }
        setTransitioning(false);
      }, 3000);
    },
    [currentIndex, questions, score, mode, moduleFilter, saveQuizScore, updateStreak, recordReview, recordAnalytics]
  );

  if (!started) {
    if (mode === "review") {
      return (
        <Card className="text-center space-y-4">
          <h2 className="font-heading font-semibold text-lg">{t("review.title")}</h2>
          {dueCount > 0 ? (
            <>
              <p className="text-sm text-text-muted">
                {t("review.dueCount").replace("{count}", String(dueCount))}
              </p>
              <Button onClick={startQuiz} size="lg">
                {t("review.startReview")}
              </Button>
            </>
          ) : (
            <p className="text-sm text-text-muted">{t("review.empty")}</p>
          )}
        </Card>
      );
    }
    return (
      <Card className="text-center space-y-4">
        <h2 className="font-heading font-semibold text-lg">{t("practice.title")}</h2>
        {hasQuestions ? (
          <>
            <p className="text-sm text-text-muted">
              {t("practice.description")}
            </p>
            <Button onClick={startQuiz} size="lg">
              {t("practice.startQuiz")}
            </Button>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            {t("practice.allModules")}
          </p>
        )}
      </Card>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="text-center space-y-4">
        <h2 className="font-heading font-semibold text-lg">{t("practice.quizComplete")}</h2>
        <div className="text-4xl font-bold text-primary dark:text-primary-light">
          {score}/{questions.length}
        </div>
        <p className="text-sm text-text-muted">{percentage}% {t("practice.correct")}</p>
        <ProgressBar value={percentage} color={percentage >= 70 ? "#169200" : percentage >= 40 ? "#D98000" : "#D50000"} />
        <p className="text-sm">
          {percentage >= 80 ? t("practice.wellDone") : percentage >= 60 ? t("practice.goodProgress") : t("practice.keepReviewing")}
        </p>
        <Button onClick={startQuiz}>{t("practice.tryAgain")}</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ProgressBar value={currentIndex + 1} max={questions.length} showLabel />
      <div className={transitioning ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
        <PracticeQuestion
          key={currentIndex}
          question={questions[currentIndex]}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
        />
      </div>
      {transitioning && (
        <p className="text-center text-xs text-text-muted animate-pulse">
          {t("practice.loadingQuestion")}
        </p>
      )}
    </div>
  );
}
