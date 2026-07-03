"use strict";

/* Offline test for the outcome-logging groundwork (ML prerequisite) — no
   network, no real timers: checkOutcomes() takes `now` explicitly so we can
   simulate elapsed time and price paths directly. Uses temp files so it
   never touches the real data/ directory.

   Resolution is a "triple barrier": whichever comes first — a profit
   target, a stop loss, or a max-time safety timeout — decided by checking
   price every call, not by waiting for a fixed clock horizon. */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dvl-outcomes-test-"));
process.env.DVL_OUTCOMES_PENDING_FILE = path.join(tmpDir, "pending.json");
process.env.DVL_OUTCOMES_LOG_FILE = path.join(tmpDir, "log.jsonl");

const outcomes = require("../src/outcomes");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}
function readLog() {
  try { return fs.readFileSync(process.env.DVL_OUTCOMES_LOG_FILE, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l)); }
  catch (_) { return []; }
}

const T0 = 1000000000000; // arbitrary base timestamp (ms)
const MIN = 60000, HOUR = 3600000;

/* 1) A fresh signal starts pending with no label yet. */
const rowLong = { rawSymbol: "BTC_USDT", side: "LONG", price: 100, spikeScore: 82, blocks: { spikeAboveAvg: true, rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true, flatVolumeBar: true, prevVolBelowHalf: true }, oiSlope: 0.12, lsrSlope: -0.08, rsiRecoveryFromLow: 7.5 };
outcomes.recordSignal("mexc", "15m", rowLong, T0);
eq(outcomes.loadStats().pending, 1, "one entry pending after recordSignal");

/* Recording the exact same (exchange, tf, symbol, at) again is a no-op. */
outcomes.recordSignal("mexc", "15m", rowLong, T0);
eq(outcomes.loadStats().pending, 1, "duplicate recordSignal does not add a second entry");

/* 2) A small move that hits neither barrier keeps it pending, but fills in
   the informational return snapshots as time passes. */
outcomes.checkOutcomes("mexc", { BTC_USDT: 100.5 }, T0 + 20 * MIN);
eq(outcomes.loadStats().pending, 1, "still pending — no barrier hit yet");
eq(outcomes.loadStats().resolved, 0, "nothing resolved yet");

/* 3) Price hits the +2% profit target well before the 4h timeout — resolves
   immediately (event-driven), not on a fixed clock. */
outcomes.checkOutcomes("mexc", { BTC_USDT: 102.5 }, T0 + 35 * MIN);
eq(outcomes.loadStats().pending, 0, "resolves as soon as the target is hit");
eq(outcomes.loadStats().resolved, 1, "resolved entry is appended to the log");
let logged = readLog();
eq(logged.length, 1, "log has exactly one line");
eq(logged[0].label, 1, "hitting the profit target labels the example favorable (1)");
eq(logged[0].outcome, "target", "records WHY it resolved");
ok(Math.abs(logged[0].finalReturnPct - 2.5) < 0.01, "records the actual return at resolution (~+2.5%, got " + logged[0].finalReturnPct + ")");
ok(logged[0].returns.r15m !== undefined, "informational r15m snapshot was filled in along the way");
ok(logged[0].blocks && logged[0].blocks.rsiOversold === true, "block snapshot is preserved on the logged entry");
ok(logged[0].features && logged[0].features.spike20 !== undefined, "continuous feature snapshot is preserved on the logged entry");
eq(logged[0].features.oiSlope, 0.12, "TREND features (OI slope) are captured alongside the snapshot ratio");
eq(logged[0].source, "auto", "no source argument defaults to \"auto\" (a scanner detection)");
eq(logged[0].features.lsrSlope, -0.08, "LSR slope is captured");
eq(logged[0].features.rsiRecoveryFromLow, 7.5, "the RSI 'V' recovery magnitude is captured");

/* 4) A stop-loss hit resolves unfavorably (label 0), just as fast. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "ETH_USDT" }), T0);
outcomes.checkOutcomes("mexc", { ETH_USDT: 99 }, T0 + 10 * MIN); // -1% hits the stop
logged = readLog();
eq(logged.length, 2, "second entry logged after hitting its stop");
eq(logged[1].label, 0, "hitting the stop loss labels the example unfavorable (0)");
eq(logged[1].outcome, "stop", "records the stop-loss reason");

/* 5) SHORT side inverts direction: price going DOWN is favorable. */
outcomes.recordSignal("mexc", "15m", { rawSymbol: "SOL_USDT", side: "SHORT", price: 50, spikeScore: 70, blocks: {} }, T0);
outcomes.checkOutcomes("mexc", { SOL_USDT: 49 }, T0 + 10 * MIN); // price -2% -> +2% favorable for a short
logged = readLog();
eq(logged.length, 3, "short entry resolves too");
eq(logged[2].label, 1, "a downward move hits the SHORT's profit target, not its stop");
eq(logged[2].outcome, "target", "confirms it resolved via the target, side-adjusted");

