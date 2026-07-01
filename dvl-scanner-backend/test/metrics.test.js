"use strict";

/* Minimal parity / sanity test — runs with `npm test`, no network.
   Confirms score() over the 6 pass/fail blocks (spikeAboveAvg, rsiOversold,
   oiAboveAvg, lsrBelowAvg, flatVolumeBar, prevVolBelowHalf) and that
   computeSignal returns coherent fields. */

const assert = require("assert");
const M = require("../src/metrics");
const cfg = require("../src/config");

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  try { assert.strictEqual(actual, expected); pass++; }
  catch (_) { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }

/* 1) Score = weighted share of the 6 blocks that validated, scaled to 0-99.
   Defaults: spikeAboveAvg 20, rsiOversold 15, oiAboveAvg 15, lsrBelowAvg 15,
   flatVolumeBar 12, prevVolBelowHalf 12 (sum 89). */
const allTrue = { spike20: 2, spike50: 2, rsiOversoldOk: true, oi: "up", lsr: "down", volBelowMaBars: 10, prevVolBelowHalf: true };
const allFalse = { spike20: 0.5, spike50: 0.5, rsiOversoldOk: false, oi: "down", lsr: "up", volBelowMaBars: 0, prevVolBelowHalf: false };
const cases = [
  { r: allTrue, want: 99 },
  { r: allFalse, want: 0 },
  { r: Object.assign({}, allFalse, { spike20: 2, spike50: 2, prevVolBelowHalf: true }), want: 36 },   // spikeAboveAvg + prevVolBelowHalf only
  { r: Object.assign({}, allFalse, { rsiOversoldOk: true }), want: 17 },                               // rsiOversold only
  { r: Object.assign({}, allFalse, { oi: "up", lsr: "down", volBelowMaBars: 10 }), want: 47 }          // oi + lsr + flatVolumeBar only
];
cases.forEach((c, i) => eq(M.score(c.r), c.want, "score case " + i));

/* 2) Not everything is 99 (the original range-normalization bug we fixed). */
ok(new Set(cases.map(c => M.score(c.r))).size > 1, "scores must differentiate, not all 99");

/* 3) spikeAboveAvg block respects the 1-MA / 2-MA toggle. */
const oneMaRow = { spike20: 2, spike50: 0.5, rsiOversoldOk: false, oi: "down", lsr: "up", volBelowMaBars: 0, prevVolBelowHalf: false };
ok(M.blocksOf(oneMaRow, Object.assign({}, cfg.ENGINE, { spikeMaMode: "1" })).spikeAboveAvg === true, "spikeMaMode 1 passes on fast MA alone");
ok(M.blocksOf(oneMaRow, Object.assign({}, cfg.ENGINE, { spikeMaMode: "2" })).spikeAboveAvg === false, "spikeMaMode 2 requires both MAs");

/* 4) rsiOversoldOk — hit within lookback vs never touching the zone. */
const closesDip = [], volsDip = [];
for (let i = 0; i < 60; i++) { closesDip.push(100 - i * 0.6); volsDip.push(100); } // steady decline -> RSI drops into oversold
const sigDip = M.computeSignal(closesDip, volsDip);
ok(sigDip.rsiOversoldOk === true, "rsiOversoldOk true after a steady decline (rsi14=" + sigDip.rsi14.toFixed(1) + ")");
const closesFlat = [], volsFlat = [];
let vf = 100;
for (let i = 0; i < 60; i++) { vf += (i % 3 === 2) ? -0.3 : 0.5; closesFlat.push(vf); volsFlat.push(100); } // mixed up/down steps, stays mid-range
ok(M.computeSignal(closesFlat, volsFlat).rsiOversoldOk === false, "rsiOversoldOk false without ever dipping into the zone");

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
