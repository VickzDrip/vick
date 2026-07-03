"use strict";

/* Offline test for the learned-weights training module (ML groundwork) —
   no network. Uses temp files so it never touches the real data/ directory,
   and a synthetic dataset with one clearly-predictive block so we can check
   the model actually learns the right thing, not just that it runs. */

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

/* 1) Below MIN_SAMPLES: reports what's missing, does not write a model. */
writeLog([{ side: "LONG", blocks: blocks({ rsiOversold: true }), returns: { r4h: 5 } }]);
const under = train.maybeTrain();
eq(under.trained, false, "not enough samples yet");
eq(under.samples, 1, "reports the actual sample count");
eq(under.needed, train.MIN_SAMPLES, "reports how many are needed");
ok(!fs.existsSync(process.env.DVL_MODEL_FILE), "no model file written below MIN_SAMPLES");

/* 2) Enough samples, with rsiOversold clearly predictive of a favorable
   move and the other blocks uncorrelated (deterministic alternation) —
   the model should learn to weight rsiOversold highest. */
const N = train.MIN_SAMPLES + 50;
const examples = [];
for (let i = 0; i < N; i++) {
  const rsiOk = i % 2 === 0;               // predictive
  const noise1 = i % 3 === 0;              // uncorrelated with outcome
  const noise2 = i % 5 === 0;              // uncorrelated with outcome
  const side = "LONG";
  // Favorable (positive r4h) whenever rsiOk is true, unfavorable otherwise —
  // a small amount of label noise keeps it realistic (not perfectly separable).
  const favorable = rsiOk ? (i % 11 !== 0) : (i % 13 === 0);
  examples.push({
    side,
    blocks: blocks({ rsiOversold: rsiOk, spikeAboveAvg: noise1, oiAboveAvg: noise2 }),
    returns: { r4h: favorable ? 3.2 : -1.8 }
  });
}
writeLog(examples);
const model = train.maybeTrain();
eq(model.trained, true, "trains once enough samples exist");
eq(model.samples, N, "records the sample count used");
ok(model.weights.rsiOversold > model.weights.spikeAboveAvg, "the predictive block outweighs an uncorrelated one (rsiOversold=" + model.weights.rsiOversold + " vs spikeAboveAvg=" + model.weights.spikeAboveAvg + ")");
ok(model.weights.rsiOversold > model.weights.oiAboveAvg, "the predictive block outweighs the other uncorrelated one");
ok(model.weights.rsiOversold === 40, "the strongest block is scaled to the top of the 0-40 range (got " + model.weights.rsiOversold + ")");
ok(model.accuracy > 0.8, "reasonable in-sample accuracy on a near-separable dataset (got " + model.accuracy + ")");
ok(fs.existsSync(process.env.DVL_MODEL_FILE), "model file is persisted once trained");

/* 3) Re-running immediately (no new examples) returns the SAME model
   instead of re-fitting on an unchanged dataset. */
const again = train.maybeTrain();
eq(again.trainedAt, model.trainedAt, "does not retrain without enough new examples");

/* 4) Adding MIN_NEW_SAMPLES more examples triggers a fresh fit. */
const more = examples.slice(0, train.MIN_NEW_SAMPLES + 5);
writeLog(examples.concat(more));
const retrained = train.maybeTrain();
ok(retrained.trainedAt >= model.trainedAt, "retrains once enough new examples accumulate");
eq(retrained.samples, N + more.length, "picks up the larger dataset");

/* 5) toWeights clips negative coefficients to 0 (a block should never
   actively penalize the score — only stop contributing to it). */
const w = train.toWeights([-2, 0, 4, -0.001, 1, 0]);
const keys = train.BLOCK_KEYS;
eq(w[keys[0]], 0, "negative coefficient clips to 0");
eq(w[keys[1]], 0, "zero coefficient stays 0");
ok(w[keys[2]] === 40, "the largest positive coefficient scales to 40");
ok(w[keys[3]] === 0, "a tiny negative coefficient also clips to 0");
ok(w[keys[4]] > 0 && w[keys[4]] < 40, "a smaller positive coefficient scales proportionally");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
