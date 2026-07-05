"use strict";

/* ── DVL Scanner server: REST snapshot + WebSocket live feed ─────────
   GET  /api/dvl/scanner/snapshot?exchange=binance|mexc&tf=1m|3m|5m|15m|30m|1h
   WS   /ws/dvl/scanner?exchange=binance|mexc&tf=...
   GET  /api/dvl/scanner/health
   POST /api/dvl/scanner/config        (Filtros: weights / engine params / OI-LSR MA lengths)
   POST /api/dvl/scanner/manual-trade  (log a user-opened position as an ML training example)
   GET  /api/dvl/scanner/history?symbol=X  (every recorded signal for one symbol, for chart markers)
   GET  /api/dvl/scanner/live-reading?symbol=X&tf=Y  (current OI/LSR/RSI/spike reading for ANY symbol)
   GET  /api/dvl/scanner/backtest      (financial backtest: win rate / avg return, all signals vs model-favorable)
   This server is READ-ONLY re: trading: it never places or routes trades —
   manual-trade only LOGS a position the user already opened elsewhere in
   the app; it doesn't open, close, or touch anything itself. */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const cfg = require("./config");
const worker = require("./worker");
const analyze = require("./analyze");

function normExchange(q) { return q === "mexc" ? "mexc" : "binance"; }
function normTf(q) { return cfg.TF_LIST.indexOf(q) >= 0 ? q : cfg.SCAN_TF; }

