"use strict";

/* Offline test for the confluence diagnostic (analyze.js) — no network, no
   randomness. Builds a synthetic log where win rate climbs cleanly with the
   number of true blocks, and checks the bucketing/win-rate math is right. */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-analyze-test-"));
process.env.DVL_OUTCOMES_LOG_FILE = path.join(tmpDir, "log.jsonl");

const analyze = require("../src/analyze");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}

function blocks(overrides) {
  const b = { spikeAboveAvg: false, rsiOversold: false, oiAboveAvg: false, lsrBelowAvg: false, flatVolumeBar: false, prevVolBelowHalf: false };
  return Object.assign(b, overrides);
}

/* confluenceCount counts true blocks regardless of which ones. */
eq(analyze.confluenceCount(blocks()), 0, "no blocks true -> 0");
eq(analyze.confluenceCount(blocks({ rsiOversold: true })), 1, "one block true -> 1");
eq(analyze.confluenceCount(blocks({ rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true })), 3, "three blocks true -> 3");
eq(analyze.confluenceCount(blocks({ spikeAboveAvg: true, rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true, flatVolumeBar: true, prevVolBelowHalf: true })), 6, "all six true -> 6");

/* Synthetic dataset: bucket N has exactly N wins out of 10 examples, by
   construction, so the win rate should read back exactly N*10%. Wins carry
   a final return of +2%, losses -1%, so the average return per bucket has a
   known closed form. Only the first 5 of each bucket's 10 examples carry a
   maxDrawdownPct (set to N*0.1) — the other 5 omit it entirely, simulating
   older log rows written before drawdown tracking existed, so the average
   drawdown and its sample count must be computed only over the ones that
   have it, not silently treat the missing ones as 0. */
const examples = [];
for (let n = 0; n <= 6; n++) {
  for (let i = 0; i < 10; i++) {
    const keys = analyze.BLOCK_KEYS.slice(0, n);
    const b = blocks(Object.fromEntries(keys.map(k => [k, true])));
    const label = i < n ? 1 : 0;
    const entry = { blocks: b, label, finalReturnPct: label ? 2 : -1 };
    if (i < 5) entry.maxDrawdownPct = Math.round(n * 0.1 * 10) / 10;
    examples.push(entry);
  }
}
/* A few malformed/unresolved entries mixed in — must be ignored, not counted. */
const withNoise = examples.concat([
  { blocks: null, label: 1 },
  { blocks: blocks({ rsiOversold: true }), label: 2 },
  { notAnEntry: true }
]);

const result = analyze.analyzeConfluence(examples);
eq(result.total, 70, "total counts every valid example");
for (let n = 0; n <= 6; n++) {
  const row = result.rows.find(r => r.blocksTrue === n);
  eq(row.samples, 10, "bucket " + n + " has 10 samples");
  eq(row.wins, n, "bucket " + n + " has " + n + " wins by construction");
  eq(row.winRate, n * 10, "bucket " + n + " win rate reads back as " + (n * 10) + "%");

  const expectedAvgReturn = Math.round((n * 2 + (10 - n) * -1) / 10 * 10) / 10;
  eq(row.avgReturnPct, expectedAvgReturn, "bucket " + n + " average return matches the known wins/losses mix");

  eq(row.drawdownSamples, 5, "bucket " + n + " only averages drawdown over the 5 examples that actually logged it");
  const expectedAvgDrawdown = Math.round(n * 0.1 * 10) / 10;
  eq(row.avgDrawdownPct, expectedAvgDrawdown, "bucket " + n + " average drawdown ignores entries missing the field entirely");
}

/* analyzeConfluence() with no argument reads from the log file (respects
   the env override), and malformed/unlabeled rows are skipped entirely. */
fs.writeFileSync(process.env.DVL_OUTCOMES_LOG_FILE, examples.map(e => JSON.stringify(e)).join("\n") + "\n" + "not json\n");
const fromDisk = analyze.analyzeConfluence();
eq(fromDisk.total, 70, "reads the same total straight from the log file, ignoring the malformed line");

ok(withNoise.length > examples.length, "sanity: the noise array actually has extra entries (guards against a no-op edit above)");

/* comboKey formats the EXACT set of true blocks as single-letter badges
   (same letters the Scanner UI already shows), not just a count — "O+L"
   and "S+F+P" are different signal types even when both have 2-3 blocks
   true, and confluence-count buckets alone can't tell them apart. */
