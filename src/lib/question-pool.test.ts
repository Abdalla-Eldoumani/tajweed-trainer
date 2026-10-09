import { describe, it, expect } from "vitest";
import {
  getAllQuestions,
  getAvailableModules,
  getDueQuestions,
  getQuestionModuleMap,
  getRandomQuestions,
  hasQuestionsForModule,
} from "@/lib/question-pool";

const all = getAllQuestions();
const byId = new Map(all.map((q) => [q.id, q]));

describe("question pool coverage", () => {
  it("lists the nine modules and their counts add up to the whole pool", () => {
    const modules = getAvailableModules();
    expect(modules).toHaveLength(9);
    expect(modules.every((m) => m.count > 0 && m.name.length > 0)).toBe(true);
    expect(modules.reduce((sum, m) => sum + m.count, 0)).toBe(all.length);
  });

  it("maps every question id to its module", () => {
    const map = getQuestionModuleMap();
    expect(Object.keys(map)).toHaveLength(all.length);
    for (const q of all) expect(map[q.id]).toBe(q.moduleId);
  });

  it("reports content only for modules that have questions", () => {
    expect(hasQuestionsForModule()).toBe(true);
    expect(hasQuestionsForModule("madd")).toBe(true);
    expect(hasQuestionsForModule("no-such-module")).toBe(false);
  });
});

describe("getRandomQuestions", () => {
  it("honours the count and the module filter", () => {
    const picked = getRandomQuestions(5, "qalqalah");
    expect(picked).toHaveLength(5);
    expect(picked.every((p) => p.moduleId === "qalqalah")).toBe(true);
  });

  it("returns an empty list for a module with no questions", () => {
    expect(getRandomQuestions(5, "no-such-module")).toEqual([]);
  });

  it("keeps the English and Arabic options paired and the right answer present", () => {
    for (const p of getRandomQuestions(60)) {
      const source = byId.get(p.questionId)!;
      expect(p.options).toContain(p.correctAnswer);
      expect(p.options).toHaveLength(source.options.length);
      p.options.forEach((en, i) => {
        const option = source.options.find((o) => o.label.en === en)!;
        expect(p.optionsAr![i]).toBe(option.label.ar ?? option.label.en);
      });
    }
  });

  it("orders a question's options the same way every time", () => {
    const first = getRandomQuestions(all.length);
    const second = getRandomQuestions(all.length);
    const orderOf = (list: typeof first) => new Map(list.map((p) => [p.questionId, p.options.join("|")]));
    const a = orderOf(first);
    for (const [id, order] of orderOf(second)) expect(a.get(id)).toBe(order);
  });
});

describe("getDueQuestions", () => {
  it("returns only the requested ids and drops unknown ones", () => {
    const ids = [all[0].id, all[7].id, "removed-question-id"];
    const due = getDueQuestions(ids, 10);
    expect(due.map((d) => d.questionId).sort()).toEqual([all[0].id, all[7].id].sort());
  });

  it("returns nothing when no ids are due, and caps at the count", () => {
    expect(getDueQuestions([], 5)).toEqual([]);
    expect(getDueQuestions(all.slice(0, 8).map((q) => q.id), 3)).toHaveLength(3);
  });
});
