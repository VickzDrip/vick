'use strict';

const https = require('https');
const http  = require('http');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT         = 3001;
const MAX_HOURS    = 4;
const MAX_BARS     = MAX_HOURS * 3600;   // 14 400 barras de 1s por símbolo
const TOP_N        = 50;
const POLL_BATCH   = 5;                  // símbolos poleados em paralelo por ciclo
const POLL_DELAY   = 1000;              // ms entre batches
const BINANCE_REST = 'https://fapi.binance.com';

// ── Store: symbol → { bars[], cur, lastId } ───────────────────────────────────
// bar: { ts(ms), open, high, low, close, buyVol, sellVol, delta, trades }
const store = new Map();
let symbols = [];
let startedAt = Date.now();

function ensureSym(sym) {
  if (!store.has(sym)) store.set(sym, { bars: [], cur: null, lastId: null });
}

function onTrade(sym, price, qty, ts, isBuyerMaker) {
  ensureSym(sym);
  const s    = store.get(sym);
  const barTs = Math.floor(ts / 1000) * 1000;
  const p    = parseFloat(price);
  const q    = parseFloat(qty);
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
    c.close    = p;
    c.buyVol  += buy;
    c.sellVol += sell;
    c.delta   += buy - sell;
    c.trades++;
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('parse: ' + e.message)); }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// ── Symbol list ───────────────────────────────────────────────────────────────
const FALLBACK = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT',
  'AVAXUSDT','DOTUSDT','MATICUSDT','LINKUSDT','LTCUSDT','UNIUSDT','ATOMUSDT',
  'NEARUSDT','FTMUSDT','SANDUSDT','MANAUSDT','AXSUSDT','GALAUSDT'
];

async function getTopSymbols() {
  try {
    const tickers = await fetchJson(BINANCE_REST + '/fapi/v1/ticker/24hr');
    return tickers
      .filter(t => t.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, TOP_N)
      .map(t => t.symbol.toUpperCase());
  } catch(e) {
    console.error('[symbols] Usando fallback:', e.message);
    return FALLBACK;
  }
}

// ── REST polling ──────────────────────────────────────────────────────────────
async function pollSymbol(sym) {
  ensureSym(sym);
  const s = store.get(sym);
  try {
    let url;
    if (s.lastId !== null) {
      // busca a partir do último trade visto
      url = `${BINANCE_REST}/fapi/v1/aggTrades?symbol=${sym}&fromId=${s.lastId + 1}&limit=1000`;
    } else {
      // primeira busca: últimos 2000 trades para seed histórico
      url = `${BINANCE_REST}/fapi/v1/aggTrades?symbol=${sym}&limit=1000`;
    }

    const trades = await fetchJson(url);
    if (!Array.isArray(trades) || !trades.length) return;

    for (const t of trades) {
      onTrade(sym, t.p, t.q, t.T, t.m);
    }

    s.lastId = trades[trades.length - 1].a;

    // se recebeu 1000 (limite), pode ter mais — busca imediato
    if (trades.length >= 1000) {
      await pollSymbol(sym);
    }
  } catch(e) {
    // silencioso — tenta de novo no próximo ciclo
  }
}

// Ciclo principal: divide os símbolos em batches e faz polling contínuo
async function pollLoop() {
  let idx = 0;
  while (true) {
    const batch = symbols.slice(idx, idx + POLL_BATCH);
    if (batch.length) {
      await Promise.all(batch.map(s => pollSymbol(s)));
    }
    idx = (idx + POLL_BATCH) % symbols.length;
    await new Promise(r => setTimeout(r, POLL_DELAY));
  }
}

// ── REST API ──────────────────────────────────────────────────────────────────
// GET /bars?symbol=BTCUSDT&from=<ms>&to=<ms>   → array de barras de 1s
// GET /symbols                                  → lista de símbolos
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
    const sym  = (params.symbol || '').toUpperCase();
    const from = parseInt(params.from) || 0;
    const to   = parseInt(params.to)   || Date.now();

    if (!sym || !store.has(sym)) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'symbol not tracked' }));
    }

    const s    = store.get(sym);
    const bars = s.cur ? [...s.bars, s.cur] : [...s.bars];
    const out  = (from > 0 || to < Date.now())
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
      const n = s.bars.length + (s.cur ? 1 : 0);
      if (n > 0) barCounts[sym] = n;
    }
    res.end(JSON.stringify({
      uptime:   Math.round((Date.now() - startedAt) / 1000),
      symbols:  symbols.length,
      maxHours: MAX_HOURS,
      mode:     'rest-poll',
      barCounts
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('[DVL Tick Collector] Iniciando (modo REST poll)…');
  symbols = await getTopSymbols();
  console.log(`[DVL Tick Collector] Top ${symbols.length}: ${symbols.slice(0,6).join(', ')}…`);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[DVL Tick Collector] API em http://127.0.0.1:${PORT}`);
  });

  console.log('[DVL Tick Collector] Iniciando polling REST…');
  pollLoop(); // roda para sempre em background
})();
