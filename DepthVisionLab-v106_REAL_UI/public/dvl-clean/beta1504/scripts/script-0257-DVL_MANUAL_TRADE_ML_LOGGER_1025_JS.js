/* Every position the user opens by hand (paper "Buy"/"Sell" Market orders
   in Trade → Positions) gets logged to the backend as an ML training
   example too — the outcome log used to only ever see what the automated
   scanner flagged, never the user's own discretionary entries. Best-effort
   and fire-and-forget: never touches the trading flow itself, never blocks
   or throws into it, and stays silent on failure (the backend may be
   offline/unreachable, which must never surface as a trading-UI error). */
(function(){
  "use strict";
  if(window.DVL_MANUAL_TRADE_ML_LOGGER_1025) return;

  var LS_URL="dvlScannerBackendUrl";
  var _sentAt=0;

  function baseUrl(){
    try{ return (typeof window.DVL_SCANNER_BACKEND_URL==="string"?window.DVL_SCANNER_BACKEND_URL:null) || localStorage.getItem(LS_URL) || ""; }
    catch(_){ return ""; }
  }

  function send(pos){
    try{
      if(!pos || pos.status!=="open") return;          // only fully-filled Market entries, not drafts/pending
      if(!(Number(pos.entry) > 0) || !pos.symbol) return;
      var base=baseUrl().replace(/\/$/,"");
      var url=(base||"")+"/api/dvl/scanner/manual-trade";
      fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          symbol: pos.symbol,
          side: pos.side==="sell" ? "SHORT" : "LONG",
          entryPrice: Number(pos.entry),
          at: pos.createdAt || Date.now()
        }),
        keepalive:true
      }).catch(function(){ /* backend offline/unreachable — silent, never surfaces to the trading UI */ });
    }catch(_){}
  }

  window.addEventListener("dvl:paper-position", function(ev){
    try{
      var pos=ev && ev.detail;
      if(!pos) return;
      _sentAt=Date.now();
      send(pos);
    }catch(_){}
  });

  window.DVL_MANUAL_TRADE_ML_LOGGER_1025={
    version:"1.025",
    audit:function(){ return {version:"1.025", lastSentAt:_sentAt, base:baseUrl()}; }
  };
})();
