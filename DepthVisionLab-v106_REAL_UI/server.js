
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");
// Motor de candles reais 15s/30s (futuros). Carregado DEFENSIVAMENTE: se o
// arquivo subsecondCandles.js ainda não tiver sido copiado pro diretório vivo
// (o deploy.sh copia server.js + subsecondCandles.js separadamente), o require
// falha SEM derrubar o servidor — os endpoints só respondem OFFLINE até o
// módulo chegar. (Foi exatamente isso que derrubou o site antes: o deploy
// copiava só server.js, o require estourava "Cannot find module" e o pm2
// entrava em loop de restart.)
let subsecond = null;
try { subsecond = require("./subsecondCandles"); }
catch (e) { console.error("subsecondCandles indisponível (engine OFF):", e && e.message); }

// Rede de segurança extra pra quando o feed de futuros estiver ligado.
process.on("uncaughtException", (e) => { try { console.error("uncaughtException:", (e && e.stack) || e); } catch(_){} });
process.on("unhandledRejection", (e) => { try { console.error("unhandledRejection:", (e && e.stack) || e); } catch(_){} });

const app = express();
const PORT = process.env.PORT || 3000;
const SYMBOL = "BTCUSDT";
const REST = "https://api.binance.com";
const WSURL = "wss://stream.binance.com:9443/ws";

// ── Persistence config ─────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
const TRADES_FILE = path.join(DATA_DIR, "trades.json");
const DEPTH_HIST_FILE = path.join(DATA_DIR, "depth_history.json");

const TRADE_RETENTION_MS = 1000 * 60 * 60 * 72;   // keep 72h of trades
const DEPTH_RETENTION_MS = 1000 * 60 * 60 * 72;   // keep 72h of depth history
const DEPTH_SAMPLE_MS    = 30 * 1000;             // 1 snapshot every 30s
const SAVE_INTERVAL_MS   = 15 * 1000;             // persist every 15s
const MAX_TRADES_IN_MEM  = 250000;                // cap memory use

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());

// ── DVL Telegram Alerts (V1) ────────────────────────────────────────────────
// Ativa SÓ quando o operador definiu TELEGRAM_BOT_TOKEN no ambiente do servidor
// (segredos nunca no frontend). require lazy + guardado: se o módulo ou o
// node:sqlite não estiverem disponíveis, o servidor segue normal sem Telegram.
try {
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ENABLED !== "0") {
    require("./telegram").install(app);
  } else {
    console.log("[DVL Telegram] skip (sem TELEGRAM_BOT_TOKEN)");
  }
} catch (e) {
  console.warn("[DVL Telegram] desativado — falha ao instalar:", e && e.message);
}

// ── Cache policy ────────────────────────────────────────────────────────────
// HTML: "no-cache" (NOT "no-store") so the browser MUST revalidate on every
// load but can answer with a 304 when the ETag is unchanged — repeat loads /
// refreshes cost ~0 bytes instead of re-downloading 3.16MB, while a new deploy
// (new ETag) is picked up instantly. Static assets (icons/logo) get a short
// max-age so they stop revalidating on every navigation.
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html")) {
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.set("Vary", "Accept-Encoding");
  } else if (req.path === "/manifest.json") {
    res.set("Content-Type", "application/manifest+json");
    res.set("Cache-Control", "no-cache, must-revalidate");
  } else if (/\.(js|mjs|css)$/i.test(req.path)) {
    // Código do app (JS/CSS): revalida por ETag, igual ao HTML. Assim um deploy
    // é pego NA HORA (arquivo mudou → ETag novo → 200 fresco) e um refresh de
    // arquivo inalterado custa ~0 (304). Isso ELIMINA a necessidade de cache-bust
    // manual (?v=NNNN) — a origem do "saco" de versões. CDN-Cache-Control força o
    // Cloudflare a revalidar também, em vez de servir cópia velha do edge.
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.set("CDN-Cache-Control", "no-cache");
    res.set("Vary", "Accept-Encoding");
  } else {
    res.set("Cache-Control", "public, max-age=600");
  }
  next();
});

