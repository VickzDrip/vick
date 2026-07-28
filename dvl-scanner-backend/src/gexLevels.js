"use strict";

/* ── DVL GEX Levels — proxy same-origin p/ o GEX Monitor ────────────────────
   Consulta server-side as rotas públicas do GEX Monitor (gex-latest + max-pain),
   normaliza para um contrato estável (Flip / Max Pain / faixa 1D / Net GEX +
   freshness) e entrega ao frontend do DVL sem CORS e sem expor chave.

   O NORMALIZADOR é um port fiel do parser do frontend (Beta 1.347): flatten +
   pickFlat + scanNamedLevels, tolerante a nesting e a nomes alternativos. Assim,
   mesmo sem acessar a API real daqui, o mapeamento segue exatamente o que o
   frontend já reconhecia. A chave (se houver) vem só de env (GEX_MONITOR_API_KEY)
   e NUNCA aparece no payload nem em log. */

const HOSTS = ["https://www.gexmonitor.com", "https://gexmonitor.com"];
const ASSETS = ["BTC", "ETH", "SOL"];
const NO_MAXPAIN = { SOL: true };          // max-pain upstream não cobre SOL → null
const TTL = 30000;                          // cache normal 30s
const STALE_MAX = 10 * 60000;              // último snapshot usável por até 10min em falha
const UP_TIMEOUT = 8000;

const cache = {};      // asset -> { at, data }
const inflight = {};   // asset -> Promise (single-flight)

