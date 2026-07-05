"use strict";

/* Offline test for the hybrid learned-weights training module (ML
   groundwork) — no network. Uses temp files so it never touches the real
   data/ directory, and a synthetic dataset with one clearly-predictive
   boolean block AND one clearly-predictive continuous feature so we can
   check the model actually learns the right things, not just that it runs.

   LONG and SHORT train as two fully separate models (maybeTrain() returns
   { LONG, SHORT }) — see the comment at the top of src/train.js for why:
   the 6 blocks only encode a bullish thesis, so mixing SHORT-labeled
   examples into the same fit would pollute what LONG actually learns. */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-train-test-"));
process.env.DVL_OUTCOMES_LOG_FILE = path.join(tmpDir, "log.jsonl");
process.env.DVL_MODEL_FILE = path.join(tmpDir, "model.json");

const train = require("../src/train");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}

function writeLog(entries) {
  fs.writeFileSync(process.env.DVL_OUTCOMES_LOG_FILE, entries.map(e => JSON.stringify(e)).join("\n") + "\n");
}
function blocks(overrides) {
  const b = { spikeAboveAvg: false, rsiOversold: false, oiAboveAvg: false, lsrBelowAvg: false, flatVolumeBar: false, prevVolBelowHalf: false };
  return Object.assign(b, overrides);
}
function features(overrides) {
  const f = { spike20: 1, spike50: 1, rsi14: 50, volBelowMaBars: 0, barPct: 0, flatCandles: 0, oiRatio: 0, lsrRatio: 0, crossStrength: 1, oiSlope: 0, lsrSlope: 0, rsiRecoveryFromLow: 0 };
  return Object.assign(f, overrides);
}
function longExamples(n, atOffset) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rsiOk = i % 2 === 0;                // predictive (boolean)
    const rsiVal = rsiOk ? 20 : 70;           // predictive (continuous) — matches the boolean here on purpose
    const noise1 = i % 3 === 0;               // uncorrelated with outcome
    const noise2 = i % 4 === 0;               // uncorrelated with outcome
    // Favorable whenever rsiOk is true, unfavorable otherwise — a bit of
    // label noise keeps it realistic (not perfectly separable).
    const favorable = rsiOk ? (i % 11 !== 0) : (i % 13 === 0);
    out.push({
      at: (atOffset || 0) + i + 2,
      side: "LONG",
      blocks: blocks({ rsiOversold: rsiOk, spikeAboveAvg: noise1, oiAboveAvg: noise2 }),
      features: features({ rsi14: rsiVal, spike20: noise1 ? 5 : 1, oiRatio: noise2 ? 0.3 : 0 }),
      label: favorable ? 1 : 0
    });
  }
  return out;
}

/* 1) Below MIN_SAMPLES on both sides: reports what's missing per side,
   does not write a model. */
writeLog([{ at: 1, side: "LONG", blocks: blocks({ rsiOversold: true }), features: features({ rsi14: 20 }), label: 1 }]);
const under = train.maybeTrain();
eq(under.LONG.trained, false, "LONG not enough samples yet");
eq(under.LONG.samples, 1, "LONG reports the actual sample count");
eq(under.LONG.needed, train.MIN_SAMPLES, "LONG reports how many are needed");
eq(under.SHORT.trained, false, "SHORT not enough samples yet (no short examples logged at all)");
eq(under.SHORT.samples, 0, "SHORT sample count is 0 with no short-labeled examples");
ok(!fs.existsSync(process.env.DVL_MODEL_FILE), "no model file written while both sides are below MIN_SAMPLES");

/* 2) Enough LONG samples, still nothing for SHORT. rsiOversold (boolean)
   AND a low rsi14 (continuous) are both genuinely predictive of a
   favorable move; spikeAboveAvg/oiAboveAvg are uncorrelated noise. The
   LONG model should learn to weight rsi-related features highest on both
   the boolean and continuous sides — SHORT must stay untrained. */
const N = train.MIN_SAMPLES + 100;
const examples = longExamples(N);
writeLog(examples);
const trained = train.maybeTrain();
const model = trained.LONG;
eq(model.trained, true, "LONG trains once enough samples exist");
eq(model.side, "LONG", "LONG model is tagged with its own side");
eq(model.samples, N, "records the total LONG sample count");
eq(trained.SHORT.trained, false, "SHORT stays untrained — no short examples in the log");

/* Temporal split: test set is the newest ~20%, and train+test cover everything. */
eq(model.trainSamples + model.testSamples, model.samples, "train+test sizes add up to the full dataset");
ok(Math.abs(model.testSamples / model.samples - train.TEST_FRACTION) < 0.02, "test set is ~20% of the data (got " + model.testSamples + "/" + model.samples + ")");