// ── Transparent gzip for JSON API responses ─────────────────────────────────
// klines / trades / footprint / depth_history can be hundreds of KB of highly
// compressible JSON. Gzip them when the client accepts it (typically 5–10x
// smaller). Tiny payloads pass through untouched to avoid pointless CPU.
app.use((req, res, next) => {
  const ae = req.headers["accept-encoding"] || "";
  if (!/\bgzip\b/.test(ae)) return next();
  const _json = res.json.bind(res);
  res.json = (obj) => {
    try {
      const buf = Buffer.from(JSON.stringify(obj));
      if (buf.length < 1400) { res.set("Content-Type", "application/json; charset=utf-8"); return res.end(buf); }
      const gz = zlib.gzipSync(buf);
      res.set("Content-Type", "application/json; charset=utf-8");
      res.set("Content-Encoding", "gzip");
      res.set("Vary", "Accept-Encoding");
      return res.end(gz);
    } catch (e) { return _json(obj); }
  };
  next();
});

// ── index.html: pre-built gzip buffer + content ETag (rebuilt on file change) ─
// The 3.16MB single-file app is by far the dominant payload. We compress it
// ONCE (not per request) and serve the cached buffer; the ETag is a content
// hash so it changes exactly when the HTML changes. Built-in zlib/crypto — no
// new dependency, no npm install needed on deploy.
const INDEX_FILE = path.join(__dirname, "public", "index.html");
let indexVersion = "Beta 0.047";
let idxRaw = null, idxGz = null, idxBr = null, idxEtag = "", idxMtime = 0, idxBrToken = 0;
function buildIndexCache() {
  try {
    const st = fs.statSync(INDEX_FILE);
    if (idxRaw && st.mtimeMs === idxMtime) return;
    const raw = fs.readFileSync(INDEX_FILE);
    idxRaw = raw;
    idxGz = zlib.gzipSync(raw, { level: 9 });   // fast (~100ms), always ready
    idxBr = null;                               // invalidate until async brotli catches up
    idxEtag = '"' + crypto.createHash("sha1").update(raw).digest("hex").slice(0, 20) + '"';
    idxMtime = st.mtimeMs;
    const m = raw.toString("utf8").match(/DVL_APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (m) indexVersion = m[1];
    // Max-quality brotli (~500KB) is expensive; run it on the libuv threadpool so
    // it never blocks the event loop. Swap in only if the file hasn't changed
    // again meanwhile (token guards against a stale buffer under a new ETag).
    const token = ++idxBrToken;
    if (typeof zlib.brotliCompress === "function") {
      zlib.brotliCompress(raw, { params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length
      } }, (err, out) => { if (!err && token === idxBrToken) idxBr = out; });
    }
  } catch (e) { /* keep last good cache */ }
}
buildIndexCache();
setInterval(buildIndexCache, 15000);

function serveIndex(req, res) {
  buildIndexCache();
  if (!idxRaw) return res.status(500).send("index unavailable");
  res.set("Cache-Control", "no-cache, must-revalidate");
  // Edge/CDN: NUNCA guardar o HTML no Cloudflare. Sem isso, um cache regional do
  // edge pode servir uma versao antiga da pagina depois de um deploy (a origem
  // ja esta nova, mas o PoP entrega a copia velha ate expirar). Estes cabecalhos
  // padrao dizem ao Cloudflare para nao cachear o HTML, mantendo todo deploy
  // visivel na hora. Os scripts versionados (?v=) continuam cacheaveis.
  res.set("CDN-Cache-Control", "no-store");
  res.set("Cloudflare-CDN-Cache-Control", "no-store");
  res.set("ETag", idxEtag);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.set("Vary", "Accept-Encoding");
  if (req.headers["if-none-match"] === idxEtag) return res.status(304).end();
  const ae = req.headers["accept-encoding"] || "";
  if (idxBr && /\bbr\b/.test(ae)) { res.set("Content-Encoding", "br"); return res.end(idxBr); }
  if (/\bgzip\b/.test(ae)) { res.set("Content-Encoding", "gzip"); return res.end(idxGz); }
  return res.end(idxRaw);
}
app.get("/", serveIndex);
app.get("/index.html", serveIndex);

// ETag/Last-Modified LIGADOS: dão ao browser/Cloudflare um validador pra
// revalidar o JS/CSS. Antes ficavam desligados, então a única forma de furar o
// cache era trocar a URL (?v=NNNN) na mão — a causa do problema de versões.
// Com ETag, arquivo inalterado responde 304 (barato) e deploy novo aparece na
// hora, sem tocar em nada no HTML. setHeaders tem a última palavra no header.
app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  lastModified: true,
  index: false,
  setHeaders: (res, filePath) => {
    if (/\.(js|mjs|css)$/i.test(filePath)) {
      res.set("Cache-Control", "no-cache, must-revalidate");
      res.set("CDN-Cache-Control", "no-cache");
    }
  }
}));

