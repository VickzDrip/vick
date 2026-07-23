"use strict";

/* ── DVL VP + RSI-V adaptive model ────────────────────────────────────────
   The new "machine learning": it learns, out-of-sample and per timeframe, the
   parameters of the user's real strategy —

     RSI vzinho verde numa zona de VAL  → COMPRA, alvo no POC, stop abaixo do VAL
     RSI vzinho vermelho numa zona de VAH → VENDA,  alvo no POC, stop acima do VAH

   — by sweeping which VP session (previous day / developing / rolling window)
   gives the best confluence, how close to the zone the entry must be, how strict
   the RSI vzinho must be, the ATR stop distance and whether the take-profit is
   the POC or a fixed ATR multiple. It does NOT invent signals: samples come from
   real detected V pivots, each resolved by its forward price path. Ranking is by
   the WORSE of train/test return so a combo only wins if it generalises.

   Two independent learners run, one per base TF (1m and 5m). No pump-era code. */

const vrsi = require("./vrsi");
const vp = require("./vp");
const fin = require("./finBacktest");

/* Simple ATR (SMA of true range) over the `len` bars ending at index i. */
function atrAt(bars, i, len) {
  len = len || 14;
  const st = Math.max(1, i - len + 1);
  let sum = 0, n = 0;
  for (let k = st; k <= i; k++) {
    const h = Number(bars[k].high), l = Number(bars[k].low), pc = Number(bars[k - 1].close);
    sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)); n++;
  }
  return n ? sum / n : 0;
}

const SESSIONS = ["window", "today", "prevDay"];

/* Build resolved samples from base candles. Detect V pivots with LOOSE RSI
   thresholds (a superset); the optimiser later learns the effective threshold
   from the stored pivotRsi, so no re-detection is needed. Each sample carries the
   signed ATR distance from entry to every session's VAL/POC/VAH, the POC target
   distance, and the forward price path in ATR units. */
function buildSamples(baseCandles, oneMin, opts) {
  opts = opts || {};
  const n = baseCandles.length;
  const horizon = opts.horizon || 60;
  const winBars = opts.winBars || 120;
  const rows = opts.rows || 120, vaPct = opts.vaPct || 0.70;
  const atrLen = opts.atrLen || 14;
  const sigs = vrsi.detectSignals(baseCandles, oneMin, {
    baseTfMin: opts.baseTfMin || 1,
    rsiLen: opts.rsiLen, push: opts.push,
    lowerZone: opts.detectLower != null ? opts.detectLower : 45,   // loose on purpose
    upperZone: opts.detectUpper != null ? opts.detectUpper : 55
  });
  const requireFull = !!opts.requireFullHorizon;
  const out = [];
  for (const sig of sigs) {
    const i = sig.index;
    if (i < atrLen + 2 || i + 2 > n - 1) continue;
    /* Only emit once the FULL forward horizon has closed — so a signal is logged
       exactly once, with a complete path (used by the live store to avoid
       re-logging the same signal with a growing path). */
    if (requireFull && i + horizon > n - 1) continue;
    const entry = Number(baseCandles[i].close);
    const atr = atrAt(baseCandles, i, atrLen);
    if (!(entry > 0 && atr > 0)) continue;
    const lv = vp.sessionLevels(baseCandles, Number(baseCandles[i].time), { rows, vaPct, winBars });
    const dist = {};
    for (const s of SESSIONS) {
      const L = lv[s];
      if (!L) continue;
      dist[s] = {
        val: (entry - L.val) / atr, poc: (entry - L.poc) / atr, vah: (entry - L.vah) / atr,
        pocAtr: Math.abs(entry - L.poc) / atr
      };
    }
    if (!Object.keys(dist).length) continue;
    const path = [];
    const end = Math.min(n - 1, i + horizon);
    for (let k = i + 1; k <= end; k++) {
      path.push([(Number(baseCandles[k].high) - entry) / atr, (Number(baseCandles[k].low) - entry) / atr, (Number(baseCandles[k].close) - entry) / atr]);
    }
    if (!path.length) continue;
    out.push({ side: sig.side, entry, atr, path, dist, pivotRsi: sig.pivotRsi, rsi: sig.rsi, time: Number(baseCandles[i].time) });
  }
  return out;
}

/* Does a sample pass a combo's entry filter? side must match; the entry must sit
   within `prox` ATR of the combo's zone in the combo's session; and the RSI
   vzinho must be strict enough (pivot ≤ rsiMax for long, ≥ rsiMin for short). */
function passes(s, c) {
  if (s.side !== c.side) return false;
  const d = s.dist[c.session];
  if (!d) return false;
  const zoneD = d[c.zone];
  if (zoneD == null || Math.abs(zoneD) > c.prox) return false;
  if (c.side === "long" && !(s.pivotRsi <= c.rsiThresh)) return false;
  if (c.side === "short" && !(s.pivotRsi >= c.rsiThresh)) return false;
  return true;
}

/* Attach the POC take-profit distance (for the combo's session) to filtered
   samples so finBacktest can book at POC. */
function withPocTp(list, session) {
  return list.map(s => Object.assign({}, s, { tpAtr: s.dist[session] ? s.dist[session].pocAtr : 0 }));
}

/* Sweep the strategy space over resolved samples, out-of-sample, per side.
   Returns { ready, long, short, ... } — long/short each { best, top, combos }. */
