"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// isolate the log file
const TMP = path.join(require("os").tmpdir(), "vrsi-store-test-" + process.pid + ".jsonl");
process.env.DVL_VRSI_LOG_FILE = TMP;
try { fs.unlinkSync(TMP); } catch (_) { }
const store = require("../src/vrsiStore");

function mkKlines(nEpisodes) {
  // repeating dip→bounce episodes so RSI-V pivots appear; enough history that the
  // forward horizon closes for the early ones.
  const closes = [];
  let p = 100; const saw = i => (i % 2 ? 0.6 : -0.6);
  for (let e = 0; e < nEpisodes; e++) {
    for (let i = 0; i < 20; i++) { p += -1.3 + saw(i); closes.push(p); }
    for (let i = 0; i < 24; i++) { p += 1.3 + saw(i); closes.push(p); }
  }
  return closes.map((c, i) => ({ time: i * 60000, open: c, high: c + 0.4, low: c - 0.4, close: c, volume: 1000 + (i % 5) * 300 }));
}

(function testIngestDedupAndLearn() {
  const bars = mkKlines(12);
  const n1 = store.ingest("BTCUSDT", "1m", bars, bars, {});
  assert(n1 >= 0, "ingest returns a count");
  // second ingest of the SAME candles logs nothing new (dedup)
  const n2 = store.ingest("BTCUSDT", "1m", bars, bars, {});
  assert.strictEqual(n2, 0, "no duplicates on re-ingest, got " + n2);
  const stored = store.samplesFor("1m");
  assert.strictEqual(stored.length, n1, "stored count matches first ingest");
  for (const s of stored) { assert(s.symbol === "BTCUSDT" && s.tf === "1m", "tagged"); assert(Array.isArray(s.path) && s.path.length, "has path"); }
  console.log("  logged samples:", n1);

  // learn (force, low min so the synthetic set qualifies)
  const m = store.learn({ force: true, minSamples: 5 });
  assert(m["1m"], "model computed for 1m");
  const st = store.status();
  assert(st.tfs["1m"].samples === n1, "status sample count");
  console.log("  1m ready:", st.tfs["1m"].ready, "long:", JSON.stringify(st.tfs["1m"].long));

  // backtest doesn't throw and reports readiness
  const bt = store.backtest("1m");
  assert(bt && (bt.ready === true || bt.ready === false), "backtest returns readiness");
})();

(function testTfIsolation() {
  const before5 = store.samplesFor("5m").length;
  assert(before5 === 0, "5m empty until fed");
})();

try { fs.unlinkSync(TMP); } catch (_) { }
console.log("vrsiStore.test.js OK");
