"use strict";

/* ── Fast Bots 30-day backtest on BTC ──────────────────────────────
   A READ-ONLY companion to the live Fast Bots (frontend). It does NOT
   touch the live paper wallets — it just answers "if these 7 entry
   combos had traded BTC over the last 30 days, how would each have
   done?" on 1m/3m/5m, using REAL history.

   Why 30 days (not a year): the entry combos need OI and LSR direction,
   and Binance's futures-data endpoints (openInterestHist,
   topLongShortAccountRatio) only retain ~30 days of intraday history.
   Price/volume (klines) go back further, but OI/LSR are the wall — so
   30 days is the longest window where all 7 combos can be reconstructed
   from REAL data instead of guessed. All three series here come from
   endpoints the live scanner already uses in production (exchanges.js),
   just paginated back 30 days.

   The 7 combos mirror the frontend's BOTS array (kept in sync by hand —
   they're trivial 2-block ANDs). The EXIT is a single common rule I
   picked so the comparison is about the ENTRY combo, not the exit:
   1.5x-ATR stop, half off at +1R -> breakeven, rest to +2R, 45-min
   timeout. (The live bots each have their OWN exit now; this backtest
   deliberately holds the exit fixed to isolate which entry combo has an
   edge.)

   NOTE on confidence: the fetch endpoints are proven server-side
   (they power the live scanner), but the 30-day PAGINATION here couldn't
   be exercised against live Binance from the sandbox this was written
   in. buildRows() and simulate() ARE covered by an offline test with
   synthetic data. Watch the first real run's log line for the row
   counts / any fetch warning. */

const cfg = require("./config");
const M = require("./metrics");

const SYMBOL = "BTCUSDT";
const DAYS = 30;
const TFS = ["1m", "3m", "5m"];
const TF_MS = { "1m": 60000, "3m": 180000, "5m": 300000 };
const WARMUP = 64;                 // candles of history before the first eligible signal (covers MA50/RSI/ATR)
const RISK_PER_TRADE = 0.01;       // 1% of equity risked per trade, for the compounded return curve

/* Single common exit, applied to every combo (see module doc-comment). */
const EXIT = { atrMult: 1.5, tp1R: 1, tp1Frac: 0.5, be: true, tp2R: 2, holdMin: 45 };

/* Mirror of the frontend's 7 entry combos. Each is a predicate on a row
   carrying .blocks (from metrics.blocksOf) plus .oiSlope. */
const BOTS = [
  { id: "b1", label: "OI acima da média + LSR abaixo da média", match: r => r.blocks.oiAboveAvg && r.blocks.lsrBelowAvg },
  { id: "b2", label: "Pré-volume baixo + OI subindo", match: r => r.blocks.prevVolBelowHalf && r.oiSlope > 0 },
  { id: "b3", label: "Spike acima da média + RSI sobrevenda", match: r => r.blocks.spikeAboveAvg && r.blocks.rsiOversold },
  { id: "b4", label: "OI acima da média + Pré-volume baixo", match: r => r.blocks.oiAboveAvg && r.blocks.prevVolBelowHalf },
  { id: "b5", label: "RSI sobrevenda + OI acima da média", match: r => r.blocks.rsiOversold && r.blocks.oiAboveAvg },
  { id: "b6", label: "RSI sobrevenda + LSR abaixo da média", match: r => r.blocks.rsiOversold && r.blocks.lsrBelowAvg },
  { id: "b7", label: "LSR abaixo da média + Pré-volume baixo", match: r => r.blocks.lsrBelowAvg && r.blocks.prevVolBelowHalf }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Rate-limit aware, and careful NOT to make things worse. This IP is
   shared with the live scanner, so a Binance ban here would hurt the bots
   too — the priority is to never hammer.
     - 429 (rate limit) / 5xx: honour Retry-After (or back off) and retry
       the SAME page, so pages aren't skipped (skipping is what starved the
       5m timeframe to zero).
     - 418 (IP temporarily BANNED after ignoring 429s): do NOT retry — any
       request during a ban extends it. Throw a .banned error so the whole
       run aborts immediately and get() waits a long cooldown for the ban
       to lapse. */
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