const state = {
  price: 0,
  trades: [],
  depth: { bids: [], asks: [], ts: Date.now() },
  depthHist: [],
  clients: new Set(),
  lastDepthSnap: 0,
  dirty: false
};

function num(v){ const x = Number(v); return Number.isFinite(x) ? x : 0; }

function broadcast(obj){
  const msg = JSON.stringify(obj);
  for(const c of state.clients){
    if(c.readyState === WebSocket.OPEN) c.send(msg);
  }
}

// ── Subsecond candle live channel ───────────────────────────────────────────
// Cada cliente /ws pode assinar candles 15s/30s por símbolo. O engine emite
// update/close/correction/status; roteamos só pros assinantes daquele
// (símbolo, intervalo). Isolado do broadcast de trades/depth existente.
const candleSubs = new Map();   // ws -> Set("SYMBOL|interval")
function subKey(sym, interval){ return String(sym).toUpperCase() + "|" + interval; }
function sendJson(ws, obj){ try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); } catch(_){} }
function onCandleEvent(type, data){
  try {
    if (type === "feed_status"){
      const sym = String(data.symbol || "").toUpperCase();
      for (const [ws, set] of candleSubs){ for (const k of set){ if (k.split("|")[0] === sym){ sendJson(ws, { type:"feed_status", status:data.status, lagMs:data.lagMs, symbol:sym, data }); break; } } }
      return;
    }
    const key = subKey(data.symbol, data.interval);
    for (const [ws, set] of candleSubs){ if (set.has(key)) sendJson(ws, { type, data }); }
  } catch(_){}
}