/* Both the boolean AND continuous RSI signals should come out on top. */
ok(model.weights.rsiOversold > model.weights.spikeAboveAvg, "predictive boolean block outweighs an uncorrelated one (rsiOversold=" + model.weights.rsiOversold + " vs spikeAboveAvg=" + model.weights.spikeAboveAvg + ")");
ok(model.coefficients.rsi14n < 0, "rsi14n gets a NEGATIVE coefficient (lower/more-oversold RSI -> more favorable, and rsi14n is normalized so low RSI is negative)");
ok(Math.abs(model.coefficients.rsi14n) > Math.abs(model.coefficients.spike20n), "the predictive continuous feature outweighs an uncorrelated one in magnitude");

/* Honest accuracy: both reported, both in a sane range, present alongside
   the backward-compatible `accuracy` alias (== testAccuracy, never in-sample). */
eq(model.accuracy, model.testAccuracy, "`accuracy` is an alias for the honest held-out testAccuracy, not train accuracy");
ok(model.trainAccuracy > 0.6, "reasonable train accuracy on a near-separable dataset (got " + model.trainAccuracy + ")");
ok(model.testAccuracy >= 0 && model.testAccuracy <= 1, "testAccuracy is a valid probability-like fraction (got " + model.testAccuracy + ")");

/* All hybrid features (6 blocks + continuous, including the trend features
   oiSlope/lsrSlope/rsiRecoveryFromLow/netDeltaSlope, plus the 15 pairs) are
   present in coefficients. */
eq(Object.keys(model.coefficients).length, train.FEATURE_KEYS.length, "coefficients cover every hybrid feature");
ok(["oiSlopeN", "lsrSlopeN", "rsiRecoveryN"].every(k => train.CONT_KEYS.includes(k)), "the trend features (OI slope, LSR slope, RSI recovery) are part of CONT_KEYS");
ok(["netLongRatioN", "netShortRatioN", "netDeltaRatioN", "netDeltaSlopeN"].every(k => train.CONT_KEYS.includes(k)), "the Net Long/Short/Delta features are part of CONT_KEYS");
eq(train.FEATURE_KEYS.length, train.BLOCK_KEYS.length + train.CONT_KEYS.length + train.PAIR_KEYS.length, "FEATURE_KEYS is exactly blocks + continuous + pairs, nothing missing or duplicated");
ok(fs.existsSync(process.env.DVL_MODEL_FILE), "model file is persisted once at least one side trains");

/* 3) Re-running immediately (no new examples) returns the SAME LONG model
   instead of re-fitting on an unchanged dataset. */
const again = train.maybeTrain();
eq(again.LONG.trainedAt, model.trainedAt, "does not retrain LONG without enough new examples");

/* 4) Adding MIN_NEW_SAMPLES more LONG examples triggers a fresh LONG fit. */
const more = examples.slice(0, train.MIN_NEW_SAMPLES + 5);
writeLog(examples.concat(more));
const retrained = train.maybeTrain();
ok(retrained.LONG.trainedAt >= model.trainedAt, "retrains LONG once enough new examples accumulate");
eq(retrained.LONG.samples, N + more.length, "picks up the larger LONG dataset");

/* 5) toWeights clips negative coefficients to 0 (a block should never
   actively penalize the score — only stop contributing to it). */
const w = train.toWeights([-2, 0, 4, -0.001, 1, 0]);
const keys = train.BLOCK_KEYS;
eq(w[keys[0]], 0, "negative coefficient clips to 0");
eq(w[keys[1]], 0, "zero coefficient stays 0");
ok(w[keys[2]] === 40, "the largest positive coefficient scales to 40");
ok(w[keys[3]] === 0, "a tiny negative coefficient also clips to 0");
ok(w[keys[4]] > 0 && w[keys[4]] < 40, "a smaller positive coefficient scales proportionally");

/* 6) splitTemporal keeps the newest examples (highest `at`) in the test
   set and never shuffles/reorders — a random split would leak future
   information into training. */
const seq = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ features: [n], label: 0, at: n }));
const split = train.splitTemporal(seq, 0.2);
eq(split.train.length, 8, "80% goes to train");
eq(split.test.length, 2, "20% goes to test");
eq(split.test[0].at, 9, "test set starts right after the train set ends (oldest-first order preserved)");
eq(split.test[1].at, 10, "test set ends with the chronologically newest example");

/* 7) SHORT-labeled examples never leak into the LONG training set (and
   vice versa) — loadExamples(side) filters strictly. Reuses the LONG
   dataset above but relabels a copy as SHORT with the OPPOSITE outcome
   pattern; if the two datasets were blended, LONG's learned coefficients
   would shift. They must not. */
