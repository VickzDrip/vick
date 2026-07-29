"use strict";

/* ── DVL Depth History (gravador de order book p/ o Deep Heatmap) ────────────
   O heatmap do Deep Heatmap precisa de SNAPSHOTS HISTÓRICOS do book (a matriz
   preço×tempo). O navegador só consegue acumular a partir do momento em que
   conecta; então este módulo grava no SERVIDOR: faz polling do depth da Binance
   SPOT (api.binance.com, alcançável no datacenter) a cada POLL_MS e mantém um
   anel de ~2h por símbolo. O endpoint /api/depth_history serve isso pro
   frontend semear o heatmap já com histórico ("2h carregadas na entrada").

   OBS: como é em memória, o histórico começa do zero quando o servidor sobe
   (deploy/restart) e vai enchendo até ~2h. Símbolos padrão são gravados desde o
   boot; qualquer outro símbolo pedido passa a ser gravado sob demanda. */

const SHOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];

const POLL_MS = 8000;            // 1 snapshot a cada 8s
const RING_MINUTES = 125;        // mantém ~2h05
const MAX_SNAPS = Math.ceil(RING_MINUTES * 60000 / POLL_MS);   // ~938
const BAND_PCT = 2.6;            // guarda níveis dentro de ±2.6% do mid
const MAX_LEVELS = 220;          // teto de níveis por lado (por snapshot)
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const REQ_TIMEOUT = 9000;

const recorders = {};            // symbol -> { snaps:[], timer, lastOk, lastErr, hostIdx }

function cleanSym(s) { return String(s || "BTCUSDT").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

async function getJSON(url, timeoutMs) {
  const signal = (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(timeoutMs || REQ_TIMEOUT) : undefined;
  const res = await fetch(url, signal ? { signal, cache: "no-store" } : { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* filtra os níveis dentro da banda ±BAND_PCT do mid e limita a MAX_LEVELS,
   mantendo os MAIS PRÓXIMOS do mid (que é o que o heatmap mostra). */
function bandLevels(arr, mid, lo, hi, nearAsc) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const p = +arr[i][0], q = +arr[i][1];
    if (!(p > 0) || !(q > 0)) continue;
    if (p < lo || p > hi) continue;
    out.push([p, q]);
  }
  // já vêm ordenados por proximidade do topo do book; corta o excesso
  if (out.length > MAX_LEVELS) out.length = MAX_LEVELS;
  return out;
}

async function pollOnce(rec, symbol) {
  const host = SHOSTS[rec.hostIdx % SHOSTS.length];
  const url = host + "/api/v3/depth?symbol=" + symbol + "&limit=1000";
  let d;
  try { d = await getJSON(url); rec.lastErr = ""; }
  catch (e) { rec.lastErr = String(e && e.message || e); rec.hostIdx++; return; }
  const bids = d.bids || [], asks = d.asks || [];
  if (!bids.length || !asks.length) return;
  const bestBid = +bids[0][0], bestAsk = +asks[0][0];
  if (!(bestBid > 0) || !(bestAsk > 0)) return;
  const mid = (bestBid + bestAsk) / 2;
  const band = mid * (BAND_PCT / 100), lo = mid - band, hi = mid + band;
  const snap = {
    ts: Date.now(),
    mid,
    bids: bandLevels(bids, mid, lo, hi),
    asks: bandLevels(asks, mid, lo, hi)
  };
  rec.snaps.push(snap);
  if (rec.snaps.length > MAX_SNAPS) rec.snaps.splice(0, rec.snaps.length - MAX_SNAPS);
  rec.lastOk = snap.ts;
}

function ensureRecording(symbol) {
  symbol = cleanSym(symbol);
  if (recorders[symbol]) return recorders[symbol];
  const rec = { snaps: [], timer: 0, lastOk: 0, lastErr: "", hostIdx: 0 };
  recorders[symbol] = rec;
  // primeira coleta imediata + polling
  pollOnce(rec, symbol).catch(() => {});
  rec.timer = setInterval(() => { pollOnce(rec, symbol).catch(() => {}); }, POLL_MS);
  if (rec.timer && rec.timer.unref) rec.timer.unref();
  return rec;
}

/* Entrada principal do endpoint. Retorna os snapshots dos últimos `mins`. */
function history(symbol, mins, levels) {
  symbol = cleanSym(symbol);
  mins = Math.max(5, Math.min(RING_MINUTES, Math.round(Number(mins) || 120)));
  const cap = Math.max(20, Math.min(MAX_LEVELS, Math.round(Number(levels) || MAX_LEVELS)));
  const rec = ensureRecording(symbol);   // começa a gravar se ainda não gravava
  const from = Date.now() - mins * 60000;
  const snaps = [];
  for (let i = 0; i < rec.snaps.length; i++) {
    const s = rec.snaps[i];
    if (s.ts < from) continue;
    snaps.push({
      ts: s.ts, mid: s.mid,
      bids: cap < s.bids.length ? s.bids.slice(0, cap) : s.bids,
      asks: cap < s.asks.length ? s.asks.slice(0, cap) : s.asks
    });
  }
  return {
    ok: true, symbol, mins, count: snaps.length,
    pollMs: POLL_MS, ringMinutes: RING_MINUTES,
    coverageMinutes: snaps.length ? Math.round((Date.now() - snaps[0].ts) / 60000) : 0,
    lastErr: rec.lastErr || undefined,
    snapshots: snaps
  };
}

function status() {
  const out = {};
  for (const s in recorders) {
    const r = recorders[s];
    out[s] = { snaps: r.snaps.length, coverageMinutes: r.snaps.length ? Math.round((Date.now() - r.snaps[0].ts) / 60000) : 0, lastOk: r.lastOk, lastErr: r.lastErr || "" };
  }
  return out;
}

/* grava os símbolos padrão desde o boot pra já ter ~2h quando o usuário abrir. */
function startDefault() { DEFAULT_SYMBOLS.forEach(ensureRecording); }

module.exports = { history, ensureRecording, status, startDefault,
  _internal: { pollOnce, bandLevels, POLL_MS, MAX_SNAPS, DEFAULT_SYMBOLS } };
