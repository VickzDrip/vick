(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function(){
    const wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
    if(!wrap) return;

    let down = null;

    function drawingModeOn(){
      try{
        return typeof dvlDrawingModeActive === "function" ? dvlDrawingModeActive() : !!(window.S && (S.drawingToolActive || S._posDraft || S.tool));
      }catch(_){
        return false;
      }
    }

    wrap.addEventListener("pointerdown", function(ev){
      down = { x:ev.clientX, y:ev.clientY, visible: !!(window.crosshair?.visible || crosshair?.visible) };
    }, true);

    wrap.addEventListener("pointerup", function(ev){
      if(!down) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      if(down.visible && moved < 5 && !drawingModeOn()){
        setTimeout(function(){
          if(typeof hideCrosshair === "function") hideCrosshair();
        }, 0);
      }
      down = null;
    }, true);
  });
})();
