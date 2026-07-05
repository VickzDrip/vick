"use strict";

/* ── Learns a hybrid Spike Score model from real outcomes ──────────────
   Reads the labeled dataset outcomes.js has been accumulating
   (outcomes-log.jsonl: the 6 blocks' booleans AND the continuous raw
   values behind them, at signal time, plus what price actually did
   afterward) and fits a plain logistic regression — no external ML
   dependency, appropriate for ~15 features and a modest dataset size.

   It's "hybrid" on purpose: the 6 blocks stay as interpretable yes/no
   checks (and their learned coefficients convert to the same 0-40 weight
   scale cfg.WEIGHTS already uses, for backward compatibility with the
   existing display), but the model ALSO sees the continuous magnitude
   behind each one (exact RSI, how far OI/LSR sit from their own average,
   volume-spike strength, etc.) — so it can find its own thresholds
   instead of being capped at the hand-picked ones (RSI < 30, etc.).

   Plain logistic regression is additive: each feature's contribution to
   the score is independent of every other (z = bias + sum(w_i * x_i)),
   so it can't tell you "these two blocks together predict a lot better
   than either alone" — that kind of confluence effect gets averaged into
   each block's own weight instead of standing out. To let the model
   actually learn combos, every PAIR of the 6 blocks also gets its own
   boolean feature ("both true at once") — see BLOCK_PAIRS/PAIR_KEYS below
   — with its own learned coefficient, exposed as `model.pairWeights`
   alongside the existing single-block `model.weights`.

   Evaluation is a TEMPORAL holdout, not random or in-sample: the model
   trains on the oldest ~80% of resolved examples and is scored on the
   newest ~20%, which it never saw during training — this is the accuracy
   that actually means something (in-sample accuracy on a model's own
   training data is close to meaningless).

   LONG and SHORT are trained as two entirely separate models (see
   maybeTrain/trainSide below), each with its own MIN_SAMPLES gate. The 6
   blocks all encode a bullish thesis (RSI oversold, OI rising, LSR
   falling, ...) that was designed and validated for LONG only — `side` on
   a resolved example is still just "did the last candle close red or
   green" (metrics.js), not a real short setup, so blending SHORT examples
   into the same fit would have the model correlate a bearish outcome
   against bullish features, polluting the LONG weights with noise. SHORT
   simply won't train until there's a real short thesis behind it and
   enough resolved examples of its own.

   This module only trains and persists a candidate model; nothing wires
   it into the live score yet (see worker.js / server.js `health.outcomes`)
   — that's a deliberate separate decision once there's confidence in it. */

const fs = require("fs");
const path = require("path");
const outcomes = require("./outcomes");
const tree = require("./tree");

const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");
const MODEL_FILE = process.env.DVL_MODEL_FILE || path.join(process.cwd(), "data", "learned-weights.json");

const BLOCK_KEYS = ["spikeAboveAvg", "rsiOversold", "oiAboveAvg", "lsrBelowAvg", "flatVolumeBar", "prevVolBelowHalf"];
/* Continuous features behind the blocks above (same order intent, not a
   strict 1:1 — e.g. spike20n/spike50n both feed "spikeAboveAvg"). oiSlopeN/
   lsrSlopeN/rsiRecoveryN are TREND features (is OI rising, is LSR falling,
   has RSI already bounced off a recent low), distinct from the snapshot
   ratio/level the block booleans check — see metrics.js's trendVsMA and
   rsiRecoveryFromLow. */
const CONT_KEYS = ["spike20n", "spike50n", "rsi14n", "volBelowMaBarsN", "barPctN", "flatCandlesN", "oiRatioN", "lsrRatioN", "crossStrengthN", "oiSlopeN", "lsrSlopeN", "rsiRecoveryN"];

/* Every 2-of-6 combination of the blocks (15 pairs) — see the module
   doc-comment above for why plain logistic regression needs these spelled
   out as their own features to learn confluence effects at all. */
const BLOCK_PAIRS = [];
for (let i = 0; i < BLOCK_KEYS.length; i++) {
  for (let j = i + 1; j < BLOCK_KEYS.length; j++) BLOCK_PAIRS.push([BLOCK_KEYS[i], BLOCK_KEYS[j]]);
}
const PAIR_KEYS = BLOCK_PAIRS.map(([a, b]) => a + "__" + b);

const FEATURE_KEYS = BLOCK_KEYS.concat(CONT_KEYS).concat(PAIR_KEYS);

function computePairFeatures(blocks) {
  return BLOCK_PAIRS.map(([a, b]) => (blocks[a] && blocks[b]) ? 1 : 0);
}

