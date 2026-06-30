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
    spikePrevVolOk: spikePrevVolRatio >= (engine.spikePrevVolMult || 1.5)
  };
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
  score, statusOf, oiTrend, lsrTrend, factorsOf
};
