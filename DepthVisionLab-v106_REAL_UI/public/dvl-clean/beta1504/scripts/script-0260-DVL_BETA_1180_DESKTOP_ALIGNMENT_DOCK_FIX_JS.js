(function(){
  "use strict";
  if(window.DVL_DESKTOP_ALIGNMENT_1180) return;
  var MQ=window.matchMedia("(min-width:1100px)");
  var raf=0;

  function desktop(){ return !!MQ.matches; }
  function important(el,name,value){
    if(!el) return;
    if(el.style.getPropertyValue(name)!==value || el.style.getPropertyPriority(name)!=="important"){
      el.style.setProperty(name,value,"important");
    }
  }
  function isOpen(el){ return !!(el && el.classList.contains("is-open")); }

  function fitScanner(panel){
    if(!desktop() || !panel || !isOpen(panel)) return;
    var available=Math.max(360,panel.clientWidth-12);
    var c13=panel.querySelector(".dvlScan1013Canvas");
    var s13=panel.querySelector(".dvlScan1013Sizer");
    if(c13&&s13){
      var scale13=Math.max(.42,Math.min(1,available/880));
      document.documentElement.style.setProperty("--dvl-scan1013-scale",String(scale13));
      s13.style.setProperty("width",Math.floor(880*scale13)+"px","important");
      s13.style.setProperty("margin","0 auto","important");
      c13.style.setProperty("margin-bottom",scale13<1?Math.round((scale13-1)*c13.offsetHeight)+"px":"0px","important");
    }
    var c80=panel.querySelector(".dvlScan080Canvas");
    var s80=panel.querySelector(".dvlScan080Sizer");
    if(c80&&s80){
      var scale80=Math.max(.42,Math.min(1,available/864));
      document.documentElement.style.setProperty("--dvl-scan080-scale",String(scale80));
      s80.style.setProperty("width",Math.floor(864*scale80)+"px","important");
      s80.style.setProperty("margin","0 auto","important");
    }
  }

  function hardDock(el){
    if(!desktop() || !el) return;
    important(el,"left","auto");
    important(el,"right","0px");
    important(el,"top","var(--dvl-desktop-header-h)");
    important(el,"bottom","0px");
    important(el,"width","var(--dvl-desktop-panel-w)");
    important(el,"max-width","var(--dvl-desktop-panel-w)");
    important(el,"height","calc(100vh - var(--dvl-desktop-header-h))");
    important(el,"max-height","calc(100vh - var(--dvl-desktop-header-h))");
    important(el,"transform","none");
  }

  function apply(){
    raf=0;
    if(!desktop()){
      document.documentElement.classList.remove("dvl-desktop-aligned-1180");
      document.body.classList.remove("dvlDesktopDockOpen1180");
      return;
    }
    document.documentElement.classList.add("dvl-desktop-aligned-1180");
    var scanner=document.getElementById("dvlScannerPanel0780");
    var trade=document.getElementById("tradeDrawer");
    var positions=document.getElementById("dvlPositionsPanelV2");
    var watchlist=document.getElementById("dvlWatchlistPanel");
    var copilot=document.getElementById("dvlCopilotPage0974");

    [scanner,trade,positions,watchlist,copilot].forEach(hardDock);
    fitScanner(scanner);

    var open=!!(
      isOpen(scanner) || isOpen(trade) || isOpen(positions) || isOpen(watchlist) ||
      document.body.classList.contains("dvlCopilotOpen0974")
    );
    document.body.classList.toggle("dvlDesktopDockOpen1180",open);
    try{ if(typeof requestDraw==="function") requestDraw(); }catch(_){ }
  }
  function schedule(){ if(raf) return; raf=requestAnimationFrame(apply); }

  /* Beta 1.208 — the old document-wide class+style observer watched its own
     hardDock() style writes and could create a perpetual rAF/apply/requestDraw loop.
     Observe only open/close class changes on the actual dock surfaces. */
  var observer=new MutationObserver(schedule);
  function bindDockTargets1208(){
    try{ observer.disconnect(); }catch(_){}
    [document.body,
     document.getElementById("dvlScannerPanel0780"),
     document.getElementById("tradeDrawer"),
     document.getElementById("dvlPositionsPanelV2"),
     document.getElementById("dvlWatchlistPanel"),
     document.getElementById("dvlCopilotPage0974")
    ].forEach(function(el){
      if(el) observer.observe(el,{attributes:true,attributeFilter:["class"]});
    });
  }
  function scheduleAndRebind1208(){
    bindDockTargets1208();
    schedule();
  }
  function init(){
    bindDockTargets1208();
    schedule();
    window.addEventListener("resize",schedule,{passive:true});
    window.addEventListener("orientationchange",schedule,{passive:true});
    window.addEventListener("dvl:scanner-state-change",scheduleAndRebind1208,{passive:true});
    window.addEventListener("dvl:copilot-state-change",scheduleAndRebind1208,{passive:true});
    window.addEventListener("dvl:watchlist-state-change",scheduleAndRebind1208,{passive:true});
    document.addEventListener("dvl:position-detail-open",schedule,{passive:true});
    document.addEventListener("click",function(){setTimeout(schedule,0);},true);
    setTimeout(scheduleAndRebind1208,800);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  if(MQ.addEventListener) MQ.addEventListener("change",schedule);

  window.DVL_DESKTOP_ALIGNMENT_1180={
    version:"1.183",
    apply:apply,
    fitScanner:function(){fitScanner(document.getElementById("dvlScannerPanel0780"));},
    audit:function(){
      var scanner=document.getElementById("dvlScannerPanel0780");
      var trade=document.getElementById("tradeDrawer");
      return {
        desktop:desktop(),
        header:document.getElementById("DVL_UI_OVERLAY_PHASE_1B")?.getBoundingClientRect()||null,
        scanner:scanner?.getBoundingClientRect()||null,
        scannerOpen:isOpen(scanner),
        trade:trade?.getBoundingClientRect()||null,
        tradeOpen:isOpen(trade),
        dockClass:document.body.classList.contains("dvlDesktopDockOpen1180")
      };
    }
  };
})();
