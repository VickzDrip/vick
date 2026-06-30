"use strict";

/* ── DVL 24h Scanner worker ─────────────────────────────────────────
   Runs forever, independent of any connected client. For each exchange
   it polls tickers + klines, computes signals, builds a ready snapshot,
   and emits a change event the server broadcasts over WebSocket. */

const cfg = require("./config");
const { EXCHANGES, binance, mexc, tfToMs } = require("./exchanges");
const M = require("./metrics");

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
  /* Mandatory criterion (same as the in-page scanner): the bar before the
     spike must be below 50% of the spike's volume. */
  if (!sig.prevVolBelowHalf) return null;

  const sc = M.score(sig, cfg.WEIGHTS);
  const spikeAt = trackSpike(exKey, sym, sig.spike20, now);
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

    spikeScore: sc,
    status: M.statusOf(sig, sc),
    spikeAt: spikeAt,

    rsi14: Math.round(sig.rsi14 * 10) / 10,
    /* oi is overwritten with the REAL holdVol trend in scanExchange when
       available; this derived value is only a first-cycle fallback. */
    oi: M.oiTrend(sig, sc),
    oiValue: Number.isFinite(Number(t.oi)) ? Number(t.oi) : null,
    lsr: M.lsrTrend(sig),

    tfOrigin: tfOrigin,
    tfConfirm: cfg.TF_CONFIRM[tfOrigin] || tfOrigin,
    contextTf: cfg.TF_CONTEXT[tfOrigin] || tfOrigin,

    candles: candles,                 // real OHLC only; empty if missing
    last5Closes: sig.last5Closes,

    factors: M.factorsOf(sig, sc)
  };
}

/* Scan one exchange adapter into a row array. Throws on total failure. */
async function scanExchange(adapter) {
  const now = Date.now();
  let cands = await adapter.tickers();
  cands.sort((a, b) => b.qv - a.qv);
  cands = cands.slice(0, cfg.CAND);

  const kl = await mapPool(cands, cfg.POOL, c => adapter.klines(c.sym, cfg.SCAN_TF));
  const freshCut = now - cfg.FRESH_MS;
  const reg = oiReg[adapter.key] || (oiReg[adapter.key] = {});
  const rows = [];
  for (let i = 0; i < cands.length; i++) {
    const k = kl[i];
    if (!k || !k.closes || k.closes.length < 25) continue;
    if (k.lastOpen && k.lastOpen < freshCut) continue;
    const row = buildRow(adapter.key, adapter, cands[i], k, now);
    if (!row) continue;
    /* Real OI trend: this cycle's holdVol vs the previous cycle's. */
    const realOi = oiTrendFrom(reg[cands[i].sym], Number(cands[i].oi));
    if (realOi) row.oi = realOi;
    rows.push(row);
  }
  /* Remember this cycle's OI for every scanned symbol (not only the ones that
     passed the filter) so the trend is available the moment they spike. */
  for (const c of cands) { if (Number.isFinite(Number(c.oi))) reg[c.sym] = Number(c.oi); }
  /* Most recent spike on top (newest spikeAt first); score breaks ties. */
  rows.sort((a, b) => (b.spikeAt - a.spikeAt) || (b.spikeScore - a.spikeScore));
  return rows.slice(0, cfg.SNAPSHOT_ROWS);
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
  /* Compact signature to detect "something relevant changed". */
  return rows.map(r => r.rawSymbol + ":" + r.spikeScore + ":" + r.status + ":" + r.side +
    ":" + r.oi + ":" + r.lsr + ":" + Math.round(r.rsi14)).join("|");
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
  const run = async () => {
    try { await cycle(); } catch (e) { console.warn("[DVL worker] cycle error:", e && e.message); }
  };
  await run();
  _timer = setInterval(run, cfg.REFRESH_MS);
}
function stop() { if (_timer) { clearInterval(_timer); _timer = null; } }

module.exports = { start, stop, cycle, getSnapshot, onChange, scanExchange };
