(function(){
  "use strict";

  var profiles = {
    normal:{
      mode:"normal",
      label:"TV-like default",
      minViewCandles:6,
      bodyRatio:0.82,
      minBodyW:2.2,
      maxBodyW:118,
      note:"Modo padrão: zoom máximo travado em 6 candles inteiros para fluidez TV-like sem tilt."
    },
    hollow:{
      mode:"hollow",
      label:"TV-like hollow",
      minViewCandles:6,
      bodyRatio:0.82,
      minBodyW:2.2,
      maxBodyW:118,
      note:"Hollow usa o mesmo zoom máximo inteiro do modo padrão."
    },
    footprint:{
      mode:"footprint",
      label:"Wide footprint detail",
      minViewCandles:3,
      bodyRatio:0.88,
      minBodyW:4,
      maxBodyW:150,
      note:"Footprint preserva zoom/largura ampla para leitura interna buy/sell."
    }
  };

  function normalizeMode(mode){
    mode = String(mode || "normal").toLowerCase();
    if(mode === "solid" || mode === "candles" || mode === "default") return "normal";
    if(mode === "hollow") return "hollow";
    if(mode === "footprint") return "footprint";
    return "normal";
  }

  function getProfile(mode){
    return profiles[normalizeMode(mode)] || profiles.normal;
  }

  function minViewCandles(mode){
    var p = getProfile(mode);
    return Number(p.minViewCandles) || 5.5;
  }

  function candleWidth(input){
    input = input || {};
    var p = getProfile(input.mode);
    var slotW = Number(input.slotW);
    var legacyW = Number(input.legacyW);

    if(!Number.isFinite(slotW) || slotW <= 0){
      return Number.isFinite(legacyW) && legacyW > 0 ? legacyW : 2.2;
    }

    var w = slotW * (Number(p.bodyRatio) || .74);
    w = Math.max(Number(p.minBodyW) || 1, Math.min(Number(p.maxBodyW) || 110, w));

    // Footprint keeps enough width for internal details even when the slot is tight.
    if(normalizeMode(input.mode) === "footprint"){
      w = Math.max(w, Number.isFinite(legacyW) ? legacyW : 0);
    }

    return w;
  }

  function applyProfileForCurrentMode(){
    try{
      if(typeof chartViewCount === "number" && typeof clamp === "function"){
        var min = minViewCandles(typeof candleMode !== "undefined" ? candleMode : "normal");
        if(chartViewCount < min) chartViewCount = min;
      }
    }catch(_){}
  }

  function audit(){
    var mode = "normal";
    try{ mode = typeof candleMode !== "undefined" ? candleMode : "normal"; }catch(_){}
    var normalW = candleWidth({ mode:"normal", slotW:100, legacyW:28 });
    var hollowW = candleWidth({ mode:"hollow", slotW:100, legacyW:28 });
    var footprintW = candleWidth({ mode:"footprint", slotW:100, legacyW:28 });

    return {
      version:"0.941",
      available:true,
      currentMode:normalizeMode(mode),
      normalMinView:minViewCandles("normal"),
      hollowMinView:minViewCandles("hollow"),
      footprintMinView:minViewCandles("footprint"),
      normalWidthAt100:normalW,
      hollowWidthAt100:hollowW,
      footprintWidthAt100:footprintW,
      defaultNotFootprint:normalW < footprintW || minViewCandles("normal") > minViewCandles("footprint"),
      footprintWideReserved:true,
      connectedToRuntime:true,
      pass:!!(minViewCandles("normal") > minViewCandles("footprint") && footprintW >= normalW)
    };
  }

  window.DVL_CANDLE_ZOOM_PROFILE_MODEL = {
    version:"0.941",
    profiles:profiles,
    normalizeMode:normalizeMode,
    getProfile:getProfile,
    minViewCandles:minViewCandles,
    candleWidth:candleWidth,
    applyProfileForCurrentMode:applyProfileForCurrentMode,
    audit:audit
  };
  window.DVL_CANDLE_ZOOM_PROFILE_MODEL_AUDIT = audit;

  try{ applyProfileForCurrentMode(); }catch(_){}

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var zp = audit();
    base.candleZoomProfileModel = zp;
    base.candleZoomProfileModelAvailable = !!zp.pass;
    base.pass = !!(base.pass !== false && zp.pass);
    return base;
  };
})();
