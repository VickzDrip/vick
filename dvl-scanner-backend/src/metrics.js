"use strict";

/* ── DVL signal metrics — faithful server-side port of the in-page
   scanner formulas (sma / pct / priceMaGlueStats / computeSignal /
   score / status / OI-LSR derivation). Keep these in sync with the
   matching functions in public/index.html so the backend output is
   identical to what the client renders. */

const { ENGINE, WEIGHTS, SCORE_FULL } = require("./config");

function sma(values, period, idx) {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += Number(values[i] || 0);
  return sum / period;
}

function pct(a, b) { if (!b) return 0; return ((a - b) / b) * 100; }

function priceMaGlueStats(closes, period, lookback, tolPct) {
  const len = closes.length;
  period = Math.min(500, Math.max(2, parseInt(period) || 20));
  lookback = Math.min(80, Math.max(1, parseInt(lookback) || 10));
  tolPct = Math.min(10, Math.max(0.01, parseFloat(tolPct) || 0.25));

  const start = Math.max(0, len - lookback);
  let ok = true, valid = 0, maxDist = 0, sumDist = 0;

  for (let i = start; i < len; i++) {
    const ma = sma(closes, period, i);
    const close = Number(closes[i] || 0);
    if (!ma || !Number.isFinite(ma) || !close || !Number.isFinite(close)) { ok = false; continue; }
    const dist = Math.abs((close - ma) / close) * 100;
    valid++; sumDist += dist;
    if (dist > maxDist) maxDist = dist;
    if (dist > tolPct) ok = false;
  }
  if (valid < lookback) ok = false;
  return { ok, valid, maxDist, avgDist: valid ? sumDist / valid : 999, period, lookback, tolPct };
}

/* Port of the in-page computeSignal(). `closes` and `vols` are aligned
   arrays oldest→newest. Returns the canonical row fields. */