/* ── parser (port do frontend) ─────────────────────────────────────────── */
function num(v) {
  if (typeof v === "string") v = v.replace(/[$,%\s]/g, "").replace(/,/g, "");
  v = Number(v);
  return Number.isFinite(v) ? v : NaN;
}
function norm(k) { return String(k == null ? "" : k).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function flatten(x, path, out, seen, depth) {
  if (depth > 9 || x == null) return;
  if (typeof x !== "object") { out.push({ path, n: norm(path), value: x }); return; }
  if (seen.has(x)) return; seen.add(x);
  if (Array.isArray(x)) { for (let i = 0; i < Math.min(x.length, 300); i++) flatten(x[i], path + "." + i, out, seen, depth + 1); return; }
  for (const k of Object.keys(x)) flatten(x[k], path ? path + "." + k : k, out, seen, depth + 1);
}
function pickFlat(out, names, priceLike) {
  const exact = names.map(norm);
  const candidates = [];
  for (const e of out) {
    const v = num(e.value);
    if (!Number.isFinite(v)) continue;
    if (priceLike && (!(v > 100) || v > 10000000)) continue;
    const tail = norm(String(e.path).split(".").pop());
    let score = -1;
    for (const n of exact) {
      if (tail === n) score = Math.max(score, 100);
      else if (e.n.endsWith(n)) score = Math.max(score, 80);
      else if (e.n.includes(n)) score = Math.max(score, 50);
    }
    if (score >= 0) candidates.push({ score, path: e.path, v });
  }
  candidates.sort((a, b) => b.score - a.score || a.path.length - b.path.length);
  return candidates.length ? candidates[0].v : NaN;
}
function scanNamedLevels(x, res, depth, seen) {
  if (depth > 9 || x == null || typeof x !== "object" || seen.has(x)) return; seen.add(x);
  if (Array.isArray(x)) { for (const q of x.slice(0, 300)) scanNamedLevels(q, res, depth + 1, seen); return; }
  const label = norm(x.label || x.name || x.title || x.type || x.key || x.levelName || "");
  const v = num(x.price != null ? x.price : (x.value != null ? x.value : (x.level != null ? x.level : (x.strike != null ? x.strike : x.y))));
  if (label && Number.isFinite(v) && v > 100 && v < 10000000) {
    if (label.includes("maxpain")) res.maxPain = v;
    else if (label.includes("gammaflip") || label === "flip" || label.includes("zerogamma")) res.flip = v;
    else if (label.includes("1dmax") || label.includes("onedaymax") || label.includes("expectedhigh")) res.oneDayMax = v;
    else if (label.includes("1dmin") || label.includes("onedaymin") || label.includes("expectedlow")) res.oneDayMin = v;
  }
  for (const k of Object.keys(x)) scanNamedLevels(x[k], res, depth + 1, seen);
}
function posOrNull(v) { return Number.isFinite(v) && v > 0 ? v : null; }

/* extrai níveis + freshness de um payload upstream (gex-latest OU max-pain) */
function parsePayload(payload) {
  const out = []; flatten(payload, "", out, new WeakSet(), 0);
  const res = {}; scanNamedLevels(payload, res, 0, new WeakSet());
  res.flip = res.flip || pickFlat(out, ["gammaFlip", "flip", "zeroGamma", "gammaZero", "zeroGammaLevel"], true);
  res.maxPain = res.maxPain || pickFlat(out, ["maxPain", "maxPainStrike", "painStrike"], true);
  res.oneDayMax = res.oneDayMax || pickFlat(out, ["1dMax", "oneDayMax", "dayMax", "expectedHigh", "impliedHigh", "upperExpectedMove"], true);
  res.oneDayMin = res.oneDayMin || pickFlat(out, ["1dMin", "oneDayMin", "dayMin", "expectedLow", "impliedLow", "lowerExpectedMove"], true);
  res.netGex = pickFlat(out, ["netGex", "netGamma", "totalGex", "dealerGamma"], false);
  res.spot = pickFlat(out, ["spot", "spotPrice", "underlying", "underlyingPrice", "price"], true);
  // freshness (strings) — procurados pelo caminho/tail
  const findStr = (suffix) => { const e = out.find(e => norm(e.path).endsWith(suffix)); return e ? e.value : undefined; };
  res.source = findStr("source");
  res.computedAt = findStr("computedat");
  res.dataTimestamp = findStr("datatimestamp") != null ? findStr("datatimestamp") : findStr("timestamp");
  const ageEntry = out.find(e => norm(e.path).endsWith("dataagems"));
  res.dataAgeMs = ageEntry && Number.isFinite(num(ageEntry.value)) ? num(ageEntry.value) : undefined;
  const staleEntry = out.find(e => norm(e.path).endsWith("stale"));
  res.stale = !!(staleEntry && staleEntry.value === true);
  const av = out.find(e => norm(e.path).endsWith("availability"));
  res.availability = av ? String(av.value || "") : "";
  return res;
}

/* combina gex-latest (níveis + net gex + freshness) com max-pain (só o maxPain) */
function normalize(latest, pain, asset) {
  const merged = {};
  if (latest) Object.assign(merged, parsePayload(latest));
  if (pain) {
    const p = parsePayload(pain);
    if (Number.isFinite(p.maxPain) && p.maxPain > 0) merged.maxPain = p.maxPain;
    for (const k of ["stale", "availability", "computedAt", "dataTimestamp", "dataAgeMs", "source"]) {
      if (merged[k] == null || merged[k] === "" || (typeof merged[k] === "number" && !Number.isFinite(merged[k]))) merged[k] = p[k];
    }
  }
  const netGex = Number.isFinite(merged.netGex) ? merged.netGex : null;
  const flip = posOrNull(merged.flip), maxPain = posOrNull(merged.maxPain);
  const oneDayMax = posOrNull(merged.oneDayMax), oneDayMin = posOrNull(merged.oneDayMin);
  const found = [flip, maxPain, oneDayMax, oneDayMin].filter(v => v != null).length;
  let regime = "unknown";
  if (netGex != null) regime = netGex >= 0 ? "positive" : "negative";
  return {
    ok: true, asset,
    spot: posOrNull(merged.spot),
    flip, maxPain, oneDayMax, oneDayMin, netGex, regime,
    source: merged.source || "GEX Monitor",
    computedAt: merged.computedAt || null,
    dataTimestamp: merged.dataTimestamp || null,
    dataAgeMs: Number.isFinite(merged.dataAgeMs) ? merged.dataAgeMs : null,
    stale: !!merged.stale,
    availability: merged.availability || (found ? "ready" : "missing"),
    _found: found
  };
}

/* ── upstream ──────────────────────────────────────────────────────────── */
function upstreamHeaders() {
  const h = { Accept: "application/json", "User-Agent": "DVL-Scanner-Backend/1.0 (+depthvisionlab.com)" };
  const key = process.env.GEX_MONITOR_API_KEY;
  if (key) { h.Authorization = "Bearer " + key; h["x-api-key"] = key; }
  return h;
}
async function getJSON(url) {
  const signal = (typeof AbortSignal !== "undefined" && AbortSignal.timeout) ? AbortSignal.timeout(UP_TIMEOUT) : undefined;
  const res = await fetch(url, Object.assign({ cache: "no-store", headers: upstreamHeaders() }, signal ? { signal } : {}));
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function fetchUpstream(asset) {
  let latest = null, pain = null;
  const wantPain = !NO_MAXPAIN[asset];
  for (const host of HOSTS) {
    const jobs = [getJSON(host + "/api/gex-latest?asset=" + asset + "&summary=true&lite=true")];
    if (wantPain) jobs.push(getJSON(host + "/api/max-pain?asset=" + asset + "&range=latest"));
    const rs = await Promise.allSettled(jobs);
    if (rs[0].status === "fulfilled") latest = rs[0].value;
    if (wantPain && rs[1] && rs[1].status === "fulfilled") pain = rs[1].value;
    if (latest || pain) break;
  }
  return { latest, pain };
}

/* ── API pública ───────────────────────────────────────────────────────── */
function symbolToAsset(sym) {
  sym = String(sym || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (sym.includes("ETH")) return "ETH";
  if (sym.includes("SOL")) return "SOL";
  if (sym.includes("BTC")) return "BTC";
  return ASSETS.indexOf(sym) >= 0 ? sym : null;
}

async function refresh(asset) {
  const { latest, pain } = await fetchUpstream(asset);
  if (!latest && !pain) { const e = new Error("upstream vazio"); e.code = "GEX_UPSTREAM_UNAVAILABLE"; throw e; }
  const data = normalize(latest, pain, asset);
  if (!data._found && data.netGex == null) { const e = new Error("sem níveis reconhecidos"); e.code = "GEX_UPSTREAM_UNAVAILABLE"; throw e; }
  delete data._found;
  cache[asset] = { at: Date.now(), data };
  return data;
}

/* Retorna o contrato normalizado (com cache + single-flight + stale-on-error). */
async function getLevels(assetOrSymbol) {
  const asset = symbolToAsset(assetOrSymbol) || (ASSETS.indexOf(String(assetOrSymbol || "").toUpperCase()) >= 0 ? String(assetOrSymbol).toUpperCase() : null);
  if (!asset) { const e = new Error("asset não suportado"); e.code = "ASSET_NOT_SUPPORTED"; e.http = 400; throw e; }

  const c = cache[asset];
  if (c && Date.now() - c.at < TTL) return Object.assign({}, c.data, { cached: true });

  if (!inflight[asset]) {
    inflight[asset] = refresh(asset).finally(() => { delete inflight[asset]; });
  }
  try {
    const data = await inflight[asset];
    return Object.assign({}, data, { cached: false });
  } catch (err) {
    // stale-while-error: devolve o último snapshot recente marcado como stale/partial
    if (c && Date.now() - c.at < STALE_MAX) {
      return Object.assign({}, c.data, { cached: true, stale: true, availability: "partial" });
    }
    const e = new Error(err && err.code === "ASSET_NOT_SUPPORTED" ? "asset" : "GEX data is temporarily unavailable");
    e.code = (err && err.code) || "GEX_UPSTREAM_UNAVAILABLE";
    e.http = err && err.http ? err.http : 503;
    e.asset = asset;
    throw e;
  }
}

module.exports = { getLevels, symbolToAsset, ASSETS, _internal: { normalize, parsePayload, refresh, cache } };
