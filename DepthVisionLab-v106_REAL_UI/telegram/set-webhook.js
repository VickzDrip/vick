#!/usr/bin/env node
"use strict";
/* DVL Telegram Alerts V1 — configura/inspeciona o webhook do bot.
   Rode NO SERVIDOR (onde as env estão definidas):
     node telegram/set-webhook.js set     # registra o webhook (usa o secret)
     node telegram/set-webhook.js info     # getWebhookInfo (pending/erros)
     node telegram/set-webhook.js delete   # remove o webhook
     node telegram/set-webhook.js me       # getMe (valida o token)
   Nunca imprime o token. */

const config = require("./config");
const api = require("./api");

async function main() {
  const cmd = (process.argv[2] || "info").toLowerCase();
  if (!config.botToken) { console.error("ERRO: TELEGRAM_BOT_TOKEN ausente no ambiente."); process.exit(2); }

  if (cmd === "me") {
    const r = await api.getMe();
    console.log(JSON.stringify(r.result || r, null, 2));
    return;
  }
  if (cmd === "set") {
    if (!config.webhookSecret) { console.error("ERRO: TELEGRAM_WEBHOOK_SECRET ausente."); process.exit(2); }
    const r = await api.setWebhook(config.webhookUrl, config.webhookSecret);
    console.log("setWebhook ->", JSON.stringify(r.result != null ? r.result : r));
    console.log("url:", config.webhookUrl);
    return;
  }
  if (cmd === "delete") {
    const r = await api.deleteWebhook();
    console.log("deleteWebhook ->", JSON.stringify(r.result != null ? r.result : r));
    return;
  }
  // info
  const r = await api.getWebhookInfo();
  console.log(JSON.stringify(r.result || r, null, 2));
}

main().catch(e => { console.error("falhou:", e && e.message); process.exit(1); });
