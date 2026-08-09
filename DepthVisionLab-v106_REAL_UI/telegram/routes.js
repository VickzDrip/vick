"use strict";
/* DVL Telegram Alerts V1 — rotas HTTP do DVL (não do Telegram).
   Todas as rotas de usuário passam pela identidade (req.dvlUserId). O canal
   Telegram NUNCA aceita chat_id/token vindos do frontend: o destino sempre vem
   da conexão salva no servidor. */

const express = require("express");
const config = require("./config");
const _repo = require("./repo");
const _messages = require("./messages");

const DURATIONS = new Set(["1h", "today", "24h", "7d", "30d", "forever"]);
const SERVER_SOURCES = ["price", "smartdelta", "exr", "liqbands", "ma", "vp", "cross"];

function finite(v, fallback, min, max) {
  v = Number(v);
  if (!Number.isFinite(v)) v = fallback;
  if (Number.isFinite(min)) v = Math.max(min, v);
  if (Number.isFinite(max)) v = Math.min(max, v);
  return v;
}

function cleanTf(v) {
  v = String(v || "").trim();
  return /^(15s|30s|1m|2m|3m|4m|5m|10m|15m|30m|1h|2h|4h|6h|8h|12h|1d|1D|3d|1w|chart|Chart)$/.test(v) ? v : "";
}

function cleanSymbol(v) {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
}

function sanitizeContext(raw) {
  raw = raw && typeof raw === "object" ? raw : {};
  const out = {
    version: 2,
    chartSymbol: cleanSymbol(raw.chartSymbol) || "BTCUSDT",
    chartTf: cleanTf(raw.chartTf) || "1m",
    historyCount: Math.round(finite(raw.historyCount, 620, 50, 1000)),
    ma: [], vwap: {}, vp: {}, exr: {}, smartdelta: {}, liqbands: {}
  };
  if (Array.isArray(raw.ma)) {
    out.ma = raw.ma.slice(0, 10).map((m, idx) => ({
      idx: Math.round(finite(m && m.idx, idx, 0, 9)),
      period: Math.round(finite(m && m.period, 20, 1, 999)),
      type: /^(SMA|EMA|WMA|VWMA|RMA|HMA|DEMA|TEMA|LSMA|KAMA)$/.test(String(m && m.type)) ? String(m.type) : "SMA"
    }));
  }
  const vw = raw.vwap || {};
  out.vwap = {
    anchor: /^(daily|weekly|monthly)$/.test(String(vw.anchor)) ? String(vw.anchor) : "daily",
    mult1: finite(vw.mult1, 1, 0.1, 10), mult2: finite(vw.mult2, 2, 0.1, 10)
  };
  const vp = raw.vp || {}, levels = vp.levels || {};
  out.vp = {
    rows: Math.round(finite(vp.rows, 120, 20, 500)), valueAreaPct: finite(vp.valueAreaPct, 0.70, 0.01, 1),
    lookback: Math.round(finite(vp.lookback, 180, 20, 1000)), followLive: !!vp.followLive,
    levels: {
      poc: Number.isFinite(Number(levels.poc)) ? Number(levels.poc) : null,
      vah: Number.isFinite(Number(levels.vah)) ? Number(levels.vah) : null,
      val: Number.isFinite(Number(levels.val)) ? Number(levels.val) : null
    }
  };
  const ex = raw.exr || {};
  out.exr = {
    calculationTF: cleanTf(ex.calculationTF) || "Chart",
    mtfVolSpikeAt: finite(ex.mtfVolSpikeAt, 2.5, 1.3, 8), mtfVolMaLen: Math.round(finite(ex.mtfVolMaLen, 20, 3, 500)),
    mtfPush: finite(ex.mtfPush, 18, 0, 40), mtfRsiLen: Math.round(finite(ex.mtfRsiLen, 14, 2, 50)),
    arionSpikeLevelWeight: !!ex.arionSpikeLevelWeight,
    arionSpikeLevels: Array.isArray(ex.arionSpikeLevels) ? ex.arionSpikeLevels.slice(0, 10).map(Boolean) : new Array(10).fill(true),
    arionMult: Array.isArray(ex.arionMult) ? ex.arionMult.slice(0, 10).map((v, i) => finite(v, i + 1, 0.01, 100)) : [1,2,3,4,5,6,7,8,9,10],
    proExtendedScale: ex.proExtendedScale !== false, proExtension: finite(ex.proExtension, 100, 25, 500),
    upperZoneLevel: finite(ex.upperZoneLevel, 60, 50, 600), lowerZoneLevel: finite(ex.lowerZoneLevel, 35, -500, 50)
  };
  const sd = raw.smartdelta || {};
  out.smartdelta = {
    thNeutral: finite(sd.thNeutral, 18, 0, 100), alertDelta: finite(sd.alertDelta, 60, 20, 100),
    alertConf: finite(sd.alertConf, 70, 0, 100), alertExh: finite(sd.alertExh, 75, 0, 100),
    confluenceMin: finite(sd.alertConflMin, 2, 2, 5)
  };
  const lb = raw.liqbands || {};
  out.liqbands = {
    rangePct: finite(lb.rangePct, 0.6, 0.05, 5), minNotional: finite(lb.minNotional, 50000, 0, 5e7),
    smoothBars: finite(lb.smoothBars, 8, 0, 60), wallStrength: finite(lb.wallStrength, 2.2, 1, 20)
  };
  return out;
}

