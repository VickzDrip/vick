"use strict";

/* Annual backtest: builds resolved samples from a year-ish of 15m candles per
   asset using the SAME ignition criteria, aggregates across assets, and runs
   the per-side evaluator/optimiser — all without touching the live dataset or
   the network (fetch is injected). */

const assert = require("assert");
const path = require("path");
const os = require("os");
const fs = require("fs");
process.env.DVL_PUMP_DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dvl-annual-")), "d.jsonl");

const annual = require("../src/annualBacktest");
const cfg = require("../src/config");

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.error("FAIL: " + m); } }

/* Synthetic 15m series with periodic ignitions: a declining base (below its MA)
   then a spike, repeated, so we get many resolvable signals across the year. */
function makeSeries(n, seed) {
  const base = [];
  let price = 100 + seed;
  const T0 = 1_600_000_000_000 + seed * 900000;
  for (let i = 0; i < n; i++) {
    const cyc = i % 80;                      // 80-bar cycle
    let vol;
    if (cyc < 60) vol = 3000 - cyc * 30;     // declining base (below MA)
    else if (cyc === 60) vol = 30000;        // ignition spike
    else vol = 400;
    const drift = cyc > 60 && cyc < 75 ? 0.5 : (cyc >= 75 ? -0.2 : 0.0);
    const open = price;
    price = Math.max(1, price + drift + (i % 2 ? 0.05 : -0.05));
    const close = price;
    base.push({ time: T0 + i * 900000, open, high: Math.max(open, close) + 0.2, low: Math.min(open, close) - 0.2, close, volume: vol });
  }
  return base;
}

// buildSamples finds ignitions and resolves them
const one = makeSeries(400, 0);
const opts = Object.assign({ baseTfMin: 15 }, cfg.EXR);
const EXR = require("../src/exhaustionRsi");
const series = EXR.computeSeries(one, null, opts);
const samples = annual.buildSamples(one, series, cfg.ENGINE, opts);
ok(samples.length >= 3, "buildSamples resolves multiple ignitions (got " + samples.length + ")");
ok(samples.every(s => Array.isArray(s.path) && s.path.length === annual.HORIZON), "each sample carries a full HORIZON path");
ok(samples.every(s => Array.isArray(s.exrCloses) && s.exrCloses.length), "each sample carries the RSI reading (exrCloses)");
ok(samples.every(s => Number.isFinite(s.up) && Number.isFinite(s.down) && s.atr > 0), "each sample has finite up/down and atr");

// run() aggregates across 5 injected assets and produces a per-side payload
const fetch15m = (sym) => Promise.resolve(makeSeries(1200, sym.length));
(async () => {
  const syms = ["BTC_USDT", "ETH_USDT", "SOL_USDT", "BNB_USDT", "XRP_USDT"];
  const res = await annual.run(syms, 365, cfg, fetch15m);
  ok(res.ok && res.ready, "annual run ready");
  ok(res.annual === true, "payload flagged annual");
  ok(res.samples >= 20, "aggregated enough signals across assets (" + res.samples + ")");
  ok(Array.isArray(res.perAsset) && res.perAsset.length === 5, "reports per-asset breakdown for all 5");
  ok(res.longSide && res.shortSide && res.longSide.result && res.shortSide.result, "per-side results present");
  ok(res.best && Number.isFinite(res.best.returnPct), "combined result present");
  ok(res.optimized && ("ready" in res.optimized), "optimizer ran");
  // per-asset: each with its own $1000, long/short split, mode table
  const withEv = res.perAsset.filter(p => p.best && p.long && p.short);
  ok(withEv.length >= 1, "at least one asset has a full per-asset evaluation");
  ok(withEv.every(p => p.account0 === 1000), "each asset starts with $1000");
  ok(withEv.every(p => p.best && Number.isFinite(p.best.account) && Number.isFinite(p.best.returnPct)), "per-asset gain/loss present");
  ok(withEv.every(p => p.long.result && p.short.result), "per-asset long AND short separated");
  ok(withEv.every(p => Array.isArray(p.modes) && p.modes.length === 4), "per-asset shows the 4 TP/exit modes");
  ok(res.perAssetAccounts === true, "payload flags per-asset accounts");

  // "poucos sinais" path
  const thin = await annual.run(["X_USDT"], 365, cfg, () => Promise.resolve(makeSeries(60, 1)));
  ok(thin.ready === false, "thin dataset → not ready (graceful)");

  console.log(fail ? ("ANNUAL — " + pass + " passed, " + fail + " FAILED") : ("OK — " + pass + " passed, 0 failed"));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
