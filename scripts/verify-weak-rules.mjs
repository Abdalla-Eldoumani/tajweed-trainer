#!/usr/bin/env node
// Per-module miss ranking verification. Imports the REAL getMissedByModule from
// src/lib/weak-rules.ts (Node strips the types; the module imports only types, so
// it loads without the content layer) and asserts the attribution + ranking math
// against synthetic Leitner review history. Pure and offline.

import { getMissedByModule } from "../src/lib/weak-rules.ts";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

const today = "2026-06-21";
const empty = { modules: {}, reviews: {} };
// Only the counters matter; box/dates are filler ReviewState shape.
const rev = (seen, correct) => ({ box: 1, nextDueDate: "", lastSeenDate: "", timesSeen: seen, timesCorrect: correct });

// 1. Empty reviews: every module row is missed 0 / seen 0, all ids present.
{
  const rows = getMissedByModule(empty, {}, ["makharij", "ghunnah"], today);
  record(
    "empty history -> all rows missed 0 / seen 0",
    rows.length === 2 && rows.every((r) => r.missed === 0 && r.seen === 0),
    JSON.stringify(rows),
  );
}

// 2. Misses attributed per module: seen 5 / correct 2 -> missed 3, seen 5.
{
  const reviews = { q1: rev(5, 2) };
  const [r] = getMissedByModule({ modules: {}, reviews }, { q1: "makharij" }, ["makharij"], today);
  record("seen 5 / correct 2 -> missed 3, seen 5", r.missed === 3 && r.seen === 5, `missed ${r.missed} seen ${r.seen}`);
}

// 3. Two questions in the same module sum their misses and their seen counts.
{
  const reviews = { q1: rev(5, 2), q2: rev(4, 1) }; // misses 3 + 3 = 6, seen 5 + 4 = 9
  const map = { q1: "makharij", q2: "makharij" };
  const [r] = getMissedByModule({ modules: {}, reviews }, map, ["makharij"], today);
  record("two questions in a module sum misses + seen", r.missed === 6 && r.seen === 9, `missed ${r.missed} seen ${r.seen}`);
}

// 4. An unmapped questionId is ignored (mirrors mastery's qX-unmapped case).
{
  const reviews = { q1: rev(5, 2), qX: rev(9, 0) }; // qX has no module -> dropped
  const map = { q1: "makharij" };
  const [r] = getMissedByModule({ modules: {}, reviews }, map, ["makharij"], today);
  record("unmapped questionId ignored", r.missed === 3 && r.seen === 5, `missed ${r.missed} seen ${r.seen}`);
}

// 5. Ranking: more misses sorts first; a never-practiced module (seen 0) sorts
//    after any module with misses; ties break by moduleIds order (stable).
{
  const reviews = { q1: rev(3, 0), q2: rev(9, 0) }; // ghunnah missed 3, qalqalah missed 9
  const map = { q1: "ghunnah", q2: "qalqalah" };
  // makharij is in the id list but has no reviews (seen 0) -> must sort last.
  const rows = getMissedByModule({ modules: {}, reviews }, map, ["makharij", "ghunnah", "qalqalah"], today);
  const order = rows.map((r) => r.moduleId);
  record(
    "most-missed first, unseen module last",
    order[0] === "qalqalah" && order[1] === "ghunnah" && order[2] === "makharij",
    order.join(" > "),
  );
}

// 5b. Tie on misses breaks deterministically by moduleIds order.
{
  const reviews = { q1: rev(4, 1), q2: rev(4, 1) }; // both missed 3
  const map = { q1: "ghunnah", q2: "makharij" };
  const rows = getMissedByModule({ modules: {}, reviews }, map, ["makharij", "ghunnah"], today);
  const order = rows.map((r) => r.moduleId);
  record("equal misses break by moduleIds order", order[0] === "makharij" && order[1] === "ghunnah", order.join(" > "));
}

// 6. Malformed counts (timesCorrect > timesSeen) never yield a negative missed.
{
  const reviews = { q1: rev(2, 5) }; // would be -3 unclamped
  const [r] = getMissedByModule({ modules: {}, reviews }, { q1: "makharij" }, ["makharij"], today);
  record("correct > seen clamps missed at 0", r.missed === 0, `missed ${r.missed}`);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} weak-rules checks passed.`);
process.exit(passed === results.length ? 0 : 1);
