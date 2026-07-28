"use strict";

/* ── DVL Scanner server: REST snapshot + WebSocket live feed ─────────
   GET  /api/dvl/scanner/snapshot?exchange=binance|mexc&tf=1m|3m|5m|15m|30m|1h
   WS   /ws/dvl/scanner?exchange=binance|mexc&tf=...
   GET  /api/dvl/scanner/health
   POST /api/dvl/scanner/config        (Filtros: weights / engine params / OI-LSR MA lengths)
   POST /api/dvl/scanner/manual-trade  (log a user-opened position as an ML training example)
   GET  /api/dvl/scanner/history?symbol=X  (every recorded signal for one symbol, for chart markers)
   GET  /api/dvl/scanner/live-reading?symbol=X&tf=Y  (current OI/LSR/RSI/spike reading for ANY symbol)
   GET  /api/dvl/scanner/tickers?exchange=binance|mexc  (top-by-24h-volume candidates, server-fetched — see worker.getCandidates)
   GET  /api/dvl/scanner/mexc-price    (fresh MEXC last-price map, for Fast Bots' Bot 4 to check its own open positions)
   GET  /api/dvl/scanner/mexc-atr?symbol=X&tf=Y  (14-period ATR for one MEXC symbol, Fast Bots' fallback stop distance)
   This server is READ-ONLY re: trading: it never places or routes trades —
   manual-trade only LOGS a position the user already opened elsewhere in
   the app; it doesn't open, close, or touch anything itself. */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const cfg = require("./config");
