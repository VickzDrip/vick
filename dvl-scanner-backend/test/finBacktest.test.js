"use strict";
const assert = require("assert");
const fin = require("../src/finBacktest");

/* A long sample whose path reaches +2 ATR before -1.2 → hits TP at tpAtr. */
function longWin() { return { side: "long", entry: 100, atr: 1, path: [[0.5, -0.3, 0.4], [1.2, -0.2, 1.1], [2.5, 0.5, 2.4]] }; }
/* A long sample that drops to -1.5 first → hits SL. */
function longLose() { return { side: "long", entry: 100, atr: 1, path: [[0.2, -0.6, -0.5], [0.1, -1.5, -1.4]] }; }

(function testDirectionalOutcome() {
  assert.strictEqual(fin.simFromPath(longWin().path, "long", 1.2, 2), 2, "long win → +tp");
  assert.strictEqual(fin.simFromPath(longLose().path, "long", 1.2, 2), -1.2, "long lose → -sl");
  // short mirror
  const shortWin = { path: [[-0.4, -2.5, -2.4]] };
  assert.strictEqual(fin.simFromPath(shortWin.path, "short", 1.2, 2), 2, "short win → +tp");
})();

(function testRunAccount() {
  const samples = [];
  for (let i = 0; i < 30; i++) samples.push(longWin());
  for (let i = 0; i < 20; i++) samples.push(longLose());
  const r = fin.run(samples, { slAtr: 1.2, tpAtr: 2, riskPct: 0.01, account0: 1000 });
  assert.strictEqual(r.trades, 50, "all traded");
  assert.strictEqual(r.wins, 30, "30 wins");
  assert.strictEqual(r.losses, 20, "20 losses");
  assert(r.winRate === 60, "60% win rate");
  assert(r.account > 1000, "net positive account, got " + r.account.toFixed(2));
  assert(r.maxDrawdownPct >= 0, "drawdown reported");
  console.log("  account:", r.account.toFixed(2), "ret%:", r.returnPct.toFixed(1), "PF:", r.profitFactor.toFixed(2));
})();

(function testPerSampleTpPoc() {
  // Price tags POC (0.8 ATR) then reverses into the -1.2 stop. POC mode books
  // +0.8 at the first bar; fixed 2-ATR TP never triggers and the trade rides
  // into the stop for -1.2 → shows why booking at POC matters.
  const s = { side: "long", entry: 100, atr: 1, tpAtr: 0.8, path: [[0.9, -0.1, 0.85], [0.3, -1.5, -1.4]] };
  const r = fin.run([s], { slAtr: 1.2, tpAtr: 2, useSampleTp: true });
  assert(r.wins === 1 && Math.abs(r.expectancyAtr - 0.8) < 1e-9, "booked at POC 0.8, got " + r.expectancyAtr);
  const r2 = fin.run([s], { slAtr: 1.2, tpAtr: 2, useSampleTp: false });
  assert(r2.losses === 1 && Math.abs(r2.expectancyAtr + 1.2) < 1e-9, "fixed TP rides into stop -1.2, got " + r2.expectancyAtr);
  console.log("  poc-mode:", r.expectancyAtr.toFixed(2), "fixed-tp:", r2.expectancyAtr.toFixed(2));
})();

console.log("finBacktest.test.js OK");
