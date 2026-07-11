"use strict";

/* ── Fast Bots 30-day multi-asset backtest ─────────────────────────
   A READ-ONLY companion to the live Fast Bots (frontend). It does NOT
   touch the live paper wallets — it just answers "if these 7 entry
   combos had traded over the last 30 days, how would each have done?"
   on 15m/30m/1h, using REAL history — POOLED across several assets
   (BTC, ETH, SOL, …) so the edge is measured on a much bigger sample
   than a single coin's one-month regime.

   How the pooling works: each combo is simulated per asset (so each
   asset's equity curve/drawdown is its own), then the results are
   combined — win% and R médio (expectancy) are pooled over EVERY trade
   across all assets (scale-free, the honest comparison), while Retorno
   and Máx. queda are the AVERAGE across the per-asset curves (keeps the
   numbers on the same scale as a single-asset run instead of ballooning
   with the trade count).

   DATA SOURCES (hybrid, on purpose):
     - CANDLES (price/volume) come from MEXC's contract/kline endpoint.
       Binance's own klines endpoint is shared with the live scanner's
       heavy 24h load on this same IP, and the backtest's extra burst
       kept tripping Binance's WAF into an HTTP 418 IP ban — the wall
       that motivated this switch. MEXC's kline API carries none of that
       load, so the candles fetch cleanly. The active TFs (15m/30m/1h) are
       all native MEXC intervals, fetched directly (no aggregation).
     - OI + LSR direction still come from Binance's futures-data
       endpoints (openInterestHist, topLongShortAccountRatio). MEXC's
       public API exposes only the CURRENT open interest (ticker.holdVol)
       with no history, and no long/short ratio at all — so those two
       blocks can't be reconstructed from MEXC. Binance's futures-data
       endpoints, unlike its klines, are light (a handful of calls) and
       finish before any ban can trip, so keeping them there costs
       nothing and keeps all 7 combos alive instead of collapsing to the
       single pure-price/volume combo (Spike+RSI). They're best-effort:
       if Binance is mid-ban, OI/LSR come back empty and only the
       OI/LSR-free combos are scored (surfaced via dataWarning).

   Why 30 days (not a year): Binance's futures-data endpoints only retain
   ~30 days of intraday OI/LSR history — that's the wall for the direction
   blocks, so 30 days is the longest window where all 7 combos can be
   reconstructed from REAL data instead of guessed.

   This run holds the ENTRY fixed (the CONFLUENCE setup — see ENTRY) and
   VARIES the EXIT: the table rows are 5 different TP/SL styles (see EXITS)
   so we can see whether any exit turns the entry profitable net of fees.
   (Earlier runs did the opposite — fixed exit, varied entry combo; the
   entries all washed out to ~0 gross once fees were charged, so the question
   moved to the exit.) The live bots each have their OWN exit; this is
   read-only research.

   NOTE on confidence: the fetch endpoints are proven server-side
   (they power the live scanner), but the 30-day PAGINATION here couldn't
   be exercised against live exchanges from the sandbox this was written
   in. buildRows(), simulate() and aggregate() ARE covered by an offline
   test with synthetic data. Watch the first real run's log line for the
   row counts / any fetch warning. */

const cfg = require("./config");
const M = require("./metrics");

/* Assets to pool the backtest over. Each must exist as a MEXC perp
   (BASE_USDT, for candles) and have Binance futures OI/LSR (BASEUSDT).
   Runtime scales ~linearly with this list — 15 is ~7-8 min of fetches,
   cached 6h. Any asset that comes back empty (missing on either exchange)
   is skipped, not fatal. */
const ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT", "TRX", "BCH", "NEAR", "ATOM"];
const mexcSym = b => b + "_USDT";   // MEXC contract symbol (candles)
const binSym = b => b + "USDT";     // Binance symbol (OI/LSR futures-data)
const DAYS = 30;
const TFS = ["15m", "30m", "1h"];
const TF_MS = { "1m": 60000, "3m": 180000, "5m": 300000, "15m": 900000, "30m": 1800000, "1h": 3600000 };
/* MEXC native kline interval per TF (15m/30m/1h are native — no aggregation
   like 3m needed). */
