(function(){
  "use strict";
  if(window.__DVL_BETA_1542_CROSSHAIR_RIGHT_PRICE_TAG__) return;
  window.__DVL_BETA_1542_CROSSHAIR_RIGHT_PRICE_TAG__ = true;

  var raf = 0;
  var lastEv = null;

  function q(id){ return document.getElementById(id); }
  function wrap(){ return q("chartWrap") || document.querySelector(".canvasWrap") || document.querySelector(".chartWrap"); }
  function canvas(){ var w=wrap(); return q("chart") || (w ? w.querySelector("canvas") : null); }
  function num(v){ v=Number(v); return Number.isFinite(v) ? v : null; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function fmt(v){
    try{ if(typeof fmtPrice === "function") return fmtPrice(v); }catch(_){}
    try{ if(typeof priceFmt === "function") return priceFmt(v); }catch(_){}
    return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function ensure(){
    var st = q("DVL_BETA_1542_CROSSHAIR_TAG_STYLE");
    if(!st){
      st = document.createElement("style");
      st.id = "DVL_BETA_1542_CROSSHAIR_TAG_STYLE";
      st.textContent = [
        "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}",
        "#dvlCross1542PriceTag{position:fixed;z-index:2147483647;pointer-events:none;display:none;width:75px;height:22px;box-sizing:border-box;padding:2px 4px;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.35)}"
      ].join("\n");
      document.head.appendChild(st);
    }

    var tag = q("dvlCross1542PriceTag");
    if(!tag){
      tag = document.createElement("div");
      tag.id = "dvlCross1542PriceTag";
      document.body.appendChild(tag);
    }

    try{
      var w = wrap(), c = canvas();
      if(w) w.style.cursor = "crosshair";
      if(c) c.style.cursor = "crosshair";
    }catch(_){}

    return tag;
  }

  function priceFromCfg(cfg, y){
    var y0=num(cfg.y0), y1=num(cfg.y1), mn=num(cfg.min), mx=num(cfg.max);
    if(y0!==null && y1!==null && mn!==null && mx!==null && y1!==y0){
      return mx - ((y - y0) / Math.max(1, y1 - y0)) * (mx - mn);
    }
    try{
      if(window.DVL_PRICE_SCALE_MODEL && typeof window.DVL_PRICE_SCALE_MODEL.yToPrice === "function"){
        var p = Number(window.DVL_PRICE_SCALE_MODEL.yToPrice(y));
        if(Number.isFinite(p)) return p;
      }
    }catch(_){}
    return null;
  }

  function paint(ev){
    raf = 0;

    var w = wrap();
    if(!w || !ev) return;

    var r = w.getBoundingClientRect();
    var inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    var tag = ensure();

    if(!inside){
      tag.style.display = "none";
      return;
    }

    try{ window.__dvlDesktopHoverCrosshair = true; }catch(_){}
    try{ if(typeof setCrosshairFromClient === "function") setCrosshairFromClient(ev.clientX, ev.clientY); }catch(_){}
    try{ if(window.DVL_DOM_CROSSHAIR_1205 && typeof window.DVL_DOM_CROSSHAIR_1205.scheduleFromState === "function") window.DVL_DOM_CROSSHAIR_1205.scheduleFromState(); }catch(_){}

    var cfg = window.__dvlLastCrossCfg || {};
    var x1 = num(cfg.x1);
    var y0 = num(cfg.y0), y1 = num(cfg.y1);

    if(x1 === null) x1 = Math.max(0, r.width - 80);
    if(y0 === null) y0 = 0;
    if(y1 === null) y1 = Math.max(0, r.height - 24);

    var localY = clamp(ev.clientY - r.top, y0, y1);
    var price = priceFromCfg(cfg, localY);

    if(price === null){
      tag.style.display = "none";
      return;
    }

    tag.textContent = fmt(price);
    tag.style.left = Math.round(clamp(r.left + x1 + 3, r.left, r.right - 77)) + "px";
    tag.style.top = Math.round(clamp(r.top + localY - 11, r.top + 2, r.bottom - 24)) + "px";
    tag.style.display = "block";
  }

  function move(ev){
    lastEv = ev;
    if(!raf) raf = requestAnimationFrame(function(){ paint(lastEv); });
  }

  function boot(){
    ensure();
    document.addEventListener("pointermove", move, {capture:true, passive:true});
    document.addEventListener("mouseleave", function(){ var t=q("dvlCross1542PriceTag"); if(t)t.style.display="none"; }, {capture:true, passive:true});
    window.addEventListener("blur", function(){ var t=q("dvlCross1542PriceTag"); if(t)t.style.display="none"; }, {passive:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
