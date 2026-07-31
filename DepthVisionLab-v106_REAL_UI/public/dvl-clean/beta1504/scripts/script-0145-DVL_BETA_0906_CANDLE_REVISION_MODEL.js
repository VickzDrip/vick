(function(){
  "use strict";

  var state = {
    lastKey:null,
    revision:0,
    lastCount:0,
    lastTime:0
  };

  function rawCandles(){
    try{ return Array.isArray(S.candles) ? S.candles : []; }catch(_){ return []; }
  }

  function sig(c){
    if(!c) return "none";
    return [
      c.t ?? c.time ?? c.openTime ?? c.open_time ?? "",
      c.o ?? c.open ?? "",
      c.h ?? c.high ?? "",
      c.l ?? c.low ?? "",
      c.c ?? c.close ?? "",
      c.v ?? c.volume ?? c.vol ?? ""
    ].join("|");
  }

  function key(raw){
    raw = Array.isArray(raw) ? raw : rawCandles();
    var first = raw.length ? sig(raw[0]) : "empty";
    var last = raw.length ? sig(raw[raw.length - 1]) : "empty";
    var prev = raw.length > 1 ? sig(raw[raw.length - 2]) : "none";
    return raw.length + "::" + first + "::" + prev + "::" + last;
  }

  function getRevision(raw){
    raw = Array.isArray(raw) ? raw : rawCandles();
    var k = key(raw);
    if(k !== state.lastKey){
      state.revision++;
      state.lastKey = k;
      state.lastCount = raw.length;
      try{
        var last = raw[raw.length - 1];
        state.lastTime = last ? Number(last.t ?? last.time ?? last.openTime ?? last.open_time ?? 0) : 0;
      }catch(_){
        state.lastTime = 0;
      }
    }
    return state.revision;
  }

  function snapshot(){
    var raw = rawCandles();
    var rev = getRevision(raw);
    return {
      version:"0.941",
      revision:rev,
      key:state.lastKey,
      rawCount:raw.length,
      lastTime:state.lastTime,
      lastCandle:raw.length ? sig(raw[raw.length - 1]) : "empty"
    };
  }

  function hasChanged(previousRevision){
    return Number(previousRevision) !== Number(getRevision());
  }

  function audit(){
    var raw = rawCandles();
    var snap = snapshot();
    return {
      version:"0.941",
      available:true,
      rawCount:raw.length,
      revision:snap.revision,
      hasKey:!!snap.key,
      tracksCurrentCandle:true,
      pass:!!(Number.isFinite(Number(snap.revision)) && snap.revision >= 1)
    };
  }

  window.DVL_CANDLE_REVISION_MODEL = {
    version:"0.941",
    key:key,
    getRevision:getRevision,
    snapshot:snapshot,
    hasChanged:hasChanged,
    audit:audit
  };
  window.DVL_CANDLE_REVISION_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var cr = audit();
    base.candleRevisionModel = cr;
    base.candleRevisionModelAvailable = !!cr.pass;
    base.pass = !!(base.pass !== false && cr.pass);
    return base;
  };
})();
