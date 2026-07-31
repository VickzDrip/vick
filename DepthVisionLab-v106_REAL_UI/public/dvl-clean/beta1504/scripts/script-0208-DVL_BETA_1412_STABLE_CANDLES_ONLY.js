(function(){
  if(window.__DVL_BETA_1412_STABLE_CANDLES_ONLY) return;
  window.__DVL_BETA_1412_STABLE_CANDLES_ONLY = true;

  function getIv(){ try{ return String(interval || "1m"); }catch(_){ return "1m"; } }

  function msOf(iv){
    try{ if(typeof intervalMs === "function") return intervalMs(iv); }catch(_){}
    if(iv === "15s") return 15000;
    if(iv === "30s") return 30000;
    var m = String(iv || "1m").match(/^(\d+)([mhd])$/);
    if(!m) return 60000;
    var n = +m[1];
    return m[2] === "h" ? n * 3600000 : m[2] === "d" ? n * 86400000 : n * 60000;
  }

  var lastBucket = 0, busy = false, lastReloadAt = 0;

  async function refreshCandles(){
    if(busy || window.__DVL_REPLAY_ACTIVE || document.hidden) return;
    if(typeof loadAll !== "function") return;
    var now = Date.now();
    if(now - lastReloadAt < 1200) return;
    busy = true;
    lastReloadAt = now;
    try{
      await loadAll(true);
      try{
        if(typeof requestLiveChartRender === "function") requestLiveChartRender(true);
        else if(typeof drawSoon === "function") drawSoon();
      }catch(_){}
    }catch(_){
    }finally{
      busy = false;
    }
  }

  setInterval(function(){
    try{
      if(window.__DVL_REPLAY_ACTIVE || document.hidden) return;
      var iv = getIv();
      var step = msOf(iv);
      var bucket = Math.floor(Date.now() / step) * step;
      if(!lastBucket) lastBucket = bucket;
      if(bucket !== lastBucket){
        lastBucket = bucket;
        setTimeout(refreshCandles, iv === "15s" || iv === "30s" ? 700 : 1200);
      }
    }catch(_){}
  }, 250);

  window.addEventListener("focus", refreshCandles, {passive:true});
  document.addEventListener("visibilitychange", function(){
    if(!document.hidden) refreshCandles();
  }, {passive:true});
})();
