"use strict";

/* ── DVL Volume-Profile proximity backtest ──────────────────────────────
   A SEPARATE backtest (not mixed with the RSI grid): it asks whether the
   pré-volume-low → spike ignition, when it fires NEAR an important Volume
   Profile level (VAL / POC / VAH), leads to a profitable move — the thesis
   from the chart (spike close to the VAL region ran up toward POC/VAH).

   For every resolved ignition sample we rebuild the platform's Volume Profile
   over a lookback window ending at the signal, read POC/VAH/VAL, and measure
   how close the ENTRY sits to each line (in ATR). Then we sweep a lot of
   combinations — window × line × proximity × side-of-line × trade direction ×
   take-profit — and rank them by OUT-OF-SAMPLE return, long and short each
   with its own $1000, exactly like the other backtests.

   The Volume Profile is a faithful port of the frontend's `computeVP` + value
   area (index.html): body 70% distributed triangularly peaked at the close,
   wicks 30% uniform; POC = fullest bucket; the 70% value area expands out from
   the POC picking the fuller neighbour each step → VAH (top) / VAL (bottom).
   Historical candles carry only total volume (no buy/sell split), which the
   levels don't need, so we bucket total volume. */

const pumpBacktest = require("./pumpBacktest");

/* Volume Profile over `bars` ({open,high,low,close,volume} ascending). Returns
   { poc, vah, val, priceMin, priceMax } in PRICE units, or null. Mirrors the
   chart exactly so the backtest lines match what the user sees. */
function volumeProfile(bars, rows, vaPct) {
  rows = Math.max(20, Math.min(500, Math.round(rows) || 120));
  if (!Array.isArray(bars) || bars.length < 5) return null;
  let priceMin = Infinity, priceMax = -Infinity;
  for (const c of bars) {
    const lo = Number(c.low), hi = Number(c.high);
    if (lo < priceMin) priceMin = lo;
    if (hi > priceMax) priceMax = hi;
  }
  if (!(priceMax > priceMin)) return null;
  const pad = (priceMax - priceMin) * 0.005;   // same 0.5% pad as the chart
  priceMin -= pad; priceMax += pad;
  const range = priceMax - priceMin || 1;
  const vol = new Float64Array(rows);

  /* Distribute a candle's volume into buckets. `peakAt` set → triangular
     (peaked at close) with a 0.12 floor; unset → uniform. Identical math to the
     frontend's `fill`. */
  function fill(lo, hi, v, peakAt) {
    const lo2 = Math.max(lo, priceMin), hi2 = Math.min(hi, priceMax);
    if (lo2 >= hi2) return;
    const loI = Math.max(0, Math.floor((lo2 - priceMin) / range * rows));
    const hiI = Math.min(rows - 1, Math.floor((hi2 - priceMin) / range * rows));
    const n = hiI - loI + 1;
    if (n === 1) { vol[loI] += v; return; }
    if (peakAt === undefined) { for (let i = loI; i <= hiI; i++) vol[i] += v / n; return; }
    const pkI = Math.max(loI, Math.min(hiI,
      Math.floor((Math.max(lo2, Math.min(hi2, peakAt)) - priceMin) / range * rows)));
    const w = new Float64Array(n); let wsum = 0;
    for (let k = 0; k < n; k++) {
      const i = loI + k;
      const d = i === pkI ? 1
        : i < pkI ? (pkI > loI ? (i - loI) / (pkI - loI) : 0)
                  : (pkI < hiI ? (hiI - i) / (hiI - pkI) : 0);
      w[k] = d + 0.12; wsum += w[k];
    }
    for (let k = 0; k < n; k++) vol[loI + k] += v * w[k] / wsum;
  }

  for (const c of bars) {
    const v = Number(c.volume) || 0;
    if (!v) continue;
    const hi = Number(c.high), lo = Number(c.low), op = Number(c.open), cl = Number(c.close);
    const bodyH = Math.max(op, cl), bodyL = Math.min(op, cl);
    const fullR = hi - lo, bodyR = bodyH - bodyL;
    if (bodyR > 0 && fullR > 0) {
      const bW = 0.70, wW = 0.30;
      fill(bodyL, bodyH, v * bW, cl);
      const upW = hi - bodyH, dnW = bodyL - lo, totalW = upW + dnW;
      if (totalW > 0) {
        if (upW > 0) fill(bodyH, hi, v * wW * (upW / totalW));
        if (dnW > 0) fill(lo, bodyL, v * wW * (dnW / totalW));
      }
    } else fill(lo, hi, v);
  }

  let maxB = 0, total = 0, pocIdx = 0;
  for (let i = 0; i < rows; i++) { total += vol[i]; if (vol[i] > maxB) { maxB = vol[i]; pocIdx = i; } }
  if (!maxB) return null;

  const vaTarget = total * Math.max(0.01, Math.min(1, vaPct || 0.70));
  let vaVol = vol[pocIdx], vaLo = pocIdx, vaHi = pocIdx;
  while (vaVol < vaTarget && (vaLo > 0 || vaHi < rows - 1)) {
    const nLo = vaLo > 0 ? vol[vaLo - 1] : 0;
    const nHi = vaHi < rows - 1 ? vol[vaHi + 1] : 0;
    if (nHi >= nLo) { vaHi++; vaVol += vol[vaHi]; } else { vaLo--; vaVol += vol[vaLo]; }
  }
  const pricePerRow = range / rows;
  const priceAt = i => priceMin + (i + 0.5) * pricePerRow;
  return { poc: priceAt(pocIdx), vah: priceAt(vaHi), val: priceAt(vaLo), priceMin, priceMax };
}

