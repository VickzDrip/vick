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
const vpBacktest = require("./vpBacktest");
const comboBacktest = require("./comboBacktest");
const vSignal = require("./vSignalBacktest");

const HORIZON = pumpModel.HORIZON || 20;
const FEATURES = pumpModel.FEATURES;

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/* Build resolved samples from one asset's 15m candles (ascending
   {time,open,high,low,close,volume}). Same shape the live model stores:
   { f, up, down, entry, atr, path, exrValue, exrPush, exrCloses }. Pure — no
   global state. `series` is the precomputed EXR series aligned to `base`. */
function buildSamples(base, series, engine, opts, want) {
  /* `want` gates the heavy per-sample candle windows so a run only builds what
     its backtest needs: { exr } → 40-bar window for the RSI grid, { vp } →
     200-bar window for the Volume Profile grid. Default (undefined) builds both
     for backward-compat (tests, plain callers). */
  const buildExr = !want || want.exr !== false;
  const buildVp = !want || want.vp !== false;
  if (!Array.isArray(base) || base.length < 30 + HORIZON) return [];
  const closes = base.map(c => Number(c.close));
  const vols = base.map(c => Number(c.volume));
  const ohlc = base.map(c => ({ time: Number(c.time), high: Number(c.high), low: Number(c.low), close: Number(c.close) }));
  const sByTime = new Map();
  if (Array.isArray(series)) for (const s of series) sByTime.set(Number(s.time), s);
  const upperZone = opts.upperZone, lowerZone = opts.lowerZone;
  const out = [];
  /* Bounded lookback window: closedIgnition/computeSignal/computeAtr only read
     the END of the array back a small amount (vol/price MAs ≤ 50, ATR 14, the
     dead-base count). Slicing the FULL history each bar made buildSamples O(N²)
     — deadly at 5m over 1–2 years (100k+ candles → minutes). Windowing to the
     last W bars makes it O(N·W) = O(N) with identical results (W ≫ any lookback). */
  const W = 500;
  /* j = last CLOSED bar; need HORIZON bars AFTER it to resolve. */
  for (let j = 26; j <= base.length - 2 - HORIZON; j++) {
    const w2 = Math.max(0, j + 2 - W), w1 = Math.max(0, j + 1 - W);
    const ig = M.closedIgnition(closes.slice(w2, j + 2), vols.slice(w2, j + 2), engine);
    if (!ig.isIgnition) continue;
    const price = Number(base[j].close);
    if (!(price > 0)) continue;
    const atr = M.computeAtr(ohlc.slice(w1, j + 1), 14);
    if (!(atr > 0)) continue;
    let sig = null;
    try { sig = M.computeSignal(closes.slice(w1, j + 1), vols.slice(w1, j + 1), engine); } catch (_) { sig = null; }
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
    /* Window of 15m candles ending at the signal — lets the RSI grid re-sweep
       EVERY oscillator input (comprimento, push, spike de volume, média de
       volume, zonas) without re-fetching. */
    if (buildExr) sample.exrBars = base.slice(Math.max(0, j - 39), j + 1).map(c => ({
      open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume)
    }));
    /* Deeper window (up to 200 candles) ending at the signal — lets the Volume
       Profile backtest rebuild POC/VAH/VAL over several lookbacks and measure
       how close the entry sits to each line. Only built for VP runs (it's the
       biggest per-sample allocation). */
    if (buildVp) sample.vpBars = base.slice(Math.max(0, j - 199), j + 1).map(c => ({
      open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume)
    }));
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
async function run(symbols, days, cfg, fetch15m, tfMin) {
  const engine = cfg.ENGINE;
  const baseTfMin = Math.max(1, Math.round(Number(tfMin) || cfg.tfMin || 15));
  const opts = Object.assign({}, cfg.EXR, { baseTfMin });
  const assets = [];   // { sym, bars, fromMs, toMs, samples }
  let all = [];
  let vBase = null, vSeries = null;   // candles+RSI do 1º ativo, p/ o backtest de Sinais V
  for (const sym of symbols) {
    let base = null;
    try { base = await fetch15m(sym); } catch (_) { base = null; }
    if (!Array.isArray(base) || base.length < 30 + HORIZON) { assets.push({ sym, bars: base ? base.length : 0, samples: [] }); continue; }
    let series = null;
    try { series = exhaustionRsi.computeSeries(base, null, opts); } catch (_) { series = null; }
    if (!vBase) { vBase = base; vSeries = series || []; }
    /* Sinais V só precisa dos candles+RSI (não das amostras de ignição), então
       quando é SÓ ele, nem monta as janelas caras por amostra. */
    const samples = cfg.vSignalBacktest && !(cfg.rsiGrid || cfg.vpBacktest || cfg.comboBacktest)
      ? []
      : buildSamples(base, series || [], engine, opts, { exr: !!cfg.rsiGrid || !!cfg.comboBacktest, vp: !!cfg.vpBacktest || !!cfg.comboBacktest });
    assets.push({ sym, bars: base.length, fromMs: Number(base[0].time) || 0, toMs: Number(base[base.length - 1].time) || 0, samples });
    all = all.concat(samples);
  }

  const num2 = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

  /* ── Backtest SÓ dos "Sinais V" (exaustão por excursão do RSI) ──────────────
     Não depende das amostras de ignição, então roda direto no candle+RSI e
     retorna cedo (é um teste separado, como o usuário pediu "só disso"). */
  if (cfg.vSignalBacktest) {
    const acc0 = 1000;
    const risk = Math.min(0.2, Math.max(0.001, num2(cfg.riskPct, 0.01)));
    const cost = 2 * (num2(cfg.feePct, 0.02) + num2(cfg.slipPct, 0.02)) / 100;
    const vg = (vBase && vBase.length >= 80)
      ? vSignal.vSignalGridSearch(vBase, vSeries || [], { costFrac: cost, account0: acc0, riskPct: risk, upperZone: opts.upperZone, lowerZone: opts.lowerZone })
      : { ready: false, reason: "poucos candles no período" };
    return { ok: true, ready: !!(vg && vg.ready), annual: true, vSignalOnly: true, horizon: HORIZON, symbols, days, tfMin: baseTfMin, vSignalGrid: vg, account0: acc0 };
  }
  /* Cada ativo com $1000 próprio (a pedido) — a conta NÃO é compartilhada. */
  const base = { account0: 1000, riskPct: Math.min(0.2, Math.max(0.001, num2(cfg.riskPct, 0.01))),
                 costFrac: 2 * (num2(cfg.feePct, 0.02) + num2(cfg.slipPct, 0.02)) / 100 };
  const strip = r => { const { equity, ...rest } = r; return rest; };
  const MODES = [
    { key: "scalp", label: "Scalp", slAtr: 0.8, tpGrid: [1, 1.5, 2, 2.5] },
    { key: "normal", label: "Equilibrado", slAtr: 1.2, tpGrid: [1.5, 2, 3, 4] },
    { key: "runner", label: "Runner", slAtr: 2.0, tpGrid: [3, 4, 5, 6, 8] },
    { key: "adapt", label: "Adaptativo", slAtr: 1.5, trail: true, trailGrid: [0.5, 1, 1.5, 2, 2.5, 3] }
  ];
  /* One stable predictor fit on the whole pool → consistent side/conviction
     across assets (per-asset fits would overfit small sets). */
  const predict = (all.length >= 8) ? localPredictor(all) : (() => null);
  const evalMode = (samples, m, side) => pumpBacktest.evaluate(samples, predict, Object.assign({}, base,
    m.trail ? { slAtr: m.slAtr, trail: true, trailGrid: m.trailGrid } : { slAtr: m.slAtr, tpGrid: m.tpGrid },
    side ? { side } : {}));
  const modesOf = evals => evals.map(({ m, e }) => ({ key: m.key, label: m.label, adaptive: !!e.adaptive,
    slAtr: e.slAtr, tpAtr: e.tpAtr, trailAtr: e.trailAtr, minConv: e.minConv,
    account: e.all.account, returnPct: e.all.returnPct, maxDrawdownPct: e.all.maxDrawdownPct, winRate: e.all.winRate, trades: e.all.trades }));
  /* Full evaluation of ONE dataset: best mode overall + long/short each
     optimised on their own trades (várias saídas testadas por lado). */
  function evalDataset(samples) {
    if (!Array.isArray(samples) || samples.length < 8) return null;
    const evs = MODES.map(m => ({ m, e: evalMode(samples, m, null) }));
    let bi = 0; for (let i = 1; i < evs.length; i++) if (evs[i].e.all.account > evs[bi].e.all.account) bi = i;
    const bm = evs[bi], e = bm.e;
    const bestSide = (side) => {
      const se = MODES.map(m => ({ m, e: evalMode(samples, m, side) }));
      let k = 0; for (let i = 1; i < se.length; i++) if (se[i].e.all.account > se[k].e.all.account) k = i;
      return { result: strip(se[k].e.all),
               params: { mode: se[k].m.key, modeLabel: se[k].m.label, slAtr: se[k].e.slAtr, tpAtr: se[k].e.tpAtr, trailAtr: se[k].e.trailAtr, adaptive: !!se[k].e.adaptive, minConv: se[k].e.minConv },
               modes: modesOf(se) };
    };
    return {
      bestMode: bm.m.key, modeLabel: bm.m.label,
      params: { slAtr: e.slAtr, tpAtr: e.tpAtr, trailAtr: e.trailAtr, adaptive: !!e.adaptive, minConv: e.minConv },
      best: strip(e.all), modes: modesOf(evs),
      long: bestSide("long"), short: bestSide("short"),
      grossReturnPct: e.grossReturnPct
    };
  }

  const wantGrid = !!cfg.rsiGrid;
  /* When a specific grid (VP/RSI/Combo) is requested, that grid IS the deliverable.
     Skip the expensive generic diagnostics (3× the 640-combo optimizer,
     calibração, mineração, RSI-confirm) — they're secondary cards the user isn't
     looking at during a grid run. This is the single biggest speed-up. */
  const lean = wantGrid || !!cfg.vpBacktest || !!cfg.comboBacktest;

  /* PER-ASSET — each with its own $1000, long/short split, várias saídas. Keep
     the eval object so the single-asset aggregate can REUSE it (no double work). */
  const perAsset = assets.map(a => {
    const ev = evalDataset(a.samples);
    const row = { sym: a.sym, bars: a.bars, signals: a.samples.length, fromMs: a.fromMs || 0, toMs: a.toMs || 0, account0: base.account0 };
    if (ev) Object.assign(row, ev);
    return { row, ev };
  });
  const perAssetRows = perAsset.map(p => p.row);

  if (all.length < 20) {
    return { ok: true, ready: false, reason: "poucos sinais no período", samples: all.length, perAsset: perAssetRows, symbols, days, tfMin: baseTfMin, account0: base.account0 };
  }

  /* AGGREGATE (todos juntos, $1000 na pool). For a SINGLE asset, `all` IS that
     asset's samples, so reuse its already-computed eval instead of redoing the
     whole mode/long/short evaluation a second time. */
  const agg = (symbols.length === 1 && perAsset[0] && perAsset[0].ev) ? perAsset[0].ev : evalDataset(all);
  /* RSI grid (pré-volume + oscilador) e VP grid — cada um a pedido, separados. */
  const rsiGrid = wantGrid ? pumpBacktest.rsiGridSearch(all, { costFrac: base.costFrac, account0: base.account0, riskPct: base.riskPct }) : null;
  const vpGrid = cfg.vpBacktest ? vpBacktest.vpGridSearch(all, { costFrac: base.costFrac, account0: base.account0, riskPct: base.riskPct }) : null;
  const comboGrid = cfg.comboBacktest ? comboBacktest.comboGridSearch(all, { costFrac: base.costFrac, account0: base.account0, riskPct: base.riskPct }) : null;
  return {
    ok: true, ready: true, annual: true, perAssetAccounts: true, horizon: HORIZON, symbols, days, tfMin: baseTfMin, rsiGrid, vpGrid, comboGrid,
    samples: all.length, perAsset: perAssetRows, account0: base.account0,
    params: { account0: base.account0, riskPct: base.riskPct, slAtr: agg.params.slAtr, minConv: agg.params.minConv, tpAtr: agg.params.tpAtr, trailAtr: agg.params.trailAtr, adaptive: agg.params.adaptive, mode: agg.bestMode, modeLabel: agg.modeLabel, costRoundTripPct: base.costFrac * 100 },
    modes: agg.modes, bestMode: agg.bestMode,
    best: agg.best, long: agg.long.result, short: agg.short.result,
    longSide: { result: agg.long.result, params: agg.long.params, optimize: lean ? null : pumpBacktest.optimize(all, predict, Object.assign({}, base, { side: "long" })) },
    shortSide: { result: agg.short.result, params: agg.short.params, optimize: lean ? null : pumpBacktest.optimize(all, predict, Object.assign({}, base, { side: "short" })) },
    optimized: lean ? null : pumpBacktest.optimize(all, predict, base),
    calibration: lean ? null : pumpBacktest.calibrate(all, predict),
    conditions: lean ? null : pumpBacktest.mineConditions(all, predict, FEATURES, base),
    rsiConfirm: lean ? null : pumpBacktest.sweepRsiConfirm(all, predict, base),
    grossReturnPct: agg.grossReturnPct
  };
}

module.exports = { buildSamples, localPredictor, run, HORIZON };
