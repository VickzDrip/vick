"use strict";

/* ── Annual backtest ─────────────────────────────────────────────────────
   Runs the SAME criteria as the live backtest (close-confirmed spike pós-flat
   + 15m Exhaustion RSI) over ~1 year of 15m candles for a handful of assets,
   on demand. Unlike the live model it does NOT touch the persistent dataset —
   it builds an ephemeral sample set, fits a throwaway model on it, and hands it
   to the same pumpBacktest evaluator/optimiser (per-side).

   RSI note: over a full year we don't fetch 1m (hundreds of thousands of bars),
   so the Exhaustion RSI here is the 15m BASE RSI without the intraday push. The
   ignition trigger and the price outcomes are fully faithful (pure 15m). */

const M = require("./metrics");
const exhaustionRsi = require("./exhaustionRsi");
const pumpModel = require("./pumpModel");
const pumpBacktest = require("./pumpBacktest");

const HORIZON = pumpModel.HORIZON || 20;
const FEATURES = pumpModel.FEATURES;

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/* Build resolved samples from one asset's 15m candles (ascending
   {time,open,high,low,close,volume}). Same shape the live model stores:
   { f, up, down, entry, atr, path, exrValue, exrPush, exrCloses }. Pure — no
   global state. `series` is the precomputed EXR series aligned to `base`. */
function buildSamples(base, series, engine, opts) {
  if (!Array.isArray(base) || base.length < 30 + HORIZON) return [];
  const closes = base.map(c => Number(c.close));
  const vols = base.map(c => Number(c.volume));
  const ohlc = base.map(c => ({ time: Number(c.time), high: Number(c.high), low: Number(c.low), close: Number(c.close) }));
  const sByTime = new Map();
  if (Array.isArray(series)) for (const s of series) sByTime.set(Number(s.time), s);
  const upperZone = opts.upperZone, lowerZone = opts.lowerZone;
  const out = [];
  /* j = last CLOSED bar; need HORIZON bars AFTER it to resolve. */
  for (let j = 26; j <= base.length - 2 - HORIZON; j++) {
    const ig = M.closedIgnition(closes.slice(0, j + 2), vols.slice(0, j + 2), engine);
    if (!ig.isIgnition) continue;
    const price = Number(base[j].close);
    if (!(price > 0)) continue;
    const atr = M.computeAtr(ohlc.slice(0, j + 1), 14);
    if (!(atr > 0)) continue;
    let sig = null;
    try { sig = M.computeSignal(closes.slice(0, j + 1), vols.slice(0, j + 1), engine); } catch (_) { sig = null; }
    const f = [num(ig.volBelowMaBars), num(sig && sig.maFlatness1), num(sig && sig.spike20),
               num(ig.crossStrength), num(sig && sig.spikePrevVolRatio)];
    /* forward MFE + ATR-normalised price path over the next HORIZON bars */
    let maxHigh = -Infinity, minLow = Infinity;
    const path = [];
    for (let i = j + 1; i <= j + HORIZON; i++) {
      const h = Number(ohlc[i].high), l = Number(ohlc[i].low), c = Number(ohlc[i].close);
      if (h > maxHigh) maxHigh = h;
      if (l < minLow) minLow = l;
      path.push([(h - price) / atr, (l - price) / atr, (c - price) / atr]);
    }
    if (!(Number.isFinite(maxHigh) && Number.isFinite(minLow))) continue;
    const up = Math.max(0, (maxHigh - price) / atr);
    const down = Math.max(0, (price - minLow) / atr);
    const sample = { f: f, up: up, down: down, entry: price, atr: atr, path: path };
    const se = sByTime.get(Number(base[j].time));
    if (se && Number.isFinite(Number(se.value))) {
      sample.exrValue = Number(se.value);
      sample.exrPush = Number(se.push) || 0;
      sample.exrCloses = closes.slice(Math.max(0, j - 39), j + 1);
    }
    out.push(sample);
  }
  return out;
}

/* Fit a throwaway up/down model on THIS dataset and return a predictFeatures fn
   (so the annual result is self-contained, not tied to the live model's state). */
function localPredictor(samples) {
  if (!Array.isArray(samples) || samples.length < 8) return () => null;
  const upM = pumpModel.fit(samples, "up");
  const downM = pumpModel.fit(samples, "down");
  const p = FEATURES.length;
  const vec = (m, f) => { let y = m.w[p]; for (let j = 0; j < p; j++) y += m.w[j] * ((f[j] - m.mean[j]) / (m.std[j] || 1)); return Math.max(0, y); };
  return (f) => (Array.isArray(f) ? { up: vec(upM, f), down: vec(downM, f) } : null);
}

/* Orchestrate: fetch ~`days` of 15m for each symbol, build+aggregate samples,
   fit a local model, and run the same evaluator/optimiser (per side). `fetch15m`
   is injected (sym → ascending [{time,open,high,low,close,volume}]) so this is
   testable without network. Returns the /pump-backtest-shaped payload. */
