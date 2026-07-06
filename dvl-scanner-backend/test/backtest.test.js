"use strict";

/* Offline test for the financial backtest module — no network. Builds a
   synthetic log where a genuinely predictive feature (rsiOversold + low
   rsi14) correlates BOTH with the win/loss label AND with the magnitude of
   finalReturnPct (winners return +2%ish, losers -1%ish, matching outcomes.js's
   real triple-barrier thresholds), so a model trained on it should filter
   toward a test bucket with a clearly better win rate and average return
   than "trade every signal". */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-backtest-test-"));
process.env.DVL_OUTCOMES_LOG_FILE = path.join(tmpDir, "log.jsonl");
process.env.DVL_MODEL_FILE = path.join(tmpDir, "model.json");

const train = require("../src/train");
const backtest = require("../src/backtest");

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

/* 1) Below MIN_SAMPLES: reports {ready:false} with the sample count/needed,
   same shape trainSide() uses for its own "not enough data" case. */
writeLog([{ at: 1, side: "LONG", blocks: blocks({ rsiOversold: true }), features: features({ rsi14: 20 }), label: 1, finalReturnPct: 2 }]);
const under = backtest.backtestSide("LONG");
eq(under.ready, false, "not enough samples yet");
eq(under.samples, 1, "reports the actual sample count");
eq(under.needed, train.MIN_SAMPLES, "reports how many are needed");

/* 2) Enough samples, predictive feature drives both label AND return
   magnitude. rsiOk examples mostly win with a +2% return; non-rsiOk mostly
   lose with a -1% return (mirroring outcomes.js's real target/stop pcts). */
const N = train.MIN_SAMPLES + 200;
const examples = [];
for (let i = 0; i < N; i++) {
  const rsiOk = i % 2 === 0;
  const favorable = rsiOk ? (i % 11 !== 0) : (i % 9 === 0);
  examples.push({
    at: i + 1,
    side: "LONG",
    blocks: blocks({ rsiOversold: rsiOk }),
    features: features({ rsi14: rsiOk ? 20 : 70 }),
    label: favorable ? 1 : 0,
    finalReturnPct: favorable ? 2 : -1
  });
}
writeLog(examples);
const result = backtest.backtestSide("LONG");
eq(result.ready, true, "trains once enough samples exist");
eq(result.side, "LONG", "tagged with its own side");
eq(result.samples, N, "records the total sample count");
eq(result.trainSamples + result.testSamples, result.samples, "train+test sizes add up to the full dataset");
eq(result.labelMethod, "triple-barrier-atr", "carries the same labelMethod tag trainSide() uses");

/* Every bucket carries the statsFor() shape. */
for (const bucket of ["allSignals", "logisticModel", "treeModel"]) {
  const s = result[bucket];
  ok(s && typeof s === "object", bucket + " is present");
  ok(Number.isFinite(s.count) && s.count >= 0, bucket + ".count is a valid number");
  ok(s.winRate >= 0 && s.winRate <= 1, bucket + ".winRate is a valid fraction (got " + s.winRate + ")");
}

/* allSignals covers the FULL test set — bucket filtering only narrows the
   other two, never allSignals itself. */
eq(result.allSignals.count, result.testSamples, "allSignals bucket is the entire test set");

/* The model-favorable buckets should be a SUBSET (never a superset) of the
   full test set, and — given the predictive-feature dataset above — should
   show a win rate and average return at least as good as trading blindly. */
ok(result.logisticModel.count <= result.allSignals.count, "logisticModel bucket is a subset of allSignals");
ok(result.treeModel.count <= result.allSignals.count, "treeModel bucket is a subset of allSignals");
ok(result.logisticModel.winRate >= result.allSignals.winRate - 1e-9, "logistic-favorable bucket wins at least as often as trading every signal (got " + result.logisticModel.winRate + " vs " + result.allSignals.winRate + ")");
ok(result.treeModel.winRate >= result.allSignals.winRate - 1e-9, "tree-favorable bucket wins at least as often as trading every signal (got " + result.treeModel.winRate + " vs " + result.allSignals.winRate + ")");
ok(result.logisticModel.avgReturnPct >= result.allSignals.avgReturnPct - 1e-9, "logistic-favorable bucket's average return is at least as good as trading every signal");

/* 3) statsFor() itself: count/winRate/avgReturnPct/totalReturnPct math. */
const stats = backtest.statsFor([
  { label: 1, finalReturnPct: 2 },
  { label: 1, finalReturnPct: 2 },
  { label: 0, finalReturnPct: -1 },
  { label: 0, finalReturnPct: -1 }
]);
eq(stats.count, 4, "statsFor counts every example");
eq(stats.winRate, 0.5, "statsFor computes win rate from label===1");
eq(stats.avgReturnPct, 0.5, "statsFor computes the mean finalReturnPct ((2+2-1-1)/4 = 0.5)");
eq(stats.totalReturnPct, 2, "statsFor computes the summed finalReturnPct (2+2-1-1 = 2)");

const empty = backtest.statsFor([]);
eq(empty.count, 0, "statsFor handles an empty bucket without dividing by zero");
eq(empty.winRate, 0, "empty bucket has a 0 winRate, not NaN");
eq(empty.avgReturnPct, 0, "empty bucket has a 0 avgReturnPct, not NaN");

/* 4) backtest() is LONG-only — no SHORT key at all (SHORT was removed
   from training entirely, see train.js's doc-comment). */
const both = backtest.backtest();
ok(both.LONG && both.LONG.ready === true, "backtest() includes a ready LONG side");
ok(!("SHORT" in both), "backtest() never returns a SHORT key — SHORT was removed, not just unready");

/* 5) loadExamples() actually carries finalReturnPct through, since
   backtest.js depends on it being present per example (train.js/tree.js
   themselves never read this field). */
const loaded = train.loadExamples("LONG");
ok(loaded.every(e => typeof e.finalReturnPct === "number"), "every loaded example carries a numeric finalReturnPct");
ok(loaded.some(e => e.finalReturnPct === 2) && loaded.some(e => e.finalReturnPct === -1), "finalReturnPct values match what was logged");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
