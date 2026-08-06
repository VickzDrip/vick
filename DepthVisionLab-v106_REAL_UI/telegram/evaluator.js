"use strict";
/* DVL Telegram Alerts V1 — avaliador SERVER-SIDE (24/7, DVL fechado).
   Roda as MESMAS condições dos alertas no backend, a partir dos klines da
   Binance, e enfileira a entrega no Telegram quando dispara. Não recria a lógica
   do cliente: replica só as condições avaliáveis com OHLCV. Fase 4a: fonte
   "price" (cruza nível, movimento rápido %). Regras cujo usuário está com o DVL
   ABERTO (heartbeat) são puladas — o cliente já entrega via /trigger, evitando
   duplicidade. Klines cacheados por símbolo|TF pra poupar a API da Binance. */

const _repo = require("./repo");
const _messages = require("./messages");

const KLINE_TTL = 8000;     // cache de klines
const LOOP_MS = 6000;       // intervalo do loop de avaliação
const BINANCE = "https://api.binance.com/api/v3/klines";

function fmt(p) { p = Number(p); if (!isFinite(p)) return "?"; return p >= 1000 ? p.toLocaleString("en-US", { maximumFractionDigits: 2 }) : p >= 1 ? p.toFixed(2) : p.toPrecision(5); }
function short(s) { return String(s || "").replace(/USDT$/, ""); }

async function defaultFetchKlines(symbol, interval, limit) {
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(BINANCE + "?symbol=" + encodeURIComponent(symbol) + "&interval=" + encodeURIComponent(interval) + "&limit=" + (limit || 120), { signal: ctrl.signal });
    clearTimeout(to);
    const j = await r.json();
    return Array.isArray(j) ? j : null;
  } catch (_) { return null; }
}

function serverEvaluable(rule) { return rule.source === "price"; } // Fase 4a

function makeEvaluator(opts) {
  opts = opts || {};
  const repo = opts.repo || _repo;
  const messages = opts.messages || _messages;
  const fetchKlines = opts.fetchKlines || defaultFetchKlines;
  const now = opts.now || Date.now;
  const klineTtl = (opts.klineTtl != null) ? opts.klineTtl : KLINE_TTL;
  const klineCache = new Map();
  const priceHist = new Map();
  let timer = null, running = false;

  async function getKlines(symbol, interval) {
    const key = symbol + "|" + interval;
    const c = klineCache.get(key);
    if (c && now() - c.t < klineTtl) return c.klines;
    const kl = await fetchKlines(symbol, interval, 120);
    if (kl && kl.length) klineCache.set(key, { t: now(), klines: kl });
    return kl;
  }
  function lastClose(kl) { const k = kl && kl[kl.length - 1]; return k ? Number(k[4]) : null; }
  function barOpenTime(kl) { const k = kl && kl[kl.length - 1]; return k ? Number(k[0]) : null; }

  function pushPrice(symbol, p) {
    let h = priceHist.get(symbol); if (!h) { h = []; priceHist.set(symbol, h); }
    const t = now(); h.push({ t, p }); const cut = t - 5 * 60000; while (h.length && h[0].t < cut) h.shift();
    return h;
  }
  function priceAgo(symbol, ms) {
    const h = priceHist.get(symbol) || []; const want = now() - ms; let ref = null;
    for (let i = 0; i < h.length; i++) { if (h[i].t <= want) ref = h[i].p; else break; }
    if (ref == null && h.length) ref = h[0].p;
    return ref;
  }

  function canFire(userId, rule, dir, barTime) {
    const st = repo.getEvalState(userId, rule.id) || {};
    const mode = rule.rearm || "time";
    if (mode === "bar" || mode === "bar_dir") {
      if (barTime != null && st.lastBar === barTime) { if (mode === "bar") return false; if ((dir || "") === (st.lastDir || "")) return false; }
      return true;
    }
    if (st.lastFired && (now() - st.lastFired) < ((rule.cooldownSec || 0) * 1000)) return false;
    return true;
  }

  function fire(userId, conn, rule, ev) {
    if (!canFire(userId, rule, ev.dir, ev.barTime)) return false;
    repo.setEvalState(userId, rule.id, { lastFired: now(), lastBar: ev.barTime, lastDir: ev.dir || "" });
    const text = messages.alertText({ symbol: ev.symbol, timeframe: ev.tf, source: rule.source, title: "Preço", message: ev.message, price: ev.price });
    const triggerId = "srv:" + userId + ":" + rule.id + ":" + (ev.barTime || now()) + ":" + (ev.dir || "");
    repo.enqueue({ triggerId, alertId: rule.id, dvlUserId: userId, text, destinationId: conn.telegram_chat_id });
    // histórico p/ o painel (Recentes) — mesmo com o DVL fechado
    repo.addHistory(userId, { msg: ev.message, ts: now(), tf: ev.tf, sym: ev.symbol, source: rule.source, dir: ev.dir });
    return true;
  }

  async function evalPriceRule(userId, conn, rule) {
    const symbol = String(rule.symbol || "BTCUSDT").toUpperCase();
    const tf = rule.evalTf || rule.tf; if (!tf || tf === "chart") return; // precisa de TF concreto
    const kl = await getKlines(symbol, tf); if (!kl || !kl.length) return;
    const p = lastClose(kl); if (p == null || !isFinite(p)) return;
    const barTime = barOpenTime(kl);
    const st = repo.getEvalState(userId, rule.id) || {};
    const prev = st.prevPrice;
    pushPrice(symbol, p);

    if (rule.signal === "cross_up" && rule.level != null && prev != null) {
      if (prev < rule.level && p >= rule.level) fire(userId, conn, rule, { dir: "up", price: p, symbol, tf, barTime, message: "Preço cruzou ACIMA de " + fmt(rule.level) + " (" + short(symbol) + ")" });
    } else if (rule.signal === "cross_down" && rule.level != null && prev != null) {
      if (prev > rule.level && p <= rule.level) fire(userId, conn, rule, { dir: "down", price: p, symbol, tf, barTime, message: "Preço cruzou ABAIXO de " + fmt(rule.level) + " (" + short(symbol) + ")" });
    } else if (rule.signal === "pct_fast" && rule.level != null) {
      const ref = priceAgo(symbol, 60000);
      if (ref != null && ref > 0) {
        const chg = ((p - ref) / ref) * 100, dir = chg >= 0 ? "up" : "down";
        if (Math.abs(chg) >= Math.abs(rule.level) && (rule.dir === "any" || !rule.dir || rule.dir === dir))
          fire(userId, conn, rule, { dir, price: p, symbol, tf, barTime, message: "Movimento rápido " + (chg >= 0 ? "+" : "") + chg.toFixed(2) + "% em ~1min (" + short(symbol) + ")" });
      }
    }
    repo.setEvalState(userId, rule.id, { prevPrice: p }, false); // transiente (não grava disco toda hora)
  }

  async function tick() {
    if (running) return; running = true;
    try {
      const items = repo.listEvalRules();
      for (const it of items) {
        if (repo.isClientActive(it.userId)) continue; // DVL aberto -> cliente entrega
        if (!serverEvaluable(it.rule)) continue;
        try { await evalPriceRule(it.userId, it.conn, it.rule); } catch (_) {}
      }
    } finally { running = false; }
  }

  return {
    tick,
    start() { if (!timer) timer = setInterval(tick, LOOP_MS); if (timer.unref) timer.unref(); return this; },
    stop() { if (timer) { clearInterval(timer); timer = null; } }
  };
}

module.exports = { makeEvaluator, serverEvaluable };
