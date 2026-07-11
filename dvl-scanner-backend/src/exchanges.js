"use strict";

/* ── Exchange adapters (server-side) ───────────────────────────────
   Run on the server, so there is NO browser CORS limit: we call
   Binance fapi and MEXC contract API directly (no /mexc-proxy needed).
   Each adapter returns normalized { tickers() } and { klines(sym) }. */

const { KLIM, MEXC_TF } = require("./config");

const TF_MS = {
  "1m": 60000, "3m": 180000, "5m": 300000, "15m": 900000,
  "30m": 1800000, "1h": 3600000, "4h": 14400000, "1d": 86400000
};
function tfToMs(tf) { return TF_MS[tf] || 900000; }

async function getJSON(url, opts) {
  const res = await fetch(url, Object.assign({ cache: "no-store" }, opts || {}));
  if (!res.ok) throw new Error(url.split("?")[0] + " -> HTTP " + res.status);
  return res.json();
}

const binance = {
  key: "binance",
  label: "Binance",
  async tickers() {
    const d = await getJSON("https://fapi.binance.com/fapi/v1/ticker/24hr");
    if (!Array.isArray(d)) throw new Error("binance ticker shape");
    return d.filter(t => {
      const s = (t && t.symbol) || "";
      return /USDT$/.test(s) && s.indexOf("_") < 0 && Number(t.quoteVolume) > 0;
    }).map(t => ({ sym: t.symbol, qv: Number(t.quoteVolume) }));
  },
  async klines(sym, tf) {
    const url = "https://fapi.binance.com/fapi/v1/klines?symbol=" + encodeURIComponent(sym) +
      "&interval=" + encodeURIComponent(tf) + "&limit=" + KLIM;
    const d = await getJSON(url);
    if (!Array.isArray(d) || d.length < 25) throw new Error("binance kl short " + sym);
    const closes = [], vols = [], ohlc = [];
    for (let i = 0; i < d.length; i++) {
      closes.push(Number(d[i][4]));
      vols.push(Number(d[i][5]));
      ohlc.push({ time: Number(d[i][0]), open: +d[i][1], high: +d[i][2], low: +d[i][3], close: +d[i][4], volume: +d[i][5] });
    }
    return { closes, vols, ohlc, lastOpen: Number(d[d.length - 1][0]) || 0 };
  },
  /* Current open interest for one symbol. Unlike MEXC (whose ticker payload
     already carries holdVol), Binance's 24hr ticker has no OI field — this
     needs its own call per symbol, unavoidably (Binance has no bulk/all-
     symbols OI endpoint). Returns null (not 0) on any miss so callers can
     tell "no data" apart from "genuinely zero". */
  async openInterest(sym) {
    try {
      const d = await getJSON("https://fapi.binance.com/fapi/v1/openInterest?symbol=" + encodeURIComponent(sym));
      const v = Number(d && d.openInterest);
      return Number.isFinite(v) ? v : null;
    } catch (_) { return null; }
  },
  /* Historical OI series (oldest→newest) for one symbol, on demand — used
     for the manual-trade logger (outcomes.js), which can't rely on the
     worker's own rolling OI buffer (that only accumulates for symbols the
     scanner is already actively polling as a candidate). Same endpoint the
     in-page chart's OI panel uses by default. Returns [] on any miss. */
  async openInterestHist(sym, period, limit) {
    try {
      const url = "https://fapi.binance.com/futures/data/openInterestHist?symbol=" +
        encodeURIComponent(sym) + "&period=" + encodeURIComponent(period || "15m") + "&limit=" + (limit || 20);
      const d = await getJSON(url);
      if (!Array.isArray(d)) return [];
      return d.map(x => Number(x.sumOpenInterest)).filter(Number.isFinite);
    } catch (_) { return []; }
  },
  base(sym) { return String(sym).replace(/USDT$/, ""); }
};

