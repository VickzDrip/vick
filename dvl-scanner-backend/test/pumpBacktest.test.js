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

// ── sweepMinConv (learned trigger) ────────────────────────────
// Winners have high conviction (up=3), losers low (up=0.6). A gate at 1 keeps
// only winners → best threshold should be > the loosest gate (0).
const trg = [];
for (let i = 0; i < 40; i++) {
  const winner = i % 2 === 0;
  trg.push({ f: [winner ? 1 : 0], entry: 100, atr: 2,
    path: winner ? [[2.2, 0.1, 2.0]] : [[0.2, -1.2, -1.0]] });
}
const predConv = f => (f[0] === 1 ? { up: 3, down: 0 } : { up: 0.6, down: 0 });
const cs = BT.sweepMinConv(trg, predConv, { slAtr: 1, tpAtr: 2, riskPct: 0.01, minTrades: 5, convGrid: [0, 1, 2] });
ok(cs.best.minConv >= 1, "trigger gate excludes the low-conviction losers");
ok(cs.grid.length === 3, "conv sweep returns the grid");
// the minTrades guard: an absurdly high gate leaving <minTrades is not chosen
const cs2 = BT.sweepMinConv(trg, predConv, { slAtr: 1, tpAtr: 2, minTrades: 5, convGrid: [0, 1, 999] });
ok(cs2.best.minConv !== 999, "over-tight gate (too few trades) rejected");

// ── evaluate (one risk mode → best TP + gate + runs) ──────────
const evSamples = [];
for (let i = 0; i < 40; i++) evSamples.push({ f: [0], entry: 100, atr: 2, path: [[3.1, -0.2, 2.9], [3.2, -0.3, 3.0]] });
const ev = BT.evaluate(evSamples, alwaysLong, { slAtr: 1, tpGrid: [1, 2, 3], riskPct: 0.01, costFrac: 0 });
ok(ev.tpAtr === 3, "evaluate picks best TP from the grid");
ok(ev.all && ev.long && ev.all.trades === 40, "evaluate runs all/long/short");
ok(typeof ev.minConv === "number", "evaluate returns a learned gate");
ok(ev.slAtr === 1, "evaluate echoes the mode SL");

// ── simulateTrail (adaptive trailing stop) ────────────────────
// Long runs up to +3 (bars make higher highs), never dips trailAtr back →
// exits at horizon last close (2.9). trail never triggers mid-run.
near(BT.simulateTrail([[1,0.5,0.9],[2,1.4,1.9],[3,2.4,2.9]], "long", 1, 1), 2.9, 1e-9, "trail rides a clean runner to close");
// Long: peaks at +3 then a bar dips 1.4 below peak (low 1.6) with trail 1 →
// stop trailed to 3-1=2 → low 1.6 <= 2 → exit at +2.
near(BT.simulateTrail([[3,2.5,2.9],[3,1.6,1.8]], "long", 1, 1), 2, 1e-9, "trail locks profit at peak-trail");
// Long: immediate drop to -1.2 before any profit → initial stop -1 hit.
ok(BT.simulateTrail([[0.2,-1.2,-1.0]], "long", 1, 1) === -1, "trail uses initial stop before profit");
// short mirror: favourable is down; drops to -3 then bounces up 1 → locks +2
near(BT.simulateTrail([[ -2.5,-3,-2.9],[ -1.8,-1.6,-1.7]], "short", 1, 1), 2, 1e-9, "trail works short");
// trailing/breakeven now ALSO work on path-less (MFE) signals — every resolved
// signal is usable. long up=3/down=0, sl1, no tp, trail1.5 → 3-1.5 = 1.5.
near(BT.outcomeFor({ up: 3, down: 0 }, "long", 1, 0, 1.5), 1.5, 1e-9, "trailing approximated for MFE-only signals");
// MFE cfg: adverse >= sl → conservative loss even with a big favourable move
ok(BT.simulateMfeCfg(5, 2, "long", { slAtr: 1, trailAtr: 1 }) === -1, "MFE cfg: adverse-first → -sl");
// MFE cfg reduces to plain bracket when trail/be off
ok(BT.simulateMfeCfg(2.2, 0.3, "long", { slAtr: 1, tpAtr: 2 }) === 2, "MFE cfg == bracket TP");
// MFE breakeven: up passed be but < tp, adverse small → exit flat (0), not a loss
ok(BT.simulateMfeCfg(1.2, 0.4, "long", { slAtr: 1, tpAtr: 5, beAtr: 1 }) === 0, "MFE cfg breakeven → flat");