const MEXC_INTERVAL = { "1m": "Min1", "5m": "Min5", "15m": "Min15", "30m": "Min30", "1h": "Min60" };
const WARMUP = 64;                 // candles of history before the first eligible signal (covers MA50/RSI/ATR)
const RISK_PER_TRADE = 0.01;       // 1% of equity risked per trade, for the compounded return curve

/* Realistic round-trip trading cost (entry + exit), as a fraction of
   notional: ~0.05% per side taker on MEXC/Binance USDT-M perps → ~0.10%
   round trip. Converted to R PER TRADE using that trade's own stop
   distance (fee_in_R = FEE_ROUNDTRIP / stopDistPct), so it bites HARDER on
   the fast timeframes (tighter ATR stops = smaller price move per 1R = the
   fixed % fee eats a bigger share of R). Slippage is NOT included, so this
   is if anything optimistic. */
const FEE_ROUNDTRIP = 0.0010;

/* How many candles back the RSI-oversold "base" still counts as the anchor
   of the sequence (the setup is: RSI went oversold, and within a few candles
   the other confirmations line up). buildRows() sets row.recentRsiOversold. */
const RSI_ANCHOR = 4;

/* The ENTRY is held FIXED while we vary the EXIT. This is the user's real
   setup: NOT a loose 2-block pair, but the full CONFLUENCE — RSI oversold as
   the base (recent), plus pré-volume baixo + OI acima da média + LSR abaixo
   da média all confirming. Much rarer than the pairs we tested before, which
   is the whole point: the pairs were common/noisy (~coin-flip); this asks
   whether the aligned setup has a real edge. */
const ENTRY = {
  id: "seq",
  label: "RSI sobrevenda (base) + Pré-vol baixo + OI acima + LSR abaixo",
  match: r => r.recentRsiOversold && r.blocks.prevVolBelowHalf && r.blocks.oiAboveAvg && r.blocks.lsrBelowAvg
};

/* Five exit styles to compare — these are the TABLE ROWS now. All use params
   the simulator already supports (atrMult/minStopPct, usePct/stopPct/tpPct,
   tp1R/tp1Frac/be, tp2R, trailMult, holdMin). Numbers are all net of fees. */
const EXITS = [
  { id: "e1", label: "Scalp 1:1 · SL 1×ATR · TP +1R",              atrMult: 1,   minStopPct: 0.002, tp2R: 1,                                   holdMin: 480 },
  { id: "e2", label: "1:2 parcial · SL 1.5×ATR · ½+1R→b.e. · +2R",  atrMult: 1.5, minStopPct: 0.003, tp1R: 1,   tp1Frac: 0.5, be: true, tp2R: 2, holdMin: 480 },
  { id: "e3", label: "1:3 corre · SL 2×ATR · ½+1.5R→b.e. · +3R",    atrMult: 2,   minStopPct: 0.003, tp1R: 1.5, tp1Frac: 0.5, be: true, tp2R: 3, holdMin: 720 },
  { id: "e4", label: "Trailing · SL/trail 2×ATR",                   atrMult: 2,   minStopPct: 0.003, trailMult: 2,                              holdMin: 720 },
  { id: "e5", label: "% fixo · SL −1% · TP +2%",                    usePct: true, stopPct: 0.01,     tpPct: 0.02,                               holdMin: 480 }
];

