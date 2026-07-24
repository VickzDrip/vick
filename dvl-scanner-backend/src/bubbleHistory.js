"use strict";

/* ── DVL Bubbles history ───────────────────────────────────────────────────
   Serves ~2h of aggregated "bubble" flow for a symbol so the overlay starts
   populated instead of only live. We use Binance 1-SECOND klines (spot), which
   carry, per second: total volume, quote volume and TAKER-BUY quote volume — so
   each second becomes one aggregated bubble (buy vs sell notional, price, count)
   WITHOUT pulling millions of raw trades. Runs server-side (no browser geo-block:
   Binance Futures is restricted in some regions, but the server reaches Binance,
   and spot 1s klines are the compact source). Cached briefly per symbol. */

async function getJSON(url, timeoutMs) {
  const signal = (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(timeoutMs || 12000) : undefined;
  const res = await fetch(url, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

const cache = {};        // key -> { t, data }
const TTL = 30000;       // 30s per symbol
const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];  // spot 1s klines

function cleanSym(s) { return String(s || "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

/* Fetch + aggregate 1s klines into bubble groups for the last `mins` minutes. */
async function history(symbol, mins) {
  symbol = cleanSym(symbol);
  mins = Math.max(5, Math.min(180, Number(mins) || 120));
  const key = symbol + "|" + mins;
  const now = Date.now();
  if (cache[key] && now - cache[key].t < TTL) return cache[key].data;

  const end = now, start = now - mins * 60000;
  const groups = [];
  let cursor = start, calls = 0, host = 0;

  while (cursor < end && calls < 16) {
    calls++;
    const url = HOSTS[host] + "/api/v3/klines?symbol=" + symbol + "&interval=1s&startTime=" + cursor + "&endTime=" + end + "&limit=1000";
    let d;
    try { d = await getJSON(url); }
    catch (e) { if (host + 1 < HOSTS.length) { host++; calls--; continue; } break; }
    if (!Array.isArray(d) || !d.length) break;
    for (let i = 0; i < d.length; i++) {
      const k = d[i];
      const vol = Number(k[5]); if (!(vol > 0)) continue;           // skip empty seconds
      const close = Number(k[4]);
      const quoteVol = Number(k[7]);
      const buyQuote = Number(k[10]);                               // taker-buy quote volume
      groups.push({
        ts: Number(k[0]), price: close,
        buyN: buyQuote > 0 ? buyQuote : 0,
        sellN: Math.max(0, quoteVol - buyQuote),
        qty: vol, rawCount: Number(k[8]) || 1
      });
    }
    const lastOpen = Number(d[d.length - 1][0]);
    if (!(lastOpen > cursor)) break;
    cursor = lastOpen + 1000;
    if (d.length < 1000) break;
  }

  const data = { symbol, mins, count: groups.length, groups };
  cache[key] = { t: now, data };
  return data;
}

module.exports = { history };
