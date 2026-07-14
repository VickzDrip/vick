"use strict";

/* pumpModel sanity test — no network. Confirms: featuresOf shape, the ridge
   regression recovers a known linear relationship, MFE resolution turns OHLC
   into ATR-normalised up/down labels, and predict() stays null until trained. */

const assert = require("assert");
const PM = require("../src/pumpModel");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }
function near(a, b, tol, m) { if (Math.abs(a - b) <= tol) pass++; else { fail++; console.error("FAIL: " + m + " (got " + a + ", want ~" + b + ")"); } }

// featuresOf: fixed length, PURE pré-volume + spike (order:
// volBelowMaBars, maFlatness1, spike20, crossStrength, spikePrevVolRatio)
const f = PM.featuresOf({ volBelowMaBars: 8, maFlatness1: 0.3, spike20: 1.4, crossStrength: 1.6, spikePrevVolRatio: 2.1 });
ok(f.length === PM.FEATURES.length && f.length === 5, "featuresOf returns the 5 pré-volume+spike features");
ok(f[0] === 8 && f[2] === 1.4, "pré-volume (volBelowMaBars) and spike (spike20) in place");
ok(PM.FEATURES.indexOf("rsi14") < 0 && PM.FEATURES.indexOf("oiNum") < 0, "no RSI/OI/LSR features");

// gaussianSolve: solve a 2x2 system  [[2,1],[1,3]] x = [3,5] → x=[0.8,1.4]
const x = PM.gaussianSolve([[2, 1], [1, 3]], [3, 5]);
near(x[0], 0.8, 1e-6, "gaussianSolve x0"); near(x[1], 1.4, 1e-6, "gaussianSolve x1");

// fit: build data where up = 2*spike20 + 0.5*volBelowMaBars (+ intercept 1),
// then check predictions recover it closely.
const rows = [];
for (let i = 0; i < 200; i++) {
  const spike = 1 + (i % 20) / 10;          // 1.0..2.9
  const base = 6 + (i % 15);                // 6..20
  const up = 1 + 2 * spike + 0.5 * base;
  // features: index1=spike20, index0=volBelowMaBars
  const feat = new Array(PM.FEATURES.length).fill(0);
  feat[0] = base; feat[1] = spike;
  rows.push({ f: feat, up: up, down: 0 });
}
const fitted = PM.fit(rows, "up");
ok(fitted.mae < 0.05, "ridge fit recovers linear relation (MAE " + fitted.mae.toFixed(3) + " < 0.05)");

// predict is null before training
ok(PM.predict({ spike20: 1.5 }) === null, "predict() null until a model is trained");

// record + resolveWith: a signal at price 100, ATR 2; next 20 candles peak at
// 110 (up 5 ATR) and trough at 96 (down 2 ATR).
PM.record("TEST_USDT", "15m", 1000, 100, 2, { spike20: 1.5, volBelowMaBars: 8 });
const ohlc = [{ time: 1000, high: 100, low: 100, close: 100 }];
for (let i = 1; i <= 20; i++) ohlc.push({ time: 1000 + i, high: (i === 10 ? 110 : 101), low: (i === 5 ? 96 : 99), close: 100 });
const resolved = PM.resolveWith("TEST_USDT", "15m", ohlc);
ok(resolved === 1, "one pending resolved once 20 candles exist");
const st = PM.status();
ok(st.samples >= 1, "resolved sample landed in the dataset");
ok(st.horizon === 20, "horizon is 20");

console.log(fail ? ("PUMP MODEL — " + pass + " passed, " + fail + " FAILED") : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
