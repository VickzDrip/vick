"use strict";

/* ── DVL VP Alerts (backend-watched, Telegram) ─────────────────────────────
   Alerta quando o preço chega PERTO de qualquer linha do Volume Profile de 1m,
   independente de qual seja (POC/VAH/VAL de hoje e do dia anterior = OPOC/OVAH/OVAL).
   Roda no servidor (funciona com o app fechado): o backend calcula o VP de 1m,
   acompanha o preço ao vivo e envia a notificação pro Telegram do usuário.

   Critério de proximidade (por que este):
     • Banda ADAPTATIVA ao ATR(14) do 1m — em mercado agitado a "vela" é maior, então
       a distância que conta como "perto" também é maior; em mercado parado, aperta.
     • Piso e teto em % do preço pra a banda nunca virar 0 nem gigante.
     • Dispara na ENTRADA da banda (transição fora→dentro), não repetidamente.
     • HISTERESE: só re-arma quando o preço sai além de ~2.2× a banda (evita flapping
       quando o preço fica "colado" na linha).
     • COOLDOWN por linha (min) pra não spammar a mesma linha. */

const vp = require("./vp");

const DATA_FILE = process.env.DVL_VPALERTS_FILE ||
  require("path").join(process.cwd(), "data", "vp-alerts.json");
const fs = require("fs");

/* ── config persistida ────────────────────────────────────────────────── */
const DEFAULTS = {
  enabled: false,
  symbol: "BTCUSDT",
  tgToken: "",
  tgChatId: "",
  sensitivity: "media",   // baixa | media | alta  (quão cedo avisa)
  cooldownMin: 20,
  watchToday: true,       // POC/VAH/VAL
  watchPrevDay: true      // OPOC/OVAH/OVAL (dia anterior / overnight)
};
const SENS_MULT = { baixa: 0.15, media: 0.30, alta: 0.55 };  // × ATR(14) 1m

let cfg = Object.assign({}, DEFAULTS);
function load() {
  try { cfg = Object.assign({}, DEFAULTS, JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))); }
  catch (_) { cfg = Object.assign({}, DEFAULTS); }
}
function save() {
  try {
    fs.mkdirSync(require("path").dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(cfg, null, 2));
  } catch (_) {}
}
load();

/* ── estado de runtime ────────────────────────────────────────────────── */
let levels = [];              // [{key,name,price,group}]
let atr = 0, lastPrice = 0, priceScale = 0;
let computedAt = 0, lastError = "", lastNotice = null;
const arm = {};               // key -> { inside:bool, lastFired:ts }
let levelsTimer = null, tickTimer = null;

