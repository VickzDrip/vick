"use strict";

/* ── Learns Spike Score block weights from real outcomes ──────────────
   Reads the labeled dataset outcomes.js has been accumulating
   (outcomes-log.jsonl: 6 blocks + entry price at signal time, plus what
   price actually did afterward) and fits a plain logistic regression —
   no external ML dependency, appropriate for 6 features and a modest
   dataset size. The result is converted into the same weight scale
   cfg.WEIGHTS already uses, so it can drop straight into M.score() without
   changing that function's shape.

   This module only trains and persists a candidate model; nothing wires
   it into the live score yet (see worker.js / server.js `health.outcomes`)
   — that's a deliberate separate decision once there's confidence in it. */

const fs = require("fs");
const path = require("path");

const LOG_FILE = process.env.DVL_OUTCOMES_LOG_FILE || path.join(process.cwd(), "data", "outcomes-log.jsonl");
const MODEL_FILE = process.env.DVL_MODEL_FILE || path.join(process.cwd(), "data", "learned-weights.json");

const BLOCK_KEYS = ["spikeAboveAvg", "rsiOversold", "oiAboveAvg", "lsrBelowAvg", "flatVolumeBar", "prevVolBelowHalf"];
/* Which return horizon defines "the signal worked". 4h is a reasonable
   middle ground for a volume-spike setup — long enough to filter noise,
   short enough to stay relevant to the signal that triggered it. */
const LABEL_HORIZON = "r4h";
/* Don't train (or retrain) on too little data — a handful of examples would
   just fit noise and could look confidently wrong. */
const MIN_SAMPLES = 200;
/* Once trained, don't bother re-fitting until there's meaningfully more
   data than last time. */
const MIN_NEW_SAMPLES = 20;

function loadExamples() {
  let raw;
  try { raw = fs.readFileSync(LOG_FILE, "utf8"); } catch (_) { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch (_) { continue; }
    if (!e || !e.blocks || !e.returns || !Number.isFinite(e.returns[LABEL_HORIZON])) continue;
    const ret = e.returns[LABEL_HORIZON];
    const isShort = String(e.side || "").toUpperCase() === "SHORT";
    const favorable = isShort ? -ret > 0 : ret > 0;
    const features = BLOCK_KEYS.map(k => (e.blocks[k] ? 1 : 0));
    out.push({ features, label: favorable ? 1 : 0 });
  }
  return out;
}

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

/* Batch gradient descent with L2 regularization. Deterministic (no random
   init), fine for 6 features and a dataset in the hundreds-to-low-thousands. */
function fit(examples, opts) {
  opts = opts || {};
  const lr = opts.lr || 0.15;
  const iters = opts.iters || 2000;
  const l2 = opts.l2 || 0.02;
  const n = BLOCK_KEYS.length;
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

/* Converts learned coefficients to the same positive 0-40ish scale
   cfg.WEIGHTS uses. A block the model finds NOT predictive (coefficient
   <= 0) gets weight 0 rather than a negative weight — a block should
   never actively subtract from the score, only stop contributing to it,
   so the on/off checklist display stays intuitive (green is always
   neutral-or-good, never penalized). */
function toWeights(w) {
  const positive = w.map(x => Math.max(0, x));
  const maxW = Math.max.apply(null, positive.concat([1e-9]));
  const weights = {};
  BLOCK_KEYS.forEach((k, i) => { weights[k] = Math.round((positive[i] / maxW) * 40 * 10) / 10; });
  return weights;
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

/* Retrains only when there's enough data and enough NEW data since the last
   run. Returns { trained:false, samples, needed } while below MIN_SAMPLES,
   otherwise the model object (freshly trained, or the existing one if not
   enough new examples arrived yet). */
function maybeTrain() {
  const examples = loadExamples();
  if (examples.length < MIN_SAMPLES) return { trained: false, samples: examples.length, needed: MIN_SAMPLES };
  const prev = loadModel();
  if (prev && prev.trained && (examples.length - prev.samples) < MIN_NEW_SAMPLES) return prev;
  const { w, b } = fit(examples);
  const accuracy = Math.round(evaluate(examples, w, b) * 1000) / 1000;
  const coefficients = {};
  BLOCK_KEYS.forEach((k, i) => { coefficients[k] = Math.round(w[i] * 1000) / 1000; });
  const model = {
    trained: true,
    trainedAt: Date.now(),
    samples: examples.length,
    horizon: LABEL_HORIZON,
    accuracy,
    coefficients,
    bias: Math.round(b * 1000) / 1000,
    weights: toWeights(w)
  };
  saveModel(model);
  return model;
}

module.exports = { loadExamples, fit, evaluate, toWeights, loadModel, saveModel, maybeTrain, BLOCK_KEYS, LABEL_HORIZON, MIN_SAMPLES, MIN_NEW_SAMPLES };

/* Runnable directly: `node src/train.js` (or `npm run train`). */
if (require.main === module) {
  const result = maybeTrain();
  console.log(JSON.stringify(result, null, 2));
}