/* Don't train (or retrain) on too little data — with 18 blocks/continuous
   features PLUS 15 pair-interaction features (33 total), too few examples
   risks fitting noise convincingly. Raised from 200 now that the feature
   count nearly doubled; L2 regularization and the temporal test split
   still help catch it if it happens — testAccuracy is what to watch. */
const MIN_SAMPLES = 300;
/* Once trained, don't bother re-fitting until there's meaningfully more
   data than last time — 7 matches the scanner's own resolution pace
   (~7 signals/hour), so the model refreshes roughly every cycle worth of
   new data instead of waiting several hours for a bigger batch to build up. */
const MIN_NEW_SAMPLES = 7;
/* Fraction of examples (the CHRONOLOGICALLY NEWEST ones) held out for
   evaluation — never used to fit the model. */
const TEST_FRACTION = 0.2;

function round3(x) { return Math.round(x * 1000) / 1000; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* Normalizes the continuous raw values to roughly [-1,1] / [0,1] ranges so
   gradient descent doesn't have to fight wildly different feature scales
   (an unnormalized RSI of ~50 vs a spike ratio of ~2 would otherwise dwarf
   each other's gradients). Missing/legacy values (rows logged before this
   feature set existed) default to a neutral 0, except RSI which defaults
   to 50 (neutral) before normalizing. */
function normalizeContinuous(f) {
  f = f || {};
  const rsi = Number.isFinite(f.rsi14) ? f.rsi14 : 50;
  return [
    clamp((Number(f.spike20) || 0) / 8, 0, 1),
    clamp((Number(f.spike50) || 0) / 5, 0, 1),
    clamp((rsi - 50) / 50, -1, 1),
    clamp((Number(f.volBelowMaBars) || 0) / 20, 0, 1),
    clamp((Number(f.barPct) || 0) / 8, -1, 1),
    clamp((Number(f.flatCandles) || 0) / 10, 0, 1),
    clamp(Number(f.oiRatio) || 0, -1, 1),
    clamp(Number(f.lsrRatio) || 0, -1, 1),
    clamp((Number(f.crossStrength) || 0) / 3, 0, 1),
    clamp(Number(f.oiSlope) || 0, -1, 1),
    clamp(Number(f.lsrSlope) || 0, -1, 1),
    clamp((Number(f.rsiRecoveryFromLow) || 0) / 30, 0, 1)
  ];
}

/* LONG and SHORT get independently trained models (see maybeTrain below) —
   the 6 blocks/continuous features (RSI oversold, OI rising, LSR falling,
   ...) all encode a bullish "ignition" thesis, so blending SHORT-labeled
   examples (currently just "did the last candle close red") into the same
   fit would have the model try to correlate a bearish outcome with bullish
   features, polluting what the LONG model actually learns. Separating them
   costs nothing — SHORT simply won't train until it has its own MIN_SAMPLES
   worth of resolved examples, same gate as LONG. */
const SIDES = ["LONG", "SHORT"];
function normSide(s) { return String(s || "").toUpperCase() === "SHORT" ? "SHORT" : "LONG"; }

/* Examples come back in the log's natural (chronological resolution)
   order — the caller relies on that for the temporal train/test split.
   `label` comes straight from outcomes.js's triple-barrier resolution
   (already side-adjusted there), not derived from a fixed-horizon return
   here — a signal that hits its target/stop in 20 minutes is exactly as
   valid a labeled example as one that takes the full timeout to resolve.
   `side` filters to just "LONG" or "SHORT" examples; omit it to load
   everything regardless of side (used only for diagnostics/tests, never by
   maybeTrain itself). */
function loadExamples(side) {
  let raw;
  try { raw = fs.readFileSync(LOG_FILE, "utf8"); } catch (_) { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch (_) { continue; }
    if (!e || !e.blocks || (e.label !== 0 && e.label !== 1)) continue;
    if (side && normSide(e.side) !== side) continue;
    const boolFeatures = BLOCK_KEYS.map(k => (e.blocks[k] ? 1 : 0));
    const contFeatures = normalizeContinuous(e.features);
    const pairFeatures = computePairFeatures(e.blocks);
    out.push({ features: boolFeatures.concat(contFeatures).concat(pairFeatures), label: e.label, at: e.at || 0 });
  }
  return out;
}

/* Oldest examples train the model, newest ones evaluate it — a random
   split would leak future information into training (the market regime
   the test set is drawn from would already be represented in training),
   overstating how well this generalizes to signals that haven't happened
   yet. Assumes `examples` is already in chronological (resolution) order,
   which loadExamples()'s append-only log naturally is. */
function splitTemporal(examples, testFraction) {
  const n = examples.length;
  const testSize = Math.max(1, Math.round(n * testFraction));
  const trainSize = Math.max(1, n - testSize);
  return { train: examples.slice(0, trainSize), test: examples.slice(trainSize) };
}

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

/* Batch gradient descent with L2 regularization. Deterministic (no random
   init), fine for ~15 features and a dataset in the hundreds-to-low-thousands. */
function fit(examples, opts) {
  opts = opts || {};
  const lr = opts.lr || 0.15;
  const iters = opts.iters || 2000;
  const l2 = opts.l2 || 0.05;
  const n = examples.length ? examples[0].features.length : FEATURE_KEYS.length;
  const m = examples.length || 1;
  let w = new Array(n).fill(0);
  let b = 0;
  for (let it = 0; it < iters; it++) {
    const gradW = new Array(n).fill(0);
    let gradB = 0;
    for (const ex of examples) {
      let z = b;
      for (let i = 0; i < n; i++) z += ex.features[i] * w[i];
      const err = sigmoid(z) - ex.label;
      for (let i = 0; i < n; i++) gradW[i] += err * ex.features[i];
      gradB += err;
    }
    for (let i = 0; i < n; i++) w[i] -= lr * (gradW[i] / m + l2 * w[i]);
    b -= lr * (gradB / m);
  }
  return { w, b };
}

function evaluate(examples, w, b) {
  if (!examples.length) return 0;
  let correct = 0;
  for (const ex of examples) {
    let z = b;
    for (let i = 0; i < w.length; i++) z += ex.features[i] * w[i];
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === ex.label) correct++;
  }
  return correct / examples.length;
}

