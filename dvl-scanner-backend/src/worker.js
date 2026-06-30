"use strict";

/* ── DVL 24h Scanner worker ─────────────────────────────────────────
   Runs forever, independent of any connected client. For each exchange
   it polls tickers + klines, computes signals, builds a ready snapshot,
   and emits a change event the server broadcasts over WebSocket. */

const fs = require("fs");
const path = require("path");
const cfg = require("./config");
const { EXCHANGES, binance, mexc, bybit, tfToMs } = require("./exchanges");
const M = require("./metrics");

/* Where the persistent signal registry is mirrored to disk so it survives
   restarts (deploys/reboots). Untracked by git, so `git pull` won't touch it. */
const PERSIST_FILE = process.env.DVL_DATA_FILE || path.join(process.cwd(), "data", "signal-registry.json");

/* concurrency-limited map (mirrors the in-page mapPool). */
async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try { out[i] = await fn(items[i], i); } catch (_) { out[i] = null; }
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

/* Per-exchange spike-age registry: first-seen time per symbol, reset
   only when a new spike is >=25% stronger (mirrors trackSpike). */
const spikeReg = { binance: {}, mexc: {}, };

/* Per-exchange open-interest registry: last cycle's OI (holdVol) per
   symbol, used to compute a REAL OI up/down/flat trend across cycles. */
const oiReg = { binance: {}, mexc: {} };

/* Per-exchange PERSISTENT signal registry: once a symbol ignites it lives
   here (keyed by raw symbol) and is refreshed every cycle until it ages out,
   leaves the feed, or is pushed past the row limit. This is what makes a
   detected signal stay on the list instead of vanishing next cycle. */
const signalReg = { binance: {}, mexc: {} };

function oiTrendFrom(prevOi, curOi) {
  if (!Number.isFinite(curOi) || !Number.isFinite(prevOi) || prevOi <= 0) return null;
  const d = (curOi - prevOi) / prevOi;
  if (d > 0.002) return "up";
  if (d < -0.002) return "down";
  return "flat";
}

function trackSpike(exKey, sym, level, now) {
  const reg = spikeReg[exKey] || (spikeReg[exKey] = {});
  const prev = reg[sym];
  if (!prev || !prev.at || level > (prev.level || 0) * 1.25) {
    reg[sym] = { at: now, level };
  }
  return reg[sym].at;
}

function buildRow(exKey, adapter, t, k, now) {
  const sym = t.sym;
  /* Extrapolate the partial (still-forming) last candle's volume — exactly
     what the in-page scanner does before computeSignal. Without this the
     current candle's volume is tiny, every spike/prevVolBelowHalf check
     fails, and the scan returns 0 rows. */
  const tfMs = tfToMs(cfg.SCAN_TF);
  const extVols = k.vols.slice();
  if (extVols.length > 0 && k.lastOpen && tfMs > 0) {
    const elapsed = Math.max(5000, now - k.lastOpen);
    const fraction = Math.min(1, Math.max(0.05, elapsed / tfMs));
    extVols[extVols.length - 1] = extVols[extVols.length - 1] / fraction;
  }
  const sig = M.computeSignal(k.closes, extVols, cfg.ENGINE);
  /* Build a row for ANY candidate (igniting or not). The signal registry in
     scanExchange decides what enters/stays: a symbol JOINS when it ignites,
     then persists and refreshes here every cycle until it's pushed out by the
     row limit or ages out. */
  const tfOrigin = cfg.SCAN_TF;
  const candles = (k.ohlc || []).slice(-cfg.CANDLES_PER_ROW);

  return {
    symbol: adapter.base(sym) + "USDT",
    rawSymbol: sym,
    base: adapter.base(sym),
    price: sig.lastClose,
    var24h: sig.price24hPct,
    side: sig.side,

    spike20: sig.spike20,
    spike50: sig.spike50,
    flatCandles: sig.flatCandles,
    barPct: sig.barPct,
    prevVolBelowHalf: sig.prevVolBelowHalf,
    priceGlueOk: sig.priceGlueOk,

    /* Ignition fields used by the ignition score. */
    volBelowMaBars: sig.volBelowMaBars,
    crossStrength: Math.round(sig.crossStrength * 100) / 100,
    maFlatness1: sig.maFlatness1,
    isIgnition: sig.isIgnition,

    /* spikeScore/status are finalized in scanExchange once the real OI trend
       is known (OI rising is a core part of the ignition score). spikeAt is
       set from the registry's detection time. */
    spikeScore: 0,
    status: "",
    spikeAt: 0,

    rsi14: Math.round(sig.rsi14 * 10) / 10,
    /* oi is overwritten with the REAL holdVol trend in scanExchange; this
       derived value is only a first-cycle fallback. */
    oi: M.oiTrend(sig, 50),
    oiValue: Number.isFinite(Number(t.oi)) ? Number(t.oi) : null,
    lsr: M.lsrTrend(sig),

    tfOrigin: tfOrigin,
    tfConfirm: cfg.TF_CONFIRM[tfOrigin] || tfOrigin,
    contextTf: cfg.TF_CONTEXT[tfOrigin] || tfOrigin,

    candles: candles,                 // real OHLC only; empty if missing
    last5Closes: sig.last5Closes,

    factors: M.factorsOf(sig, 50)
  };
}