/* Sweep VP-proximity combinations over resolved samples and rank by the
   OUT-OF-SAMPLE result. Each sample must carry `vpBars` (lookback candles),
   `entry` (entry price) and `atr`. Returns a payload shaped like the RSI grid
   (ready / combosTested / grids / long / short) so the card can render it. */
function vpGridSearch(samples, opts) {
  opts = opts || {};
  const exitBase = { costFrac: opts.costFrac, account0: opts.account0 || 1000, riskPct: opts.riskPct || 0.01, minConv: 0 };
  const slAtr = opts.slAtr || 1.2;
  const withVp = (Array.isArray(samples) ? samples : []).filter(s =>
    s && Array.isArray(s.vpBars) && s.vpBars.length >= 30 && Number(s.entry) > 0 && Number(s.atr) > 0);
  if (withVp.length < 20) return { ready: false, withVp: withVp.length, need: 20 };
  const cut = Math.max(1, Math.floor(withVp.length * (opts.trainFrac || 0.7)));

  const winGrid  = opts.winGrid  || [40, 60, 80, 120, 160, 200];   // VP lookback (candles)
  const proxGrid = opts.proxGrid || [0.2, 0.35, 0.5, 0.75, 1, 1.25, 1.5, 2]; // ATR to the line
  const lineGrid = opts.lineGrid || ["val", "poc", "vah"];
  const posGrid  = opts.posGrid  || ["any", "below", "above"];     // entry vs the line
  const tpGrid   = opts.tpGrid   || [1, 1.5, 2, 2.5, 3, 4, 5, 6];
  const rows = opts.rows || 120, vaPct = opts.vaPct || 0.70;
  const minTr = Math.max(5, Math.round(cut * 0.03));

  const FORCE_LONG = () => ({ up: 1, down: 0 });
  const FORCE_SHORT = () => ({ up: 0, down: 1 });
  const sum = r => ({ returnPct: r.returnPct, account: r.account, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate, trades: r.trades });

  /* Precompute VP levels per sample per window ONCE (windows are few), so the
     combo sweep just reads signed ATR distances. */
  const prep = withVp.map(s => {
    const lv = {};
    for (const w of winGrid) lv[w] = volumeProfile(s.vpBars.slice(Math.max(0, s.vpBars.length - w)), rows, vaPct);
    return { s, lv, entry: Number(s.entry), atr: Number(s.atr) };
  });
  const prepTrain = prep.slice(0, cut), prepTest = prep.slice(cut);

  /* entry within `prox` ATR of `line`, respecting the below/above filter. d>0 =
     entry ABOVE the line. */
  function inFilter(p, win, line, prox, pos) {
    const L = p.lv[win]; if (!L) return false;
    const px = L[line]; if (!(px > 0)) return false;
    const d = (p.entry - px) / p.atr;
    if (Math.abs(d) > prox) return false;
    if (pos === "below" && d > 0) return false;
    if (pos === "above" && d < 0) return false;
    return true;
  }

  function evalCombo(side, win, line, prox, pos) {
    const forced = side === "long" ? FORCE_LONG : FORCE_SHORT;
    const tr = prepTrain.filter(p => inFilter(p, win, line, prox, pos)).map(p => p.s);
    if (tr.length < minTr) return null;
    let best = null;
    for (const tp of tpGrid) {
      const r = pumpBacktest.run(tr, forced, Object.assign({ slAtr, tpAtr: tp, side }, exitBase));
      if (!best || r.account > best.r.account) best = { tp, r };
    }
    const te = prepTest.filter(p => inFilter(p, win, line, prox, pos)).map(p => p.s);
    const teR = pumpBacktest.run(te, forced, Object.assign({ slAtr, tpAtr: best.tp, side }, exitBase));
    return {
      side, line, vpWin: win, proxAtr: prox, pos, tpAtr: best.tp,
      train: sum(best.r), test: sum(teR), trainN: tr.length, testN: te.length,
      generalizes: teR.trades >= 5 && teR.returnPct > 0
    };
  }

  function searchSide(side) {
    const combos = [];
    for (const win of winGrid) for (const line of lineGrid) for (const prox of proxGrid) for (const pos of posGrid) {
      const c = evalCombo(side, win, line, prox, pos);
      if (c) combos.push(c);
    }
    const scored = combos.slice().sort((a, b) => b.test.returnPct - a.test.returnPct);
    const withTest = scored.filter(c => c.test.trades >= 5);
    const best = withTest[0] || combos.slice().sort((a, b) => b.train.returnPct - a.train.returnPct)[0] || null;
    return { best, top: scored.slice(0, 12), combos: combos.length };
  }

  const nCombos = winGrid.length * lineGrid.length * proxGrid.length * posGrid.length;
  return {
    ready: true, withVp: withVp.length, trainN: cut, testN: withVp.length - cut, slAtr, rows, vaPct,
    combosTested: nCombos * 2,   // long + short
    grids: { win: winGrid, line: lineGrid, prox: proxGrid, pos: posGrid, tp: tpGrid },
    long: searchSide("long"), short: searchSide("short")
  };
}

module.exports = { volumeProfile, vpGridSearch };
