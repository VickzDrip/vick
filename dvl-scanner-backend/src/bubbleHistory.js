"use strict";

/* ── DVL Bubbles history ───────────────────────────────────────────────────
   Serve ~2h de fluxo agregado ("bubbles") pro overlay já abrir populado.

   HÍBRIDO (Beta 1.351):
   - JANELA RECENTE (até AGG_MINS): aggTrades REAIS da Binance Futures, agregados
     no servidor por bucket de tempo + faixa de preço (tickSize), com lado agressor
     correto (m=isBuyerMaker → taker vende), dedup por aggId, contagem de execuções.
   - HISTÓRICO MAIS ANTIGO: klines de 1s (compacto, barato) — evita puxar milhões
     de trades crus pra cobrir 2h.
   Ordena por tempo, deduplica a fronteira e devolve tanto o contrato normalizado
   (`events`) quanto `groups` (forma legada) pro frontend atual consumir sem mudança. */

const cache = {};            // key -> { t, data }
const TTL = 30000;           // 30s por config
const AGG_MINS = 20;         // janela de aggTrades reais (curta e viável)
const AGG_MAX_CALLS = 30;    // teto de chamadas de aggTrades por atualização
const FHOST = "https://fapi.binance.com";
const SHOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];

let _tickCache = { t: 0, map: {} };
const TICK_FALLBACK = { BTCUSDT: 0.1, ETHUSDT: 0.01, SOLUSDT: 0.01, BNBUSDT: 0.01 };

