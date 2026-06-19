"use client";

import { useState } from "react";
import Link from "next/link";
import { ArabicText } from "@/components/ui/ArabicText";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { formatSurahReference } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useSpeech } from "@/hooks/useSpeech";
import type { PracticeQuestion as PracticeQuestionType } from "@/lib/types";

interface PracticeQuestionProps {
  question: PracticeQuestionType;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (correct: boolean) => void;
}

export function PracticeQuestion({ question, questionNumber, totalQuestions, onAnswer }: PracticeQuestionProps) {
  const { t, lang, isAr } = useTranslation();
  const { supported: speechSupported, speaking, speak, cancel } = useSpeech();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const displayOptions = isAr && question.optionsAr ? question.optionsAr : question.options;
  const displayCorrect = isAr && question.correctAnswerAr ? question.correctAnswerAr : question.correctAnswer;
  // Authored Question records carry their own prompt; legacy random-from-examples
  // questions don't and fall back to the static "identify the rule" header.
  const promptText =
    (isAr && question.prompt?.ar) || question.prompt?.en || t("practice.identifyRule");
  const explanationText = question.explanation
    ? (isAr && question.explanation.ar) || question.explanation.en
    : null;
  const lessonHref = question.explanation?.lessonAnchor
    ? `/learn/${question.moduleId}#${question.explanation.lessonAnchor}`
    : `/learn/${question.moduleId}`;
  const wasCorrect = selectedAnswer === displayCorrect;

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelectedAnswer(option);
    setAnswered(true);
    onAnswer(option === displayCorrect);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>{t("practice.questionOf").replace("{current}", String(questionNumber)).replace("{total}", String(totalQuestions))}</span>
        <span className="text-xs">
          {formatSurahReference(
            { en: question.example.surah_name_en, ar: question.example.surah_name_ar },
            question.example.surah,
            question.example.ayah,
            lang,
          )}
        </span>
      </div>

      <Card className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs text-text-muted">{promptText}</p>
          {speechSupported && (
            <button
              type="button"
              onClick={() => (speaking ? cancel() : speak(promptText, lang))}
              aria-label={speaking ? t("speech.stop") : t("speech.read")}
              aria-pressed={speaking}
              className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors",
                speaking
                  ? "bg-primary/20 text-primary dark:text-primary-light"
                  : "text-text-muted/70 hover:text-primary hover:bg-primary/10",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {speaking ? (
                  <>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </>
                ) : (
                  <line x1="23" y1="9" x2="17" y2="15" />
                )}
              </svg>
            </button>
          )}
        </div>
        <ArabicText text={question.example.arabic} quran size="lg" />
        <div className="pt-1">
          <ArabicText
            text={question.example.highlight_word}
            quran
            size="md"
            className="font-medium text-primary dark:text-primary-light"
          />
        </div>
        <AudioPlayer surah={question.example.surah} ayah={question.example.ayah} compact className="mx-auto" />
      </Card>

      <div className="grid gap-2" role="radiogroup">
        {displayOptions.map((option, i) => {
          const isCorrect = option === displayCorrect;
          const isSelected = option === selectedAnswer;

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={cn(
                "w-full text-left p-3 rounded-lg border-2 text-sm transition-colors min-h-[48px]",
                !answered && "hover:border-primary/50 hover:bg-primary/5",
                !answered && "border-border",
                answered && isCorrect && "border-green-600 bg-green-50 dark:border-green-500 dark:bg-green-900/20",
                answered && isSelected && !isCorrect && "border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-900/20",
                answered && !isSelected && !isCorrect && "border-border opacity-50"
              )}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs shrink-0",
                  answered && isCorrect && "border-green-600 text-green-600 dark:border-green-500 dark:text-green-500",
                  answered && isSelected && !isCorrect && "border-red-600 text-red-600 dark:border-red-500 dark:text-red-500",
                  !answered && "border-border"
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

      {answered && (
        <div
          aria-live="polite"
          className={cn(
            "rounded-lg border-2 p-3 space-y-2",
            wasCorrect
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-red-500 bg-red-50 dark:bg-red-900/20",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                wasCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400",
              )}
            >
              {wasCorrect ? t("practice.feedback.correct") : t("practice.feedback.incorrect")}
            </span>
          </div>
          <p className="text-sm">
            <span className="text-text-muted">{t("practice.feedback.rule")}: </span>
            <span className="font-medium">{displayCorrect}</span>
          </p>
          {explanationText && <p className="text-sm">{explanationText}</p>}
          {question.explanation && (
            <Link
              href={lessonHref}
              className={cn(
                "inline-flex items-center text-sm font-medium min-h-[44px]",
                wasCorrect
                  ? "text-primary dark:text-primary-light hover:underline"
                  : "px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-weak transition-colors",
              )}
            >
              {t("practice.feedback.openLesson")}
              <span aria-hidden className="ms-1">{isAr ? "←" : "→"}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
