"use strict";

/* ── MEXC live trade-stream relay ──────────────────────────────────
   Fast Bots' Bot 4 (frontend) needs MEXC's live aggressive-trade feed to
   react within seconds, but a browser connecting straight to MEXC's own
   WebSocket (wss://contract.mexc.com/ws) never stays connected in
   production — same class of problem the REST endpoints in server.js
   already work around (see exchanges.js's doc-comment on why exchange
   calls live server-side at all). This module is the one persistent,
   server-to-server connection this whole app keeps to that stream; every
   browser client gets its trades relayed over OUR OWN WebSocket endpoint
   instead (server.js's "/ws/dvl/agg"), so nothing in the browser ever
   talks to contract.mexc.com directly.

   Subscribes to MEXC's own "sub.deal" channel for whatever
   worker.getCandidates("mexc") currently considers the top-by-volume
   universe (same list /api/dvl/scanner/tickers exposes) — capped at
   MAX_SYMBOLS so one connection doesn't try to track everything MEXC
   lists. Re-subscribes (only the newly-added symbols, additively) each
   time that candidate list is checked; a full reconnect always starts a
   clean subscription set.

   NOTE on confidence: the REST shapes elsewhere in this backend
   (exchanges.js) are proven in production. This WS message shape
   (channel "push.deal", data.T 1=buy/2=sell) is implemented from
   best-available documentation and verified here only against a mocked
   MEXC-shaped server in tests — not a live connection, which nothing in
   this sandbox can reach. Watch the logs after deploy: repeated
   reconnects with zero trades ever parsed would mean this shape is off. */

const WebSocket = require("ws");
const worker = require("./worker");

const MEXC_WS_URL = "wss://contract.mexc.com/ws";
const RECONNECT_MS = 5000;
const PING_MS = 15000;
const RESUBSCRIBE_CHECK_MS = 10000;
const MAX_SYMBOLS = 100;

let _ws = null;
let _pingTimer = null;
let _resubTimer = null;
let _reconnectTimer = null;
let _subscribed = [];
let _connected = false;
let _onTrade = () => {};
let _getSymbols = () => worker.getCandidates("mexc").map(c => c.sym);
let _url = MEXC_WS_URL;
let _reconnectMs = RECONNECT_MS;
let _started = false;

/* onTrade and every field of opts are injectable so tests can run this
   against a fake local WS server + fake candidate list (with fast
   resubscribe/reconnect intervals) instead of the real MEXC connection and
   worker.js's live scan cycle. */
function start(onTrade, opts) {
  if (_started) return;
  _started = true;
  opts = opts || {};
  _onTrade = typeof onTrade === "function" ? onTrade : () => {};
  if (typeof opts.getSymbols === "function") _getSymbols = opts.getSymbols;
  if (opts.url) _url = opts.url;
  if (opts.reconnectMs) _reconnectMs = opts.reconnectMs;
  connect();
  _resubTimer = setInterval(maybeResubscribe, opts.resubscribeMs || RESUBSCRIBE_CHECK_MS);
}

function stop() {
  _started = false;
  clearInterval(_resubTimer);
  clearInterval(_pingTimer);
  clearTimeout(_reconnectTimer);
  try { if (_ws) _ws.terminate(); } catch (_) { /* ignore */ }
  _ws = null;
  _connected = false;
  _subscribed = [];
  _url = MEXC_WS_URL;
  _reconnectMs = RECONNECT_MS;
  _getSymbols = () => worker.getCandidates("mexc").map(c => c.sym);
}

function connect() {
  if (!_started) return;
  try { if (_ws) { _ws.removeAllListeners(); _ws.terminate(); } } catch (_) { /* ignore */ }
  clearInterval(_pingTimer);
  _connected = false;
  _subscribed = [];
  let ws;
  try { ws = new WebSocket(_url); } catch (_) { scheduleReconnect(); return; }
  _ws = ws;

  ws.on("open", () => {
    _connected = true;
    maybeResubscribe();
    _pingTimer = setInterval(() => {
      try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" })); } catch (_) { /* ignore */ }
    }, PING_MS);
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (!msg || msg.channel !== "push.deal" || !msg.symbol || !msg.data) return;
      const price = Number(msg.data.p), qty = Number(msg.data.v);
      if (!(price > 0) || !(qty > 0)) return;
      _onTrade({ symbol: String(msg.symbol).toUpperCase(), price, qty, buy: Number(msg.data.T) === 1 });
    } catch (_) { /* ignore malformed pushes */ }
  });

  ws.on("close", () => { _connected = false; clearInterval(_pingTimer); scheduleReconnect(); });
  ws.on("error", () => { _connected = false; });
}

function scheduleReconnect() {
  if (!_started) return;
  clearTimeout(_reconnectTimer);
  _reconnectTimer = setTimeout(connect, _reconnectMs);
}

/* Additive: only sends sub.deal for symbols not already subscribed this
   connection — MEXC's own idempotency for repeat subscribes is untested,
   so avoiding resending known ones is the safer default either way. */
function maybeResubscribe() {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  const cands = (_getSymbols() || []).filter(Boolean).slice(0, MAX_SYMBOLS);
  const known = new Set(_subscribed);
  const fresh = cands.filter(s => !known.has(s));
  if (!fresh.length) return;
  fresh.forEach(sym => {
    try { _ws.send(JSON.stringify({ method: "sub.deal", param: { symbol: sym } })); } catch (_) { /* ignore */ }
  });
  _subscribed = _subscribed.concat(fresh);
}

function isConnected() { return _connected; }
function getSubscribed() { return _subscribed.slice(); }

module.exports = { start, stop, isConnected, getSubscribed };
