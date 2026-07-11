"use strict";

/* ── Coinalyze OI-history backfill (optional third-party source) ─────
   MEXC's public API has NO historical Open Interest (only the current
   holdVol). Coinalyze DOES record OI history for many futures markets, so
   when an API key is configured we can backfill the "24h ago" gap our own
   forward collection can't. This is REAL data from a third party — never
   invented — and lives entirely server-side (no brand shown in the UI).

   Disabled unless DVL_COINALYZE_KEY is set. Fully fail-safe: any error or a
   symbol Coinalyze doesn't cover returns [] and the caller falls back to our
   forward-collected OI. Coverage of tiny MEXC-only tokens is not guaranteed —
   this is exactly what the /coinalyze-oi diagnostic endpoint is for.

   Docs: https://api.coinalyze.net/v1/doc/  (auth: api_key header). */

const BASE = "https://api.coinalyze.net/v1";
const KEY = process.env.DVL_COINALYZE_KEY || "";

function enabled() { return !!KEY; }

async function cz(path, params) {
  const qs = params ? ("?" + new URLSearchParams(params).toString()) : "";
  const res = await fetch(BASE + path + qs, { headers: { api_key: KEY }, cache: "no-store" });
  if (!res.ok) throw new Error("coinalyze " + path + " -> HTTP " + res.status);
  return res.json();
}

/* Coinalyze interval tokens. Chart TFs it can't serve natively (3m, 45m) map
   to the nearest finer one the caller can down-use, or are simply skipped. */
const IV = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1hour", "2h": "2hour", "4h": "4hour", "6h": "6hour", "12h": "12hour", "1d": "daily" };
function ivFor(tf) { return IV[tf] || null; }

/* Discovery cache: MEXC exchange code + the map from a MEXC native symbol
   (e.g. "ANSEM_USDT") to the Coinalyze symbol (e.g. "ANSEMUSDT_PERP.<code>").
   Refreshed lazily, at most once per hour. */
let _mexcCode = null;
let _symMap = null;       // { "ANSEM_USDT": "ANSEMUSDT_PERP.X", ... }
let _loadedAt = 0;
let _loading = null;

async function ensureMarkets() {
  if (_symMap && Date.now() - _loadedAt < 3600000) return;
  if (_loading) return _loading;
  _loading = (async () => {
    const exchanges = await cz("/exchanges");
    const mexc = (Array.isArray(exchanges) ? exchanges : []).find(e => /mexc/i.test(e && (e.name || "")));
    _mexcCode = mexc && mexc.code || null;
    const markets = await cz("/future-markets");
    const map = {};
    if (Array.isArray(markets) && _mexcCode) {
      for (const m of markets) {
        if (!m || m.exchange !== _mexcCode || !m.is_perpetual) continue;
        // Key by the MEXC-native symbol both with and without underscore so
        // either caller form resolves. symbol_on_exchange is MEXC's own id.
        const onEx = String(m.symbol_on_exchange || "").toUpperCase();
        if (onEx) { map[onEx] = m.symbol; map[onEx.replace(/_/g, "")] = m.symbol; }
        const base = String(m.base_asset || "").toUpperCase();
        if (base) map[base + "_USDT"] = map[base + "_USDT"] || m.symbol; // fallback by base
      }
    }
    _symMap = map;
    _loadedAt = Date.now();
    _loading = null;
  })().catch(e => { _loading = null; throw e; });
  return _loading;
}

function normMexc(symbol) {
  const raw = String(symbol || "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return /_USDT$/.test(raw) ? raw : raw.replace(/USDT$/, "_USDT");
}

async function resolveSymbol(mexcSymbol) {
  await ensureMarkets();
  const s = normMexc(mexcSymbol);
  return (_symMap && (_symMap[s] || _symMap[s.replace(/_/g, "")])) || null;
}

/* OI OHLC history for a MEXC symbol, oldest→newest, [{ time(ms), open, high,
   low, close }]. `hours` back from now. convertUsd=true asks Coinalyze for the
   USD-notional series (so it lines up with our "usdt" unit). Returns { rows,
   czSymbol, unit } — rows [] (never throws) when disabled/uncovered/errored. */
async function oiHistory(mexcSymbol, tf, hours, convertUsd) {
  if (!enabled()) return { rows: [], czSymbol: null, unit: null, note: "disabled (no key)" };
  const interval = ivFor(tf);
  if (!interval) return { rows: [], czSymbol: null, unit: null, note: "tf not supported by coinalyze: " + tf };
  try {
    const czSymbol = await resolveSymbol(mexcSymbol);
    if (!czSymbol) return { rows: [], czSymbol: null, unit: null, note: "symbol not on coinalyze/mexc" };
    const to = Math.floor(Date.now() / 1000);
    const from = to - Math.max(1, Math.min(720, Number(hours) || 24)) * 3600;
    const j = await cz("/open-interest-history", {
      symbols: czSymbol, interval, from: String(from), to: String(to),
      convert_to_usd: convertUsd ? "true" : "false"
    });
    const entry = Array.isArray(j) ? j.find(x => x && x.symbol === czSymbol) || j[0] : null;
    const hist = entry && Array.isArray(entry.history) ? entry.history : [];
    const rows = hist
      .map(p => ({ time: (Number(p.t) || 0) * 1000, open: Number(p.o), high: Number(p.h), low: Number(p.l), close: Number(p.c) }))
      .filter(r => r.time && Number.isFinite(r.close))
      .sort((a, b) => a.time - b.time);
    return { rows, czSymbol, unit: convertUsd ? "usd" : "native", note: rows.length ? "ok" : "empty" };
  } catch (e) {
    return { rows: [], czSymbol: null, unit: null, note: "error: " + e.message };
  }
}

/* Raw diagnostic: dump the actual /exchanges + /future-markets shapes so we
   can see MEXC's real name/code and the market field names (discovery guessed
   wrong somewhere — this shows the ground truth). */
async function diagnose(base) {
  const out = { enabled: enabled() };
  if (!enabled()) return out;
  try {
    const ex = await cz("/exchanges");
    out.exchangesCount = Array.isArray(ex) ? ex.length : 0;
    out.exchangesRaw = Array.isArray(ex) ? ex : ex;             // small list, dump it
    out.mexcGuess = Array.isArray(ex) ? ex.find(e => /mexc/i.test(JSON.stringify(e))) || null : null;
  } catch (e) { out.exchangesError = e.message; }
  try {
    const fm = await cz("/future-markets");
    out.marketsCount = Array.isArray(fm) ? fm.length : 0;
    if (Array.isArray(fm)) {
      const b = String(base || "BTC").toUpperCase();
      out.marketSample = fm.filter(m => m && (JSON.stringify(m).toUpperCase().includes(b + "_USDT") || JSON.stringify(m).toUpperCase().includes(b + "USDT"))).slice(0, 6);
    }
  } catch (e) { out.marketsError = e.message; }
  return out;
}

/* Diagnostic: what did discovery resolve for this symbol? */
async function debugResolve(mexcSymbol) {
  if (!enabled()) return { enabled: false };
  try {
    await ensureMarkets();
    return { enabled: true, mexcCode: _mexcCode, markets: _symMap ? Object.keys(_symMap).length : 0, resolved: await resolveSymbol(mexcSymbol) };
  } catch (e) { return { enabled: true, error: e.message }; }
}

module.exports = { enabled, oiHistory, resolveSymbol, debugResolve, diagnose, ivFor };
