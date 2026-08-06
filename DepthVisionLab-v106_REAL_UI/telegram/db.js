"use strict";
/* DVL Telegram Alerts V1 — camada SQLite (node:sqlite, nativo do Node 22;
   sem dependência nativa). Abstraído aqui pra poder trocar por better-sqlite3
   depois sem tocar no resto. Abre o banco sob demanda e roda a migration. */

const fs = require("fs");
const path = require("path");
const config = require("./config");

let _db = null;
let _driver = null;

/* Abre um handle SQLite agnóstico de driver. Tenta o node:sqlite nativo
   (Node >= 22.5); se não existir, cai pro better-sqlite3 (native). Ambos
   expõem exec()/prepare().run|get|all() com a mesma semântica que o repo usa.
   Se nenhum estiver disponível, lança — e o install() trata (feature off). */
function openDriver(dbPath) {
  try {
    const { DatabaseSync } = require("node:sqlite");
    _driver = "node:sqlite";
    return new DatabaseSync(dbPath);
  } catch (e1) {
    try {
      const Database = require("better-sqlite3");
      _driver = "better-sqlite3";
      return new Database(dbPath);
    } catch (e2) {
      const err = new Error("Nenhum driver SQLite disponível. Instale better-sqlite3 (npm i better-sqlite3) ou use Node >= 22.5 (node:sqlite). node:sqlite=" + (e1 && e1.message) + " | better-sqlite3=" + (e2 && e2.message));
      err.code = "NO_SQLITE_DRIVER";
      throw err;
    }
  }
}

function open() {
  if (_db) return _db;
  const dbPath = config.dbPath;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = openDriver(dbPath);
  _db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;");
  migrate(_db);
  return _db;
}
function driver() { return _driver; }

function migrate(db) {
  db.exec(`
    /* identidade estável do "usuário" (V1 = dispositivo, ver identity.js).
       Quando/ se houver contas reais, dvl_user_id passa a ser a conta. */
    CREATE TABLE IF NOT EXISTS device_identity (
      dvl_user_id     TEXT PRIMARY KEY,
      created_at      INTEGER NOT NULL,
      last_seen_at    INTEGER NOT NULL,
      label           TEXT
    );

    /* vínculo DVL <-> chat privado do Telegram (um por usuário) */
    CREATE TABLE IF NOT EXISTS telegram_connections (
      dvl_user_id        TEXT PRIMARY KEY,
      telegram_user_id   INTEGER,
      telegram_chat_id   INTEGER UNIQUE,
      chat_type          TEXT DEFAULT 'private',
      telegram_username   TEXT,
      telegram_first_name TEXT,
      status             TEXT NOT NULL DEFAULT 'disconnected', -- active|paused|expired|blocked|disconnected
      active_until       INTEGER,      -- epoch ms; NULL = até cancelar
      connected_at       INTEGER,
      paused_at          INTEGER,
      blocked_at         INTEGER,
      last_success_at    INTEGER,
      last_error_code    TEXT,
      updated_at         INTEGER NOT NULL
    );

    /* tokens de vínculo (deep-link). Guardamos só o SHA-256, uso único, 5min. */
    CREATE TABLE IF NOT EXISTS telegram_link_tokens (
      request_id          TEXT PRIMARY KEY,
      dvl_user_id         TEXT NOT NULL,
      token_hash          TEXT NOT NULL UNIQUE,
      requested_duration  TEXT,          -- código normalizado ("1h","today","24h","7d","30d","forever" ou "custom:<ms>")
      token_expires_at    INTEGER NOT NULL,
      used_at             INTEGER,
      created_at          INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_link_user_used ON telegram_link_tokens(dvl_user_id, used_at);

    /* fila durável de entregas (idempotente por gatilho+canal+destino) */
    CREATE TABLE IF NOT EXISTS alert_deliveries (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_id          TEXT NOT NULL,
      alert_id            TEXT,
      dvl_user_id         TEXT NOT NULL,
      channel             TEXT NOT NULL DEFAULT 'telegram',
      destination_id      INTEGER,        -- telegram_chat_id resolvido no envio
      text                TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending', -- pending|sending|delivered|retry|failed|skipped
      attempt_count       INTEGER NOT NULL DEFAULT 0,
      next_attempt_at     INTEGER NOT NULL DEFAULT 0,
      provider_message_id INTEGER,
      provider_error_code TEXT,
      provider_error_text TEXT,
      created_at          INTEGER NOT NULL,
      sent_at             INTEGER,
      UNIQUE(trigger_id, channel, destination_id)
    );
    CREATE INDEX IF NOT EXISTS idx_deliv_claim ON alert_deliveries(status, next_attempt_at);

    /* dedup de updates do webhook do Telegram */
    CREATE TABLE IF NOT EXISTS telegram_updates (
      update_id   INTEGER PRIMARY KEY,
      received_at INTEGER NOT NULL
    );
  `);
}

function db() { return open(); }
function close() { if (_db) { try { _db.close(); } catch (_) {} _db = null; } }

module.exports = { db, open, close, driver };