/* Converts the BLOCK coefficients (first BLOCK_KEYS.length of w) to the
   same positive 0-40 scale cfg.WEIGHTS uses, for backward compatibility
   with the existing block-weight display / a future M.score() plug-in. A
   block the model finds NOT predictive (coefficient <= 0) gets weight 0
   rather than a negative weight — a block should never actively subtract
   from the score, only stop contributing to it. */
function toWeights(blockCoeffs) {
  const positive = blockCoeffs.map(x => Math.max(0, x));
  const maxW = Math.max.apply(null, positive.concat([1e-9]));
  const weights = {};
  BLOCK_KEYS.forEach((k, i) => { weights[k] = Math.round((positive[i] / maxW) * 40 * 10) / 10; });
  return weights;
}

/* Same conversion as toWeights, but for the 15 pair-interaction
   coefficients — same reasoning (never negative, scaled 0-40, a pair that
   isn't predictive gets 0 rather than penalizing the score). Returned as
   an array (not an object keyed by the raw "a__b" feature name) so the
   UI can render human labels via BLOCK_LABELS[a] + BLOCK_LABELS[b]
   without needing to parse the key back apart. */
function toPairWeights(pairCoeffs) {
  const positive = pairCoeffs.map(x => Math.max(0, x));
  const maxW = Math.max.apply(null, positive.concat([1e-9]));
  return BLOCK_PAIRS
    .map(([a, b], i) => ({ a, b, weight: Math.round((positive[i] / maxW) * 40 * 10) / 10 }))
    .sort((x, y) => y.weight - x.weight);
}

function loadModel() {
  try { return JSON.parse(fs.readFileSync(MODEL_FILE, "utf8")); } catch (_) { return null; }
}

function saveModel(model) {
  try {
    fs.mkdirSync(path.dirname(MODEL_FILE), { recursive: true });
    fs.writeFileSync(MODEL_FILE, JSON.stringify(model, null, 2));
  } catch (_) { /* disk issues are non-fatal */ }
}

/* Trains (or reuses) one side's model in isolation — same fit/evaluate
   pipeline as before the LONG/SHORT split, just scoped to that side's own
   examples and its own prior model for the "enough NEW data" check, so
   LONG and SHORT progress independently. Returns { trained:false, side,
   samples, needed } while below MIN_SAMPLES for that side. */