/* (Reference) the entry combos that were compared before the pivot to exits. */
const BOTS = [
  { id: "b5", label: "RSI sobrevenda + OI acima da média", match: r => r.blocks.rsiOversold && r.blocks.oiAboveAvg },
  { id: "b3", label: "Spike acima da média + RSI sobrevenda", match: r => r.blocks.spikeAboveAvg && r.blocks.rsiOversold },
  { id: "b4", label: "OI acima da média + Pré-volume baixo", match: r => r.blocks.oiAboveAvg && r.blocks.prevVolBelowHalf },
  { id: "b2", label: "Pré-volume baixo + OI subindo", match: r => r.blocks.prevVolBelowHalf && r.oiSlope > 0 }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Rate-limit aware, shared by the MEXC candle fetch and the Binance
   OI/LSR fetch. Careful NOT to make a Binance ban worse (that IP is shared
   with the live scanner):
     - 429 (rate limit) / 5xx: honour Retry-After (or back off) and retry
       the SAME page, so pages aren't skipped.
     - 418 (Binance IP temporarily BANNED): do NOT retry — any request
       during a ban extends it. Throw a .banned error; the OI/LSR fetch
       catches it and returns partial/empty (those combos just go no-data),
       while the MEXC candles carry the run regardless. */
async function getJSON(url, tries) {
  tries = tries || 0;
  let res;
  try { res = await fetch(url, { cache: "no-store" }); }
  catch (e) { if (tries < 4) { await sleep(Math.min(20000, 1000 * Math.pow(2, tries))); return getJSON(url, tries + 1); } throw e; }
  if (res.status === 418) { const e = new Error("HTTP 418 (IP temporariamente banido pela Binance)"); e.banned = true; throw e; }
  if ((res.status === 429 || res.status >= 500) && tries < 5) {
    const ra = Number(res.headers.get("retry-after"));
    await sleep(ra > 0 ? Math.min(90000, ra * 1000) : Math.min(30000, 1500 * Math.pow(2, tries)));
    return getJSON(url, tries + 1);
  }
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* Live progress, surfaced to the frontend so the loading bar is real (which
   phase, what %) and a stuck/failed run is visible instead of an eternal
   "calculando…". */
let _progress = { phase: "aguardando", pct: 0, lastError: null, attempts: 0, startedAt: 0 };
function setProgress(phase, pct) { _progress.phase = phase; _progress.pct = Math.round(pct); }

/* ── Data fetch (paginated back DAYS) ─────────────────────────────── */

/* MEXC contract candles (open time in unix SECONDS in the payload; we
   convert to ms to match everything else). One MEXC interval string
   (Min1/Min5/...), paginated forward in windows of `pageCandles`. MEXC's
   public contract API is not the load-shared, ban-prone endpoint Binance's
   klines are, so this can move at a brisk 400ms between pages. Returns
   de-duplicated {t,o,h,l,c,v} sorted asc, clipped to [startMs,endMs]. */
async function fetchMexcKlines(sym, interval, stepMs, startMs, endMs, pRange) {
  const seen = new Set();
  const out = [];
  const endSec = Math.floor(endMs / 1000), startSec = Math.floor(startMs / 1000);
  const stepSec = stepMs / 1000, pageCandles = 1000;
  let from = startSec, guard = 0;
  const span = Math.max(1, endSec - startSec);
  while (from < endSec && guard++ < 400) {
    const to = Math.min(from + pageCandles * stepSec, endSec);
    const url = "https://contract.mexc.com/api/v1/contract/kline/" + sym +
      "?interval=" + interval + "&start=" + from + "&end=" + to;
    let j;
    try { j = await getJSON(url); } catch (e) { _progress.lastError = "mexc kline " + interval + ": " + e.message; from = Math.floor(to) + stepSec; continue; }
    const d = j && j.data;
    const times = (d && d.time) || [];
    if (times.length) {
      const cl = d.close || [], op = d.open || [], hi = d.high || [], lo = d.low || [], vo = d.vol || d.amount || [];
      for (let i = 0; i < times.length; i++) {
        const tsec = Number(times[i]);
        if (!Number.isFinite(tsec) || seen.has(tsec)) continue;
        seen.add(tsec);
        out.push({ t: tsec * 1000, o: +op[i], h: +hi[i], l: +lo[i], c: +cl[i], v: +(vo[i] || 0) });
      }
      const lastSec = Number(times[times.length - 1]);
      from = (lastSec > from ? lastSec : Math.floor(to)) + stepSec;
    } else {
      from = Math.floor(to) + stepSec;
    }
    if (pRange) setProgress("candles MEXC " + interval, pRange[0] + (pRange[1] - pRange[0]) * Math.min(1, (from - startSec) / span));
    await sleep(400);
  }
  out.sort((a, b) => a.t - b.t);
  return out.filter(k => k.t >= startMs && k.t <= endMs);
}

/* Aggregate finer candles into a coarser timeframe, bucketed by clock
   boundary (floor(t/bucketMs)) so it's robust to gaps and never straddles
   a boundary. Assumes input sorted asc, so the last candle in a bucket is
   its close. Used to synthesize a true 3m from MEXC's Min1 (MEXC has no
   native 3m interval). */
function aggregate(klines, bucketMs) {
  const buckets = new Map();
  for (const k of klines) {
    const b = Math.floor(k.t / bucketMs) * bucketMs;
    const g = buckets.get(b);
    if (!g) buckets.set(b, { t: b, o: k.o, h: k.h, l: k.l, c: k.c, v: k.v });
    else { if (k.h > g.h) g.h = k.h; if (k.l < g.l) g.l = k.l; g.c = k.c; g.v += k.v; }
  }
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
}

/* Binance futures-data series (openInterestHist / topLongShortAccountRatio)
   at 5m granularity. Walks fixed windows forward (advancing on empty/error
   instead of stopping — the oldest window can be past Binance's ~30-day
   retention and come back empty, which must NOT abort the whole series).
   Best-effort: if the IP is mid-ban (418), stop early and return whatever
   was gathered so the run continues on the MEXC candles rather than
   aborting — the OI/LSR combos just show up as no-data. Returns
   de-duplicated [{t, v}] sorted asc. */
async function fetchSeries(sym, path, valueKey, startMs, endMs) {
  const map = new Map();
  const step = 5 * 60000, pageMs = 500 * step;
  for (let from = startMs; from < endMs; from += pageMs) {
    const to = Math.min(from + pageMs, endMs);
    const url = "https://fapi.binance.com/futures/data/" + path + "?symbol=" + sym +
      "&period=5m&startTime=" + from + "&endTime=" + to + "&limit=500";
    let d;
    try { d = await getJSON(url); }
    catch (e) {
      if (e.banned) { _progress.lastError = path + ": " + e.message; break; }
      /* HTTP 400 = this window's startTime is outside Binance's ~30-day
         futures-data retention. Expected at the OLDEST edge — and that edge
         drifts out of range as a multi-minute run progresses (later assets
         hit it first). It's non-fatal: the newer in-range windows still
         return data, so skip quietly WITHOUT flagging the whole run as
         errored (which would paint the card red for nothing). */
      if (!/HTTP 400/.test(e.message)) _progress.lastError = path + ": " + e.message;
      continue;
    }
    if (Array.isArray(d)) for (const x of d) { const t = Number(x.timestamp), v = Number(x[valueKey]); if (Number.isFinite(t) && Number.isFinite(v)) map.set(t, v); }
    await sleep(450);
  }
  return Array.from(map.entries()).map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t);
}

/* ── Build per-candle rows with blocks ────────────────────────────── */

/* Pure: turns raw klines + OI series + LSR series into an array of rows,
   one per candle, each carrying metrics.blocksOf(...) and oiSlope. OI/LSR
   are 5m; each candle uses the trailing OI_MA_LEN/LSR points whose
   timestamp is <= that candle's CLOSE time (forward-filled — on 1m/3m the
   OI/LSR blocks only change every 5 min, an unavoidable granularity
   approximation, exact on 5m). */
function buildRows(klines, oiSeries, lsrSeries, tf) {
  const rows = [];
  const closes = klines.map(k => k.c), vols = klines.map(k => k.v);
  const ohlc = klines.map(k => ({ high: k.h, low: k.l, close: k.c }));
  const tfMs = TF_MS[tf];
  const win = WARMUP;
  const oiLen = cfg.OI_MA_LEN || 20, lsrLen = cfg.LSR_MA_LEN || 20;
  let oiPtr = 0, lsrPtr = 0;
  for (let i = 0; i < klines.length; i++) {
    const closeTime = klines[i].t + tfMs;
    while (oiPtr < oiSeries.length && oiSeries[oiPtr].t <= closeTime) oiPtr++;
    while (lsrPtr < lsrSeries.length && lsrSeries[lsrPtr].t <= closeTime) lsrPtr++;
    if (i < win || oiPtr < 2 || lsrPtr < 2) { rows.push(null); continue; }
    const cs = closes.slice(i - win + 1, i + 1), vs = vols.slice(i - win + 1, i + 1);
    const sig = M.computeSignal(cs, vs, cfg.ENGINE);
    const atr14 = M.computeAtr(ohlc.slice(i - win + 1, i + 1), 14);
    const oiT = M.trendVsMA(oiSeries.slice(Math.max(0, oiPtr - oiLen), oiPtr).map(x => x.v));
    const lsrT = M.trendVsMA(lsrSeries.slice(Math.max(0, lsrPtr - lsrLen), lsrPtr).map(x => x.v));
    const row = Object.assign({}, sig, { oi: oiT.arrow, lsr: lsrT.arrow, oiSlope: oiT.slope || 0, atr14: atr14 });
    row.blocks = M.blocksOf(row, cfg.ENGINE);
    row.high = klines[i].h; row.low = klines[i].l; row.close = klines[i].c; row.t = klines[i].t;
    rows.push(row);
  }
  /* Sequence anchor: mark each row where RSI went oversold within the last
     RSI_ANCHOR candles (inclusive). The confluence ENTRY uses this so the
     RSI-oversold "base" doesn't have to be on the exact entry candle — it
     just has to have kicked off the setup a few candles earlier. */
  let sinceOversold = 1e9;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && r.blocks && r.blocks.rsiOversold) sinceOversold = 0;
    else sinceOversold = Math.min(sinceOversold + 1, 1e9);
    if (r) r.recentRsiOversold = sinceOversold <= RSI_ANCHOR;
  }
  return rows;
}

