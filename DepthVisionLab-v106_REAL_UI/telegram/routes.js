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
      botUsername: config.botUsername
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
    const clean = rules.slice(0, 200).map(r => ({
      id: String(r.id || ""), source: String(r.source || ""), signal: String(r.signal || ""),
      dir: r.dir || "any", level: (r.level == null ? null : Number(r.level)),
      params: (r.params && typeof r.params === "object") ? r.params : {},
      tf: r.tf || "", evalTf: r.evalTf || "", rearm: r.rearm || "time", cooldownSec: Number(r.cooldownSec) || 0,
      symbol: r.symbol ? String(r.symbol).toUpperCase() : "", telegram: !!r.telegram, enabled: r.enabled !== false
    })).filter(r => r.id && r.source && r.signal);
    repo.setUserRules(req.dvlUserId, clean);
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
    res.json({ ok: true, queued: r.inserted, duplicate: !r.inserted });
  });

  return router;
}

module.exports = { makeRouter, DURATIONS };
