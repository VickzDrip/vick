"use strict";

/* ── DVL Volume Profile (backend port) + multi-session levels ─────────────
   Faithful port of the frontend's computeVP + value area (index.html), used by
   the new VP+RSI-V adaptive model. Body 70% distributed triangularly peaked at
   the close, wicks 30% uniform; POC = fullest bucket; the value-area expands out
   from the POC picking the fuller neighbour each step → VAH (top) / VAL (bottom).
   Historical candles carry only total volume (no buy/sell split), which the
   levels don't need. Mirrors the chart so the model's lines match what the user
   sees. Adds session slicing (previous UTC day, current day, rolling window) so
   the optimiser can pick which session's VAL/VAH/POC gives the best confluence. */

/* Volume Profile over ascending `bars` ({open,high,low,close,volume}). Returns
   { poc, vah, val, priceMin, priceMax } in PRICE units, or null. */
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

const DAY_MS = 86400000;
function utcDayStart(ts) { return Math.floor(ts / DAY_MS) * DAY_MS; }

/* Slice ascending `bars` into the sessions the user trades against, all ending
   at (and never peeking past) the signal bar time `atTs`:
     - prevDay : the full previous UTC day (a fixed reference profile)
     - today   : current UTC day up to the signal (developing session)
     - window  : the last `winBars` bars up to the signal (rolling)
   Returns { prevDay:[], today:[], window:[] } (any may be empty). */
function sessionSlices(bars, atTs, winBars) {
  const out = { prevDay: [], today: [], window: [] };
  if (!Array.isArray(bars) || !bars.length) return out;
  const upto = bars.filter(b => Number(b.time) <= atTs);
  if (!upto.length) return out;
  const dayStart = utcDayStart(atTs);
  const prevStart = dayStart - DAY_MS;
  for (const b of upto) {
    const t = Number(b.time);
    if (t >= dayStart) out.today.push(b);
    else if (t >= prevStart) out.prevDay.push(b);
  }
  const w = Math.max(20, Math.round(winBars) || 120);
  out.window = upto.slice(-w);
  return out;
}

/* Compute VAL/VAH/POC for every session at a signal. `winBars` sizes the rolling
   window; rows/vaPct match the user's VP config. Returns a map
   { prevDay, today, window } → levels|null. */
function sessionLevels(bars, atTs, opts) {
  opts = opts || {};
  const rows = opts.rows || 120, vaPct = opts.vaPct || 0.70, winBars = opts.winBars || 120;
  const sl = sessionSlices(bars, atTs, winBars);
  return {
    prevDay: sl.prevDay.length >= 5 ? volumeProfile(sl.prevDay, rows, vaPct) : null,
    today: sl.today.length >= 5 ? volumeProfile(sl.today, rows, vaPct) : null,
    window: sl.window.length >= 5 ? volumeProfile(sl.window, rows, vaPct) : null
  };
}

module.exports = { volumeProfile, sessionSlices, sessionLevels, utcDayStart, DAY_MS };