function createServer() {
  const app = express();
  app.use(express.json());

  /* CORS — the HTML is served from depthvisionlab.com; allow it to read. */
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/api/dvl/scanner/snapshot", (req, res) => {
    res.json(worker.getSnapshot(normExchange(req.query.exchange), normTf(req.query.tf)));
  });

  app.post("/api/dvl/scanner/config", (req, res) => {
    worker.setEngineConfig(req.body || {});
    res.json({ ok: true, engine: cfg.ENGINE, weights: cfg.WEIGHTS, oiMaLen: cfg.OI_MA_LEN, lsrMaLen: cfg.LSR_MA_LEN });
  });

  /* Manual trades (opened by hand in the app's Trade tab, not a scanner
     detection) become ML training examples too — see worker.recordManualTrade.
     Best-effort: always 200s so a slow/unreachable backend never surfaces as
     an error in the trading UI; failures are logged server-side only. */
  app.post("/api/dvl/scanner/manual-trade", (req, res) => {
    const body = req.body || {};
    const symbol = String(body.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const side = body.side === "SHORT" ? "SHORT" : "LONG";
    const entryPrice = Number(body.entryPrice);
    const at = Number(body.at) || Date.now();
    if (!symbol || !(entryPrice > 0)) { res.json({ ok: false, error: "missing symbol/entryPrice" }); return; }
    worker.recordManualTrade(symbol, side, entryPrice, at)
      .then(() => res.json({ ok: true }))
      .catch(e => { console.error("[manual-trade]", symbol, e.message); res.json({ ok: false, error: e.message }); });
  });

  /* Every recorded signal (resolved + still-pending, auto-detected and
     manual) for one symbol — the raw material for plotting markers on that
     symbol's own chart. `combo` (e.g. "O+P") is added here, computed from
     the same BLOCK_LABELS analyze.js's --combo CLI flag uses, so a chart
     filter chip can match this field directly against the same letters. */
  app.get("/api/dvl/scanner/history", (req, res) => {
    const symbol = String(req.query.symbol || "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    if (!symbol) { res.json({ ok: false, error: "missing symbol", rows: [] }); return; }
    const rows = worker.getSymbolHistory(symbol).map(e => Object.assign({ combo: e.blocks ? analyze.comboKey(e.blocks) : null }, e));
    res.json({ ok: true, symbol, rows });
  });

  /* Read-only "how does this look RIGHT NOW" reading for ANY symbol — not
     gated by the scanner ever having flagged it, never logged anywhere.
     Powers the on-chart live labels (OI subindo/caindo, LSR subindo/caindo,
     RSI recuperando, spike pós-flat) for whatever asset is currently open,
     mirroring the same reading the user already does by eye. */
  app.get("/api/dvl/scanner/live-reading", (req, res) => {
    const symbol = String(req.query.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tf = normTf(req.query.tf);
    if (!symbol) { res.json({ ok: false, error: "missing symbol" }); return; }
    worker.computeLiveReading(symbol, tf)
      .then(row => res.json({
        ok: true, symbol, tf,
        side: row.side, price: row.price, score: row.spikeScore, status: row.status, blocks: row.blocks,
        oi: row.oi, oiColor: row.oiColor, oiSlope: row.oiSlope,
        lsr: row.lsr, lsrColor: row.lsrColor, lsrSlope: row.lsrSlope,
        rsi14: row.rsi14, rsiRecoveryFromLow: row.rsiRecoveryFromLow, rsiOversoldOk: row.rsiOversoldOk,
        flatCandles: row.flatCandles, prevVolBelowHalf: row.prevVolBelowHalf, spike20: row.spike20, spike50: row.spike50
      }))
      .catch(e => { console.error("[live-reading]", symbol, e.message); res.json({ ok: false, error: e.message }); });
  });

  /* Financial backtest — how the model's calls would have actually paid
     off (win rate / avg / total return), not just accuracy — on the SAME
     temporal test split trainSide() already reports accuracy for. See
     backtest.js's doc-comment for why it re-fits instead of reusing the
     persisted learned-weights.json. */
  app.get("/api/dvl/scanner/backtest", (req, res) => {
    res.json({ ok: true, ...worker.getBacktestStats() });
  });

  app.get("/api/dvl/scanner/health", (req, res) => {
    const b = worker.getSnapshot("binance", cfg.SCAN_TF), m = worker.getSnapshot("mexc", cfg.SCAN_TF);
    res.json({
      ok: true,
      safety: cfg.SAFETY,                 // bot execution stays disabled
      tfList: cfg.TF_LIST,
      binance: { rows: b.rows.length, updatedAt: b.updatedAt, fallback: b.fallback, activeSource: b.activeSource },
      mexc: { rows: m.rows.length, updatedAt: m.updatedAt },
      outcomes: worker.getOutcomesStats()  // ML groundwork: pending/resolved labeled signals
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  /* Track sockets by the exchange they subscribed to. */
  const clients = new Set();

  server.on("upgrade", (req, socket, head) => {
    let pathname, exchange, tf;
    try {
      const u = new URL(req.url, "http://localhost");
      pathname = u.pathname;
      exchange = normExchange(u.searchParams.get("exchange"));
      tf = normTf(u.searchParams.get("tf"));
    } catch (_) { socket.destroy(); return; }
    if (pathname !== "/ws/dvl/scanner") { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws._dvlExchange = exchange;
      ws._dvlTf = tf;
      clients.add(ws);
      ws.on("close", () => clients.delete(ws));
      ws.on("error", () => clients.delete(ws));
      /* Send the current snapshot immediately on connect. */
      const snap = worker.getSnapshot(exchange, tf);
      safeSend(ws, { type: "scanner:update", exchange, tf, updatedAt: snap.updatedAt, fallback: snap.fallback, activeSource: snap.activeSource, rows: snap.rows });
    });
  });

  /* Broadcast worker changes to subscribers of that exchange + timeframe. */
  worker.onChange((exchange, tf, snap) => {
    const msg = { type: "scanner:update", exchange, tf, updatedAt: snap.updatedAt, fallback: snap.fallback, activeSource: snap.activeSource, rows: snap.rows };
    for (const ws of clients) {
      if (ws._dvlExchange === exchange && ws._dvlTf === tf && ws.readyState === ws.OPEN) safeSend(ws, msg);
    }
  });

  return { server, app, wss, clients };
}

function safeSend(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch (_) {} }

module.exports = { createServer };
