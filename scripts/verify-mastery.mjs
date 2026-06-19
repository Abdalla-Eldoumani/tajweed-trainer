#!/usr/bin/env node
// Mastery aggregation verification. Imports the REAL getModuleMastery from
// src/lib/mastery.ts (Node strips the types; the module imports only types, so
// it loads without the content layer) and asserts the per-module derivation
// against synthetic progress. Pure and offline.

import { getModuleMastery } from "../src/lib/mastery.ts";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

const today = "2026-06-13";
const empty = { modules: {}, reviews: {} };
const mod = (quizScores) => ({ lessonsCompleted: [], quizScores, lastAccessed: "" });
const rev = (box, due) => ({ box, nextDueDate: due, lastSeenDate: "", timesSeen: 1, timesCorrect: 1 });

// 1. Fresh user: every module untouched.
{
  const rows = getModuleMastery(empty, {}, ["makharij", "ghunnah"], today);
  record("fresh user -> all untouched", rows.every((r) => r.level === "untouched" && r.bestScore === null && r.quizzesTaken === 0), JSON.stringify(rows.map((r) => r.level)));
}

// 2. latestScore is the entry with the max date; bestScore is the max.
{
  const p = { modules: { makharij: mod([{ lessonId: "quiz", score: 70, date: "2026-01-01" }, { lessonId: "quiz", score: 90, date: "2026-01-03" }, { lessonId: "quiz", score: 50, date: "2026-01-02" }]) }, reviews: {} };
  const [r] = getModuleMastery(p, {}, ["makharij"], today);
  record("best=max score, latest=newest date", r.bestScore === 90 && r.latestScore === 90 && r.quizzesTaken === 3, `best ${r.bestScore} latest ${r.latestScore}`);
}

// 3. Level thresholds.
{
  const lvl = (score, reviews, map) => getModuleMastery({ modules: { m: mod([{ lessonId: "quiz", score, date: "2026-01-01" }]) }, reviews: reviews ?? {} }, map ?? {}, ["m"], today)[0].level;
  record("best>=80 with no reviews -> strong", lvl(85) === "strong", lvl(85));
  record("best 60-79 -> practiced", lvl(70) === "practiced", lvl(70));
  record("best <60, no mastery -> started", lvl(40) === "started", lvl(40));
}

// 4. Review aggregation: mapped reviews count per module; box 5 = mastered; due by date.
{
  const reviews = { q1: rev(5, "2999-01-01"), q2: rev(2, "2020-01-01"), q3: rev(3, "2999-01-01"), qX: rev(5, "2020-01-01") };
  const map = { q1: "makharij", q2: "makharij", q3: "makharij" }; // qX unmapped -> ignored
  const [r] = getModuleMastery({ modules: {}, reviews }, map, ["makharij"], today);
  record("reviewed counts mapped questions only", r.reviewed === 3, `reviewed ${r.reviewed}`);
  record("mastered counts box 5", r.mastered === 1, `mastered ${r.mastered}`);
  record("due counts nextDueDate <= today", r.due === 1, `due ${r.due}`);
}

// 5. strong needs >=60% mastered when reviews exist.
{
  const reviews = { q1: rev(5, "2999-01-01"), q2: rev(1, "2999-01-01"), q3: rev(1, "2999-01-01") }; // 1/3 mastered
  const map = { q1: "m", q2: "m", q3: "m" };
  const [r] = getModuleMastery({ modules: { m: mod([{ lessonId: "quiz", score: 95, date: "2026-01-01" }]) }, reviews }, map, ["m"], today);
  record("high score but low mastered ratio -> not strong", r.level !== "strong", `level ${r.level}, ratio 1/3`);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} mastery checks passed.`);
process.exit(passed === results.length ? 0 : 1);