eq(analyze.comboKey(blocks()), "(nenhum)", "no blocks true formats as (nenhum), not an empty string");
eq(analyze.comboKey(blocks({ oiAboveAvg: true, lsrBelowAvg: true })), "O+L", "OI+LSR formats as O+L");
eq(analyze.comboKey(blocks({ spikeAboveAvg: true, flatVolumeBar: true, prevVolBelowHalf: true })), "S+F+P", "spike pos-flat's three blocks format as S+F+P");
eq(analyze.comboKey(blocks({ rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true })), "R+O+L", "letter order always follows BLOCK_KEYS order, not insertion order");

/* analyzeByCombination groups by the EXACT combination, so two examples
   with the same count but different blocks land in different rows. */
const comboExamples = [
  { blocks: blocks({ oiAboveAvg: true, lsrBelowAvg: true }), label: 1, finalReturnPct: 2, maxDrawdownPct: 0.2 },
  { blocks: blocks({ oiAboveAvg: true, lsrBelowAvg: true }), label: 1, finalReturnPct: 2, maxDrawdownPct: 0.4 },
  { blocks: blocks({ oiAboveAvg: true, lsrBelowAvg: true }), label: 0, finalReturnPct: -1 }, // no maxDrawdownPct on this one
  { blocks: blocks({ spikeAboveAvg: true, flatVolumeBar: true, prevVolBelowHalf: true }), label: 0, finalReturnPct: -1, maxDrawdownPct: 1 }
];
const byCombo = analyze.analyzeByCombination(comboExamples);
eq(byCombo.total, 4, "analyzeByCombination counts every example");
const ol = byCombo.rows.find(r => r.combo === "O+L");
const sfp = byCombo.rows.find(r => r.combo === "S+F+P");
ok(!!ol && !!sfp, "both distinct combinations show up as separate rows even though O+L has 2 blocks and S+F+P has 3");
eq(ol.samples, 3, "O+L aggregates all 3 examples that share that exact combination");
eq(ol.wins, 2, "O+L has 2 wins out of 3");
ok(Math.abs(ol.winRate - 66.7) < 0.1, "O+L win rate reads back as ~66.7%");
ok(Math.abs(ol.avgReturnPct - 1) < 0.01, "O+L average return is (2+2-1)/3 = 1");
eq(ol.drawdownSamples, 2, "O+L only averages drawdown over the 2 examples that logged it, not all 3");
ok(Math.abs(ol.avgDrawdownPct - 0.3) < 0.01, "O+L average drawdown is (0.2+0.4)/2 = 0.3");
eq(sfp.samples, 1, "S+F+P is a separate row with its own single example");
eq(sfp.combo, "S+F+P", "sanity: found the right row");

/* Rows come back sorted by sample count, most-seen combination first. */
ok(byCombo.rows[0].samples >= byCombo.rows[byCombo.rows.length - 1].samples, "rows are sorted with the most common combination first");

/* lettersToKeys parses free-form letter strings, de-duplicated and
   order-independent, ignoring separators/junk characters. */
assert.deepStrictEqual(analyze.lettersToKeys("R,O,L").sort(), ["lsrBelowAvg", "oiAboveAvg", "rsiOversold"].sort(), "comma-separated letters parse to the right keys");
assert.deepStrictEqual(analyze.lettersToKeys("ROL").sort(), ["lsrBelowAvg", "oiAboveAvg", "rsiOversold"].sort(), "letters with no separator parse the same way");
assert.deepStrictEqual(analyze.lettersToKeys("rol").sort(), ["lsrBelowAvg", "oiAboveAvg", "rsiOversold"].sort(), "lowercase input is accepted");
assert.deepStrictEqual(analyze.lettersToKeys("R+O+R+O+L").sort(), ["lsrBelowAvg", "oiAboveAvg", "rsiOversold"].sort(), "repeated letters are de-duplicated");
eq(analyze.lettersToKeys("xyz123").length, 0, "unknown characters contribute nothing");

/* analyzeSubset("R,O,L") is a SUPERSET match — it must find every example
   that has R, O AND L true, regardless of whatever else (S/F/P) is also
   true, since F/P show up in almost every real logged signal and an exact
   match would mostly come back empty even when R+O+L together are common. */
