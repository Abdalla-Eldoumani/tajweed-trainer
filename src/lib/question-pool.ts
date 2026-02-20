import type { QuranicExample, PracticeQuestion } from "./types";

import noonData from "@/data/content/noon-sakinah-tanween.json";
import meemData from "@/data/content/meem-sakinah.json";
import ghunnahData from "@/data/content/ghunnah.json";
import qalqalahData from "@/data/content/qalqalah.json";
import maddData from "@/data/content/madd-rules.json";

interface ExampleWithModule {
  example: QuranicExample;
  moduleId: string;
  ruleName: string;
}

function collectExamples(): ExampleWithModule[] {
  const pool: ExampleWithModule[] = [];

  // Noon Sakinah
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

  // Meem Sakinah
  for (const rule of meemData.rules) {
    if (rule.examples) {
      for (const ex of rule.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "meem-sakinah", ruleName: rule.title_en });
      }
    }
  }

  // Ghunnah
  for (const rule of ghunnahData.rules) {
    if (rule.examples) {
      for (const ex of rule.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "ghunnah", ruleName: rule.title_en });
      }
    }
  }

  // Qalqalah
  for (const level of qalqalahData.levels) {
    if (level.examples) {
      for (const ex of level.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "qalqalah", ruleName: level.title_en });
      }
    }
  }

  // Madd
  for (const type of maddData.types) {
    if (type.examples) {
      for (const ex of type.examples) {
        pool.push({ example: ex as QuranicExample, moduleId: "madd", ruleName: type.title_en });
      }
    }
  }

  return pool;
}

const ALL_EXAMPLES = collectExamples();

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getRandomQuestions(count: number, moduleFilter?: string): PracticeQuestion[] {
  let pool = ALL_EXAMPLES;
  if (moduleFilter) {
    pool = pool.filter((e) => e.moduleId === moduleFilter);
  }

  const shuffled = shuffle(pool).slice(0, count);

  return shuffled.map((item) => {
    const correctAnswer = item.example.rule_applied;
    const wrongAnswers = getWrongAnswers(correctAnswer, item.moduleId, 3);
    const options = shuffle([correctAnswer, ...wrongAnswers]);

    return {
      example: item.example,
      correctAnswer,
      options,
      moduleId: item.moduleId,
    };
  });
}

function getWrongAnswers(correctRule: string, moduleId: string, count: number): string[] {
  const allRules = ALL_EXAMPLES
    .filter((e) => e.example.rule_applied !== correctRule)
    .map((e) => e.example.rule_applied);

  const unique = Array.from(new Set(allRules));
  return shuffle(unique).slice(0, count);
}

export function hasQuestionsForModule(moduleFilter?: string): boolean {
  if (!moduleFilter) return ALL_EXAMPLES.length > 0;
  return ALL_EXAMPLES.some((e) => e.moduleId === moduleFilter);
}

export function getAvailableModules(): { id: string; name: string; count: number }[] {
  const modules = new Map<string, number>();
  for (const ex of ALL_EXAMPLES) {
    modules.set(ex.moduleId, (modules.get(ex.moduleId) ?? 0) + 1);
  }

  const MODULE_NAMES: Record<string, string> = {
    "noon-sakinah": "Noon Sakinah & Tanween",
    "meem-sakinah": "Meem Sakinah",
    "ghunnah": "Ghunnah",
    "qalqalah": "Qalqalah",
    "madd": "Madd",
  };

  return Array.from(modules.entries()).map(([id, count]) => ({
    id,
    name: MODULE_NAMES[id] ?? id,
    count,
  }));
}
