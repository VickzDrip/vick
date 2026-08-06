"use strict";
/* DVL Telegram Alerts V1 — cliente da Bot API (usa global fetch do Node 22).
   No servidor de produção há internet direta (sem proxy), então fetch para
   api.telegram.org funciona normalmente. Token lido só do config (env). */

const config = require("./config");

function apiUrl(method) {
  return "https://api.telegram.org/bot" + config.botToken + "/" + method;
}

async function call(method, body, timeoutMs) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs || 12000);
  try {
    const res = await fetch(apiUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: ctrl.signal
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { httpStatus: res.status, ok: !!(json && json.ok), result: json && json.result, error: json };
  } catch (e) {
    return { httpStatus: 0, ok: false, networkError: String(e && e.message || e) };
  } finally {
    clearTimeout(to);
  }
}

/* sendMessage — HTML, sem preview de link. Retorna forma normalizada:
   { ok, messageId?, retryAfter?, code?, description?, blocked? } */
async function sendMessage(chatId, text, opts) {
  opts = opts || {};
  const body = {
    chat_id: chatId,
    text: String(text),
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;
  const r = await call("sendMessage", body);
  if (r.ok) return { ok: true, messageId: r.result && r.result.message_id };
  // erros do Telegram
  const err = r.error || {};
  const code = err.error_code || r.httpStatus || 0;
  const desc = err.description || r.networkError || "erro";
  const retryAfter = err.parameters && err.parameters.retry_after;
  const blocked = code === 403; // bot bloqueado / chat inexistente
  return { ok: false, code, description: desc, retryAfter, blocked };
}

async function getMe() { return call("getMe"); }

async function setWebhook(url, secretToken) {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
    drop_pending_updates: false
  });
}
async function deleteWebhook() { return call("deleteWebhook", { drop_pending_updates: false }); }
async function getWebhookInfo() { return call("getWebhookInfo"); }

module.exports = { sendMessage, getMe, setWebhook, deleteWebhook, getWebhookInfo, call };
