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
ok(M.trendVsMA([5]).slope === 0, "single sample reports slope 0, not NaN/undefined");

/* trendVsMA's slope is the TREND (second half vs first half of the window),
   distinct from ratio (current value vs the whole window's average) — a
   value can sit above its own average (ratio > 0) while the second half is
   already falling relative to the first (slope < 0), e.g. a peak rolling
   over. This is what "OI subindo" / "LSR caindo" actually means on the
   chart, not just "is it above its MA right now". */
const risingSeries = M.trendVsMA(mk(20, i => 100 + i * 2));   // steadily climbing throughout
ok(risingSeries.slope > 0, "a steadily rising series has a positive slope (got " + risingSeries.slope + ")");
const fallingSeries = M.trendVsMA(mk(20, i => 140 - i * 2));  // steadily falling throughout
ok(fallingSeries.slope < 0, "a steadily falling series has a negative slope (got " + fallingSeries.slope + ")");
/* Rolling over from a peak: the second half averages LOWER than the first
   (slope < 0) even though the very last tick is still above the OVERALL
   average (ratio > 0) — a value can sit above its own MA while already
   rolling over, which is exactly why slope is tracked separately from
   ratio instead of being inferred from it. */
const rollingOver = M.trendVsMA(mk(10, () => 100).concat(mk(9, () => 80)).concat([95]));
ok(rollingOver.ratio > 0, "sanity: the rolled-over series' last tick still sits above the overall average");
ok(rollingOver.slope < 0, "but its slope correctly reads negative (rolling over from a peak), unlike ratio (got slope=" + rollingOver.slope + ")");

/* rsiRecoveryFromLow — the "V": how far RSI has already bounced back up
   from its lowest point within the lookback, not just whether it dipped. */
eq(sigDip.rsiRecoveryFromLow, 0, "a still-declining series (RSI at its own recent low right now) has zero recovery");
const closesV = [];
for (let i = 0; i < 40; i++) closesV.push(100 - i * 0.8);   // decline into oversold...
for (let i = 0; i < 15; i++) closesV.push(closesV[closesV.length - 1] + i * 0.6); // ...then a clean bounce
const volsV = closesV.map(() => 100);
const sigV = M.computeSignal(closesV, volsV);
ok(sigV.rsiRecoveryFromLow > 0, "a decline followed by a bounce (a 'V') shows positive recovery (got " + sigV.rsiRecoveryFromLow + ", rsi14=" + sigV.rsi14.toFixed(1) + ")");
ok(M.computeSignal(closesFlat, volsFlat).rsiRecoveryFromLow === 0, "a flat series that never dipped has zero recovery too");

/* netFlowTrend — Net Long/Short/Delta approximation (position-ratio x OI,
   see exchanges.js's positionRatio / this function's own doc-comment).
   netLong grows while netShort stays flat -> netDelta should rise (the
   "buy side winning" case the ML pipeline actually cares about). */
const oiFlat = mk(20, () => 1000000); // constant OI, isolates the position-ratio side of the calc
const posGrowingLong = mk(20, i => ({ long: 0.5 + i * 0.02, short: 0.5 - i * 0.02 }));
const flow1 = M.netFlowTrend(oiFlat, posGrowingLong);
ok(flow1.netLong.slope > 0, "netLong slope is positive when the long fraction climbs steadily (got " + flow1.netLong.slope + ")");
ok(flow1.netShort.slope < 0, "netShort slope is negative as the short fraction shrinks (got " + flow1.netShort.slope + ")");
ok(flow1.netDelta.slope > 0, "netDelta slope is positive (buy side pulling ahead) when long grows and short shrinks (got " + flow1.netDelta.slope + ")");

/* The opposite case: short growing faster than long (a squeeze-the-other-
   way pattern) should show netDelta falling, not rising. */
const posGrowingShort = mk(20, i => ({ long: 0.5 - i * 0.01, short: 0.5 + i * 0.03 }));
const flow2 = M.netFlowTrend(oiFlat, posGrowingShort);
ok(flow2.netDelta.slope < 0, "netDelta slope is negative when short grows faster than long shrinks (got " + flow2.netDelta.slope + ")");

/* Not enough overlap between the OI series and the position-ratio series
   (e.g. one fetch failed) -> neutral defaults, never a crash/NaN. */
const flowEmpty = M.netFlowTrend([], null);
eq(flowEmpty.netLong.slope, 0, "empty input yields a neutral netLong (no crash)");
eq(flowEmpty.netDelta.color, "yellow", "empty input yields the same neutral yellow trendVsMA already uses elsewhere");
const flowShort = M.netFlowTrend([1000000], [{ long: 0.6, short: 0.4 }]);
eq(flowShort.netDelta.slope, 0, "a single overlapping point also yields a neutral result (not enough data for a trend)");

/* netFlowDivergence — a read-only alert, entirely separate from the
   bullish Spike Score blocks/score()/FEATURE_KEYS (see its own doc-comment
   for why). Majority vote (2 of 3) fires the warning. */
const divAll3 = M.netFlowDivergence({ netLongSlope: -0.10, netShortSlope: 0.12, netDeltaSlope: -0.20 });
eq(divAll3.netLongFalling, true, "netLongFalling true when the slope clears the threshold negatively");
eq(divAll3.netShortRising, true, "netShortRising true when the slope clears the threshold positively");
eq(divAll3.netDeltaFalling, true, "netDeltaFalling true when the slope clears the threshold negatively");
eq(divAll3.count, 3, "all three legs counted when all three fire");
eq(divAll3.warning, true, "warning fires when all three legs fire");

const divMajority = M.netFlowDivergence({ netLongSlope: -0.10, netShortSlope: 0.12, netDeltaSlope: 0.01 });
eq(divMajority.count, 2, "only the two legs that actually cleared the threshold are counted");
eq(divMajority.warning, true, "warning still fires on a 2-of-3 majority, not just a clean sweep");

const divOnlyOne = M.netFlowDivergence({ netLongSlope: -0.10, netShortSlope: 0.01, netDeltaSlope: 0.01 });
eq(divOnlyOne.count, 1, "a single leg alone doesn't inflate the count");
eq(divOnlyOne.warning, false, "warning does NOT fire on just one leg — avoids flagging normal single-metric noise");

const divNone = M.netFlowDivergence({ netLongSlope: 0.10, netShortSlope: -0.10, netDeltaSlope: 0.10 });
eq(divNone.count, 0, "the opposite (bullish-shaped) pattern never counts toward the warning");
eq(divNone.warning, false, "no warning for a bullish-shaped Net Long/Short/Delta move");

const divMissing = M.netFlowDivergence({});
eq(divMissing.count, 0, "missing slope fields default to neutral (0), not a crash");
eq(divMissing.warning, false, "no warning when the underlying data is simply absent");

const divCustomThreshold = M.netFlowDivergence({ netLongSlope: -0.05, netShortSlope: 0.05, netDeltaSlope: -0.05 }, 0.10);
eq(divCustomThreshold.count, 0, "a custom (higher) warnThreshold requires a stronger move before counting a leg");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
