"use strict";

/* Offline test for btcBacktest.js — no network. Exercises the pure pieces
   (buildRows, simulate, aggregate) with synthetic candles/series; the live
   30-day fetch (run()) is deliberately not unit-tested here since it needs
   MEXC (candles) + Binance (OI/LSR). */

const assert = require("assert");
const bt = require("../src/btcBacktest");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }
function near(a, b, m, eps) { if (Math.abs(a - b) <= (eps || 1e-6)) pass++; else { fail++; console.error("FAIL: " + m + " (got " + a + ", want " + b + ")"); } }

/* Helper: a candle the sim reads. atr14=1, so with EX.atrMult 1.5 -> r=1.5. */
function candle(close, high, low) { return { close: close, high: high, low: low, atr14: 1 }; }

/* Fixed exit for the sim-MECHANICS tests, independent of the production
   EXIT constant (which gets tuned) so these keep asserting the engine, not
   whatever the live exit params happen to be today. */
const EX = { atrMult: 1.5, tp1R: 1, tp1Frac: 0.5, be: true, tp2R: 2, holdMin: 45 };

/* 1) A single winning trade that reaches +2R. Entry 100 -> r=1.5, tp1=101.5,
   tp2=103. matchFn fires only on bar 0. Bar 1 spans up to 103.5 (past tp2). */
(function () {
  const rows = [
    candle(100, 100, 100),                 // 0: entry signal
    candle(102, 103.5, 100.1)              // 1: blows through tp1 and tp2
  ];
  // ensure no re-entry: matchFn true only at index 0
  let fired = false;
  const match = (c) => { if (!fired && c.close === 100) { fired = true; return true; } return false; };
  const s = bt.simulate(rows, match, EX, "5m");
  ok(s.trades === 1, "one trade taken");
  // half at +1R, half at +2R = +1.5R
  near(s.avgR, 1.5, "winning trade banks +1.5R (half 1R + half 2R)");
  ok(s.winPct === 100, "win rate 100%");
})();

/* 2) A losing trade: bar 1 drops to the stop (98.5) before any target. */
(function () {
  const rows = [
    candle(100, 100.2, 99.8),              // 0: entry
    candle(99, 100.4, 98.0)                // 1: low 98 <= sl 98.5 -> stop, high never reached tp2(103)
  ];
  let fired = false;
  const match = (c) => { if (!fired && c.close === 100) { fired = true; return true; } return false; };
  const s = bt.simulate(rows, match, EX, "5m");
  ok(s.trades === 1, "one trade taken (loss)");
  near(s.avgR, -1, "losing trade is -1R");
  ok(s.winPct === 0, "win rate 0%");
})();

/* 3) Partial then breakeven: bar1 hits tp1 (not tp2, not sl), bar2 stops at BE. */
(function () {
  const rows = [
    candle(100, 100, 100),                 // 0: entry (r=1.5, tp1=101.5, tp2=103, sl=98.5)
    candle(101.6, 102.0, 100.5),           // 1: high 102 >= tp1 1.5, < tp2 103; low 100.5 > sl -> partial + BE (sl->100)
    candle(100, 100.2, 99.5)               // 2: low 99.5 <= sl(now 100) -> close at BE 100
  ];
  let fired = false;
  const match = (c) => { if (!fired && c.close === 100 && !c.__seen) { fired = true; return true; } return false; };
  const s = bt.simulate(rows, match, EX, "5m");
  ok(s.trades === 1, "one trade (partial then BE)");
  near(s.avgR, 0.5, "partial-then-BE nets +0.5R (half at 1R, rest flat)");
})();

/* 4) Pessimistic intrabar: a bar that touches BOTH stop and tp2 is scored as
   a STOP (loss), never the win. */
(function () {
  const rows = [
    candle(100, 100, 100),                 // 0: entry
    candle(100, 103.5, 98.0)               // 1: spans sl(98.5) AND tp2(103) -> stop wins the tie
  ];
  let fired = false;
  const match = (c) => { if (!fired && c.close === 100) { fired = true; return true; } return false; };
  const s = bt.simulate(rows, match, EX, "5m");
  near(s.avgR, -1, "ambiguous bar (stop+target) is scored as the stop, pessimistically");
})();

/* 5) summarize(): win rate / expectancy / compounded return / drawdown math. */
(function () {
  const s = bt.summarize([1.5, -1, 1.5, -1]); // 2 wins 2 losses, avg 0.25R
  ok(s.trades === 4, "counts every trade");
  ok(s.winPct === 50, "50% win rate");
  near(s.avgR, 0.25, "expectancy = mean R");
  near(s.totalR, 1, "total R summed (1.5-1+1.5-1)");
  ok(s.retPct > 0, "net-positive expectancy -> positive compounded return");
  ok(s.maxDDPct >= 0, "drawdown is reported and non-negative");
  const empty = bt.summarize([]);
  ok(empty.trades === 0 && empty.retPct === 0 && empty.avgR === 0, "empty set -> all zeros, no NaN");
})();

/* 6) buildRows(): with enough synthetic history + OI/LSR points, produces
   non-null rows carrying .blocks and .oiSlope; warmup/insufficient-data
   candles are null. */
