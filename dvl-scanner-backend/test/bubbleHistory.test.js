"use strict";
const assert = require("assert");
const bh = require("../src/bubbleHistory");
const { aggregate } = bh._internal;

// aggTrade cru: {a:aggId, p:price, q:qty, T:time, m:isBuyerMaker}
function tr(a, p, q, T, m) { return { a, p: String(p), q: String(q), T, m }; }

(function () {
  const tick = 0.1, bucketMs = 1000, pbt = 1;
  const t0 = 1780000000000;
  const trades = [
    tr(1, 100.00, 2, t0 + 10, false),   // buy  (taker buyer)
    tr(2, 100.00, 3, t0 + 20, false),   // buy, mesmo bucket de tempo+preço
    tr(3, 100.00, 1, t0 + 30, true),    // sell (taker seller) — bucket diferente (side)
    tr(4, 100.20, 5, t0 + 40, false),   // buy, faixa de preço diferente (100.2 vs 100.0)
    tr(5, 100.00, 4, t0 + 1500, true),  // sell, bucket de tempo seguinte
  ];
  const { events, groups } = aggregate(trades, "BTCUSDT", tick, bucketMs, pbt);

  // 1) buckets distintos: (buy@100 t0), (sell@100 t0), (buy@100.2 t0), (sell@100 t1) = 4
  assert.strictEqual(events.length, 4, "esperava 4 buckets, veio " + events.length);

  // 2) classificação buy/sell + agregação: o bucket buy@100/t0 soma qtys 2+3=5 e 2 execuções
  const buy100 = events.find(e => e.side === "buy" && Math.round(e.price) === 100 && e.bucketStart === t0);
  assert.ok(buy100, "bucket buy@100 existe");
  assert.strictEqual(buy100.executions, 2, "2 execuções");
  assert.ok(Math.abs(buy100.buyQty - 5) < 1e-9, "buyQty 5");
  assert.ok(Math.abs(buy100.buyNotional - 500) < 1e-6, "buyNotional 500");
  assert.strictEqual(buy100.sellNotional, 0);
  assert.ok(buy100.deltaNotional > 0, "delta positivo p/ buy");

  // 3) side sell correto (m=true → venda agressiva)
  const sell = events.filter(e => e.side === "sell");
  assert.strictEqual(sell.length, 2, "2 buckets sell");
  assert.ok(sell.every(e => e.sellNotional > 0 && e.buyNotional === 0), "sell só tem sellNotional");

  // 4) price bucket separa 100.0 de 100.2 (tick 0.1, pbt 1 → step 0.1)
  const buy1002 = events.find(e => e.side === "buy" && e.priceMin >= 100.19);
  assert.ok(buy1002 && Math.abs(buy1002.buyQty - 5) < 1e-9, "bucket buy@100.2 separado");

  // 5) contrato normalizado: campos presentes
  for (const e of events) {
    for (const f of ["id", "symbol", "source", "eventTime", "bucketStart", "bucketEnd", "price", "side",
      "buyNotional", "sellNotional", "totalNotional", "deltaNotional", "executions",
      "firstAggTradeId", "lastAggTradeId", "tickSize", "isFinal"]) {
      assert.ok(f in e, "campo faltando: " + f);
    }
    assert.strictEqual(e.source, "binance_futures");
    assert.strictEqual(e.isFinal, true);
  }

  // 6) groups legados presentes e ordenados por ts
  assert.strictEqual(groups.length, 4);
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i].ts >= groups[i - 1].ts, "groups ordenados");

  // 7) ordenados por eventTime crescente
  for (let i = 1; i < events.length; i++) assert.ok(events[i].eventTime >= events[i - 1].eventTime, "events ordenados");

  // 8) trade inválido (qty 0 / preço 0) é ignorado
  const bad = aggregate([tr(9, 0, 5, t0, false), tr(10, 100, 0, t0, false)], "BTCUSDT", tick, bucketMs, pbt);
  assert.strictEqual(bad.events.length, 0, "trades inválidos ignorados");

  console.log("bubbleHistory.test.js OK  (events=" + events.length + ")");
})();
