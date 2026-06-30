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

/* 5) Ignition: dead volume base below MA, then first cross above it. */
const ic = [], iv = [];
for (let i = 0; i < 40; i++) { ic.push(100 + Math.sin(i / 6)); iv.push(300); } // high base → high MA
for (let i = 0; i < 18; i++) { ic.push(100 + Math.sin(i / 6)); iv.push(50); }  // dead base, below MA
ic.push(101); iv.push(400);                                                     // first cross above MA
const isig = M.computeSignal(ic, iv);
ok(isig.isIgnition === true, "isIgnition true on dead-base + cross (bars below MA=" + isig.volBelowMaBars + ")");
ok(isig.volBelowMaBars >= 6, "volBelowMaBars >= 6");
ok(isig.crossStrength > 1, "crossStrength > 1 (crossed above MA)");

/* non-ignition: flat volume, no dead base below MA */
const fc = [], fv = [];
for (let i = 0; i < 60; i++) { fc.push(100); fv.push(100); }
fv[fv.length - 1] = 130;
ok(M.computeSignal(fc, fv).isIgnition === false, "isIgnition false without a dead base below MA");

/* ignitionScore differentiates and respects OI */
const sNoOi = M.ignitionScore({ volBelowMaBars: 12, crossStrength: 1.6, maFlatness1: 0.1, priceGlueOk: true, oiColor: "yellow" });
const sOiUp = M.ignitionScore({ volBelowMaBars: 12, crossStrength: 1.6, maFlatness1: 0.1, priceGlueOk: true, oiColor: "green" });
ok(sOiUp > sNoOi, "green OI raises the ignition score (" + sNoOi + " -> " + sOiUp + ")");
eq(M.ignitionStatus(80), "Ignição forte", "ignitionStatus strong");
eq(M.ignitionStatus(45), "Início", "ignitionStatus early");

/* 6) trendVsMA — arrow vs MA + 4-quadrant colour. */
function mk(n, fn) { return Array.from({ length: n }, (_, i) => fn(i)); }
let r;
r = M.trendVsMA(mk(20, i => 100 + i));            // rising MA, value above
eq(r.arrow + "/" + r.color, "up/green", "rising MA + above = up/green");
r = M.trendVsMA(mk(20, i => 100 - i));            // falling MA, value below
eq(r.arrow + "/" + r.color, "down/red", "falling MA + below = down/red");
r = M.trendVsMA(mk(19, i => 100 + i).concat(105));// rising MA, but value dipped below
eq(r.arrow + "/" + r.color, "down/yellow", "rising MA + below = down/yellow");
r = M.trendVsMA(mk(19, i => 100 - i).concat(95)); // falling MA, value popped above
eq(r.arrow + "/" + r.color, "up/yellow", "falling MA + above = up/yellow");
ok(M.trendVsMA([5]).color === "yellow", "single sample = neutral yellow");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
