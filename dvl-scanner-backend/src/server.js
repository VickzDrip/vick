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
const analyze = require("./analyze");
const { mexc } = require("./exchanges");
const M = require("./metrics");
const oiStore = require("./oiStore");
const pumpModel = require("./pumpModel");
const pumpBacktest = require("./pumpBacktest");
const annualBacktest = require("./annualBacktest");

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

  /* Pré-pump / pré-short model status — how many resolved samples it has, and
     whether it's trained enough to predict expected up/down moves (in ATR). */
  app.get("/api/dvl/scanner/pump-model", (req, res) => {
    res.json(Object.assign({ ok: true }, pumpModel.status()));
  });

  /* Financial backtest: replays the model's predicted direction over every
     resolved signal that has a stored price path, simulating a $1000 account
     with fixed-fractional risk + an ATR bracket, and sweeps the take-profit to
     estimate the best exit. In-sample estimate — never a live order. Query:
     account0, riskPct, slAtr, minConv override the defaults. */
  app.get("/api/dvl/scanner/pump-backtest", (req, res) => {
    const st = pumpModel.status();
    const all = pumpModel.getDataset();
    /* "Só sinais completos": restrict everything to the new-format signals that
       carry the EXR/RSI reading (they also carry the exact price path). Nothing
       is deleted — this is a reversible VIEW, not a reset. */
    const onlyComplete = String(req.query.onlyComplete || "") === "1";
    const complete = all.filter(s => s && Array.isArray(s.exrCloses) && s.exrCloses.length);
    const data = onlyComplete ? complete : all;
    const withPath = data.filter(s => s && Array.isArray(s.path) && s.path.length).length;
    /* Gate mínimo. No modo "só sinais completos" os completos acumulam devagar
       (só sinais de 15m que já RESOLVERAM, ~5h depois do disparo), então deixamos
       rodar em modo PRELIMINAR a partir de PRELIM — resultado com aviso de
       amostra pequena — em vez de travar em "aguardando". Sem o filtro, segue
       exigindo MIN (a amostra grande dá resultado confiável). */
    const MIN = 20, PRELIM = 8;
    const gate = onlyComplete ? PRELIM : MIN;
    const preliminary = onlyComplete && data.length < MIN;
    if (!st.trained || data.length < gate) {
      return res.json({ ok: true, ready: false, trained: !!st.trained, samples: data.length,
                        onlyComplete, completeN: complete.length, totalN: all.length, need: gate });
    }
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    /* Realistic trading cost per side, as PERCENT of notional: taker fee +
       slippage. MEXC USDT-perp fees are Maker 0.00% / Taker 0.02% — a spike
       entry is a taker, so 0.02%/side. Slippage on a market fill adds a bit.
       Round-trip cost fraction = 2 × (fee + slip) / 100. Tunable via query. */
    const feePct = Math.max(0, num(req.query.feePct, 0.02));   // per side (MEXC taker)
    const slipPct = Math.max(0, num(req.query.slipPct, 0.02)); // per side
    const costFrac = 2 * (feePct + slipPct) / 100;
    const base = {
      account0: num(req.query.account0, 1000),
      riskPct: Math.min(0.2, Math.max(0.001, num(req.query.riskPct, 0.01))),
      costFrac
    };
    const predict = pumpModel.predictFeatures;
    /* Different RISK MODES — one SL/TP profile is never right for everything.
       Each is a fixed stop with its own take-profit search grid; evaluate()
       learns the best TP + conviction gate per mode (net of costs). */
    const MODES = [
      { key: "scalp", label: "Scalp", slAtr: 0.8, tpGrid: [1, 1.5, 2, 2.5] },
      { key: "normal", label: "Equilibrado", slAtr: 1.2, tpGrid: [1.5, 2, 3, 4] },
      { key: "runner", label: "Runner", slAtr: 2.0, tpGrid: [3, 4, 5, 6, 8] },
      /* Adaptive: fixed initial stop, ATR trailing exit (needs the price path). */
      { key: "adapt", label: "Adaptativo", slAtr: 1.5, trail: true, trailGrid: [0.5, 1, 1.5, 2, 2.5, 3] }
    ];
    const sideOk = r => (r.returnPct > 0 && r.expectancyAtr > 0);
    const evals = MODES.map(m => ({
      m, e: pumpBacktest.evaluate(data, predict, Object.assign({}, base,
        m.trail ? { slAtr: m.slAtr, trail: true, trailGrid: m.trailGrid } : { slAtr: m.slAtr, tpGrid: m.tpGrid }))
    }));
    const modes = evals.map(({ m, e }) => ({
      key: m.key, label: m.label, adaptive: !!e.adaptive,
      slAtr: e.slAtr, tpAtr: e.tpAtr, trailAtr: e.trailAtr, minConv: e.minConv,
      account: e.all.account, returnPct: e.all.returnPct, maxDrawdownPct: e.all.maxDrawdownPct,
      winRate: e.all.winRate, trades: e.all.trades,
      longOperate: sideOk(e.long), shortOperate: sideOk(e.short)
    }));
    /* Best mode = highest net final account. */
    let bestIdx = 0;
    for (let i = 1; i < evals.length; i++) if (evals[i].e.all.account > evals[bestIdx].e.all.account) bestIdx = i;
    const bm = evals[bestIdx], e = bm.e;
    const strip = r => { const { equity, ...rest } = r; return rest; };
    const trigger = {
      minConv: e.minConv,
      long: { operate: sideOk(e.long), trades: e.long.trades, returnPct: e.long.returnPct, winRate: e.long.winRate, expectancyAtr: e.long.expectancyAtr },
      short: { operate: sideOk(e.short), trades: e.short.trades, returnPct: e.short.returnPct, winRate: e.short.winRate, expectancyAtr: e.short.expectancyAtr }
    };
    /* No-blind-spots SL×TP surface at the learned gate — the whole landscape,
       so the best combo can be judged for robustness (plateau vs lucky spike). */
    const surface = pumpBacktest.sweepGrid(data, predict, Object.assign({}, base, { minConv: e.minConv }));
    /* THE OPTIMISER: search hundreds of exit combos (bracket / breakeven /
       trailing) on a TRAIN split and validate the winner out-of-sample. */
    const optimized = pumpBacktest.optimize(data, predict, base);
    /* RESULTADO SEPARADO POR LADO — a pedido: os shorts puxavam o edge pra baixo,
       então cada direção é otimizada SOZINHA (melhor modo + TP + gatilho só com
       os trades daquele lado) e validada fora da amostra por conta própria. Assim
       dá pra ver o edge real do long sem a diluição do short. */
    const bestSideEval = (side) => {
      const evs = MODES.map(m => ({ m, e: pumpBacktest.evaluate(data, predict, Object.assign({}, base,
        m.trail ? { slAtr: m.slAtr, trail: true, trailGrid: m.trailGrid } : { slAtr: m.slAtr, tpGrid: m.tpGrid },
        { side })) }));
      let bi = 0; for (let i = 1; i < evs.length; i++) if (evs[i].e.all.account > evs[bi].e.all.account) bi = i;
      const chosen = evs[bi];
      return {
        result: strip(chosen.e.all),
        params: { mode: chosen.m.key, modeLabel: chosen.m.label, slAtr: chosen.e.slAtr,
                  tpAtr: chosen.e.tpAtr, trailAtr: chosen.e.trailAtr, adaptive: !!chosen.e.adaptive, minConv: chosen.e.minConv },
        optimize: pumpBacktest.optimize(data, predict, Object.assign({}, base, { side }))
      };
    };
    const longSide = bestSideEval("long");
    const shortSide = bestSideEval("short");
    /* DEEP DIAGNOSTICS: is the model's number calibrated, and where (if
       anywhere) does a profitable subset hide? */
    const calibration = pumpBacktest.calibrate(data, predict);
    const conditions = pumpBacktest.mineConditions(data, predict, pumpModel.FEATURES, base);
    /* The user's discovery: pré-volume+spike CONFIRMED by the 15m Exhaustion
       RSI zone. Sweeps the RSI inputs (len, push, zones) and validates the best
       out-of-sample. */
    const rsiConfirm = pumpBacktest.sweepRsiConfirm(data, predict, base);
    res.json({
      ok: true, ready: true, horizon: pumpModel.HORIZON,
      samples: data.length, withPath, exactPath: e.all.exactPath,
      onlyComplete, completeN: complete.length, totalN: all.length, preliminary, need: MIN,
      modes, bestMode: bm.m.key,
      params: { account0: base.account0, riskPct: base.riskPct, slAtr: e.slAtr, minConv: e.minConv,
                tpAtr: e.tpAtr, trailAtr: e.trailAtr, adaptive: !!e.adaptive,
                mode: bm.m.key, modeLabel: bm.m.label, feePct, slipPct, costRoundTripPct: costFrac * 100 },
      trigger, convSweep: e.convSweep, surface, optimized, calibration, conditions, rsiConfirm,
      best: strip(e.all), long: strip(e.long), short: strip(e.short),
      /* Cada lado otimizado SOZINHO (resultado final separado). */
      longSide: { result: longSide.result, params: longSide.params, optimize: longSide.optimize },
      shortSide: { result: shortSide.result, params: shortSide.params, optimize: shortSide.optimize },
      grossReturnPct: e.grossReturnPct, sweep: e.sweep,
      equity: e.all.equity.filter((_, i) => i % Math.max(1, Math.ceil(e.all.equity.length / 120)) === 0)
    });
  });

  /* ── ANNUAL backtest ─────────────────────────────────────────────────────
     Same criteria (spike pós-flat + 15m Exhaustion RSI, RSI base 15m over the
     full year) run on demand over ~365d of 15m for up to 5 assets. Heavy (many
     paginated fetches), so: one run at a time + a short result cache. */
  const DEFAULT_ANNUAL = ["BTC_USDT", "ETH_USDT", "SOL_USDT", "BNB_USDT", "XRP_USDT"];
  let _annualRunning = false, _annualCache = null, _annualStartedAt = 0;
  app.get("/api/dvl/scanner/pump-backtest-annual", (req, res) => {
    const days = Math.max(30, Math.min(400, Number(req.query.days) || 365));
    let symbols = String(req.query.symbols || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    symbols = (symbols.length ? symbols : DEFAULT_ANNUAL).slice(0, 5)
      .map(s => /_/.test(s) ? s : s.replace(/USDT$/, "") + "_USDT");
    const rsiGridFlag = /^(1|true)$/i.test(String(req.query.rsiGrid || ""));
    const tfMin = [5, 15, 30, 60].indexOf(Number(req.query.tf)) >= 0 ? Number(req.query.tf) : 15;
    const cacheKey = symbols.join(",") + "|" + days + "|" + tfMin + "m|" + (rsiGridFlag ? "grid" : "std");
    /* Poll pattern: the run takes 30–60s, so we never hold the HTTP connection
       open for it. Fresh cache → return the result; already running → report
       progress; otherwise kick it off and report "started". Client polls. */
    if (_annualCache && _annualCache.key === cacheKey && (Date.now() - _annualCache.at) < 600000) {
      return res.json(Object.assign({ cached: true }, _annualCache.data));
    }
    if (_annualRunning) {
      return res.json({ ok: true, ready: false, running: true, elapsedMs: Date.now() - _annualStartedAt,
                        message: "Rodando o backtest… (buscando ~1 ano de candles)" });
    }
    _annualRunning = true; _annualStartedAt = Date.now();
    const runCfg = { ENGINE: cfg.ENGINE, EXR: cfg.EXR,
      account0: Number(req.query.account0) || 1000, riskPct: Number(req.query.riskPct) || 0.01,
      feePct: Number(req.query.feePct) || 0.02, slipPct: Number(req.query.slipPct) || 0.02,
      rsiGrid: /^(1|true)$/i.test(String(req.query.rsiGrid || "")) };
    const fetch15m = (sym) => mexc.klinesHistory(sym, days, tfMin);
    annualBacktest.run(symbols, days, runCfg, fetch15m, tfMin)
      .then(out => { _annualCache = { key: cacheKey, at: Date.now(), data: out }; })
      .catch(err => { _annualCache = { key: cacheKey, at: Date.now(), data: { ok: false, ready: false, error: String(err && err.message || err) } }; })
      .finally(() => { _annualRunning = false; });
    res.json({ ok: true, ready: false, running: true, started: true, symbols, days, tfMin,
               message: "Backtest anual iniciado — buscando ~1 ano de " + tfMin + "m. Pode levar até 1 min." });
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
