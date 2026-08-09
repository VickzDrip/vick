(function(){
  if(window.__DVL_BETA_1647_STABLE_CANDLE_BOUNDARY) return;
  window.__DVL_BETA_1647_STABLE_CANDLE_BOUNDARY = true;

  function getIv(){ try{ return String(interval || "1m"); }catch(_){ return "1m"; } }
  function msOf(iv){
    try{ if(typeof intervalMs === "function") return intervalMs(iv); }catch(_){}
    var m = String(iv || "1m").match(/^(\d+)([smhd])$/);
    if(!m) return 60000;
    var n = +m[1], unit = m[2];
    return n * (unit === "s" ? 1000 : unit === "h" ? 3600000 : unit === "d" ? 86400000 : 60000);
  }

  var lastKey = "";
  setInterval(function(){
    try{
      if(window.__DVL_REPLAY_ACTIVE || document.hidden) return;
      var iv = getIv(), step = msOf(iv);
      var bucket = Math.floor(Date.now() / step) * step;
      var key = iv + "|" + bucket;
      if(!lastKey){ lastKey = key; return; }
      if(key === lastKey) return;
      lastKey = key;
      /* Beta 1.647: never call loadAll() at a candle boundary. The first live
         trade opens the new bucket immediately; replacing the complete array
         here used to put an older REST/MEXC candle over Binance live state. */
      window.__DVL_CANDLE_BOUNDARY_1647 = { interval:iv, bucket:bucket, at:Date.now() };
      if(typeof requestLiveChartRender === "function") requestLiveChartRender(false);
      else if(typeof drawSoon === "function") drawSoon();
    }catch(_){}
  }, 250);
})();
