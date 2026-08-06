"use strict";
/* DVL Telegram Alerts V1 — persistência PURA em JavaScript (sem SQLite nativo
   nem node:sqlite experimental). Um único processo (pm2 fork) lê tudo em
   memória e grava o JSON de forma ATÔMICA (tmp + rename) a cada mutação. Volume
   é baixo (conexões, tokens, entregas), então isto é robusto e simples, e NÃO
   tem módulo nativo que possa derrubar o servidor. Mesma API que o repo espera. */

const fs = require("fs");
const path = require("path");
const config = require("./config");

function jsonPath() {
  // reaproveita o caminho configurado, trocando a extensão pra .json
  const p = config.dbPath;
  return p.replace(/\.db$/i, "") + ".json";
}

const EMPTY = () => ({
  connections: {},   // dvlUserId -> conn
  byChat: {},        // chatId -> dvlUserId
  tokens: {},        // requestId -> token
  deliveries: [],    // [delivery]
  nextDeliveryId: 1,
  updates: {},       // updateId -> ts (dedup de webhook)
  devices: {}        // dvlUserId -> {created_at,last_seen_at,label}
});

let _data = null;
let _loaded = false;

function load() {
  if (_loaded) return _data;
  const p = jsonPath();
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (fs.existsSync(p)) {
      _data = Object.assign(EMPTY(), JSON.parse(fs.readFileSync(p, "utf8")) || {});
    } else {
      _data = EMPTY();
    }
  } catch (e) {
    // arquivo corrompido: não derruba nada — começa limpo e faz backup
    try { if (fs.existsSync(p)) fs.renameSync(p, p + ".bad-" + Date.now()); } catch (_) {}
    _data = EMPTY();
  }
  _loaded = true;
  return _data;
}

let _saveTimer = null;
function save() {
  const p = jsonPath();
  try {
    const tmp = p + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(_data), "utf8");
    fs.renameSync(tmp, p); // rename atômico no mesmo filesystem
  } catch (_) { /* nunca propaga erro de disco pro caller */ }
}
/* pruning leve: mantém a lista de entregas e o dedup enxutos */
function prune() {
  const now = Date.now();
  const keepDeliv = 7 * 24 * 3600e3;
  _data.deliveries = _data.deliveries.filter(d =>
    (d.status === "pending" || d.status === "retry" || d.status === "sending") ||
    (now - (d.created_at || 0) < keepDeliv)
  );
  // limita dedup de updates a ~5000 entradas
  const keys = Object.keys(_data.updates);
  if (keys.length > 5000) {
    keys.sort((a, b) => _data.updates[a] - _data.updates[b]);
    for (let i = 0; i < keys.length - 5000; i++) delete _data.updates[keys[i]];
  }
}

function data() { return load(); }
function commit() { prune(); save(); }

module.exports = { load, data, commit, save, jsonPath, _EMPTY: EMPTY };
