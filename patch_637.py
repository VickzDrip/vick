#!/usr/bin/env python3
"""
patch_637.py — DVL Beta 0.637
Fix: Structural interaction motor — prevents chart pan/zoom from interfering
with any drawing, ruler, or paper-trading drag/edit operation.

Root cause: The window-level pointer handler (_onDown / _onMove) only blocked
chart pan when window.__dvlPositionDragActive was true, which was only set for
longpos/shortpos drawing drags. All other interactions (trendline/rect/arrow
body drag, ruler drag, ruler creation, long/short position creation, general
drawing selection) did NOT set the flag, so the chart would also pan during
those interactions.

Fix — three layers:
  A) Object.defineProperty on window.__dvlPositionDragActive — comprehensive
     getter that returns true when ANY interaction lock is active, including:
     • existing _realPosActive (longpos/shortpos pointer drag — unchanged)
     • S.drawingToolActive (any drawing tool in creation mode)
     • S.tool === 'ruler' (ruler creation mode)
     • S._rulerDragSv (ruler drag in progress)
     • __dvlPaperDragging / __dvlLongShortV2Dragging (paper-trading)
     • chartWrap.style.cursor === 'crosshair' (belt-and-suspenders)
     • DVLInteractionLock._locks (general lock from B/C below)

  B) After DOMContentLoaded (so our handler registers AFTER _onMD/touchstart
     handlers from the drawing system), we add wrap-level capture handlers that
     fire AFTER the drawing system's handlers. When _onMD or _onTS calls
     stopPropagation (→ ev.cancelBubble = true), we set a lock entry.
     This covers trendline/rect/arrow/text drag on desktop and mobile.

  C) Cleanup: locks cleared on mouseup / touchend / pointercancel.

The approved 0.598 Paper Trading logic is NOT modified.
Drawing coordinate storage (price/time) is NOT modified.
"""
import sys, pathlib

SRC = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. Version ────────────────────────────────────────────────────────────────
html = rep(html, 'BETA 0.636', 'BETA 0.637', "version badge")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.636";',
    'const DVL_APP_VERSION = "Beta 0.637";',
    "DVL_APP_VERSION")
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: Paper Trading panel layout isolation — contain+height lock prevents oscillator layout thrashing; overlay layer relocated outside canvas DOM." },',
    '  { version: DVL_APP_VERSION, note: "Fix: Interaction motor — DVLInteractionLock blocks chart pan/zoom during any drawing/ruler/paper-trading edit; cancelBubble detection covers trendline drag." },\n'
    '  { version: "Beta 0.636", note: "Fix: Paper Trading panel layout isolation — contain+height lock prevents oscillator layout thrashing; overlay layer relocated outside canvas DOM." },',
    "changelog 0.637")

