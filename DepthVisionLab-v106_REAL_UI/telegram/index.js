"use strict";
/* DVL Telegram Alerts V1 — instalador. server.js chama telegram.install(app)
   de forma LAZY + GUARDADA (só quando há TELEGRAM_BOT_TOKEN), então a ausência
   deste módulo ou de um driver SQLite nunca derruba o servidor. */

const express = require("express");
const config = require("./config");

let _worker = null;

function install(app) {
  const dbmod = require("./db");

  // 1) Testa o driver SQLite ANTES de montar qualquer rota que dependa dele.
  //    Se falhar, monta só um /status estático (enabled:false) — sem erros.
  let dbErr = null;
  try { dbmod.open(); } catch (e) { dbErr = e; }
  if (dbErr) {
    app.get("/api/telegram/status", (req, res) =>
      res.json({ enabled: false, reason: "no_sqlite_driver", detail: String(dbErr && dbErr.message || dbErr) }));
    console.warn("[DVL Telegram] SQLite indisponível — feature OFF. Instale better-sqlite3 (npm i better-sqlite3) ou Node>=22.5. " + (dbErr && dbErr.message));
    return { enabled: false, dbOk: false };
  }

  // 2) DB ok — monta tudo.
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
    console.log("[DVL Telegram] ENABLED (" + dbmod.driver() + ") — worker started · bot=@" + config.botUsername + " · webhook=" + config.webhookUrl + " · mode=" + config.mode);
  } else {
    console.log("[DVL Telegram] driver=" + dbmod.driver() + " ok, mas sem TELEGRAM_BOT_TOKEN — rotas respondem enabled:false");
  }
  return { enabled, dbOk: true, worker: _worker };
}

module.exports = { install, config };
