"use strict";
const assert = require("assert");

/* mock global.fetch com fixtures no formato do GEX Monitor (aninhado, como a doc) */
let scenario = "ok";
let calls = 0;
global.fetch = async (url) => {
  url = String(url); calls++;
  const asset = (url.match(/asset=([A-Z]+)/) || [])[1] || "BTC";
  if (scenario === "down") return { ok: false, status: 503, json: async () => ({}) };
  if (/gex-latest/.test(url)) {
    return { ok: true, json: async () => ({
      source: "Redis Precomputed",
      computed_at: "2026-07-28T10:00:00.000Z",
      data_timestamp: "2026-07-28T09:59:42.000Z",
      data_age_ms: 18000, stale: false, availability: "ready",
      data: {
        spot: 64090.32,
        gamma: { gammaFlip: 64190.35, netGex: asset === "ETH" ? -12000000 : 58000000 },
        levels: [
          { label: "Gamma Flip", price: 64190.35 },
          { label: "Expected High", price: 64750 },
          { label: "Expected Low", price: 63150 }
        ]
      }
    }) };
  }
  if (/max-pain/.test(url)) {
    return { ok: true, json: async () => ({
      stale: false, availability: "ready",
      maxPain: { strike: 64500 }, levels: [{ label: "Max Pain", price: 64500 }]
    }) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

const gex = require("../src/gexLevels");

(async () => {
  // 1) BTC → contrato normalizado com todos os campos
  scenario = "ok";
  const btc = await gex.getLevels("BTCUSDT");
  assert.strictEqual(btc.ok, true);
  assert.strictEqual(btc.asset, "BTC");
  assert.ok(Math.abs(btc.flip - 64190.35) < 0.01, "flip " + btc.flip);
  assert.strictEqual(btc.maxPain, 64500, "maxPain " + btc.maxPain);
  assert.strictEqual(btc.oneDayMax, 64750, "1dMax " + btc.oneDayMax);
  assert.strictEqual(btc.oneDayMin, 63150, "1dMin " + btc.oneDayMin);
  assert.strictEqual(btc.netGex, 58000000);
  assert.strictEqual(btc.regime, "positive");
  assert.strictEqual(btc.stale, false);
  assert.strictEqual(btc.availability, "ready");
  assert.ok(!("_found" in btc), "campo interno não vaza");
  assert.ok(JSON.stringify(btc).indexOf(process.env.GEX_MONITOR_API_KEY || "__none__") < 0);

  // 2) ETH → netGex negativo → regime negative
  const eth = await gex.getLevels("ETHUSDT");
  assert.strictEqual(eth.asset, "ETH");
  assert.strictEqual(eth.regime, "negative", "regime " + eth.regime);

  // 3) cache: segunda chamada BTC não bate no upstream (single-flight + TTL)
  const c0 = calls; await gex.getLevels("BTC"); assert.strictEqual(calls, c0, "cache evitou nova chamada");
  const btc2 = await gex.getLevels("BTC"); assert.strictEqual(btc2.cached, true);

  // 4) SOL: sem max-pain upstream → maxPain null, resto ok
  const sol = await gex.getLevels("SOLUSDT");
  assert.strictEqual(sol.asset, "SOL");
  assert.strictEqual(sol.maxPain, null, "SOL maxPain deve ser null");
  assert.ok(sol.flip > 0, "SOL flip presente");

  // 5) asset inválido → erro ASSET_NOT_SUPPORTED (http 400)
  let threw = null; try { await gex.getLevels("DOGEUSDT"); } catch (e) { threw = e; }
  assert.ok(threw && threw.code === "ASSET_NOT_SUPPORTED" && threw.http === 400, "asset inválido → 400");

  // 6) upstream cai + cache EXPIRADO mas recente → devolve stale/partial (não falha)
  scenario = "down";
  gex._internal.cache.BTC.at = Date.now() - 60000;   // envelhece além do TTL, dentro do STALE_MAX
  const btcStale = await gex.getLevels("BTC");
  assert.strictEqual(btcStale.stale, true, "stale on error");
  assert.strictEqual(btcStale.availability, "partial", "availability partial on error");
  assert.ok(btcStale.flip > 0, "mantém último snapshot válido");

  // 6b) upstream cai SEM cache → 503 GEX_UPSTREAM_UNAVAILABLE
  delete gex._internal.cache.ETH;
  gex._internal.cache.ETH_gone = undefined;
  let e6 = null; try { await gex.getLevels("ETH"); } catch (e) { e6 = e; }
  assert.ok(e6 && e6.code === "GEX_UPSTREAM_UNAVAILABLE" && e6.http === 503, "sem cache + down → 503");
  scenario = "ok";

  // 7) normalizer: dado ausente vira null (não 0)
  const n = gex._internal.normalize({ data: { gamma: { gammaFlip: 100000 } } }, null, "BTC");
  assert.strictEqual(n.maxPain, null, "maxPain ausente → null");
  assert.strictEqual(n.oneDayMax, null, "1dMax ausente → null");
  assert.strictEqual(n.netGex, null, "netGex ausente → null");
  assert.strictEqual(n.regime, "unknown", "sem netGex → unknown");

  console.log("gexLevels.test.js OK  (calls=" + calls + ")");
  process.exit(0);
})().catch(e => { console.error("FAIL", e); process.exit(1); });