const mexc = {
  key: "mexc",
  label: "MEXC",
  async tickers() {
    const j = await getJSON("https://contract.mexc.com/api/v1/contract/ticker");
    const d = (j && j.data) || [];
    if (!Array.isArray(d)) throw new Error("mexc ticker shape");
    return d.filter(t => {
      const s = (t && t.symbol) || "";
      return /_USDT$/.test(s) && Number(t.amount24) > 0;
    }).map(t => ({ sym: t.symbol, qv: Number(t.amount24), oi: Number(t.holdVol), fr: Number(t.fundingRate) }));
  },
  async klines(sym, tf) {
    const mexcTf = MEXC_TF[tf] || "Min15";
    const start = Math.floor(Date.now() / 1000) - KLIM * (tfToMs(tf) / 1000);
    const url = "https://contract.mexc.com/api/v1/contract/kline/" + encodeURIComponent(sym) +
      "?interval=" + mexcTf + "&start=" + start;
    const j = await getJSON(url);
    const d = (j && j.data) || null;
    if (!d || !d.close || d.close.length < 25) throw new Error("mexc kl short " + sym);
    const closes = d.close.map(Number);
    const vols = (d.vol || d.amount || []).map(Number);
    const times = d.time || [];
    const opens = d.open || [], highs = d.high || [], lows = d.low || [];
    const ohlc = closes.map((c, i) => ({
      time: (Number(times[i]) || 0) * 1000,
      open: Number(opens[i] || c), high: Number(highs[i] || c),
      low: Number(lows[i] || c), close: c, volume: Number(vols[i] || 0)
    }));
    return { closes, vols, ohlc, lastOpen: (Number(times[times.length - 1]) || 0) * 1000 };
  },
  base(sym) { return String(sym).replace(/_USDT$/, ""); },
  /* PRIMARY chart candle source: raw OHLCV for one MEXC symbol, returned
     already shaped as Binance-style kline rows so the in-page chart consumes
     it as a drop-in. The chart calls this first for every asset (MEXC lists
     ~everything and the browser can't reach contract.mexc.com directly, so it
     proxies through the backend); Binance is only a fallback for the rare
     MEXC-missing symbol. Unlike klines() above — which the scanner caps at
     KLIM (80) candles — this serves a full charting window (`limit`).

     Any timeframe is supported: MEXC's native candle set is Min1/Min5/Min15/
     Min30/Min60/Hour4/Hour8/Day1, so for a TF MEXC has no native candle for
     (e.g. 3m, 2h, 12h, 1w) we fetch the largest native that divides it evenly
     and aggregate server-side. Only sub-minute (seconds) TFs aren't offered
     (chart keeps Binance aggTrades for those). */
  async klinesChart(sym, tf, limit) {
    const MEXC_NATIVE = [
      ["Min1", 60000], ["Min5", 300000], ["Min15", 900000], ["Min30", 1800000],
      ["Min60", 3600000], ["Hour4", 14400000], ["Hour8", 28800000], ["Day1", 86400000]
    ];
    const m = String(tf).match(/^(\d+)([smhdw])$/);
    if (!m) throw new Error("mexc chart tf invalid: " + tf);
    const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[m[2]];
    const tfMs = Number(m[1]) * unitMs;
    if (tfMs < 60000) throw new Error("mexc chart tf sub-minute: " + tf); // seconds → Binance only
    // Largest native interval that divides the requested TF evenly.
    let base = null;
    for (let i = MEXC_NATIVE.length - 1; i >= 0; i--) {
      if (tfMs % MEXC_NATIVE[i][1] === 0) { base = MEXC_NATIVE[i]; break; }
    }
    if (!base) base = MEXC_NATIVE[0]; // fall back to Min1
    const factor = Math.max(1, Math.round(tfMs / base[1]));
    const n = Math.max(25, Math.min(1500, Number(limit) || 500));
    const baseCount = n * factor;
    const start = Math.floor(Date.now() / 1000) - baseCount * (base[1] / 1000);
    const url = "https://contract.mexc.com/api/v1/contract/kline/" + encodeURIComponent(sym) +
      "?interval=" + base[0] + "&start=" + start;
    const j = await getJSON(url);
    const d = (j && j.data) || null;
    if (!d || !d.time || !d.close || d.close.length < 2) throw new Error("mexc chart kl empty " + sym);

    // Native base rows as Binance-shaped arrays.
    const baseRows = [];
    for (let i = 0; i < d.time.length; i++) {
      const openMs = (Number(d.time[i]) || 0) * 1000;
      const c = Number(d.close[i]);
      baseRows.push([
        openMs,
        Number(d.open ? d.open[i] : c), Number(d.high ? d.high[i] : c),
        Number(d.low ? d.low[i] : c), c,
        Number(d.vol ? d.vol[i] : 0),           // base volume (contracts)
        openMs + base[1] - 1,                     // close time
        Number(d.amount ? d.amount[i] : 0)        // quote volume (USDT turnover)
      ]);
    }

    // Aggregate base candles into the requested TF's buckets when needed.
    const src = factor === 1 ? baseRows : (() => {
      const buckets = new Map();
      for (const r of baseRows) {
        const bt = Math.floor(r[0] / tfMs) * tfMs;
        let b = buckets.get(bt);
        if (!b) { b = [bt, r[1], r[2], r[3], r[4], r[5], bt + tfMs - 1, r[7]]; buckets.set(bt, b); }
        else { if (r[2] > b[2]) b[2] = r[2]; if (r[3] < b[3]) b[3] = r[3]; b[4] = r[4]; b[5] += r[5]; b[7] += r[7]; }
      }
      return Array.from(buckets.values()).sort((a, b2) => a[0] - b2[0]);
    })();

    // Stringify OHLCV to match Binance's REST shape; pad taker-buy fields
    // (unknown on MEXC) so downstream index access never breaks.
    return src.map(r => [
      r[0], String(r[1]), String(r[2]), String(r[3]), String(r[4]),
      String(r[5]), r[6], String(r[7]), 0, "0", "0", "0"
    ]);
  },
  /* Fresh (uncached) last-price map for every MEXC USDT perpetual, in one
     batched call — used by the frontend's Fast Bots (Bot 4) to price its
     open MEXC positions for stop/target checks, which need live data, not
     the once-per-cycle candidate cache getCandidates() exposes. */
  async prices() {
    const j = await getJSON("https://contract.mexc.com/api/v1/contract/ticker");
    const d = (j && j.data) || [];
    if (!Array.isArray(d)) throw new Error("mexc ticker shape");
    const map = {};
    d.forEach(t => { if (t && t.symbol) map[t.symbol] = Number(t.lastPrice); });
    return map;
  }
};

