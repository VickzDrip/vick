(function(){
  "use strict";
  if(window.__DVL_BETA_1540_NATIVE_CROSSHAIR_FORCE__) return;
  window.__DVL_BETA_1540_NATIVE_CROSSHAIR_FORCE__ = true;

  var raf = 0, lastEv = null;

  function byId(id){ return document.getElementById(id); }
  function wrap(){ return byId("chartWrap") || document.querySelector(".canvasWrap") || document.querySelector(".chartWrap"); }
  function canvas(){ var w = wrap(); return byId("chart") || (w ? w.querySelector("canvas") : null); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function finite(v){ return Number.isFinite(Number(v)); }

  function fmt(v){
    try{ if(typeof fmtPrice === "function") return fmtPrice(v); }catch(_){}
    try{ if(typeof priceFmt === "function") return priceFmt(v); }catch(_){}
    return Number(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  }

  function ensure(){
    var w = wrap();
    if(!w) return null;

    try{
      if(getComputedStyle(w).position === "static") w.style.position = "relative";
      w.style.cursor = "crosshair";
      var c = canvas();
      if(c) c.style.cursor = "crosshair";
    }catch(_){}

    var st = byId("DVL_BETA_1540_CROSSHAIR_STYLE");
    if(!st){
      st = document.createElement("style");
      st.id = "DVL_BETA_1540_CROSSHAIR_STYLE";
      st.textContent =
        "#chartWrap,#chartWrap canvas,#chart{cursor:crosshair!important}" +
        "#dvlCross1540{position:absolute;inset:0;z-index:9998;pointer-events:none;overflow:hidden;display:none}" +
        "#dvlCross1540 .v{position:absolute;top:0;width:1px;border-left:1px dotted rgba(0,230,138,.72)}" +
        "#dvlCross1540 .h{position:absolute;left:0;height:1px;border-top:1px dotted rgba(0,230,138,.72)}" +
        "#dvlCross1540 .d{position:absolute;width:5px;height:5px;margin:-2px 0 0 -2px;border-radius:50%;background:#00e68a}" +
        "#dvlCross1540 .p{position:absolute;width:75px;height:22px;box-sizing:border-box;padding:2px 4px;text-align:center;border-radius:3px;background:#00e68a;color:#03140d;font:900 11.5px/12px system-ui;box-shadow:0 0 0 1px rgba(0,0,0,.28)}";
      document.head.appendChild(st);
    }

    var root = byId("dvlCross1540");
    if(!root){
      root = document.createElement("div");
      root.id = "dvlCross1540";
      root.innerHTML = '<i class="v"></i><i class="h"></i><i class="d"></i><span class="p"></span>';
      w.appendChild(root);
    }

    return {
      root: root,
      v: root.children[0],
      h: root.children[1],
      d: root.children[2],
      p: root.children[3]
    };
  }

  function hide(){
    var e = byId("dvlCross1540");
    if(e) e.style.display = "none";
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

    var ui = ensure();
    if(!ui) return;

    var cfg = window.__dvlLastCrossCfg || {};
    var x0 = finite(cfg.x0) ? Number(cfg.x0) : 0;
    var x1 = finite(cfg.x1) ? Number(cfg.x1) : Math.max(0, r.width - 80);
    var y0 = finite(cfg.y0) ? Number(cfg.y0) : 0;
    var y1 = finite(cfg.y1) ? Number(cfg.y1) : Math.max(0, r.height - 22);

    var x = clamp(ev.clientX - r.left, x0, x1);
    var y = clamp(ev.clientY - r.top, y0, y1);

    ui.root.style.display = "block";
    ui.v.style.left = Math.round(x) + "px";
    ui.v.style.top = Math.round(y0) + "px";
    ui.v.style.height = Math.max(0, y1 - y0) + "px";

    ui.h.style.left = Math.round(x0) + "px";
    ui.h.style.top = Math.round(y) + "px";
    ui.h.style.width = Math.max(0, x1 - x0) + "px";

    ui.d.style.left = Math.round(x) + "px";
    ui.d.style.top = Math.round(y) + "px";

    if(finite(cfg.min) && finite(cfg.max) && y1 !== y0){
      var price = Number(cfg.max) - ((y - y0) / Math.max(1, y1 - y0)) * (Number(cfg.max) - Number(cfg.min));
      ui.p.textContent = fmt(price);
      ui.p.style.left = Math.round(clamp(x1 + 3, 0, r.width - 77)) + "px";
      ui.p.style.top = Math.round(clamp(y - 11, 2, r.height - 24)) + "px";
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
