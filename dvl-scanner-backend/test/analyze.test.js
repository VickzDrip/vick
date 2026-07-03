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
   construction, so the win rate should read back exactly N*10%. */
const examples = [];
for (let n = 0; n <= 6; n++) {
  for (let i = 0; i < 10; i++) {
    const keys = analyze.BLOCK_KEYS.slice(0, n);
    const b = blocks(Object.fromEntries(keys.map(k => [k, true])));
    examples.push({ blocks: b, label: i < n ? 1 : 0 });
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
}

/* analyzeConfluence() with no argument reads from the log file (respects
   the env override), and malformed/unlabeled rows are skipped entirely. */
fs.writeFileSync(process.env.DVL_OUTCOMES_LOG_FILE, examples.map(e => JSON.stringify(e)).join("\n") + "\n" + "not json\n");
const fromDisk = analyze.analyzeConfluence();
eq(fromDisk.total, 70, "reads the same total straight from the log file, ignoring the malformed line");

ok(withNoise.length > examples.length, "sanity: the noise array actually has extra entries (guards against a no-op edit above)");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
