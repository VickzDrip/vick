"use strict";
/* DVL Telegram Alerts V1 — instalador. server.js chama telegram.install(app)
   de forma LAZY + GUARDADA (só quando há TELEGRAM_BOT_TOKEN), então a ausência
   deste módulo ou de node:sqlite nunca derruba o servidor. */

const express = require("express");
const config = require("./config");

let _worker = null;

function install(app) {
  const identity = require("./identity");
  const { makeHandler } = require("./webhook");
  const { makeRouter } = require("./routes");
  const { makeWorker } = require("./worker");
  const jsonMw = express.json({ limit: "16kb" });

  const enabled = config.enabled();

  // webhook só quando ligado (Telegram só chama se setWebhook foi configurado)
  if (enabled) {
    app.post(config.webhookPath, jsonMw, makeHandler());
  }
  // rotas de usuário (sempre montadas; auto-gate em enabled:false p/ o frontend saber)
  app.use("/api/telegram", jsonMw, identity.middleware, makeRouter());

  if (enabled) {
    require("./db").open();               // garante DB + migração no boot
    _worker = makeWorker().start();
    console.log("[DVL Telegram] ENABLED — worker started · bot=@" + config.botUsername + " · webhook=" + config.webhookUrl + " · mode=" + config.mode);
  } else {
    console.log("[DVL Telegram] disabled (sem TELEGRAM_BOT_TOKEN) — rotas montadas respondendo enabled:false");
  }
  return { enabled, worker: _worker };
}

module.exports = { install, config };