/* ── Simulate one combo over the rows ─────────────────────────────── */

/* simulate() keeps the old contract (returns the summary); simulateTrades()
   exposes the raw per-trade R-multiples so callers can pool them across
   assets before summarizing. */
function simulate(rows, matchFn, exit, tf) {
  return summarize(simulateTrades(rows, matchFn, exit, tf).map(t => t.g));
}

/* Pure bar-by-bar LONG-only sim (one symbol → at most one open position at
   a time). Intrabar rule is PESSIMISTIC: if a bar's range touches both the
   stop and a target, the stop is assumed hit first, so results never
   overstate. Returns the array of per-trade R-multiples (chronological). */
function simulateTrades(rows, matchFn, exit, tf) {
  const holdBars = Math.max(1, Math.round((exit.holdMin || 45) / (TF_MS[tf] / 60000)));
  const cooldownBars = Math.max(1, Math.round(30 / (TF_MS[tf] / 60000)));
  let pos = null, lastCloseIdx = -1e9;
  const trades = [];
  function close(pos, exitPrice, i) {
    const closedFrac = pos.halfTaken ? pos.tp1Frac : 0;
    const totalR = pos.realizedR + (1 - closedFrac) * ((exitPrice - pos.entry) / pos.r);
    /* g = gross R; sd = stop distance as a fraction of entry price. Fees are
       applied downstream as FEE_ROUNDTRIP/sd, so callers can compare gross
       vs net without re-simulating. */
    trades.push({ g: totalR, sd: pos.r / pos.entry });
    lastCloseIdx = i;
  }
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    if (!c) continue;
    if (pos) {
      if (pos.trailMult && pos.atr > 0) { const ts = c.high - pos.trailMult * pos.atr; if (ts > pos.sl) pos.sl = ts; }
      if (c.low <= pos.sl) { close(pos, pos.sl, i); pos = null; }
      else if (pos.tp2 != null && c.high >= pos.tp2) {
        /* Blew past the final target this bar — if the partial hadn't been
           banked yet, the price passed through tp1 first, so bank it en
           route (otherwise the whole position would count at +2R instead
           of the real half-at-1R + half-at-2R = +1.5R). */
        if (pos.tp1 != null && !pos.halfTaken && pos.tp1 < pos.tp2) {
          pos.halfTaken = true;
          pos.realizedR += pos.tp1Frac * ((pos.tp1 - pos.entry) / pos.r);
        }
        close(pos, pos.tp2, i); pos = null;
      }
      else {
        if (pos.tp1 != null && !pos.halfTaken && c.high >= pos.tp1) {
          pos.halfTaken = true;
          pos.realizedR += pos.tp1Frac * ((pos.tp1 - pos.entry) / pos.r);
          if (pos.be) pos.sl = pos.entry;
        }
        if (i - pos.openIdx >= holdBars) { close(pos, c.close, i); pos = null; }
      }
    }
    if (!pos && (i - lastCloseIdx) >= cooldownBars && c.atr14 > 0 && matchFn(c)) {
      let r = exit.usePct ? c.close * exit.stopPct : c.atr14 * exit.atrMult;
      /* Percentage floor: never let the stop be tighter than minStopPct of
         price, so R stays a meaningful move and fees (fee-in-R =
         FEE_ROUNDTRIP/stopDistPct) can't dominate on low-ATR fast TFs. */
      if (exit.minStopPct) r = Math.max(r, c.close * exit.minStopPct);
      if (r > 0) {
        pos = {
          entry: c.close, r: r, sl: c.close - r, atr: c.atr14,
          tp1: exit.tp1R != null ? c.close + r * exit.tp1R : null,
          tp2: exit.tp2R != null ? c.close + r * exit.tp2R : (exit.usePct && exit.tpPct != null ? c.close * (1 + exit.tpPct) : null),
          tp1Frac: exit.tp1Frac || 0.5, be: !!exit.be, trailMult: exit.trailMult || null,
          openIdx: i, halfTaken: false, realizedR: 0
        };
      }
    }
  }
  return trades;
}

