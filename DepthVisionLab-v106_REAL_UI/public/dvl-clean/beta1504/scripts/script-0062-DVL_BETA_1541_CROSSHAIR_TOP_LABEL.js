(function(){
  "use strict";
  if(window.__DVL_BETA_1541_CROSSHAIR_TOP_LABEL__) return;
  window.__DVL_BETA_1541_CROSSHAIR_TOP_LABEL__ = true;

  var raf = 0;
  var lastEv = null;

  function q(id){ return document.getElementById(id); }
  function wrap(){ return q("chartWrap") || document.querySelector(".canvasWrap") || document.querySelector(".chartWrap"); }
  function canvas(){ var w=wrap(); return q("chart") || (w ? w.querySelector("canvas") : null); }
  function n(v){ v=Number(v); return Number.isFinite(v) ? v : null; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function fmt(v){
    try{ if(typeof fmtPrice === "function") return fmtPrice(v); }catch(_){}
    try{ if(typeof priceFmt === "function") return priceFmt(v); }catch(_){}
    return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function ensure(){
    var st = q("DVL_BETA_1541_CROSSHAIR_STYLE");
    if(!st){
      st = document.createElement("style");
      st.id = "DVL_BETA_1541_CROSSHAIR_STYLE";
      st.textContent = [
        "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
        "#dvlCross1541V,#dvlCross1541H{position:fixed;z-index:2147483000;pointer-events:none;display:none}",
        "#dvlCross1541V{width:1px;border-left:1px dotted rgba(0,230,138,.82)}",
        "#dvlCross1541H{height:1px;border-top:1px dotted rgba(0,230,138,.82)}",
        "#dvlCross1541P{position:fixed;z-index:2147483001;pointer-events:none;display:none;width:75px;height:22px;box-sizing:border-box;padding:2px 4px;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.28)}"
      ].join("\n");
      document.head.appendChild(st);
    }

    function div(id){
      var e=q(id);
      if(!e){ e=document.createElement("div"); e.id=id; document.body.appendChild(e); }
      return e;
    }

    var w=wrap(), c=canvas();
    try{ if(w) w.style.cursor="crosshair"; if(c) c.style.cursor="crosshair"; }catch(_){}

    return {
      v: div("dvlCross1541V"),
      h: div("dvlCross1541H"),
      p: div("dvlCross1541P")
    };
  }

  function hide(){
    ["dvlCross1541V","dvlCross1541H","dvlCross1541P"].forEach(function(id){
      var e=q(id); if(e) e.style.display="none";
    });
  }

  function priceFromCfg(cfg, y){
    var y0=n(cfg.y0), y1=n(cfg.y1), mn=n(cfg.min), mx=n(cfg.max);
    if(y0!==null && y1!==null && mn!==null && mx!==null && y1!==y0){
      return mx - ((y - y0) / Math.max(1, y1 - y0)) * (mx - mn);
    }
    try{
      if(window.DVL_PRICE_SCALE_MODEL && typeof window.DVL_PRICE_SCALE_MODEL.yToPrice === "function"){
        var p = window.DVL_PRICE_SCALE_MODEL.yToPrice(y);
        if(Number.isFinite(Number(p))) return Number(p);
      }
    }catch(_){}
    return null;
  }

  function paint(ev){
    raf = 0;
    var w = wrap();
    if(!w || !ev) return hide();

    var r = w.getBoundingClientRect();
    if(ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return hide();

    try{ window.__dvlDesktopHoverCrosshair = true; }catch(_){}
    try{ if(typeof setCrosshairFromClient === "function") setCrosshairFromClient(ev.clientX, ev.clientY); }catch(_){}
    try{ if(window.DVL_DOM_CROSSHAIR_1205 && typeof window.DVL_DOM_CROSSHAIR_1205.scheduleFromState === "function") window.DVL_DOM_CROSSHAIR_1205.scheduleFromState(); }catch(_){}

    var cfg = window.__dvlLastCrossCfg || {};
    var x0 = n(cfg.x0); if(x0===null) x0 = 0;
    var x1 = n(cfg.x1); if(x1===null) x1 = Math.max(0, r.width - 80);
    var y0 = n(cfg.y0); if(y0===null) y0 = 0;
    var y1 = n(cfg.y1); if(y1===null) y1 = Math.max(0, r.height - 24);

    var localX = clamp(ev.clientX - r.left, x0, x1);
    var localY = clamp(ev.clientY - r.top, y0, y1);
    var pageX = r.left + localX;
    var pageY = r.top + localY;

    var ui = ensure();

    ui.v.style.left = Math.round(pageX) + "px";
    ui.v.style.top = Math.round(r.top + y0) + "px";
    ui.v.style.height = Math.max(0, y1 - y0) + "px";
    ui.v.style.display = "block";

    ui.h.style.left = Math.round(r.left + x0) + "px";
    ui.h.style.top = Math.round(pageY) + "px";
    ui.h.style.width = Math.max(0, r.right - (r.left + x0)) + "px";
    ui.h.style.display = "block";

    var price = priceFromCfg(cfg, localY);
    if(price !== null){
      ui.p.textContent = fmt(price);
      ui.p.style.left = Math.round(clamp(r.left + x1 + 3, r.left, r.right - 77)) + "px";
      ui.p.style.top = Math.round(clamp(pageY - 11, r.top + 2, r.bottom - 24)) + "px";
      ui.p.style.display = "block";
    }else{
      ui.p.style.display = "none";
    }
  }

  function move(ev){
    lastEv = ev;
    if(!raf) raf = requestAnimationFrame(function(){ paint(lastEv); });
  }

  function boot(){
    ensure();
    document.addEventListener("pointermove", move, {capture:true, passive:true});
    document.addEventListener("mouseleave", hide, {capture:true, passive:true});
    window.addEventListener("blur", hide, {passive:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
