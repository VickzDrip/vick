(function(){
"use strict";

window.__dvlPaperGestureActive   = false;
window.__dvlPaperDragLock        = false;
window.__dvlPaperDragging        = false;
window.__dvlPaperV2ProDragging   = false;
window.__dvlPositionDragActive   = false;
window.__dvlLongShortV2Dragging  = false;
window.__dvlPaperV2ProMoveDrag   = null;
window.__dvlPaperV2ProEndDrag    = null;

function releasePaperLock(){
  /* DVL_BETA_1555_POSITION_RELEASE_GUARD */
  if(!window.__dvlBeta1555PositionReleasing){
    window.__dvlBeta1555PositionReleasing = true;
    try{
      if(window.__dvlPaperV2ProDragging && typeof window.__dvlPaperV2ProEndDrag === "function"){
        window.__dvlPaperV2ProEndDrag();
      }
    }catch(_){}
    try{
      var api = window.DVL_PAPER_TRADING_V2_PRO;
      var st = api && typeof api.getState === "function" ? api.getState() : null;
      if(st && st.drag){
        st.drag = null;
        if(typeof api.render === "function") api.render();
      }
    }catch(_){}
    try{
      var ls = window.__dvlLongShortV2;
      if(ls && typeof ls.forceRelease === "function") ls.forceRelease();
    }catch(_){}
    window.__dvlBeta1555PositionReleasing = false;
  }
  window.__dvlPaperGestureActive  = false;
  window.__dvlPaperDragLock       = false;
  window.__dvlPaperDragging       = false;
  window.__dvlPositionDragActive  = false;
  window.__dvlLongShortV2Dragging = false;
  document.documentElement.classList.remove('dvl-paper-gesture-active');
}
window.DVL_RELEASE_PAPER_LOCK = releasePaperLock;

function _isPaperDragTarget(t){
  var el = t;
  while(el){
    if(el.classList){
      if(el.classList.contains('dvl-pv2p-btn')||
         el.classList.contains('dvl-pv2p-controls')||
         el.classList.contains('dvl-pv2p-close')) return false;
      if(el.classList.contains('dvl-pv2p-hit')||
         el.classList.contains('dvl-pv2p-tag')) return true;
    }
    if(el.id==='dvlPaperLayerV2Pro') return false;
    el = el.parentElement;
  }
  return false;
}

function _activateLock(){
  window.__dvlPaperGestureActive  = true;
  window.__dvlPaperDragLock       = true;
  window.__dvlPaperDragging       = true;
  window.__dvlPositionDragActive  = true;
  window.__dvlLongShortV2Dragging = true;
  document.documentElement.classList.add('dvl-paper-gesture-active');
  try{ chartPointers.clear(); }catch(_){}
  try{ chartDragState = null; }catch(_){}
  try{ chartPinchState = null; }catch(_){}
  try{ crossDragState = null; }catch(_){}
  try{ crosshair.active = false; }catch(_){}
  try{ clearCrossPressTimer(); }catch(_){}
}

function _onPaperDown(ev){
  if(!_isPaperDragTarget(ev.target)) return;
  _activateLock();
  if(ev.preventDefault) ev.preventDefault();
  // No stopPropagation: event must propagate to Paper element handler so startDrag fires
}

function _onTouchStart(ev){
  if(!ev.changedTouches||!ev.changedTouches.length) return;
  var t = document.elementFromPoint(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
  if(!_isPaperDragTarget(t)) return;
  _activateLock();
  if(ev.preventDefault) ev.preventDefault();
}

function _onMove(ev){
  if(!window.__dvlPaperGestureActive) return;
  if(ev && ev.type !== "touchmove" && typeof ev.buttons === "number" && ev.buttons === 0){
    try{ if(window.__dvlPaperV2ProEndDrag) window.__dvlPaperV2ProEndDrag(ev); }catch(_){}
    releasePaperLock();
    return;
  }
  if(!window.__dvlPaperV2ProDragging||!window.__dvlPaperV2ProMoveDrag){
    releasePaperLock();
    return;
  }
  ev.preventDefault();
  ev.stopImmediatePropagation();
  window.__dvlPaperV2ProMoveDrag(ev);
}

function _onUp(ev){
  if(!window.__dvlPaperGestureActive) return;
  try{
    if(window.__dvlPaperV2ProEndDrag){
      ev.stopImmediatePropagation();
      window.__dvlPaperV2ProEndDrag(ev);
    }
  }finally{
    releasePaperLock();
  }
}

function _onTouchEnd(ev){
  if(!window.__dvlPaperGestureActive) return;
  try{
    if(window.__dvlPaperV2ProEndDrag) window.__dvlPaperV2ProEndDrag(ev);
  }finally{
    releasePaperLock();
  }
}

window.addEventListener('pointerdown',    _onPaperDown,  {capture:true, passive:false});
window.addEventListener('touchstart',     _onTouchStart, {capture:true, passive:false});
window.addEventListener('pointermove',    _onMove,       {capture:true, passive:false});
window.addEventListener('pointerup',      _onUp,         {capture:true, passive:false});
window.addEventListener('pointercancel',  _onUp,         {capture:true, passive:false});
window.addEventListener('touchend',       _onTouchEnd,   {capture:true, passive:false});
window.addEventListener('touchcancel',    _onTouchEnd,   {capture:true, passive:false});
window.addEventListener('blur', function(){ releasePaperLock(); }, false);
document.addEventListener('visibilitychange', function(){ if(document.hidden) releasePaperLock(); }, false);
})();
