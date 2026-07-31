(function(){
  "use strict";
  if(window.DVL_SCALE_LAYER_STRONG_1524) return;
  window.DVL_SCALE_LAYER_STRONG_1524 = true;

  var cfg = window.DVL_SCALE_LAYER_CFG = Object.assign({
    w: 80,
    shift: 0,
    font: "9.2px system-ui",
    color: "rgba(165,170,168,.72)"
  }, window.DVL_SCALE_LAYER_CFG || {});

  var nativeFillText = CanvasRenderingContext2D.prototype.fillText;
  var pending = [];
  var raf = 0;

  function isPrice(v){
    return /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(String(v || "").trim());
  }

  function isGrayScaleText(ctx){
    var font = String(ctx.font || "");
    var fill = String(ctx.fillStyle || "");
    return font.indexOf("9.2px") !== -1 || fill.indexOf("165") !== -1 || fill.indexOf("170") !== -1;
  }

  function ensureLayer(canvas){
    var wrap = document.getElementById("chartWrap");
    if(!wrap || !canvas) return null;

    var layer = document.getElementById("dvlScaleLayer1524");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlScaleLayer1524";
      layer.style.position = "absolute";
      layer.style.inset = "0";
      layer.style.overflow = "hidden";
      layer.style.pointerEvents = "none";
      layer.style.zIndex = "90";
      wrap.appendChild(layer);
    }
    return layer;
  }

  function flush(){
    raf = 0;

    var canvas = document.getElementById("chart");
    var layer = ensureLayer(canvas);
    if(!canvas || !layer || !pending.length) return;

    var map = {};
    for(var i=0;i<pending.length;i++){
      var it = pending[i];
      map[Math.round(it.y)] = it.text;
    }
    pending = [];

    var scaleW = Number(cfg.w || 80);
    var left = Math.round((canvas.offsetLeft || 0) + (canvas.clientWidth || 0) - scaleW + Number(cfg.shift || 0));
    var top = canvas.offsetTop || 0;

    layer.innerHTML = "";
    Object.keys(map).sort(function(a,b){ return Number(a) - Number(b); }).forEach(function(y){
      var el = document.createElement("div");
      el.textContent = map[y];
      el.style.position = "absolute";
      el.style.left = left + "px";
      el.style.top = Math.round(top + Number(y)) + "px";
      el.style.width = scaleW + "px";
      el.style.height = "14px";
      el.style.lineHeight = "14px";
      el.style.transform = "translateY(-50%)";
      el.style.font = cfg.font;
      el.style.color = cfg.color;
      el.style.textAlign = "center";
      el.style.whiteSpace = "nowrap";
      layer.appendChild(el);
    });
  }

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y){
    try{
      var canvas = this && this.canvas;
      var cw = canvas ? canvas.clientWidth || 0 : 0;
      var ch = canvas ? canvas.clientHeight || 0 : 0;
      var nx = Number(x);
      var ny = Number(y);

      if(
        canvas &&
        canvas.id === "chart" &&
        cw > 200 &&
        ch > 200 &&
        Number.isFinite(nx) &&
        Number.isFinite(ny) &&
        nx > cw - 160 &&
        nx < cw &&
        ny > 20 &&
        ny < ch - 20 &&
        isPrice(text) &&
        isGrayScaleText(this)
      ){
        pending.push({ text:String(text), y:ny });
        if(!raf) raf = requestAnimationFrame(flush);
        return;
      }
    }catch(_){}

    return nativeFillText.apply(this, arguments);
  };
})();
