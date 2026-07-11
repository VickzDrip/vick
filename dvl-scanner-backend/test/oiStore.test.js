"use strict";

/* oiStore sanity test — runs with `npm test`, no network. Confirms holdVol
   snapshots aggregate into correct OHLC candles per timeframe, unit conversion
   (contracts/base/usdt via contractSize + fairPrice), symbol normalization,
   and that closed candles are immutable when later snapshots arrive. */

const assert = require("assert");
const oiStore = require("../src/oiStore");

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  try { assert.strictEqual(actual, expected); pass++; }
  catch (_) { fail++; console.error("FAIL: " + msg + " (got " + actual + ", want " + expected + ")"); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error("FAIL: " + msg); } }

const M = 60000; // 1m
const T0 = 1_700_000_000_000; // aligned to minute? make it a 1m boundary
const base = Math.floor(T0 / M) * M;

// contractSize for our test symbol
oiStore.setContractSizes({ TEST_USDT: 0.1 });
eq(oiStore.getContractSize("TEST_USDT"), 0.1, "contractSize stored per symbol");
eq(oiStore.getContractSize("UNKNOWN_USDT"), null, "unknown contractSize → null (never a shared default)");

// Two 1m buckets, 3 snaps each. holdVol path: bucket1 [100,140,90], bucket2 [120,120,150]
const snapsIn = [
  { sym: "TEST_USDT", oi: 100, fp: 10 },  // bucket1 open
  { sym: "TEST_USDT", oi: 140, fp: 10 },  // bucket1 high
  { sym: "TEST_USDT", oi: 90,  fp: 10 },  // bucket1 low + close
  { sym: "TEST_USDT", oi: 120, fp: 20 },  // bucket2 open + low
  { sym: "TEST_USDT", oi: 150, fp: 20 },  // bucket2 high
  { sym: "TEST_USDT", oi: 130, fp: 20 }   // bucket2 close
];
// bucket1 timestamps within minute 0, bucket2 within minute 1
const times = [base + 1000, base + 20000, base + 40000, base + M + 1000, base + M + 20000, base + M + 40000];
for (let i = 0; i < snapsIn.length; i++) oiStore.sample([snapsIn[i]], times[i]);

eq(oiStore.snapCount("TEST_USDT"), 6, "6 snapshots stored");
eq(oiStore.snapCount("TESTUSDT"), 6, "symbol normalization: Binance form maps to same series");

// contracts unit
const c = oiStore.getCandles("TEST_USDT", "1m", "contracts", 100);
eq(c.candles.length, 2, "two 1m candles");
const [b1, b2] = c.candles;
eq(b1.open, 100, "bucket1 open = first holdVol");
eq(b1.high, 140, "bucket1 high = max holdVol");
eq(b1.low, 90, "bucket1 low = min holdVol");
eq(b1.close, 90, "bucket1 close = last holdVol");
eq(b2.open, 120, "bucket2 open");
eq(b2.close, 130, "bucket2 close");
eq(b1.time, base, "bucket1 time aligned to minute boundary");
eq(b2.time, base + M, "bucket2 time is next minute");

// base unit = holdVol * contractSize (0.1)
const cb = oiStore.getCandles("TEST_USDT", "1m", "base", 100);
eq(cb.unit, "base", "base unit served");
eq(Math.round(cb.candles[0].high * 100) / 100, 14, "base high = 140 * 0.1 = 14");

// usdt unit = holdVol * contractSize * fairPrice; bucket1 fp=10 → 140*0.1*10 = 140
const cu = oiStore.getCandles("TEST_USDT", "1m", "usdt", 100);
eq(cu.unit, "usdt", "usdt unit served");
eq(cu.candles[0].high, 140, "usdt high bucket1 = 140*0.1*10");
eq(cu.candles[1].high, 300, "usdt high bucket2 = 150*0.1*20");

// unknown contractSize → base/usdt fall back to contracts (never a fake shared size)
oiStore.sample([{ sym: "NOSIZE_USDT", oi: 500, fp: 5 }], base);
const cn = oiStore.getCandles("NOSIZE_USDT", "1m", "usdt", 100);
eq(cn.unit, "contracts", "no contractSize → falls back to contracts unit");
eq(cn.candles[0].close, 500, "fallback shows raw holdVol");

// 5m aggregation: both 1m buckets fall in the same 5m bucket
const c5 = oiStore.getCandles("TEST_USDT", "5m", "contracts", 100);
eq(c5.candles.length, 1, "both minutes aggregate into one 5m candle");
eq(c5.candles[0].open, 100, "5m open = very first holdVol");
eq(c5.candles[0].high, 150, "5m high = max across both minutes");
eq(c5.candles[0].low, 90, "5m low = min across both minutes");
eq(c5.candles[0].close, 130, "5m close = last holdVol");

// Immutability: a NEW snapshot in a NEW (third) minute must not alter closed buckets.
const b1Before = JSON.stringify(oiStore.getCandles("TEST_USDT", "1m", "contracts", 100).candles[0]);
oiStore.sample([{ sym: "TEST_USDT", oi: 999, fp: 30 }], base + 2 * M + 5000);
const after = oiStore.getCandles("TEST_USDT", "1m", "contracts", 100);
eq(JSON.stringify(after.candles[0]), b1Before, "closed bucket1 unchanged after a later snapshot");
eq(after.candles.length, 3, "third minute added as a new candle");
eq(after.candles[2].close, 999, "new candle reflects the new snapshot");

console.log(fail ? ("OI STORE — " + pass + " passed, " + fail + " FAILED") : ("OK — " + pass + " passed, 0 failed"));
process.exit(fail ? 1 : 0);
