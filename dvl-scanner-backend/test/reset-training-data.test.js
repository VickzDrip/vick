"use strict";

/* Offline test for the training-data reset script — no network. Uses temp
   files via the same env var overrides the rest of the test suite relies on. */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-reset-test-"));
process.env.DVL_OUTCOMES_LOG_FILE = path.join(tmpDir, "outcomes-log.jsonl");
process.env.DVL_OUTCOMES_PENDING_FILE = path.join(tmpDir, "outcomes-pending.json");
process.env.DVL_MODEL_FILE = path.join(tmpDir, "learned-weights.json");

const reset = require("../src/reset-training-data");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}

/* 1) Seed all three files with recognizable content. */
fs.writeFileSync(reset.LOG_FILE, '{"label":1}\n');
fs.writeFileSync(reset.PENDING_FILE, '{"a":1}');
fs.writeFileSync(reset.MODEL_FILE, '{"trained":true}');

const archiveDir = reset.resetTrainingData();

/* 2) All three original files are gone from their live paths. */
ok(!fs.existsSync(reset.LOG_FILE), "outcomes log no longer at its live path");
ok(!fs.existsSync(reset.PENDING_FILE), "pending file no longer at its live path");
ok(!fs.existsSync(reset.MODEL_FILE), "model file no longer at its live path");

/* 3) Nothing is lost — the exact same content is sitting in the archive dir. */
eq(fs.readFileSync(path.join(archiveDir, path.basename(reset.LOG_FILE)), "utf8"), '{"label":1}\n', "outcomes log content preserved in the archive");
eq(fs.readFileSync(path.join(archiveDir, path.basename(reset.PENDING_FILE)), "utf8"), '{"a":1}', "pending file content preserved in the archive");
eq(fs.readFileSync(path.join(archiveDir, path.basename(reset.MODEL_FILE)), "utf8"), '{"trained":true}', "model file content preserved in the archive");

/* 4) Calling it again with nothing to archive (fresh state) doesn't throw,
   and simply reports nothing to do rather than crashing on missing files. */
let threw = false;
try { reset.resetTrainingData(); } catch (_) { threw = true; }
ok(!threw, "resetting again with no live files present does not throw");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
