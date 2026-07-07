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

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(url.split("?")[0] + " -> HTTP " + res.status);
  return res.json();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Data fetch (paginated back DAYS) ─────────────────────────────── */

async function fetchKlines(tf, startMs, endMs) {
  const out = [];
  let from = startMs;
  const step = TF_MS[tf];
  while (from < endMs) {
    const url = "https://fapi.binance.com/fapi/v1/klines?symbol=" + SYMBOL +
      "&interval=" + tf + "&startTime=" + from + "&limit=1500";
    const d = await getJSON(url);
    if (!Array.isArray(d) || !d.length) break;
    for (const k of d) out.push({ t: Number(k[0]), o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });
    const last = Number(d[d.length - 1][0]);
    if (last <= from) break;
    from = last + step;
    if (d.length < 1500) break;
    await sleep(120);
  }
  return out.filter(k => k.t >= startMs && k.t <= endMs);
}

/* Binance futures-data series (openInterestHist / topLongShortAccountRatio)
   at 5m granularity, paginated back DAYS. Returns [{t, v}] sorted asc. */
async function fetchSeries(path, valueKey, startMs, endMs) {
  const out = [];
  let from = startMs;
  const step = 5 * 60000;
  while (from < endMs) {
    const url = "https://fapi.binance.com/futures/data/" + path + "?symbol=" + SYMBOL +
      "&period=5m&startTime=" + from + "&endTime=" + Math.min(from + 500 * step, endMs) + "&limit=500";
    let d;
    try { d = await getJSON(url); } catch (e) { break; }
    if (!Array.isArray(d) || !d.length) break;
    for (const x of d) { const t = Number(x.timestamp), v = Number(x[valueKey]); if (Number.isFinite(t) && Number.isFinite(v)) out.push({ t, v }); }
    const last = Number(d[d.length - 1].timestamp);
    if (last <= from) break;
    from = last + step;
    if (d.length < 500) break;
    await sleep(120);
  }
  out.sort((a, b) => a.t - b.t);
  return out;
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
  const endMs = Date.now();
  const startMs = endMs - DAYS * 86400000;
  const oiSeries = await fetchSeries("openInterestHist", "sumOpenInterest", startMs, endMs);
  const lsrSeries = await fetchSeries("topLongShortAccountRatio", "longShortRatio", startMs, endMs);
  const results = {}, coverage = {};
  for (const tf of TFS) {
    const kl = await fetchKlines(tf, startMs, endMs);
    const rows = buildRows(kl, oiSeries, lsrSeries, tf);
    const usable = rows.filter(Boolean).length;
    coverage[tf] = { candles: kl.length, usable: usable };
    results[tf] = {};
    for (const bot of BOTS) results[tf][bot.id] = simulate(rows, bot.match, EXIT, tf);
  }
  _cache = {
    updatedAt: Date.now(), days: DAYS, symbol: SYMBOL,
    exitLabel: "Stop 1.5x ATR · parcial no +1R → b.e. · resto +2R · timeout 45min",
    bots: BOTS.map(b => ({ id: b.id, label: b.label })),
    coverage: coverage, oiPoints: oiSeries.length, lsrPoints: lsrSeries.length,
    results: results
  };
  console.log("[btcBacktest] done — oi:" + oiSeries.length + " lsr:" + lsrSeries.length +
    " coverage:" + JSON.stringify(coverage));
  return _cache;
}

/* Lazy: kick a run if there's no fresh cache, but always return
   immediately with whatever we have (or a "running" marker) so the HTTP
   request never blocks for the ~1 min a full run takes. */
function get() {
  const fresh = _cache && (Date.now() - _cache.updatedAt) < 6 * 3600000;
  if (!fresh && !_running) {
    _running = true;
    run().catch(e => console.warn("[btcBacktest] run failed:", e && e.message)).finally(() => { _running = false; });
  }
  return { ready: !!_cache, running: _running, data: _cache };
}

module.exports = { get, run, buildRows, simulate, summarize, BOTS, EXIT, TFS };
