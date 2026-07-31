(function(){
  "use strict";
  if(window.DVL_SCALE_LAYER_1522) return;
  window.DVL_SCALE_LAYER_1522 = true;

  var cfg = window.DVL_SCALE_LAYER_CFG = Object.assign({
    w: 80,
    shift: 0,
    font: "9.2px system-ui",
    color: "rgba(165,170,168,.72)"
  }, window.DVL_SCALE_LAYER_CFG || {});

  var nativeFillText = CanvasRenderingContext2D.prototype.fillText;
  var pending = [];
  var raf = 0;

  function isPriceText(v){
    return /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(String(v || "").trim());
  }

  function ensureLayer(canvas){
    var wrap = document.getElementById("chartWrap");
    if(!wrap || !canvas) return null;

    var layer = document.getElementById("dvlScaleLayer1522");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlScaleLayer1522";
      layer.style.position = "absolute";
      layer.style.inset = "0";
      layer.style.overflow = "hidden";
      layer.style.pointerEvents = "none";
      layer.style.zIndex = "80";
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
      var item = pending[i];
      if(Number.isFinite(item.y)) map[Math.round(item.y)] = item.text;
    }
    pending = [];

    var w = Number(cfg.w || 80);
    var left = (canvas.offsetLeft || 0) + (canvas.clientWidth || 0) - w + Number(cfg.shift || 0);
    var top = canvas.offsetTop || 0;
    var html = "";

    Object.keys(map).sort(function(a,b){ return Number(a) - Number(b); }).forEach(function(y){
      html += '<div style="position:absolute;left:' + Math.round(left) + 'px;top:' + Math.round(top + Number(y)) + 'px;width:' + w + 'px;height:14px;line-height:14px;transform:translateY(-50%);font:' + cfg.font + ';color:' + cfg.color + ';text-align:center;white-space:nowrap;">' + map[y] + '</div>';
    });

    layer.innerHTML = html;
  }

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y){
    try{
      var canvas = this && this.canvas;
      var cw = canvas ? canvas.clientWidth || 0 : 0;
      var nx = Number(x);

      if(
        canvas &&
        canvas.id === "chart" &&
        cw > 200 &&
        this.textAlign === "left" &&
        String(this.font || "").indexOf("9.2px") !== -1 &&
        nx > cw - 150 &&
        nx < cw &&
        isPriceText(text)
      ){
        pending.push({ text:String(text), y:Number(y) });
        if(!raf) raf = requestAnimationFrame(flush);
        return;
      }
    }catch(_){}

    return nativeFillText.apply(this, arguments);
  };
})();