async function getJson(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// ── Persistence ────────────────────────────────────────────────────────────
function loadPersisted(){
  try {
    if (fs.existsSync(TRADES_FILE)) {
      const arr = JSON.parse(fs.readFileSync(TRADES_FILE, "utf8"));
      const cutoff = Date.now() - TRADE_RETENTION_MS;
      state.trades = Array.isArray(arr) ? arr.filter(t => t && t.time >= cutoff) : [];
      console.log(`Loaded ${state.trades.length} persisted trades`);
    }
  } catch(e){ console.log("trades load error:", e.message); }
  try {
    if (fs.existsSync(DEPTH_HIST_FILE)) {
      const arr = JSON.parse(fs.readFileSync(DEPTH_HIST_FILE, "utf8"));
      const cutoff = Date.now() - DEPTH_RETENTION_MS;
      state.depthHist = Array.isArray(arr) ? arr.filter(s => s && s.time >= cutoff) : [];
      console.log(`Loaded ${state.depthHist.length} persisted depth snapshots`);
    }
  } catch(e){ console.log("depth hist load error:", e.message); }
}

function persistNow(){
  if (!state.dirty) return;
  state.dirty = false;
  try {
    const cutT = Date.now() - TRADE_RETENTION_MS;
    const trades = state.trades.filter(t => t.time >= cutT);
    fs.writeFileSync(TRADES_FILE + ".tmp", JSON.stringify(trades));
    fs.renameSync(TRADES_FILE + ".tmp", TRADES_FILE);
  } catch(e){ console.log("trades save error:", e.message); }
  try {
    const cutD = Date.now() - DEPTH_RETENTION_MS;
    const hist = state.depthHist.filter(s => s.time >= cutD);
    fs.writeFileSync(DEPTH_HIST_FILE + ".tmp", JSON.stringify(hist));
    fs.renameSync(DEPTH_HIST_FILE + ".tmp", DEPTH_HIST_FILE);
  } catch(e){ console.log("depth hist save error:", e.message); }
}
setInterval(persistNow, SAVE_INTERVAL_MS);
process.on("SIGINT", () => { persistNow(); process.exit(0); });
process.on("SIGTERM", () => { persistNow(); process.exit(0); });

// ── Trades ─────────────────────────────────────────────────────────────────
function addTrade(t){
  const item = {
    id: t.a,
    time: t.T || Date.now(),
    price: num(t.p),
    qty: num(t.q),
    side: t.m ? "sell" : "buy",
    notional: num(t.p) * num(t.q)
  };
  state.price = item.price;
  state.trades.push(item);

  const cutoff = Date.now() - TRADE_RETENTION_MS;
  while(state.trades.length && state.trades[0].time < cutoff) state.trades.shift();
  if (state.trades.length > MAX_TRADES_IN_MEM) {
    state.trades.splice(0, state.trades.length - MAX_TRADES_IN_MEM);
  }
  state.dirty = true;
  broadcast({ type:"trade", data:item });
}

// ── Depth snapshots ────────────────────────────────────────────────────────
function setDepth(d){
  state.depth = {
    bids: (d.bids || d.b || []).slice(0, 1000).map(x => [num(x[0]), num(x[1])]),
    asks: (d.asks || d.a || []).slice(0, 1000).map(x => [num(x[0]), num(x[1])]),
    ts: Date.now()
  };
  const now = Date.now();
  if (now - state.lastDepthSnap >= DEPTH_SAMPLE_MS && (state.depth.bids.length || state.depth.asks.length)) {
    state.lastDepthSnap = now;
    state.depthHist.push({
      time: now,
      bids: state.depth.bids.slice(0, 60),
      asks: state.depth.asks.slice(0, 60)
    });
    const cutoff = now - DEPTH_RETENTION_MS;
    while (state.depthHist.length && state.depthHist[0].time < cutoff) state.depthHist.shift();
    if (state.depthHist.length > 12000) {
      state.depthHist.splice(0, state.depthHist.length - 12000);
    }
    state.dirty = true;
  }
  broadcast({ type:"depth", data: state.depth });
}

async function depthSnapshot(){
  try{
    const d = await getJson(`${REST}/api/v3/depth?symbol=${SYMBOL}&limit=1000`);
    setDepth(d);
  }catch(e){
    console.log("depth snapshot error:", e.message);
  }
}

// ── Backfill on startup ────────────────────────────────────────────────────
async function backfillTrades(){
  try {
    const have = state.trades.length;
    const newestTime = have ? state.trades[state.trades.length - 1].time : 0;
    const startTime = Math.max(newestTime + 1, Date.now() - TRADE_RETENTION_MS);
    const endTime = Date.now();
    if (startTime >= endTime - 60000) {
      console.log(`Backfill skipped — ${have} trades already up-to-date`);
      return;
    }
    console.log(`Backfilling trades from ${new Date(startTime).toISOString()}`);
    let start = startTime;
    let loops = 0;
    let added = 0;
    const seen = new Set(state.trades.map(t => t.id));
    while (start < endTime && loops < 240) {
      const url = `${REST}/api/v3/aggTrades?symbol=${SYMBOL}&startTime=${start}&endTime=${endTime}&limit=1000`;
      let arr;
      try { arr = await getJson(url); }
      catch(e){ console.log("backfill page error:", e.message); break; }
      if (!Array.isArray(arr) || !arr.length) break;
      for (const t of arr) {
        if (seen.has(t.a)) continue;
        seen.add(t.a);
        state.trades.push({
          id: t.a,
          time: t.T,
          price: num(t.p),
          qty: num(t.q),
          side: t.m ? "sell" : "buy",
          notional: num(t.p) * num(t.q)
        });
        added++;
      }
      const lastT = +arr[arr.length - 1].T;
      if (!isFinite(lastT) || lastT <= start) break;
      start = lastT + 1;
      loops++;
      await new Promise(r => setTimeout(r, 110));
    }
    state.trades.sort((a, b) => a.time - b.time);
    if (state.trades.length > MAX_TRADES_IN_MEM) {
      state.trades.splice(0, state.trades.length - MAX_TRADES_IN_MEM);
    }
    state.dirty = true;
    console.log(`Backfill done: +${added} trades, total ${state.trades.length}`);
    persistNow();
  } catch (e) {
    console.log("backfill error:", e.message);
  }
}

function connectTrades(){
  const ws = new WebSocket(`${WSURL}/${SYMBOL.toLowerCase()}@aggTrade`);
  ws.on("open", () => console.log("Binance aggTrade connected"));
  ws.on("message", m => { try{ addTrade(JSON.parse(m)); }catch(e){} });
  ws.on("close", () => setTimeout(connectTrades, 1500));
  ws.on("error", () => ws.close());
}

function connectDepth(){
  const ws = new WebSocket(`${WSURL}/${SYMBOL.toLowerCase()}@depth20@100ms`);
  ws.on("open", () => console.log("Binance depth connected"));
  ws.on("message", m => { try{ setDepth(JSON.parse(m)); }catch(e){} });
  ws.on("close", () => setTimeout(connectDepth, 1500));
  ws.on("error", () => ws.close());
}

// ── Version detection — indexVersion is kept fresh by buildIndexCache() above ─

// ── HTTP API ───────────────────────────────────────────────────────────────
app.get("/api/version", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({ v: indexVersion });
});