function optimize(samples, opts) {
  opts = opts || {};
  const list = (Array.isArray(samples) ? samples : []).filter(s => s && s.side && Array.isArray(s.path) && s.path.length && s.dist);
  const need = opts.minSamples || 30;
  if (list.length < need) return { ready: false, samples: list.length, need };

  const MAX = Math.max(200, opts.maxSamples || 3000);
  const use = list.length > MAX ? list.slice(-MAX) : list;
  const sorted = use.slice().sort((a, b) => a.time - b.time);   // chronological split
  const cut = Math.max(1, Math.floor(sorted.length * (opts.trainFrac || 0.7)));
  const train = sorted.slice(0, cut), test = sorted.slice(cut);

  const proxGrid = opts.proxGrid || [0.25, 0.5, 0.75, 1.0, 1.5];
  const slGrid = opts.slGrid || [0.8, 1.0, 1.2, 1.5, 2.0, 2.5];
  const tpGrid = opts.tpGrid || [1, 1.5, 2, 3];               // fixed-ATR alternatives to POC
  const rsiLongGrid = opts.rsiLongGrid || [30, 35, 40, 45];   // pivot ≤ this
  const rsiShortGrid = opts.rsiShortGrid || [55, 60, 65, 70]; // pivot ≥ this
  const account0 = opts.account0 || 1000, riskPct = opts.riskPct || 0.01, costFrac = opts.costFrac || 0;
  const minTr = Math.max(5, Math.round(cut * 0.02));

  function evalCombo(base) {
    const trAll = train.filter(s => passes(s, base));
    if (trAll.length < minTr) return null;
    // choose TP mode: POC, or the best fixed ATR on train
    const trS = withPocTp(trAll, base.session);
    let best = null;
    // POC target
    {
      const r = fin.run(trS, { slAtr: base.sl, useSampleTp: true, side: base.side, account0, riskPct, costFrac });
      best = { tpMode: "poc", tpAtr: 0, r };
    }
    for (const tp of tpGrid) {
      const r = fin.run(trS, { slAtr: base.sl, tpAtr: tp, useSampleTp: false, side: base.side, account0, riskPct, costFrac });
      if (r.account > best.r.account) best = { tpMode: "fixed", tpAtr: tp, r };
    }
    const teAll = test.filter(s => passes(s, base));
    const teS = withPocTp(teAll, base.session);
    const teR = fin.run(teS, best.tpMode === "poc"
      ? { slAtr: base.sl, useSampleTp: true, side: base.side, account0, riskPct, costFrac }
      : { slAtr: base.sl, tpAtr: best.tpAtr, useSampleTp: false, side: base.side, account0, riskPct, costFrac });
    const sum = r => ({ returnPct: r.returnPct, account: r.account, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate, trades: r.trades, profitFactor: r.profitFactor === Infinity ? null : r.profitFactor, expectancyAtr: r.expectancyAtr });
    return {
      side: base.side, session: base.session, zone: base.zone, prox: base.prox, sl: base.sl,
      rsiThresh: base.rsiThresh, tpMode: best.tpMode, tpAtr: best.tpAtr,
      train: sum(best.r), test: sum(teR), trainN: trAll.length, testN: teAll.length,
      robust: Math.min(best.r.returnPct, teR.returnPct),
      generalizes: teR.trades >= 5 && teR.returnPct > 0 && best.r.returnPct > 0
    };
  }

  function searchSide(side) {
    const zones = side === "long" ? ["val", "poc"] : ["vah", "poc"];
    const rsiGrid = side === "long" ? rsiLongGrid : rsiShortGrid;
    const combos = [];
    for (const session of SESSIONS) for (const zone of zones) for (const prox of proxGrid) for (const sl of slGrid) for (const rsiThresh of rsiGrid) {
      const c = evalCombo({ side, session, zone, prox, sl, rsiThresh });
      if (c) combos.push(c);
    }
    const scored = combos.slice().sort((a, b) => b.robust - a.robust);
    const best = scored.filter(c => c.generalizes)[0] || null;
    return { best, top: scored.slice(0, 10), combos: combos.length };
  }

  return {
    ready: true, samples: use.length, trainN: cut, testN: sorted.length - cut,
    grids: { session: SESSIONS, prox: proxGrid, sl: slGrid, tp: tpGrid, rsiLong: rsiLongGrid, rsiShort: rsiShortGrid },
    long: searchSide("long"), short: searchSide("short")
  };
}

/* Full financial backtest of a chosen combo over ALL its samples (the card's
   "backtest financeiro"): $1000, fixed-fractional risk, compounding. */
function backtestCombo(samples, combo, opts) {
  opts = opts || {};
  if (!combo) return null;
  const filt = withPocTp((samples || []).filter(s => passes(s, combo)), combo.session);
  const runOpts = combo.tpMode === "poc"
    ? { slAtr: combo.sl, useSampleTp: true, side: combo.side }
    : { slAtr: combo.sl, tpAtr: combo.tpAtr, useSampleTp: false, side: combo.side };
  return fin.run(filt, Object.assign({ account0: opts.account0 || 1000, riskPct: opts.riskPct || 0.01, costFrac: opts.costFrac || 0 }, runOpts));
}

module.exports = { buildSamples, optimize, backtestCombo, passes, atrAt, SESSIONS };
