"use strict";

/* ── DVL Scanner server: REST snapshot + WebSocket live feed ─────────
   GET  /api/dvl/scanner/snapshot?exchange=binance|mexc
   WS   /ws/dvl/scanner?exchange=binance|mexc
   GET  /api/dvl/scanner/health
   This server is READ-ONLY: it never places or routes trades. */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const cfg = require("./config");
const worker = require("./worker");

function normExchange(q) { return q === "mexc" ? "mexc" : "binance"; }

function createServer() {
  const app = express();

  /* CORS — the HTML is served from depthvisionlab.com; allow it to read. */
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/api/dvl/scanner/snapshot", (req, res) => {
    res.json(worker.getSnapshot(normExchange(req.query.exchange)));
  });

  app.get("/api/dvl/scanner/health", (req, res) => {
    const b = worker.getSnapshot("binance"), m = worker.getSnapshot("mexc");
    res.json({
      ok: true,
      safety: cfg.SAFETY,                 // bot execution stays disabled
      binance: { rows: b.rows.length, updatedAt: b.updatedAt, fallback: b.fallback, activeSource: b.activeSource },
      mexc: { rows: m.rows.length, updatedAt: m.updatedAt }
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  /* Track sockets by the exchange they subscribed to. */
  const clients = new Set();

  server.on("upgrade", (req, socket, head) => {
    let pathname, exchange;
    try {
      const u = new URL(req.url, "http://localhost");
      pathname = u.pathname;
      exchange = normExchange(u.searchParams.get("exchange"));
    } catch (_) { socket.destroy(); return; }
    if (pathname !== "/ws/dvl/scanner") { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws._dvlExchange = exchange;
      clients.add(ws);
      ws.on("close", () => clients.delete(ws));
      ws.on("error", () => clients.delete(ws));
      /* Send the current snapshot immediately on connect. */
      const snap = worker.getSnapshot(exchange);
      safeSend(ws, { type: "scanner:update", exchange, updatedAt: snap.updatedAt, fallback: snap.fallback, activeSource: snap.activeSource, rows: snap.rows });
    });
  });

  /* Broadcast worker changes to subscribers of that exchange. */
  worker.onChange((exchange, snap) => {
    const msg = { type: "scanner:update", exchange, updatedAt: snap.updatedAt, fallback: snap.fallback, activeSource: snap.activeSource, rows: snap.rows };
    for (const ws of clients) {
      if (ws._dvlExchange === exchange && ws.readyState === ws.OPEN) safeSend(ws, msg);
    }
  });

  return { server, app, wss, clients };
}

function safeSend(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch (_) {} }

module.exports = { createServer };
