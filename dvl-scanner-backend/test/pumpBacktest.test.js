"use strict";

/* pumpBacktest test — deterministic synthetic paths so every trade's outcome
   is known, then check the account maths, drawdown, win rate and TP sweep. */

const assert = require("assert");
const BT = require("../src/pumpBacktest");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }
function near(a, b, tol, m) { if (Math.abs(a - b) <= tol) pass++; else { fail++; console.error("FAIL: " + m + " (got " + a + ", want ~" + b + ")"); } }

// ── simulateTrade ─────────────────────────────────────────────
// long: TP at +2 reached (hi 2.1), no stop → +2
ok(BT.simulateTrade([[0.5, -0.2, 0.4], [2.1, 0.3, 1.8]], "long", 1, 2) === 2, "long hits TP");
// long: SL at -1 hit first → -1
ok(BT.simulateTrade([[0.3, -1.2, -0.9]], "long", 1, 2) === -1, "long hits SL");
// short: favourable is down; lo -2.2 hits TP → +2
ok(BT.simulateTrade([[0.2, -2.2, -1.9]], "short", 1, 2) === 2, "short hits TP");
// short: hi +1.1 hits SL → -1
ok(BT.simulateTrade([[1.1, -0.2, 0.5]], "short", 1, 2) === -1, "short hits SL");
// both in same candle → stop first (conservative)
ok(BT.simulateTrade([[2.5, -1.5, 0]], "long", 1, 2) === -1, "same-candle → SL first");
// neither → exit at last close (long)
near(BT.simulateTrade([[0.5, -0.5, 0.3], [0.6, -0.4, 0.7]], "long", 1, 2), 0.7, 1e-9, "long horizon exit = last close");
// neither → exit at last close (short negates)
near(BT.simulateTrade([[0.5, -0.5, -0.6]], "short", 1, 2), 0.6, 1e-9, "short horizon exit = -last close");

// ── run(): risk maths ─────────────────────────────────────────
const alwaysLong = () => ({ up: 3, down: 0 });
// one winning trade, slAtr 1, tpAtr 2, risk 1% → 1000*(1+0.02)=1020
const win1 = BT.run([{ f: [0], path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01 });
near(win1.account, 1020, 1e-6, "one +2ATR trade → $1020");
ok(win1.winRate === 100 && win1.trades === 1, "one trade, 100% win");
ok(win1.maxDrawdownPct === 0, "winner → no drawdown");

// a loss then recovery → drawdown reflects the dip
const mixed = BT.run([
  { f: [0], path: [[0.2, -1.2, -1.0]] },  // -1 ATR (loss)
  { f: [0], path: [[2.2, 0.1, 2.0]] }     // +2 ATR (win)
], alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01 });
ok(mixed.maxDrawdownPct > 0, "a losing trade creates drawdown");
ok(mixed.trades === 2 && mixed.wins === 1 && mixed.losses === 1, "2 trades, 1w/1l");

// minConv gate: conviction below threshold → no trades
const weak = BT.run([{ f: [0], path: [[2.1, 0.1, 1.9]] }], () => ({ up: 0.3, down: 0 }), { minConv: 0.5 });
ok(weak.trades === 0, "low-conviction signal skipped");

// null prediction (untrained) → no trades
const untrained = BT.run([{ f: [0], path: [[2.1, 0.1, 1.9]] }], () => null, {});
ok(untrained.trades === 0, "no model → no trades");

// ── simulateMfe (old signals: up/down only, no path) ──────────
// long: fav(up)=2.2 >= tp2, adv(down)=0.3 < sl1 → +2
ok(BT.simulateMfe(2.2, 0.3, "long", 1, 2) === 2, "MFE long → TP");
// long: adv(down)=1.5 >= sl1, fav(up)=0.4 < tp2 → -1
ok(BT.simulateMfe(0.4, 1.5, "long", 1, 2) === -1, "MFE long → SL");
// both reached → stop first (conservative)
ok(BT.simulateMfe(2.5, 1.5, "long", 1, 2) === -1, "MFE both → SL first");
// neither → flat
ok(BT.simulateMfe(0.5, 0.5, "long", 1, 2) === 0, "MFE neither → flat");
// short mirror: fav is down; down=2.3>=tp2, up=0.2<sl1 → +2
ok(BT.simulateMfe(0.2, 2.3, "short", 1, 2) === 2, "MFE short → TP");

// run() uses MFE for path-less samples (all still counted)
const oldSamples = [
  { f: [0], up: 2.2, down: 0.2 },  // long TP → +2
  { f: [0], up: 0.3, down: 1.4 }   // long SL → -1
];
const oldRun = BT.run(oldSamples, alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01 });
ok(oldRun.trades === 2, "path-less samples still simulated (via MFE)");
ok(oldRun.exactPath === 0, "exactPath counts only path samples");

// side filter: only-long ignores short predictions
const bothSides = [
  { f: [1], up: 2.2, down: 0.2 },   // model → long (up>down)
  { f: [2], up: 0.2, down: 2.2 }    // model → short (down>up)
];
const predBySample = f => (f[0] === 1 ? { up: 3, down: 0 } : { up: 0, down: 3 });
const longOnly = BT.run(bothSides, predBySample, { slAtr: 1, tpAtr: 2, side: "long" });
ok(longOnly.trades === 1 && longOnly.side === "long", "side:long takes only long signals");
const shortOnly = BT.run(bothSides, predBySample, { slAtr: 1, tpAtr: 2, side: "short" });
ok(shortOnly.trades === 1 && shortOnly.side === "short", "side:short takes only short signals");

// ── trading costs (fees + slippage) ───────────────────────────
// A winning trade nets LESS with costs than without.
const noFee = BT.run([{ f: [0], entry: 100, atr: 2, path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01, costFrac: 0 });
const withFee = BT.run([{ f: [0], entry: 100, atr: 2, path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01, costFrac: 0.002 });
ok(withFee.account < noFee.account, "costs reduce the net result");
// costAtr = costFrac × entry/atr = 0.002 × 100/2 = 0.1 ATR → net pnl 2-0.1=1.9 ATR
// account = 1000 × (1 + (1.9/1)×0.01) = 1019
near(withFee.account, 1019, 1e-6, "cost charged as costFrac×entry/atr");
ok(Math.abs(withFee.avgCostAtr - 0.1) < 1e-9, "avgCostAtr reported (0.1 ATR)");
// low-volatility asset (small ATR%) pays MORE fee in ATR terms
const hiVol = BT.run([{ f: [0], entry: 100, atr: 4, path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slAtr: 1, tpAtr: 2, costFrac: 0.002 });
const loVol = BT.run([{ f: [0], entry: 100, atr: 2, path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slAtr: 1, tpAtr: 2, costFrac: 0.002 });
ok(loVol.avgCostAtr > hiVol.avgCostAtr, "lower-volatility asset pays more fee (in ATR)");

// ── sweepTp ───────────────────────────────────────────────────
// Path runs to +3 then closes; a higher TP captures more, so best should be the
// largest TP that still fills (3).
const climber = [{ f: [0], path: [[1.0, 0, 0.9], [2.0, 0, 1.9], [3.0, 0, 2.9]] }];
const sweep = BT.sweepTp(climber, alwaysLong, { slAtr: 1, riskPct: 0.01, tpGrid: [1, 2, 3, 5] });
ok(sweep.best.tpAtr === 3, "sweep picks TP=3 (fills highest, best return)");
ok(sweep.grid.length === 4, "sweep returns full grid");

console.log(fail ? ("PUMP BACKTEST — " + pass + " passed, " + fail + " FAILED")
                 : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