app.get("/api/status", (req,res) => res.json({
  ok: true,
  symbol: SYMBOL,
  price: state.price,
  trades: state.trades.length,
  depthHist: state.depthHist.length
}));

app.get("/api/depth", (req,res) => res.json(state.depth));

app.get("/api/depth_history", (req,res) => {
  try {
    const since = Number(req.query.since || 0);
    const limit = Math.min(Number(req.query.limit || 2000), 6000);
    const arr = state.depthHist.filter(s => s.time >= since).slice(-limit);
    res.json(arr);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// ── Market data: candles reais subsegundo (15s/30s) ─────────────────────────
app.get("/api/market/candles", (req,res) => {
  try {
    const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,"");
    const interval = String(req.query.interval || "15s");
    if (interval !== "15s" && interval !== "30s") return res.status(400).json({ ok:false, error:"interval deve ser 15s ou 30s" });
    if (!subsecond) return res.json({ ok:true, market:"binance-usdm", symbol, interval, partial:true, status:"OFFLINE", serverTime:Date.now(), candles:[], nextFrom:null });
    const from = Number(req.query.from || 0);
    const to = Number(req.query.to || Date.now());
    const limit = Math.min(Number(req.query.limit || 1000), 5000);
    const eng = subsecond.getEngine(symbol);
    if (!eng) return res.json({ ok:true, market:subsecond.MARKET, symbol, interval, partial:true, status:"OFFLINE", serverTime:Date.now(), candles:[], nextFrom:null });
    const candles = eng.getSnapshot(interval, from, to, limit) || [];
    const h = eng.health();
    const nextFrom = candles.length === limit ? (candles[candles.length-1].openTime + subsecond.LABEL_IV[interval]) : null;
    res.json({ ok:true, market:subsecond.MARKET, symbol, interval,
      partial: h.status !== "LIVE", status: h.status, serverTime: Date.now(),
      candles, nextFrom });
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});
app.get("/api/market/health", (req,res) => {
  try {
    if (!subsecond) return res.json({ service:"dvl-market-data", market:"binance-usdm", status:"OFFLINE", symbols:{}, serverTime:Date.now() });
    const all = subsecond.healthAll();
    let status = "OFFLINE";
    for (const s in all){ if (all[s].status === "LIVE"){ status = "LIVE"; break; } status = all[s].status; }
    res.json({ service:"dvl-market-data", market:subsecond.MARKET, status, symbols: all, serverTime: Date.now() });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.get("/api/klines", async (req,res) => {
  try{
    const interval = req.query.interval || "5m";
    const limit = Math.min(Number(req.query.limit || 650), 1000);
    const raw = await getJson(`${REST}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`);
    res.json(raw.map(k => ({ t:+k[0], o:+k[1], h:+k[2], l:+k[3], c:+k[4], v:+k[5], closeTime:+k[6] })));
  }catch(e){ res.status(500).json({ error: e.message }); }
});

// ── Footprint aggregation endpoint ────────────────────────────────────────
// Returns buy/sell volume per price level per candle — ~100x smaller than
// raw trades, gives 100% real data coverage for all stored history.
function tfToMs(tf) {
  const m = String(tf).match(/^(\d+)([smhd])$/);
  if (!m) return 300000;
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] || 60000;
  return parseInt(m[1]) * unit;
}
app.get("/api/footprint", (req, res) => {
  try {
    const start  = Number(req.query.start || 0);
    const end    = Number(req.query.end || Date.now());
    const tf     = String(req.query.interval || "5m");
    const tick   = Math.max(0.001, Number(req.query.tick || 10));
    const ms     = tfToMs(tf);

    const trades = state.trades.filter(t => t.time >= start && t.time <= end);
    const map    = new Map(); // ct → candle bucket

    for (const t of trades) {
      const ct  = Math.floor(t.time / ms) * ms;
      if (!map.has(ct)) map.set(ct, { t: ct, b: 0, s: 0, fp: {} });
      const bkt = map.get(ct);
      const lvl = String(Math.round(t.price / tick) * tick);
      if (!bkt.fp[lvl]) bkt.fp[lvl] = [0, 0]; // [buy, sell]
      if (t.side === "buy") { bkt.fp[lvl][0] += t.qty; bkt.b += t.qty; }
      else                  { bkt.fp[lvl][1] += t.qty; bkt.s += t.qty; }
    }

    res.json([...map.values()].sort((a, b) => a.t - b.t));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/trades", async (req,res) => {
  try{
    const start = Number(req.query.start || 0);
    const end = Number(req.query.end || Date.now());
    let out = state.trades.filter(t => t.time >= start && t.time <= end);
    out = out.map(t => ({
      a: t.id,
      p: String(t.price),
      q: String(t.qty),
      T: t.time,
      m: t.side === "sell"
    }));
    res.json(out);
  }catch(e){ res.status(500).json({ error: e.message }); }
});

// Escuta em dual-stack (IPv4 + IPv6): sem host, o Node binda em "::", que num
// Linux dual-stack aceita TANTO 127.0.0.1 QUANTO [::1]. Antes, com "0.0.0.0"
// (só IPv4), quando o nginx resolvia "localhost" para [::1] a conexão era
// recusada (111) -> 521. Agora conecta em qualquer uma das duas famílias.
const server = app.listen(PORT, () => {
  console.log(`DepthVisionLab running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server, path:"/ws" });
wss.on("connection", ws => {
  state.clients.add(ws);
  ws.send(JSON.stringify({ type:"status", data:{ price:state.price, symbol:SYMBOL }}));
  ws.send(JSON.stringify({ type:"depth", data:state.depth }));
  ws.on("message", raw => {
    let msg; try { msg = JSON.parse(raw); } catch(_){ return; }
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "subscribe" && msg.channel === "candles"){
      const sym = String(msg.symbol || SYMBOL).toUpperCase().replace(/[^A-Z0-9]/g,"");
      const interval = msg.interval === "30s" ? "30s" : "15s";
      if (!SUBSECOND_ON || !subsecond){ sendJson(ws, { type:"candle_snapshot", market:"binance-usdm", symbol:sym, interval, data:[], status:"OFFLINE" }); return; }
      let set = candleSubs.get(ws); if (!set){ set = new Set(); candleSubs.set(ws, set); }
      set.add(subKey(sym, interval));
      const eng = subsecond.ensureEngine(sym, onCandleEvent, DATA_DIR);
      try { eng.start(); } catch(_){}
      sendJson(ws, { type:"candle_snapshot", market:subsecond.MARKET, symbol:sym, interval,
        data: eng.getSnapshot(interval, 0, Date.now(), 2000) || [], status: eng.health().status });
    } else if (msg.type === "unsubscribe" && msg.channel === "candles"){
      const sym = String(msg.symbol || SYMBOL).toUpperCase().replace(/[^A-Z0-9]/g,"");
      const set = candleSubs.get(ws);
      if (set){ if (msg.interval){ set.delete(subKey(sym, msg.interval === "30s" ? "30s" : "15s")); } else { set.delete(subKey(sym,"15s")); set.delete(subKey(sym,"30s")); } }
    }
  });
  ws.on("close", () => { state.clients.delete(ws); candleSubs.delete(ws); });
});

loadPersisted();
depthSnapshot();
setInterval(depthSnapshot, 15000);
connectTrades();
connectDepth();
setTimeout(backfillTrades, 3000);

// Motor de candles reais 15s/30s (futuros) — grava 24/7 mesmo sem frontend
// aberto. GATED por env (DVL_SUBSECOND=1), DESLIGADO por padrão: assim o deploy
// é idêntico ao comportamento estável do site (endpoints respondem OFFLINE, sem
// WS/backfill de futuros). Ligue só quando quiser, e é reversível pela env —
// nunca pode derrubar o site num deploy. Sobe 6s depois do listen; protegido
// por process.on(uncaught*) lá em cima.
// Ligado por padrão (o crash era o arquivo faltando no deploy, já corrigido).
// Desliga só com DVL_SUBSECOND=0. Módulo ausente também mantém desligado.
const SUBSECOND_ON = !!subsecond && process.env.DVL_SUBSECOND !== "0";
if (SUBSECOND_ON) {
  setTimeout(() => {
    try { subsecond.startDefault(onCandleEvent, DATA_DIR, ["BTCUSDT"]); }
    catch(e){ console.log("subsecond engine start error:", e.message); }
  }, 6000);
} else {
  console.log("subsecond candle engine DISABLED (module " + (subsecond?"present":"absent") + "; set DVL_SUBSECOND=1 to enable)");
}