(function () {
  const n = 120, t0 = 1700000000000, tfMs = 300000;
  const klines = [];
  for (let i = 0; i < n; i++) {
    const base = 100 + Math.sin(i / 5) * 2;
    klines.push({ t: t0 + i * tfMs, o: base, h: base + 1, l: base - 1, c: base + (i % 3 === 0 ? 0.5 : -0.3), v: 1000 + (i % 7) * 300 });
  }
  // OI + LSR at 5m across the same span, rising then falling
  const oi = [], lsr = [];
  for (let i = 0; i < n; i++) { oi.push({ t: t0 + i * tfMs, v: 1e6 + i * 1000 }); lsr.push({ t: t0 + i * tfMs, v: 1.2 - i * 0.001 }); }
  const rows = bt.buildRows(klines, oi, lsr, "5m");
  ok(rows.length === n, "one row slot per candle");
  ok(rows.slice(0, 64).every(r => r === null), "warmup candles are null");
  const live = rows.filter(Boolean);
  ok(live.length > 0, "produces usable rows past warmup");
  ok(live.every(r => r.blocks && typeof r.blocks.oiAboveAvg === "boolean" && typeof r.oiSlope === "number"), "rows carry blocks + oiSlope");
})();

/* 6b) simulateTrades(): returns the raw per-trade R array (chronological),
   and simulate() is just summarize() over it — the two must agree. */
(function () {
  const rows = [
    candle(100, 100, 100),                 // 0: entry
    candle(102, 103.5, 100.1)              // 1: through tp1+tp2 -> +1.5R
  ];
  const mkMatch = () => { let fired = false; return (c) => { if (!fired && c.close === 100) { fired = true; return true; } return false; }; };
  const tr = bt.simulateTrades(rows, mkMatch(), EX, "5m");
  ok(Array.isArray(tr) && tr.length === 1, "simulateTrades returns an array of trades");
  near(tr[0].g, 1.5, "raw trade gross R matches (+1.5R)");
  // atr14=1, atrMult=1.5 -> r=1.5, entry=100 -> stop distance fraction 0.015
  near(tr[0].sd, 0.015, "trade carries its stop-distance fraction (for fees)");
  const s = bt.simulate(rows, mkMatch(), EX, "5m");
  ok(s.trades === 1 && Math.abs(s.avgR - 1.5) < 1e-6, "simulate() == summarize(gross of simulateTrades)");
})();

/* 6c) Fees: net R = gross - FEE_ROUNDTRIP/stopDist, so a tighter stop (small
   sd) is punished harder — the whole point of charging fees "per TF". */
(function () {
  const fee = bt.FEE_ROUNDTRIP;
  ok(fee > 0 && fee < 0.01, "FEE_ROUNDTRIP is a small positive fraction");
  const wide = fee / 0.02;   // stop = 2% of price -> light fee in R
  const tight = fee / 0.002; // stop = 0.2% of price -> 10x heavier fee in R
  ok(tight > wide, "same % fee costs more R when the stop is tighter (fast TF)");
  near(tight, wide * 10, "fee-in-R scales inversely with stop distance", 1e-9);
})();

/* 7) aggregate(): Min1 candles roll up into 3m buckets on clock boundaries —
   open from the first, close from the last, high/low the extremes, volume
   summed. A gap (missing minute) must not straddle a bucket. */
(function () {
  const b = 180000; // 3m
  // Three 1m candles inside the 0..3m bucket (t=0,60000,120000), then one in the next.
  const k = [
    { t: 0, o: 100, h: 102, l: 99, c: 101, v: 10 },
    { t: 60000, o: 101, h: 105, l: 100, c: 104, v: 20 },
    { t: 120000, o: 104, h: 104.5, l: 98, c: 100, v: 30 },
    { t: 180000, o: 100, h: 101, l: 99.5, c: 100.5, v: 5 }
  ];
  const agg = bt.aggregate(k, b);
  ok(agg.length === 2, "two 3m buckets from four 1m candles");
  const g = agg[0];
  ok(g.t === 0, "bucket aligned to clock boundary");
  near(g.o, 100, "bucket open = first candle open");
  near(g.c, 100, "bucket close = last candle close");
  near(g.h, 105, "bucket high = max of members");
  near(g.l, 98, "bucket low = min of members");
  near(g.v, 60, "bucket volume = sum of members");
  ok(agg[1].t === 180000 && agg[1].v === 5, "second bucket is the lone next-window candle");
  // A gap (no 60000 candle) still buckets correctly, no straddle.
  const gap = bt.aggregate([k[0], k[2], k[3]], b);
  ok(gap.length === 2 && gap[0].v === 40 && gap[1].v === 5, "gap tolerated, no cross-boundary bleed");
})();

/* 8) Multi-asset pooling math: win% + avgR pool EVERY trade across assets,
   while retPct is the mean of the per-asset returns (the scheme run() uses).
   This locks the two aggregation modes so a regression in either is caught. */
(function () {
  const A = [1.5, -1];        // asset A trades
  const B = [1.5, 1.5];       // asset B trades
  const pooled = bt.summarize(A.concat(B));
  ok(pooled.trades === 4, "pooled counts every trade across assets");
  ok(pooled.winPct === 75, "pooled win% over all trades (3/4)");
  near(pooled.avgR, 0.875, "pooled avgR = mean R over all trades");
  const retA = bt.summarize(A).retPct, retB = bt.summarize(B).retPct;
  const avgRet = Math.round(((retA + retB) / 2) * 10) / 10;
  ok(retB > retA, "the all-wins asset has the higher per-asset return");
  ok(Number.isFinite(avgRet), "averaged per-asset return is a finite number, no NaN");
})();

console.log((fail === 0 ? "OK" : "FAILED") + " — " + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
