"use strict";

/* ── DVL 24h Scanner worker ─────────────────────────────────────────
   Runs forever, independent of any connected client. For each exchange
   it polls tickers once per cycle (candidates + OI), then scans EVERY
   timeframe in cfg.TF_LIST against that candidate list, computes
   signals, builds a ready snapshot per (exchange, tf), and emits a
   change event the server broadcasts over WebSocket. Keeping every TF
   pre-computed means switching the Filtros "TF detecção" chip on the
   client is instant — no fetch delay. */

const fs = require("fs");
const path = require("path");
const cfg = require("./config");
const { EXCHANGES, binance, mexc, binanceLsr, tfToMs } = require("./exchanges");
const M = require("./metrics");
const outcomes = require("./outcomes");
const train = require("./train");
const backtest = require("./backtest");

/* Where the persistent signal registry is mirrored to disk so it survives
   restarts (deploys/reboots). Untracked by git, so `git pull` won't touch it. */
const PERSIST_FILE = process.env.DVL_DATA_FILE || path.join(process.cwd(), "data", "signal-registry.json");

/* ML groundwork: attempt (re)training at most once/hour; cheap while below
   train.MIN_SAMPLES (just re-reads the log to count lines). */
const TRAIN_INTERVAL_MS = 3600000;
let _lastTrainAttempt = 0;
function emptyModelStatus() {
  return {
    LONG: { trained: false, side: "LONG", samples: 0, needed: train.MIN_SAMPLES }
  };
}
let _modelStatus = emptyModelStatus();

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
   only when a new spike is >=25% stronger (mirrors trackSpike). Currently
   unused by buildRow (spikeAt comes from the signal registry's detection
   time instead) — kept for parity with the in-page tracker. */
const spikeReg = { binance: {}, mexc: {} };

function trackSpike(exKey, sym, level, now) {
  const reg = spikeReg[exKey] || (spikeReg[exKey] = {});
  const prev = reg[sym];
  if (!prev || !prev.at || level > (prev.level || 0) * 1.25) {
    reg[sym] = { at: now, level };
  }
  return reg[sym].at;
}

/* Per-exchange open-interest history: a rolling buffer of OI (holdVol) values
   per symbol (one per cycle) → OI MA for the arrow (value vs MA) and colour
   (MA slope × position). OI is TF-agnostic (one ticker snapshot per cycle),
   so this is tracked once per exchange, not per timeframe. */
const oiBufReg = { binance: {}, mexc: {} };

function pushOi(exKey, sym, value) {
  const reg = oiBufReg[exKey] || (oiBufReg[exKey] = {});
  if (!Number.isFinite(value)) return reg[sym] || [];
  const buf = reg[sym] || (reg[sym] = []);
  buf.push(value);
  if (buf.length > cfg.OI_MA_LEN) buf.shift();
  return buf;
}

/* Per-exchange, per-TF PERSISTENT signal registry: once a symbol ignites on
   a given timeframe it lives here (keyed by raw symbol) and is refreshed
   every cycle until it ages out, leaves the feed, or is pushed past the row
   limit. This is what makes a detected signal stay on the list instead of
   vanishing next cycle. */
const signalReg = { binance: {}, mexc: {} };

function getSigReg(exKey, tf) {
  const byEx = signalReg[exKey] || (signalReg[exKey] = {});
  return byEx[tf] || (byEx[tf] = {});
}