/* Binance Top Trader Long/Short ACCOUNT ratio — this is what the in-page
   chart's Long/Short panel actually uses by default ("BINANCE TOP" in its
   own label), not Bybit. Used only as the LSR data source (applied to every
   scanned row regardless of which exchange it was detected on, same as the
   Bybit-based version this replaces), never a scan source itself. */
const { BINANCE_LSR_PERIOD } = require("./config");
const binanceLsr = {
  key: "binanceLsr",
  label: "Binance Top",
  /* Returns { lsr, series } for symbol (e.g. "BTCUSDT") or null if Binance
     has no top-trader ratio for it. series = long/short ratio oldest→newest
     (used to derive the arrow vs its MA and the colour from the MA slope). */
  async accountRatio(symbol, tf, limit) {
    const period = (BINANCE_LSR_PERIOD && BINANCE_LSR_PERIOD[tf]) || "15m";
    const url = "https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=" +
      encodeURIComponent(symbol) + "&period=" + period + "&limit=" + (limit || 20);
    const d = await getJSON(url);
    if (!Array.isArray(d)) return null;
    const pts = d
      .map(x => ({ t: Number(x.timestamp), lsr: Number(x.longShortRatio) }))
      .filter(p => Number.isFinite(p.t) && Number.isFinite(p.lsr) && p.lsr > 0)
      .sort((a, b) => a.t - b.t);
    if (!pts.length) return null;
    const series = pts.map(p => p.lsr);
    return { lsr: series[series.length - 1], series };
  },
  /* Top-trader long/short split BY POSITION SIZE (not account count, see
     accountRatio above) — same field names Binance reuses across all 3
     long/short ratio endpoints. Only used server-side to approximate Net
     Long / Net Short / Net Delta for the ML pipeline (metrics.js's
     netFlowTrend), the same principle the in-page DVL Net Long/Short/Delta
     oscillators already use client-side: this fraction × Open Interest.
     series is oldest→newest, aligned by INDEX (not timestamp) against an
     openInterestHist() call made with the same period/limit — a same-
     period, same-count pull from both endpoints lines up closely enough
     for a trend/ratio approximation without a real join. */
  async positionRatio(symbol, tf, limit) {
    const period = (BINANCE_LSR_PERIOD && BINANCE_LSR_PERIOD[tf]) || "15m";
    const url = "https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=" +
      encodeURIComponent(symbol) + "&period=" + period + "&limit=" + (limit || 20);
    const d = await getJSON(url);
    if (!Array.isArray(d)) return null;
    const pts = d
      .map(x => ({ t: Number(x.timestamp), long: Number(x.longAccount), short: Number(x.shortAccount) }))
      .filter(p => Number.isFinite(p.t) && Number.isFinite(p.long) && Number.isFinite(p.short) && p.long > 0)
      .sort((a, b) => a.t - b.t);
    if (!pts.length) return null;
    const last = pts[pts.length - 1];
    return { long: last.long, short: last.short, series: pts };
  }
};

module.exports = { binance, mexc, binanceLsr, tfToMs, EXCHANGES: { binance, mexc } };
