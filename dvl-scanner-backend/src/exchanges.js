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
    }).map(t => ({ sym: t.symbol, qv: Number(t.amount24), oi: Number(t.holdVol) }));
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
  base(sym) { return String(sym).replace(/_USDT$/, ""); }
};

/* Bybit — real per-symbol long/short ACCOUNT ratio. Public + free, and the
   same source the in-page chart already uses, so it's known to work from
   this environment. Used only as the LSR data source (not a scan source). */
const { BYBIT_PERIOD } = require("./config");
const bybit = {
  key: "bybit",
  label: "Bybit",
  /* Returns { lsr, trend } for symbol (e.g. "APTUSDT") or null if Bybit has
     no account-ratio for it. trend = direction of the long/short ratio. */
  async accountRatio(symbol, tf) {
    const period = (BYBIT_PERIOD && BYBIT_PERIOD[tf]) || "15min";
    const url = "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=" +
      encodeURIComponent(symbol) + "&period=" + period + "&limit=2";
    const j = await getJSON(url);
    const list = (j && j.result && Array.isArray(j.result.list)) ? j.result.list : [];
    const pts = list
      .map(x => ({ t: Number(x.timestamp), lsr: Number(x.buyRatio) / Math.max(Number(x.sellRatio), 1e-9) }))
      .filter(p => Number.isFinite(p.t) && Number.isFinite(p.lsr) && p.lsr > 0)
      .sort((a, b) => a.t - b.t);
    if (!pts.length) return null;
    const cur = pts[pts.length - 1].lsr;
    const prev = pts.length > 1 ? pts[pts.length - 2].lsr : cur;
    let trend = "flat";
    if (prev > 0) {
      const d = (cur - prev) / prev;
      trend = d > 0.005 ? "up" : (d < -0.005 ? "down" : "flat");
    }
    return { lsr: cur, trend };
  }
};

module.exports = { binance, mexc, bybit, tfToMs, EXCHANGES: { binance, mexc } };