/* 6) Neither barrier hit within MAX_HORIZON_MS: resolves via "timeout",
   labeled by whichever side of zero the return sits on. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "XRP_USDT" }), T0);
outcomes.checkOutcomes("mexc", { XRP_USDT: 100.3 }, T0 + outcomes.MAX_HORIZON_MS + MIN); // +0.3%, hits neither barrier
logged = readLog();
eq(logged.length, 4, "timed-out entry still resolves (doesn't hang forever)");
eq(logged[3].outcome, "timeout", "records the timeout reason");
eq(logged[3].label, 1, "a small positive return at timeout labels favorable (1)");

/* 7) A symbol that never sees a fresh price again gets dropped as stale,
   without ever being appended to the log. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "DEAD_USDT" }), T0);
eq(outcomes.loadStats().pending, 1, "the stale-candidate entry is pending");
outcomes.checkOutcomes("mexc", {}, T0 + 25 * HOUR); // way past STALE_MS (24h), no price ever supplied
eq(outcomes.loadStats().pending, 0, "stale entry with no fresh price is dropped");
eq(outcomes.loadStats().resolved, 4, "stale entry never gets appended to the log");

/* 8) maxDrawdownPct tracks the worst adverse excursion seen before
   resolution, side-adjusted, even if the signal ultimately resolves in its
   favor — a dip against the position on the way to the target still shows
   up as a drawdown. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "DOGE_USDT" }), T0);
outcomes.checkOutcomes("mexc", { DOGE_USDT: 99.4 }, T0 + 5 * MIN);  // -0.6% dip against the LONG
outcomes.checkOutcomes("mexc", { DOGE_USDT: 99.7 }, T0 + 10 * MIN); // recovers a bit, still not a new worst
outcomes.checkOutcomes("mexc", { DOGE_USDT: 102.1 }, T0 + 20 * MIN); // +2.1% hits the target
logged = readLog();
const dogeEntry = logged.find(e => e.symbol === "DOGE_USDT");
ok(dogeEntry.label === 1, "still resolves favorably despite the earlier dip");
ok(Math.abs(dogeEntry.maxDrawdownPct - 0.6) < 0.01, "maxDrawdownPct records the deepest adverse dip seen (~0.6%, got " + dogeEntry.maxDrawdownPct + ")");

/* A signal that never moves against the position at all logs a drawdown of
   exactly 0, not undefined/missing. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "SHIB_USDT" }), T0);
outcomes.checkOutcomes("mexc", { SHIB_USDT: 100.8 }, T0 + 5 * MIN);
outcomes.checkOutcomes("mexc", { SHIB_USDT: 102.2 }, T0 + 15 * MIN); // straight up to the target, no dip
logged = readLog();
const shibEntry = logged.find(e => e.symbol === "SHIB_USDT");
eq(shibEntry.maxDrawdownPct, 0, "no adverse move at all logs a drawdown of exactly 0");

/* A manual trade (the user opening a position by hand, not a scanner
   detection) is tagged source="manual" but resolves through the exact same
   triple-barrier logic — no special-casing, so manual and auto-detected
   examples stay comparable in the same training set. */
outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "TLM_USDT" }), T0, "manual");
outcomes.checkOutcomes("binance", { TLM_USDT: 102 }, T0 + 10 * MIN);
logged = readLog();
const manualEntry = logged.find(e => e.symbol === "TLM_USDT");
eq(manualEntry.source, "manual", "manual trades are tagged source=\"manual\"");
eq(manualEntry.label, 1, "resolves via the same +2%/-1%/4h triple barrier as any other signal, no special treatment");

/* 9) checkOutcomes only touches entries for the given exchange. */
outcomes.recordSignal("binance", "1h", { rawSymbol: "ADA_USDT", side: "LONG", price: 10, spikeScore: 60, blocks: {} }, T0);
outcomes.checkOutcomes("mexc", { ADA_USDT: 999 }, T0 + 30 * MIN); // wrong exchange — must not resolve it
eq(outcomes.loadStats().pending, 1, "binance entry untouched by a mexc checkOutcomes call");
outcomes.checkOutcomes("binance", { ADA_USDT: 10.3 }, T0 + 30 * MIN); // +3% hits the target on its own exchange
eq(outcomes.loadStats().pending, 0, "binance entry resolves on its own exchange's checkOutcomes call");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
