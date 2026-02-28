"use client";

import { useState } from "react";
import { ArabicText } from "@/components/ui/ArabicText";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatSurahReference } from "@/lib/utils";
import type { PracticeQuestion as PracticeQuestionType } from "@/lib/types";

interface PracticeQuestionProps {
  question: PracticeQuestionType;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (correct: boolean) => void;
}

export function PracticeQuestion({ question, questionNumber, totalQuestions, onAnswer }: PracticeQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelectedAnswer(option);
    setAnswered(true);
    onAnswer(option === question.correctAnswer);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>Question {questionNumber} of {totalQuestions}</span>
        <span className="text-xs">
          {formatSurahReference(question.example.surah_name_en, question.example.surah, question.example.ayah)}
        </span>
      </div>

      <Card className="text-center space-y-3">
        <p className="text-xs text-text-muted">Identify the tajweed rule for the highlighted word:</p>
        <ArabicText text={question.example.arabic} quran size="lg" />
        <div className="pt-1">
          <span className="text-xs font-medium text-primary dark:text-primary-light">
            {question.example.highlight_word}
          </span>
        </div>
        <AudioPlayer surah={question.example.surah} ayah={question.example.ayah} compact className="mx-auto" />
      </Card>

      <div className="grid gap-2" role="radiogroup">
        {question.options.map((option, i) => {
          const isCorrect = option === question.correctAnswer;
          const isSelected = option === selectedAnswer;

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={cn(
                "w-full text-left p-3 rounded-lg border-2 text-sm transition-colors min-h-[48px]",
                !answered && "hover:border-primary/50 hover:bg-primary/5",
                !answered && "border-gray-200 dark:border-gray-700",
                answered && isCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                answered && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20",
                answered && !isSelected && !isCorrect && "border-gray-200 dark:border-gray-700 opacity-50"
              )}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs shrink-0",
                  answered && isCorrect && "border-green-500 text-green-500",
                  answered && isSelected && !isCorrect && "border-red-500 text-red-500",
                  !answered && "border-gray-300 dark:border-gray-600"
                )}>
                  {answered && isCorrect && "\u2713"}
                  {answered && isSelected && !isCorrect && "\u2717"}
                </span>
                <span className="line-clamp-2">{option}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
