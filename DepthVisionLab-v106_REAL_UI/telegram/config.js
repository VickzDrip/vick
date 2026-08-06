"use strict";
/* DVL Telegram Alerts V1 — configuração (segredos SÓ no servidor).
   Tudo desligado por padrão: enabled() só é true quando o operador define
   TELEGRAM_BOT_TOKEN (e não desliga via TELEGRAM_ENABLED=0). Assim o código
   pode ser commitado/deployado sem disparar nada até a configuração real. */

function env(name, def) {
  const v = process.env[name];
  return (v === undefined || v === null || v === "") ? def : v;
}

const config = {
  // liga a feature só quando há token; TELEGRAM_ENABLED=0 força desligar
  get botToken() { return env("TELEGRAM_BOT_TOKEN", ""); },
  get botUsername() { return env("TELEGRAM_BOT_USERNAME", "DVLAlertsBot"); },
  get webhookSecret() { return env("TELEGRAM_WEBHOOK_SECRET", ""); },
  get publicUrl() { return env("DVL_PUBLIC_URL", "https://depthvisionlab.com").replace(/\/+$/, ""); },
  get webhookPath() { return "/api/telegram/webhook"; },
  get webhookUrl() { return this.publicUrl + this.webhookPath; },
  // caminho do banco (fica fora do git; ver .gitignore)
  get dbPath() { return env("DVL_TELEGRAM_DB", require("path").join(__dirname, "..", "data", "dvl-telegram.db")); },
  // modo de disparo: informativo p/ a UI ("client" = só com DVL aberto)
  get mode() { return env("DVL_ALERTS_MODE", "server"); }, // "server" | "client"

  enabled() {
    if (env("TELEGRAM_ENABLED", "") === "0") return false;
    return !!this.botToken;
  },
  // pronto pra RECEBER updates do webhook (precisa do secret também)
  webhookReady() {
    return this.enabled() && !!this.webhookSecret;
  }
};

module.exports = config;
