"use strict";

/* ── Decision tree — learns interactions natively, no hand-crafted pairs ──
   train.js's logistic regression is additive: even with the 15 pair
   features added, it can only ever see interactions the pairs were
   explicitly built for (2 blocks at a time). A real 3-way effect ("only
   favorable when A, B, AND C are all true") needs a hand-built triple
   feature to be visible to it at all — and the combinatorial cost of hand-
   building every N-way combination explodes fast (57 more features beyond
   pairs, most of which would fire on a handful of examples each).

   A CART-style decision tree sidesteps this entirely: every split can
   condition on a DIFFERENT feature than the one above it, so a path from
   root to leaf is itself an arbitrary-depth interaction ("if OI rising,
   AND (within that) RSI < 32, AND (within THAT) LSR falling → 82%
   favorable") without ever being told in advance which features to
   combine. It finds combos on its own, up to `maxDepth` deep, from
   whatever features actually separate the data — no external ML
   dependency, same philosophy as train.js.

   This trains and reports a candidate model; nothing wires it into the
   live score (see train.js's trainSide, which fits both this and the
   logistic model on the same data/split and reports both testAccuracy
   numbers so the honest comparison decides which one's worth using). */

function round3(x) { return Math.round(x * 1000) / 1000; }

function gini(examples) {
  const n = examples.length;
  if (!n) return 0;
  let pos = 0;
  for (const e of examples) pos += e.label;
  const p = pos / n;
  return 1 - p * p - (1 - p) * (1 - p);
}

/* Candidate thresholds for a feature: boolean/pair features are already
   0/1 so the only meaningful split is at 0.5; continuous (normalized)
   features get a handful of quantile-ish cut points from the examples
   actually present, so the search stays fast even with hundreds of
   examples and doesn't try thresholds no example could ever land on. */
function candidateThresholds(examples, featureIdx) {
  const vals = Array.from(new Set(examples.map(e => e.features[featureIdx]))).sort((a, b) => a - b);
  if (vals.length <= 1) return [];
  if (vals.length <= 12) {
    const out = [];
    for (let i = 0; i < vals.length - 1; i++) out.push((vals[i] + vals[i + 1]) / 2);
    return out;
  }
  const out = [];
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const idx = Math.floor((vals.length - 1) * i / steps);
    out.push((vals[idx] + vals[Math.min(idx + 1, vals.length - 1)]) / 2);
  }
  return Array.from(new Set(out));
}

/* Best (feature, threshold) split by weighted-Gini reduction. Returns
   null when nothing beats the parent's own impurity (no split helps). */
function findBestSplit(examples, featureCount, minSamplesLeaf) {
  const parentGini = gini(examples);
  const n = examples.length;
  let best = null;
  for (let f = 0; f < featureCount; f++) {
    for (const t of candidateThresholds(examples, f)) {
      const left = [], right = [];
      for (const e of examples) (e.features[f] <= t ? left : right).push(e);
      if (left.length < minSamplesLeaf || right.length < minSamplesLeaf) continue;
      const weighted = (left.length / n) * gini(left) + (right.length / n) * gini(right);
      const gain = parentGini - weighted;
      if (gain > 1e-9 && (!best || gain > best.gain)) {
        best = { featureIdx: f, threshold: t, left, right, gain };
      }
    }
  }
  return best;
}

function leafOf(examples) {
  const n = examples.length;
  let pos = 0;
  for (const e of examples) pos += e.label;
  const prob = n ? pos / n : 0.5;
  return { isLeaf: true, n, prob: round3(prob), label: prob >= 0.5 ? 1 : 0 };
}

/* Recursive CART build. maxDepth/minSamplesSplit/minSamplesLeaf all exist
   to keep the tree from just memorizing a few hundred examples — same
   role L2 regularization plays for the logistic model. */
function buildNode(examples, featureCount, opts, depth) {
  const node0 = leafOf(examples);
  if (depth >= opts.maxDepth || examples.length < opts.minSamplesSplit || node0.prob === 0 || node0.prob === 1) {
    return node0;
  }
  const best = findBestSplit(examples, featureCount, opts.minSamplesLeaf);
  if (!best) return node0;
  return {
    isLeaf: false,
    featureIdx: best.featureIdx,
    threshold: round3(best.threshold),
    gain: round3(best.gain),
    n: examples.length,
    left: buildNode(best.left, featureCount, opts, depth + 1),
    right: buildNode(best.right, featureCount, opts, depth + 1)
  };
}

/* `examples`: [{features:[...], label:0|1}], same shape train.js's
   loadExamples() produces. `featureNames` labels each index for the
   human-readable rules extracted below. */
function fit(examples, featureNames, opts) {
  opts = Object.assign({ maxDepth: 4, minSamplesSplit: 40, minSamplesLeaf: 20 }, opts || {});
  const featureCount = featureNames.length;
  const root = examples.length ? buildNode(examples, featureCount, opts, 0) : leafOf([]);
  return { root, featureNames, opts };
}

function predictProb(root, features) {
  let node = root;
  while (!node.isLeaf) node = features[node.featureIdx] <= node.threshold ? node.left : node.right;
  return node.prob;
}

function evaluate(model, examples) {
  if (!examples.length) return 0;
  let correct = 0;
  for (const e of examples) {
    const pred = predictProb(model.root, e.features) >= 0.5 ? 1 : 0;
    if (pred === e.label) correct++;
  }
  return correct / examples.length;
}

/* Gini importance: for every split in the tree, credit that feature with
   (examples at that node / total) * gain — a feature used near the root
   on lots of data counts for more than one used deep in a rare branch.
   Returned already normalized to sum to 1 (or all-zero if the tree never
   split at all), so it reads as "share of the tree's total decision-making". */
function featureImportance(model, totalN) {
  const raw = new Array(model.featureNames.length).fill(0);
  (function walk(node) {
    if (!node || node.isLeaf) return;
    raw[node.featureIdx] += (node.n / totalN) * node.gain;
    walk(node.left);
    walk(node.right);
  })(model.root);
  const sum = raw.reduce((a, b) => a + b, 0);
  const norm = sum > 0 ? raw.map(v => round3(v / sum)) : raw;
  const out = {};
  model.featureNames.forEach((name, i) => { out[name] = norm[i]; });
  return out;
}

/* Every root-to-leaf path as a human-readable rule, sorted by how
   confident + well-supported the leaf is (prob far from 0.5, weighted by
   how many examples actually landed there) — the tree's equivalent of
   train.js's pairWeights: "here's what it actually found", inspectable
   instead of a black box. featureLabel(name) lets the caller map raw
   feature keys (e.g. "oiAboveAvg") to a display string; falls back to the
   raw name if omitted. */
function extractRules(model, featureLabel) {
  const label = featureLabel || (n => n);
  const rules = [];
  (function walk(node, conds) {
    if (!node) return;
    if (node.isLeaf) {
      if (conds.length && node.n > 0) {
        rules.push({
          conditions: conds.slice(),
          prob: node.prob,
          n: node.n,
          confidence: Math.abs(node.prob - 0.5) * 2 * Math.log(1 + node.n)
        });
      }
      return;
    }
    const name = model.featureNames[node.featureIdx];
    walk(node.left, conds.concat([{ text: label(name) + " ≤ " + node.threshold, name, dir: "left" }]));
    walk(node.right, conds.concat([{ text: label(name) + " > " + node.threshold, name, dir: "right" }]));
  })(model.root, []);
  return rules.sort((a, b) => b.confidence - a.confidence);
}

module.exports = { fit, predictProb, evaluate, featureImportance, extractRules, gini };
