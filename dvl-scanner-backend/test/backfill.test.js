"use strict";

/* Historical backfill: mining past close-confirmed ignitions from a fetched
   window seeds the backtest dataset immediately (instead of waiting ~5h per
   live signal), carries the RSI reading (so they count as "complete"), and is
   idempotent across cycles/restarts (dedup by sym|tf|barTime). */

const assert = require("assert");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Isolate the on-disk dataset so this test never touches real data.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-backfill-"));
process.env.DVL_PUMP_DATA_FILE = path.join(tmp, "pump-dataset.jsonl");
process.env.DVL_PUMP_MODEL_FILE = path.join(tmp, "pump-model.json");

const pumpModel = require("../src/pumpModel");
const worker = require("../src/worker");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }

/* Build a synthetic 15m window with a clean pré-volume→spike ignition:
   a long dead base (volume well below its MA) followed by a bar that crosses
   above the MA, then a rising path so it resolves with a positive up-move. */
const N = 90;
const base = [];
let price = 100;
const T0 = 1_700_000_000_000;
for (let i = 0; i < N; i++) {
  /* Declining base volume so each bar sits BELOW its trailing MA (the "calmaria"
     pré-volume), then a big spike bar at i=60 that crosses above the MA. */
  let vol;
  if (i < 60) vol = 3000 - i * 30;      // 3000 → 1230, steadily below its MA
  else if (i === 60) vol = 30000;       // the ignition spike (crosses the MA)
  else vol = 400;                       // quiet after
  const drift = i <= 60 ? 0.0 : 0.6;    // rise after the spike so up-move resolves
  const open = price;
  price = price + drift + (i % 2 === 0 ? 0.05 : -0.05);
  const close = price;
  const high = Math.max(open, close) + 0.2;
  const low = Math.min(open, close) - 0.2;
  base.push({ time: T0 + i * 900000, open, high, low, close, volume: vol });
}

// A fake EXR series: sobrevendido (low value) around the spike bar.
const series = base.map(c => ({ time: c.time, value: 25, base: 25, push: 0 }));
const opts = { upperZone: 60, lowerZone: 35 };

const before = pumpModel.getDataset().length;
const rec1 = worker.backfillHistory("TESTUSDT", "15m", base, series, opts);
ok(rec1 >= 1, "backfill records at least one historical ignition (got " + rec1 + ")");

const ds = pumpModel.getDataset();
ok(ds.length > before, "dataset grew after backfill (" + before + " → " + ds.length + ")");
const complete = ds.filter(s => Array.isArray(s.exrCloses) && s.exrCloses.length);
ok(complete.length >= 1, "backfilled signal is COMPLETE (carries exrCloses)");
const withPath = ds.filter(s => Array.isArray(s.path) && s.path.length);
ok(withPath.length >= 1, "backfilled signal carries the resolved price path");

// Idempotency: running the SAME window again records nothing new.
const rec2 = worker.backfillHistory("TESTUSDT", "15m", base, series, opts);
ok(rec2 === 0, "re-running the same window records 0 new (idempotent, got " + rec2 + ")");
const dsAfter = pumpModel.getDataset().length;
ok(dsAfter === ds.length, "dataset size unchanged on the idempotent re-run");

// Restart safety: persist to disk, reload, re-run → still no duplicates.
pumpModel.save();
pumpModel.load();
const rec3 = worker.backfillHistory("TESTUSDT", "15m", base, series, opts);
ok(rec3 === 0, "after save+load, re-running still records 0 (restart-idempotent, got " + rec3 + ")");

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}

console.log(fail ? ("BACKFILL — " + pass + " passed, " + fail + " FAILED")
                 : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