# ── 2. Interaction motor script ───────────────────────────────────────────────
LOCK_JS = """\
<script id="DVL_BETA_0637_INTERACTION_LOCK">
/*
  DVL Beta 0.637 — Central Interaction Motor

  window.__dvlPositionDragActive is the single gate checked by _onDown and
  _onMove before any chart pan/zoom. We replace it with a comprehensive getter
  that returns true whenever ANY drawing, ruler, or paper-trading operation is
  active, so the chart cannot pan/zoom while objects are being edited.

  window.DVLInteractionLock is also exposed for external use.

  The approved 0.598 Paper Trading logic is NOT modified.
*/
(function(){
"use strict";

/* ─── 1. DVLInteractionLock ──────────────────────────────────────────────── */
var _locks = {};
window.DVLInteractionLock = {
  lock:     function(mode, owner){ _locks[owner || mode] = mode; },
  unlock:   function(owner){
    if(owner != null) delete _locks[owner]; else _locks = {};
  },
  isActive: function(){
    for(var k in _locks){ if(Object.prototype.hasOwnProperty.call(_locks,k)) return true; }
    return false;
  },
  getActiveModes: function(){
    return Object.keys(_locks).map(function(k){ return _locks[k]; });
  }
};

/* ─── 2. Backing variables for the three flag properties ─────────────────── */
var _realPosActive = !!window.__dvlPositionDragActive;
var _realPaperDrag = !!window.__dvlPaperDragging;
var _realLSV2Drag  = !!window.__dvlLongShortV2Dragging;

/* ─── 3. Master lock test ────────────────────────────────────────────────── */
function _isMasterLocked(){
  /* A) existing per-feature flags */
  if(_realPosActive || _realPaperDrag || _realLSV2Drag) return true;
  /* B) general lock entries (set by drag-detection handlers below) */
  for(var k in _locks){
    if(Object.prototype.hasOwnProperty.call(_locks,k)) return true;
  }
  /* C) drawing-system state exposed on window.S */
  var S = window.S;
  if(S){
    if(S.drawingToolActive) return true;   /* line/rect/text/arrow + long/short creation */
    if(S.tool === 'ruler')  return true;   /* ruler creation mode */
    if(S._rulerDragSv)      return true;   /* ruler drag in progress */
  }
  /* D) belt-and-suspenders: crosshair cursor on chartWrap */
  var wrap = document.getElementById('chartWrap');
  if(wrap && wrap.style.cursor === 'crosshair') return true;
  return false;
}

/* ─── 4. Redefine the three flag properties ──────────────────────────────── */
function _defProp(prop, getter, setter){
  try{
    Object.defineProperty(window, prop, {
      get: getter, set: setter,
      configurable: true, enumerable: true
    });
  }catch(e){
    /* If already non-configurable, fall back — existing code still works */
  }
}

_defProp('__dvlPositionDragActive', _isMasterLocked, function(v){ _realPosActive = !!v; });
_defProp('__dvlPaperDragging',      function(){ return _realPaperDrag; },  function(v){ _realPaperDrag  = !!v; });
_defProp('__dvlLongShortV2Dragging',function(){ return _realLSV2Drag; },   function(v){ _realLSV2Drag  = !!v; });

/* ─── 5. Drawing-drag detection via cancelBubble ──────────────────────────
   We register wrap-level capture handlers AFTER DOMContentLoaded so they are
   ordered AFTER the drawing system's _onMD / _onTS handlers (which are
   registered via ready() → DOMContentLoaded from inline scripts that ran
   before this patch script).

   When _onMD or _onTS calls stopPropagation(), ev.cancelBubble becomes true.
   Other handlers at the same element+phase still fire (stopPropagation only
   halts crossing to a different DOM node, not same-node listeners).
   We detect cancelBubble=true → drawing system consumed the event → set lock.
   Lock is cleared on mouseup / touchend / pointercancel.
─────────────────────────────────────────────────────────────────────────── */
var CTX_GUARD = '#dvlDrawCtxBar,#dvlDrawSettingsPanel,#dvlDrawDelete,#viewBtnDock,#dvlMiniRefresh';

function _onWrapMouseDown(ev){
  /* Only lock when drawing system stopped propagation, not for UI controls */
  if(!ev.cancelBubble) return;
  var t = ev.target;
  if(t && t.closest && t.closest(CTX_GUARD)) return;
  _locks['__mouse'] = 'drawing-mouse-drag';
}

function _onWinMouseUp(){
  delete _locks['__mouse'];
}

function _onWrapTouchStart(ev){
  /* Same principle for touch — _onTS may have called stopPropagation */
  if(!ev.cancelBubble) return;
  var t = ev.target;
  if(t && t.closest && t.closest(CTX_GUARD)) return;
  _locks['__touch'] = 'drawing-touch-drag';
}

function _onWinTouchEnd(){   delete _locks['__touch']; }
function _onWinTouchCancel(){ delete _locks['__touch']; }
function _onWinPointerCancel(){
  delete _locks['__mouse'];
  delete _locks['__touch'];
}

function _setupDragDetection(){
  var wrap = document.getElementById('chartWrap');
  if(!wrap) return;

  wrap.addEventListener('mousedown',  _onWrapMouseDown, {capture:true});
  wrap.addEventListener('touchstart', _onWrapTouchStart, {capture:true, passive:false});

  window.addEventListener('mouseup',       _onWinMouseUp,       {capture:true});
  window.addEventListener('touchend',      _onWinTouchEnd,      {capture:true});
  window.addEventListener('touchcancel',   _onWinTouchCancel,   {capture:true});
  window.addEventListener('pointercancel', _onWinPointerCancel, {capture:true});
}

/* Register after app's DOMContentLoaded callbacks */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _setupDragDetection);
}else{
  /* DOMContentLoaded already fired — use setTimeout(0) to still land after
     any other DOMContentLoaded callbacks that may not have run yet */
  setTimeout(_setupDragDetection, 0);
}

})();
</script>"""

# ── 3. Inject before </body></html> ──────────────────────────────────────────
TAIL = '\n</body>\n</html>'
html = rep(html, TAIL, '\n' + LOCK_JS + TAIL, "inject interaction lock")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_637 applied: {', '.join(_ok)}")