/* Pure registry merge — kept separate so the persistence behaviour can be
   tested without the network. Mutates sigReg in place and returns the
   recency-ordered, capped snapshot rows.
   - a symbol JOINS when cur[sym].isIgnition and it's not already tracked
   - tracked entries are refreshed each cycle with cur[sym] (detection time
     kept); when absent from cur they accrue a "missed" count
   - entries leave on age, prolonged absence, or when pushed past the cap */
function mergeRegistry(sigReg, cur, now) {
  for (const sym in cur) {
    if (cur[sym].isIgnition && !sigReg[sym]) {
      sigReg[sym] = Object.assign({}, cur[sym], { _detectedAt: now, _missed: 0 });
    }
  }
  for (const sym in sigReg) {
    const entry = sigReg[sym];
    if (cur[sym]) {
      const detectedAt = entry._detectedAt;
      Object.assign(entry, cur[sym]);
      entry._detectedAt = detectedAt;
      entry._missed = 0;
    } else {
      entry._missed = (entry._missed || 0) + 1;
    }
    if ((now - entry._detectedAt) > cfg.HIST_MAX_AGE || entry._missed > cfg.MAX_MISSED) {
      delete sigReg[sym];
    }
  }
  let rows = Object.keys(sigReg).map(sym => { sigReg[sym].spikeAt = sigReg[sym]._detectedAt; return sigReg[sym]; });
  rows.sort((a, b) => b._detectedAt - a._detectedAt);
  if (rows.length > cfg.SNAPSHOT_ROWS) {
    const keep = new Set(rows.slice(0, cfg.SNAPSHOT_ROWS).map(r => r.rawSymbol));
    for (const sym in sigReg) { if (!keep.has(sym)) delete sigReg[sym]; }
    rows = rows.slice(0, cfg.SNAPSHOT_ROWS);
  }
  return rows;
}

/* Scan one exchange into a persistent, recency-ordered list of signals.
   A symbol JOINS the list the moment it ignites; once in, it STAYS and is
   refreshed with live data every cycle (price, OI, LSR, score, candles) even
   after the ignition bar has passed — so a detected signal never just
   vanishes. It only leaves when it ages out, disappears from the feed for a
   while, or is pushed past the row limit by newer signals. */
async function scanExchange(adapter) {
  const now = Date.now();
  let cands = await adapter.tickers();
  cands.sort((a, b) => b.qv - a.qv);
  cands = cands.slice(0, cfg.CAND);

  const kl = await mapPool(cands, cfg.POOL, c => adapter.klines(c.sym, cfg.SCAN_TF));
  const freshCut = now - cfg.FRESH_MS;
  const reg = oiReg[adapter.key] || (oiReg[adapter.key] = {});
  const sigReg = signalReg[adapter.key] || (signalReg[adapter.key] = {});

  /* 1) Compute current data for every valid candidate (igniting or not). */
  const cur = {};
  for (let i = 0; i < cands.length; i++) {
    const k = kl[i];
    if (!k || !k.closes || k.closes.length < 25) continue;
    if (k.lastOpen && k.lastOpen < freshCut) continue;
    const row = buildRow(adapter.key, adapter, cands[i], k, now);
    const realOi = oiTrendFrom(reg[cands[i].sym], Number(cands[i].oi));
    if (realOi) row.oi = realOi;
    row.spikeScore = M.ignitionScore(row);
    row.status = M.ignitionStatus(row.spikeScore);
    cur[cands[i].sym] = row;
  }
  /* Remember this cycle's OI for every scanned symbol. */
  for (const c of cands) { if (Number.isFinite(Number(c.oi))) reg[c.sym] = Number(c.oi); }

  /* 2-4) Persist/refresh/rank/evict via the registry. */
  const rows = mergeRegistry(sigReg, cur, now);

  /* 5) Real LSR (Bybit) for the listed signals only. */
  await mapPool(rows, cfg.POOL, async (row) => {
    try {
      const r = await bybit.accountRatio(row.symbol, cfg.SCAN_TF);
      if (r) { row.lsr = r.trend; row.lsrValue = Math.round(r.lsr * 1000) / 1000; }
    } catch (_) { /* not on Bybit / transient — keep derived lsr */ }
  });
  return rows;
}