const shortExamples = longExamples(N, N * 10).map(e => Object.assign({}, e, {
  side: "SHORT",
  blocks: blocks(Object.assign({}, e.blocks, { rsiOversold: !e.blocks.rsiOversold })),
  label: 1 - e.label
}));
writeLog(examples.concat(more).concat(shortExamples));
const separated = train.maybeTrain();
eq(separated.LONG.samples, N + more.length, "LONG sample count unchanged by adding SHORT examples");
eq(separated.SHORT.samples, shortExamples.length, "SHORT gets its own independent sample count");
ok(separated.SHORT.trained === true, "SHORT trains on its own once it clears MIN_SAMPLES");
ok(separated.SHORT.weights.rsiOversold !== undefined, "SHORT model produces its own weights");
const longOnly = train.loadExamples("LONG");
ok(longOnly.every((_, i) => true) && longOnly.length === N + more.length, "loadExamples('LONG') excludes SHORT rows");
const shortOnly = train.loadExamples("SHORT");
eq(shortOnly.length, shortExamples.length, "loadExamples('SHORT') excludes LONG rows");

/* 8) Pair-interaction features: a plain additive model (single-block
   weights only) structurally cannot represent "favorable ONLY when BOTH
   A and B are true, unfavorable otherwise" — that's an AND/confluence
   pattern, not a linear combination. Build a dataset where the outcome
   depends purely on lsrBelowAvg AND flatVolumeBar together (all 4
   combinations of the two represented evenly, a bit of label noise to
   stay realistic) and confirm the model (a) still trains, (b) surfaces
   that exact pair at the top of pairWeights with a strong weight, and
   (c) generalizes well on held-out data — proof the interaction term is
   actually doing the job, not just padding the feature vector. */
const N2 = train.MIN_SAMPLES + 150;
const confluenceExamples = [];
for (let i = 0; i < N2; i++) {
  const a = i % 4 === 1 || i % 4 === 3; // lsrBelowAvg
  const b = i % 4 === 2 || i % 4 === 3; // flatVolumeBar
  const bothTrue = a && b;
  const favorable = bothTrue ? (i % 9 !== 0) : (i % 11 === 0);
  confluenceExamples.push({
    at: i + 1,
    side: "LONG",
    blocks: blocks({ lsrBelowAvg: a, flatVolumeBar: b }),
    features: features({}),
    label: favorable ? 1 : 0
  });
}
writeLog(confluenceExamples);
const confluenceModel = train.maybeTrain().LONG;
eq(confluenceModel.trained, true, "confluence dataset trains once it clears MIN_SAMPLES");
ok(Array.isArray(confluenceModel.pairWeights) && confluenceModel.pairWeights.length === train.PAIR_KEYS.length, "pairWeights covers all 15 block pairs");
const topPair = confluenceModel.pairWeights[0];
ok(
  (topPair.a === "lsrBelowAvg" && topPair.b === "flatVolumeBar"),
  "the lsrBelowAvg+flatVolumeBar pair (the actual AND pattern in this data) ranks #1 among all 15 pairs (got " + JSON.stringify(topPair) + ")"
);
eq(topPair.weight, 40, "the strongest pair scales to the max of the 0-40 display range");
ok(confluenceModel.testAccuracy > 0.75, "held-out accuracy is strong on a pure confluence pattern once the interaction term is available (got " + confluenceModel.testAccuracy + ")");

/* trainSide also fits src/tree.js's CART tree on the exact same
   train/test split and reports it alongside the logistic model — this is
   the integration point, not a re-test of tree.js's own logic (see
   test/tree.test.js for that). */
ok(confluenceModel.tree && typeof confluenceModel.tree === "object", "trainSide attaches a tree result object");
ok(typeof confluenceModel.tree.testAccuracy === "number", "tree result carries its own held-out accuracy");
ok(Array.isArray(confluenceModel.tree.rules) && confluenceModel.tree.rules.length > 0, "tree result carries at least one extracted rule");
ok(confluenceModel.tree.importance && typeof confluenceModel.tree.importance === "object", "tree result carries feature importance");
ok(confluenceModel.bestModel === "logistic" || confluenceModel.bestModel === "tree", "bestModel names one of the two actual model types (got " + confluenceModel.bestModel + ")");

/* computePairFeatures produces one bit per pair, in BLOCK_PAIRS order,
   1 only when both blocks in that pair are true. */
const pf = train.computePairFeatures({ lsrBelowAvg: true, flatVolumeBar: true, spikeAboveAvg: false });
eq(pf.length, train.PAIR_KEYS.length, "computePairFeatures returns one value per pair");
const lsrFlatIdx = train.BLOCK_PAIRS.findIndex(([x, y]) => (x === "lsrBelowAvg" && y === "flatVolumeBar") || (x === "flatVolumeBar" && y === "lsrBelowAvg"));
eq(pf[lsrFlatIdx], 1, "the pair bit is 1 when both its blocks are true");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
