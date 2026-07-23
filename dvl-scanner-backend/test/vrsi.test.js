"use strict";
const assert = require("assert");
const vrsi = require("../src/vrsi");

/* Craft 1m closes that drive the RSI down into oversold then bounce (green V),
   then up into overbought then drop (red V). We feed the same array as base and
   oneMin (baseTfMin=1). */
function mk(closes) {
  return closes.map((c, i) => ({ time: i * 60000, open: c, high: c + 0.2, low: c - 0.2, close: c, volume: 1000 }));
}

(function testGreenAndRedV() {
  // noisy trends (a pure monotonic move pins Cutler's RSI at 0/100 with no strict
  // local min); real data oscillates, so add a small saw so the RSI forms a V.
  const closes = [];
  let p = 100;
  const saw = i => (i % 2 ? 0.6 : -0.6);
  for (let i = 0; i < 22; i++) { p += -1.4 + saw(i); closes.push(p); }   // down → oversold
  for (let i = 0; i < 16; i++) { p += 1.5 + saw(i); closes.push(p); }    // bounce → green V
  for (let i = 0; i < 16; i++) { p += 1.1 + saw(i); closes.push(p); }    // up → overbought
  for (let i = 0; i < 16; i++) { p += -1.5 + saw(i); closes.push(p); }   // drop → red V
  const bars = mk(closes);
  const sigs = vrsi.detectSignals(bars, bars, { baseTfMin: 1, lowerZone: 35, upperZone: 65 });
  assert(sigs.length > 0, "found some V signals");
  const longs = sigs.filter(s => s.side === "long");
  const shorts = sigs.filter(s => s.side === "short");
  assert(longs.length > 0, "at least one green V (long)");
  assert(shorts.length > 0, "at least one red V (short)");
  // confirmation bar is a real closed index, entry is close of that bar
  for (const s of sigs) { assert(s.index >= 2 && s.index < bars.length, "index in range"); assert(isFinite(s.rsi), "rsi value"); }
  // green V pivots sit in the low zone, red V pivots in the high zone
  assert(longs.every(s => s.pivotRsi <= 35 + 1e-6), "green V pivot ≤ lowerZone");
  assert(shorts.every(s => s.pivotRsi >= 65 - 1e-6), "red V pivot ≥ upperZone");
  console.log("  longs:", longs.length, "shorts:", shorts.length);
})();

(function testThresholdsMatter() {
  const closes = [];
  let p = 100;
  const saw = i => (i % 2 ? 0.6 : -0.6);
  for (let i = 0; i < 22; i++) { p += -1.4 + saw(i); closes.push(p); }
  for (let i = 0; i < 16; i++) { p += 1.5 + saw(i); closes.push(p); }
  const bars = mk(closes);
  const strict = vrsi.detectSignals(bars, bars, { baseTfMin: 1, lowerZone: 10, upperZone: 90 });
  const loose = vrsi.detectSignals(bars, bars, { baseTfMin: 1, lowerZone: 45, upperZone: 55 });
  assert(loose.length >= strict.length, "looser zones ≥ stricter (learnable thresholds)");
  console.log("  strict:", strict.length, "loose:", loose.length);
})();

console.log("vrsi.test.js OK");
