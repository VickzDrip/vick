"use strict";

/* ── DVL Scanner server: REST snapshot + WebSocket live feed ─────────
   GET  /api/dvl/scanner/snapshot?exchange=binance|mexc&tf=1m|3m|5m|15m|30m|1h
   WS   /ws/dvl/scanner?exchange=binance|mexc&tf=...
   GET  /api/dvl/scanner/health
   POST /api/dvl/scanner/config   (Filtros: weights / engine params / OI-LSR MA lengths)
   This server is READ-ONLY re: trading: it never places or routes trades. */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const cfg = require("./config");
const worker = require("./worker");

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

  app.get("/api/dvl/scanner/health", (req, res) => {
    const b = worker.getSnapshot("binance", cfg.SCAN_TF), m = worker.getSnapshot("mexc", cfg.SCAN_TF);
    res.json({
      ok: true,
      safety: cfg.SAFETY,                 // bot execution stays disabled
      tfList: cfg.TF_LIST,
      binance: { rows: b.rows.length, updatedAt: b.updatedAt, fallback: b.fallback, activeSource: b.activeSource },
      mexc: { rows: m.rows.length, updatedAt: m.updatedAt }
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