function computeSignal(closes, vols, engine) {
  engine = engine || ENGINE;
  const p1 = engine.maPeriod1 || 20;
  const p2 = engine.maPeriod2 || 50;
  const len = vols.length;
  const volMa1 = [], volMa2 = [], priceMa1 = [], priceMa2 = [];
  for (let i = 0; i < len; i++) {
    volMa1.push(sma(vols, p1, i));
    volMa2.push(sma(vols, p2, i));
    priceMa1.push(sma(closes, p1, i));
    priceMa2.push(sma(closes, p2, i));
  }
  const lastVol = vols[len - 1] || 0;
  const lastMa1 = volMa1[len - 1] || (sma(vols, Math.min(p1, len), len - 1) || 1);
  const lastMa2 = volMa2[len - 1] || (sma(vols, Math.min(p2, len), len - 1) || 1);
  const spike1 = lastVol / Math.max(lastMa1, 1e-9);
  const spike2 = lastVol / Math.max(lastMa2, 1e-9);
  const ma1Now = priceMa1[len - 1] || closes[len - 1];
  const ma1Past = priceMa1[Math.max(0, len - p1 - 1)] || priceMa1[len - 2] || ma1Now;
  const ma2Now = priceMa2[len - 1] || closes[len - 1];
  const ma2Past = priceMa2[Math.max(0, len - p1 - 1)] || priceMa2[len - 2] || ma2Now;
  const slope1 = Math.abs(pct(ma1Now, ma1Past));
  const slope2 = Math.abs(pct(ma2Now, ma2Past));
  const flatScore = Math.max(0, 1 - ((slope1 + slope2) / 1.2));
  const lastClose = closes[len - 1] || 0;
  const prevClose = closes[len - 2] || lastClose;
  const side = lastClose >= prevClose ? "LONG" : "SHORT";
  const barPct = prevClose > 0 ? ((lastClose - prevClose) / prevClose) * 100 : 0;
  const prevVol = Number(vols[len - 2] || 0);
  const spikePrevVolRatio = prevVol > 0 ? lastVol / prevVol : 0;
  const priceGlue = priceMaGlueStats(closes, engine.priceGlueMaPeriod, engine.priceGlueLookback, engine.priceGlueMaxDistPct);

  const flatX = engine.flat_x || 10;
  let flatCandles = 0;
  for (let j = len - 2; j >= 0; j--) {
    const mj = volMa1[j];
    if (!mj || !Number.isFinite(mj) || mj <= 0) break;
    if (vols[j] / mj <= flatX) flatCandles++; else break;
  }
  const prevVolBelowHalf = len >= 2 && lastVol > 0 && (vols[len - 2] || 0) < lastVol * 0.5;

  /* MA flatness over the lookback before the last bar — how flat the volume
     MA was during the base ((max-min)/avg). Lower = flatter = cleaner setup. */
  const maFlatLookback = engine.maFlatLookback || 10;
  const maWin = volMa1.slice(Math.max(0, len - 1 - maFlatLookback), len - 1).filter(v => v !== null && Number.isFinite(v) && v > 0);
  let maFlatness1 = 0;
  if (maWin.length > 1) {
    let mn = maWin[0], mx = maWin[0], sum = 0;
    for (const v of maWin) { sum += v; if (v < mn) mn = v; if (v > mx) mx = v; }
    const avg = sum / maWin.length;
    maFlatness1 = avg > 0 ? (mx - mn) / avg : 0;
  }

  /* ── Ignition: dead volume base (below MA) then the first cross above it ──
     The bars before the last must be BELOW their MA (the flat/dead base); the
     current (extrapolated) bar is the first to cross back above the MA. */
  const minBaseBars = engine.minBaseBars || 6;
  let volBelowMaBars = 0;
  for (let bi = len - 2; bi >= 0; bi--) {
    const mb = volMa1[bi];
    if (!mb || !Number.isFinite(mb) || mb <= 0) break;
    if (vols[bi] < mb) volBelowMaBars++; else break;
  }
  const crossStrength = lastMa1 > 0 ? lastVol / lastMa1 : 0;
  const igniteCross = lastVol > lastMa1;
  const isIgnition = igniteCross && volBelowMaBars >= minBaseBars;

  const firstClose24 = closes[0] || lastClose || 0;
  const price24hPct = firstClose24 > 0 ? ((lastClose - firstClose24) / firstClose24) * 100 : 0;

  let rsi14 = 50;
  if (len >= 15) {
    let gain = 0, loss = 0, steps = 0;
    for (let ri = Math.max(1, len - 14); ri < len; ri++) {
      const delta = (closes[ri] || 0) - (closes[ri - 1] || 0);
      if (delta >= 0) gain += delta; else loss += Math.abs(delta);
      steps++;
    }
    const avgGain = steps ? gain / steps : 0, avgLoss = steps ? loss / steps : 0;
    if (avgLoss <= 1e-9) rsi14 = avgGain > 0 ? 100 : 50;
    else rsi14 = 100 - (100 / (1 + (avgGain / avgLoss)));
  }

  return {
    side, lastClose, price24hPct, rsi14,
    last5Closes: closes.slice(-5),
    spike20: spike1, spike50: spike2, flatScore,
    flatCandles, barPct,
    prevVolBelowHalf,
    priceGlueOk: priceGlue.ok,
    spikePrevVolRatio,
    spikePrevVolOk: spikePrevVolRatio >= (engine.spikePrevVolMult || 1.5),
    maFlatness1,
    volBelowMaBars,
    crossStrength,
    isIgnition
  };
}

/* Ignition score — ranks the QUALITY of an early MEXC-pump setup. Rewards a
   long dead base, rising OI, a clean flat MA and compressed price; the size
   of the cross matters only a little (the point is to catch it small/early).
   r must carry oi ("up"/"down"/"flat") set from the real OI trend. */