function buildRow(exKey, adapter, t, k, now, tf) {
  const sym = t.sym;
  /* Extrapolate the partial (still-forming) last candle's volume — exactly
     what the in-page scanner does before computeSignal. Without this the
     current candle's volume is tiny, every spike/prevVolBelowHalf check
     fails, and the scan returns 0 rows. */
  const tfMs = tfToMs(tf);
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
  const candles = (k.ohlc || []).slice(-cfg.CANDLES_PER_ROW);
  /* ATR14 off the FULL fetched series (k.ohlc, up to KLIM=80 candles) — not
     the trimmed `candles` above (only CANDLES_PER_ROW=5, kept for the mini-
     chart display). Free: no extra network call, k.ohlc is already fetched
     every cycle for every candidate. Used by outcomes.js's triple-barrier
     resolution (ATR-based stop/target, replacing the old fixed-% one) and
     mirrors the Bot Demo's own client-side ATR (index.html) so the two stay
     comparable. null when there isn't enough history yet. */
  const atr14 = M.computeAtr(k.ohlc || [], 14);

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
    rsiOversoldOk: sig.rsiOversoldOk,
    rsiRecoveryFromLow: sig.rsiRecoveryFromLow,

    /* Ignition fields — kept for the (separate, unused-by-score) ignition
       quality metric and the registry join gate (isIgnition). */
    volBelowMaBars: sig.volBelowMaBars,
    crossStrength: Math.round(sig.crossStrength * 100) / 100,
    maFlatness1: sig.maFlatness1,
    isIgnition: sig.isIgnition,

    /* spikeScore/status/blocks are finalized in scanExchange once the real
       OI/LSR trend is known. spikeAt is set from the registry's detection
       time. */
    spikeScore: 0,
    status: "",
    blocks: null,
    spikeAt: 0,

    rsi14: Math.round(sig.rsi14 * 10) / 10,
    /* oi is overwritten with the REAL holdVol trend right after buildRow();
       this derived value is only a first-cycle fallback. */
    oi: M.oiTrend(sig, 50),
    oiValue: Number.isFinite(Number(t.oi)) ? Number(t.oi) : null,
    lsr: M.lsrTrend(sig),

    tfOrigin: tf,
    tfConfirm: cfg.TF_CONFIRM[tf] || tf,
    contextTf: cfg.TF_CONTEXT[tf] || tf,

    candles: candles,                 // real OHLC only; empty if missing
    last5Closes: sig.last5Closes,
    atr14: atr14,

    factors: M.factorsOf(sig, 50)
  };
}

/* Pure registry merge — kept separate so the persistence behaviour can be
   tested without the network. Mutates sigReg in place and returns the
   recency-ordered, capped snapshot rows.
   - a symbol JOINS when cur[sym].isIgnition, its side is LONG, and it's not
     already tracked — SHORT never joins: the 6 blocks (RSI oversold, OI
     rising, LSR falling...) all encode a bullish thesis, "SHORT" was only
     ever "the last candle closed red" scored against that SAME bullish
     checklist, and the financial backtest confirmed it loses money (see
     src/backtest.js's README section) rather than just being unvalidated.
   - tracked entries are refreshed each cycle with cur[sym] (detection time
     kept); when absent from cur they accrue a "missed" count. Any SHORT
     entry already sitting in a persisted registry (saved to disk before
     this) is purged immediately rather than left to age out naturally.
   - entries leave on age, prolonged absence, or when pushed past the cap */
