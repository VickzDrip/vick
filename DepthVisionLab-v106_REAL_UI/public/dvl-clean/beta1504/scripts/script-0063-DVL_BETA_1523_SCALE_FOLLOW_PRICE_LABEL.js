(function(){
  "use strict";
  if(window.DVL_SCALE_FOLLOW_PRICE_LABEL_1523) return;
  window.DVL_SCALE_FOLLOW_PRICE_LABEL_1523 = true;

  var cfg = window.DVL_SCALE_LAYER_CFG = Object.assign({
    w: 80,
    shift: 0,
    font: "9.2px system-ui",
    color: "rgba(165,170,168,.72)"
  }, window.DVL_SCALE_LAYER_CFG || {});

  var nativeFillText = CanvasRenderingContext2D.prototype.fillText;
  var pending = [];
  var raf = 0;
  var labelCenterX = null;

  function isPrice(v){
    return /^-?\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(String(v || "").trim());
  }

  function ensureLayer(canvas){
    var wrap = document.getElementById("chartWrap");
    if(!wrap || !canvas) return null;

    var layer = document.getElementById("dvlScaleLayer1523");
    if(!layer){
      layer = document.createElement("div");
      layer.id = "dvlScaleLayer1523";
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
    pending.forEach(function(item){
      map[Math.round(item.y)] = item.text;
    });
    pending = [];

    var scaleW = Number(cfg.w || 80);
    var fallbackCenter = (canvas.offsetLeft || 0) + (canvas.clientWidth || 0) - scaleW / 2;
    var center = Number.isFinite(labelCenterX) ? (canvas.offsetLeft || 0) + labelCenterX : fallbackCenter;
    var left = Math.round(center - scaleW / 2 + Number(cfg.shift || 0));
    var top = canvas.offsetTop || 0;

    var html = "";
    Object.keys(map).sort(function(a,b){ return Number(a) - Number(b); }).forEach(function(y){
      html += '<div style="position:absolute;left:' + left + 'px;top:' + Math.round(top + Number(y)) + 'px;width:' + scaleW + 'px;height:14px;line-height:14px;transform:translateY(-50%);font:' + cfg.font + ';color:' + cfg.color + ';text-align:center;white-space:nowrap;">' + map[y] + '</div>';
    });

    layer.innerHTML = html;
  }

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y){
    try{
      var canvas = this && this.canvas;
      var cw = canvas ? canvas.clientWidth || 0 : 0;
      var nx = Number(x);
      var font = String(this.font || "");

      if(canvas && canvas.id === "chart" && cw > 200 && isPrice(text) && nx > cw - 150 && nx < cw){
        if(this.textAlign === "center" && font.indexOf("900") !== -1){
          labelCenterX = nx;
        }

        if(this.textAlign === "left" && font.indexOf("9.2px") !== -1){
          pending.push({ text:String(text), y:Number(y) });
          if(!raf) raf = requestAnimationFrame(flush);
          return;
        }
      }
    }catch(_){}

    return nativeFillText.apply(this, arguments);
  };
})();