async function fetchKlines(tf, startMs, endMs) {
  const out = [];
  let from = startMs, guard = 0;
  const step = TF_MS[tf];
  while (from < endMs && guard++ < 400) {
    const url = "https://fapi.binance.com/fapi/v1/klines?symbol=" + SYMBOL +
      "&interval=" + tf + "&startTime=" + from + "&endTime=" + endMs + "&limit=1500";
    let d;
    try { d = await getJSON(url); } catch (e) { if (e.banned) throw e; _progress.lastError = "klines " + tf + ": " + e.message; from += 1500 * step; continue; }
    if (!Array.isArray(d) || !d.length) { from += 1500 * step; continue; }
    for (const k of d) out.push({ t: Number(k[0]), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });
    const last = Number(d[d.length - 1][0]);
    from = (last > from ? last : from) + step;
    /* Slow on purpose: /fapi/v1/klines is heavily used by the live scanner
       on this same IP, so the backtest's extra klines load has to stay
       negligible or it tips the shared budget into a 418. The run is
       cached, so taking a couple minutes is fine. */
    await sleep(1200);
  }
  return out.filter(k => k.t >= startMs && k.t <= endMs);
}

/* Binance futures-data series (openInterestHist / topLongShortAccountRatio)
   at 5m granularity. Walks fixed windows forward (advancing on empty/error
   instead of stopping — the oldest window can be past Binance's ~30-day
   retention and come back empty, which must NOT abort the whole series).
   Returns de-duplicated [{t, v}] sorted asc. */
