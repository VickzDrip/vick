"use strict";

/* ── DVL RSI-V detector (the "vzinho") ────────────────────────────────────
   Detects the user's entry trigger on the DVL Exhaustion RSI: a little V.
     - GREEN V (long): the RSI value made a local BOTTOM and turned up, with the
       bottom sitting in the exhausted-down zone (≤ lowerZone). "RSI vzin verde".
     - RED V (short): the RSI value made a local TOP and turned down, with the top
       in the exhausted-up zone (≥ upperZone). "RSI vzin vermelho".
   The pivot is at bar i-1; it is only CONFIRMED at bar i once that candle closes
   (value turned back), and the entry is the close of bar i — exactly the user's
   rule "só entro após o vzin ser confirmado com o candle fechado". Uses the real
   DVL Exhaustion RSI (exhaustionRsi.computeSeries); base TF is 1m or 5m with the
   sub-TF ladder resampled from 1m. lowerZone/upperZone are learnable by the
   optimiser (the user "sempre muda" the thresholds). */

const exr = require("./exhaustionRsi");

/* Detect all confirmed V pivots over the base candles. Returns
   [{ index, time, side, rsi, pivotRsi }] where index is the CONFIRMATION bar
   (entry bar), side is "long" (green V) or "short" (red V), rsi is the value at
   the confirmation bar and pivotRsi the value at the pivot bar i-1. */
function detectSignals(baseCandles, oneMin, opts) {
  opts = opts || {};
  const o = Object.assign({}, exr.DEFAULTS, {
    baseTfMin: opts.baseTfMin || 1,
    mtfRsiLen: opts.rsiLen != null ? opts.rsiLen : exr.DEFAULTS.mtfRsiLen,
    mtfPush: opts.push != null ? opts.push : exr.DEFAULTS.mtfPush,
    lowerZone: opts.lowerZone != null ? opts.lowerZone : exr.DEFAULTS.lowerZone,
    upperZone: opts.upperZone != null ? opts.upperZone : exr.DEFAULTS.upperZone
  });
  const series = exr.computeSeries(baseCandles, oneMin, o);
  if (!series || series.length < 3) return [];
  const v = series.map(s => Number(s.value));
  const n = v.length;
  const out = [];
  const seen = new Set();
  /* A V is a local extreme in the value series, ignoring flat plateaus (the
     exhaustion push saturates the RSI to 0/100). For pivot bar j we compare to
     the nearest DIFFERENT value on each side. The confirmation/entry bar is R —
     the first bar whose value turns off the extreme (its candle just closed).
     Deduped by R so a flat bottom/top fires exactly once. */
  for (let j = 1; j < n - 1; j++) {
    const pv = v[j];
    if (!isFinite(pv)) continue;
    let L = j - 1; while (L >= 0 && v[L] === pv) L--;
    let R = j + 1; while (R < n && v[R] === pv) R++;
    if (L < 0 || R >= n) continue;
    // GREEN V (long): bottom in the exhausted-down zone, higher on both sides
    if (pv <= o.lowerZone && v[L] > pv && v[R] > pv) {
      const k = "L" + R;
      if (!seen.has(k)) { seen.add(k); out.push({ index: R, time: series[R].time, side: "long", rsi: v[R], pivotRsi: pv }); }
    }
    // RED V (short): top in the exhausted-up zone, lower on both sides
    if (pv >= o.upperZone && v[L] < pv && v[R] < pv) {
      const k = "S" + R;
      if (!seen.has(k)) { seen.add(k); out.push({ index: R, time: series[R].time, side: "short", rsi: v[R], pivotRsi: pv }); }
    }
  }
  out.sort((a, b) => a.index - b.index);
  return out;
}

/* Convenience: is the LAST closed base candle a confirmed V? Returns the signal
   object or null — for the worker's live per-symbol reading. */
function signalAtLast(baseCandles, oneMin, opts) {
  const sigs = detectSignals(baseCandles, oneMin, opts);
  if (!sigs.length) return null;
  const last = sigs[sigs.length - 1];
  return last.index === baseCandles.length - 1 ? last : null;
}

module.exports = { detectSignals, signalAtLast };
