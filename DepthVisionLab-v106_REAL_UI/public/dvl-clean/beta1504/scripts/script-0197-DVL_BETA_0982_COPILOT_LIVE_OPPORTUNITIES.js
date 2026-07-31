(function(){
  "use strict";

  function fmtSymbol(sym){
    sym = String(sym || "BTCUSDT").trim().toUpperCase();
    if(sym.indexOf("/") >= 0) return sym;
    if(sym.endsWith("USDT")) return sym.replace(/USDT$/,"/USDT");
    return sym;
  }

  function currentSymbol(){
    try{
      var st = document.getElementById("symbolText");
      var raw = st ? (st.textContent || "").trim() : "";
      if(raw) return fmtSymbol(raw);
    }catch(_){}
    try{ if(window.S && S.sym) return fmtSymbol(S.sym); }catch(_){}
    try{ if(window.symbol) return fmtSymbol(window.symbol); }catch(_){}
    return "BTC/USDT";
  }

  function candleArray(){
    var arr = [];
    try{ if(window.S && Array.isArray(S.candles) && S.candles.length) arr = S.candles; }catch(_){}
    try{ if(!arr.length && Array.isArray(window.klines) && window.klines.length) arr = window.klines; }catch(_){}
    return arr || [];
  }

  function num(v){ v = Number(v); return Number.isFinite(v) ? v : 0; }
  function closeOf(c){ return num(c && (c.close ?? c.c ?? c.price)); }
  function volOf(c){ return num(c && (c.volume ?? c.v ?? c.vol)); }
  function avg(a){ return a.length ? a.reduce(function(x,y){return x+num(y);},0)/a.length : 0; }
  function pct(a,b){ return b ? ((a-b)/Math.abs(b))*100 : 0; }

  function tokenLetter(pair){
    pair = String(pair || "?").trim();
    var base = pair.split("/")[0] || pair.replace(/USDT$/,"");
    return (base.replace(/^[0-9]+/,"").charAt(0) || "?").toUpperCase();
  }

  function coinClass(pair){
    var b = String(pair || "").toUpperCase();
    if(b.indexOf("SOL") >= 0) return "sol";
    if(b.indexOf("AVAX") >= 0) return "avax";
    if(b.indexOf("LINK") >= 0) return "link";
    if(b.indexOf("BNB") >= 0) return "bnb";
    if(b.indexOf("TON") >= 0) return "ton";
    return "";
  }

  function candlesHtml(pattern){
    var map = {
      up:[10,15,12,20,17,23,29],
      mixed:[15,21,12,18,14,22,17],
      down:[29,23,21,17,20,14,10]
    };
    var arr = map[pattern] || map.mixed;
    return '<div class="dvlCp0976MiniCandles">' + arr.map(function(h,i){
      var red = pattern === "down" ? i < 5 : (i === 1 || i === 4);
      return '<i class="dvlCp0976Candle '+(red?'r':'')+'" style="height:'+h+'px"></i>';
    }).join('') + '</div>';
  }

  function scanRowsFromScanner(){
    var rows = [];
    try{
      var api = window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780;
      var candidates = [
        api && api.state && api.state.rawRows,
        api && api.rawRows,
        window.dvlScannerRows,
        window.DVL_SCANNER_ROWS,
        window.DVL_MEXC_SCANNER_ROWS
      ];
      for(var c=0;c<candidates.length;c++){
        var arr = candidates[c];
        if(Array.isArray(arr) && arr.length){
          rows = arr;
          break;
        }
      }
    }catch(_){}
    return rows || [];
  }

  function normalizeScannerRow(r, i){
    var pair = fmtSymbol(r.symbol || r.sym || r.pair || r.asset || r.base || "");
    if(!pair || pair === "BTCUSDT") pair = currentSymbol();
    var score = num(r.score || r.spikeScore || r.spike || r.rankScore || r.confidence || 0);
    if(score <= 1 && score > 0) score *= 100;
    score = Math.max(48, Math.min(92, Math.round(score || (78 - i*5))));
    var setup = r.setup || r.status || r.label || (score >= 75 ? "Spike + Continuação" : "Spike limpo");
    var side = String(r.side || r.direction || r.bias || "LONG").toUpperCase();
    if(side.indexOf("SHORT") >= 0 || side.indexOf("SELL") >= 0) side = "SHORT";
    else side = "LONG";
    return { pair:pair, setup:"Setup: " + setup, confidence:score, side:side, pattern:side==="SHORT"?"down":"up" };
  }

  function fallbackOpportunity(){
    var candles = candleArray();
    var pair = currentSymbol();
    if(!candles.length){
      return [{pair:pair, setup:"Setup: Aguardando dados", confidence:55, side:"LONG", pattern:"mixed"}];
    }

    var last = candles[candles.length-1];
    var lookback = Math.min(20, candles.length-1);
    var ref = closeOf(candles[candles.length-1-lookback] || last);
    var chg = pct(closeOf(last), ref);
    var recent = candles.slice(-Math.min(10,candles.length));
    var prev = candles.slice(-Math.min(30,candles.length), -recent.length);
    var volBoost = avg(prev.map(volOf)) ? avg(recent.map(volOf)) / avg(prev.map(volOf)) : 1;
    var side = chg < -0.2 ? "SHORT" : "LONG";
    var confidence = 58 + Math.min(18, Math.abs(chg) * 8) + (volBoost > 1.15 ? 8 : 0);
    confidence = Math.max(55, Math.min(86, Math.round(confidence)));
    var setup = volBoost > 1.18 ? "Volume + Continuação" : (Math.abs(chg) > 0.45 ? "Momentum + Break" : "Contexto atual");
    return [{pair:pair, setup:"Setup: " + setup, confidence:confidence, side:side, pattern:side==="SHORT"?"down":"up"}];
  }

  function buildOpportunities(){
    var scanner = scanRowsFromScanner().slice(0,12).map(normalizeScannerRow);
    var list = scanner.length ? scanner : fallbackOpportunity();

    var cur = currentSymbol();
    if(!list.some(function(x){ return x.pair === cur; })){
      list.unshift(fallbackOpportunity()[0]);
    }

    var uniq = [];
    var seen = {};
    list.forEach(function(x){
      if(!x || !x.pair || seen[x.pair]) return;
      seen[x.pair] = true;
      uniq.push(x);
    });

    uniq.sort(function(a,b){ return (b.confidence||0) - (a.confidence||0); });
    return uniq.slice(0,3);
  }

  function rowHtml(item, idx){
    var side = item.side === "SHORT" ? "SHORT" : "LONG";
    var pattern = item.pattern || (side === "SHORT" ? "down" : "up");
    var c = coinClass(item.pair);
    var letter = tokenLetter(item.pair);
    return '' +
      '<div class="dvlCp0976Opp" data-dvl-cp-top3-row="1" data-dvl-live-opp="'+idx+'">' +
        '<div class="dvlCp0976Rank">'+idx+'</div>' +
        '<div class="dvlCp0976Coin '+c+'">'+letter+'</div>' +
        '<div class="dvlCp0976Pair"><b>'+item.pair+'</b><small>'+item.setup+'</small></div>' +
        '<div class="dvlCp0976Pct">'+Math.round(item.confidence)+'%<small>Confiança</small></div>' +
        candlesHtml(pattern) +
        '<div class="dvlCp0976Long">'+side+'</div>' +
        '<div class="dvlCp0976Chevron">›</div>' +
      '</div>';
  }

  var lastKey = "";

  function render(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page) return false;
    var holder = page.querySelector('[data-dvl-cp-section="opportunities"] .dvlCp0976OppList');
    if(!holder) return false;

    var list = buildOpportunities();
    var key = list.map(function(x){ return x.pair + ":" + x.confidence + ":" + x.side; }).join("|");
    if(key === lastKey) return true;
    lastKey = key;

    holder.innerHTML = list.map(function(item,i){ return rowHtml(item, i+1); }).join("");

    try{
      page.dataset.dvlCpLiveOpportunities = JSON.stringify(list.map(function(x){
        return {pair:x.pair, confidence:x.confidence, side:x.side, setup:x.setup};
      }));
    }catch(_){}

    return true;
  }

  function boot(){
    render();
    /* DVL 0.993 stability: old live opportunities loop disabled; Stability Lock controls cadence. */
    window.addEventListener("dvl-safe-asset-selected-0804", function(){ setTimeout(render,0); setTimeout(render,450); }, true);
    window.addEventListener("dvl:scanner-state-change", function(){ setTimeout(render,350); }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_LIVE_OPPORTUNITIES_0982 = {
    version:"0.982",
    build:buildOpportunities,
    render:render,
    audit:function(){
      var page = document.getElementById("dvlCopilotPage0974");
      var rows = page ? page.querySelectorAll('[data-dvl-live-opp]').length : 0;
      var list = buildOpportunities();
      return {
        version:"0.982",
        pageFound:!!page,
        renderedRows:rows,
        builtCount:list.length,
        source:scanRowsFromScanner().length ? "scanner" : "candles-fallback",
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!page && rows > 0
      };
    }
  };

  window.DVL_COPILOT_LIVE_OPPORTUNITIES_AUDIT = function(){
    return window.DVL_COPILOT_LIVE_OPPORTUNITIES_0982.audit();
  };
})();