async function fetchSeries(path, valueKey, startMs, endMs) {
  const map = new Map();
  const step = 5 * 60000, pageMs = 500 * step;
  for (let from = startMs; from < endMs; from += pageMs) {
    const to = Math.min(from + pageMs, endMs);
    const url = "https://fapi.binance.com/futures/data/" + path + "?symbol=" + SYMBOL +
      "&period=5m&startTime=" + from + "&endTime=" + to + "&limit=500";
    let d;
    try { d = await getJSON(url); } catch (e) { if (e.banned) throw e; _progress.lastError = path + ": " + e.message; continue; }
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
  return rows;
}

/* ── Simulate one combo over the rows ─────────────────────────────── */

/* Pure bar-by-bar LONG-only sim (BTC = single symbol, so at most one open
   position at a time). Intrabar rule is PESSIMISTIC: if a bar's range
   touches both the stop and a target, the stop is assumed hit first, so
   results never overstate. Returns per-trade R-multiples + summary. */
function simulate(rows, matchFn, exit, tf) {
  const holdBars = Math.max(1, Math.round((exit.holdMin || 45) / (TF_MS[tf] / 60000)));
  const cooldownBars = Math.max(1, Math.round(30 / (TF_MS[tf] / 60000)));
  let pos = null, lastCloseIdx = -1e9;
  const trades = [];
  function close(pos, exitPrice, i) {
    const closedFrac = pos.halfTaken ? pos.tp1Frac : 0;
    const totalR = pos.realizedR + (1 - closedFrac) * ((exitPrice - pos.entry) / pos.r);
    trades.push(totalR);
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
      const r = exit.usePct ? c.close * exit.stopPct : c.atr14 * exit.atrMult;
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
  return summarize(trades);
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

async function run() {
  _progress = { phase: "buscando OI", pct: 3, lastError: null, attempts: _progress.attempts + 1, startedAt: Date.now() };
  const endMs = Date.now();
  const startMs = endMs - DAYS * 86400000;
  const oiSeries = await fetchSeries("openInterestHist", "sumOpenInterest", startMs, endMs);
  setProgress("buscando LSR", 18);
  const lsrSeries = await fetchSeries("topLongShortAccountRatio", "longShortRatio", startMs, endMs);
  setProgress("buscando candles", 32);
  /* Fetch timeframes LIGHTEST-first (5m: ~6 pages, 3m: ~10, 1m: ~29). The
     ban trips on the heavy 1m, so doing it LAST means 5m + 3m results are
     already secured — a ban on 1m keeps the partial instead of losing
     everything (the old order did 1m first and lost the whole run). */
  const fetchOrder = ["5m", "3m", "1m"];
  const results = {}, coverage = {};
  let banned = false;
  for (let ti = 0; ti < fetchOrder.length; ti++) {
    const tf = fetchOrder[ti];
    setProgress("candles + simulação " + tf, 32 + (ti + 0.3) * 20);
    let kl;
    try { kl = await fetchKlines(tf, startMs, endMs); }
    catch (e) { if (e.banned) { banned = true; break; } throw e; }
    const rows = buildRows(kl, oiSeries, lsrSeries, tf);
    coverage[tf] = { candles: kl.length, usable: rows.filter(Boolean).length };
    results[tf] = {};
    for (const bot of BOTS) results[tf][bot.id] = simulate(rows, bot.match, EXIT, tf);
    setProgress("candles + simulação " + tf, 32 + (ti + 1) * 20);
  }
  const gotAll = TFS.every(tf => results[tf]);
  _cache = {
    updatedAt: Date.now(), days: DAYS, symbol: SYMBOL,
    exitLabel: "Stop 1.5x ATR · parcial no +1R → b.e. · resto +2R · timeout 45min",
    bots: BOTS.map(b => ({ id: b.id, label: b.label })),
    coverage: coverage, oiPoints: oiSeries.length, lsrPoints: lsrSeries.length,
    results: results, partial: !gotAll
  };
  if (banned && !gotAll) {
    _cache.dataWarning = "A Binance limitou as chamadas (ban de IP) antes de terminar — mostrando os timeframes que deram tempo. Os que faltam entram nas próximas rodadas.";
  } else if (!oiSeries.length || !lsrSeries.length) {
    _cache.dataWarning = "OI/LSR vieram vazios (oi:" + oiSeries.length + " lsr:" + lsrSeries.length + ") — os combos que dependem deles não têm o que avaliar.";
  }
  setProgress(gotAll ? "pronto" : "parcial (ban)", 100);
  console.log("[btcBacktest] done — oi:" + oiSeries.length + " lsr:" + lsrSeries.length +
    " coverage:" + JSON.stringify(coverage) + (banned ? " (BANNED, partial)" : "") + (_progress.lastError ? " lastErr:" + _progress.lastError : ""));
  /* Signal a ban up to get() (for the long cooldown) only if NOTHING new
     was salvaged; if we got at least a fresh timeframe, treat it as a
     normal short-TTL partial that retries in a few minutes for the rest. */
  if (banned && !gotAll && Object.keys(results).length === 0) { const e = new Error("HTTP 418 (IP temporariamente banido pela Binance)"); e.banned = true; throw e; }
  return _cache;
}

/* Lazy: kick a run if there's no fresh cache, but always return
   immediately with whatever we have (or a "running" marker) so the HTTP
   request never blocks for the ~1 min a full run takes. Retries a failed
   run at most once a minute so a persistent Binance failure doesn't hammer
   it every request. */
let _lastAttempt = 0;
let _cooldownUntil = 0;   // don't touch Binance again before this (long after a 418 ban)
function get() {
  /* A good run is fresh for 6h; a run that came back with empty/short data
     (dataWarning) is only "fresh" for 5 min, so a transient Binance hiccup
     doesn't freeze a table of zeros for hours. */
  const ttl = (_cache && _cache.dataWarning) ? 5 * 60000 : 6 * 3600000;
  const fresh = _cache && (Date.now() - _cache.updatedAt) < ttl;
  const now = Date.now();
  if (!fresh && !_running && (now - _lastAttempt) > 60000 && now >= _cooldownUntil) {
    _running = true; _lastAttempt = now;
    run().catch(e => {
      _progress.lastError = e && e.message;
      if (e && e.banned) {
        /* Binance temp-banned the IP (shared with the live scanner) — wait
           20 min before ANY retry so we don't extend the ban or hurt the
           bots. */
        _cooldownUntil = Date.now() + 20 * 60000;
        setProgress("banido — aguardando 20min", _progress.pct);
      } else {
        setProgress("erro", _progress.pct);
      }
      console.warn("[btcBacktest] run failed:", e && e.message);
    }).finally(() => { _running = false; });
  }
  const waitMin = _cooldownUntil > now ? Math.ceil((_cooldownUntil - now) / 60000) : 0;
  return { ready: !!_cache, running: _running, progress: _progress, cooldownMin: waitMin, data: _cache };
}

module.exports = { get, run, buildRows, simulate, summarize, BOTS, EXIT, TFS };
