"use strict";
const assert = require("assert");
const vp = require("../src/vp");

/* Build bars with volume piled at a known price → POC there, VAL/VAH around it. */
function bar(t, o, h, l, c, v) { return { time: t, open: o, high: h, low: l, close: c, volume: v }; }

(function testVolumeProfilePeak() {
  const bars = [];
  let t = 0;
  // volume concentrated around 100 but SPREAD across 98..102 so the value area
  // expands; thinner tails at 90 and 110 sit outside it.
  for (let i = 0; i < 40; i++) { const px = 98 + (i % 5); bars.push(bar(t += 60000, px, px + 0.5, px - 0.5, px, 1000)); }
  for (let i = 0; i < 5; i++) bars.push(bar(t += 60000, 90, 90.5, 89.5, 90, 150));
  for (let i = 0; i < 5; i++) bars.push(bar(t += 60000, 110, 110.5, 109.5, 110, 150));
  const lv = vp.volumeProfile(bars, 120, 0.70);
  assert(lv, "levels computed");
  assert(Math.abs(lv.poc - 100) < 2.5, "POC in the 98..102 cluster, got " + lv.poc);
  assert(lv.val < lv.poc && lv.poc < lv.vah, "VAL < POC < VAH");
  console.log("  poc/val/vah:", lv.poc.toFixed(2), lv.val.toFixed(2), lv.vah.toFixed(2));
})();

(function testSessionSlices() {
  const DAY = 86400000;
  const bars = [];
  // previous UTC day
  for (let i = 0; i < 30; i++) bars.push(bar(i * 60000, 90, 91, 89, 90, 500));
  // current UTC day
  for (let i = 0; i < 30; i++) bars.push(bar(DAY + i * 60000, 100, 101, 99, 100, 500));
  const atTs = DAY + 20 * 60000;
  const sl = vp.sessionSlices(bars, atTs, 25);
  assert(sl.prevDay.length === 30, "prevDay full, got " + sl.prevDay.length);
  assert(sl.today.length === 21, "today up to signal (0..20), got " + sl.today.length);
  assert(sl.window.length === 25, "rolling window sized, got " + sl.window.length);
  // never peeks past the signal
  assert(sl.today.every(b => b.time <= atTs), "no lookahead");
  const lv = vp.sessionLevels(bars, atTs, { rows: 120, vaPct: 0.7, winBars: 25 });
  assert(lv.prevDay && Math.abs(lv.prevDay.poc - 90) < 1.5, "prevDay POC ~90");
  assert(lv.today && Math.abs(lv.today.poc - 100) < 1.5, "today POC ~100");
  console.log("  prevDay POC:", lv.prevDay.poc.toFixed(2), "today POC:", lv.today.poc.toFixed(2));
})();

console.log("vp.test.js OK");
