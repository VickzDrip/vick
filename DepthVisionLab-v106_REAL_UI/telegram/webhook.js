"use strict";
/* DVL Telegram Alerts V1 — handler do webhook do Telegram.
   Valida o secret header, deduplica update_id e processa /start <token>.
   Responde 200 rápido; erros de vínculo respondem direto (sem conexão ainda). */

const config = require("./config");
const _repo = require("./repo");
const _api = require("./api");
const _messages = require("./messages");

function makeHandler(deps) {
  deps = deps || {};
  const repo = deps.repo || _repo;
  const api = deps.api || _api;
  const messages = deps.messages || _messages;

  return function handle(req, res) {
    // 1) autenticação do webhook
    if (config.webhookSecret) {
      const h = req.headers && req.headers["x-telegram-bot-api-secret-token"];
      if (h !== config.webhookSecret) { res.status(401).json({ ok: false }); return; }
    }
    const upd = (req.body && typeof req.body === "object") ? req.body : {};

    try {
      // 2) dedup
      if (upd.update_id != null && repo.seenUpdate(upd.update_id)) { res.status(200).json({ ok: true, dup: true }); return; }

      // 3) /start em chat privado
      const msg = upd.message;
      if (msg && msg.chat && msg.chat.type === "private" && typeof msg.text === "string" && msg.text.indexOf("/start") === 0) {
        const parts = msg.text.trim().split(/\s+/);
        const token = parts[1] || "";
        const from = msg.from || {};
        const r = repo.consumeStartToken(token, {
          tgUserId: from.id, chatId: msg.chat.id, chatType: "private",
          username: from.username, firstName: from.first_name
        });
        if (r.ok) {
          repo.enqueue({
            triggerId: "link-ok:" + msg.chat.id + ":" + (upd.update_id || Date.now()),
            dvlUserId: r.connection.dvl_user_id,
            text: messages.confirmationText(r.connection),
            destinationId: msg.chat.id
          });
        } else {
          // sem conexão ainda -> envia direto, fire-and-forget
          Promise.resolve(api.sendMessage(msg.chat.id, messages.linkErrorText(r.reason))).catch(() => {});
        }
        res.status(200).json({ ok: true });
        return;
      }

      // 4) bot bloqueado / removido
      if (upd.my_chat_member && upd.my_chat_member.new_chat_member) {
        const st = upd.my_chat_member.new_chat_member.status;
        const chatId = upd.my_chat_member.chat && upd.my_chat_member.chat.id;
        if ((st === "kicked" || st === "left") && chatId != null) {
          const conn = repo.getConnectionByChat(chatId);
          if (conn) repo.setStatus(conn.dvl_user_id, "blocked");
        }
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      // nunca deixar o Telegram reenviar em loop por erro nosso
      try { res.status(200).json({ ok: true }); } catch (_) {}
    }
  };
}

module.exports = { makeHandler };
