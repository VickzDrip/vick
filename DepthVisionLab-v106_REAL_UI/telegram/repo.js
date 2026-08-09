"use strict";
/* DVL Telegram Alerts V1 — repositório (regras de dados) sobre o store puro-JS.
   Mesma API pública de antes; só o motor de armazenamento mudou (JSON atômico,
   sem SQLite). Sem I/O de rede aqui. */

const crypto = require("crypto");
const store = require("./store");

/* ── helpers ─────────────────────────────────────────────────────────────── */
function now() { return Date.now(); }
function uuid() { return crypto.randomUUID(); }
function sha256(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function newRawToken() { return crypto.randomBytes(32).toString("base64url"); }

const H = 3600e3, D = 24 * H;
function activeUntilFrom(code, base) {
  base = base || now();
  switch (code) {
    case "1h": return base + H;
    case "today": { const d = new Date(base); d.setHours(23, 59, 59, 999); return d.getTime(); }
    case "24h": return base + 24 * H;
    case "7d": return base + 7 * D;
    case "30d": return base + 30 * D;
    case "forever": return null;
    default:
      if (typeof code === "string" && code.startsWith("custom:")) {
        const ms = Number(code.slice(7));
        if (Number.isFinite(ms) && ms > 0) return base + ms;
      }
      return base + 7 * D;
  }
}
const TOKEN_TTL_MS = 5 * 60 * 1000;

/* ── identidade de dispositivo ───────────────────────────────────────────── */
function touchDevice(userId, label) {
  const d = store.data(), t = now();
  const cur = d.devices[userId];
  d.devices[userId] = { created_at: (cur && cur.created_at) || t, last_seen_at: t, label: label || (cur && cur.label) || null };
  store.commit();
}

/* ── tokens de vínculo (deep-link) ───────────────────────────────────────── */
function createConnectIntent(dvlUserId, durationCode) {
  const d = store.data(), t = now();
  // invalida tokens não usados anteriores do mesmo usuário
  for (const rid in d.tokens) { const tk = d.tokens[rid]; if (tk.dvl_user_id === dvlUserId && tk.used_at == null) tk.used_at = t; }
  const requestId = uuid();
  const rawToken = newRawToken();
  d.tokens[requestId] = {
    request_id: requestId, dvl_user_id: dvlUserId, token_hash: sha256(rawToken),
    requested_duration: String(durationCode || "7d"), token_expires_at: t + TOKEN_TTL_MS,
    used_at: null, created_at: t
  };
  store.commit();
  return { requestId, rawToken, tokenExpiresAt: t + TOKEN_TTL_MS };
}

function findTokenByHash(hash) {
  const d = store.data();
  for (const rid in d.tokens) if (d.tokens[rid].token_hash === hash) return d.tokens[rid];
  return null;
}

function consumeStartToken(rawToken, tg) {
  const d = store.data(), t = now();
  const tok = findTokenByHash(sha256(rawToken));
  if (!tok) return { ok: false, reason: "invalid" };
  if (tok.used_at != null) return { ok: false, reason: "used" };
  if (tok.token_expires_at < t) return { ok: false, reason: "expired" };

  const chatId = Number(tg.chatId);
  const owner = d.byChat[chatId];
  if (owner && owner !== tok.dvl_user_id) return { ok: false, reason: "chat_bound_other" };

  const userId = tok.dvl_user_id;
  const prev = d.connections[userId];
  // se o usuário trocou de chat, limpa o mapeamento antigo
  if (prev && prev.telegram_chat_id != null && prev.telegram_chat_id !== chatId) delete d.byChat[prev.telegram_chat_id];

  d.connections[userId] = {
    dvl_user_id: userId,
    telegram_user_id: Number(tg.tgUserId) || null,
    telegram_chat_id: chatId,
    chat_type: tg.chatType || "private",
    telegram_username: tg.username || null,
    telegram_first_name: tg.firstName || null,
    status: "active",
    active_until: activeUntilFrom(tok.requested_duration, t),
    connected_at: (prev && prev.connected_at) || t,
    paused_at: null, blocked_at: null,
    last_success_at: (prev && prev.last_success_at) || null,
    last_error_code: null,
    updated_at: t
  };
  d.byChat[chatId] = userId;
  tok.used_at = t;
  store.commit();
  return { ok: true, connection: d.connections[userId] };
}

/* ── conexões ────────────────────────────────────────────────────────────── */
function getConnection(dvlUserId) { return store.data().connections[dvlUserId] || null; }
function getConnectionByChat(chatId) { const d = store.data(); const uid = d.byChat[Number(chatId)]; return uid ? (d.connections[uid] || null) : null; }
function isSendable(conn) {
  if (!conn || conn.status !== "active") return false;
  if (conn.active_until != null && conn.active_until <= now()) return false;
  return true;
}
function setStatus(dvlUserId, status, extra) {
  const c = getConnection(dvlUserId); if (!c) return null;
  const t = now();
  c.status = status; c.updated_at = t;
  if (extra && "active_until" in extra) c.active_until = extra.active_until;
  if (status === "paused") c.paused_at = t;
  if (status === "blocked") c.blocked_at = t;
  store.commit();
  return c;
}
function pause(dvlUserId) { return setStatus(dvlUserId, "paused"); }
function renew(dvlUserId, durationCode) {
  const c = getConnection(dvlUserId); if (!c) return null;
  return setStatus(dvlUserId, "active", { active_until: activeUntilFrom(durationCode, now()) });
}
function disconnect(dvlUserId) {
  const d = store.data(); const c = d.connections[dvlUserId];
  if (c && c.telegram_chat_id != null) delete d.byChat[c.telegram_chat_id];
  delete d.connections[dvlUserId];
  store.commit();
  return { ok: true };
}
function markSuccess(dvlUserId) { const c = getConnection(dvlUserId); if (!c) return; c.last_success_at = now(); c.last_error_code = null; c.updated_at = now(); store.commit(); }
function markError(dvlUserId, code) { const c = getConnection(dvlUserId); if (!c) return; c.last_error_code = String(code || ""); c.updated_at = now(); store.commit(); }

/* ── fila de entregas ────────────────────────────────────────────────────── */
function findDelivery(id) { const d = store.data(); for (let i = 0; i < d.deliveries.length; i++) if (d.deliveries[i].id === id) return d.deliveries[i]; return null; }

function enqueue({ triggerId, alertId, dvlUserId, text, destinationId }) {
  const d = store.data(), t = now();
  const dest = destinationId != null ? Number(destinationId) : null;
  const tid = String(triggerId);
  // idempotência: trigger_id + channel + destination_id
  const dup = d.deliveries.find(x => x.trigger_id === tid && x.channel === "telegram" && x.destination_id === dest);
  if (dup) return { inserted: false };
  d.deliveries.push({
    id: d.nextDeliveryId++, trigger_id: tid, alert_id: alertId != null ? String(alertId) : null,
    dvl_user_id: dvlUserId, channel: "telegram", destination_id: dest, text: String(text),
    status: "pending", attempt_count: 0, next_attempt_at: 0,
    provider_message_id: null, provider_error_code: null, provider_error_text: null,
    created_at: t, sent_at: null
  });
  store.commit();
  return { inserted: true };
}
function claimBatch(limit) {
  const d = store.data(), t = now();
  const ready = d.deliveries
    .filter(x => (x.status === "pending" || x.status === "retry") && x.next_attempt_at <= t)
    .sort((a, b) => a.id - b.id)
    .slice(0, Number(limit) || 10);
  ready.forEach(x => { x.status = "sending"; x.attempt_count = (x.attempt_count || 0) + 1; });
  if (ready.length) store.commit();
  return ready;
}
function bumpAttempt(id, delta) { const x = findDelivery(id); if (x) { x.attempt_count = Math.max(0, (x.attempt_count || 0) + delta); store.commit(); } }
function markSent(id, providerMessageId) { const x = findDelivery(id); if (!x) return; x.status = "delivered"; x.provider_message_id = providerMessageId != null ? Number(providerMessageId) : null; x.sent_at = now(); store.commit(); }
function markRetry(id, nextAttemptAt, code, text) { const x = findDelivery(id); if (!x) return; x.status = "retry"; x.next_attempt_at = Number(nextAttemptAt) || now(); x.provider_error_code = code != null ? String(code) : null; x.provider_error_text = text != null ? String(text).slice(0, 300) : null; store.commit(); }
function markFailed(id, code, text) { const x = findDelivery(id); if (!x) return; x.status = "failed"; x.provider_error_code = code != null ? String(code) : null; x.provider_error_text = text != null ? String(text).slice(0, 300) : null; store.commit(); }
function markSkipped(id, reason) { const x = findDelivery(id); if (!x) return; x.status = "skipped"; x.provider_error_text = reason ? String(reason).slice(0, 300) : null; store.commit(); }
function deliveryStatus(triggerId) {
  const d = store.data(); const tid = String(triggerId);
  for (let i = d.deliveries.length - 1; i >= 0; i--) if (d.deliveries[i].trigger_id === tid) return { status: d.deliveries[i].status, provider_error_code: d.deliveries[i].provider_error_code };
  return null;
}

/* ── regras sincronizadas (avaliação server-side 24/7) ───────────────────── */
function setUserRules(dvlUserId, rules, context) {
  const d = store.data();
  d.userRules = d.userRules || {};
  const next = {
    rules: Array.isArray(rules) ? rules : [],
    context: context && typeof context === "object" ? context : {},
    updatedAt: now()
  };
  const prev = d.userRules[dvlUserId];
  if (prev && JSON.stringify(prev.rules || []) === JSON.stringify(next.rules) &&
      JSON.stringify(prev.context || {}) === JSON.stringify(next.context)) {
    return prev;
  }
  d.userRules[dvlUserId] = next;
  store.commit();
  return d.userRules[dvlUserId];
}
function getUserRules(dvlUserId) {
  const d = store.data(); const u = (d.userRules || {})[dvlUserId];
  return u && Array.isArray(u.rules) ? u.rules : [];
}
/* Regras avaliáveis no servidor: usuário com conexão ENVIÁVEL, regra habilitada
   e com telegram ligado. Retorna [{userId, conn, rule}]. */
function listEvalRules() {
  const d = store.data(); const out = [];
  const ur = d.userRules || {};
  for (const userId in ur) {
    const conn = d.connections[userId];
    if (!isSendable(conn)) continue;
    const userEntry = ur[userId] || {};
    const rules = userEntry.rules || [];
    const context = userEntry.context || {};
    for (const r of rules) { if (r && r.enabled !== false && r.telegram) out.push({ userId, conn, rule: r, context }); }
  }
  return out;
}
/* heartbeat: o cliente (DVL aberto) marca presença; o evaluador pula esses
   usuários pra não duplicar o que o cliente já entrega via /trigger. */
function markClientActive(dvlUserId, ttlMs) {
  const d = store.data(); d.clientActive = d.clientActive || {};
  d.clientActive[dvlUserId] = now() + (Number(ttlMs) || 45000);
  store.commit();
}
function isClientActive(dvlUserId) {
  const d = store.data(); const t = (d.clientActive || {})[dvlUserId];
  return !!(t && t > now());
}
function evalKey(userId, ruleId) { return userId + ":" + ruleId; }
function getEvalState(userId, ruleId) {
  const d = store.data(); d.evalState = d.evalState || {};
  return d.evalState[evalKey(userId, ruleId)] || null;
}
function setEvalState(userId, ruleId, patch, persist) {
  const d = store.data(); d.evalState = d.evalState || {};
  const k = evalKey(userId, ruleId);
  d.evalState[k] = Object.assign({}, d.evalState[k] || {}, patch || {});
  if (persist !== false) store.commit(); // prevPrice churn passa persist=false (fica só em memória)
  return d.evalState[k];
}

/* ── histórico de alertas que foram pro Telegram (inclui os server-side com o
   DVL fechado). O painel mescla isto com o log local em "Recentes". ────────── */
function addHistory(dvlUserId, entry) {
  const d = store.data(); d.history = d.history || {};
  const arr = d.history[dvlUserId] || (d.history[dvlUserId] = []);
  arr.push({
    msg: String(entry && entry.msg || ""), ts: (entry && entry.ts) || now(),
    tf: (entry && entry.tf) || "", sym: (entry && entry.sym) || "",
    source: (entry && entry.source) || "", dir: (entry && entry.dir) || ""
  });
  if (arr.length > 60) arr.splice(0, arr.length - 60); // cap
  store.commit();
}
function getHistory(dvlUserId, limit) {
  const d = store.data(); const arr = (d.history || {})[dvlUserId] || [];
  const n = Number(limit) || 30;
  return arr.slice(Math.max(0, arr.length - n));
}

/* ── dedup de webhook ────────────────────────────────────────────────────── */
function seenUpdate(updateId) {
  const d = store.data(); const k = String(updateId);
  if (d.updates[k] != null) return true;
  d.updates[k] = now(); store.commit();
  return false;
}

module.exports = {
  now, activeUntilFrom, TOKEN_TTL_MS,
  touchDevice,
  createConnectIntent, consumeStartToken,
  getConnection, getConnectionByChat, isSendable, setStatus, pause, renew, disconnect, markSuccess, markError,
  enqueue, claimBatch, bumpAttempt, markSent, markRetry, markFailed, markSkipped, deliveryStatus,
  setUserRules, getUserRules, listEvalRules, getEvalState, setEvalState,
  markClientActive, isClientActive,
  addHistory, getHistory,
  seenUpdate
};