function trainSide(side, prev) {
  const examples = loadExamples(side);
  if (examples.length < MIN_SAMPLES) return { trained: false, side, samples: examples.length, needed: MIN_SAMPLES };
  if (prev && prev.trained && (examples.length - prev.samples) < MIN_NEW_SAMPLES) return prev;

  const { train: trainSet, test: testSet } = splitTemporal(examples, TEST_FRACTION);
  const { w, b } = fit(trainSet);
  const trainAccuracy = round3(evaluate(trainSet, w, b));
  const testAccuracy = round3(evaluate(testSet, w, b));

  const coefficients = {};
  FEATURE_KEYS.forEach((k, i) => { coefficients[k] = round3(w[i]); });

  /* Same trainSet/testSet split, fed to the CART tree instead of the
     logistic fit — an honest side-by-side comparison (both trained on
     identical data) instead of two numbers from different runs. Depth and
     leaf-size floors scale with how much train data there actually is, so
     early on (just past MIN_SAMPLES) it doesn't over-split a small set,
     and later (thousands of examples) it isn't needlessly shallow. See
     tree.js's doc-comment for why this exists: it can find N-way combos
     on its own, not just the pairs train.js hand-built. */
  const treeOpts = {
    maxDepth: 4,
    minSamplesSplit: Math.max(20, Math.round(trainSet.length * 0.03)),
    minSamplesLeaf: Math.max(10, Math.round(trainSet.length * 0.015))
  };
  const treeModel = tree.fit(trainSet, FEATURE_KEYS, treeOpts);
  const treeTrainAccuracy = round3(tree.evaluate(treeModel, trainSet));
  const treeTestAccuracy = round3(tree.evaluate(treeModel, testSet));
  const treeResult = {
    trainAccuracy: treeTrainAccuracy,
    testAccuracy: treeTestAccuracy,
    maxDepth: treeOpts.maxDepth,
    importance: tree.featureImportance(treeModel, trainSet.length),
    /* Top 8 root-to-leaf rules by confidence*support — the tree's version
       of pairWeights: what it actually found, inspectable instead of a
       black box. `conditions[].name` is a raw FEATURE_KEYS key; the
       caller maps it to a display label (same split as pairWeights'
       a/b — backend stays presentation-agnostic). */
    rules: tree.extractRules(treeModel).slice(0, 8).map(r => ({
      conditions: r.conditions.map(c => ({ name: c.name, dir: c.dir, text: c.text })),
      prob: r.prob,
      n: r.n
    }))
  };

  return {
    trained: true,
    side,
    trainedAt: Date.now(),
    samples: examples.length,
    trainSamples: trainSet.length,
    testSamples: testSet.length,
    /* Labels come from outcomes.js's triple-barrier resolution, not a
       fixed horizon — surfaced here so the model stays self-describing. */
    labelMethod: "triple-barrier",
    profitTargetPct: outcomes.PROFIT_TARGET_PCT,
    stopLossPct: outcomes.STOP_LOSS_PCT,
    maxHorizonMs: outcomes.MAX_HORIZON_MS,
    /* `accuracy` kept as the headline field for backward compatibility —
       it's the HONEST held-out (test) accuracy, never in-sample. Always
       the LOGISTIC model's — `bestModel` says which of the two actually
       tests better, informationally; nothing switches what score()/
       weights use based on it yet, that's a deliberate separate decision
       once there's confidence the tree consistently wins. */
    accuracy: testAccuracy,
    trainAccuracy,
    testAccuracy,
    coefficients,
    bias: round3(b),
    weights: toWeights(w.slice(0, BLOCK_KEYS.length)),
    pairWeights: toPairWeights(w.slice(BLOCK_KEYS.length + CONT_KEYS.length)),
    tree: treeResult,
    bestModel: treeResult.testAccuracy > testAccuracy ? "tree" : "logistic"
  };
}

/* Retrains LONG and SHORT independently (see the comment above loadExamples
   for why they can't share a fit) and persists both together. Returns
   { LONG: {...}, SHORT: {...} }, each either { trained:false, samples,
   needed } or a full trained model. A model file from before this split
   (flat shape, no .LONG/.SHORT) is treated as "no prior model" for both
   sides rather than crashing — they simply retrain from the full log. */
function maybeTrain() {
  const prevFile = loadModel();
  const prevLong = prevFile && prevFile.LONG;
  const prevShort = prevFile && prevFile.SHORT;

  const LONG = trainSide("LONG", prevLong);
  const SHORT = trainSide("SHORT", prevShort);
  const combined = { LONG, SHORT };
  if (LONG.trained || SHORT.trained) saveModel(combined);
  return combined;
}

module.exports = {
  loadExamples, splitTemporal, fit, evaluate, toWeights, toPairWeights, computePairFeatures, loadModel, saveModel, trainSide, maybeTrain,
  BLOCK_KEYS, CONT_KEYS, PAIR_KEYS, BLOCK_PAIRS, FEATURE_KEYS, SIDES, MIN_SAMPLES, MIN_NEW_SAMPLES, TEST_FRACTION
};

/* Runnable directly: `node src/train.js` (or `npm run train`). */
if (require.main === module) {
  const result = maybeTrain();
  console.log(JSON.stringify(result, null, 2));
}
