"use strict";

/* Minimal parity / sanity test — runs with `npm test`, no network.
   Confirms the ported score() spreads like the in-page fix
   (37/53/73/93/97) and that computeSignal returns coherent fields. */

const assert = require("assert");
const M = require("../src/metrics");

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  try { assert.strictEqual(actual, expected); pass++; }
  catch (_) { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }

/* 1) Score spread matches the in-page range-normalized score(). */
const cases = [
  { spike20: 3, spike50: 1.5, flatCandles: 0, barPct: -0.5, prevVolBelowHalf: true, priceGlueOk: false, want: 37 },
  { spike20: 5, spike50: 2.5, flatCandles: 1, barPct: 1.4, prevVolBelowHalf: true, priceGlueOk: false, want: 53 },
  { spike20: 8, spike50: 3, flatCandles: 3, barPct: 2.0, prevVolBelowHalf: true, priceGlueOk: false, want: 73 },
  { spike20: 12, spike50: 6, flatCandles: 5, barPct: 3.0, prevVolBelowHalf: true, priceGlueOk: true, want: 93 },
  { spike20: 30, spike50: 15, flatCandles: 9, barPct: 6.0, prevVolBelowHalf: true, priceGlueOk: true, want: 97 }
];
cases.forEach((c, i) => eq(M.score(c), c.want, "score case " + i));

/* 2) Not everything is 99 (the bug we fixed). */
ok(new Set(cases.map(c => M.score(c))).size > 1, "scores must differentiate, not all 99");

/* 3) computeSignal sanity on a synthetic flat-then-spike series. */
const closes = [], vols = [];
for (let i = 0; i < 60; i++) { closes.push(100 + Math.sin(i / 5)); vols.push(100); }
vols[vols.length - 2] = 40;        // prior bar low
vols[vols.length - 1] = 900;       // spike bar
closes[closes.length - 1] = 104;   // strong up candle
const sig = M.computeSignal(closes, vols);
ok(sig.spike20 > 3, "spike20 should be elevated on a spike bar (got " + sig.spike20.toFixed(2) + ")");
ok(sig.prevVolBelowHalf === true, "prevVolBelowHalf should be true");
eq(sig.side, "LONG", "side should be LONG on an up candle");
ok(sig.rsi14 >= 0 && sig.rsi14 <= 100, "rsi14 in [0,100]");
ok(Array.isArray(sig.last5Closes) && sig.last5Closes.length === 5, "last5Closes has 5 entries");

/* 4) status thresholds. */
eq(M.statusOf({ flatCandles: 6 }, 80), "Spike pós-flat", "postflat status");
eq(M.statusOf({ flatCandles: 0 }, 80), "Spike limpo", "clean status");
eq(M.statusOf({ flatCandles: 0 }, 50), "Monitorar", "monitor status");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
