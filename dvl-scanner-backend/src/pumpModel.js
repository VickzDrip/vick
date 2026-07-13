"use strict";

/* ── DVL pré-pump / pré-short model ─────────────────────────────────
   Learns, per direction, the EXPECTED move after a scanner signal (spike
   pós-flat) — with NO fixed % threshold. The label is the move normalised by
   the asset's own ATR at signal time (so "big" self-scales per asset), and the
   models are REGRESSIONS that predict the magnitude, not yes/no classifiers:

     LONG  model → expected UP move   over the next HORIZON candles, in ATR
     SHORT model → expected DOWN move over the next HORIZON candles, in ATR

   Each move is the max favourable excursion (MFE): how far it ran up (LONG) or
   down (SHORT) within the window — what you could have captured. The scanner
   ranks signals by these predictions.

   Reality: starts empty and only learns as signals fire and RESOLVE (HORIZON
   candles later). Needs a few dozen resolved examples before it predicts at
   all — days/weeks of live scanning. Never invents data. */

const fs = require("fs");
const path = require("path");

const HORIZON = Number(process.env.DVL_PUMP_HORIZON || 20);   // candles ahead
const MIN_SAMPLES = Number(process.env.DVL_PUMP_MIN_SAMPLES || 40);
const DATA_MAX = Number(process.env.DVL_PUMP_DATA_MAX || 6000);
const PENDING_MAX_AGE = HORIZON * 4;                          // drop if window lost
const RIDGE = 1.0;                                            // L2 regularisation
const DATA_FILE = process.env.DVL_PUMP_DATA_FILE || path.join(process.cwd(), "data", "pump-dataset.jsonl");
const MODEL_FILE = process.env.DVL_PUMP_MODEL_FILE || path.join(process.cwd(), "data", "pump-model.json");

/* Fixed feature order — the context around the spike pós-flat. */
const FEATURES = ["volBelowMaBars", "spike20", "crossStrength", "maFlatness1", "rsi14",
  "rsiRecoveryFromLow", "price24hPct", "spikePrevVolRatio", "priceGlueOk", "oiNum", "oiRatio", "lsrNum", "lsrRatio"];

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function pick() { for (let i = 0; i < arguments.length; i++) { const n = Number(arguments[i]); if (Number.isFinite(n)) return n; } return 0; }
function featuresOf(r) {
  r = r || {};
  const oiNum = r.oi === "up" ? 1 : (r.oi === "down" ? -1 : 0);
  const lsrNum = r.lsr === "up" ? 1 : (r.lsr === "down" ? -1 : 0);
  return [
    num(r.volBelowMaBars), num(r.spike20), num(r.crossStrength), num(r.maFlatness1),
    num(r.rsi14), num(r.rsiRecoveryFromLow), pick(r.price24hPct, r.var24h), num(r.spikePrevVolRatio),
    r.priceGlueOk ? 1 : 0, oiNum, num(r.oiRatio), lsrNum, num(r.lsrRatio)
  ];
}

/* ── state ── */
let pending = [];              // [{ sym, tf, t, price, atr, f:[...] }]
let dataset = [];              // [{ f:[...], up, down }]
let model = null;              // { up:{...}, down:{...}, trained, samples, trainedAt }
let _lastTrain = 0;
const seen = new Set();        // dedup key sym|tf|t

/* Record a fired signal (spike pós-flat) awaiting resolution. atr = ATR at the
   signal candle (same TF); price = its close. */
function record(sym, tf, t, price, atr, r) {
  if (!sym || !(Number(price) > 0) || !(Number(atr) > 0)) return false;
  const key = sym + "|" + tf + "|" + t;
  if (seen.has(key)) return false;
  seen.add(key);
  pending.push({ sym: sym, tf: tf, t: Number(t), price: Number(price), atr: Number(atr), f: featuresOf(r) });
  if (pending.length > 20000) pending = pending.slice(-20000);
  return true;
}

/* Resolve any pending signals for this sym/tf using its current OHLC candles
   ([{time,high,low,close}...], ascending). A pending resolves once HORIZON
   candles exist after its signal candle: label = MFE up/down ÷ ATR. */
function resolveWith(sym, tf, ohlc) {
  if (!Array.isArray(ohlc) || ohlc.length < 2) return 0;
  const idxByTime = new Map();
  for (let i = 0; i < ohlc.length; i++) idxByTime.set(Number(ohlc[i].time), i);
  const oldestT = Number(ohlc[0].time);
  let resolved = 0;
  const keep = [];
  for (const p of pending) {
    if (p.sym !== sym || p.tf !== tf) { keep.push(p); continue; }
    const idx = idxByTime.get(p.t);
    if (idx == null) {
      // signal candle no longer in the window → drop if it's older than we can ever see
      if (p.t < oldestT) { seen.delete(sym + "|" + tf + "|" + p.t); continue; }
      keep.push(p); continue;
    }
    const end = idx + HORIZON;
    if (end >= ohlc.length) {
      if (ohlc.length - 1 - idx > PENDING_MAX_AGE) { seen.delete(sym + "|" + tf + "|" + p.t); continue; }
      keep.push(p); continue;   // not enough candles yet
    }
    let maxHigh = -Infinity, minLow = Infinity;
    for (let i = idx + 1; i <= end; i++) {
      const h = Number(ohlc[i].high), l = Number(ohlc[i].low);
      if (Number.isFinite(h) && h > maxHigh) maxHigh = h;
      if (Number.isFinite(l) && l < minLow) minLow = l;
    }
    if (Number.isFinite(maxHigh) && Number.isFinite(minLow) && p.atr > 0) {
      const up = Math.max(0, (maxHigh - p.price) / p.atr);
      const down = Math.max(0, (p.price - minLow) / p.atr);
      dataset.push({ f: p.f, up: up, down: down });
      if (dataset.length > DATA_MAX) dataset.shift();
      resolved++;
    }
    seen.delete(sym + "|" + tf + "|" + p.t);
  }
  pending = keep;
  return resolved;
}

