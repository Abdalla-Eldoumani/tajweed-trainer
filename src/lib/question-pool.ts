import type { QuranicExample, PracticeQuestion, Question } from "./types";

import noonData from "@/data/content/noon-sakinah-tanween.json";
import meemData from "@/data/content/meem-sakinah.json";
import ghunnahData from "@/data/content/ghunnah.json";
import qalqalahData from "@/data/content/qalqalah.json";
import maddData from "@/data/content/madd-rules.json";
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

interface ExampleWithModule {
  example: QuranicExample;
  moduleId: string;
  ruleName: string;
}

// ---------- Authored question pool (Phase 2) ---------- //

// Per-module authored questions take precedence over legacy random-from-examples
// for any module that has at least one authored entry. Modules with empty
// arrays fall back to legacy until they get authored.
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

function questionToPractice(q: Question): PracticeQuestion {
  const surahName = surahNameByNumber.get(q.source.surah) ?? { en: "", ar: "" };
  const correct = q.options.find((o) => o.id === q.correctOptionId);
  const correctEn = correct?.label.en ?? "";
  const correctAr = correct?.label.ar;
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
    options: q.options.map((o) => o.label.en),
    optionsAr: q.options.map((o) => o.label.ar ?? o.label.en),
    moduleId: q.moduleId,
    prompt: q.prompt,
    explanation: q.explanation,
    questionId: q.id,
  };
}

// ---------- Legacy pool (random-from-examples, pre-Phase-2) ---------- //

function collectLegacyExamples(): ExampleWithModule[] {
  const pool: ExampleWithModule[] = [];

  for (const rule of noonData.rules) {
    if (rule.examples) {
      for (const ex of rule.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "noon-sakinah", ruleName: rule.title_en });
      }
    }
    if (rule.subtypes) {
      for (const st of rule.subtypes) {
        if (st.examples) {
          for (const ex of st.examples) {
            pool.push({ example: ex as QuranicExample, moduleId: "noon-sakinah", ruleName: st.title_en });
          }
        }
      }
    }
  }

  for (const rule of meemData.rules) {
    if (rule.examples) {
      for (const ex of rule.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "meem-sakinah", ruleName: rule.title_en });
      }
    }
  }

  for (const rule of ghunnahData.rules) {
    if (rule.examples) {
      for (const ex of rule.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "ghunnah", ruleName: rule.title_en });
      }
    }
  }

  for (const level of qalqalahData.levels) {
    if (level.examples) {
      for (const ex of level.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "qalqalah", ruleName: level.title_en });
      }
    }
  }

  for (const type of maddData.types) {
    if (type.examples) {
      for (const ex of type.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "madd", ruleName: type.title_en });
      }
    }
  }

  return pool;
}

const ALL_EXAMPLES = collectLegacyExamples();

const RULE_AR_MAP: Map<string, string> = new Map();
for (const item of ALL_EXAMPLES) {
  if (item.example.rule_applied && item.example.rule_applied_ar && !RULE_AR_MAP.has(item.example.rule_applied)) {
    RULE_AR_MAP.set(item.example.rule_applied, item.example.rule_applied_ar);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function legacyToPractice(item: ExampleWithModule): PracticeQuestion {
  const correctAnswer = item.example.rule_applied;
  const correctAnswerAr = item.example.rule_applied_ar ?? RULE_AR_MAP.get(correctAnswer);
  const wrongAnswers = legacyWrongAnswers(correctAnswer, 3);
  const options = shuffle([correctAnswer, ...wrongAnswers]);
  const optionsAr = options.map((opt) => RULE_AR_MAP.get(opt) ?? opt);
  return {
    example: item.example,
    correctAnswer,
    correctAnswerAr,
    options,
    optionsAr,
    moduleId: item.moduleId,
  };
}

function legacyWrongAnswers(correctRule: string, count: number): string[] {
  const allRules = ALL_EXAMPLES.filter((e) => e.example.rule_applied !== correctRule).map(
    (e) => e.example.rule_applied,
  );
  const unique = Array.from(new Set(allRules));
  return shuffle(unique).slice(0, count);
}

// ---------- Public API ---------- //

export function getQuestionsForModule(moduleId: string): Question[] {
  return AUTHORED_BY_MODULE[moduleId] ?? [];
}

export function getAllQuestions(): Question[] {
  return Object.values(AUTHORED_BY_MODULE).flat();
}

export function hasQuestionsForModule(moduleFilter?: string): boolean {
  if (!moduleFilter) {
    if (getAllQuestions().length > 0) return true;
    return ALL_EXAMPLES.length > 0;
  }
  if ((AUTHORED_BY_MODULE[moduleFilter] ?? []).length > 0) return true;
  return ALL_EXAMPLES.some((e) => e.moduleId === moduleFilter);
}

export function getRandomQuestions(count: number, moduleFilter?: string): PracticeQuestion[] {
  if (moduleFilter) {
    const authored = AUTHORED_BY_MODULE[moduleFilter] ?? [];
    if (authored.length > 0) {
      return shuffle(authored).slice(0, count).map(questionToPractice);
    }
    const legacy = ALL_EXAMPLES.filter((e) => e.moduleId === moduleFilter);
    return shuffle(legacy).slice(0, count).map(legacyToPractice);
  }
  // Mixed pool: take all authored questions plus legacy from modules that
  // have no authored coverage yet, so the total represents every module the
  // app has any content for.
  const authoredAll = getAllQuestions().map(questionToPractice);
  const legacyForUnauthored = ALL_EXAMPLES.filter(
    (e) => (AUTHORED_BY_MODULE[e.moduleId] ?? []).length === 0,
  ).map(legacyToPractice);
  return shuffle([...authoredAll, ...legacyForUnauthored]).slice(0, count);
}

export function getAvailableModules(): { id: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  // Authored counts win when present.
  for (const [moduleId, questions] of Object.entries(AUTHORED_BY_MODULE)) {
    if (questions.length > 0) counts.set(moduleId, questions.length);
  }
  for (const ex of ALL_EXAMPLES) {
    if (counts.has(ex.moduleId)) continue;
    counts.set(ex.moduleId, (counts.get(ex.moduleId) ?? 0) + 1);
  }

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

  return Array.from(counts.entries()).map(([id, count]) => ({
    id,
    name: MODULE_NAMES[id] ?? id,
    count,
  }));
}
