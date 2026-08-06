"use strict";
/* DVL Telegram Alerts V1 — formatação das mensagens (HTML, escapado, curto). */

const config = require("./config");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function fmtPrice(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: n >= 1000 ? 1 : 4 });
}

/* Mensagem de alerta. Recebe o payload canônico (alert.triggered). */
function alertText(ev) {
  ev = ev || {};
  const sym = esc(ev.symbol || "");
  const tf = ev.timeframe || ev.tf;
  const head = sym + (tf ? " · " + esc(tf) : "");
  const title = esc(ev.title || ev.source || "Alerta");
  const msg = esc(ev.message || "");
  const lines = [];
  if (head) lines.push("<b>" + head + "</b>");
  lines.push("🔔 " + (msg || title));
  if (ev.price != null && Number.isFinite(Number(ev.price))) lines.push("Preço: <b>" + esc(fmtPrice(ev.price)) + "</b>");
  if (ev.values && ev.values.score != null) lines.push("Score: " + esc(ev.values.score));
  const link = config.publicUrl + (ev.symbol ? ("/?symbol=" + encodeURIComponent(ev.symbol)) : "");
  lines.push('<a href="' + esc(link) + '">Abrir no DVL</a>');
  return lines.join("\n");
}

function confirmationText(conn) {
  const until = conn && conn.active_until
    ? "Ativo até " + new Date(conn.active_until).toLocaleString("pt-BR")
    : "Ativo até você cancelar";
  return [
    "✅ <b>DVL conectado</b>",
    "Você vai receber seus alertas aqui neste chat privado.",
    esc(until),
    "Gerencie em DVL → Alertas → Telegram."
  ].join("\n");
}

function testText() {
  return [
    "🔔 <b>DVL — teste de alerta</b>",
    "Se você recebeu esta mensagem, o Telegram está conectado e funcionando.",
    '<a href="' + esc(config.publicUrl) + '">Abrir no DVL</a>'
  ].join("\n");
}

function linkErrorText(reason) {
  const base = "Não consegui vincular este chat.";
  const tail = reason === "expired" ? " O link expirou (vale 5 min)."
    : reason === "used" ? " Este link já foi usado."
    : reason === "chat_bound_other" ? " Este chat já está vinculado a outra conta DVL."
    : " Link inválido.";
  return "⚠️ " + esc(base + tail) + "\nGere um novo link em DVL → Alertas → Telegram.";
}

module.exports = { esc, fmtPrice, alertText, confirmationText, testText, linkErrorText };
