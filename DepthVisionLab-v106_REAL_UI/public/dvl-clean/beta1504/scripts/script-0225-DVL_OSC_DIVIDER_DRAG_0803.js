(function(){
  'use strict';
  /* Beta 1.184 — robust pointer release for oscillator dividers. */

  var LS_KEY     = 'dvlDivRatios0803';
  /* Lowered from 60/250 — with 4+ oscillators active at once (OI, LSR, Net
     Short, Net Delta, ...) the old floors could add up to more than the
     screen has room for, cutting panels off. Smaller floors let the user
     drag everything flatter to fit it all; the auto-split logic in the
     main draw loop shrinks its own per-panel minimum the same way.
     MIN_OSC_PX can't go below 50 — DVLExhaustionRSI silently draws nothing
     under a 50px panel height (its own internal guard), so anything
     smaller would look like a blank/broken panel instead of just compact. */
  var MIN_OSC_PX = 50;
  var MIN_PRC_PX = 140;
  var SNAP_PX    = 14;

  function loadRatios(){ try{ return JSON.parse(localStorage.getItem(LS_KEY))||{}; }catch(_){ return {}; } }
  function saveRatios(r){ try{ localStorage.setItem(LS_KEY, JSON.stringify(r)); }catch(_){} }

  /* init globals from localStorage */
  var _stored = loadRatios();
  if(_stored.priceRatio)                       window.__dvlPriceRatio = _stored.priceRatio;
  if(_stored.oscRatios && _stored.oscRatios.length) window.__dvlOscRatios = _stored.oscRatios;

  /* override splitHeight to use __dvlPriceRatio */
  if(!window.DVLTestOscillator) window.DVLTestOscillator = {};
  var _origSplit = window.DVLTestOscillator.splitHeight;
  window.DVLTestOscillator.splitHeight = function(totalH){
    var ratio = window.__dvlPriceRatio;
    if(ratio) return Math.max(MIN_PRC_PX, totalH * ratio);
    if(typeof _origSplit === 'function') return _origSplit(totalH);
    return Math.max(MIN_PRC_PX, totalH * 0.62);
  };

  /* override drawDivider with visible drag handle */
  window.DVLTestOscillator.drawDivider = function(ctx, padL, padR, y, w){
    ctx.save();
    ctx.strokeStyle = 'rgba(16,223,119,0.32)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    /* grip ticks */
    var cx = padL + (w - padR - padL) / 2;
    ctx.strokeStyle = 'rgba(16,223,119,0.65)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for(var d = -8; d <= 8; d += 8){
      ctx.beginPath();
      ctx.moveTo(cx + d, y - 3);
      ctx.lineTo(cx + d, y + 3);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* drag state */
  var drag = { active:false, divIdx:-1, startY:0, startPriceH:0, startOscHs:[], lowerH:0, totalH:0, rectTop:0, pointerId:-1 };

  function getCanvas(){ return document.getElementById('chart'); }

  function clearCompetingChartGesture(pointerId){
    /* These bindings belong to the chart core. They are deliberately cleared
       here because its window-capture handler runs before the canvas divider. */
    try{ if(typeof clearCrossPressTimer === 'function') clearCrossPressTimer(); }catch(_){}
    try{ if(typeof chartPointers !== 'undefined' && chartPointers && chartPointers.delete) chartPointers.delete(pointerId); }catch(_){}
    try{ chartDragState = null; }catch(_){}
    try{ chartPinchState = null; }catch(_){}
    try{ crossDragState = null; }catch(_){}
    try{ if(typeof crosshair !== 'undefined' && crosshair) crosshair.active = false; }catch(_){}
    document.body.classList.remove('dvl-desktop-chart-dragging');
  }

  function stopDividerEvent(e){
    if(!e) return;
    try{ if(e.cancelable) e.preventDefault(); }catch(_){}
    try{ e.stopPropagation(); }catch(_){}
    try{ if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }catch(_){}
  }

  function persistRatios(){
    var r = loadRatios();
    if(window.__dvlPriceRatio !== undefined) r.priceRatio = window.__dvlPriceRatio;
    if(window.__dvlOscRatios && window.__dvlOscRatios.length) r.oscRatios = window.__dvlOscRatios.slice();
    saveRatios(r);
  }

  function finishDrag(e, forced){
    if(!drag.active) return false;
    if(!forced && e && drag.pointerId >= 0 && e.pointerId != null && e.pointerId !== drag.pointerId) return false;

    var canvas = getCanvas();
    var pid = drag.pointerId;
    drag.active = false;
    drag.divIdx = -1;
    drag.pointerId = -1;
    window.__dvlOscDividerDragging = false;
    clearCompetingChartGesture(pid);

    if(canvas){
      try{ if(pid >= 0 && canvas.hasPointerCapture && canvas.hasPointerCapture(pid)) canvas.releasePointerCapture(pid); }catch(_){}
      canvas.style.cursor = '';
      canvas.classList.remove('dvl-osc-divider-dragging');
    }
    document.body.classList.remove('dvl-osc-divider-dragging');
    persistRatios();
    try{ if(typeof window.DVLForceChartLayoutSync1209 === 'function') window.DVLForceChartLayoutSync1209(); }catch(_){}
    if(typeof window.drawSoon === 'function') window.drawSoon();
    return true;
  }

  function onDown(e){
    /* A second click is also an emergency release for a pointerup that a
       browser/overlay failed to deliver. It must not immediately start a
       second drag on the same click. */
    if(drag.active){
      stopDividerEvent(e);
      finishDrag(e, true);
      return;
    }

    var divYs = window.__dvlDividerYPositions;
    if(!divYs || !divYs.length) return;
    var canvas = getCanvas();
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var my = e.clientY - rect.top;
    for(var i = 0; i < divYs.length; i++){
      if(Math.abs(my - divYs[i]) <= SNAP_PX){
        drag.active     = true;
        drag.divIdx     = i;
        drag.startY     = my;
        drag.pointerId  = e.pointerId;
        drag.totalH     = rect.height;
        drag.rectTop    = rect.top;
        drag.startPriceH= divYs[0];
        drag.startOscHs = [];
        for(var j = 0; j < divYs.length; j++){
          drag.startOscHs.push((j+1 < divYs.length ? divYs[j+1] : rect.height) - divYs[j]);
        }
        drag.lowerH = rect.height - divYs[0];
        window.__dvlOscDividerDragging = true;
        clearCompetingChartGesture(e.pointerId);
        stopDividerEvent(e);
        try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
        canvas.style.cursor = 'ns-resize';
        canvas.classList.add('dvl-osc-divider-dragging');
        document.body.classList.add('dvl-osc-divider-dragging');
        return;
      }
    }
  }

  function onMove(e){
    if(!drag.active || e.pointerId !== drag.pointerId) return;

    /* Mouse button already released but pointerup was swallowed: stop now,
       before one more movement can keep resizing the panels. */
    if(e.pointerType === 'mouse' && e.buttons === 0){
      stopDividerEvent(e);
      finishDrag(e, true);
      return;
    }

    var canvas = getCanvas();
    if(!canvas){ finishDrag(e, true); return; }
    /* Beta 1.209 — pointerdown already captured the canvas rect. Reading
       getBoundingClientRect again at mouse polling rate forced reflow. */
    var my     = e.clientY - drag.rectTop;
    var delta  = my - drag.startY;
    stopDividerEvent(e);
    canvas.style.cursor = 'ns-resize';

    if(drag.divIdx === 0){
      var newPH = Math.max(MIN_PRC_PX, Math.min(drag.totalH - MIN_OSC_PX, drag.startPriceH + delta));
      window.__dvlPriceRatio = newPH / drag.totalH;
    } else {
      var a = drag.divIdx - 1, b = drag.divIdx;
      var hA = drag.startOscHs[a], hB = drag.startOscHs[b];
      var combined = hA + hB;
      var nA = Math.max(MIN_OSC_PX, Math.min(combined - MIN_OSC_PX, hA + delta));
      var nB = Math.max(MIN_OSC_PX, combined - nA);
      var hs = drag.startOscHs.slice();
      hs[a] = nA; hs[b] = nB;
      if(drag.lowerH > 0)
        window.__dvlOscRatios = hs.map(function(v){ return v / drag.lowerH; });
    }

    if(typeof window.drawSoon === 'function') window.drawSoon();
  }

  function onUp(e){
    if(!drag.active) return;
    if(e && drag.pointerId >= 0 && e.pointerId != null && e.pointerId !== drag.pointerId) return;
    stopDividerEvent(e);
    finishDrag(e, false);
  }

  var hoverRAF1209=0, hoverEvent1209=null;
  function onHoverWithRect1209(e, suppliedRect){
    if(drag.active) return false;
    var divYs = window.__dvlDividerYPositions;
    if(!divYs || !divYs.length) return false;
    var canvas = getCanvas();
    if(!canvas) return false;
    var rect = suppliedRect || (window.__dvlDesktopChartRectCache && window.__dvlDesktopChartRectCache.rect) || null;
    if(!rect) rect = canvas.getBoundingClientRect();
    var my = e.clientY - rect.top;
    var near = false;
    for(var i = 0; i < divYs.length; i++){
      if(Math.abs(my - divYs[i]) <= SNAP_PX){ near = true; break; }
    }
    if(canvas.__dvlDividerCursor1209 !== near){
      canvas.__dvlDividerCursor1209 = near;
      canvas.style.cursor = near ? 'ns-resize' : '';
    }
    return near;
  }
  function onHover1209(e){
    hoverEvent1209=e;
    if(hoverRAF1209) return;
    hoverRAF1209=requestAnimationFrame(function(){
      hoverRAF1209=0;
      var ev=hoverEvent1209; hoverEvent1209=null;
      if(ev) onHoverWithRect1209(ev,null);
    });
  }

  function attach(){
    var canvas = getCanvas();
    if(!canvas || canvas.dataset.dvlOscDividerRelease184 === '1') return;
    canvas.dataset.dvlOscDividerRelease184 = '1';

    canvas.addEventListener('pointerdown', onDown,  true);
    canvas.addEventListener('pointermove', onMove,  true);
    /* Desktop hover is supplied by the single rAF controller (1.205). The
       fallback below remains only for touch/narrow layouts. */
    if(!(window.matchMedia && window.matchMedia('(min-width:1100px)').matches))
      canvas.addEventListener('pointermove', onHover1209, {passive:true});
    canvas.addEventListener('pointerup',   onUp,    true);
    canvas.addEventListener('pointercancel', onUp,  true);
    canvas.addEventListener('lostpointercapture', function(e){ finishDrag(e, true); }, true);

    /* Global fallbacks cover release outside the canvas, browser chrome,
       an overlay, or a capture that was transferred by another subsystem. */
    window.addEventListener('pointerup', onUp, {capture:true, passive:false});
    window.addEventListener('pointercancel', function(e){ if(drag.active){ stopDividerEvent(e); finishDrag(e, true); } }, {capture:true, passive:false});
    window.addEventListener('mouseup', function(){ finishDrag(null, true); }, true);
    window.addEventListener('blur', function(){ finishDrag(null, true); }, true);
    document.addEventListener('visibilitychange', function(){ if(document.hidden) finishDrag(null, true); }, true);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach, {once:true});
  } else {
    attach();
  }

  window.DVL_OSC_DIVIDER_RELEASE_1184 = {
    version:'1.209',
    release:function(){ return finishDrag(null, true); },
    active:function(){ return !!drag.active; },
    hoverFromDesktop:function(ev,rect){ return onHoverWithRect1209(ev,rect); },
    audit:function(){
      var c=getCanvas();
      return {
        active:!!drag.active,
        pointerId:drag.pointerId,
        globalFlag:!!window.__dvlOscDividerDragging,
        canvasBound:!!(c&&c.dataset.dvlOscDividerRelease184==='1'),
        bodyLocked:document.body.classList.contains('dvl-osc-divider-dragging')
      };
    }
  };

})();
