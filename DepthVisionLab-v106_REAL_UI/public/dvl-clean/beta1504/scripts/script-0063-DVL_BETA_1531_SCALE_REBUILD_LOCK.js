/* DVL_BETA_1531_SCALE_REBUILD_LOCK
   Rebuilds the lost 1.528 visual scale behavior: 80px scale gutter,
   centered scale prices, hidden unreadable top/bottom scale prices,
   arrows centered inside the scale area, and stable version badge.
*/
(function(){
  "use strict";
  var VERSION = "Beta 1.531";
  var SCALE_W = 80;
  var LABEL_W = 72;
  var SAFE_TOP = 58;
  var SAFE_BOTTOM = 58;

  function syncVersion(){
    try{
      window.DVL_APP_VERSION = VERSION;
      document.title = "DVL - " + VERSION;
      var ids = ["dvl1b_versionBadge", "versionBadge"];
      for(var i=0;i<ids.length;i++){
        var el = document.getElementById(ids[i]);
        if(el) el.textContent = VERSION.toUpperCase();
      }
    }catch(_){}
  }

  function injectCss(){
    if(document.getElementById("DVL_BETA_1531_SCALE_REBUILD_LOCK_CSS")) return;
    var st = document.createElement("style");
    st.id = "DVL_BETA_1531_SCALE_REBUILD_LOCK_CSS";
    st.textContent =
      ":root{--dvl-price-scale-w:80px!important;--dvl-price-label-w:72px!important;}" +
      "#chartWrap{position:relative!important;}" +
      "#chartWrap:after{content:'';position:absolute;top:0;bottom:0;right:80px;width:1px;background:rgba(135,170,160,.18);pointer-events:none;z-index:70;}" +
      "#chartWrap .dvlChartHistoryBar{right:13px!important;top:10px!important;width:54px!important;justify-content:center!important;align-items:center!important;gap:14px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;}" +
      "#chartWrap .dvlChartHistoryBtn{width:20px!important;height:20px!important;min-width:20px!important;}";
    document.head.appendChild(st);
  }

  syncVersion();
  injectCss();
  document.addEventListener("DOMContentLoaded", function(){ syncVersion(); injectCss(); });
  window.addEventListener("load", function(){
    syncVersion();
    injectCss();
    setTimeout(syncVersion, 80);
    setTimeout(syncVersion, 500);
  });

  try{
    var mo = new MutationObserver(syncVersion);
    mo.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
    setTimeout(function(){ try{mo.disconnect();}catch(_){} }, 10000);
  }catch(_){}

  if(!window.CanvasRenderingContext2D) return;
  var proto = CanvasRenderingContext2D.prototype;
  if(proto.__dvl1531ScaleLocked) return;
  proto.__dvl1531ScaleLocked = true;

  var nativeFillText = proto.fillText;

  function canvasMetrics(ctx){
    var c = ctx && ctx.canvas;
    if(!c) return {w:0,h:0};
    var dpr = window.devicePixelRatio || 1;
    var r = c.getBoundingClientRect ? c.getBoundingClientRect() : null;
    return {
      w: r && r.width ? r.width : c.width / dpr,
      h: r && r.height ? r.height : c.height / dpr
    };
  }

  function looksLikePrice(s){
    s = String(s || "").trim();
    return /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) || /^-?\d+\.\d{2,}$/.test(s);
  }

  function looksLikeScaleText(ctx){
    var f = String(ctx.font || "");
    var fill = String(ctx.fillStyle || "");
    var small = /(^|\s)(8|9|10)(\.\d+)?px/i.test(f);
    var notBold = !/(bold|700|800|900)/i.test(f);
    var grey = /165\s*,\s*170\s*,\s*168|a5aaa8/i.test(fill);
    return grey || (small && notBold);
  }

  proto.fillText = function(text, x, y, maxWidth){
    try{
      var m = canvasMetrics(this);
      var xx = Number(x);
      var yy = Number(y);
      if(m.w && isFinite(xx) && isFinite(yy) && xx > m.w - 130 && looksLikePrice(text) && looksLikeScaleText(this)){
        if(yy < SAFE_TOP || yy > m.h - SAFE_BOTTOM) return;
        this.save();
        this.font = "9.2px system-ui,-apple-system,Segoe UI,sans-serif";
        this.textAlign = "center";
        this.textBaseline = "middle";
        this.fillStyle = "rgba(165,170,168,.72)";
        var out = nativeFillText.call(this, String(text), Math.round(m.w - SCALE_W / 2) + 0.5, yy, LABEL_W);
        this.restore();
        return out;
      }
    }catch(_){}
    return nativeFillText.apply(this, arguments);
  };
})();
