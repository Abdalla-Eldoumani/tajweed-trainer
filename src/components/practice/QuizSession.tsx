"use client";

import { useState, useCallback, useMemo } from "react";
import { PracticeQuestion } from "./PracticeQuestion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getRandomQuestions, hasQuestionsForModule } from "@/lib/question-pool";
import { useProgress } from "@/hooks/useProgress";
import { useTranslation } from "@/lib/i18n";
import type { PracticeQuestion as PracticeQuestionType } from "@/lib/types";

interface QuizSessionProps {
  moduleFilter?: string;
}

export function QuizSession({ moduleFilter }: QuizSessionProps) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<PracticeQuestionType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const { saveQuizScore, updateStreak } = useProgress();

  const hasQuestions = useMemo(() => hasQuestionsForModule(moduleFilter), [moduleFilter]);

  const startQuiz = useCallback(() => {
    const qs = getRandomQuestions(10, moduleFilter);
    if (qs.length === 0) return;
    setQuestions(qs);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setStarted(true);
    setTransitioning(false);
  }, [moduleFilter]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) setScore((s) => s + 1);
      setTransitioning(true);

      setTimeout(() => {
        if (currentIndex + 1 >= questions.length) {
          setFinished(true);
          const finalScore = correct ? score + 1 : score;
          const percentage = Math.round((finalScore / questions.length) * 100);
          saveQuizScore(moduleFilter ?? "mixed", "quiz", percentage);
          updateStreak();
        } else {
          setCurrentIndex((i) => i + 1);
        }
        setTransitioning(false);
      }, 1500);
    },
    [currentIndex, questions.length, score, moduleFilter, saveQuizScore, updateStreak]
  );

  if (!started) {
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
