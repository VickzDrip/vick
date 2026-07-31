(function(){
  "use strict";
  if(window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987) return;

  function cleanSymbol(v){
    var s = String(v || "").trim().toUpperCase().replace(/[\s_\-]/g, "").replace(/\//g, "");
    if(!s) return "";
    if(!/(USDT|USDC|BUSD|USD|BTC|ETH)$/.test(s)) s += "USDT";
    return s;
  }
  function displaySymbol(v){
    var s = cleanSymbol(v);
    return /USDT$/.test(s) ? s.replace(/USDT$/, "/USDT") : s;
  }
  function firstLetter(sym){
    try{ if(window.dvlAssetFirstLetter) return window.dvlAssetFirstLetter(sym); }catch(_){ }
    var s = cleanSymbol(sym).replace(/(USDT|USDC|BUSD|USD|BTC|ETH)$/i, "").replace(/^[0-9]+/, "");
    var m = s.match(/[A-Z]/);
    return m ? m[0] : "?";
  }
  function assetClass(sym){
    try{ if(window.dvlAssetLetterClass) return window.dvlAssetLetterClass(sym); }catch(_){ }
    try{ if(window.getAssetIconMeta) return window.getAssetIconMeta(sym).className || "dvlLetterGeneric"; }catch(_){ }
    return "dvlLetterGeneric";
  }
  function paintIcon(el, sym){
    if(!el) return;
    var clean = cleanSymbol(sym || el.getAttribute("data-dvl-symbol") || "BTCUSDT");
    try{
      if(window.dvlPaintAssetLetterIcon){
        window.dvlPaintAssetLetterIcon(el, clean);
      }else{
        el.textContent = firstLetter(clean);
        el.className += " dvlAssetLetterIcon " + assetClass(clean);
      }
    }catch(_){
      el.textContent = firstLetter(clean);
      el.classList.add("dvlAssetLetterIcon", assetClass(clean));
    }
    el.classList.add("dvlAssetLetterIcon");
    el.setAttribute("data-dvl-symbol", clean);
    el.removeAttribute("style");
  }
  function normText(t){ return String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function scannerAgeMap(page){
    var map = {};
    if(!page) return map;
    page.querySelectorAll("[data-dvl-cp-section='scanner'] .dvlCp0976ScanRow").forEach(function(row){
      if(row.classList.contains("head")) return;
      var b = row.querySelector(".dvlCp0976AssetCell b");
      var age = row.querySelector(".dvlCp0976Age");
      if(!b || !age) return;
      var key = cleanSymbol(b.textContent);
      if(key) map[key] = String(age.textContent || "").trim();
    });
    return map;
  }
  function classForAge(age){
    var a = String(age || "").toLowerCase();
    if(/antigo|expir|velho|old/.test(a)) return "is-expired";
    var m = a.match(/(\d+)/);
    if(m && Number(m[1]) >= 8) return "is-old";
    return "";
  }
  function fallbackAge(idx){
    return idx === 0 ? "agora" : (idx === 1 ? "2m" : "5m");
  }
  function patchOpportunities(page){
    var holder = page && page.querySelector("[data-dvl-cp-section='opportunities'] .dvlCp0976OppList");
    if(!holder) return 0;
    var ageMap = scannerAgeMap(page);
    var rows = holder.querySelectorAll(".dvlCp0976Opp");
    rows.forEach(function(row, idx){
      var pairEl = row.querySelector(".dvlCp0976Pair b");
      var sym = cleanSymbol(pairEl ? pairEl.textContent : "");
      if(!sym) sym = "BTCUSDT";
      var coin = row.querySelector(".dvlCp0976Coin");
      paintIcon(coin, sym);
      var age = ageMap[sym] || fallbackAge(idx);
      var ageEl = row.querySelector(".dvlCp0987OppAge");
      if(!ageEl){
        ageEl = document.createElement("div");
        ageEl.className = "dvlCp0987OppAge";
        var pct = row.querySelector(".dvlCp0976Pct");
        if(pct && pct.parentNode) pct.insertAdjacentElement("afterend", ageEl);
        else row.appendChild(ageEl);
      }
      ageEl.className = "dvlCp0987OppAge " + classForAge(age);
      ageEl.innerHTML = '<small>Tempo</small><b>'+String(age || "agora").replace(/[<>&\"]/g, "")+'</b>';
      row.setAttribute("data-dvl-opp-age", age);
      row.setAttribute("data-dvl-symbol", sym);
    });
    return rows.length;
  }
  function patchPreMomentum(page){
    var panel = page && page.querySelector("[data-dvl-cp-section='decision'][data-dvl-cp-section-version='0986']");
    if(!panel) return 0;
    var n = 0;
    panel.querySelectorAll(".dvlCp0986PMRow").forEach(function(row){
      var symEl = row.querySelector(".dvlCp0986PMAssetName b");
      var sym = symEl ? symEl.textContent : row.getAttribute("data-dvl-symbol");
      var icon = row.querySelector(".dvlCp0986PMAssetIcon");
      paintIcon(icon, sym);
      row.setAttribute("data-dvl-symbol", cleanSymbol(sym));
      n++;
    });
    return n;
  }
  function syncDataset(page){
    try{
      var rows = page.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0976Opp");
      var out = [];
      rows.forEach(function(row){
        var pair = row.querySelector(".dvlCp0976Pair b");
        var pct = row.querySelector(".dvlCp0976Pct");
        var side = row.querySelector(".dvlCp0976Long");
        out.push({
          pair: pair ? pair.textContent : "",
          confidence: pct ? parseInt(pct.textContent,10) || 0 : 0,
          side: side ? side.textContent : "",
          age: row.getAttribute("data-dvl-opp-age") || ""
        });
      });
      if(out.length) page.dataset.dvlCpLiveOpportunities0987 = JSON.stringify(out);
    }catch(_){ }
  }
  function patch(){
    var page = document.getElementById("dvlCopilotPage0974");
    if(!page) return false;
    var opp = patchOpportunities(page);
    var pm = patchPreMomentum(page);
    syncDataset(page);
    return opp > 0 && pm > 0;
  }
  function boot(){
    patch();
    setTimeout(patch,0);
    setTimeout(patch,220);
    setTimeout(patch,700);
    /* DVL 0.993 stability: old opportunity time/logo loop disabled after initial boot. */
    window.addEventListener("dvl-safe-asset-selected-0804", function(){ setTimeout(patch,0); setTimeout(patch,350); }, true);
    window.addEventListener("dvl:scanner-state-change", function(){ setTimeout(patch,120); setTimeout(patch,600); }, true);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987 = {
    version:"0.987",
    patch:patch,
    audit:function(){
      patch();
      var page = document.getElementById("dvlCopilotPage0974");
      var oppRows = page ? page.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0976Opp").length : 0;
      var oppTimes = page ? page.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0987OppAge").length : 0;
      var oppIcons = page ? page.querySelectorAll("[data-dvl-cp-section='opportunities'] .dvlCp0976Coin.dvlAssetLetterIcon").length : 0;
      var pmIcons = page ? page.querySelectorAll("[data-dvl-cp-section='decision'] .dvlCp0986PMAssetIcon.dvlAssetLetterIcon").length : 0;
      return {
        version:"0.987",
        opportunitiesRows:oppRows,
        opportunityTimes:oppTimes,
        opportunityStandardIcons:oppIcons,
        preMomentumStandardIcons:pmIcons,
        noTradeExecution:true,
        noOrdersSent:true,
        noApiTouch:true,
        noIndicatorsTouch:true,
        noDrawingsTouch:true,
        pass:oppRows > 0 && oppTimes === oppRows && oppIcons === oppRows && pmIcons >= 3
      };
    }
  };
  window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_AUDIT = function(){
    return window.DVL_COPILOT_OPPORTUNITY_TIMES_LOGOS_0987.audit();
  };
})();