function cleanSym(s) { return String(s || "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

async function getJSON(url, timeoutMs) {
  const signal = (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(timeoutMs || 12000) : undefined;
  const res = await fetch(url, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* ~2 dias de klines de 1m (para hoje + dia anterior). fapi limita 1500/req. */
async function fetch1m(symbol) {
  symbol = cleanSym(symbol);
  const now = Date.now();
  const start = now - 2 * 86400000 - 60000;
  const bars = [];
  let cursor = start, calls = 0;
  while (cursor < now && calls < 6) {
    calls++;
    const url = "https://fapi.binance.com/fapi/v1/klines?symbol=" + symbol +
      "&interval=1m&startTime=" + cursor + "&limit=1500";
    const d = await getJSON(url);
    if (!Array.isArray(d) || !d.length) break;
    for (let i = 0; i < d.length; i++) {
      const k = d[i];
      bars.push({ time: Number(k[0]), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] });
    }
    const lastOpen = Number(d[d.length - 1][0]);
    if (!(lastOpen > cursor)) break;
    cursor = lastOpen + 60000;
    if (d.length < 1500) break;
  }
  return bars;
}

/* ATR(14) sobre as barras de 1m (true range médio). */
function computeATR(bars, n) {
  n = n || 14;
  if (!bars || bars.length < n + 1) return 0;
  const tr = [];
  for (let i = bars.length - n; i < bars.length; i++) {
    const c = bars[i], p = bars[i - 1];
    const t = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    if (isFinite(t)) tr.push(t);
  }
  if (!tr.length) return 0;
  return tr.reduce((a, b) => a + b, 0) / tr.length;
}

/* Recalcula os níveis de VP (hoje + dia anterior) a partir dos klines de 1m. */
async function refreshLevels() {
  try {
    const bars = await fetch1m(cfg.symbol);
    if (!bars.length) throw new Error("sem klines 1m");
    const atTs = bars[bars.length - 1].time + 60000;
    const sl = vp.sessionLevels(bars, atTs, { rows: 120, vaPct: 0.70, winBars: 120 });
    const out = [];
    if (cfg.watchToday && sl.today) {
      out.push({ key: "today.poc", name: "POC", group: "hoje", price: sl.today.poc });
      out.push({ key: "today.vah", name: "VAH", group: "hoje", price: sl.today.vah });
      out.push({ key: "today.val", name: "VAL", group: "hoje", price: sl.today.val });
    }
    if (cfg.watchPrevDay && sl.prevDay) {
      out.push({ key: "prev.poc", name: "OPOC", group: "dia ant.", price: sl.prevDay.poc });
      out.push({ key: "prev.vah", name: "OVAH", group: "dia ant.", price: sl.prevDay.vah });
      out.push({ key: "prev.val", name: "OVAL", group: "dia ant.", price: sl.prevDay.val });
    }
    levels = out.filter(l => isFinite(l.price) && l.price > 0);
    atr = computeATR(bars, 14);
    priceScale = bars[bars.length - 1].close || 0;
    computedAt = Date.now();
    lastError = "";
  } catch (e) { lastError = "níveis: " + String(e && e.message || e); }
}

/* Banda de proximidade em unidades de preço. */
function band() {
  const price = lastPrice || priceScale || 0;
  const base = (SENS_MULT[cfg.sensitivity] || SENS_MULT.media) * (atr || 0);
  const floor = price * 0.0004;   // 0.04% (nunca 0)
  const cap = price * 0.0025;     // 0.25% (nunca gigante)
  return Math.max(floor, Math.min(cap, base || floor));
}

async function getPrice(symbol) {
  const d = await getJSON("https://fapi.binance.com/fapi/v1/ticker/price?symbol=" + cleanSym(symbol), 8000);
  const p = Number(d && d.price);
  return isFinite(p) ? p : 0;
}

function fmt(p) {
  p = +p; if (!isFinite(p)) return "?";
  if (p >= 1000) return p.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(4);
}

async function sendTelegram(text) {
  if (!cfg.tgToken || !cfg.tgChatId) throw new Error("Telegram não configurado (token/chat id)");
  const url = "https://api.telegram.org/bot" + cfg.tgToken + "/sendMessage";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: cfg.tgChatId, text: text, parse_mode: "HTML", disable_web_page_preview: true })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error("Telegram: " + (j && j.description || ("HTTP " + res.status)));
  return true;
}

async function fire(line, price) {
  const dist = Math.abs(price - line.price);
  const pct = price > 0 ? (dist / price) * 100 : 0;
  const dir = price >= line.price ? "acima ↑" : "abaixo ↓";
  const text =
    "🔔 <b>" + cleanSym(cfg.symbol) + "</b> perto de <b>" + line.name + "</b> (" + line.group + ", 1m)\n" +
    "Preço <b>" + fmt(price) + "</b> · linha " + fmt(line.price) + "\n" +
    "Δ " + fmt(dist) + " (" + pct.toFixed(3) + "%) · preço " + dir;
  lastNotice = { at: Date.now(), key: line.key, name: line.name, group: line.group, price, level: line.price, pct };
  try { await sendTelegram(text); lastNotice.sent = true; }
  catch (e) { lastNotice.sent = false; lastNotice.err = String(e && e.message || e); lastError = lastNotice.err; }
}

/* Um ciclo de verificação: pega o preço e checa cada linha. */
async function tick() {
  if (!cfg.enabled || !levels.length) return;
  let price;
  try { price = await getPrice(cfg.symbol); } catch (e) { lastError = "preço: " + String(e && e.message || e); return; }
  if (!(price > 0)) return;
  lastPrice = price;
  const b = band(), reArm = b * 2.2, now = Date.now(), coolMs = Math.max(1, +cfg.cooldownMin || 20) * 60000;
  for (const line of levels) {
    const dist = Math.abs(price - line.price);
    const st = arm[line.key] || (arm[line.key] = { inside: false, lastFired: 0 });
    if (dist <= b) {
      if (!st.inside && (now - st.lastFired) > coolMs) { st.lastFired = now; fire(line, price); }
      st.inside = true;
    } else if (dist > reArm) {
      st.inside = false;   // saiu da zona → pronto pra alertar de novo na próxima aproximação
    }
  }
}

/* ── controle dos timers ──────────────────────────────────────────────── */
function stopTimers() {
  if (levelsTimer) { clearInterval(levelsTimer); levelsTimer = null; }
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
}
function startTimers() {
  stopTimers();
  refreshLevels();
  levelsTimer = setInterval(refreshLevels, 60000);   // níveis mudam devagar
  tickTimer = setInterval(tick, 6000);               // preço a cada 6s
  if (levelsTimer.unref) levelsTimer.unref();
  if (tickTimer.unref) tickTimer.unref();
}
function sync() { if (cfg.enabled) startTimers(); else stopTimers(); }
sync();

/* ── API pública (usada pelo server.js) ───────────────────────────────── */
function getConfig() {
  return {
    enabled: cfg.enabled, symbol: cfg.symbol, sensitivity: cfg.sensitivity,
    cooldownMin: cfg.cooldownMin, watchToday: cfg.watchToday, watchPrevDay: cfg.watchPrevDay,
    hasCreds: !!(cfg.tgToken && cfg.tgChatId)
  };
}
function setConfig(p) {
  p = p || {};
  const symChanged = p.symbol !== undefined && cleanSym(p.symbol) !== cleanSym(cfg.symbol);
  if (p.enabled !== undefined) cfg.enabled = !!p.enabled;
  if (p.symbol !== undefined) cfg.symbol = cleanSym(p.symbol);
  if (p.sensitivity !== undefined && SENS_MULT[p.sensitivity]) cfg.sensitivity = p.sensitivity;
  if (p.cooldownMin !== undefined) cfg.cooldownMin = Math.max(1, Math.min(240, +p.cooldownMin || 20));
  if (p.watchToday !== undefined) cfg.watchToday = !!p.watchToday;
  if (p.watchPrevDay !== undefined) cfg.watchPrevDay = !!p.watchPrevDay;
  if (typeof p.tgToken === "string" && p.tgToken.trim()) cfg.tgToken = p.tgToken.trim();
  if (typeof p.tgChatId === "string" && p.tgChatId.trim()) cfg.tgChatId = p.tgChatId.trim();
  if (p.clearCreds) { cfg.tgToken = ""; cfg.tgChatId = ""; }
  if (symChanged) { for (const k in arm) delete arm[k]; levels = []; }
  save();
  sync();
  if (cfg.enabled && (symChanged || !levels.length)) refreshLevels();
  return getConfig();
}
function status() {
  const b = band();
  return {
    ok: true, ...getConfig(),
    atr, lastPrice, computedAt, lastError, lastNotice,
    band: b,
    levels: levels.map(l => ({
      name: l.name, group: l.group, price: l.price,
      dist: lastPrice ? Math.abs(lastPrice - l.price) : null,
      near: lastPrice ? Math.abs(lastPrice - l.price) <= b : false
    }))
  };
}
async function testPush() {
  try {
    await sendTelegram("✅ DVL — teste de alerta VP. Se você recebeu isso, o Telegram está configurado certo.");
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

/* Descobre o chat id automaticamente lendo o getUpdates do bot (o usuário só
   precisa ter mandado /start pro bot). Se achar, salva no config. */
async function discoverChatId(token) {
  const tk = (token && String(token).trim()) || cfg.tgToken;
  if (!tk) return { ok: false, error: "sem token" };
  try {
    const d = await getJSON("https://api.telegram.org/bot" + tk + "/getUpdates", 10000);
    if (!d || !d.ok || !Array.isArray(d.result)) return { ok: false, error: "getUpdates falhou" };
    let chat = null;
    for (let i = d.result.length - 1; i >= 0; i--) {
      const u = d.result[i];
      const m = u.message || u.edited_message || (u.my_chat_member && u.my_chat_member) || {};
      if (m.chat && m.chat.id != null) { chat = m.chat; break; }
    }
    if (!chat) return { ok: false, error: "nenhuma conversa encontrada — mande /start pro bot e tente de novo" };
    cfg.tgToken = tk;
    cfg.tgChatId = String(chat.id);
    save();
    const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || String(chat.id);
    return { ok: true, chatId: String(chat.id), name };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

module.exports = { getConfig, setConfig, status, testPush, discoverChatId, refreshLevels, _internal: { computeATR, band: () => band(), tick } };