function mergeRegistry(sigReg, cur, now) {
  for (const sym in cur) {
    if (cur[sym].isIgnition && cur[sym].side === "LONG" && !sigReg[sym]) {
      sigReg[sym] = Object.assign({}, cur[sym], { _detectedAt: now, _missed: 0 });
    }
  }
  for (const sym in sigReg) {
    const entry = sigReg[sym];
    if (entry.side !== "LONG") { delete sigReg[sym]; continue; }
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

/* Once per exchange per cycle: fetch tickers, pick the top-N candidates by
   24h quote volume, and feed the OI rolling buffer (OI is TF-agnostic, so
   this must NOT be repeated per timeframe — that would push the same
   snapshot value up to |TF_LIST| times and skew the MA).
   MEXC's ticker payload already carries OI (holdVol); Binance's doesn't, so
   its candidates need one OI call per symbol, pooled the same way klines
   already are. Without this, pushOi() silently no-ops on every Binance
   candidate (NaN never gets pushed) and every Binance signal's OI arrow/
   ratio/slope is a permanently neutral placeholder — a real gap, not just
   a different data source. */
async function scanCandidatesAndOi(adapter) {
  let cands = await adapter.tickers();
  cands.sort((a, b) => b.qv - a.qv);
  cands = cands.slice(0, cfg.CAND);
  if (adapter.key === "binance" && typeof adapter.openInterest === "function") {
    const ois = await mapPool(cands, cfg.POOL, c => adapter.openInterest(c.sym));
    for (let i = 0; i < cands.length; i++) cands[i].oi = ois[i];
  }
  const oiTrends = {};
  for (const c of cands) {
    const buf = pushOi(adapter.key, c.sym, Number(c.oi));
    oiTrends[c.sym] = M.trendVsMA(buf);
  }
  return { cands, oiTrends };
}

/* Scan one exchange, one timeframe, into a persistent, recency-ordered list
   of signals. A symbol JOINS the list the moment it ignites; once in, it
   STAYS and is refreshed with live data every cycle (price, OI, LSR, score,
   candles) even after the ignition bar has passed — so a detected signal
   never just vanishes. It only leaves when it ages out, disappears from the
   feed for a while, or is pushed past the row limit by newer signals. */
async function scanExchange(adapter, tf, cands, oiTrends, priceMap) {
  const now = Date.now();
  const kl = await mapPool(cands, cfg.POOL, c => adapter.klines(c.sym, tf));
  const freshCut = now - cfg.FRESH_MS;
  const sigReg = getSigReg(adapter.key, tf);

  /* 1) Compute current data for every valid candidate (igniting or not). */
  const cur = {};
  for (let i = 0; i < cands.length; i++) {
    const k = kl[i];
    if (!k || !k.closes || k.closes.length < 25) continue;
    if (k.lastOpen && k.lastOpen < freshCut) continue;
    const row = buildRow(adapter.key, adapter, cands[i], k, now, tf);
    const oiT = oiTrends[cands[i].sym] || { arrow: "up", color: "yellow", ratio: 0, slope: 0 };
    row.oi = oiT.arrow; row.oiColor = oiT.color; row.oiRatio = oiT.ratio || 0; row.oiSlope = oiT.slope || 0;
    cur[cands[i].sym] = row;
    if (priceMap) priceMap[cands[i].sym] = row.price;
  }

  /* Symbols about to freshly JOIN the registry this cycle — captured before
     mergeRegistry mutates sigReg, so this mirrors its own join condition
     exactly (a real detection, not a refresh of an already-tracked row). */
  const freshJoins = [];
  for (const sym in cur) {
    if (cur[sym].isIgnition && cur[sym].side === "LONG" && !sigReg[sym]) freshJoins.push(sym);
  }

  /* 2-4) Persist/refresh/rank/evict via the registry. */
  const rows = mergeRegistry(sigReg, cur, now);

  /* 5) Real LSR (Binance top-trader ratio — same source the in-page chart's
        Long/Short panel uses by default) for the listed signals only —
        arrow vs its MA + colour from the MA slope, same model as OI. Then
        finalize the Spike Score / status / block checklist now that oi +
        lsr are known. */
  await mapPool(rows, cfg.POOL, async (row) => {
    try {
      const r = await binanceLsr.accountRatio(row.symbol, tf, cfg.LSR_MA_LEN);
      if (r && r.series) {
        const t = M.trendVsMA(r.series);
        row.lsr = t.arrow; row.lsrColor = t.color; row.lsrRatio = t.ratio || 0; row.lsrSlope = t.slope || 0;
        row.lsrValue = Math.round(r.lsr * 1000) / 1000;
      }
    } catch (_) { /* not on Binance / transient — keep derived lsr */ }
    row.spikeScore = M.score(row, cfg.WEIGHTS, cfg.ENGINE);
    row.status = M.statusOf(row, row.spikeScore);
    row.blocks = M.blocksOf(row, cfg.ENGINE);
    /* Advisory only — does the LONG model (whichever of logistic/tree tests
       better) call this favorable RIGHT NOW? null (not false) until it
       clears MIN_SAMPLES, same "no opinion yet" convention
       train.predictFavorable documents. Consumed by the Bot Demo
       (index.html) as an extra entry gate alongside the existing score
       threshold — never affects spikeScore/status/blocks themselves.
       Every tracked row is LONG (mergeRegistry never lets SHORT join), so
       there's only ever one model to check. */
    const mlPred = train.predictFavorable(_modelStatus.LONG, row);
    row.mlFavorable = mlPred.favorable;
    row.mlProb = mlPred.prob;
    row.mlBestModel = mlPred.bestModel;
  });

  /* Log the feature snapshot for freshly-joined signals only (ML outcome
     groundwork) — uses the finalized row (real score/blocks, not the
     placeholder set before step 5). Net Long/Short/Delta (metrics.js's
     netFlowTrend) are fetched HERE, per fresh join only — not every cycle
     for every already-tracked row like oi/lsr trend are — because a fresh
     join is rare (a handful of new detections/hour across every TF), while
     tracked rows refresh every cycle; doing this per-cycle-per-row would
     reintroduce the exact Binance rate-limit pressure CAND/REFRESH_MS were
     cut to escape (see config.js). These stay a snapshot captured AT
     DETECTION TIME for the ML pipeline only — they don't feed the live
     score/blocks checklist the user sees, same deliberate-separate-
     decision stance as the rest of the ML groundwork. */
  if (freshJoins.length) {
    const bySym = {};
    for (const row of rows) bySym[row.rawSymbol] = row;
    await mapPool(freshJoins, cfg.POOL, async (sym) => {
      const row = bySym[sym];
      if (!row) return;
      try {
        const [oiSeries, posData] = await Promise.all([
          binance.openInterestHist(sym, tf, cfg.OI_MA_LEN),
          binanceLsr.positionRatio(sym, tf, cfg.OI_MA_LEN)
        ]);
        const netT = M.netFlowTrend(oiSeries, posData && posData.series);
        row.netLongRatio = netT.netLong.ratio || 0;
        row.netLongSlope = netT.netLong.slope || 0;
        row.netShortRatio = netT.netShort.ratio || 0;
        row.netShortSlope = netT.netShort.slope || 0;
        row.netDeltaRatio = netT.netDelta.ratio || 0;
        row.netDeltaSlope = netT.netDelta.slope || 0;
        /* Divergence warning — read-only, NEVER touches spikeScore/status/
           blocks or the ML feature set (see metrics.js's doc-comment on
           netFlowDivergence for why this stays a separate flag). */
        const div = M.netFlowDivergence(row);
        row.divergenceWarning = div.warning;
        row.divergenceCount = div.count;
      } catch (_) { /* leave unset — outcomes.js/train.js default to neutral */ }
    });
    for (const sym of freshJoins) {
      const row = bySym[sym];
      if (row) outcomes.recordSignal(adapter.key, tf, row, now);
    }
  }

  return rows;
}

/* Computes a full row (same shape buildRow/scanExchange produce) fresh, on
   demand, for ANY symbol — not just one the worker is already polling as a
   scan candidate. Always against Binance — the same source the in-page
   chart's own OI/LSR panels use — so results match what the user actually
   looked at. Shared by recordManualTrade (which logs it) and
   computeLiveReading (which just returns it, read-only). `side`/`entryPrice`
   default to the symbol's own current side/last close when not given. */
async function computeFreshRow(symbol, tf, side, entryPrice) {
  const k = await binance.klines(symbol, tf);
  const sig = M.computeSignal(k.closes, k.vols, cfg.ENGINE);

  const [oiSeries, lsrData, posData] = await Promise.all([
    binance.openInterestHist(symbol, tf, cfg.OI_MA_LEN).catch(() => []),
    binanceLsr.accountRatio(symbol, tf, cfg.LSR_MA_LEN).catch(() => null),
    binanceLsr.positionRatio(symbol, tf, cfg.OI_MA_LEN).catch(() => null)
  ]);
  const oiT = M.trendVsMA(oiSeries);
  const lsrT = (lsrData && lsrData.series) ? M.trendVsMA(lsrData.series) : { arrow: "up", color: "yellow", ratio: 0, slope: 0 };
  const netT = M.netFlowTrend(oiSeries, posData && posData.series);

  const row = {
    rawSymbol: symbol, symbol: binance.base(symbol) + "USDT", side: side || sig.side,
    price: Number.isFinite(entryPrice) ? entryPrice : sig.lastClose,
    spike20: sig.spike20, spike50: sig.spike50, flatCandles: sig.flatCandles, barPct: sig.barPct,
    prevVolBelowHalf: sig.prevVolBelowHalf, rsiOversoldOk: sig.rsiOversoldOk, rsiRecoveryFromLow: sig.rsiRecoveryFromLow,
    volBelowMaBars: sig.volBelowMaBars, crossStrength: sig.crossStrength, rsi14: sig.rsi14,
    oi: oiT.arrow, oiColor: oiT.color, oiRatio: oiT.ratio || 0, oiSlope: oiT.slope || 0,
    lsr: lsrT.arrow, lsrColor: lsrT.color, lsrRatio: lsrT.ratio || 0, lsrSlope: lsrT.slope || 0,
    netLongRatio: netT.netLong.ratio || 0, netLongSlope: netT.netLong.slope || 0,
    netShortRatio: netT.netShort.ratio || 0, netShortSlope: netT.netShort.slope || 0,
    netDeltaRatio: netT.netDelta.ratio || 0, netDeltaSlope: netT.netDelta.slope || 0,
    atr14: M.computeAtr(k.ohlc || [], 14)
  };
  row.spikeScore = M.score(row, cfg.WEIGHTS, cfg.ENGINE);
  row.status = M.statusOf(row, row.spikeScore);
  row.blocks = M.blocksOf(row, cfg.ENGINE);
  const div = M.netFlowDivergence(row);
  row.divergenceWarning = div.warning;
  row.divergenceCount = div.count;
  return row;
}

/* Manual trades (the user opening a position by hand in the app, not a
   scanner detection) — logged as ML training examples too, so the outcome
   log isn't limited to what the automated ignition check happens to flag.
   Side-effecting only (logs via outcomes.recordSignal); returns nothing
   worth reporting back beyond success/failure. */
async function recordManualTrade(symbol, side, entryPrice, at) {
  const tf = cfg.SCAN_TF || "15m";
  const row = await computeFreshRow(symbol, tf, side, entryPrice);
  outcomes.recordSignal("binance", tf, row, at, "manual");
}

/* Short-lived cache for computeLiveReading, keyed by "symbol|tf" — the
   in-page app polls this on a timer AND on every symbol change, and each
   call fires 3 fresh Binance requests (klines/OI hist/LSR) with no
   throttling of its own. Multiple open tabs/devices polling the same
   handful of popular symbols at once is exactly the kind of extra load
   that can push the VPS's IP over Binance's rate limit (HTTP 418 = an
   auto-ban, not a bug) on top of what the scanner's own cycle already
   uses. A short TTL keeps the reading "live enough" while collapsing
   near-simultaneous requests for the same symbol into one Binance call. */
const _liveReadingCache = {}; // "symbol|tf" -> { at, promise }
const LIVE_READING_CACHE_MS = 20000;

/* Read-only "how does this look RIGHT NOW" reading for whatever symbol is
   currently open in the app — not gated by the scanner ever having flagged
   it as a signal, and never logged anywhere. This is what powers the
   on-chart live labels (OI subindo/caindo, LSR subindo/caindo, RSI
   recuperando, spike pós-flat) for ANY asset, matching the same reading the
   user already does by eye. */
async function computeLiveReading(symbol, tf) {
  tf = tf || cfg.SCAN_TF || "15m";
  const key = symbol + "|" + tf;
  const cached = _liveReadingCache[key];
  if (cached && (Date.now() - cached.at) < LIVE_READING_CACHE_MS) return cached.promise;

  const promise = computeFreshRow(symbol, tf).catch(e => {
    delete _liveReadingCache[key]; // don't cache a failure — let the next call retry Binance
    throw e;
  });
  _liveReadingCache[key] = { at: Date.now(), promise };
  return promise;
}

/* Snapshots, keyed by [exchange][tf]. */
const snapshots = { binance: {}, mexc: {} };

function emptySnapshot(exchange, tf) {
  return {
    version: "1.0",
    exchange,
    tf: tf || cfg.SCAN_TF,
    activeSource: exchange,
    fallback: false,
    updatedAt: 0,
    window: "24h",
    rows: []
  };
}

function normTf(tf) { return cfg.TF_LIST.indexOf(tf) >= 0 ? tf : cfg.SCAN_TF; }

function rowsSignature(rows) {
  /* Compact signature to detect "something relevant changed" — includes price
     so live refreshes of persisted signals are broadcast too. */
  return rows.map(r => r.rawSymbol + ":" + r.spikeScore + ":" + r.status + ":" + r.side +
    ":" + r.oi + r.oiColor + ":" + r.lsr + r.lsrColor + ":" + Math.round(r.rsi14) + ":" + r.price).join("|");
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
      if (!obj[ex] || typeof obj[ex] !== "object") continue;
      for (const tf of cfg.TF_LIST) {
        if (!obj[ex][tf] || typeof obj[ex][tf] !== "object") continue;
        for (const sym in obj[ex][tf]) {
          const e = obj[ex][tf][sym];
          if (e && e._detectedAt && (now - e._detectedAt) < cfg.HIST_MAX_AGE) {
            getSigReg(ex, tf)[sym] = e;
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
  /* 1) Tickers + OI once per exchange (TF-agnostic). */
  let mexcData = null, binData = null;
  try { mexcData = await scanCandidatesAndOi(mexc); } catch (e) { logErr("mexc", e); }
  try { binData = await scanCandidatesAndOi(binance); } catch (e) { logErr("binance", e); }

  /* Latest known price per symbol this cycle, aggregated across every TF
     scanned (a later TF's price for the same symbol just overwrites the
     earlier one — negligible drift within one cycle). Feeds the outcome
     logger below so it can resolve pending signals' return horizons. */
  const mexcPriceMap = {}, binPriceMap = {};

  /* 2) Scan every timeframe against that candidate list. Sequential (not
     Promise.all across TFs) to keep peak network concurrency bounded to
     cfg.POOL regardless of how many timeframes are configured. */
  for (const tf of cfg.TF_LIST) {
    let mexcRows = null, binRows = null;
    try { if (mexcData) mexcRows = await scanExchange(mexc, tf, mexcData.cands, mexcData.oiTrends, mexcPriceMap); } catch (e) { logErr("mexc:" + tf, e); }
    try { if (binData) binRows = await scanExchange(binance, tf, binData.cands, binData.oiTrends, binPriceMap); } catch (e) { logErr("binance:" + tf, e); }

    const now = Date.now();
    if (mexcRows) updateSnapshot("mexc", tf, { rows: mexcRows, activeSource: "mexc", fallback: false, updatedAt: now });
    if (binRows) {
      updateSnapshot("binance", tf, { rows: binRows, activeSource: "binance", fallback: false, updatedAt: now });
    } else if (mexcRows) {
      updateSnapshot("binance", tf, { rows: mexcRows, activeSource: "mexc", fallback: true, updatedAt: now });
    }
  }

  /* Resolve any pending outcome-log entries whose return horizons elapsed
     (ML groundwork — see outcomes.js). */
  const resolveNow = Date.now();
  outcomes.checkOutcomes("mexc", mexcPriceMap, resolveNow);
  outcomes.checkOutcomes("binance", binPriceMap, resolveNow);

  /* Attempt to (re)train the learned-weights model — cheap no-op below
     MIN_SAMPLES, and self-throttled to at most once/hour otherwise so a
     multi-TF cycle isn't slowed down re-fitting on an unchanged dataset. */
  if (resolveNow - _lastTrainAttempt > TRAIN_INTERVAL_MS) {
    _lastTrainAttempt = resolveNow;
    try { _modelStatus = train.maybeTrain(); } catch (e) { logErr("train", e); }
  }

  /* Mirror the registry to disk so signals survive restarts. */
  saveRegistry();
}

function updateSnapshot(exchange, tf, patch) {
  const prev = getSnapshot(exchange, tf);
  const next = Object.assign(emptySnapshot(exchange, tf), patch, { exchange, tf });
  const changed = rowsSignature(prev.rows) !== rowsSignature(next.rows) ||
    prev.activeSource !== next.activeSource || prev.fallback !== next.fallback;
  const byEx = snapshots[exchange] || (snapshots[exchange] = {});
  byEx[tf] = next;
  if (changed) _onChange(exchange, tf, next);
}

function logErr(ex, e) {
  console.warn("[DVL worker] " + ex + " scan failed:", (e && e.message) || e);
}

function getSnapshot(exchange, tf) {
  const ex = exchange === "mexc" ? "mexc" : "binance";
  const t = normTf(tf);
  const byEx = snapshots[ex] || (snapshots[ex] = {});
  return byEx[t] || (byEx[t] = emptySnapshot(ex, t));
}

/* Apply a runtime Filtros config patch (weights / engine params / OI-LSR MA
   lengths) — takes effect from the NEXT scan cycle onward. This backend
   serves a single user, so "last write wins" globally is an intentional
   simplification rather than per-connection state. */
function setEngineConfig(patch) {
  if (!patch || typeof patch !== "object") return;
  if (patch.engine && typeof patch.engine === "object") Object.assign(cfg.ENGINE, patch.engine);
  if (patch.weights && typeof patch.weights === "object") Object.assign(cfg.WEIGHTS, patch.weights);
  if (Number.isFinite(patch.oiMaLen)) cfg.OI_MA_LEN = Math.max(2, Math.min(200, Math.round(patch.oiMaLen)));
  if (Number.isFinite(patch.lsrMaLen)) cfg.LSR_MA_LEN = Math.max(2, Math.min(200, Math.round(patch.lsrMaLen)));
}

let _timer = null;
let _running = false;
async function start() {
  console.log("[DVL worker] starting 24h scan loop (every " + cfg.REFRESH_MS + "ms, " + cfg.TF_LIST.length + " timeframes)");
  loadRegistry();     // restore persisted signals so a restart doesn't reset the list
  outcomes.loadPending(); // restore pending outcome-log entries (ML groundwork)
  const existingModel = train.loadModel();
  // Ignore a pre-LONG/SHORT-split model file (flat shape) — it has neither
  // key, so falling through to emptyModelStatus() just retrains from
  // scratch on the next cycle instead of crashing on the old shape.
  if (existingModel && (existingModel.LONG || existingModel.SHORT)) _modelStatus = existingModel;
  _running = true;
  const loop = async () => {
    while (_running) {
      const t0 = Date.now();
      try { await cycle(); } catch (e) { console.warn("[DVL worker] cycle error:", e && e.message); }
      if (!_running) break;
      const wait = Math.max(1000, cfg.REFRESH_MS - (Date.now() - t0));
      await new Promise(resolve => { _timer = setTimeout(resolve, wait); });
    }
  };
  loop();
}
function stop() { _running = false; if (_timer) { clearTimeout(_timer); _timer = null; } }

function getOutcomesStats() {
  const stats = outcomes.loadStats();
  stats.model = _modelStatus;
  return stats;
}

function getSymbolHistory(symbol) {
  return outcomes.historyForSymbol(symbol);
}

/* Refitting logistic + tree on the whole log is pure in-memory CPU (no
   network calls), sub-second even at a few thousand examples — but the
   Copilot page polls its status periodically, so a short cache still
   saves refitting on every single poll for an answer that can't have
   changed since the last resolved signal a few minutes ago. */
const BACKTEST_CACHE_MS = 5 * 60000;
let _backtestCache = null; // { at, result }
function getBacktestStats() {
  const now = Date.now();
  if (_backtestCache && (now - _backtestCache.at) < BACKTEST_CACHE_MS) return _backtestCache.result;
  const result = backtest.backtest();
  _backtestCache = { at: now, result };
  return result;
}

module.exports = { start, stop, cycle, getSnapshot, onChange, scanExchange, mergeRegistry, setEngineConfig, getOutcomesStats, recordManualTrade, getSymbolHistory, computeLiveReading, getBacktestStats };
