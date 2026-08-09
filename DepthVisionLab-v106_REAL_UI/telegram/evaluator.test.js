"use strict";

const assert = require("assert");
const { makeEvaluator, serverEvaluable, _pure } = require("./evaluator");

function row(t, o, h, l, c, v, buy, closed) {
  return [t, String(o), String(h), String(l), String(c), String(v), t + 59999, "0", "0", String(buy == null ? v / 2 : buy), "0", 0, closed === false ? false : true];
}

function repoMock(rule, context) {
  const states = new Map(), deliveries = [], history = [];
  return {
    deliveries, history, active:false,
    listEvalRules(){ return [{ userId:"u1", conn:{ telegram_chat_id:7 }, rule, context }]; },
    isClientActive(){ return this.active; },
    getEvalState(uid,id){ return states.get(uid+":"+id) || null; },
    setEvalState(uid,id,patch){ const k=uid+":"+id, next=Object.assign({},states.get(k)||{},patch||{}); states.set(k,next); return next; },
    enqueue(x){ deliveries.push(x); return {inserted:true}; },
    addHistory(uid,x){ history.push(x); }
  };
}

async function runClosedScenario(rule, context, initial, next, expectText) {
  let rows = initial.slice(), now = 1_000_000;
  const repo = repoMock(rule, context);
  const ev = makeEvaluator({ repo, now:()=>now, klineTtl:0, fetchKlines:async()=>rows,
    messages:{ alertText:x=>x.message }, fetchDepth:async()=>null });
  await ev.tick();
  assert.strictEqual(repo.deliveries.length, 0, rule.source+" must initialize silently");
  rows = next.slice(); now += 60_000;
  await ev.tick();
  assert.strictEqual(repo.deliveries.length, 1, rule.source+" must fire once");
  assert.ok(repo.deliveries[0].text.includes(expectText), repo.deliveries[0].text);
  await ev.tick();
  assert.strictEqual(repo.deliveries.length, 1, rule.source+" must not duplicate the same bar");
}

