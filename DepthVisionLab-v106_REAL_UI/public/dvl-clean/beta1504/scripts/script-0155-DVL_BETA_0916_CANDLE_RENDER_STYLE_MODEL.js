(function(){
  "use strict";

  var DEFAULTS = {
    version:"0.941",
    preset:"legacy-current",
    visualNeutral:true,

    colors:{
      up:"#10df77",
      down:"#ff4d5f",
      neutral:"#8a96a8",
      wickUp:"#10df77",
      wickDown:"#ff4d5f",
      wickNeutral:"#8a96a8",
      borderUp:"#10df77",
      borderDown:"#ff4d5f",
      borderNeutral:"#8a96a8"
    },

    body:{
      fill:true,
      border:false,
      borderWidth:1,
      minHeight:1,
      radius:0,
      opacity:1
    },

    wick:{
      visible:true,
      width:1,
      minWidth:1,
      opacity:1,
      roundCap:false
    },

    premium:{
      glow:false,
      glowBlur:0,
      glowOpacity:0,
      bodyGradient:false,
      wickGlow:false
    },

    density:{
      bodyRatio:0.68,
      maxBodyW:18,
      minBodyW:1,
      hitRatio:0.95,
      maxHitW:36,
      minHitW:6
    }
  };

  var presets = {
    "legacy-current": DEFAULTS,

    "premium-solid": Object.assign({}, DEFAULTS, {
      preset:"premium-solid",
      visualNeutral:false,
      body:Object.assign({}, DEFAULTS.body, { border:true, borderWidth:1, radius:2 }),
      wick:Object.assign({}, DEFAULTS.wick, { width:1.2 }),
      premium:Object.assign({}, DEFAULTS.premium, { glow:true, glowBlur:4, glowOpacity:0.16 })
    }),

    "clean-thin": Object.assign({}, DEFAULTS, {
      preset:"clean-thin",
      visualNeutral:false,
      density:Object.assign({}, DEFAULTS.density, { bodyRatio:0.56, maxBodyW:14 }),
      wick:Object.assign({}, DEFAULTS.wick, { width:1 })
    })
  };

  function deepClone(obj){
    try{ return JSON.parse(JSON.stringify(obj)); }catch(_){ return Object.assign({}, obj); }
  }

  function currentPresetName(){
    try{
      return localStorage.getItem("DVL_CANDLE_RENDER_STYLE_PRESET") || "legacy-current";
    }catch(_){
      return "legacy-current";
    }
  }

  function getStyle(name){
    name = name || currentPresetName();
    var preset = presets[name] || presets["legacy-current"];
    return deepClone(preset);
  }

  function setPreset(name){
    if(!presets[name]) name = "legacy-current";
    try{ localStorage.setItem("DVL_CANDLE_RENDER_STYLE_PRESET", name); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent("dvl-candle-render-style-change", { detail:{ preset:name, style:getStyle(name) } })); }catch(_){}
    try{ if(typeof drawSoon === "function") drawSoon(); }catch(_){}
    return getStyle(name);
  }

  function candleDirection(candle){
    if(!candle) return "neutral";
    var open = Number(candle.open ?? candle.o);
    var close = Number(candle.close ?? candle.c);
    if(!Number.isFinite(open) || !Number.isFinite(close)) return "neutral";
    if(close > open) return "up";
    if(close < open) return "down";
    return "neutral";
  }

  function colorsFor(candle, style){
    style = style || getStyle();
    var dir = candleDirection(candle);
    var c = style.colors || DEFAULTS.colors;

    if(dir === "up"){
      return { direction:dir, body:c.up, wick:c.wickUp || c.up, border:c.borderUp || c.up };
    }

    if(dir === "down"){
      return { direction:dir, body:c.down, wick:c.wickDown || c.down, border:c.borderDown || c.down };
    }

    return { direction:dir, body:c.neutral, wick:c.wickNeutral || c.neutral, border:c.borderNeutral || c.neutral };
  }

  function metricsOverride(metrics, style){
    style = style || getStyle();
    metrics = metrics || {};
    var d = style.density || DEFAULTS.density;
    var step = Number(metrics.step) || 8;

    // DVL Beta 0.919 — preserve legacy candle spacing/width.
    // The current approved visual passes candleW directly from drawPriceSection.
    // For the neutral/legacy preset we must NOT recalculate width from a default step,
    // otherwise zoomed candles become too thin and create large empty gaps.
    var incomingBodyW = Number(metrics.bodyW ?? metrics.width);
    var incomingHitW = Number(metrics.hitW);
    var legacyNeutral = style.visualNeutral === true || style.preset === "legacy-current";

    var bodyW = (legacyNeutral && Number.isFinite(incomingBodyW) && incomingBodyW > 0)
      ? incomingBodyW
      : Math.max(
          Number(d.minBodyW) || 1,
          Math.min(Number(d.maxBodyW) || 18, step * (Number(d.bodyRatio) || 0.68))
        );

    var hitW = (legacyNeutral && Number.isFinite(incomingHitW) && incomingHitW > 0)
      ? incomingHitW
      : (legacyNeutral
          ? Math.max(bodyW, Number(metrics.hitW) || bodyW)
          : Math.max(
              Number(d.minHitW) || 6,
              Math.min(Number(d.maxHitW) || 36, step * (Number(d.hitRatio) || 0.95))
            ));

    return Object.assign({}, metrics, {
      styleVersion:"0.919",
      legacyWidthPreserved:legacyNeutral,
      bodyW:bodyW,
      width:bodyW,
      halfBodyW:bodyW / 2,
      hitW:hitW,
      halfHitW:hitW / 2,
      wickW:Math.max(Number(style.wick && style.wick.minWidth) || 1, Number(style.wick && style.wick.width) || Number(metrics.wickW) || 1)
    });
  }

  function renderProps(candle, metrics, style){
    style = style || getStyle();
    var colors = colorsFor(candle, style);
    var m = metricsOverride(metrics, style);

    return {
      version:"0.941",
      preset:style.preset || "legacy-current",
      visualNeutral:!!style.visualNeutral,
      direction:colors.direction,
      colors:colors,
      body:Object.assign({}, style.body || DEFAULTS.body),
      wick:Object.assign({}, style.wick || DEFAULTS.wick),
      premium:Object.assign({}, style.premium || DEFAULTS.premium),
      metrics:m
    };
  }

  function listPresets(){
    return Object.keys(presets);
  }

  function audit(){
    var style = getStyle();
    var chart = window.DVL_CHART_MODEL || null;
    var bm = null;
    var sample = null;

    try{
      var cs = chart && chart.buildCoordinateSystem ? chart.buildCoordinateSystem() : null;
      if(cs && cs.candles && cs.candles.length){
        sample = cs.candles[Math.max(0, cs.candles.length - 1)];
        bm = chart.barMetrics ? chart.barMetrics(cs) : null;
      }
    }catch(_){}

    var props = null;
    try{ props = renderProps(sample, bm, style); }catch(_){}

    return {
      version:"0.941",
      available:true,
      preset:style.preset,
      visualNeutral:!!style.visualNeutral,
      presetCount:listPresets().length,
      hasColors:!!style.colors,
      hasBody:!!style.body,
      hasWick:!!style.wick,
      hasDensity:!!style.density,
      sampleAvailable:!!sample,
      renderPropsOk:!!props,
      connectedToRuntime:false,
      pass:!!(style.colors && style.body && style.wick && style.density && typeof renderProps === "function")
    };
  }

  window.DVL_CANDLE_RENDER_STYLE_MODEL = {
    version:"0.941",
    defaults:deepClone(DEFAULTS),
    presets:presets,
    listPresets:listPresets,
    getStyle:getStyle,
    setPreset:setPreset,
    candleDirection:candleDirection,
    colorsFor:colorsFor,
    metricsOverride:metricsOverride,
    renderProps:renderProps,
    audit:audit
  };
  window.DVL_CANDLE_RENDER_STYLE_MODEL_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var st = audit();
    base.candleRenderStyleModel = st;
    base.candleRenderStyleModelAvailable = !!st.pass;
    base.pass = !!(base.pass !== false && st.pass);
    return base;
  };
})();
