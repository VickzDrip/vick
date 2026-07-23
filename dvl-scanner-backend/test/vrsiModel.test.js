"use strict";
const assert = require("assert");
const model = require("../src/vrsiModel");

/* ---- optimize + backtestCombo on hand-built samples with a known edge ---- */
function good(t) {
  // long, entry AT the window VAL, POC 2 ATR up, strict vzinho; path tags +2 (POC) first
  return { side: "long", entry: 100, atr: 1, pivotRsi: 30, time: t,
    dist: { window: { val: 0.0, poc: -2.0, vah: -3.0, pocAtr: 2.0 } },
    path: [[0.6, -0.3, 0.5], [2.2, 0.4, 2.1]] };
}
function bad(t) {
  // long far from VAL, weak vzinho; path loses
  return { side: "long", entry: 100, atr: 1, pivotRsi: 44, time: t,
    dist: { window: { val: 3.0, poc: 1.0, vah: 0.0, pocAtr: 1.0 } },
    path: [[0.1, -1.6, -1.5]] };
}

(function testOptimizeFindsEdge() {
  const samples = [];
  let t = 0;
  for (let i = 0; i < 60; i++) { samples.push(good(t += 1000)); samples.push(bad(t += 1000)); }
  const res = model.optimize(samples, { minSamples: 30 });
  assert(res.ready, "optimizer ran");
  assert(res.long && res.long.best, "found a generalizing long combo");
  const b = res.long.best;
  assert(b.zone === "val", "learned the VAL zone, got " + b.zone);
  assert(b.session === "window", "learned the window session");
  assert(b.rsiThresh <= 40, "learned a strict enough vzinho, got " + b.rsiThresh);
  assert(b.prox <= 1.5, "tight proximity to the zone");
  assert(b.train.returnPct > 0 && b.test.returnPct > 0, "green in and out of sample");
  console.log("  best long:", JSON.stringify({ session: b.session, zone: b.zone, prox: b.prox, sl: b.sl, rsi: b.rsiThresh, tp: b.tpMode, robust: +b.robust.toFixed(1) }));

  const bt = model.backtestCombo(samples, b, {});
  assert(bt && bt.trades > 0 && bt.account > 1000, "financial backtest positive, account " + bt.account.toFixed(0));
  console.log("  backtest account:", bt.account.toFixed(0), "ret%:", bt.returnPct.toFixed(1), "win%:", bt.winRate.toFixed(0), "n:", bt.trades);
})();

(function testNotReadyBelowMin() {
  const r = model.optimize([good(1), good(2)], { minSamples: 30 });
  assert(r.ready === false && r.need === 30, "not ready below min samples");
})();

/* ---- buildSamples structural check on synthetic klines ---- */
(function testBuildSamplesShape() {
  const closes = [];
  let p = 100; const saw = i => (i % 2 ? 0.6 : -0.6);
  for (let i = 0; i < 22; i++) { p += -1.4 + saw(i); closes.push(p); }
  for (let i = 0; i < 30; i++) { p += 1.4 + saw(i); closes.push(p); }
  for (let i = 0; i < 22; i++) { p += -1.4 + saw(i); closes.push(p); }
  for (let i = 0; i < 30; i++) { p += 1.4 + saw(i); closes.push(p); }
  const bars = closes.map((c, i) => ({ time: i * 60000, open: c, high: c + 0.4, low: c - 0.4, close: c, volume: 1000 + (i % 5) * 300 }));
  const samples = model.buildSamples(bars, bars, { baseTfMin: 1, horizon: 20, winBars: 40 });
  assert(Array.isArray(samples), "returns array");
  if (samples.length) {
    const s = samples[0];
    assert(s.side === "long" || s.side === "short", "has side");
    assert(Array.isArray(s.path) && s.path.length, "has forward path");
    assert(s.dist && Object.keys(s.dist).length, "has session distances");
    assert(isFinite(s.pivotRsi) && s.entry > 0 && s.atr > 0, "has pivotRsi/entry/atr");
    console.log("  buildSamples produced", samples.length, "samples; first side", s.side, "sessions", Object.keys(s.dist).join(","));
  } else {
    console.log("  buildSamples produced 0 samples (ok structurally)");
  }
})();

console.log("vrsiModel.test.js OK");