const worker = require("./worker");
const { mexc } = require("./exchanges");
const M = require("./metrics");
const oiStore = require("./oiStore");
const vrsiStore = require("./vrsiStore");
const paperBot = require("./paperBot");
const bubbleHistory = require("./bubbleHistory");
const vpAlerts = require("./vpAlerts");
const gexLevels = require("./gexLevels");

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

  /* FULL scanned universe (every candidate, not just ignited signals) for the
     Scanner Pro's full ranked table. The browser can't scan MEXC itself
     (contract.mexc.com is blocked from the page), so it reads this to show
     the whole MEXC table server-side. Distinct from /snapshot, which is the
     ignited-signal registry the Fast Bots consume. */
  app.get("/api/dvl/scanner/universe", (req, res) => {
    res.json(Object.assign({ ok: true }, worker.getUniverse(normExchange(req.query.exchange), normTf(req.query.tf))));
  });

  /* Top-by-volume candidates, already fetched server-side every cycle (see
     worker.js's _lastCands) — exists so the browser can source a symbol
     universe (e.g. Fast Bots' Bot 4) without calling the exchange's own
     REST API directly, which for MEXC's contract API is blocked from
     browser origins in practice. */
  app.get("/api/dvl/scanner/tickers", (req, res) => {
    const exchange = normExchange(req.query.exchange);
    res.json({ ok: true, exchange, tickers: worker.getCandidates(exchange) });
  });

  /* Fresh (not cycle-cached) MEXC prices — Bot 4's own position exits need
     current data, unlike the top-volume list above which tolerates being
     up to one scan cycle (REFRESH_MS) stale. */
  app.get("/api/dvl/scanner/mexc-price", (req, res) => {
    mexc.prices()
      .then(prices => res.json({ ok: true, prices }))
      .catch(e => res.json({ ok: false, prices: {}, error: e.message }));
  });

  /* On-demand ATR for one MEXC symbol — Bot 4's entry-time fallback when
     _atrCache has nothing cached for it. Same 14-period formula worker.js
     already uses for every scanned candidate (M.computeAtr), just fetched
     for a symbol that may not currently be in the scan cycle's candidate
     list at all. */
  app.get("/api/dvl/scanner/mexc-atr", (req, res) => {
    const symbol = String(req.query.symbol || "");
    const tf = normTf(req.query.tf);
    if (!symbol) { res.json({ ok: false, atr: null, error: "missing symbol" }); return; }
    mexc.klines(symbol, tf)
      .then(k => res.json({ ok: true, atr: M.computeAtr(k.ohlc || [], 14) }))
      .catch(e => res.json({ ok: false, atr: null, error: e.message }));
  });

  /* Chart failover: MEXC OHLCV for one symbol, returned as Binance-shaped
     kline rows so the in-page chart consumes it as a drop-in when Binance is
     off/geo-banned. The browser can't reach contract.mexc.com directly, so it
     proxies through here. `symbol` is MEXC form ("BTC_USDT"); `tf` is the
     chart timeframe; `limit` the candle count. See mexc.klinesChart. */
  app.get("/api/dvl/scanner/mexc-klines", (req, res) => {
    const symbol = String(req.query.symbol || "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    // Chart TF is passed through as-is (not normalized to the scanner's TF_LIST) —
    // the chart also charts 4h/1d and resample base intervals; klinesChart itself
    // rejects anything MEXC has no native candle for.
    const tf = String(req.query.tf || "15m").replace(/[^a-zA-Z0-9]/g, "");
    const limit = Number(req.query.limit) || 500;
    if (!symbol) { res.json({ ok: false, rows: [], error: "missing symbol" }); return; }
    mexc.klinesChart(symbol, tf, limit)
      .then(rows => res.json({ ok: true, symbol, tf, rows }))
      .catch(e => res.json({ ok: false, symbol, tf, rows: [], error: e.message }));
  });

  /* Chart oscillators for MEXC-only assets: real OI series (sampled from
     MEXC holdVol over time) + a funding-rate sentiment PROXY for Long/Short
     (MEXC has no real long/short ratio; funding is a clearly-labelled proxy).
     Both grow forward from when the backend started sampling. `symbol` may be
     MEXC ("ANSEM_USDT") or Binance ("ANSEMUSDT") form. */
  app.get("/api/dvl/scanner/mexc-derivs", (req, res) => {
    const symbol = String(req.query.symbol || "");
    if (!symbol) { res.json({ ok: false, oi: [], funding: [], error: "missing symbol" }); return; }
    const base = worker.getMexcDerivs(symbol); // { symbol, oi:[], funding:[], updatedAt }
    /* OI can only grow forward (MEXC has no historical OI endpoint), but
       funding IS published historically — backfill it so the Long/Short proxy
       has real depth immediately instead of a single live point. Falls back to
       the live-sampled funding if the history call fails. */
    mexc.fundingHistory(base.symbol, 3)
      .then(fh => res.json(Object.assign({ ok: true, proxy: "funding" }, base,
        fh.length ? { funding: fh, fundingSource: "history" } : { fundingSource: "sampled" })))
      .catch(() => res.json(Object.assign({ ok: true, proxy: "funding", fundingSource: "sampled" }, base)));
  });

  /* DVL Open Interest candles for one MEXC symbol, aggregated on demand into
     the requested timeframe from the holdVol snapshots oiStore samples. `unit`
     is contracts | base | usdt (base/usdt need the symbol's contractSize; if
     unknown, falls back to contracts and says so in `unit`). History grows
     forward from when sampling started — closed candles are immutable. */
  app.get("/api/dvl/scanner/mexc-oi", (req, res) => {
    const symbol = String(req.query.symbol || "");
    if (!symbol) { res.json({ ok: false, candles: [], error: "missing symbol" }); return; }
    const tf = String(req.query.tf || "5m").replace(/[^a-zA-Z0-9]/g, "");
    const unit = String(req.query.unit || "contracts");
    const limit = Number(req.query.limit) || 600;
    const r = oiStore.getCandles(symbol, tf, unit, limit);
    res.json(Object.assign({ ok: true, snaps: oiStore.snapCount(symbol) }, r));
  });

  app.post("/api/dvl/scanner/config", (req, res) => {
    worker.setEngineConfig(req.body || {});
    res.json({ ok: true, engine: cfg.ENGINE, weights: cfg.WEIGHTS, oiMaLen: cfg.OI_MA_LEN, lsrMaLen: cfg.LSR_MA_LEN, exr: cfg.EXR });
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

  app.get("/api/dvl/scanner/health", (req, res) => {
    const b = worker.getSnapshot("binance", cfg.SCAN_TF), m = worker.getSnapshot("mexc", cfg.SCAN_TF);
    res.json({
      ok: true,
      safety: cfg.SAFETY,                 // bot execution stays disabled
      tfList: cfg.TF_LIST,
      binance: { rows: b.rows.length, updatedAt: b.updatedAt, fallback: b.fallback, activeSource: b.activeSource },
      mexc: { rows: m.rows.length, updatedAt: m.updatedAt },
    });
  });

  /* VP + RSI-V adaptive model — the new ML. Learned combos per TF (1m/5m):
     which VP session, zone, proximity, RSI-vzinho threshold, ATR stop and
     take-profit (POC vs fixed) generalise out-of-sample. */
  app.get("/api/dvl/scanner/vrsi-model", (req, res) => {
    try { res.json(Object.assign({ ok: true }, vrsiStore.status())); }
    catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
  });

  /* Financial backtest of the learned VP+RSI-V combos (long+short) for a TF —
     $1000, fixed-fractional risk, compounding. Query: tf=1m|5m (default 1m). */
  app.get("/api/dvl/scanner/vrsi-backtest", (req, res) => {
    try {
      const tf = vrsiStore.TFS.includes(String(req.query.tf)) ? String(req.query.tf) : "1m";
      res.json(Object.assign({ ok: true, tf }, vrsiStore.backtest(tf)));
    } catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
  });

  /* Paper bot (the Market Matrix engine) — the walk-forward simulated account
     trading the learned VP+RSI-V combo across the top-N assets, with fees +
     slippage. 100% simulated. Returns account/return/drawdown, per-asset
     leaderboard, recent trades and the equity curve. */
  app.get("/api/dvl/scanner/bot-state", (req, res) => {
    try { res.json(Object.assign({ ok: true }, paperBot.status())); }
    catch (e) { res.status(500).json({ ok: false, error: String(e && e.message || e) }); }
  });

  /* DVL Bubbles history: ~2h of aggregated flow (1s-kline based) so the overlay
     starts populated. Server-side fetch avoids the browser's Binance geo-block. */
  app.get("/api/dvl/bubbles/history", async (req, res) => {
    try { res.json(Object.assign({ ok: true }, await bubbleHistory.history(req.query.symbol, req.query.mins))); }
    catch (e) { res.json({ ok: false, error: String(e && e.message || e), groups: [] }); }
  });

  // ── Alertas VP (Telegram, vigiados no backend) ──
  app.get("/api/dvl/vpalerts/status", (req, res) => {
    try { res.json(vpAlerts.status()); }
    catch (e) { res.json({ ok: false, error: String(e && e.message || e) }); }
  });
  app.post("/api/dvl/vpalerts/config", (req, res) => {
    try { res.json({ ok: true, config: vpAlerts.setConfig(req.body || {}) }); }
    catch (e) { res.json({ ok: false, error: String(e && e.message || e) }); }
  });
  app.post("/api/dvl/vpalerts/test", async (req, res) => {
    try { if (req.body && Object.keys(req.body).length) vpAlerts.setConfig(req.body); res.json(await vpAlerts.testPush()); }
    catch (e) { res.json({ ok: false, error: String(e && e.message || e) }); }
  });
  app.post("/api/dvl/vpalerts/discover", async (req, res) => {
    try { res.json(await vpAlerts.discoverChatId(req.body && req.body.tgToken)); }
    catch (e) { res.json({ ok: false, error: String(e && e.message || e) }); }
  });

  // ── DVL GEX Levels (proxy same-origin p/ GEX Monitor) ──
  app.get("/api/dvl/gex-levels", async (req, res) => {
    try {
      res.json(await gexLevels.getLevels(req.query.asset));
    } catch (e) {
      const http = e && e.http ? e.http : 503;
      const code = (e && e.code) || "GEX_UPSTREAM_UNAVAILABLE";
      res.status(http).json({
        ok: false,
        asset: (e && e.asset) || (gexLevels.symbolToAsset(req.query.asset) || null),
        code,
        message: code === "ASSET_NOT_SUPPORTED" ? "Asset not supported (BTC, ETH, SOL)" : "GEX data is temporarily unavailable",
        stale: true, availability: "missing"
      });
    }
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
    if (pathname === "/ws/dvl/scanner") {
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
      return;
    }
    socket.destroy();
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
