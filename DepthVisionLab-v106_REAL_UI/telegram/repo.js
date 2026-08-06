"use strict";
/* DVL Telegram Alerts V1 — repositório (regras de dados puras sobre o SQLite).
   Sem I/O de rede aqui: só persistência e política de vínculo. */

const crypto = require("crypto");
const { db } = require("./db");

/* ── helpers ─────────────────────────────────────────────────────────────── */
function now() { return Date.now(); }
function uuid() { return crypto.randomUUID(); }
function sha256(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function newRawToken() { return crypto.randomBytes(32).toString("base64url"); } // opaco, <=64 chars

const H = 3600e3, D = 24 * H;
function activeUntilFrom(code, base) {
  base = base || now();
  switch (code) {
    case "1h": return base + H;
    case "today": { const d = new Date(base); d.setHours(23, 59, 59, 999); return d.getTime(); }
    case "24h": return base + 24 * H;
    case "7d": return base + 7 * D;
    case "30d": return base + 30 * D;
    case "forever": return null; // até cancelar
    default:
      if (typeof code === "string" && code.startsWith("custom:")) {
        const ms = Number(code.slice(7));
        if (Number.isFinite(ms) && ms > 0) return base + ms;
      }
      return base + 7 * D; // padrão
  }
}
const TOKEN_TTL_MS = 5 * 60 * 1000; // token de vínculo: 5 minutos

/* ── identidade de dispositivo (V1) ──────────────────────────────────────── */
function touchDevice(userId, label) {
  const d = db(), t = now();
  d.prepare(`INSERT INTO device_identity(dvl_user_id, created_at, last_seen_at, label)
             VALUES(?,?,?,?)
             ON CONFLICT(dvl_user_id) DO UPDATE SET last_seen_at=excluded.last_seen_at`)
    .run(userId, t, t, label || null);
}

/* ── tokens de vínculo (deep-link) ───────────────────────────────────────── */
function createConnectIntent(dvlUserId, durationCode) {
  const d = db(), t = now();
  // invalida tokens não usados anteriores do mesmo usuário (marca como usados)
  d.prepare(`UPDATE telegram_link_tokens SET used_at=? WHERE dvl_user_id=? AND used_at IS NULL`).run(t, dvlUserId);
  const requestId = uuid();
  const rawToken = newRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = t + TOKEN_TTL_MS;
  d.prepare(`INSERT INTO telegram_link_tokens
             (request_id, dvl_user_id, token_hash, requested_duration, token_expires_at, used_at, created_at)
             VALUES(?,?,?,?,?,NULL,?)`)
    .run(requestId, dvlUserId, tokenHash, String(durationCode || "7d"), expiresAt, t);
  return { requestId, rawToken, tokenExpiresAt: expiresAt };
}

/* Consome um token vindo do /start. Aplica política de vínculo 1:1.
   Retorna {ok, reason?, connection?}. */
function consumeStartToken(rawToken, tg) {
  const d = db(), t = now();
  const hash = sha256(rawToken);
  const tok = d.prepare(`SELECT * FROM telegram_link_tokens WHERE token_hash=?`).get(hash);
  if (!tok) return { ok: false, reason: "invalid" };
  if (tok.used_at != null) return { ok: false, reason: "used" };
  if (tok.token_expires_at < t) return { ok: false, reason: "expired" };

  const chatId = Number(tg.chatId);
  // 1:1 — um chat não pode servir a duas contas DVL diferentes
  const other = d.prepare(`SELECT dvl_user_id FROM telegram_connections WHERE telegram_chat_id=? AND dvl_user_id<>?`)
    .get(chatId, tok.dvl_user_id);
  if (other) return { ok: false, reason: "chat_bound_other" };

  const activeUntil = activeUntilFrom(tok.requested_duration, t);
  d.prepare(`INSERT INTO telegram_connections
             (dvl_user_id, telegram_user_id, telegram_chat_id, chat_type, telegram_username, telegram_first_name,
              status, active_until, connected_at, updated_at)
             VALUES(?,?,?,?,?,?, 'active', ?, ?, ?)
             ON CONFLICT(dvl_user_id) DO UPDATE SET
               telegram_user_id=excluded.telegram_user_id,
               telegram_chat_id=excluded.telegram_chat_id,
               chat_type=excluded.chat_type,
               telegram_username=excluded.telegram_username,
               telegram_first_name=excluded.telegram_first_name,
               status='active',
               active_until=excluded.active_until,
               connected_at=COALESCE(telegram_connections.connected_at, excluded.connected_at),
               blocked_at=NULL, last_error_code=NULL,
               updated_at=excluded.updated_at`)
    .run(tok.dvl_user_id, Number(tg.tgUserId) || null, chatId, tg.chatType || "private",
         tg.username || null, tg.firstName || null, activeUntil, t, t);

  d.prepare(`UPDATE telegram_link_tokens SET used_at=? WHERE request_id=?`).run(t, tok.request_id);
  return { ok: true, connection: getConnection(tok.dvl_user_id) };
}

/* ── conexões ────────────────────────────────────────────────────────────── */
function getConnection(dvlUserId) {
  return db().prepare(`SELECT * FROM telegram_connections WHERE dvl_user_id=?`).get(dvlUserId) || null;
}
function getConnectionByChat(chatId) {
  return db().prepare(`SELECT * FROM telegram_connections WHERE telegram_chat_id=?`).get(Number(chatId)) || null;
}
function isSendable(conn) {
  if (!conn) return false;
  if (conn.status !== "active") return false;
  if (conn.active_until != null && conn.active_until <= now()) return false;
  return true;
}
function setStatus(dvlUserId, status, extra) {
  const d = db(), t = now();
  const cols = ["status=?", "updated_at=?"], vals = [status, t];
  if (extra && "active_until" in extra) { cols.push("active_until=?"); vals.push(extra.active_until); }
  if (status === "paused") { cols.push("paused_at=?"); vals.push(t); }
  if (status === "blocked") { cols.push("blocked_at=?"); vals.push(t); }
  vals.push(dvlUserId);
  d.prepare(`UPDATE telegram_connections SET ${cols.join(",")} WHERE dvl_user_id=?`).run(...vals);
  return getConnection(dvlUserId);
}
function pause(dvlUserId) { return setStatus(dvlUserId, "paused"); }
function renew(dvlUserId, durationCode) {
  const c = getConnection(dvlUserId); if (!c) return null;
  return setStatus(dvlUserId, "active", { active_until: activeUntilFrom(durationCode, now()) });
}
function disconnect(dvlUserId) {
  // apaga o vínculo (o usuário pode reconectar do zero)
  db().prepare(`DELETE FROM telegram_connections WHERE dvl_user_id=?`).run(dvlUserId);
  return { ok: true };
}
function markSuccess(dvlUserId) {
  db().prepare(`UPDATE telegram_connections SET last_success_at=?, updated_at=?, last_error_code=NULL WHERE dvl_user_id=?`)
    .run(now(), now(), dvlUserId);
}
function markError(dvlUserId, code) {
  db().prepare(`UPDATE telegram_connections SET last_error_code=?, updated_at=? WHERE dvl_user_id=?`)
    .run(String(code || ""), now(), dvlUserId);
}

/* ── fila de entregas ────────────────────────────────────────────────────── */
/* Idempotente: UNIQUE(trigger_id, channel, destination_id). Se já existe, ignora. */
function enqueue({ triggerId, alertId, dvlUserId, text, destinationId }) {
  const d = db(), t = now();
  const r = d.prepare(`INSERT OR IGNORE INTO alert_deliveries
      (trigger_id, alert_id, dvl_user_id, channel, destination_id, text, status, attempt_count, next_attempt_at, created_at)
      VALUES(?,?,?, 'telegram', ?, ?, 'pending', 0, 0, ?)`)
    .run(String(triggerId), alertId != null ? String(alertId) : null, dvlUserId,
         destinationId != null ? Number(destinationId) : null, String(text), t);
  return { inserted: r.changes > 0 };
}
function claimBatch(limit) {
  const d = db(), t = now();
  const rows = d.prepare(`SELECT * FROM alert_deliveries
      WHERE (status='pending' OR status='retry') AND next_attempt_at<=?
      ORDER BY id ASC LIMIT ?`).all(t, Number(limit) || 10);
  const claim = d.prepare(`UPDATE alert_deliveries SET status='sending', attempt_count=attempt_count+1 WHERE id=? AND status IN('pending','retry')`);
  const claimed = [];
  for (const row of rows) {
    if (claim.run(row.id).changes > 0) {
      row.status = "sending";
      row.attempt_count = (row.attempt_count || 0) + 1;
      claimed.push(row);
    }
  }
  return claimed;
}
function markSent(id, providerMessageId) {
  db().prepare(`UPDATE alert_deliveries SET status='delivered', provider_message_id=?, sent_at=? WHERE id=?`)
    .run(providerMessageId != null ? Number(providerMessageId) : null, now(), id);
}
function markRetry(id, nextAttemptAt, code, text) {
  db().prepare(`UPDATE alert_deliveries SET status='retry', next_attempt_at=?, provider_error_code=?, provider_error_text=? WHERE id=?`)
    .run(Number(nextAttemptAt) || now(), code != null ? String(code) : null, text != null ? String(text).slice(0, 300) : null, id);
}
function markFailed(id, code, text) {
  db().prepare(`UPDATE alert_deliveries SET status='failed', provider_error_code=?, provider_error_text=? WHERE id=?`)
    .run(code != null ? String(code) : null, text != null ? String(text).slice(0, 300) : null, id);
}
function markSkipped(id, reason) {
  db().prepare(`UPDATE alert_deliveries SET status='skipped', provider_error_text=? WHERE id=?`)
    .run(reason ? String(reason).slice(0, 300) : null, id);
}
function deliveryStatus(triggerId) {
  return db().prepare(`SELECT status, provider_error_code FROM alert_deliveries WHERE trigger_id=? ORDER BY id DESC LIMIT 1`).get(String(triggerId)) || null;
}

/* ── dedup de webhook ────────────────────────────────────────────────────── */
function seenUpdate(updateId) {
  const r = db().prepare(`INSERT OR IGNORE INTO telegram_updates(update_id, received_at) VALUES(?,?)`).run(Number(updateId), now());
  return r.changes === 0; // true = já visto
}

module.exports = {
  now, activeUntilFrom, TOKEN_TTL_MS,
  touchDevice,
  createConnectIntent, consumeStartToken,
  getConnection, getConnectionByChat, isSendable, setStatus, pause, renew, disconnect, markSuccess, markError,
  enqueue, claimBatch, markSent, markRetry, markFailed, markSkipped, deliveryStatus,
  seenUpdate
};