async function main() {
  for (const source of ["price","smartdelta","exr","liqbands","ma","vp","cross"])
    assert.strictEqual(serverEvaluable({source}), true, source+" must be server evaluable");

  const maRows = [
    {close:1,volume:1},{close:2,volume:1},{close:3,volume:1},{close:4,volume:1}
  ];
  assert.deepStrictEqual(_pure.calcMA(maRows,2,"SMA"), [null,1.5,2.5,3.5]);
  assert.strictEqual(Number(_pure.calcMA(maRows,2,"EMA")[3].toFixed(6)), 3.5);

  const vwRows = [
    {time:0,high:10,low:10,close:10,volume:1},
    {time:60000,high:20,low:20,close:20,volume:3}
  ];
  const vw = _pure.calcVwap(vwRows,{anchor:"daily"});
  assert.strictEqual(vw.vwap[1],17.5);

  const base = [
    row(0,90,91,89,90,10,5), row(60000,94,96,93,95,10,5)
  ];
  await runClosedScenario(
    {id:"price",source:"price",signal:"cross_up",level:100,dir:"any",evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"},
    {chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620},
    base, base.concat([row(120000,95,106,94,105,20,12)]), "ACIMA"
  );

  let handoffRows=base.slice(), handoffNow=1_000_000;
  const handoffRule={id:"handoff",source:"price",signal:"cross_up",level:100,dir:"any",evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"};
  const handoffRepo=repoMock(handoffRule,{chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620});
  handoffRepo.active=true;
  const handoff=makeEvaluator({repo:handoffRepo,now:()=>handoffNow,klineTtl:0,fetchKlines:async()=>handoffRows,messages:{alertText:x=>x.message}});
  await handoff.tick();
  handoffRows=base.concat([row(120000,95,106,94,105,20,12)]);handoffNow+=60000;
  await handoff.tick();
  assert.strictEqual(handoffRepo.deliveries.length,0,"active browser must suppress server delivery");
  handoffRepo.active=false;
  await handoff.tick();
  assert.strictEqual(handoffRepo.deliveries.length,0,"closing browser must not replay a client-side crossing");

  const crossBase = [
    row(0,110,111,109,110,10,5), row(60000,105,106,104,105,10,5),
    row(120000,100,101,99,100,10,5), row(180000,95,96,94,95,10,5)
  ];
  const crossCtx = {chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620,
    ma:[{idx:0,period:2,type:"EMA"}],vwap:{anchor:"daily",mult1:1,mult2:2},vp:{levels:{}}};
  await runClosedScenario(
    {id:"cross",source:"cross",signal:"line_cross",dir:"up",params:{lhs:"ma:0",rhs:"vwap"},evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"},
    crossCtx, crossBase, crossBase.concat([row(240000,95,121,94,120,10,8)]), "ACIMA"
  );

  await runClosedScenario(
    {id:"vp",source:"vp",signal:"touch",dir:"any",params:{level:"poc"},evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"},
    {chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620,vp:{levels:{poc:100,vah:110,val:90}}},
    base, base.concat([row(120000,95,101,94,96,20,10)]), "POC"
  );

  const exBase = [row(0,100,101,99,100,10,5),row(60000,100,101,99,100,10,5),row(120000,100,101,99,100,10,5)];
  await runClosedScenario(
    {id:"exr",source:"exr",signal:"exhaustion_up",dir:"any",evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"},
    {chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620,exr:{calculationTF:"Chart",mtfRsiLen:2,mtfPush:0,upperZoneLevel:60,lowerZoneLevel:35,mtfVolMaLen:20,mtfVolSpikeAt:2.5}},
    exBase, exBase.concat([row(180000,100,111,99,110,20,15)]), "TOPO"
  );

  const sdBase = [row(0,100,101,99,100,10,5),row(60000,100,101,99,100,10,5),row(120000,100,101,99,100,10,5)];
  await runClosedScenario(
    {id:"sd",source:"smartdelta",signal:"signal_buy",dir:"any",evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"},
    {chartSymbol:"BTCUSDT",chartTf:"1m",historyCount:620,smartdelta:{thNeutral:10,alertDelta:20,alertConf:0}},
    sdBase, sdBase.concat([row(180000,100,120,99,119,1000,950)]), "COMPRA"
  );

  let live = [row(0,9998,10005,9995,10000,10,5),row(60000,10000,10005,9995,10000,10,5)];
  let now=1_000_000;
  const lbRule={id:"lb",source:"liqbands",signal:"grab_up",dir:"any",evalTf:"1m",symbol:"BTCUSDT",telegram:true,enabled:true,rearm:"bar"};
  const lbRepo=repoMock(lbRule,{chartSymbol:"BTCUSDT",chartTf:"1m",liqbands:{rangePct:.6,minNotional:50000,smoothBars:0,wallStrength:2.2}});
  const depth={asks:[["10010","11"],["10020","1"],["10030","1"]],bids:[["9990","11"],["9980","1"],["9970","1"]]};
  const lb=makeEvaluator({repo:lbRepo,now:()=>now,klineTtl:0,depthTtl:0,fetchKlines:async()=>live,fetchDepth:async()=>depth,messages:{alertText:x=>x.message}});
  await lb.tick();
  live=[live[0],row(60000,10000,10015,9995,10005,12,7)]; now+=5000;
  await lb.tick();
  assert.strictEqual(lbRepo.deliveries.length,1,"liquidity grab must fire once intrabar");
  assert.ok(lbRepo.deliveries[0].text.includes("CIMA"));
  await lb.tick();
  assert.strictEqual(lbRepo.deliveries.length,1,"liquidity grab must not duplicate intrabar");

  console.log("OK evaluator V2: 7 sources, closed-bar crosses, intrabar liquidity, dedup");
}

main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
