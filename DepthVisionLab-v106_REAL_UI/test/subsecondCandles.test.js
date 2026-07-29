"use strict";
/* Testes determinísticos do motor de candles subsegundo (spec §20).
   Rodar: node test/subsecondCandles.test.js  (sem rede — usa o Aggregator puro). */
const assert = require("assert");
const M = require("../subsecondCandles");
const { Aggregator, Engine } = M;

const T0 = 1785369600000; // alinhado a minuto/15s/30s (10:00:00.000 UTC de referência)
assert.strictEqual(T0 % 15000, 0); assert.strictEqual(T0 % 30000, 0);

function agg(iv){ var ev=[]; var a=new Aggregator("BTCUSDT", iv, function(t,d){ ev.push({t:t,d:d}); }); a._ev=ev; return a; }
function num(x){ return Number(x); }
function closed(a, open){ var c=a.byOpen.get(open); return c?a.serialize(c):null; }

// fixtures do spec
const F = [
  { a:1, T:T0+100,   p:100, q:2, m:false }, // buy
  { a:2, T:T0+14999, p:103, q:1, m:true  }, // sell
  { a:3, T:T0+15000, p:99,  q:4, m:true  }, // sell  (novo bucket 15s)
  { a:4, T:T0+29999, p:101, q:2, m:false }, // buy
  { a:5, T:T0+30000, p:98,  q:1, m:true  }  // sell  (novo bucket 30s)
];
function tr(f){ return { a:f.a, T:f.T, price:f.p, qty:f.q, buy:f.m===false }; }

let pass=0, fail=0;
function ok(name, cond){ if(cond){pass++; console.log("PASS "+name);} else {fail++; console.log("FAIL "+name);} }

/* ── 1. OHLCV exato (15s) ─────────────────────────────────────────────────── */
(function(){
  var a=agg(15000);
  F.forEach(function(f){ a.apply(tr(f)); });
  a.flush(T0+60000+2000); // fecha até passar todos os buckets
  var b0=closed(a,T0), b1=closed(a,T0+15000), b2=closed(a,T0+30000);
  ok("15s bucket T0 OHLC", b0 && num(b0.open)===100 && num(b0.high)===103 && num(b0.low)===100 && num(b0.close)===103);
  ok("15s bucket T0 vol/delta", b0 && num(b0.baseVolume)===3 && num(b0.takerBuyBase)===2 && num(b0.takerSellBase)===1 && num(b0.deltaBase)===1 && b0.tradeCount===2);
  ok("15s bucket T0 quoteVolume", b0 && num(b0.quoteVolume)===(100*2+103*1));
  ok("15s bucket T0+15s OHLC", b1 && num(b1.open)===99 && num(b1.high)===101 && num(b1.low)===99 && num(b1.close)===101);
  ok("15s bucket T0+15s vol", b1 && num(b1.baseVolume)===6 && num(b1.takerBuyBase)===2 && num(b1.takerSellBase)===4 && num(b1.deltaBase)===-2);
  ok("15s bucket T0+30s open=99? (98 sell)", b2 && num(b2.open)===98 && num(b2.close)===98 && num(b2.baseVolume)===1);
})();

/* ── 2. Boundary: :15.000 pertence ao bucket novo ─────────────────────────── */
(function(){
  var a=agg(15000);
  a.apply(tr({a:1,T:T0+15000,p:50,q:1,m:false}));
  a.flush(T0+30000+2000);
  var b=closed(a,T0+15000), bPrev=closed(a,T0);
  ok("boundary :15.000 vai pro bucket T0+15000", b && num(b.open)===50);
  ok("boundary não cai no bucket anterior", !bPrev || bPrev.isEmpty);
})();

/* ── 3. Out-of-order dentro do bucket ─────────────────────────────────────── */
(function(){
  var a=agg(15000);
  // aplica fora de ordem: o de T maior primeiro
  a.apply(tr({a:2,T:T0+14999,p:103,q:1,m:true}));
  a.apply(tr({a:1,T:T0+100,  p:100,q:2,m:false}));
  a.flush(T0+30000);
  var b=closed(a,T0);
  ok("out-of-order: open=primeiro por event-time", b && num(b.open)===100 && num(b.close)===103 && num(b.high)===103 && num(b.low)===100);
})();

