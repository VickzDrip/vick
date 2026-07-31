(function(){
  "use strict";

  if(window.DVL_INDEPENDENT_PRICE_SCALE_1521) return;
  window.DVL_INDEPENDENT_PRICE_SCALE_1521 = true;

  var cfg = window.DVL_PRICE_SCALE_LAYER_CFG = Object.assign({
    scaleW: 80,
    font: "9.2px system-ui",
    color: "rgba(165,170,168,.72)",
    textShiftPx: 0
  }, window.DVL_PRICE_SCALE_LAYER_CFG || {});

  var nativeFillText = CanvasRenderingContext2D.prototype.fillText;
  var queued = false;
  var pending = [];

  function isPriceText(text){
    return /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(String(text || "").trim());
  }

  function ensureLayer(canvas){
    var wrap = document.getElementById("chartWrap");
    if(!wrap || !canvas) return null;

    var layer = document.getElementById("dvlIndependentPriceScale1521");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlIndependentPriceScale1521";
      layer.style.position = "absolute";
      layer.style.inset = "0";
      layer.style.pointerEvents = "none";
      layer.style.zIndex = "80";
      layer.style.overflow = "hidden";
      layer.style.font = cfg.font;
      layer.style.color = cfg.color;
      layer.style.textAlign = "center";
      wrap.appendChild(layer);
    }
    return layer;
  }

  function render(){
    queued = false;
    var list = pending;
    pending = [];

    var canvas = document.getElementById("chart");
    var layer = ensureLayer(canvas);
    if(!canvas || !layer || !list.length) return;

    var seen = {};
    var clean = [];
    for(var i=0;i<list.length;i++){
      var item = list[i];
      var key = Math.round(item.y);
      seen[key] = item;
    }
    Object.keys(seen).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(k){
      clean.push(seen[k]);
    });

    var scaleW = Number(cfg.scaleW || 80);
    var canvasLeft = canvas.offsetLeft || 0;
    var canvasTop = canvas.offsetTop || 0;
    var cssW = canvas.clientWidth || 0;
    var scaleLeft = canvasLeft + cssW - scaleW;
    var centerX = scaleLeft + scaleW / 2 + Number(cfg.textShiftPx || 0);

    layer.innerHTML = "";
    for(var j=0;j<clean.length;j++){
      var it = clean[j];
      var el = document.createElement("div");
      el.textContent = it.text;
      el.style.position = "absolute";
      el.style.left = Math.round(centerX - scaleW / 2) + "px";
      el.style.top = Math.round(canvasTop + it.y) + "px";
      el.style.width = scaleW + "px";
      el.style.height = "14px";
      el.style.lineHeight = "14px";
      el.style.transform = "translateY(-50%)";
      el.style.font = cfg.font;
      el.style.color = cfg.color;
      el.style.whiteSpace = "nowrap";
      el.style.textAlign = "center";
      layer.appendChild(el);
    }
  }

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y){
    try{
      var canvas = this && this.canvas;
      var cssW = canvas ? (canvas.clientWidth || 0) : 0;
      var nx = Number(x);
      var ny = Number(y);

      if(
        canvas &&
        canvas.id === "chart" &&
        cssW > 200 &&
        Number.isFinite(nx) &&
        Number.isFinite(ny) &&
        nx > cssW - 150 &&
        nx < cssW &&
        this.textAlign === "left" &&
        String(this.font || "").indexOf("9.2px") !== -1 &&
        isPriceText(text)
      ){
        pending.push({ text:String(text), y:ny });
        if(!queued){
          queued = true;
          requestAnimationFrame(render);
        }
        return;
      }
    }catch(_){}

    return nativeFillText.apply(this, arguments);
  };
})();
