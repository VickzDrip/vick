"use strict";

/* Offline test for the outcome-logging groundwork (ML prerequisite) — no
   network, no real timers: checkOutcomes() takes `now` explicitly so we can
   simulate elapsed time directly. Uses temp files so it never touches the
   real data/ directory. */

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

const T0 = 1000000000000; // arbitrary base timestamp (ms)
const HOUR = 3600000;

/* 1) A fresh signal starts pending with no returns yet. */
const row = { rawSymbol: "BTC_USDT", side: "LONG", price: 100, spikeScore: 82, blocks: { spikeAboveAvg: true, rsiOversold: true, oiAboveAvg: true, lsrBelowAvg: true, flatVolumeBar: true, prevVolBelowHalf: true } };
outcomes.recordSignal("mexc", "15m", row, T0);
eq(outcomes.loadStats().pending, 1, "one entry pending after recordSignal");

/* Recording the exact same (exchange, tf, symbol, at) again is a no-op. */
outcomes.recordSignal("mexc", "15m", row, T0);
eq(outcomes.loadStats().pending, 1, "duplicate recordSignal does not add a second entry");

/* 2) Before 15m elapsed, checkOutcomes should not resolve or drop it. */
outcomes.checkOutcomes("mexc", { BTC_USDT: 105 }, T0 + 5 * 60000);
eq(outcomes.loadStats().pending, 1, "still pending before the 15m horizon");
eq(outcomes.loadStats().resolved, 0, "nothing resolved yet");

/* 3) Past 15m but well before 24h: partial fill, still pending, not logged. */
outcomes.checkOutcomes("mexc", { BTC_USDT: 110 }, T0 + 20 * 60000);
eq(outcomes.loadStats().pending, 1, "still pending between 15m and 24h");
eq(outcomes.loadStats().resolved, 0, "not logged before the resolve horizon (24h)");

/* 4) Past 24h with a fresh price: fully resolved, appended to the log, and
   removed from pending. +20% at 24h. */
outcomes.checkOutcomes("mexc", { BTC_USDT: 120 }, T0 + 24 * HOUR + 60000);
eq(outcomes.loadStats().pending, 0, "resolved entry leaves pending");
eq(outcomes.loadStats().resolved, 1, "resolved entry is appended to the log");

const logged = fs.readFileSync(process.env.DVL_OUTCOMES_LOG_FILE, "utf8").trim().split("\n").map(l => JSON.parse(l));
eq(logged.length, 1, "log has exactly one line");
const e = logged[0];
eq(e.symbol, "BTC_USDT", "logged entry has the right symbol");
eq(e.entryPrice, 100, "logged entry keeps the entry price");
ok(Math.abs(e.returns.r15m - 10) < 0.01, "r15m ~= +10% (got " + e.returns.r15m + ")");
ok(Math.abs(e.returns.r24h - 20) < 0.01, "r24h ~= +20% (got " + e.returns.r24h + ")");
ok(e.blocks && e.blocks.rsiOversold === true, "block snapshot is preserved on the logged entry");

/* 5) A signal that never sees a fresh price again gets dropped as stale,
   without ever being appended to the log. */
outcomes.recordSignal("mexc", "15m", { rawSymbol: "DEAD_USDT", side: "LONG", price: 50, spikeScore: 60, blocks: {} }, T0);
eq(outcomes.loadStats().pending, 1, "the stale-candidate entry is pending");
outcomes.checkOutcomes("mexc", {}, T0 + 49 * HOUR); // way past STALE_MS (48h), no price ever supplied
eq(outcomes.loadStats().pending, 0, "stale entry with no fresh price is dropped");
eq(outcomes.loadStats().resolved, 1, "stale entry never gets appended to the log");

/* 6) checkOutcomes only touches entries for the given exchange. */
outcomes.recordSignal("binance", "1h", { rawSymbol: "ETH_USDT", side: "SHORT", price: 200, spikeScore: 70, blocks: {} }, T0);
outcomes.checkOutcomes("mexc", { ETH_USDT: 999 }, T0 + 25 * HOUR); // wrong exchange — must not resolve it
eq(outcomes.loadStats().pending, 1, "binance entry untouched by a mexc checkOutcomes call");
outcomes.checkOutcomes("binance", { ETH_USDT: 190 }, T0 + 25 * HOUR);
eq(outcomes.loadStats().pending, 0, "binance entry resolves on its own exchange's checkOutcomes call");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