// rate-limiter simples por chave (janela deslizante grosseira)
const _buckets = new Map();
function allow(key, max, windowMs) {
  const now = Date.now();
  let b = _buckets.get(key);
  if (!b || now - b.start >= windowMs) { b = { start: now, count: 0 }; _buckets.set(key, b); }
  b.count++;
  return b.count <= max;
}

function connSummary(conn) {
  if (!conn) return { connected: false, status: "disconnected" };
  return {
    connected: conn.status === "active" || conn.status === "paused",
    status: conn.status,
    activeUntil: conn.active_until,
    connectedAt: conn.connected_at,
    chatType: conn.chat_type,
    username: conn.telegram_username || null
  };
}

function makeRouter(deps) {
  deps = deps || {};
  const repo = deps.repo || _repo;
  const messages = deps.messages || _messages;
  const router = express.Router();

  router.get("/status", (req, res) => {
    res.json(Object.assign({
      enabled: config.enabled(),
      mode: config.mode,
      botUsername: config.botUsername,
      server24x7: true,
      serverSources: SERVER_SOURCES
    }, connSummary(repo.getConnection(req.dvlUserId))));
  });

  router.post("/connect-intent", (req, res) => {
    if (!config.enabled()) return res.status(503).json({ ok: false, error: "telegram_disabled" });
    if (!allow("intent:" + req.dvlUserId, 6, 60000)) return res.status(429).json({ ok: false, error: "rate_limited" });
    let duration = String((req.body && req.body.duration) || "7d");
    if (!DURATIONS.has(duration)) duration = "7d";
    const it = repo.createConnectIntent(req.dvlUserId, duration);
    const deepLink = "https://t.me/" + config.botUsername + "?start=" + it.rawToken;
    res.json({ ok: true, requestId: it.requestId, deepLink, tokenExpiresAt: it.tokenExpiresAt, deviceToken: req.dvlDeviceToken || null });
  });

  router.post("/pause", (req, res) => {
    const c = repo.getConnection(req.dvlUserId);
    if (!c) return res.status(404).json({ ok: false, error: "not_connected" });
    res.json({ ok: true, connection: connSummary(repo.pause(req.dvlUserId)) });
  });

  router.post("/renew", (req, res) => {
    const c = repo.getConnection(req.dvlUserId);
    if (!c) return res.status(404).json({ ok: false, error: "not_connected" });
    let duration = String((req.body && req.body.duration) || "7d");
    if (!DURATIONS.has(duration)) duration = "7d";
    res.json({ ok: true, connection: connSummary(repo.renew(req.dvlUserId, duration)) });
  });

  router.post("/disconnect", (req, res) => {
    repo.disconnect(req.dvlUserId);
    res.json({ ok: true });
  });

  /* sync das regras (avaliação server-side 24/7). O cliente envia as regras com
     Telegram ligado; o servidor guarda e o evaluador as roda quando o DVL está
     fechado. Aceita só campos de regra — nunca destino/token. */
  router.post("/rules", (req, res) => {
    if (!config.enabled()) return res.status(503).json({ ok: false, error: "telegram_disabled" });
    if (!allow("rules:" + req.dvlUserId, 30, 60000)) return res.status(429).json({ ok: false, error: "rate_limited" });
    const rules = Array.isArray(req.body && req.body.rules) ? req.body.rules : [];
    const context = sanitizeContext(req.body && req.body.context);
    const clean = rules.slice(0, 200).map(r => ({
      id: String(r.id || ""), source: String(r.source || ""), signal: String(r.signal || ""),
      dir: r.dir || "any", level: (r.level == null ? null : Number(r.level)),
      params: (r.params && typeof r.params === "object") ? {
        maId: r.params.maId == null ? "" : String(r.params.maId).slice(0, 8),
        level: r.params.level == null ? "" : String(r.params.level).slice(0, 12),
        lhs: r.params.lhs == null ? "" : String(r.params.lhs).slice(0, 32),
        rhs: r.params.rhs == null ? "" : String(r.params.rhs).slice(0, 32)
      } : {},
      tf: r.tf || "", evalTf: r.evalTf || "", rearm: r.rearm || "time", cooldownSec: Number(r.cooldownSec) || 0,
      symbol: cleanSymbol(r.evalSymbol || r.symbol || context.chartSymbol), telegram: !!r.telegram, enabled: r.enabled !== false
    })).filter(r => r.id && r.source && r.signal);
    repo.setUserRules(req.dvlUserId, clean, context);
    res.json({ ok: true, stored: clean.length });
  });

  /* heartbeat: o DVL aberto marca presença; o evaluador pula esse usuário
     (o cliente já entrega via /trigger) — evita duplicidade. */
  router.post("/heartbeat", (req, res) => {
    if (!config.enabled()) return res.json({ ok: false, error: "telegram_disabled" });
    repo.markClientActive(req.dvlUserId, 45000);
    res.json({ ok: true });
  });

  router.post("/test", (req, res) => {
    if (!config.enabled()) return res.status(503).json({ ok: false, error: "telegram_disabled" });
    const conn = repo.getConnection(req.dvlUserId);
    if (!repo.isSendable(conn)) return res.json({ ok: false, error: "not_sendable", status: conn ? conn.status : "disconnected" });
    if (!allow("test:" + req.dvlUserId, 3, 60000)) return res.status(429).json({ ok: false, error: "rate_limited" });
    repo.enqueue({ triggerId: "test:" + req.dvlUserId + ":" + Date.now(), dvlUserId: req.dvlUserId, text: messages.testText(), destinationId: conn.telegram_chat_id });
    res.json({ ok: true, queued: true });
  });

  /* CLIENT_SESSION: o fire() do frontend chama isto quando um alerta com
     channels.telegram dispara. O servidor valida e enfileira; NUNCA aceita
     destino do cliente — usa a conexão do próprio usuário. */
  router.post("/trigger", (req, res) => {
    if (!config.enabled()) return res.status(503).json({ ok: false, error: "telegram_disabled" });
    const b = req.body || {};
    if (!(b.channels && b.channels.telegram)) return res.json({ ok: false, error: "telegram_not_selected" });
    const conn = repo.getConnection(req.dvlUserId);
    if (!repo.isSendable(conn)) return res.json({ ok: false, error: "not_sendable", status: conn ? conn.status : "disconnected" });
    if (!allow("trig:" + req.dvlUserId, 40, 60000)) return res.status(429).json({ ok: false, error: "rate_limited" });
    const ev = {
      symbol: b.symbol, timeframe: b.timeframe || b.tf, title: b.title, source: b.source,
      message: b.message, price: b.price, values: b.values
    };
    const triggerId = String(b.triggerId || (req.dvlUserId + ":" + (b.alertId || "a") + ":" + Date.now()));
    const r = repo.enqueue({ triggerId, alertId: b.alertId, dvlUserId: req.dvlUserId, text: messages.alertText(ev), destinationId: conn.telegram_chat_id });
    if (r.inserted) repo.addHistory(req.dvlUserId, { msg: b.message || messages.alertText(ev), ts: Date.now(), tf: ev.timeframe, sym: ev.symbol, source: b.source, dir: b.dir });
    res.json({ ok: true, queued: r.inserted, duplicate: !r.inserted });
  });

  /* histórico dos alertas que foram pro Telegram (inclui os disparados no
     servidor com o DVL fechado). O painel mescla isto com o log local. */
  router.get("/recent", (req, res) => {
    if (!config.enabled()) return res.json({ ok: false, enabled: false, entries: [] });
    res.json({ ok: true, entries: repo.getHistory(req.dvlUserId, 30) });
  });

  return router;
}

module.exports = { makeRouter, DURATIONS };