/* Solve (A) x = b for a square matrix A (n×n) via Gaussian elimination with
   partial pivoting. A and b are consumed. */
function gaussianSolve(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-12) continue;
    if (piv !== col) { const tA = A[piv]; A[piv] = A[col]; A[col] = tA; const tb = b[piv]; b[piv] = b[col]; b[col] = tb; }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col] / A[col][col];
      if (!factor) continue;
      for (let c = col; c < n; c++) A[r][c] -= factor * A[col][c];
      b[r] -= factor * b[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) if (Math.abs(A[i][i]) > 1e-12) x[i] = b[i] / A[i][i];
  return x;
}

/* Fit one ridge regression: standardised features + intercept → target. */
function fit(rows, targetKey) {
  const p = FEATURES.length;
  const mean = new Array(p).fill(0), std = new Array(p).fill(0);
  for (const row of rows) for (let j = 0; j < p; j++) mean[j] += row.f[j];
  for (let j = 0; j < p; j++) mean[j] /= rows.length;
  for (const row of rows) for (let j = 0; j < p; j++) { const d = row.f[j] - mean[j]; std[j] += d * d; }
  for (let j = 0; j < p; j++) std[j] = Math.sqrt(std[j] / rows.length) || 1;

  const cols = p + 1; // + intercept
  const XtX = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const Xty = new Array(cols).fill(0);
  for (const row of rows) {
    const xs = new Array(cols);
    for (let j = 0; j < p; j++) xs[j] = (row.f[j] - mean[j]) / std[j];
    xs[p] = 1; // intercept
    const y = num(row[targetKey]);
    for (let a = 0; a < cols; a++) {
      Xty[a] += xs[a] * y;
      for (let b = 0; b < cols; b++) XtX[a][b] += xs[a] * xs[b];
    }
  }
  for (let a = 0; a < p; a++) XtX[a][a] += RIDGE; // don't regularise the intercept
  const w = gaussianSolve(XtX, Xty);

  // training MAE (rough quality read)
  let mae = 0;
  for (const row of rows) {
    let yhat = w[p];
    for (let j = 0; j < p; j++) yhat += w[j] * ((row.f[j] - mean[j]) / std[j]);
    mae += Math.abs(yhat - num(row[targetKey]));
  }
  mae /= rows.length;
  return { w: w, mean: mean, std: std, mae: mae };
}

function maybeTrain(force) {
  const now = Date.now();
  if (!force && now - _lastTrain < 3600000) return model; // hourly
  if (dataset.length < MIN_SAMPLES) { model = model || null; return model; }
  _lastTrain = now;
  const up = fit(dataset, "up");
  const down = fit(dataset, "down");
  model = { up: up, down: down, trained: true, samples: dataset.length, trainedAt: now };
  save();
  return model;
}

function predictVec(f, side) {
  if (!model || !model[side]) return null;
  const m = model[side];
  let y = m.w[FEATURES.length];
  for (let j = 0; j < FEATURES.length; j++) y += m.w[j] * ((f[j] - m.mean[j]) / m.std[j]);
  return Math.max(0, y);
}

/* Predict expected up/down move (in ATR) for a live row. null until trained. */
function predict(r) {
  if (!model || !model.trained) return null;
  const f = featuresOf(r);
  return { up: predictVec(f, "up"), down: predictVec(f, "down") };
}

function status() {
  return {
    horizon: HORIZON, minSamples: MIN_SAMPLES,
    samples: dataset.length, pending: pending.length,
    trained: !!(model && model.trained), trainedAt: model ? model.trainedAt : 0,
    maeUp: model && model.up ? model.up.mae : null,
    maeDown: model && model.down ? model.down.mae : null,
    features: FEATURES
  };
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, dataset.map(d => JSON.stringify(d)).join("\n"));
    if (model) fs.writeFileSync(MODEL_FILE, JSON.stringify(model));
    return true;
  } catch (_) { return false; }
}
function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    dataset = raw.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
      .filter(d => d && Array.isArray(d.f) && d.f.length === FEATURES.length).slice(-DATA_MAX);
  } catch (_) { dataset = []; }
  try { model = JSON.parse(fs.readFileSync(MODEL_FILE, "utf8")); } catch (_) { model = null; }
}

module.exports = { record, resolveWith, maybeTrain, predict, status, save, load, featuresOf, fit, gaussianSolve, FEATURES, HORIZON };