/* Snapshots, keyed by the exchange the CLIENT asked for. */
const snapshots = {
  binance: emptySnapshot("binance"),
  mexc: emptySnapshot("mexc")
};

function emptySnapshot(exchange) {
  return {
    version: "1.0",
    exchange,
    activeSource: exchange,
    fallback: false,
    updatedAt: 0,
    window: "24h",
    rows: []
  };
}

function rowsSignature(rows) {
  /* Compact signature to detect "something relevant changed" — includes price
     so live refreshes of persisted signals are broadcast too. */
  return rows.map(r => r.rawSymbol + ":" + r.spikeScore + ":" + r.status + ":" + r.side +
    ":" + r.oi + ":" + r.lsr + ":" + Math.round(r.rsi14) + ":" + r.price).join("|");
}

/* ── Registry persistence ── */
function saveRegistry() {
  try {
    fs.mkdirSync(path.dirname(PERSIST_FILE), { recursive: true });
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(signalReg));
  } catch (_) { /* disk issues are non-fatal */ }
}
function loadRegistry() {
  try {
    const obj = JSON.parse(fs.readFileSync(PERSIST_FILE, "utf8"));
    const now = Date.now();
    for (const ex of ["binance", "mexc"]) {
      if (obj[ex] && typeof obj[ex] === "object") {
        for (const sym in obj[ex]) {
          const e = obj[ex][sym];
          if (e && e._detectedAt && (now - e._detectedAt) < cfg.HIST_MAX_AGE) {
            signalReg[ex][sym] = e;
          }
        }
      }
    }
    console.log("[DVL worker] restored signal registry from disk");
  } catch (_) { /* no file yet / unreadable — start fresh */ }
}

let _onChange = () => {};
function onChange(fn) { _onChange = typeof fn === "function" ? fn : _onChange; }

async function cycle() {
  /* Scan MEXC (always reachable) and Binance (may be geo/region blocked). */
  let mexcRows = null, binRows = null;
  try { mexcRows = await scanExchange(mexc); } catch (e) { logErr("mexc", e); }
  try { binRows = await scanExchange(binance); } catch (e) { logErr("binance", e); }

  const now = Date.now();

  /* MEXC snapshot */
  if (mexcRows) updateSnapshot("mexc", { rows: mexcRows, activeSource: "mexc", fallback: false, updatedAt: now });

  /* Binance snapshot — fall back to MEXC data if Binance is unavailable. */
  if (binRows) {
    updateSnapshot("binance", { rows: binRows, activeSource: "binance", fallback: false, updatedAt: now });
  } else if (mexcRows) {
    updateSnapshot("binance", { rows: mexcRows, activeSource: "mexc", fallback: true, updatedAt: now });
  }

  /* Mirror the registry to disk so signals survive restarts. */
  saveRegistry();
}

function updateSnapshot(exchange, patch) {
  const prev = snapshots[exchange];
  const next = Object.assign(emptySnapshot(exchange), patch, { exchange });
  const changed = rowsSignature(prev.rows) !== rowsSignature(next.rows) ||
    prev.activeSource !== next.activeSource || prev.fallback !== next.fallback;
  snapshots[exchange] = next;
  if (changed) _onChange(exchange, next);
}

function logErr(ex, e) {
  console.warn("[DVL worker] " + ex + " scan failed:", (e && e.message) || e);
}

function getSnapshot(exchange) {
  return snapshots[exchange === "mexc" ? "mexc" : "binance"];
}

let _timer = null;
async function start() {
  console.log("[DVL worker] starting 24h scan loop (every " + cfg.REFRESH_MS + "ms)");
  loadRegistry();   // restore persisted signals so a restart doesn't reset the list
  const run = async () => {
    try { await cycle(); } catch (e) { console.warn("[DVL worker] cycle error:", e && e.message); }
  };
  await run();
  _timer = setInterval(run, cfg.REFRESH_MS);
}
function stop() { if (_timer) { clearInterval(_timer); _timer = null; } }

module.exports = { start, stop, cycle, getSnapshot, onChange, scanExchange, mergeRegistry };
