"use strict";

/* ── DVL Subsecond Candle Engine (15s / 30s reais) ───────────────────────────
   Constrói candles OHLCV VERDADEIROS de 15s e 30s a partir de aggTrades reais
   (Binance USDⓈ-M Futures). NUNCA corta/interpola candles de 1m — o timestamp
   do negócio (T) escolhe o bucket UTC. Fase 1: motor intrabar interno do RSI
   Exhaustion Pro (não vira timeframe global). Ver DVL_Spec_Backend_Candles_
   Reais_15s_30s. Módulo genérico por símbolo/intervalo, aditivo e defensivo:
   se o feed de futuros não estiver acessível, reporta OFFLINE/DEGRADED sem
   afetar o resto do servidor. O agregador é PURO/testável (apply/flush) — a
   rede é opcional e fica isolada no ingestor. */

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const MARKET      = "binance-usdm";
const FUT_WS_BASE = process.env.DVL_FUT_WS   || "wss://fstream.binance.com/ws";
const FUT_REST    = process.env.DVL_FUT_REST || "https://fapi.binance.com";
const INTERVALS   = [15000, 30000];                 // 15s, 30s
const IV_LABEL    = { 15000: "15s", 30000: "30s" };
const LABEL_IV    = { "15s": 15000, "30s": 30000 };

const REORDER_MS  = 750;    // grace antes de fechar um bucket (reordena pequenos atrasos)
const REVISION_MS = 5000;   // janela p/ corrigir candle recém-fechado (late trade)
const STALE_MS    = 15000;  // sem eventos => feed STALE
const DEDUP_MAX   = 200000; // teto do set de aggIds recentes
const MAX_CANDLES = 20000;  // ring de candles fechados por (símbolo,intervalo) ~ 83h(15s)/166h(30s)
const SAVE_MS     = 10000;  // persistência periódica
const BACKFILL_MINUTES_MAX = 120; // reconstrução por REST no boot/gap (limitado por rate)

/* ── util numérica: guardamos números e serializamos como string decimal
   (contrato do spec), sem perder precisão visual. Times/counts ficam inteiros. */