function ignitionScore(r, weights) {
  const w = weights || require("./config").IGNITION_WEIGHTS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fBase = clamp((Number(r.volBelowMaBars) || 0) / 15, 0, 1);          // full at 15 dead bars
  const fCross = clamp(((Number(r.crossStrength) || 1) - 1) / 1.5, 0, 1);   // full at ~2.5x MA
  const fFlat = clamp(1 - (Number(r.maFlatness1) || 1) / 0.5, 0, 1);        // flatter = better
  const oiUp = r.oi === "up" ? 1 : (r.oi === "flat" ? 0.4 : 0);
  const glue = r.priceGlueOk ? 1 : 0;
  const wTotal = w.base + w.cross + w.flat + w.oi + w.glue;
  if (wTotal <= 0) return 0;
  const pts = fBase * w.base + fCross * w.cross + fFlat * w.flat + oiUp * w.oi + glue * w.glue;
  return Math.max(0, Math.min(99, Math.round(pts / wTotal * 99)));
}

/* Ignition-context status labels (all shown rows are ignitions; this conveys
   strength). */
function ignitionStatus(sc) {
  if (sc >= 72) return "Ignição forte";
  if (sc >= 54) return "Ignição";
  if (sc >= 40) return "Início";
  return "Fraca";
}

/* Port of the fixed (range-normalized) in-page score(). */
function score(r, weights) {
  const w = weights || WEIGHTS;
  const f20 = Math.min(1, Math.max(0, Number(r.spike20) || Number(r.volX) || 0) / SCORE_FULL.spike20);
  const f50 = Math.min(1, Math.max(0, Number(r.spike50) || 0) / SCORE_FULL.spike50);
  const fFlat = Math.min(1, Math.max(0, Number(r.flatCandles) || 0) / SCORE_FULL.flatCandles);
  const fBar = Math.min(1, Math.min(Math.abs(Number(r.barPct) || 0), 8) / SCORE_FULL.barPct);
  const W20 = Number(w.spike20 || 0), W50 = Number(w.spike50 || 0), WF = Number(w.flatCandles || 0),
    WB = Number(w.barPct || 0), WP = Number(w.prevVolBelowHalf || 0), WG = Number(w.priceGlueOk || 0);
  const wTotal = W20 + W50 + WF + WB + WP + WG;
  if (wTotal <= 0) return 0;
  const pts = f20 * W20 + f50 * W50 + fFlat * WF + fBar * WB
    + (r.prevVolBelowHalf ? WP : 0)
    + (r.priceGlueOk ? WG : 0);
  return Math.max(0, Math.min(99, Math.round(pts / wTotal * 99)));
}

/* Port of statusPack1012 (display status from score + flat). */
function statusOf(r, sc) {
  if ((Number(r.flatCandles) || 0) >= 4 && sc >= 74) return "Spike pós-flat";
  if (sc >= 72) return "Spike limpo";
  if (sc >= 54) return "Em formação";
  if (sc >= 44) return "Monitorar";
  return "Sem spike";
}

/* Port of trendPack1012 — derived OI / LSR direction (up/down/flat). */
function oiTrend(r, sc) {
  const side = String(r.side || "").toUpperCase();
  if (side === "LONG" && sc >= 52) return "up";
  if (side === "SHORT" && sc >= 52) return "down";
  return "flat";
}
function lsrTrend(r) {
  const side = String(r.side || "").toUpperCase();
  const bp = Number(r.barPct) || 0;
  if (side === "LONG" && bp > 0.18) return "up";
  if (side === "SHORT" && bp < -0.18) return "down";
  return "flat";
}

/* DVL confluence factors (vt/sz/cs/oi/ls/ex) → "good" | "wait".
   Derived from the same metrics; tune freely. */
function factorsOf(r, sc) {
  const g = (cond) => (cond ? "good" : "wait");
  return {
    vt: g((Number(r.spike20) || 0) >= 1.8),         // volume thrust
    sz: g((Number(r.spike50) || 0) >= 1.5),         // spike size vs slow MA
    cs: g((Number(r.flatCandles) || 0) >= 4),       // consolidation before
    oi: g(oiTrend(r, sc) === "up"),
    ls: g(lsrTrend(r) !== "flat"),
    ex: g(!!r.priceGlueOk)                          // price compression / extension
  };
}

module.exports = {
  sma, pct, priceMaGlueStats, computeSignal,
  score, ignitionScore, statusOf, ignitionStatus, oiTrend, lsrTrend, factorsOf
};
