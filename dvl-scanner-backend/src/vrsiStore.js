"use strict";

/* ── VP+RSI-V sample store, learner cache and backtest ────────────────────
   Stateless-ish persistence around vrsiModel: the worker feeds it recent base
   candles per (symbol, tf); it logs each RSI-V setup EXACTLY ONCE — only after
   its full forward horizon has closed, so the stored path (and outcome) is
   complete — deduped by symbol|tf|signalTime in an append-only JSONL. Periodically
   it re-runs the adaptive optimiser per TF and caches the learned combos + a full
   financial backtest for the API. No pump-era code. */

const fs = require("fs");
const path = require("path");
const model = require("./vrsiModel");
let cfg = {}; try { cfg = require("./config"); } catch (_) { }
function costModel() { return { feeTakerPerSide: cfg.FEE_TAKER_PER_SIDE, slipAtrPerSide: cfg.SLIP_ATR_PER_SIDE }; }

const LOG_FILE = process.env.DVL_VRSI_LOG_FILE || path.join(process.cwd(), "data", "vrsi-samples.jsonl");
const TFS = ["1m", "5m"];
const HORIZON = { "1m": 60, "5m": 48 };          // forward bars to resolve a trade
const WIN_BARS = { "1m": 120, "5m": 120 };       // rolling VP window
const BASE_MIN = { "1m": 1, "5m": 5 };

let logged = null;                                // Set of dedup keys
const modelCache = { "1m": null, "5m": null };    // last optimize() result per TF
let lastLearn = 0;

function keyOf(symbol, tf, time) { return symbol + "|" + tf + "|" + time; }

function loadKeys() {
  if (logged) return logged;
  logged = new Set();
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); if (o && o.symbol != null) logged.add(keyOf(o.symbol, o.tf, o.time)); } catch (_) { }
    }
  } catch (_) { /* no file yet */ }
  return logged;
}

function append(sample) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(sample) + "\n");
    return true;
  } catch (_) { return false; }
}

/* Detect + log any NEW fully-resolved RSI-V samples for one symbol/tf from its
   recent base candles (+1m ladder). Returns how many new samples were logged. */
function ingest(symbol, tf, baseCandles, oneMin, opts) {
  if (!TFS.includes(tf) || !Array.isArray(baseCandles) || baseCandles.length < 40) return 0;
  const keys = loadKeys();
  const samples = model.buildSamples(baseCandles, oneMin, Object.assign({
    baseTfMin: BASE_MIN[tf], horizon: HORIZON[tf], winBars: WIN_BARS[tf], requireFullHorizon: true, qv: 0
  }, opts || {}));
  let n = 0;
  for (const s of samples) {
    const k = keyOf(symbol, tf, s.time);
    if (keys.has(k)) continue;
    keys.add(k);
    if (append(Object.assign({ symbol, tf }, s))) n++;
  }
  return n;
}

/* Read all stored samples for a TF (parses the JSONL). */
function samplesFor(tf) {
  const out = [];
  let raw = "";
  try { raw = fs.readFileSync(LOG_FILE, "utf8"); } catch (_) { return out; }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); if (o && o.tf === tf) out.push(o); } catch (_) { }
  }
  return out;
}

/* Re-learn every TF (bounded; call at most every ~cooldownMs). */
function learn(opts) {
  opts = opts || {};
  const cooldown = opts.cooldownMs != null ? opts.cooldownMs : 5 * 60 * 1000;
  const now = Date.now();
  if (!opts.force && now - lastLearn < cooldown) return modelCache;
  lastLearn = now;
  for (const tf of TFS) {
    const samples = samplesFor(tf);
    modelCache[tf] = model.optimize(samples, Object.assign({ minSamples: opts.minSamples || 30, cost: costModel() }, opts));
  }
  return modelCache;
}

function getModel(tf) { return modelCache[tf] || null; }

/* Financial backtest of the learned long+short combos for a TF. */
function backtest(tf) {
  const m = modelCache[tf];
  if (!m || !m.ready) return { ready: false };
  const samples = samplesFor(tf);
  const out = { ready: true, tf, long: null, short: null };
  if (m.long && m.long.best) out.long = model.backtestCombo(samples, m.long.best, { cost: costModel() });
  if (m.short && m.short.best) out.short = model.backtestCombo(samples, m.short.best, { cost: costModel() });
  return out;
}

/* Lightweight status for the API/health card. */
function status() {
  const st = { tfs: {}, updatedAt: lastLearn };
  for (const tf of TFS) {
    const m = modelCache[tf];
    const rows = samplesFor(tf);
    const sides = { long: 0, short: 0 };
    for (const s of rows) { if (s && (s.side === "long" || s.side === "short")) sides[s.side]++; }
    st.tfs[tf] = {
      samples: rows.length,
      sides,
      ready: !!(m && m.ready),
      long: m && m.long && m.long.best ? summarize(m.long.best) : null,
      short: m && m.short && m.short.best ? summarize(m.short.best) : null,
      /* diagnóstico: melhor CANDIDATO por lado, mesmo que ainda não generalize —
         mostra por que um lado pode estar "off" (poucas amostras / perde out-of-sample). */
      diag: { long: candidate(m && m.long), short: candidate(m && m.short) }
    };
  }
  return st;
}

/* Best candidate of a side (top by robustness), even if best=null. */
function candidate(sideObj) {
  if (!sideObj) return null;
  const c = (sideObj.top && sideObj.top[0]) || null;
  const out = { combos: sideObj.combos || 0 };
  if (!c) return out;
  return Object.assign(out, {
    generalizes: !!c.generalizes, session: c.session, zone: c.zone, prox: c.prox, slAtr: c.sl,
    rsiThresh: c.rsiThresh, minConf: c.minConf || 1, tp: c.tpMode === "poc" ? "POC" : (c.tpAtr + "×ATR"),
    trainRet: round1(c.train.returnPct), testRet: round1(c.test.returnPct),
    winRate: round1(c.test.winRate), trainTrades: c.train.trades, testTrades: c.test.trades,
    trainN: c.trainN, testN: c.testN
  });
}

function summarize(c) {
  return {
    session: c.session, zone: c.zone, prox: c.prox, slAtr: c.sl, rsiThresh: c.rsiThresh, minConf: c.minConf || 1,
    tp: c.tpMode === "poc" ? "POC" : (c.tpAtr + "×ATR"),
    trainRet: round1(c.train.returnPct), testRet: round1(c.test.returnPct),
    winRate: round1(c.test.winRate), trades: c.test.trades
  };
}
function round1(x) { return Math.round(x * 10) / 10; }

module.exports = { ingest, learn, getModel, backtest, status, samplesFor, TFS, LOG_FILE };
