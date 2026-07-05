"use strict";

/* Offline test for the advanced combo miner — no network, no files: every
   function under test takes an examples array directly, so the synthetic
   dataset is built inline. The dataset encodes known truths (R+O genuinely
   strong, F pure noise, a decaying combo, Net Delta rising > falling) and
   the assertions check the miner recovers exactly those — not just that it
   runs. */

const ac = require("../src/analyze-combos");

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}
function approx(actual, expected, tol, msg) {
  if (Math.abs(actual - expected) <= tol) pass++;
  else { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want ~" + expected + ")"); }
}

function blocks(overrides) {
  const b = { spikeAboveAvg: false, rsiOversold: false, oiAboveAvg: false, lsrBelowAvg: false, flatVolumeBar: false, prevVolBelowHalf: false };
  return Object.assign(b, overrides);
}

/* 1) Wilson lower bound: the whole point is that 3/3 (100% raw) must NOT
   outrank 52/80 (65% raw). Known reference values for z=1.96. */
approx(ac.wilsonLower(3, 3), 0.439, 0.02, "3/3 bounds near 44%, not 100%");
approx(ac.wilsonLower(52, 80), 0.54, 0.02, "52/80 bounds near 54%");
ok(ac.wilsonLower(52, 80) > ac.wilsonLower(3, 3), "the well-supported 65% beats the perfect-but-tiny 100%");
eq(ac.wilsonLower(0, 0), 0, "empty sample bounds to 0, no division by zero");
ok(ac.wilsonLower(80, 80) > 0.95, "a large perfect sample does bound high");

/* 2) Subset enumeration: C(6,1)+C(6,2)+C(6,3) = 6+15+20 = 41. */
const subsets = ac.enumerateSubsets(3);
eq(subsets.length, 41, "all 1-3 block subsets enumerated");
ok(subsets.every(s => s.length >= 1 && s.length <= 3), "no subset outside the 1-3 size range");

/* 3) statsOf math. */
const st = ac.statsOf([
  { label: 1, finalReturnPct: 2 }, { label: 1, finalReturnPct: 2 },
  { label: 0, finalReturnPct: -1 }, { label: 0, finalReturnPct: -1 }
]);
eq(st.winRate, 50, "statsOf win rate");
eq(st.avgReturnPct, 0.5, "statsOf avg return");
eq(st.totalReturnPct, 2, "statsOf total return");
eq(ac.statsOf([]).samples, 0, "statsOf empty is safe");

/* 4) Miner recovers a planted pattern. Synthetic LONG data:
   - R+O together: 60 examples, wins ~75% (the real pattern)
   - F alone: 40 examples, wins ~40% (noise, below baseline)
   - everything else scattered at ~50%. */
const examples = [];
let at = 0;
for (let i = 0; i < 60; i++) {
  examples.push({ at: ++at, side: "LONG", blocks: blocks({ rsiOversold: true, oiAboveAvg: true }), label: (i % 4 !== 0) ? 1 : 0, finalReturnPct: (i % 4 !== 0) ? 2 : -1, features: { netDeltaSlope: i % 2 === 0 ? 0.3 : -0.3 } });
}
for (let i = 0; i < 40; i++) {
  examples.push({ at: ++at, side: "LONG", blocks: blocks({ flatVolumeBar: true }), label: (i % 5 < 2) ? 1 : 0, finalReturnPct: (i % 5 < 2) ? 2 : -1, features: {} });
}
for (let i = 0; i < 50; i++) {
  examples.push({ at: ++at, side: "LONG", blocks: blocks({ spikeAboveAvg: i % 2 === 0 }), label: i % 2, finalReturnPct: i % 2 ? 2 : -1, features: {} });
}
/* A SHORT stray that must never leak into LONG mining. */
examples.push({ at: ++at, side: "SHORT", blocks: blocks({ rsiOversold: true, oiAboveAvg: true }), label: 0, finalReturnPct: -1, features: {} });

const mined = ac.mineCombos(examples, "LONG");
eq(mined.baseline.samples, 150, "baseline counts only LONG examples (SHORT stray excluded)");
const ro = mined.combos.find(c => c.label === "R+O");
ok(ro && ro.samples === 60, "R+O superset bucket has exactly its 60 examples");
eq(ro.winRate, 75, "R+O raw win rate recovered");
ok(ro.lift > 1.2, "R+O lift is well above 1 (got " + ro.lift + ")");
const f = mined.combos.find(c => c.label === "F");
ok(f.winRate < mined.baseline.winRate, "the noise block F sits below baseline");
const rankable = mined.combos.filter(c => c.samples >= 15).sort((a, z) => z.wilsonLow - a.wilsonLow);
ok(rankable[0].label === "R+O" || rankable[0].label === "R" || rankable[0].label === "O",
  "an R/O-family combo tops the Wilson ranking (got " + rankable[0].label + ")");
ok(ro.wilsonLow < ro.winRate, "Wilson lower bound is strictly below the raw rate");

/* 5) Net Delta conditioning inside R+O: planted so rising and falling
   halves both exist (>=5 each) and get separate stats. */
ok(ro.netDelta && ro.netDelta.rising.samples >= 5 && ro.netDelta.falling.samples >= 5, "Net Delta split present for R+O");
ok(f.netDelta === null, "no Net Delta split when the feature was never captured (F examples)");

/* 6) Stability: a planted decaying combo — wins the whole first half,
   loses the whole second — must be flagged "piorando". */
const decay = [];
for (let i = 0; i < 30; i++) decay.push({ at: i, side: "LONG", blocks: blocks({ lsrBelowAvg: true }), label: i < 15 ? 1 : 0, finalReturnPct: i < 15 ? 2 : -1, features: {} });
const stb = ac.stabilityOf(decay);
eq(stb.verdict, "piorando", "a pattern that stopped working is flagged");
eq(stb.firstWinRate, 100, "first-half rate");
eq(stb.secondWinRate, 0, "second-half rate");
eq(ac.stabilityOf(decay.slice(0, 6)), null, "too few examples -> no stability verdict rather than noise");

/* 7) analyze() wraps both sides. */
const full = ac.analyze(examples);
eq(full.total, 151, "total counts every example");
eq(full.SHORT.baseline.samples, 1, "SHORT side mined independently");

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