// sweepTrail returns a grid + best
const trSweep = BT.sweepTrail([{ f: [0], entry: 100, atr: 2, path: [[1,0.5,0.9],[3,2.5,2.9],[3,1.9,2.1]] }], alwaysLong, { slAtr: 1, trailGrid: [0.5, 1, 2], riskPct: 0.01 });
ok(trSweep.grid.length === 3 && trSweep.best, "sweepTrail returns grid + best");

// ── sweepGrid (no blind spots) ────────────────────────────────
const gs = BT.sweepGrid([{ f: [0], entry: 100, atr: 2, path: [[2.1, 0.1, 1.9]] }], alwaysLong, { slGrid: [1, 2], tpGrid: [1, 2, 3], riskPct: 0.01 });
ok(gs.cells.length === 6, "grid covers every SL×TP cell (2×3)");
ok(gs.best && typeof gs.best.returnPct === "number", "grid reports the best cell");
ok(gs.slGrid.length === 2 && gs.tpGrid.length === 3, "grid echoes its axes");

// ── simulatePathCfg (unified exit) reproduces the specialised sims ────
// pure bracket == simulateTrade
near(BT.simulatePathCfg([[2.1, 0.3, 1.8]], "long", { slAtr: 1, tpAtr: 2 }), 2, 1e-9, "cfg bracket == TP hit");
near(BT.simulatePathCfg([[0.3, -1.2, -0.9]], "long", { slAtr: 1, tpAtr: 2 }), -1, 1e-9, "cfg bracket == SL hit");
// pure trailing == simulateTrail
near(BT.simulatePathCfg([[3, 2.5, 2.9], [3, 1.6, 1.8]], "long", { slAtr: 1, trailAtr: 1 }), 2, 1e-9, "cfg trailing locks +2");
// breakeven: up to +1 (be triggers, stop→0) then dips to -0.5 → exit at 0, not -1
near(BT.simulatePathCfg([[1.1, 0.5, 0.9], [0.4, -0.5, -0.3]], "long", { slAtr: 1, tpAtr: 5, beAtr: 1 }), 0, 1e-9, "breakeven saves the trade (exit at 0)");
// without breakeven the same path would stop at -1 (dip -0.5 doesn't hit -1 → runs to close -0.3)
near(BT.simulatePathCfg([[1.1, 0.5, 0.9], [0.4, -0.5, -0.3]], "long", { slAtr: 1, tpAtr: 5 }), -0.3, 1e-9, "no breakeven → rides to close");

// ── exitConfigs + optimize (walk-forward) ─────────────────────
const cfgs = BT.exitConfigs({ slGrid: [1, 2], tpGrid: [2, 3], trailGrid: [1], beGrid: [0, 1], timeGrid: [], tp1Grid: [] });
ok(cfgs.length === 2 * 2 * 2 + 2 * 1, "exitConfigs enumerates bracket(+be) and trailing combos");
ok(cfgs.some(c => c.family === "trailing") && cfgs.some(c => c.family === "bracket+be"), "config families present");

// optimizer: train (first half) winners vs an untouched test half. Winners run
// to +3, losers stop out; a good TP should be profitable on both halves.
const opt = [];
for (let i = 0; i < 60; i++) {
  const winner = i % 2 === 0;
  opt.push({ f: [winner ? 1 : 0], entry: 100, atr: 2,
    path: winner ? [[3.2, 0.2, 3.0]] : [[0.1, -1.3, -1.1]] });
}
const predW = f => (f[0] === 1 ? { up: 3, down: 0 } : { up: 0.5, down: 0 });
const o = BT.optimize(opt, predW, { trainFrac: 0.5, account0: 1000, riskPct: 0.01,
  slGrid: [1], tpGrid: [2, 3], trailGrid: [1], beGrid: [0] });
ok(o.ready, "optimize returns a result");
ok(o.trainN === 30 && o.testN === 30, "optimize splits train/test");
ok(o.best && o.best.minConv >= 1, "optimize learns a gate that filters losers");
ok(o.test && typeof o.test.returnPct === "number", "optimize reports out-of-sample");

// ── deeper run stats (profit factor, avg win/loss, streak) ────
const stats = BT.run([
  { f: [0], path: [[2.2, 0.1, 2.0]] },   // +2
  { f: [0], path: [[0.2, -1.3, -1.1]] }, // -1
  { f: [0], path: [[0.1, -1.2, -1.0]] }  // -1
], alwaysLong, { slAtr: 1, tpAtr: 2, riskPct: 0.01 });
near(stats.profitFactor, 1, 1e-9, "profitFactor = 2 win / (1+1) loss = 1");
near(stats.avgWinAtr, 2, 1e-9, "avgWinAtr = 2");
near(stats.avgLossAtr, 1, 1e-9, "avgLossAtr = 1");
ok(stats.maxLossStreak === 2, "maxLossStreak counts consecutive losses");

