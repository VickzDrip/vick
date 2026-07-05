"use strict";

/* Offline test for the from-scratch CART decision tree (ML groundwork —
   see src/tree.js's doc-comment for why this exists alongside train.js's
   logistic regression: it can learn N-way interactions on its own,
   without needing a hand-built feature for every combination). */

const assert = require("assert");
const tree = require("../src/tree");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected) + ")"); }
}

/* 1) gini() sanity: pure node is 0 impurity, perfectly split node is
   maximal (0.5) impurity. */
eq(tree.gini([{ label: 1 }, { label: 1 }, { label: 1 }]), 0, "gini of an all-favorable node is 0");
eq(tree.gini([{ label: 0 }, { label: 0 }]), 0, "gini of an all-unfavorable node is 0");
eq(tree.gini([{ label: 1 }, { label: 0 }]), 0.5, "gini of a perfectly split node is 0.5");
eq(tree.gini([]), 0, "gini of an empty node is 0 (no crash)");

/* 2) A pure 3-way interaction: favorable ONLY when features A, B, AND C
   are all 1 (a bit of label noise to stay realistic). This is NOT
   representable by any linear combination of independent weights, nor by
   any single pairwise product (A&B alone, or B&C alone, etc. all fire on
   cases that should stay unfavorable) — only a genuine 3-condition rule
   solves it. A depth-4 tree should find exactly that rule. */
const names = ["A", "B", "C", "D", "E"]; // D, E are pure noise
const examples = [];
for (let i = 0; i < 1000; i++) {
  const A = i % 2, B = (i >> 1) % 2, C = (i >> 2) % 2;
  const D = i % 3 === 0 ? 1 : 0, E = i % 5 === 0 ? 1 : 0; // uncorrelated with outcome
  const allThree = A && B && C;
  const favorable = allThree ? (i % 9 !== 0) : (i % 13 === 0);
  examples.push({ features: [A, B, C, D, E], label: favorable ? 1 : 0 });
}
const trainSet = examples.slice(0, 800);
const testSet = examples.slice(800);

const model = tree.fit(trainSet, names, { maxDepth: 4, minSamplesSplit: 20, minSamplesLeaf: 10 });
const acc = tree.evaluate(model, testSet);
ok(acc > 0.85, "tree solves a pure 3-way AND pattern well on held-out data (got " + acc + ")");

/* 3) Feature importance should put A, B, C well above the noise features
   D, E, and should sum to 1 (a normalized "share of the tree's decisions"). */
const imp = tree.featureImportance(model, trainSet.length);
const sumImp = Object.values(imp).reduce((a, b) => a + b, 0);
ok(Math.abs(sumImp - 1) < 0.01, "feature importance normalizes to ~1 (rounded per-feature, got " + sumImp + ")");
ok(imp.A > imp.D && imp.B > imp.D && imp.C > imp.D, "the three real signal features outrank a noise feature (imp=" + JSON.stringify(imp) + ")");
ok(imp.A > imp.E && imp.B > imp.E && imp.C > imp.E, "the three real signal features outrank the other noise feature");

/* 4) extractRules surfaces a high-confidence rule whose conditions are
   exactly "A, B, and C all on the > 0.5 side" — the tree's version of
   train.js's pairWeights, but for an arbitrary-depth combo it found on
   its own instead of one a human had to name in advance. */
const rules = tree.extractRules(model, k => k);
ok(rules.length > 0, "extractRules returns at least one rule");
const top = rules[0];
ok(top.prob > 0.7, "the top rule's leaf is a strongly favorable one (got " + top.prob + ")");
const usesAllThree = ["A", "B", "C"].every(n => top.conditions.some(c => c.name === n && c.dir === "right"));
ok(usesAllThree, "the top rule's path actually conditions on A, B, and C all being true (got " + JSON.stringify(top.conditions.map(c => c.text)) + ")");

/* 5) A tree given only noise (features and label both genuinely
   independent of each other) shouldn't generalize to anything better than
   chance on held-out data — it may still carve up TRAIN sampling noise
   (that's the overfitting minSamplesLeaf/minSamplesSplit exist to limit),
   but that carving can't transfer to examples it never saw. Uses a seeded
   PRNG (not Math.random()) so the assertion range is checked against a
   fixed, reproducible dataset instead of a new random draw every run. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);
const pureNoise = [];
for (let i = 0; i < 1200; i++) {
  pureNoise.push({ features: [rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0], label: rnd() < 0.5 ? 1 : 0 });
}
const noiseModel = tree.fit(pureNoise.slice(0, 900), ["x", "y", "z"], { maxDepth: 4, minSamplesSplit: 40, minSamplesLeaf: 20 });
const noiseAcc = tree.evaluate(noiseModel, pureNoise.slice(900));
ok(noiseAcc > 0.35 && noiseAcc < 0.65, "on genuinely independent noise, held-out accuracy stays near chance (got " + noiseAcc + ")");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
