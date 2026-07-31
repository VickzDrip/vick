(function(){
  "use strict";

  var stats = {
    version:"0.941",
    drawCalls:0,
    fallbackCalls:0,
    normalCalls:0,
    hollowCalls:0,
    footprintCalls:0,
    lastMode:null
  };

  function styleModel(){
    return window.DVL_CANDLE_RENDER_STYLE_MODEL || null;
  }

  function geometryModel(){
    return window.DVL_CANDLE_GEOMETRY_MODEL || null;
  }

  function buildGeometry(payload){
    payload = payload || {};
    var gm = geometryModel();

    var rc = {
      index:payload.index,
      idx:payload.index,
      time:payload.candle && (payload.candle.time || payload.candle.t) || 0,
      candle:payload.candle,
      open:Number(payload.candle && (payload.candle.open ?? payload.candle.o)),
      high:Number(payload.candle && (payload.candle.high ?? payload.candle.h)),
      low:Number(payload.candle && (payload.candle.low ?? payload.candle.l)),
      close:Number(payload.candle && (payload.candle.close ?? payload.candle.c)),
      volume:Number(payload.candle && (payload.candle.volume ?? payload.candle.v ?? 0)),
      direction:payload.up ? "up" : "down",

      x:Number(payload.cx),
      y:Number(payload.yc),
      openY:Number(payload.yo),
      closeY:Number(payload.yc),
      highY:Number(payload.y(payload.candle.high)),
      lowY:Number(payload.y(payload.candle.low)),
      wickHighY:Number(payload.y(payload.candle.high)),
      wickLowY:Number(payload.y(payload.candle.low)),
      bodyTopY:Number(payload.topv),
      bodyBottomY:Number(payload.bottom),
      bodyH:Number(payload.bodyH),

      width:Number(payload.candleW),
      bodyW:Number(payload.candleW),
      halfBodyW:Number(payload.candleW) / 2,
      hitW:Number(payload.candleW),
      halfHitW:Number(payload.candleW) / 2,
      wickW:1,
      step:Number(payload.candleW) / 0.56,
      legacyCandleW:Number(payload.candleW),
      legacyWidthPreserved:true
    };

    try{
      if(gm && typeof gm.geometryFromRenderCandle === "function"){
        var g = gm.geometryFromRenderCandle(rc, { metrics:rc });
        if(g) return g;
      }
    }catch(_){}

    return {
      version:"0.918-fallback",
      renderCandle:rc,
      props:{
        visualNeutral:true,
        body:{ fill:true, border:false, borderWidth:1, radius:0, opacity:1 },
        wick:{ visible:true, width:1.2, opacity:1 },
        premium:{ glow:false }
      },
      body:{
        left:Number(payload.cx)-Number(payload.candleW)/2,
        right:Number(payload.cx)+Number(payload.candleW)/2,
        top:Number(payload.topv),
        bottom:Number(payload.topv)+Number(payload.bodyH),
        x:Number(payload.cx)-Number(payload.candleW)/2,
        y:Number(payload.topv),
        w:Number(payload.candleW),
        h:Number(payload.bodyH)
      },
      wick:{
        x:Number(payload.cx),
        top:Number(payload.y(payload.candle.high)),
        bottom:Number(payload.y(payload.candle.low)),
        y1:Number(payload.y(payload.candle.high)),
        y2:Number(payload.y(payload.candle.low)),
        width:1.2,
        visible:true
      }
    };
  }

  function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke){
    r = Math.max(0, Math.min(Number(r)||0, Math.min(w, h) / 2));
    if(!r){
      if(fill) ctx.fillRect(x,y,w,h);
      if(stroke) ctx.strokeRect(x,y,w,h);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  
  function snapLineX(x, lineWidth){
    lineWidth = Math.max(1, Number(lineWidth) || 1);
    return (Math.round(lineWidth) % 2 === 1) ? (Math.round(Number(x)) + .5) : Math.round(Number(x));
  }

  function snapRect(left, top, width, height){
    left = Number(left); top = Number(top); width = Number(width); height = Number(height);
    var x = Math.round(left);
    var y = Math.round(top);
    var w = Math.max(1, Math.round(width));
    var h = Math.max(1, Math.round(height));
    return { x:x, y:y, w:w, h:h, left:x, top:y, right:x+w, bottom:y+h };
  }

  function useLegacyAnchor(payload, g){
    try{
      var mode = String(payload && payload.candleMode || "normal").toLowerCase();
      var props = g && g.props || {};
      return props.visualNeutral === true && mode !== "footprint";
    }catch(_){ return false; }
  }

function drawWick(ctx, g, payload, color){
    var wick = g.wick || {};
    var props = g.props || {};
    var wickProps = props.wick || {};
    if(wick.visible === false || wickProps.visible === false) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = Number.isFinite(Number(wickProps.opacity)) ? Number(wickProps.opacity) : 1;
    ctx.lineWidth = Math.max(1, Number(wick.width || wickProps.width || 1.2));
    ctx.lineCap = wickProps.roundCap ? "round" : "butt";

    var wx = wick.x, wy1 = (wick.y1 ?? wick.top), wy2 = (wick.y2 ?? wick.bottom);

    // DVL Beta 0.921 — in normal/hollow keep legacy anchors to avoid the
    // feeling that candles are being rendered inside a new invisible block.
    if(useLegacyAnchor(payload, g)){
      wx = snapLineX(payload.cx, ctx.lineWidth);
      wy1 = Math.round(Number(payload.y(payload.candle.high)));
      wy2 = Math.round(Number(payload.y(payload.candle.low)));
    }else{
      wx = snapLineX(wx, ctx.lineWidth);
      wy1 = Math.round(Number(wy1));
      wy2 = Math.round(Number(wy2));
    }

    ctx.beginPath();
    ctx.moveTo(wx, wy1);
    ctx.lineTo(wx, wy2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBody(ctx, g, payload, color){
    var body = g.body || {};
    var props = g.props || {};
    var bodyProps = props.body || {};
    var mode = payload.candleMode;
    var left = Number(body.left ?? body.x);
    var top = Number(body.top ?? body.y);
    var w = Number(body.w ?? (body.right - body.left) ?? payload.candleW);
    var h = Math.max(Number(bodyProps.minHeight || 1.5), Number(body.h ?? (body.bottom - body.top) ?? payload.bodyH));

    // DVL Beta 0.921 — anchor normal/hollow body directly to legacy payload pixels.
    if(useLegacyAnchor(payload, g)){
      var rect = snapRect(Number(payload.cx) - Number(payload.candleW) / 2, Number(payload.topv), Number(payload.candleW), Math.max(Number(bodyProps.minHeight || 1.5), Number(payload.bodyH)));
      left = rect.x;
      top = rect.y;
      w = rect.w;
      h = rect.h;
    }else{
      var rect2 = snapRect(left, top, w, h);
      left = rect2.x;
      top = rect2.y;
      w = rect2.w;
      h = rect2.h;
    }

    ctx.save();
    ctx.globalAlpha = Number.isFinite(Number(bodyProps.opacity)) ? Number(bodyProps.opacity) : 1;

    if(mode === "hollow"){
      /* Hollow p/ AMBOS os lados (compra e venda): corpo vazio + borda direcional */
      ctx.fillStyle = "rgba(2,8,6,.92)";
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, Number(bodyProps.borderWidth || 1));
      drawRoundedRect(ctx, left, top, w, Math.max(1, h), Number(bodyProps.radius || 0), true, true);
    }else if(mode === "footprint"){
      var fp = window._dvlFpCache && window._dvlFpCache.get(payload.candle.time);
      var buyRatio = (fp && fp.total > 0) ? Math.max(.05, Math.min(.95, fp.b / fp.total)) : (payload.up ? .62 : .38);
      var buyW = w * buyRatio;
      var sellW = w - buyW;
      ctx.fillStyle = hexToRgba(payload.candleBearColor, .72);
      ctx.fillRect(left, top, sellW, h);
      ctx.fillStyle = hexToRgba(payload.candleBullColor, .72);
      ctx.fillRect(left + sellW, top, buyW, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, Number(bodyProps.borderWidth || 1));
      ctx.strokeRect(left, top, w, h);
      if(h > 9 && w > 3.5){
        ctx.strokeStyle = "rgba(2,8,6,.55)";
        ctx.lineWidth = .65;
        ctx.beginPath();
        ctx.moveTo(left, top + h * .33);
        ctx.lineTo(left + w, top + h * .33);
        ctx.moveTo(left, top + h * .66);
        ctx.lineTo(left + w, top + h * .66);
        ctx.stroke();
      }
    }else{
      ctx.fillStyle = color;
      if(bodyProps.border){
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, Number(bodyProps.borderWidth || 1));
      }
      drawRoundedRect(ctx, left, top, w, h, Number(bodyProps.radius || 0), true, !!bodyProps.border);
    }

    ctx.restore();
  }

  function drawCandle(ctx, payload){
    payload = payload || {};
    if(!ctx || !payload.candle) return false;

    var g = null;
    try{ g = buildGeometry(payload); }catch(_){}
    if(!g){
      stats.fallbackCalls++;
      return false;
    }

    var sm = styleModel();
    var props = g.props || {};
    var neutral = props.visualNeutral !== false;
    var colors = null;

    try{
      if(sm && typeof sm.colorsFor === "function"){
        colors = sm.colorsFor(payload.candle, sm.getStyle ? sm.getStyle() : null);
      }
    }catch(_){}

    var color = neutral
      ? payload.col
      : (colors && colors.body ? colors.body : payload.col);
    var wickColor = neutral
      ? payload.col
      : (colors && colors.wick ? colors.wick : color);

    ctx.strokeStyle = wickColor;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.2;

    try{
      drawWick(ctx, g, payload, wickColor);
      drawBody(ctx, g, payload, color);
      stats.drawCalls++;
      stats.lastMode = payload.candleMode || "normal";
      if(payload.candleMode === "hollow") stats.hollowCalls++;
      else if(payload.candleMode === "footprint") stats.footprintCalls++;
      else stats.normalCalls++;
      return true;
    }catch(_){
      stats.fallbackCalls++;
      return false;
    }
  }

  function audit(){
    var ok = false;
    var gm = geometryModel();
    var sm = styleModel();
    try{
      ok = !!(typeof drawCandle === "function" && gm && sm);
    }catch(_){}

    return {
      version:"0.941",
      available:true,
      connectedToRuntime:true,
      geometryModelAvailable:!!gm,
      styleModelAvailable:!!sm,
      drawCalls:stats.drawCalls,
      fallbackCalls:stats.fallbackCalls,
      normalCalls:stats.normalCalls,
      hollowCalls:stats.hollowCalls,
      footprintCalls:stats.footprintCalls,
      lastMode:stats.lastMode,
      legacyFallbackPreserved:true,
      pass:!!ok
    };
  }

  window.DVL_CANDLE_RENDER_BRIDGE = {
    version:"0.941",
    drawCandle:drawCandle,
    buildGeometry:buildGeometry,
    stats:function(){ return Object.assign({}, stats); },
    audit:audit
  };
  window.DVL_CANDLE_RENDER_BRIDGE_AUDIT = audit;

  var oldAudit = window.DVL_TOOL_PIPELINE_AUDIT;
  window.DVL_TOOL_PIPELINE_AUDIT = function(){
    var base = {};
    try{ base = typeof oldAudit === "function" ? oldAudit() : {}; }catch(e){ base = { pass:false, error:String(e && e.message || e) }; }
    var rb = audit();
    base.candleRenderBridge = rb;
    base.candleRenderBridgeAvailable = !!rb.pass;
    base.pass = !!(base.pass !== false && rb.pass);
    return base;
  };
})();