function cleanSym(s) { return String(s || "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function clampInt(v, lo, hi, dflt) { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt; }
function a2n(a) { const n = Number(a); return Number.isFinite(n) ? n : 0; }

async function getJSON(url, timeoutMs) {
  const signal = (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(timeoutMs || 12000) : undefined;
  const res = await fetch(url, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* tickSize por símbolo. Prefere futures; cai pro SPOT (que o servidor alcança) e
   por fim pro fallback fixo. Cache por símbolo (12h). */
async function tickSizeFor(symbol) {
  symbol = cleanSym(symbol);
  const now = Date.now();
  if (_tickCache.map[symbol] && now - _tickCache.t < 12 * 3600000) return _tickCache.map[symbol];
  const tries = [
    FHOST + "/fapi/v1/exchangeInfo?symbol=" + symbol,
    SHOSTS[0] + "/api/v3/exchangeInfo?symbol=" + symbol
  ];
  for (const url of tries) {
    try {
      const info = await getJSON(url, 12000);
      const s = (info.symbols || [])[0];
      const pf = s && (s.filters || []).find(f => f.filterType === "PRICE_FILTER");
      if (pf && pf.tickSize) { _tickCache.t = now; _tickCache.map[symbol] = Number(pf.tickSize); return _tickCache.map[symbol]; }
    } catch (_) { /* tenta o próximo host */ }
  }
  return TICK_FALLBACK[symbol] || 0.1;
}

/* aggTrades reais paginados. Tenta Binance Futures; se indisponível (bloqueio de
   região no servidor), usa Binance SPOT (mesma forma {a,p,q,T,m}). Retorna {trades, source}. */
const AGG_SOURCES = [
  { source: "binance_futures", base: FHOST + "/fapi/v1/aggTrades" },
  { source: "binance_spot", base: SHOSTS[0] + "/api/v3/aggTrades" },
  { source: "binance_spot", base: SHOSTS[1] + "/api/v3/aggTrades" }
];
async function fetchAggTrades(symbol, startMs, endMs, maxCalls) {
  symbol = cleanSym(symbol);
  for (const src of AGG_SOURCES) {
    const out = [], seen = new Set();
    let cursor = startMs, calls = 0, ok = false;
    while (cursor < endMs && calls < maxCalls) {
      calls++;
      const url = src.base + "?symbol=" + symbol + "&startTime=" + cursor + "&endTime=" + Math.min(endMs, cursor + 3600000) + "&limit=1000";
      let d;
      try { d = await getJSON(url, 12000); ok = true; } catch (e) { ok = false; break; }
      if (!Array.isArray(d) || !d.length) { cursor += 60000; continue; }
      for (const t of d) { const a = Number(t.a); if (seen.has(a)) continue; seen.add(a); out.push(t); }
      const lastT = Number(d[d.length - 1].T);
      if (!(lastT > cursor)) break;
      cursor = lastT + 1;
      if (d.length < 1000 && cursor >= endMs) break;
    }
    if (ok && out.length) return { trades: out, source: src.source };
  }
  return { trades: [], source: null };
}

/* agrega aggTrades → eventos normalizados + groups (forma legada). */
function aggregate(trades, symbol, tickSize, bucketMs, priceBucketTicks, source) {
  source = source || "binance_futures";
  const step = tickSize * priceBucketTicks;
  const map = {};
  for (const t of trades) {
    const price = +t.p, qty = +t.q, T = +t.T;
    if (!(price > 0) || !(qty > 0)) continue;
    const side = t.m ? "sell" : "buy";      // m=isBuyerMaker → taker é o VENDEDOR (venda agressiva)
    const bstart = Math.floor(T / bucketMs) * bucketMs;
    const pb = step > 0 ? Math.round(price / step) : 0;
    const key = side + "|" + bstart + "|" + pb;
    const aid = a2n(t.a);
    let e = map[key];
    if (!e) {
      e = map[key] = { side, bucketStart: bstart, bucketEnd: bstart + bucketMs - 1, priceBucket: pb,
        buyQty: 0, sellQty: 0, buyNotional: 0, sellNotional: 0, executions: 0,
        firstAggTradeId: aid, lastAggTradeId: aid, priceMin: price, priceMax: price, pxQty: 0, lastT: T };
    }
    const notional = price * qty;
    if (side === "buy") { e.buyQty += qty; e.buyNotional += notional; }
    else { e.sellQty += qty; e.sellNotional += notional; }
    e.executions++;
    e.pxQty += notional;
    if (price < e.priceMin) e.priceMin = price;
    if (price > e.priceMax) e.priceMax = price;
    if (aid < e.firstAggTradeId) e.firstAggTradeId = aid;
    if (aid > e.lastAggTradeId) e.lastAggTradeId = aid;
    if (T > e.lastT) e.lastT = T;
  }
  const events = [], groups = [];
  for (const k of Object.keys(map)) {
    const e = map[k];
    const totalNotional = e.buyNotional + e.sellNotional;
    const qty = e.buyQty + e.sellQty;
    const price = qty > 0 ? e.pxQty / qty : (e.priceMin + e.priceMax) / 2;
    events.push({
      id: symbol + ":" + e.bucketStart + ":" + e.side + ":" + e.priceBucket,
      symbol, source, eventTime: e.bucketStart,
      bucketStart: e.bucketStart, bucketEnd: e.bucketEnd,
      price, priceMin: e.priceMin, priceMax: e.priceMax, side: e.side,
      buyQty: e.buyQty, sellQty: e.sellQty, buyNotional: e.buyNotional, sellNotional: e.sellNotional,
      totalNotional, deltaNotional: e.buyNotional - e.sellNotional, executions: e.executions,
      firstAggTradeId: e.firstAggTradeId, lastAggTradeId: e.lastAggTradeId, tickSize, isFinal: true
    });
    // forma legada consumida pelo frontend atual (mesma de history por-segundo)
    groups.push({ ts: e.bucketStart, price, buyN: e.buyNotional, sellN: e.sellNotional, qty, rawCount: e.executions });
  }
  events.sort((a, b) => a.eventTime - b.eventTime || (a.side < b.side ? -1 : 1));
  groups.sort((a, b) => a.ts - b.ts);
  return { events, groups };
}

/* histórico antigo por klines de 1s (barato) — só o trecho ANTES da janela de aggTrades. */
async function klineGroups(symbol, startMs, endMs) {
  symbol = cleanSym(symbol);
  const groups = [];
  if (!(endMs > startMs)) return groups;
  let cursor = startMs, calls = 0, host = 0;
  while (cursor < endMs && calls < 16) {
    calls++;
    const url = SHOSTS[host] + "/api/v3/klines?symbol=" + symbol + "&interval=1s&startTime=" + cursor + "&endTime=" + endMs + "&limit=1000";
    let d;
    try { d = await getJSON(url); } catch (e) { if (host + 1 < SHOSTS.length) { host++; calls--; continue; } break; }
    if (!Array.isArray(d) || !d.length) break;
    for (const k of d) {
      const vol = Number(k[5]); if (!(vol > 0)) continue;
      const close = Number(k[4]), quoteVol = Number(k[7]), buyQuote = Number(k[10]);
      groups.push({ ts: Number(k[0]), price: close, buyN: buyQuote > 0 ? buyQuote : 0,
        sellN: Math.max(0, quoteVol - buyQuote), qty: vol, rawCount: Number(k[8]) || 1 });
    }
    const lastOpen = Number(d[d.length - 1][0]);
    if (!(lastOpen > cursor)) break;
    cursor = lastOpen + 1000;
    if (d.length < 1000) break;
  }
  return groups;
}

/* Entrada principal. opts: { bucketMs, priceBucketTicks, source } */
async function history(symbol, mins, opts) {
  symbol = cleanSym(symbol);
  mins = clampInt(mins, 5, 240, 120);
  opts = opts || {};
  const bucketMs = clampInt(opts.bucketMs, 250, 5000, 1000);
  const priceBucketTicks = clampInt(opts.priceBucketTicks, 1, 50, 1);
  const key = [symbol, mins, bucketMs, priceBucketTicks].join("|");
  const now = Date.now();
  if (cache[key] && now - cache[key].t < TTL) return cache[key].data;

  const to = now, from = now - mins * 60000;
  const aggFrom = Math.max(from, now - AGG_MINS * 60000);

  let tickSize = 0.1, aggEvents = [], aggGroups = [], oldGroups = [], aggSource = null;
  try { tickSize = await tickSizeFor(symbol); } catch (_) {}
  try {
    const res = await fetchAggTrades(symbol, aggFrom, to, AGG_MAX_CALLS);
    aggSource = res.source;
    const agg = aggregate(res.trades, symbol, tickSize, bucketMs, priceBucketTicks, res.source);
    aggEvents = agg.events; aggGroups = agg.groups;
  } catch (_) {}
  if (aggFrom > from) { try { oldGroups = await klineGroups(symbol, from, aggFrom - 1); } catch (_) {} }

  const groups = oldGroups.concat(aggGroups).sort((a, b) => a.ts - b.ts);
  const data = {
    ok: true, symbol, source: aggGroups.length ? aggSource : "spot_1s_klines",
    generatedAt: now, from, to, tickSize, bucketMs, priceBucketTicks,
    aggFrom, aggMins: AGG_MINS, count: groups.length,
    groups,          // forma legada (frontend atual)
    events: aggEvents  // contrato normalizado (janela recente)
  };
  cache[key] = { t: now, data };
  return data;
}

module.exports = { history, _internal: { aggregate, tickSizeFor, fetchAggTrades, klineGroups } };
