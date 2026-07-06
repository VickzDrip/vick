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
const rowLong = { rawSymbol: "BTC_USDT", side: "LONG", price: 100, spikeScore: 82, blocks: { spikeAboveAvg: true, rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true, flatVolumeBar: true, prevVolBelowHalf: true }, oiSlope: 0.12, lsrSlope: -0.08, rsiRecoveryFromLow: 7.5, netLongRatio: 0.22, netShortRatio: -0.15, netDeltaRatio: 0.31, netDeltaSlope: 0.19 };
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
eq(logged[0].features.netLongRatio, 0.22, "Net Long ratio is captured");
eq(logged[0].features.netShortRatio, -0.15, "Net Short ratio is captured");
eq(logged[0].features.netDeltaRatio, 0.31, "Net Delta ratio is captured");
eq(logged[0].features.netDeltaSlope, 0.19, "Net Delta slope is captured");

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

/* 10) historyForSymbol — the raw material for plotting markers on a
   symbol's own chart: every resolved AND still-pending signal for that
   symbol, oldest first, regardless of exchange/source. */
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "HIST_USDT" }), T0);
outcomes.checkOutcomes("mexc", { HIST_USDT: 102.5 }, T0 + 10 * MIN); // resolves via target
outcomes.recordSignal("mexc", "15m", Object.assign({}, rowLong, { rawSymbol: "HIST_USDT" }), T0 + HOUR, "manual");
// leave the second one pending (no matching checkOutcomes call for it yet)

const hist = outcomes.historyForSymbol("HIST_USDT");
eq(hist.length, 2, "returns both the resolved and the still-pending entry for this symbol");
eq(hist[0].at, T0, "oldest entry comes first");
eq(hist[0].status, "resolved", "the first (older) entry already resolved");
eq(hist[0].outcome, "target", "resolved entry carries its outcome");
eq(hist[0].source, "auto", "the first entry defaults to source \"auto\"");
eq(hist[1].at, T0 + HOUR, "second (newer) entry comes after");
eq(hist[1].status, "pending", "the second entry is still pending");
eq(hist[1].source, "manual", "the second entry keeps its manual tag");
ok(hist[1].blocks && hist[1].blocks.rsiOversold === true, "pending entries also carry their block snapshot");

eq(outcomes.historyForSymbol("NOBODY_USDT").length, 0, "a symbol with no history at all returns an empty array, not undefined/throw");
eq(outcomes.historyForSymbol("").length, 0, "an empty/missing symbol returns an empty array rather than matching everything");
eq(outcomes.historyForSymbol("hist_usdt").length, 2, "symbol matching is case-insensitive");

/* Rows logged before Net Long/Short/Delta existed (or where the extra
   server-side fetch failed) lack these fields entirely — must default to
   a neutral 0, never crash/NaN, so old and new samples stay minglable in
   the same training set (see train.js's normalizeContinuous). Appended at
   the very end so it doesn't shift indices any earlier sequential test
   relies on. */
outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "NONET_USDT", netLongRatio: undefined, netShortRatio: undefined, netDeltaRatio: undefined, netDeltaSlope: undefined }), T0 + 2 * HOUR);
outcomes.checkOutcomes("binance", { NONET_USDT: 102.5 }, T0 + 2 * HOUR + 10 * MIN);
const loggedNoNet = readLog().find(e => e.symbol === "NONET_USDT");
ok(!!loggedNoNet, "the no-net-flow-data entry did get logged");
eq(loggedNoNet.features.netLongRatio, 0, "missing Net Long ratio defaults to neutral 0, not undefined/NaN");
eq(loggedNoNet.features.netDeltaSlope, 0, "missing Net Delta slope defaults to neutral 0, not undefined/NaN");

/* Divergence warning (metrics.js's netFlowDivergence) — logged as its own
   top-level field, informational only, alongside (not inside) `features`.
   Also appended at the end for the same index-stability reason as above. */
outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "DIVERGE_USDT", divergenceWarning: true, divergenceCount: 3 }), T0 + 3 * HOUR);
outcomes.checkOutcomes("binance", { DIVERGE_USDT: 102.5 }, T0 + 3 * HOUR + 10 * MIN);
const loggedDiv = readLog().find(e => e.symbol === "DIVERGE_USDT");
ok(!!loggedDiv, "the divergence-flagged entry did get logged");
eq(loggedDiv.divergenceWarning, true, "divergenceWarning is captured as its own top-level field");
eq(loggedDiv.divergenceCount, 3, "divergenceCount is captured alongside it");

outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "NODIVERGE_USDT", divergenceWarning: undefined, divergenceCount: undefined }), T0 + 4 * HOUR);
outcomes.checkOutcomes("binance", { NODIVERGE_USDT: 102.5 }, T0 + 4 * HOUR + 10 * MIN);
const loggedNoDiv = readLog().find(e => e.symbol === "NODIVERGE_USDT");
eq(loggedNoDiv.divergenceWarning, false, "missing divergenceWarning defaults to false, not undefined");
eq(loggedNoDiv.divergenceCount, 0, "missing divergenceCount defaults to 0, not undefined/NaN");

/* ATR-based triple barrier (replaces the old fixed-%): entry at 100 with
   atr14=2 -> stopDist = 2 x ATR_MULT(1.5) = 3 -> stop at 97, target at
   100 + 3 x REWARD_MULT(2) = 106. Also appended at the end. */
outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "ATRTGT_USDT", atr14: 2 }), T0 + 5 * HOUR);
outcomes.checkOutcomes("binance", { ATRTGT_USDT: 98 }, T0 + 5 * HOUR + 5 * MIN);
ok(!readLog().some(e => e.symbol === "ATRTGT_USDT"), "at $98 (2% down) the OLD %-rule would already have stopped it out, but the ATR stop (97) hasn't been hit yet — still pending");
outcomes.checkOutcomes("binance", { ATRTGT_USDT: 106 }, T0 + 5 * HOUR + 10 * MIN);
const loggedAtrTarget = readLog().find(e => e.symbol === "ATRTGT_USDT");
ok(!!loggedAtrTarget, "resolves once price actually reaches the ATR-based target");
eq(loggedAtrTarget.label, 1, "hitting the ATR target labels favorable (1)");
eq(loggedAtrTarget.outcome, "target", "resolved via the ATR target, not the old % one");
eq(loggedAtrTarget.atr14, 2, "the atr14 captured at signal time is preserved on the logged entry");
eq(loggedAtrTarget.stopDist, 3, "stopDist = atr14 x ATR_MULT is precomputed once at signal time (2 x 1.5 = 3)");

outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "ATRSTOP_USDT", atr14: 2 }), T0 + 6 * HOUR);
outcomes.checkOutcomes("binance", { ATRSTOP_USDT: 97 }, T0 + 6 * HOUR + 5 * MIN);
const loggedAtrStop = readLog().find(e => e.symbol === "ATRSTOP_USDT");
ok(!!loggedAtrStop, "resolves once price reaches the ATR-based stop");
eq(loggedAtrStop.label, 0, "hitting the ATR stop labels unfavorable (0)");
eq(loggedAtrStop.outcome, "stop", "resolved via the ATR stop, not the old % one");

/* No atr14 at signal time (e.g. a brand-new listing without enough candle
   history) -> falls back to the original %-based barrier exactly as
   before this change. */
outcomes.recordSignal("binance", "15m", Object.assign({}, rowLong, { rawSymbol: "NOATR_USDT", atr14: undefined }), T0 + 7 * HOUR);
outcomes.checkOutcomes("binance", { NOATR_USDT: 101.5 }, T0 + 7 * HOUR + 5 * MIN); // +1.5%, below the fallback 2% target
ok(!readLog().some(e => e.symbol === "NOATR_USDT"), "still pending at +1.5% (below the fallback 2% target)");
outcomes.checkOutcomes("binance", { NOATR_USDT: 102 }, T0 + 7 * HOUR + 10 * MIN); // +2% clears PROFIT_TARGET_PCT
const loggedNoAtr = readLog().find(e => e.symbol === "NOATR_USDT");
ok(!!loggedNoAtr, "resolves via the fallback %-based barrier when no atr14 was ever captured");
eq(loggedNoAtr.label, 1, "the fallback rule labels a +2% move favorable, same as before ATR existed");
eq(loggedNoAtr.stopDist, 0, "stopDist is 0 (not set) for an entry with no valid atr14");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