async function run(symbols, days, cfg, fetch15m) {
  const engine = cfg.ENGINE;
  const opts = Object.assign({ baseTfMin: 15 }, cfg.EXR);
  const perAsset = [];
  let all = [];
  for (const sym of symbols) {
    let base = null;
    try { base = await fetch15m(sym); } catch (_) { base = null; }
    if (!Array.isArray(base) || base.length < 30 + HORIZON) { perAsset.push({ sym, bars: base ? base.length : 0, signals: 0 }); continue; }
    let series = null;
    try { series = exhaustionRsi.computeSeries(base, null, opts); } catch (_) { series = null; }
    const samples = buildSamples(base, series || [], engine, opts);
    perAsset.push({ sym, bars: base.length, signals: samples.length,
                    fromMs: Number(base[0].time) || 0, toMs: Number(base[base.length - 1].time) || 0 });
    all = all.concat(samples);
  }
  if (all.length < 20) {
    return { ok: true, ready: false, reason: "poucos sinais no período", samples: all.length, perAsset, symbols, days };
  }
  const predict = localPredictor(all);
  const num2 = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const base = { account0: num2(cfg.account0, 1000), riskPct: Math.min(0.2, Math.max(0.001, num2(cfg.riskPct, 0.01))),
                 costFrac: 2 * (num2(cfg.feePct, 0.02) + num2(cfg.slipPct, 0.02)) / 100 };
  const strip = r => { const { equity, ...rest } = r; return rest; };
  const MODES = [
    { key: "scalp", label: "Scalp", slAtr: 0.8, tpGrid: [1, 1.5, 2, 2.5] },
    { key: "normal", label: "Equilibrado", slAtr: 1.2, tpGrid: [1.5, 2, 3, 4] },
    { key: "runner", label: "Runner", slAtr: 2.0, tpGrid: [3, 4, 5, 6, 8] },
    { key: "adapt", label: "Adaptativo", slAtr: 1.5, trail: true, trailGrid: [0.5, 1, 1.5, 2, 2.5, 3] }
  ];
  const evalMode = (m, side) => pumpBacktest.evaluate(all, predict, Object.assign({}, base,
    m.trail ? { slAtr: m.slAtr, trail: true, trailGrid: m.trailGrid } : { slAtr: m.slAtr, tpGrid: m.tpGrid },
    side ? { side } : {}));
  const evals = MODES.map(m => ({ m, e: evalMode(m, null) }));
  let bi = 0; for (let i = 1; i < evals.length; i++) if (evals[i].e.all.account > evals[bi].e.all.account) bi = i;
  const bm = evals[bi], e = bm.e;
  const bestSide = (side) => {
    const evs = MODES.map(m => ({ m, e: evalMode(m, side) }));
    let k = 0; for (let i = 1; i < evs.length; i++) if (evs[i].e.all.account > evs[k].e.all.account) k = i;
    return { result: strip(evs[k].e.all),
             params: { mode: evs[k].m.key, modeLabel: evs[k].m.label, slAtr: evs[k].e.slAtr, tpAtr: evs[k].e.tpAtr, trailAtr: evs[k].e.trailAtr, adaptive: !!evs[k].e.adaptive, minConv: evs[k].e.minConv },
             optimize: pumpBacktest.optimize(all, predict, Object.assign({}, base, { side })) };
  };
  const modes = evals.map(({ m, e }) => ({ key: m.key, label: m.label, adaptive: !!e.adaptive, slAtr: e.slAtr, tpAtr: e.tpAtr, trailAtr: e.trailAtr, minConv: e.minConv, account: e.all.account, returnPct: e.all.returnPct, maxDrawdownPct: e.all.maxDrawdownPct, winRate: e.all.winRate, trades: e.all.trades }));
  return {
    ok: true, ready: true, annual: true, horizon: HORIZON, symbols, days,
    samples: all.length, perAsset,
    params: { account0: base.account0, riskPct: base.riskPct, slAtr: e.slAtr, minConv: e.minConv, tpAtr: e.tpAtr, trailAtr: e.trailAtr, adaptive: !!e.adaptive, mode: bm.m.key, modeLabel: bm.m.label, costRoundTripPct: base.costFrac * 100 },
    modes, bestMode: bm.m.key,
    best: strip(e.all), long: strip(e.long), short: strip(e.short),
    longSide: bestSide("long"), shortSide: bestSide("short"),
    optimized: pumpBacktest.optimize(all, predict, base),
    calibration: pumpBacktest.calibrate(all, predict),
    conditions: pumpBacktest.mineConditions(all, predict, FEATURES, base),
    rsiConfirm: pumpBacktest.sweepRsiConfirm(all, predict, base),
    grossReturnPct: e.grossReturnPct
  };
}

module.exports = { buildSamples, localPredictor, run, HORIZON };
