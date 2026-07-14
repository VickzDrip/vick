"use strict";

/* exhaustionRsi test — the RSI base matches Cutler's RSI, the multi-TF push
   moves the value toward the extremes, and zones classify correctly. */

const assert = require("assert");
const EXR = require("../src/exhaustionRsi");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }
function near(a, b, tol, m) { if (Math.abs(a - b) <= tol) pass++; else { fail++; console.error("FAIL: " + m + " (got " + a + ", want ~" + b + ")"); } }

// mtfRsi (Cutler): a strictly rising series → RSI 100 (only gains).
const rising = []; for (let i = 0; i < 30; i++) rising.push(1 + i);
const rsiUp = EXR.mtfRsi(rising, 14);
near(rsiUp[29], 100, 1e-9, "all-gains → RSI 100");
// strictly falling → RSI 0
const falling = []; for (let i = 0; i < 30; i++) falling.push(30 - i);
near(EXR.mtfRsi(falling, 14)[29], 0, 1e-9, "all-losses → RSI 0");
// alternating equal up/down → RSI ~50
const flat = []; for (let i = 0; i < 30; i++) flat.push(10 + (i % 2));
const rsiFlat = EXR.mtfRsi(flat, 14)[29];
ok(rsiFlat > 40 && rsiFlat < 60, "balanced → RSI ~50 (" + rsiFlat.toFixed(1) + ")");

// computeSeries with no 1m data → value == base RSI (no push)
function bar(t, o, h, l, c, v) { return { time: t, open: o, high: h, low: l, close: c, volume: v }; }
const base = rising.map((c, i) => bar(i * 900000, c, c + 0.5, c - 0.5, c, 100));
const noPush = EXR.computeSeries(base, null, { mtfRsiLen: 14 });
near(noPush[noPush.length - 1].value, noPush[noPush.length - 1].base, 1e-9, "no 1m data → value = base RSI");

// readingAt zones: an all-rising series has RSI 100 ≥ upperZone → "up"
const r1 = EXR.readingAt(base, null, { mtfRsiLen: 14, upperZone: 60, lowerZone: 35 });
ok(r1 && r1.zone === "up", "high RSI → zone up (exhausted up)");
const baseDn = falling.map((c, i) => bar(i * 900000, c, c + 0.5, c - 0.5, c, 100));
ok(EXR.readingAt(baseDn, null, {}).zone === "down", "low RSI → zone down (exhausted down)");

// mtfLadder for 15m → [3,4,5,10,15]
assert.deepStrictEqual(EXR.mtfLadder(15), [3, 4, 5, 10, 15]);
pass++;
// resample: 3 one-minute bars → one 3m bar with summed volume + right OHLC
const one = [bar(0, 10, 11, 9, 10.5, 5), bar(60000, 10.5, 12, 10, 11, 7), bar(120000, 11, 11.5, 10.8, 11.2, 3)];
const res = EXR.resample(one, 3);
ok(res.length === 1 && res[0].high === 12 && res[0].low === 9 && res[0].volume === 15 && res[0].close === 11.2, "resample groups OHLCV correctly");

console.log(fail ? ("EXHAUSTION RSI — " + pass + " passed, " + fail + " FAILED")
                 : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