function summarize(trades) {
  const n = trades.length;
  if (!n) return { trades: 0, winPct: 0, avgR: 0, totalR: 0, retPct: 0, maxDDPct: 0 };
  let wins = 0, sumR = 0, equity = 1, peak = 1, maxDD = 0;
  for (const R of trades) {
    if (R > 0) wins++;
    sumR += R;
    equity *= (1 + RISK_PER_TRADE * R);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return {
    trades: n,
    winPct: Math.round((wins / n) * 1000) / 10,
    avgR: Math.round((sumR / n) * 1000) / 1000,
    totalR: Math.round(sumR * 100) / 100,
    retPct: Math.round((equity - 1) * 1000) / 10,
    maxDDPct: Math.round(maxDD * 1000) / 10
  };
}

/* ── Orchestration + cache ────────────────────────────────────────── */

let _cache = null;          // { updatedAt, days, exit, results: {tf: {botId: stats}}, coverage }
let _running = false;

function mean(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0; }

async function run() {
  _progress = { phase: "iniciando", pct: 2, lastError: null, attempts: _progress.attempts + 1, startedAt: Date.now() };
  const endMs = Date.now();
  const startMs = endMs - DAYS * 86400000;

  /* Accumulator per timeframe per bot: pooled R-multiples (for win% + avgR)
     and the list of per-asset retPct/maxDD (averaged for scale). */
  /* Accumulator per timeframe per EXIT variant (the rows now): pooled net
     R-multiples (win% + avgR) and per-asset net retPct/maxDD/grossRet. */
  const acc = {}, coverage = {};
  TFS.forEach(tf => {
    acc[tf] = {};
    EXITS.forEach(e => { acc[tf][e.id] = { pooled: [], rets: [], dds: [], grossRets: [], fees: [], assets: 0 }; });
    coverage[tf] = { candles: 0, usable: 0 };
  });
  let oiTot = 0, lsrTot = 0, haveDirAny = false;
  const assetsDone = [];

  for (let si = 0; si < ASSETS.length; si++) {
    const base = ASSETS[si];
    const p0 = 2 + (si / ASSETS.length) * 95, p1 = 2 + ((si + 1) / ASSETS.length) * 95;
    setProgress(base + ": OI/LSR (Binance)", p0);
    /* OI + LSR direction come from Binance's futures-data (MEXC has no
       history for either). Best-effort — fetchSeries returns partial/empty
       on a residual ban rather than throwing, so a run always continues on
       the MEXC candles below. */
    let oiSeries = [], lsrSeries = [];
    try {
      oiSeries = await fetchSeries(binSym(base), "openInterestHist", "sumOpenInterest", startMs, endMs);
      lsrSeries = await fetchSeries(binSym(base), "topLongShortAccountRatio", "longShortRatio", startMs, endMs);
    } catch (e) { _progress.lastError = base + " OI/LSR: " + e.message; }
    oiTot += oiSeries.length; lsrTot += lsrSeries.length;
    if (oiSeries.length >= 2 && lsrSeries.length >= 2) haveDirAny = true;

    /* Candles from MEXC, one native interval per TF (15m/30m/1h all exist
       natively — no aggregation). */
    setProgress(base + ": candles (MEXC)", p0 + (p1 - p0) * 0.15);
    const klinesByTf = {};
    let anyCandles = false;
    const cStart = p0 + (p1 - p0) * 0.15, cEnd = p1;
    for (let ti = 0; ti < TFS.length; ti++) {
      const tf = TFS[ti];
      const a0 = cStart + (cEnd - cStart) * (ti / TFS.length);
      const a1 = cStart + (cEnd - cStart) * ((ti + 1) / TFS.length);
      try { klinesByTf[tf] = await fetchMexcKlines(mexcSym(base), MEXC_INTERVAL[tf], TF_MS[tf], startMs, endMs, [a0, a1]); }
      catch (e) { _progress.lastError = base + " candles " + tf + ": " + e.message; klinesByTf[tf] = []; }
      if (klinesByTf[tf].length) anyCandles = true;
    }
    if (!anyCandles) continue;  // asset unavailable — skip

    for (const tf of TFS) {
      const kl = klinesByTf[tf] || [];
      if (kl.length <= WARMUP) continue;
      const rows = buildRows(kl, oiSeries, lsrSeries, tf);
      coverage[tf].candles += kl.length;
      coverage[tf].usable += rows.filter(Boolean).length;
      /* Fixed ENTRY, five EXIT variants (the rows). Each trade's NET R =
         gross − fee-in-R (FEE_ROUNDTRIP / stop-distance). Gross kept for the
         "sem taxa" comparison; fee kept to show each exit's own fee weight
         (it differs per exit, since the stop differs). */
      for (const ex of EXITS) {
        const tr = simulateTrades(rows, ENTRY.match, ex, tf);
        if (!tr.length) continue;
        const a = acc[tf][ex.id];
        const net = tr.map(t => t.g - FEE_ROUNDTRIP / t.sd);
        const sNet = summarize(net);
        a.pooled = a.pooled.concat(net);
        a.rets.push(sNet.retPct);
        a.dds.push(sNet.maxDDPct);
        a.grossRets.push(summarize(tr.map(t => t.g)).retPct);
        a.fees.push(mean(tr.map(t => FEE_ROUNDTRIP / t.sd)));
        a.assets++;
      }
    }
    assetsDone.push(base);
  }

  /* Combine: win% + avgR pooled over every trade (scale-free), Retorno +
     Máx. queda averaged across the per-asset curves (keeps the scale). */
  const results = {};
  for (const tf of TFS) {
    results[tf] = {};
    for (const ex of EXITS) {
      const a = acc[tf][ex.id];
      const p = summarize(a.pooled);   // pooled is NET R
      results[tf][ex.id] = {
        trades: p.trades, winPct: p.winPct, avgR: p.avgR, totalR: p.totalR,
        retPct: a.rets.length ? Math.round(mean(a.rets) * 10) / 10 : 0,
        maxDDPct: a.dds.length ? Math.round(mean(a.dds) * 10) / 10 : 0,
        grossRetPct: a.grossRets.length ? Math.round(mean(a.grossRets) * 10) / 10 : 0,
        feeR: a.fees.length ? Math.round(mean(a.fees) * 100) / 100 : 0,
        assets: a.assets
      };
    }
  }

  const gotAll = assetsDone.length === ASSETS.length;
  const haveDir = oiTot >= 2 && lsrTot >= 2;
  _cache = {
    updatedAt: Date.now(), days: DAYS, symbol: "Multi", assets: assetsDone,
    candleSource: "MEXC", dirSource: "Binance", feePct: Math.round(FEE_ROUNDTRIP * 1000) / 10,
    entryLabel: ENTRY.label,
    exits: EXITS.map(e => ({ id: e.id, label: e.label })),
    bots: EXITS.map(e => ({ id: e.id, label: e.label })),   // card reads .bots; rows are the exits now
    coverage: coverage, oiPoints: oiTot, lsrPoints: lsrTot,
    results: results, partial: !gotAll
  };
  if (!haveDir) {
    _cache.dataWarning = "OI/LSR da Binance indisponíveis (oi:" + oiTot + " lsr:" + lsrTot +
      ") — provavelmente ban temporário de IP. O setup depende de OI e LSR, então sem eles não dá pra avaliar; assim que a Binance liberar, a próxima rodada preenche.";
  } else if (!gotAll) {
    _cache.dataWarning = "Alguns ativos não vieram completos — mostrando o que deu para calcular (" + assetsDone.join(", ") + ").";
  }
  setProgress(gotAll && haveDir ? "pronto" : "parcial", 100);
  console.log("[btcBacktest] done — assets:" + assetsDone.join(",") + " oi:" + oiTot + " lsr:" + lsrTot +
    " coverage:" + JSON.stringify(coverage) + (_progress.lastError ? " lastErr:" + _progress.lastError : ""));
  return _cache;
}

/* Lazy: kick a run if there's no fresh cache, but always return
   immediately with whatever we have (or a "running" marker) so the HTTP
   request never blocks for the ~1 min a full run takes. Retries a failed
   run at most once a minute so a persistent Binance failure doesn't hammer
   it every request. */
let _lastAttempt = 0;
function get() {
  /* A good run is fresh for 6h; a run that came back with empty/short data
     (dataWarning — e.g. Binance mid-ban so OI/LSR were skipped) is only
     "fresh" for 5 min, so once the ban lapses the full table fills in
     within minutes instead of being frozen for hours. Candles come from
     MEXC now, which doesn't get banned, so run() always completes. */
  const ttl = (_cache && _cache.dataWarning) ? 5 * 60000 : 6 * 3600000;
  const fresh = _cache && (Date.now() - _cache.updatedAt) < ttl;
  const now = Date.now();
  if (!fresh && !_running && (now - _lastAttempt) > 60000) {
    _running = true; _lastAttempt = now;
    run().catch(e => {
      _progress.lastError = e && e.message;
      setProgress("erro", _progress.pct);
      console.warn("[btcBacktest] run failed:", e && e.message);
    }).finally(() => { _running = false; });
  }
  return { ready: !!_cache, running: _running, progress: _progress, cooldownMin: 0, data: _cache };
}

module.exports = { get, run, buildRows, simulate, simulateTrades, summarize, aggregate, ASSETS, BOTS, ENTRY, EXITS, TFS, FEE_ROUNDTRIP };