// ── calibrate (predicted vs realised by bucket) ───────────────
const calSamples = [
  { f: [1], up: 1.9, down: 0.2 },  // predicted ~2, realised 1.9
  { f: [1], up: 2.0, down: 0.1 },
  { f: [2], up: 0.4, down: 0.1 }   // predicted ~4, realised only 0.4 (over-predicts)
];
const calPred = f => (f[0] === 1 ? { up: 2, down: 0 } : { up: 4, down: 0 });
const cal = BT.calibrate(calSamples, calPred);
ok(Array.isArray(cal) && cal.length >= 1, "calibrate returns buckets");
const hiBucket = cal.find(b => b.range === "≥4");
ok(hiBucket && hiBucket.avgReal < hiBucket.avgPred, "calibrate exposes over-prediction (real < pred)");

// ── mineConditions (conditional edge, out-of-sample) ──────────
const mineS = [];
for (let i = 0; i < 60; i++) {
  const good = i % 2 === 0;                 // feature 0 high → winners
  mineS.push({ f: [good ? 10 : 0, 0], entry: 100, atr: 2,
    path: good ? [[3.2, 0.1, 3.0]] : [[0.1, -1.3, -1.1]] });
}
const mine = BT.mineConditions(mineS, alwaysLong, ["spikeStrength", "other"], { trainFrac: 0.5, tpAtr: 3, slAtr: 1 });
ok(mine.top.length >= 1, "mineConditions returns ranked conditions");
ok(mine.top[0].feature === "spikeStrength", "mineConditions finds the discriminating feature");
ok(typeof mine.top[0].testReturn === "number", "mineConditions reports out-of-sample per condition");

// ── time stop ─────────────────────────────────────────────────
// runs up but we bail at bar 2 → exit at bar-2 close (1.9), not the later close.
near(BT.simulatePathCfg([[1, 0.5, 0.9], [2, 1.4, 1.9], [3, 2.4, 2.9]], "long", { slAtr: 1, timeBars: 2 }), 1.9, 1e-9, "time stop exits at bar N close");
// no time stop → rides to final close 2.9
near(BT.simulatePathCfg([[1, 0.5, 0.9], [2, 1.4, 1.9], [3, 2.4, 2.9]], "long", { slAtr: 1 }), 2.9, 1e-9, "no time stop rides to close");

// ── scale-out (partial TP + runner) ───────────────────────────
// tp1 at 2 (book 50%), runner trails 1 behind peak 3 → runner exits ~2.
// pnl = 0.5*2 + 0.5*2 = 2. Path: up to 2 (partial), up to 3, dips to lock.
near(BT.simulateScaleOut([[2.1, 0.3, 1.9], [3.0, 2.5, 2.9], [3.0, 1.6, 1.8]], "long", { slAtr: 1, tp1Atr: 2, tp1Frac: 0.5, trailAtr: 1 }), 2, 1e-9, "scale-out books partial + trails runner");
// never reaches tp1, stopped → whole -sl
ok(BT.simulateScaleOut([[0.3, -1.2, -1.0]], "long", { slAtr: 1, tp1Atr: 2, tp1Frac: 0.5, trailAtr: 1 }) === -1, "scale-out whole stop before partial");
// MFE approx: adverse-first stop
ok(BT.simulateScaleOutMfe(3, 1.5, "long", { slAtr: 1, tp1Atr: 2, tp1Frac: 0.5, trailAtr: 1 }) === -1, "scale-out MFE adverse-first → -sl");
// outcomeFor routes scale-out via tp1Atr
near(BT.outcomeFor({ up: 3, down: 0.2 }, "long", 1, 0, 1, 0, { tp1Atr: 2, tp1Frac: 0.5 }), 0.5 * 2 + 0.5 * Math.max(0, 3 - 1), 1e-9, "outcomeFor uses scale-out when tp1Atr set");

// exitConfigs now includes the new families
const allCfgs = BT.exitConfigs({ slGrid: [1], tpGrid: [2], trailGrid: [1], beGrid: [0], timeGrid: [5], tp1Grid: [2] });
ok(allCfgs.some(c => c.family === "timestop") && allCfgs.some(c => c.family === "scaleout"), "exitConfigs adds timestop + scaleout");

console.log(fail ? ("PUMP BACKTEST — " + pass + " passed, " + fail + " FAILED")
                 : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
