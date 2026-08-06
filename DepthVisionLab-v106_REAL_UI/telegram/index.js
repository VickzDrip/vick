"use strict";
/* DVL Telegram Alerts V1 — instalador. server.js chama telegram.install(app)
   de forma LAZY + GUARDADA (só quando há TELEGRAM_BOT_TOKEN), então a ausência
   deste módulo ou de um driver SQLite nunca derruba o servidor. */

const express = require("express");
const config = require("./config");

let _worker = null;
let _evaluator = null;

function install(app) {
  const store = require("./store");

  // 1) Carrega o store puro-JS (sem SQLite/nativo). Se por algum motivo falhar,
  //    monta só um /status estático — sem derrubar nada.
  let stErr = null;
  try { store.load(); } catch (e) { stErr = e; }
  if (stErr) {
    app.get("/api/telegram/status", (req, res) =>
      res.json({ enabled: false, reason: "store_unavailable", detail: String(stErr && stErr.message || stErr) }));
    console.warn("[DVL Telegram] store indisponível — feature OFF. " + (stErr && stErr.message));
    return { enabled: false, dbOk: false };
  }

  // 2) Store ok — monta tudo.
  const identity = require("./identity");
  const { makeHandler } = require("./webhook");
  const { makeRouter } = require("./routes");
  const { makeWorker } = require("./worker");
  const jsonMw = express.json({ limit: "16kb" });
  const enabled = config.enabled();

  if (enabled) app.post(config.webhookPath, jsonMw, makeHandler());
  app.use("/api/telegram", jsonMw, identity.middleware, makeRouter());

  if (enabled) {
    _worker = makeWorker().start();
    // avaliação server-side 24/7 (só no modo "server")
    if (config.mode === "server") {
      try { _evaluator = require("./evaluator").makeEvaluator().start(); } catch (e) { console.warn("[DVL Telegram] evaluator não iniciou:", e && e.message); }
    }
    console.log("[DVL Telegram] ENABLED (store puro-JS) — worker" + (_evaluator ? "+evaluator" : "") + " started · bot=@" + config.botUsername + " · webhook=" + config.webhookUrl + " · mode=" + config.mode);
  } else {
    console.log("[DVL Telegram] store ok, mas sem TELEGRAM_BOT_TOKEN — rotas respondem enabled:false");
  }
  return { enabled, dbOk: true, worker: _worker };
}

module.exports = { install, config };
