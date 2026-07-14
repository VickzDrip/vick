"use strict";

/* ── DVL Exhaustion RSI — faithful backend port ─────────────────────────
   Reproduces exactly the oscillator the chart renders (mtfComputeValues in
   the frontend): a standard RSI of the base-TF closes, PUSHED toward the
   0/100 extremes by an exhaustion score aggregated over a ladder of smaller
   timeframes (equal-ish, faster TF weighs more). The legacy 20-input
   "impulse/absorption" series in the frontend is dead code (computeValues
   returns mtfComputeValues before reaching it), so this is the real thing.

   value[i] = clamp( RSI(closes, rsiLen)[i]
                     + ( upExh[i] - downExh[i] ) * push , 0, 100 )

   Base TF is fixed at 15m for the scanner (per product decision); the ladder
   for 15m is [3,4,5,10,15] minutes, resampled from 1m candles. Zones: a value
   ≥ upperZone = exhausted up (short bias), ≤ lowerZone = exhausted down (long
   bias). All defaults match the chart. */

const DEFAULTS = {
  mtfRsiLen: 14, mtfPush: 18, mtfVolSpikeAt: 2.5, mtfVolMaLen: 20,
  upperZone: 60, lowerZone: 35, baseTfMin: 15
};

const MTF_LADDER = [1, 2, 3, 4, 5, 10, 15, 30, 60];
function mtfLadder(curMin) { return MTF_LADDER.filter(m => m <= curMin).slice(-5); }

/* Cutler's RSI (SMA of gains/losses) — matches the frontend's mtfRsi exactly. */
function mtfRsi(closes, period) {
  const out = new Array(closes.length).fill(50);
  for (let i = period; i < closes.length; i++) {
    let g = 0, l = 0;
    for (let j = i - period + 1; j <= i; j++) { const d = closes[j] - closes[j - 1]; if (d >= 0) g += d; else l -= d; }
    const ag = g / period, al = l / period;
    out[i] = al <= 1e-9 ? (ag > 0 ? 100 : 50) : 100 - 100 / (1 + ag / al);
  }
  return out;
}

/* Per-candle exhaustion score (0..1) for a direction, from volume spike + wick
   + close position vs the prior bar — matches the frontend's mtfExh. */
function mtfExh(cs, idx, dir, volMaLen, volSpikeAt) {
  if (idx < 7) return 0;
  const last = cs[idx];
  const range = last.high - last.low;
  if (range <= 0) return 0;
  const prior = cs[idx - 5] || cs[0];
  const maLen = Math.max(3, Math.round(volMaLen || 20));
  const st = Math.max(0, idx - (maLen - 1));
  let sum = 0, nn = 0;
  for (let j = st; j <= idx; j++) { sum += cs[j].volume; nn++; }
  const avgV = nn ? sum / nn : 1;
  const spikeAt = Math.max(1.05, (volSpikeAt || 2.5));
  const volSpike = Math.max(0, Math.min(1, (last.volume / Math.max(avgV, 1e-9) - 1) / (spikeAt - 1)));
  if (dir === "up") {
    const uw = (last.high - Math.max(last.open, last.close)) / range;
    const weak = 1 - (last.close - last.low) / range;
    return Math.max(0, Math.min(1, (last.close > prior.close ? 1 : 0) * (uw * 0.5 + weak * 0.5) * (0.15 + 0.85 * volSpike)));
  }
  const lw = (Math.min(last.open, last.close) - last.low) / range;
  const strong = (last.close - last.low) / range;
  return Math.max(0, Math.min(1, (last.close < prior.close ? 1 : 0) * (lw * 0.5 + strong * 0.5) * (0.15 + 0.85 * volSpike)));
}

/* Resample 1m candles up to `minutes`-bars (same grouping the frontend uses). */
function resample(one, minutes) {
  const out = [], msv = minutes * 60000;
  for (let i = 0; i < one.length; i += minutes) {
    const g = one.slice(i, i + minutes);
    if (!g.length) break;
    let hi = g[0].high, lo = g[0].low, vol = 0;
    for (let j = 0; j < g.length; j++) { if (g[j].high > hi) hi = g[j].high; if (g[j].low < lo) lo = g[j].low; vol += g[j].volume; }
    out.push({ time: Math.floor(g[0].time / msv) * msv, open: g[0].open, high: hi, low: lo, close: g[g.length - 1].close, volume: vol });
  }
  return out;
}

function idxAt(arr, t) {
  let lo = 0, hi = arr.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].time <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}

/* Compute the full EXR series. `base` = base-TF candles ({time,open,high,low,
   close,volume}, ascending), `one` = 1m candles (or null → no multi-TF push,
   RSI only). Returns [{ time, value, base, push }] where base is the raw RSI
   and push is (upExh-downExh) so callers can re-scale by a different mtfPush
   cheaply. */
function computeSeries(baseCandles, oneMin, opts) {
  const o = Object.assign({}, DEFAULTS, opts || {});
  const rows = Array.isArray(baseCandles) ? baseCandles : [];
  if (!rows.length) return [];
  const closes = rows.map(c => Number(c.close));
  const rsiLen = Math.max(2, Math.round(o.mtfRsiLen));
  const push = Math.max(0, Number(o.mtfPush));
  const baseRsi = mtfRsi(closes, rsiLen);

  let tfData = null;
  const one = Array.isArray(oneMin) && oneMin.length ? oneMin : null;
  if (one) {
    const curMin = Math.max(1, Math.round(o.baseTfMin));
    const tfs = mtfLadder(curMin);
    tfData = tfs.map(tf => {
      const cs = (tf === curMin) ? rows : resample(one, tf);
      const up = cs.map((_, i) => mtfExh(cs, i, "up", o.mtfVolMaLen, o.mtfVolSpikeAt));
      const dn = cs.map((_, i) => mtfExh(cs, i, "down", o.mtfVolMaLen, o.mtfVolSpikeAt));
      return { cs, up, dn };
    });
  }

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    let upN = 0, dnN = 0;
    if (tfData) {
      let us = 0, ds = 0, wsum = 0;
      for (let k = 0; k < tfData.length; k++) {
        const d = tfData[k];
        const ix = idxAt(d.cs, rows[i].time);
        if (ix < 0) continue;
        const w = tfData.length - k;     // faster TF (k=0) weighs more
        us += d.up[ix] * w; ds += d.dn[ix] * w; wsum += w;
      }
      if (wsum > 0) { upN = us / wsum; dnN = ds / wsum; }
    }
    const pushComp = upN - dnN;
    const value = Math.max(0, Math.min(100, baseRsi[i] + pushComp * push));
    out.push({ time: rows[i].time, value, base: baseRsi[i], push: pushComp });
  }
  return out;
}

/* The EXR reading at the LAST closed base candle. Returns {value, base, push,
   zone} where zone is "up" (≥ upper, exhausted up), "down" (≤ lower, exhausted
   down) or "neutral". */
function readingAt(baseCandles, oneMin, opts) {
  const o = Object.assign({}, DEFAULTS, opts || {});
  const s = computeSeries(baseCandles, oneMin, o);
  if (!s.length) return null;
  const last = s[s.length - 1];
  const zone = last.value >= o.upperZone ? "up" : (last.value <= o.lowerZone ? "down" : "neutral");
  return { value: last.value, base: last.base, push: last.push, zone };
}

module.exports = { DEFAULTS, mtfRsi, mtfExh, resample, mtfLadder, computeSeries, readingAt };
