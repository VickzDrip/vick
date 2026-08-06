"use strict";
/* DVL Telegram Alerts V1 — worker da fila de entregas.
   Roda separado do motor de alertas: só consome alert_deliveries e envia.
   Nunca recalcula condição, cooldown ou rearme (isso é do motor). Trata
   retries (schedule do doc), 429 (retry_after), 403 (blocked) e rate-limit
   por chat (~1 msg/s por chat). Deps injetáveis p/ teste. */

const _repo = require("./repo");
const _api = require("./api");

const RETRY_MS = { 2: 5000, 3: 20000, 4: 60000, 5: 300000 }; // por nº da PRÓXIMA tentativa
const PER_CHAT_MIN_GAP = 1000;   // 1 msg/s por chat
const BATCH_PER_TICK = 20;       // ~20/s global com tick de 1s
const TICK_MS = 1000;

function makeWorker(opts) {
  opts = opts || {};
  const repo = opts.repo || _repo;
  const api = opts.api || _api;
  const now = opts.now || Date.now;
  const lastChatSend = new Map();
  let timer = null, running = false;

  async function processOne(d) {
    const conn = repo.getConnection(d.dvl_user_id);
    if (!repo.isSendable(conn)) { repo.markSkipped(d.id, conn ? ("status:" + conn.status) : "no_connection"); return; }
    const chatId = d.destination_id != null ? d.destination_id : conn.telegram_chat_id;

    // rate-limit por chat: se enviou há < 1s, adia sem gastar tentativa extra
    const last = lastChatSend.get(chatId) || 0;
    const t = now();
    if (t - last < PER_CHAT_MIN_GAP) {
      repo.markRetry(d.id, last + PER_CHAT_MIN_GAP + 50, "rate_local", null);
      repo.bumpAttempt(d.id, -1); // adiamento não conta como tentativa
      return;
    }

    const r = await api.sendMessage(chatId, d.text);
    lastChatSend.set(chatId, now());
    if (r.ok) { repo.markSent(d.id, r.messageId); repo.markSuccess(d.dvl_user_id); return; }

    if (r.blocked) { // 403 — bot bloqueado / chat inexistente
      repo.markFailed(d.id, r.code, r.description);
      repo.setStatus(d.dvl_user_id, "blocked");
      repo.markError(d.dvl_user_id, r.code);
      return;
    }
    repo.markError(d.dvl_user_id, r.code);
    const next = (d.attempt_count || 1) + 1; // nº da próxima tentativa
    if (r.retryAfter) { // 429 — respeitar retry_after do Telegram
      repo.markRetry(d.id, now() + r.retryAfter * 1000 + 250, r.code, r.description);
      return;
    }
    if (RETRY_MS[next]) repo.markRetry(d.id, now() + RETRY_MS[next], r.code, r.description);
    else repo.markFailed(d.id, r.code, r.description);
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      const batch = repo.claimBatch(BATCH_PER_TICK);
      for (const d of batch) {
        try { await processOne(d); } catch (e) { try { repo.markRetry(d.id, now() + 20000, "worker_err", String(e && e.message || e)); } catch (_) {} }
      }
    } finally { running = false; }
  }

  return {
    tick,
    start() { if (!timer) timer = setInterval(tick, TICK_MS); if (timer.unref) timer.unref(); return this; },
    stop() { if (timer) { clearInterval(timer); timer = null; } }
  };
}

module.exports = { makeWorker, RETRY_MS };