function dec(n){ if(n==null) return "0"; var x=Number(n); if(!isFinite(x)) return "0"; return (Math.round(x*1e12)/1e12).toString(); }
function cleanSym(s){ return String(s||"BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g,""); }

/* ── Aggregator: um por (símbolo, intervalo). Puro e determinístico. ──────────
   apply(trade) acumula; flush(nowT) finaliza buckets cujo fim + REORDER já
   passou, preenchendo candles VAZIOS (isEmpty) quando não houve negócio. */
function Aggregator(symbol, intervalMs, emit){
  this.symbol = symbol;
  this.iv = intervalMs;
  this.label = IV_LABEL[intervalMs] || (intervalMs/1000 + "s");
  this.emit = emit || function(){};
  this.pending = new Map();     // openTime -> candle aberto (ainda não fechado)
  this.pendingUpdate = false;   // coalescing: houve update desde o último tickEmit
  this.candles = [];            // ring de candles FECHADOS (crescente por openTime)
  this.byOpen = new Map();      // openTime -> candle fechado (p/ correção)
  this.nextOpen = null;         // próximo openTime a fechar (cursor de finalização)
  this.prevClose = null;        // último close válido (p/ candle vazio)
  this.lastAppliedT = 0;        // maior T já visto
  this.metrics = { lateDrops:0, corrections:0, empties:0, closed:0 };
}
Aggregator.prototype.bucketStart = function(T){ return Math.floor(T / this.iv) * this.iv; };
Aggregator.prototype.createBucket = function(start){
  var c = {
    market: MARKET, symbol: this.symbol, interval: this.label,
    openTime: start, closeTime: start + this.iv,
    open: null, high: -Infinity, low: Infinity, close: null,
    baseVolume: 0, quoteVolume: 0,
    takerBuyBase: 0, takerSellBase: 0, takerBuyQuote: 0, takerSellQuote: 0,
    tradeCount: 0, firstTradeId: null, lastTradeId: null,
    _firstT: Infinity, _lastT: -Infinity,
    isClosed: false, isEmpty: false, revision: 0, source: "aggTrade", updatedAt: Date.now()
  };
  return c;
};
/* aplica um trade normalizado {a,T,price,qty,buy} no candle correto. `buy` =
   agressão compradora (m=false). Respeita ordem por EVENT TIME p/ open/close. */
Aggregator.prototype.applyToCandle = function(c, tr){
  var p = tr.price, q = tr.qty;
  if (tr.T < c._firstT){ c._firstT = tr.T; c.open = p; c.firstTradeId = tr.a; }
  if (tr.T > c._lastT){ c._lastT = tr.T; c.close = p; c.lastTradeId = tr.a; }
  if (p > c.high) c.high = p;
  if (p < c.low)  c.low = p;
  var quote = p * q;
  c.baseVolume  += q;
  c.quoteVolume += quote;
  if (tr.buy){ c.takerBuyBase += q; c.takerBuyQuote += quote; }
  else       { c.takerSellBase += q; c.takerSellQuote += quote; }
  c.tradeCount += 1;
  c.updatedAt = Date.now();
};
Aggregator.prototype.apply = function(tr){
  var start = this.bucketStart(tr.T);
  if (tr.T > this.lastAppliedT) this.lastAppliedT = tr.T;
  if (this.nextOpen == null) this.nextOpen = start;

  // bucket já fechado?
  if (start < this.nextOpen){
    var closed = this.byOpen.get(start);
    if (closed && (this.lastAppliedT - closed.closeTime) <= REVISION_MS){
      // correção: reaplica incrementalmente (dedupe garante idempotência a montante)
      this.applyToCandle(closed, tr);
      closed.revision += 1;
      this.metrics.corrections++;
      this.emit("candle_correction", this.serialize(closed));
    } else {
      this.metrics.lateDrops++;
    }
    return;
  }
  // bucket aberto (atual ou futuro)
  var c = this.pending.get(start);
  if (!c){ c = this.createBucket(start); this.pending.set(start, c); }
  this.applyToCandle(c, tr);
  // NÃO emite por trade: coalescing (§16). O tickEmit do engine publica ~5/s.
  this.pendingUpdate = true;
};
/* emite no máximo 1 candle_update do candle atual por tick (coalescing). */
Aggregator.prototype.tickEmit = function(){
  if (!this.pendingUpdate) return;
  this.pendingUpdate = false;
  var cur = this.current();
  if (cur) this.emit("candle_update", cur);
};
/* finaliza todos os buckets cujo fim + REORDER já passou em relação a nowT,
   preenchendo candles vazios entre eles. */
Aggregator.prototype.flush = function(nowT){
  if (this.nextOpen == null) return;
  while (this.nextOpen + this.iv + REORDER_MS <= nowT){
    var open = this.nextOpen;
    var c = this.pending.get(open);
    if (c){
      this.pending.delete(open);
      this.finalize(c);
    } else if (this.prevClose != null){
      // sem trades no intervalo: candle vazio (só depois de haver um close válido)
      var e = this.createBucket(open);
      e.open = e.high = e.low = e.close = this.prevClose;
      e.isEmpty = true;
      this.finalize(e);
      this.metrics.empties++;
    }
    // se prevClose ainda é null (nunca houve trade), não inventa candle: só avança
    this.nextOpen = open + this.iv;
  }
};
Aggregator.prototype.finalize = function(c){
  if (c.high === -Infinity){ c.high = c.close != null ? c.close : (this.prevClose||0); }
  if (c.low === Infinity){ c.low = c.close != null ? c.close : (this.prevClose||0); }
  if (c.open == null) c.open = c.close != null ? c.close : (this.prevClose||0);
  if (c.close == null) c.close = c.open;
  c.isClosed = true;
  this.prevClose = c.close;
  this.candles.push(c);
  this.byOpen.set(c.openTime, c);
  if (this.candles.length > MAX_CANDLES){
    var drop = this.candles.splice(0, this.candles.length - MAX_CANDLES);
    for (var i=0;i<drop.length;i++) this.byOpen.delete(drop[i].openTime);
  }
  this.metrics.closed++;
  this.emit("candle_close", this.serialize(c));
};
Aggregator.prototype.deltaBase  = function(c){ return c.takerBuyBase  - c.takerSellBase;  };
Aggregator.prototype.deltaQuote = function(c){ return c.takerBuyQuote - c.takerSellQuote; };
Aggregator.prototype.serialize = function(c){
  return {
    market: c.market, symbol: c.symbol, interval: c.interval,
    openTime: c.openTime, closeTime: c.closeTime,
    open: dec(c.open), high: dec(c.high===-Infinity?c.open:c.high), low: dec(c.low===Infinity?c.open:c.low), close: dec(c.close),
    baseVolume: dec(c.baseVolume), quoteVolume: dec(c.quoteVolume),
    takerBuyBase: dec(c.takerBuyBase), takerSellBase: dec(c.takerSellBase),
    takerBuyQuote: dec(c.takerBuyQuote), takerSellQuote: dec(c.takerSellQuote),
    deltaBase: dec(this.deltaBase(c)), deltaQuote: dec(this.deltaQuote(c)),
    tradeCount: c.tradeCount, firstTradeId: c.firstTradeId, lastTradeId: c.lastTradeId,
    isClosed: c.isClosed, isEmpty: c.isEmpty, revision: c.revision,
    source: "aggTrade", updatedAt: c.updatedAt
  };
};
/* snapshot cronológico crescente: fechados + o candle atual (provisório). */
Aggregator.prototype.snapshot = function(from, to, limit){
  from = from || 0; to = to || Infinity; limit = Math.min(limit || 5000, 5000);
  var out = [];
  for (var i=0;i<this.candles.length;i++){
    var c = this.candles[i];
    if (c.openTime < from || c.openTime > to) continue;
    out.push(this.serialize(c));
  }
  // candle atual (aberto) entra como provisório se dentro da janela
  var opens = Array.from(this.pending.keys()).sort(function(a,b){return a-b;});
  for (var k=0;k<opens.length;k++){
    var oc = this.pending.get(opens[k]);
    if (oc.openTime >= from && oc.openTime <= to) out.push(this.serialize(oc));
  }
  if (out.length > limit) out = out.slice(out.length - limit);
  return out;
};
Aggregator.prototype.current = function(){
  var opens = Array.from(this.pending.keys()).sort(function(a,b){return a-b;});
  if (!opens.length) return null;
  return this.serialize(this.pending.get(opens[opens.length-1]));
};

/* ── Engine: agrupa os aggregators de um símbolo + ingestor + persistência ──── */
function Engine(opts){
  opts = opts || {};
  this.symbol = cleanSym(opts.symbol || "BTCUSDT");
  this.dataDir = opts.dataDir || path.join(__dirname, "data");
  this.emit = opts.emit || function(){};      // (type, payload) p/ broadcast
  this.aggs = {};
  var self = this;
  INTERVALS.forEach(function(iv){
    self.aggs[iv] = new Aggregator(self.symbol, iv, function(type, data){ self.onEngineEvent(type, data); });
  });
  this.dedup = new Set();
  this.dedupQ = [];
  this.status = "OFFLINE";
  this.ws = null; this.wsAlive = false; this.hasBeenLive = false; this.reconnectAttempt = 0; this.reconnectTimer = 0;
  this.lastEventTime = 0; this.lastTradeTime = 0; this.lastAggTradeId = null;
  this.connectedAt = 0; this.reconnects24h = 0; this.duplicates = 0; this.lateEvents = 0;
  this.flushTimer = 0; this.saveTimer = 0; this.staleTimer = 0;
  this.file = path.join(this.dataDir, "subsecond_" + this.symbol + ".json");
  this._dirty = false;
}
Engine.prototype.onEngineEvent = function(type, data){
  // só candle_close/correction mudam o estado persistido; updates são efêmeros.
  if (type === "candle_close" || type === "candle_correction") this._dirty = true;
  try { this.emit(type, data); } catch(_){}
};
Engine.prototype.markDup = function(id){
  this.dedup.add(id); this.dedupQ.push(id);
  if (this.dedupQ.length > DEDUP_MAX){ var old = this.dedupQ.splice(0, this.dedupQ.length - DEDUP_MAX); for (var i=0;i<old.length;i++) this.dedup.delete(old[i]); }
};
/* trade normalizado do aggTrade da Binance: {a,p,q,T,m}. */
Engine.prototype.ingest = function(ev){
  var a = ev.a, price = Number(ev.p), qty = Number(ev.q), T = Number(ev.T);
  if (a == null || !(price > 0) || !(qty > 0) || !(T > 0)) return;
  var key = String(a);
  if (this.dedup.has(key)){ this.duplicates++; return; }   // idempotente
  this.markDup(key);
  var arrival = Date.now();
  this.lastEventTime = Number(ev.E) || arrival;
  this.lastTradeTime = T;
  this.lastAggTradeId = a;
  if (arrival - T > 1000) this.lateEvents++;
  var tr = { a: a, T: T, price: price, qty: qty, buy: ev.m === false };
  for (var i=0;i<INTERVALS.length;i++) this.aggs[INTERVALS[i]].apply(tr);
};
Engine.prototype.flushAll = function(nowT){
  nowT = nowT || Date.now();
  for (var i=0;i<INTERVALS.length;i++){ var a = this.aggs[INTERVALS[i]]; a.flush(nowT); a.tickEmit(); }
};
Engine.prototype.getSnapshot = function(interval, from, to, limit){
  var iv = LABEL_IV[interval]; if (!iv) return null;
  return this.aggs[iv].snapshot(from, to, limit);
};
Engine.prototype.setStatus = function(s){ if (this.status !== s){ this.status = s; this.emit("feed_status", this.health()); } };
Engine.prototype.health = function(){
  var h = { market: MARKET, symbol: this.symbol, status: this.status,
    lastAggTradeId: this.lastAggTradeId, lastTradeTime: this.lastTradeTime, lastEventTime: this.lastEventTime,
    lagMs: this.lastEventTime ? Math.max(0, Date.now() - this.lastTradeTime) : null,
    duplicates: this.duplicates, lateEvents: this.lateEvents, reconnects24h: this.reconnects24h };
  var self = this;
  INTERVALS.forEach(function(iv){ h["open"+IV_LABEL[iv]] = self.aggs[iv].nextOpen; h["metrics_"+IV_LABEL[iv]] = self.aggs[iv].metrics; });
  return h;
};

/* ── Persistência (JSON, seguindo o padrão do server.js) ─────────────────────
   Persistimos apenas os CANDLES fechados recentes (ring) + checkpoint. Raw
   trades de futuros são altíssimo volume: mantemos janela curta em memória p/
   reorder/correção e usamos o REST de aggTrades p/ recovery de buracos (§11.3).*/
Engine.prototype.persist = function(){
  if (!this._dirty) return;
  this._dirty = false;
  try {
    var self = this;
    var payload = { symbol: this.symbol, market: MARKET, savedAt: Date.now(),
      checkpoint: { lastAggTradeId: this.lastAggTradeId, lastTradeTime: this.lastTradeTime },
      candles: {} };
    INTERVALS.forEach(function(iv){
      var a = self.aggs[iv];
      payload.candles[IV_LABEL[iv]] = { nextOpen: a.nextOpen, prevClose: a.prevClose, rows: a.candles.map(function(c){ return a.serialize(c); }) };
    });
    fs.writeFileSync(this.file + ".tmp", JSON.stringify(payload));
    fs.renameSync(this.file + ".tmp", this.file);
  } catch(e){ /* nunca derruba o servidor por persistência */ }
};
Engine.prototype.loadPersisted = function(){
  try {
    if (!fs.existsSync(this.file)) return;
    var payload = JSON.parse(fs.readFileSync(this.file, "utf8"));
    if (!payload || payload.symbol !== this.symbol) return;
    var self = this;
    INTERVALS.forEach(function(iv){
      var slot = payload.candles && payload.candles[IV_LABEL[iv]];
      if (!slot || !Array.isArray(slot.rows)) return;
      var a = self.aggs[iv];
      slot.rows.forEach(function(r){ var c = self.deserialize(r); a.candles.push(c); a.byOpen.set(c.openTime, c); });
      if (a.candles.length > MAX_CANDLES){ a.candles = a.candles.slice(-MAX_CANDLES); }
      a.nextOpen = slot.nextOpen != null ? slot.nextOpen : a.nextOpen;
      a.prevClose = slot.prevClose != null ? Number(slot.prevClose) : a.prevClose;
    });
    if (payload.checkpoint){ this.lastAggTradeId = payload.checkpoint.lastAggTradeId; this.lastTradeTime = payload.checkpoint.lastTradeTime || 0; }
  } catch(e){ /* histórico corrompido não impede boot */ }
};
Engine.prototype.deserialize = function(r){
  return { market:r.market, symbol:r.symbol, interval:r.interval, openTime:r.openTime, closeTime:r.closeTime,
    open:Number(r.open), high:Number(r.high), low:Number(r.low), close:Number(r.close),
    baseVolume:Number(r.baseVolume), quoteVolume:Number(r.quoteVolume),
    takerBuyBase:Number(r.takerBuyBase), takerSellBase:Number(r.takerSellBase),
    takerBuyQuote:Number(r.takerBuyQuote), takerSellQuote:Number(r.takerSellQuote),
    tradeCount:r.tradeCount|0, firstTradeId:r.firstTradeId, lastTradeId:r.lastTradeId,
    _firstT:r.openTime, _lastT:r.closeTime, isClosed:true, isEmpty:!!r.isEmpty, revision:r.revision|0, source:"aggTrade", updatedAt:r.updatedAt||Date.now() };
};

/* ── Ingestor de rede (futuros). Isolado: falha vira OFFLINE/DEGRADED. ──────── */
Engine.prototype.start = function(){
  if (this._started) return; this._started = true;   // idempotente
  this.loadPersisted();
  this.setStatus("BOOTSTRAP");
  var self = this;
  // loop de finalização (não depende do frontend): fecha candles no tempo certo
  this.flushTimer = setInterval(function(){ try { self.flushAll(Date.now()); } catch(_){} }, 200);
  this.saveTimer  = setInterval(function(){ try { self.persist(); } catch(_){} }, SAVE_MS);
  this.staleTimer = setInterval(function(){ try { self.checkStale(); } catch(_){} }, 2000);
  if (this.flushTimer.unref) this.flushTimer.unref();
  if (this.saveTimer.unref) this.saveTimer.unref();
  if (this.staleTimer.unref) this.staleTimer.unref();
  this.backfill().then(function(){ self.connect(); }).catch(function(){ self.connect(); });
};
Engine.prototype.checkStale = function(){
  if (this.status === "LIVE" && this.lastEventTime && Date.now() - this.lastEventTime > STALE_MS){
    this.setStatus("STALE");
  }
};
Engine.prototype.connect = function(){
  var self = this;
  var url = FUT_WS_BASE + "/" + this.symbol.toLowerCase() + "@aggTrade";
  var ws;
  try { ws = new WebSocket(url); } catch(e){ this.setStatus("OFFLINE"); this.scheduleReconnect(); return; }
  this.ws = ws;
  ws.on("open", function(){
    self.connectedAt = Date.now(); self.reconnectAttempt = 0; self.wsAlive = true; self.hasBeenLive = true;
    self.setStatus("LIVE");
  });
  ws.on("message", function(m){ try { self.lastEventTime = Date.now(); self.ingest(JSON.parse(m)); } catch(_){} });
  ws.on("close", function(){ try { self.wsAlive = false; if (self.status !== "OFFLINE") self.setStatus("RECONNECTING"); self.scheduleReconnect(); } catch(_){} });
  ws.on("error", function(){ try { ws.close(); } catch(_){} });
};
Engine.prototype.scheduleReconnect = function(){
  var self = this;
  clearTimeout(this.reconnectTimer);
  this.reconnectAttempt++;
  this.reconnects24h++;
  var base = Math.min(30000, 1000 * Math.pow(2, Math.min(6, this.reconnectAttempt)));
  var jitter = Math.floor(Math.random() * 500);
  // Só faz o backfill pesado (120min) quando já esteve LIVE (buraco real). Se
  // nunca conectou (futuros inacessível no host), apenas tenta reconectar —
  // evita marteladas de REST enquanto o feed não sobe.
  this.reconnectTimer = setTimeout(function(){
    if (self.hasBeenLive){ self.backfill().then(function(){ self.connect(); }).catch(function(){ self.connect(); }); }
    else { self.connect(); }
  }, base + jitter);
  if (this.reconnectTimer.unref) this.reconnectTimer.unref();
};
/* recovery de buraco: puxa aggTrades recentes via REST de futuros e reprocessa
   (dedupe evita duplicar). Limitado por rate/quantidade. §11.3. */
Engine.prototype.backfill = async function(){
  var self = this;
  if (typeof fetch !== "function") return;
  var since = this.lastTradeTime ? Math.max(this.lastTradeTime, Date.now() - BACKFILL_MINUTES_MAX*60000) : (Date.now() - 3*60000);
  var endTime = Date.now();
  if (endTime - since < 1500) return;   // nada relevante a preencher
  this.setStatus(this.status === "BOOTSTRAP" ? "BOOTSTRAP" : "RESYNC");
  var start = since, loops = 0, added = 0;
  try {
    while (start < endTime && loops < 24){
      loops++;
      var url = FUT_REST + "/fapi/v1/aggTrades?symbol=" + this.symbol + "&startTime=" + start + "&endTime=" + Math.min(endTime, start + 55000) + "&limit=1000";
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var arr = await res.json();
      if (!Array.isArray(arr) || !arr.length){ start += 55000; continue; }
      for (var i=0;i<arr.length;i++){ this.ingest(arr[i]); added++; }
      var lastT = Number(arr[arr.length-1].T);
      if (!(lastT > start)) start += 55000; else start = lastT + 1;
      if (arr.length < 1000 && start < endTime){ /* alcançou o presente do trecho */ }
    }
    this.flushAll(Date.now());
    // só declara LIVE quando o socket estiver de fato aberto (connect faz isso)
    if (this.status === "RESYNC" && this.wsAlive) this.setStatus("LIVE");
  } catch(e){
    // sem prova de continuidade → DEGRADED, mas não trava o boot
    if (this.status === "BOOTSTRAP" || this.status === "RESYNC") this.setStatus("DEGRADED");
  }
};
Engine.prototype.stop = function(){
  clearInterval(this.flushTimer); clearInterval(this.saveTimer); clearInterval(this.staleTimer); clearTimeout(this.reconnectTimer);
  try { if (this.ws) this.ws.close(); } catch(_){}
  this.persist();
};

/* ── Registro de engines por símbolo ─────────────────────────────────────── */
const engines = {};
function ensureEngine(symbol, emit, dataDir){
  symbol = cleanSym(symbol);
  if (engines[symbol]) return engines[symbol];
  var e = new Engine({ symbol: symbol, emit: emit, dataDir: dataDir });
  engines[symbol] = e;
  return e;
}
function getEngine(symbol){ return engines[cleanSym(symbol)] || null; }
function startDefault(emit, dataDir, symbols){
  (symbols || ["BTCUSDT"]).forEach(function(s){ var e = ensureEngine(s, emit, dataDir); e.start(); });
}
function healthAll(){ var out = {}; for (var s in engines) out[s] = engines[s].health(); return out; }

module.exports = {
  MARKET, INTERVALS, IV_LABEL, LABEL_IV,
  Aggregator, Engine, ensureEngine, getEngine, startDefault, healthAll,
  _internal: { dec, cleanSym, REORDER_MS, REVISION_MS, MAX_CANDLES }
};