const subsetExamples = [
  { blocks: blocks({ rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true }), label: 1, finalReturnPct: 2, maxDrawdownPct: 0.1 }, // exact R+O+L
  { blocks: blocks({ rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true, flatVolumeBar: true, prevVolBelowHalf: true }), label: 0, finalReturnPct: -1 }, // R+O+L plus F+P tagging along
  { blocks: blocks({ rsiOversold: true, oiAboveAvg: true }), label: 1, finalReturnPct: 2 }, // missing L -> must NOT match
  { blocks: blocks({ spikeAboveAvg: true }), label: 0, finalReturnPct: -1 } // unrelated -> must NOT match
];
const subset = analyze.analyzeSubset("R,O,L", subsetExamples);
eq(subset.requested, "R+O+L", "requested combo formats with the canonical letter order");
eq(subset.samples, 2, "pools both examples that have R+O+L true, regardless of F/P tagging along");
eq(subset.wins, 1, "1 of the 2 matching examples won");
eq(subset.winRate, 50, "win rate is computed only over the matching subset");
ok(Math.abs(subset.avgReturnPct - 0.5) < 0.01, "average return is (2 + -1) / 2 = 0.5");
ok(subset.breakdown.some(r => r.combo === "R+O+L"), "breakdown includes the bare R+O+L combination");
ok(subset.breakdown.some(r => r.combo === "R+O+L+F+P"), "breakdown separately lists R+O+L+F+P as its own exact combination");

/* A combination that never occurred reports zero samples, not a crash. */
const noMatch = analyze.analyzeSubset("R,O,L", [{ blocks: blocks({ spikeAboveAvg: true }), label: 1, finalReturnPct: 2 }]);
eq(noMatch.samples, 0, "a combination with no matching examples reports 0 samples");
eq(noMatch.winRate, null, "win rate is null (not NaN/0) when there's nothing to compute it from");
eq(noMatch.breakdown.length, 0, "breakdown is empty when nothing matches");

/* analyzeByFeatureBins buckets by the RAW value of a continuous feature
   into quantile bins (not fixed-width), so each bin gets a similar sample
   count — this answers "at what actual value does this start working,"
   not just "does the boolean help." Built here so rsi14 cleanly predicts
   the label (low RSI wins, high RSI loses), giving an exact staircase of
   win rates per bin to check against. */
const featureExamples = [];
for (let i = 0; i < 20; i++) {
  const rsi14 = i * 5;
  const label = i < 10 ? 1 : 0;
  const entry = { features: { rsi14 }, label, finalReturnPct: label ? 2 : -1 };
  if (i < 10) entry.maxDrawdownPct = 0.5; // only half carry a drawdown value, like older log rows missing the field
  featureExamples.push(entry);
}
/* A few examples missing the feature entirely (legacy rows / no features
   object at all) must be excluded from the total, not crash or count as 0. */
const featureExamplesWithGaps = featureExamples.concat([
  { features: {}, label: 1, finalReturnPct: 2 },
  { label: 0, finalReturnPct: -1 }
]);

/* The trend features (OI slope, LSR slope, RSI recovery from its recent
   low — the "V") are analyzable the same way as any other continuous
   feature, not a special case. */
ok(["oiSlope", "lsrSlope", "rsiRecoveryFromLow"].every(k => analyze.CONT_FEATURE_KEYS.includes(k)), "the trend features are registered as analyzable continuous features");

const bins = analyze.analyzeByFeatureBins("rsi14", featureExamplesWithGaps, 5);
eq(bins.feature, "rsi14", "reports which feature was analyzed");
eq(bins.total, 20, "gap entries (missing features/feature key) are excluded from the total");
eq(bins.rows.length, 5, "splits into the requested number of bins");
eq(bins.rows[0].rangeMin, 0, "bin 0 starts at the lowest rsi14 value");
eq(bins.rows[0].rangeMax, 15, "bin 0 ends where the quantile split falls");
eq(bins.rows[0].winRate, 100, "bin 0 (lowest RSI) is a clean 100% win rate by construction");
eq(bins.rows[1].winRate, 100, "bin 1 is still entirely winners");
eq(bins.rows[2].winRate, 50, "bin 2 straddles the win/loss boundary at 50%");
eq(bins.rows[3].winRate, 0, "bin 3 (higher RSI) is a clean 0% by construction");
eq(bins.rows[4].winRate, 0, "bin 4 (highest RSI) is also a clean 0%");
eq(bins.rows[4].rangeMin, 80, "bin 4 starts at 80");
eq(bins.rows[4].rangeMax, 95, "bin 4 ends at the highest rsi14 value in the dataset");

/* Drawdown is only averaged over samples that logged it, same convention
   as the other tables — bin 0 (indices 0-3) all have it, bin 2 (indices
   8-11) only half do (8,9 do; 10,11 don't). */
eq(bins.rows[0].drawdownSamples, 4, "bin 0's drawdown average covers all 4 of its samples (all logged it)");
eq(bins.rows[2].drawdownSamples, 2, "bin 2 only averages drawdown over the 2 samples that logged it, not all 4");

/* Unknown feature name / no data at all returns an empty result, not a crash. */
const emptyBins = analyze.analyzeByFeatureBins("rsi14", [], 5);
eq(emptyBins.total, 0, "no examples at all -> total 0");
eq(emptyBins.rows.length, 0, "no rows when there's nothing to bucket");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
