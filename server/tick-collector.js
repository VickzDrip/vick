'use strict';

const WebSocket = require('ws');
const http      = require('http');
const https     = require('https');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT            = 3001;
const MAX_HOURS       = 4;
const MAX_BARS        = MAX_HOURS * 3600;   // 14 400 barras de 1s por símbolo
const TOP_N           = 50;
const RECONNECT_MS    = 4000;
const BINANCE_REST    = 'https://fapi.binance.com';
const BINANCE_WS      = 'wss://fstream.binance.com/stream?streams=';

// ── Store: symbol → { bars[], cur } ──────────────────────────────────────────
// bar: { ts(ms), open, high, low, close, buyVol, sellVol, delta, trades }
const store = new Map();

function ensureSym(sym) {
  if (!store.has(sym)) store.set(sym, { bars: [], cur: null });
}

function onTrade(sym, price, qty, ts, isBuyerMaker) {
  ensureSym(sym);
  const s   = store.get(sym);
  const barTs = Math.floor(ts / 1000) * 1000;
  const p   = parseFloat(price);
  const q   = parseFloat(qty);
  const buy  = isBuyerMaker ? 0 : q;
  const sell = isBuyerMaker ? q : 0;

  if (!s.cur || s.cur.ts !== barTs) {
    if (s.cur) {
      s.bars.push(s.cur);
      if (s.bars.length > MAX_BARS) s.bars.shift();
    }
    s.cur = { ts: barTs, open: p, high: p, low: p, close: p,
              buyVol: buy, sellVol: sell, delta: buy - sell, trades: 1 };
  } else {
    const c = s.cur;
    if (p > c.high) c.high = p;
    if (p < c.low)  c.low  = p;
    c.close   = p;
    c.buyVol  += buy;
    c.sellVol += sell;
    c.delta   += buy - sell;
    c.trades++;
  }
}

// ── Symbol list ───────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

const FALLBACK = [
  'btcusdt','ethusdt','bnbusdt','solusdt','xrpusdt','dogeusdt','adausdt',
  'avaxusdt','dotusdt','maticusdt','linkusdt','ltcusdt','uniusdt','atomusdt',
  'nearusdt','ftmusdt','sandusdt','manausdt','axsusdt','galausdt'
];

async function getTopSymbols() {
  try {
    const tickers = await fetchJson(BINANCE_REST + '/fapi/v1/ticker/24hr');
    return tickers
      .filter(t => t.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, TOP_N)
      .map(t => t.symbol.toLowerCase());
  } catch(e) {
    console.error('[symbols] Falha ao buscar top symbols, usando fallback:', e.message);
    return FALLBACK;
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
let ws            = null;
let reconnectTmr  = null;
let symbols       = [];
let startedAt     = Date.now();

function connect() {
  if (ws) { try { ws.terminate(); } catch(_) {} }

  const url = BINANCE_WS + symbols.map(s => s + '@aggTrade').join('/');
  console.log(`[ws] Conectando a ${symbols.length} streams…`);
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`[ws] Conectado — rastreando ${symbols.length} símbolos.`);
    if (reconnectTmr) { clearTimeout(reconnectTmr); reconnectTmr = null; }
  });

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      const d = msg.data;
      if (!d || d.e !== 'aggTrade') return;
      onTrade(d.s.toLowerCase(), d.p, d.q, d.T, d.m);
    } catch(_) {}
  });

  ws.on('close', (code) => {
    console.log(`[ws] Desconectado (${code}). Reconectando em ${RECONNECT_MS}ms…`);
    reconnectTmr = setTimeout(connect, RECONNECT_MS);
  });

  ws.on('error', err => console.error('[ws] Erro:', err.message));
}

// ── REST API ──────────────────────────────────────────────────────────────────
// GET /bars?symbol=BTCUSDT&from=<ms>&to=<ms>   → array de barras de 1s
// GET /symbols                                  → lista de símbolos rastreados
// GET /status                                   → uptime e contagem de barras

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const qIdx = req.url.indexOf('?');
  const path = qIdx >= 0 ? req.url.slice(0, qIdx) : req.url;
  const qs   = qIdx >= 0 ? req.url.slice(qIdx + 1) : '';

  const params = {};
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }

  if (path === '/bars') {
    const sym  = (params.symbol || '').toLowerCase();
    const from = parseInt(params.from) || 0;
    const to   = parseInt(params.to)   || Date.now();

    if (!sym || !store.has(sym)) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'symbol not tracked' }));
    }

    const s    = store.get(sym);
    const bars = s.cur ? [...s.bars, s.cur] : [...s.bars];
    const out  = from || to < Date.now()
      ? bars.filter(b => b.ts >= from && b.ts <= to)
      : bars;

    res.end(JSON.stringify(out));
    return;
  }

  if (path === '/symbols') {
    res.end(JSON.stringify(symbols));
    return;
  }

  if (path === '/status') {
    const barCounts = {};
    for (const [sym, s] of store.entries()) {
      barCounts[sym] = s.bars.length + (s.cur ? 1 : 0);
    }
    res.end(JSON.stringify({
      uptime:    Math.round((Date.now() - startedAt) / 1000),
      symbols:   symbols.length,
      maxHours:  MAX_HOURS,
      barCounts
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('[DVL Tick Collector] Iniciando…');
  symbols = await getTopSymbols();
  console.log(`[DVL Tick Collector] Top ${symbols.length}: ${symbols.slice(0, 6).join(', ')}…`);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[DVL Tick Collector] API em http://127.0.0.1:${PORT}`);
  });

  connect();
})();
