(function(){
  "use strict";
  if(window.DVL_PRODUCTION_READINESS_1020) return;

  var VERSION = "1.020";
  var errors = [];
  var maxErrors = 40;
  var oldError = window.onerror;
  var oldUnhandled = window.onunhandledrejection;

  function pushError(type,msg,src,line,col){
    try{
      errors.push({
        type:type||"error",
        message:String(msg||""),
        source:String(src||""),
        line:line||0,
        column:col||0,
        ts:Date.now()
      });
      if(errors.length>maxErrors) errors.shift();
    }catch(_){}
  }

  window.onerror = function(msg,src,line,col,err){
    pushError("error", msg || (err&&err.message), src, line, col);
    if(typeof oldError==="function") return oldError.apply(this, arguments);
    return false;
  };

  window.onunhandledrejection = function(ev){
    try{ pushError("promise", ev && ev.reason && (ev.reason.message || ev.reason) || "unhandled rejection", "", 0, 0); }catch(_){}
    if(typeof oldUnhandled==="function") return oldUnhandled.apply(this, arguments);
  };

  function q(sel,root){ return (root||document).querySelector(sel); }
  function qa(sel,root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function scannerPanel(){ return document.getElementById("dvlScannerPanel0780"); }
  function scannerOpen(){ var p=scannerPanel(); return !!(p&&p.classList.contains("is-open")); }

  function ensureNoNativeScannerControls(){
    var p=scannerPanel();
    if(!p) return;
    qa("#dvlScan1013FilterMenu select,#dvlScan1013FilterMenu input[type='number']", p).forEach(function(el){
      el.setAttribute("data-dvl-native-blocked","1020");
      el.style.display="none";
      el.style.pointerEvents="none";
    });
  }

  function ensureBotBlocked(){
    try{
      window.DVL_BOT_EXECUTION_ALLOWED = false;
      window.DVL_AI_AUTO_TRADE_ALLOWED = false;
      window.DVL_COPILOT_AUTO_ORDER_ALLOWED = false;
      window.DVL_PRODUCTION_BOT_LOCK_1020 = {
        version:VERSION,
        executeTrades:false,
        sendOrders:false,
        reason:"Copilot/Scanner leitura apenas. Execução automática bloqueada até pedido explícito futuro."
      };
    }catch(_){}
  }

  function hardBlockOrderHooks(){
    try{
      var names=[
        "DVL_COPILOT_SEND_ORDER",
        "DVL_AI_SEND_ORDER",
        "DVL_BOT_SEND_ORDER",
        "DVL_COPILOT_AUTO_EXECUTE",
        "DVL_BOT_AUTO_EXECUTE"
      ];
      names.forEach(function(name){
        if(typeof window[name] !== "function"){
          window[name] = function(){
            console.warn("[DVL 1.020] Ordem automática bloqueada:", name);
            return {ok:false,blocked:true,version:VERSION,reason:"auto-order-blocked"};
          };
        }
      });
    }catch(_){}
  }

  function feedAudit(){
    var feed = null, bridge = null, bridgeAudit = null;
    try{ feed = window.DVL_COPILOT_SIGNAL_FEED || null; }catch(_){}
    try{ bridge = window.DVL_COPILOT_LIVE_FEED_BRIDGE_1010 || window.DVL_COPILOT_LIVE_FEED_BRIDGE || null; }catch(_){}
    try{ if(bridge && typeof bridge.audit==="function") bridgeAudit = bridge.audit(); }catch(_){}
    var assets = 0, updatedAt = 0;
    try{
      var data = feed && (feed.assets || feed.symbols || feed.data);
      if(data) assets = Array.isArray(data) ? data.length : Object.keys(data).length;
      updatedAt = Number(feed && (feed.updatedAt || feed.ts) || 0);
    }catch(_){}
    return {
      hasBridge:!!bridge,
      bridge:bridgeAudit,
      hasFeed:!!feed,
      assetCount:assets,
      updatedAt:updatedAt,
      ageSec:updatedAt?Math.max(0,Math.floor((Date.now()-updatedAt)/1000)):null
    };
  }

  function scannerAudit(){
    var p=scannerPanel();
    var filter = q("#dvlScan1013FilterMenu");
    var nativeVisible = qa("#dvlScan1013FilterMenu select,#dvlScan1013FilterMenu input[type='number']").filter(function(el){
      var st=getComputedStyle(el);
      return st.display!=="none" && st.visibility!=="hidden";
    }).length;
    var rows = 0;
    try{
      if(window.__DVL_SCANNER_ORIGINAL_1013 && typeof window.__DVL_SCANNER_ORIGINAL_1013.rows==="function"){
        rows = (window.__DVL_SCANNER_ORIGINAL_1013.rows()||[]).length;
      }else if(window.DVL_SCANNER_PRO_FORCE_OPEN_1013 && typeof window.DVL_SCANNER_PRO_FORCE_OPEN_1013.audit==="function"){
        rows = (window.DVL_SCANNER_PRO_FORCE_OPEN_1013.audit().rows || 0);
      }
    }catch(_){}
    return {
      panel:!!p,
      open:scannerOpen(),
      prodReady:!!(p&&p.getAttribute("data-dvl-prod-ready")==="1020"),
      filterMenu:!!filter,
      filterOpen:!!(filter&&filter.classList.contains("is-open")),
      nativeVisible:nativeVisible,
      rows:rows,
      customFilters:!!q("[data-dvl-scan1015-num-row]"),
      metricFilters:!!q("[data-dvl-scan1016-metric]")
    };
  }

  function panelAudit(){
    return {
      copilot:!!document.getElementById("dvlCopilotPage0974"),
      scanner:!!document.getElementById("dvlScannerPanel0780"),
      bottomNav:!!document.getElementById("dvlBottomNavV2"),
      scannerOpen:scannerOpen(),
      copilotOpen:!!(q("#dvlCopilotPage0974.is-open") || q("#dvlCopilotPage0974.open"))
    };
  }

  function paintScannerStatus(){
    var p=scannerPanel();
    if(!p) return;
    p.setAttribute("data-dvl-prod-ready","1020");
    ensureNoNativeScannerControls();
    var target = q("#dvlScan1013Updated", p);
    if(!target) return;
    var st = q(".dvlProd1020Status", target);
    if(!st){
      st = document.createElement("span");
      st.className = "dvlProd1020Status";
      st.innerHTML = "<i></i><b>READY</b>";
      target.appendChild(st);
    }
    var audit = scannerAudit();
    var warn = audit.nativeVisible>0 || (!audit.rows && scannerOpen());
    st.classList.toggle("warn", warn);
    var label = warn ? (audit.nativeVisible>0 ? "NATIVE" : "FEED") : "READY";
    var b = st.querySelector("b");
    if(b && b.textContent !== label) b.textContent = label;
  }

  function fixScannerFit(){
    var p=scannerPanel();
    if(!p) return;
    var canvas=q(".dvlScan1013Canvas",p);
    var sizer=q(".dvlScan1013Sizer",p);
    if(!canvas || !sizer) return;
    try{
      var base=860;
      var scale=Math.max(.42,Math.min(1,(window.innerWidth-34)/base));
      document.documentElement.style.setProperty("--dvl-scan1013-scale",String(scale));
      sizer.style.width=Math.ceil(base*scale)+"px";
      canvas.style.marginBottom=scale<1 ? Math.round((scale-1)*canvas.offsetHeight)+"px" : "";
    }catch(_){}
  }

  function validate(){
    ensureBotBlocked();
    hardBlockOrderHooks();
    ensureNoNativeScannerControls();
    fixScannerFit();
    paintScannerStatus();
  }

  function audit(){
    return {
      version:VERSION,
      appVersion:window.DVL_APP_VERSION || null,
      panels:panelAudit(),
      scanner:scannerAudit(),
      feed:feedAudit(),
      botLock:window.DVL_PRODUCTION_BOT_LOCK_1020 || null,
      errors:errors.slice(-10),
      pass:(function(){
        var sc=scannerAudit();
        return !!sc.panel && sc.nativeVisible===0 && !!window.DVL_PRODUCTION_BOT_LOCK_1020;
      })()
    };
  }

  function install(){
    validate();
    window.addEventListener("resize",function(){ setTimeout(validate,60); },true);
    window.addEventListener("orientationchange",function(){ setTimeout(validate,160); },true);
    window.addEventListener("dvl:scanner-state-change",function(){ setTimeout(validate,100); },true);
    window.addEventListener("dvl:copilot-live-feed",function(){ setTimeout(validate,60); },true);
    document.addEventListener("click",function(){ setTimeout(validate,90); },true);
    document.addEventListener("visibilitychange",function(){ if(!document.hidden) setTimeout(validate,60); },true);
  }

  window.DVL_PRODUCTION_READINESS_1020 = {
    version:VERSION,
    validate:validate,
    audit:audit,
    errors:function(){ return errors.slice(); },
    clearErrors:function(){ errors.length=0; return true; }
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  setTimeout(validate,500);
  setTimeout(validate,1500);
})();