/* ── 4. 30s == união dos dois 15s correspondentes ─────────────────────────── */
(function(){
  var a15=agg(15000), a30=agg(30000);
  F.slice(0,4).forEach(function(f){ a15.apply(tr(f)); a30.apply(tr(f)); }); // trades dentro de [T0,T0+30s)
  a15.flush(T0+30000+2000); a30.flush(T0+30000+2000);
  var u_open=num(closed(a15,T0).open), u_close=num(closed(a15,T0+15000).close);
  var u_high=Math.max(num(closed(a15,T0).high), num(closed(a15,T0+15000).high));
  var u_low =Math.min(num(closed(a15,T0).low),  num(closed(a15,T0+15000).low));
  var u_vol =num(closed(a15,T0).baseVolume)+num(closed(a15,T0+15000).baseVolume);
  var u_buy =num(closed(a15,T0).takerBuyBase)+num(closed(a15,T0+15000).takerBuyBase);
  var c30=closed(a30,T0);
  ok("30s open == 15s[0].open", num(c30.open)===u_open);
  ok("30s close == 15s[1].close", num(c30.close)===u_close);
  ok("30s high == max(15s highs)", num(c30.high)===u_high);
  ok("30s low == min(15s lows)", num(c30.low)===u_low);
  ok("30s baseVolume == soma dos 15s", num(c30.baseVolume)===u_vol);
  ok("30s takerBuyBase == soma dos 15s", num(c30.takerBuyBase)===u_buy);
})();

/* ── 5. Empty candle: intervalo sem trade = OHLC do close anterior ────────── */
(function(){
  var a=agg(15000);
  a.apply(tr({a:1,T:T0+100,p:100,q:2,m:false}));
  a.flush(T0+45000+2000); // fecha T0 (com trade) e T0+15000 (vazio) e T0+30000 (vazio)
  var e=closed(a,T0+15000);
  ok("empty: isEmpty=true", e && e.isEmpty===true);
  ok("empty: OHLC = close anterior (100)", e && num(e.open)===100 && num(e.high)===100 && num(e.low)===100 && num(e.close)===100);
  ok("empty: volumes/delta 0 e tradeCount 0", e && num(e.baseVolume)===0 && num(e.deltaBase)===0 && e.tradeCount===0);
})();

/* ── 6. Late correction: trade tardio muda candle fechado + revision++ ─────── */
(function(){
  var a=agg(15000);
  a.apply(tr({a:1,T:T0+100,p:100,q:2,m:false}));   // bucket T0
  a.apply(tr({a:2,T:T0+16000,p:101,q:1,m:false})); // avança tempo p/ dentro da janela de revisão
  a.flush(T0+15000+800);                            // fecha bucket T0
  var before=closed(a,T0);
  var corr=0; a._ev.length=0;
  a.apply(tr({a:9,T:T0+5000,p:100,q:5,m:false}));  // tardio, dentro de REVISION_MS
  a._ev.forEach(function(e){ if(e.t==="candle_correction") corr++; });
  var after=closed(a,T0);
  ok("late: revision incrementou", after && after.revision===1);
  ok("late: emitiu candle_correction", corr===1);
  ok("late: baseVolume corrigido (+5)", after && num(after.baseVolume)===num(before.baseVolume)+5);
})();

/* ── 7. Volume test: buy+sell == total (base e quote) ─────────────────────── */
(function(){
  var a=agg(15000);
  F.forEach(function(f){ a.apply(tr(f)); });
  a.flush(T0+60000+2000);
  [T0,T0+15000].forEach(function(open){
    var c=closed(a,open);
    ok("vol soma base ("+open+")", Math.abs((num(c.takerBuyBase)+num(c.takerSellBase))-num(c.baseVolume))<1e-9);
    ok("vol soma quote ("+open+")", Math.abs((num(c.takerBuyQuote)+num(c.takerSellQuote))-num(c.quoteVolume))<1e-9);
  });
})();

/* ── 8. Dedup (via Engine, idempotente por aggTradeId) ────────────────────── */
(function(){
  var e=new Engine({ symbol:"BTCUSDT", dataDir:"/tmp", emit:function(){} });
  e.ingest({a:1,p:"100",q:"2",T:T0+100,m:false});
  e.ingest({a:1,p:"100",q:"2",T:T0+100,m:false}); // duplicado
  e.ingest({a:2,p:"103",q:"1",T:T0+200,m:true});
  e.flushAll(T0+30000+2000);
  var c=e.aggs[15000].byOpen.get(T0); var s=c?e.aggs[15000].serialize(c):null;
  ok("dedup: tradeCount não conta duplicado", s && s.tradeCount===2);
  ok("dedup: volume não dobra", s && num(s.baseVolume)===3);
  ok("dedup: contador duplicates", e.duplicates===1);
})();

console.log("\nsubsecondCandles.test.js — PASS "+pass+" / FAIL "+fail);
process.exit(fail?1:0);
