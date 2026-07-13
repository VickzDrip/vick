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
