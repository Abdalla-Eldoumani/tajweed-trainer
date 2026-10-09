import type { PracticeQuestion, Question } from "./types";

import surahIndex from "@/data/content/surah-index.json";

import { questions as makharijQuestions } from "@/data/questions/makharij";
import { questions as noonQuestions } from "@/data/questions/noon-sakinah";
import { questions as meemQuestions } from "@/data/questions/meem-sakinah";
import { questions as ghunnahQuestions } from "@/data/questions/ghunnah";
import { questions as qalqalahQuestions } from "@/data/questions/qalqalah";
import { questions as maddQuestions } from "@/data/questions/madd";
import { questions as laamRaaQuestions } from "@/data/questions/laam-raa";
import { questions as tafkheemQuestions } from "@/data/questions/tafkheem-tarqeeq";
import { questions as waqfQuestions } from "@/data/questions/waqf";

// ---------- Authored question pool ---------- //

// Every module's questions are authored, keyed by module id.
const AUTHORED_BY_MODULE: Record<string, Question[]> = {
  makharij: makharijQuestions,
  "noon-sakinah": noonQuestions,
  "meem-sakinah": meemQuestions,
  ghunnah: ghunnahQuestions,
  qalqalah: qalqalahQuestions,
  madd: maddQuestions,
  "laam-raa": laamRaaQuestions,
  "tafkheem-tarqeeq": tafkheemQuestions,
  waqf: waqfQuestions,
};

const surahNameByNumber = new Map<number, { en: string; ar: string }>();
for (const s of surahIndex as Array<{ number: number; nameSimple: string; nameArabic: string }>) {
  surahNameByNumber.set(s.number, { en: s.nameSimple, ar: s.nameArabic });
}

// The authored pool was written answer-first, so most questions keep the correct
// option at position A. Shuffle each question's options before display so position
// carries no signal. Seed the shuffle from the question id (not Math.random) so the
// order is stable across a session and identical on server and client; a random
// order would reshuffle every render and mismatch SSR hydration.
function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rnd = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function questionToPractice(q: Question): PracticeQuestion {
  const surahName = surahNameByNumber.get(q.source.surah) ?? { en: "", ar: "" };
  const correct = q.options.find((o) => o.id === q.correctOptionId);
  const correctEn = correct?.label.en ?? "";
  const correctAr = correct?.label.ar;
  // Correctness is checked by label downstream, so shuffling the option objects
  // (en + ar together) keeps the right answer correct in both languages.
  const shown = seededShuffle(q.options, seedFromId(q.id));
  return {
    example: {
      arabic: q.arabicText,
      transliteration: "",
      translation: q.englishGloss,
      surah: q.source.surah,
      ayah: q.source.ayah,
      surah_name_en: surahName.en,
      surah_name_ar: surahName.ar,
      highlight_word: q.arabicText,
      rule_applied: correctEn,
      rule_applied_ar: correctAr,
    },
    correctAnswer: correctEn,
    correctAnswerAr: correctAr,
    options: shown.map((o) => o.label.en),
    optionsAr: shown.map((o) => o.label.ar ?? o.label.en),
    moduleId: q.moduleId,
    prompt: q.prompt,
    explanation: q.explanation,
    questionId: q.id,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------- Public API ---------- //

export function getAllQuestions(): Question[] {
  return Object.values(AUTHORED_BY_MODULE).flat();
}

// Maps every authored question id to its module id. The progress page uses it
// to attribute Leitner review entries (keyed by question id) to modules for the
// mastery view, without the mastery aggregation needing the question content.
export function getQuestionModuleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [moduleId, questions] of Object.entries(AUTHORED_BY_MODULE)) {
    for (const q of questions) map[q.id] = moduleId;
  }
  return map;
}

export function hasQuestionsForModule(moduleFilter?: string): boolean {
  if (!moduleFilter) return getAllQuestions().length > 0;
  return (AUTHORED_BY_MODULE[moduleFilter] ?? []).length > 0;
}

export function getRandomQuestions(count: number, moduleFilter?: string): PracticeQuestion[] {
  const pool = moduleFilter ? (AUTHORED_BY_MODULE[moduleFilter] ?? []) : getAllQuestions();
  return shuffle(pool).slice(0, count).map(questionToPractice);
}

// Pulls questions whose stable ids appear in `dueIds`. Returned questions are
// shuffled and capped at `count`. Ids no longer present in the authored pool
// are dropped silently (e.g., a question was renamed).
export function getDueQuestions(dueIds: string[], count: number): PracticeQuestion[] {
  if (dueIds.length === 0) return [];
  const dueSet = new Set(dueIds);
  const matched: Question[] = [];
  for (const list of Object.values(AUTHORED_BY_MODULE)) {
    for (const q of list) {
      if (dueSet.has(q.id)) matched.push(q);
    }
  }
  return shuffle(matched).slice(0, count).map(questionToPractice);
}

export function getAvailableModules(): { id: string; name: string; count: number }[] {
  const MODULE_NAMES: Record<string, string> = {
    makharij: "Makharij Al-Huroof",
    "noon-sakinah": "Noon Sakinah & Tanween",
    "meem-sakinah": "Meem Sakinah",
    ghunnah: "Ghunnah",
    qalqalah: "Qalqalah",
    madd: "Madd",
    "laam-raa": "Laam & Raa",
    "tafkheem-tarqeeq": "Heavy & Light Letters",
    waqf: "Waqf",
  };

  return Object.entries(AUTHORED_BY_MODULE)
    .filter(([, questions]) => questions.length > 0)
    .map(([id, questions]) => ({ id, name: MODULE_NAMES[id] ?? id, count: questions.length }));
}
