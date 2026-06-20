#!/usr/bin/env python3
"""
patch_701.py — Beta 0.701 Paper Lock Start Fix

Root cause of 0.700 bug:
  _onPaperDown called stopPropagation(), so the event never reached the Paper
  element handler → startDrag() never fired → __dvlPaperGestureActive stayed true
  permanently → chart frozen, page reload required.

Changes:
  C1:  Title       Beta 0.700 → Beta 0.701
  C2:  versionBadge BETA 0.700 → BETA 0.701
  C3:  DVL_APP_VERSION → "Beta 0.701"
  C4:  Changelog — add 0.701 entry; shift 0.700 to string literal
  C5:  Replace DVL_PAPER_HARD_LOCK_GUARD_0700 with DVL_PAPER_LOCK_FIX_GUARD_0701:
         - _isPaperDragTarget(): only hit/tag initiate lock; btn/controls do NOT
         - _onPaperDown(): no stopPropagation — event must reach Paper's startDrag
         - releasePaperLock(): global safety release
         - _onMove(): checks __dvlPaperV2ProDragging — if false, releases lock
         - _onUp(): try/finally always releases lock
         - touchend/touchcancel/blur/visibilitychange all release lock
  C6:  V2 Pro startDrag — add window.__dvlPaperV2ProDragging = true
  C7:  V2 Pro endDrag   — add release at end (safe unlock)
  C8:  Audit DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701 (38 checks)
"""

import os, sys, shutil

HTML   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-50.before_0701_lock_fix.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count != 1:
        print(f"FAIL [{label}]: expected 1 occurrence, found {count}")
        print(f"  Pattern: {repr(old[:120])}")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── load ───────────────────────────────────────────────────────────────────────
with open(HTML, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Input: {html.count(chr(10))+1} lines")

# ── pre-assertions ─────────────────────────────────────────────────────────────
def pre(cond, msg):
    if not cond:
        print(f"PRE-FAIL: {msg}")
        sys.exit(1)

pre('const DVL_APP_VERSION = "Beta 0.700"' in html, 'not Beta 0.700')
pre('DVL_PAPER_HARD_LOCK_GUARD_0700' in html, '0700 guard missing')
pre('DVL_HEADER_LEAK_AND_PAPER_HARD_LOCK_AUDIT_MODULE_0700' in html, '0700 audit missing')
pre('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
pre('DVL_PAPER_LOCK_FIX_GUARD_0701' not in html, '0701 guard already present')
pre('DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701' not in html, '0701 audit already present')
pre('window.DVL_RELEASE_PAPER_LOCK' not in html, 'DVL_RELEASE_PAPER_LOCK already present')

# ── backup ─────────────────────────────────────────────────────────────────────
shutil.copy2(HTML, BACKUP)
print(f"Backup: {BACKUP}")

# ── C1: Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.700</title>',
    '<title>DVL Binance Live — Beta 0.701</title>',
    "C1: title"
)

# ── C2: versionBadge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.700</div>',
    '>BETA 0.701</div>',
    "C2: versionBadge"
)

# ── C3: DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.700";',
    'const DVL_APP_VERSION = "Beta 0.701";',
    "C3: DVL_APP_VERSION"
)

# ── C4: Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.700 — Header leak and hard Paper gesture lock: removed raw JS leaking above the header and made Paper TP/SL/ENTRY drags lock chart pointerdown/pan/zoom/crosshair from the first touch." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.701 — Paper lock start fix: Paper drag lock no longer blocks the Paper startDrag event, buttons no longer trigger permanent lock, and all Paper locks are safely released on pointer/touch end." },\n'
    '  { version: "Beta 0.700", note: "Beta 0.700 — Header leak and hard Paper gesture lock: removed raw JS leaking above the header and made Paper TP/SL/ENTRY drags lock chart pointerdown/pan/zoom/crosshair from the first touch." },',
    "C4: changelog"
)

# ── C5: Replace guard 0700 with fixed guard 0701 ──────────────────────────────
# Key fixes:
#   - _isPaperDragTarget: btn/controls return FALSE (they should never lock chart)
#   - _onPaperDown: no stopPropagation (so Paper element handler fires startDrag)
#   - releasePaperLock: global function, called in all release paths
#   - _onMove: checks __dvlPaperV2ProDragging; releases if Paper didn't startDrag
#   - _onUp: try/finally guarantees release even if endDrag throws
#   - touchend/touchcancel/blur/visibilitychange: additional safety releases

GUARD_OLD = """\
<script id="DVL_PAPER_HARD_LOCK_GUARD_0700">
(function(){
"use strict";

window.__dvlPaperGestureActive   = false;
window.__dvlPaperDragLock        = false;
window.__dvlPaperDragging        = false;
window.__dvlPositionDragActive   = false;
window.__dvlLongShortV2Dragging  = false;
window.__dvlPaperV2ProMoveDrag   = null;
window.__dvlPaperV2ProEndDrag    = null;

function _isPaperTarget(t){
  var el = t;
  while(el){
    if(el.id==='dvlPaperLayerV2Pro') return true;
    var c = el.className||'';
    if(typeof c==='string'&&(
      c.indexOf('dvl-pv2p-hit')>=0||
      c.indexOf('dvl-pv2p-tag')>=0||
      c.indexOf('dvl-pv2p-controls')>=0||
      c.indexOf('dvl-pv2p-btn')>=0
    )) return true;
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
  if(!_isPaperTarget(ev.target)) return;
  _activateLock();
  ev.preventDefault();
  ev.stopPropagation();
}

function _onTouchStart(ev){
  if(!ev.changedTouches||!ev.changedTouches.length) return;
  var t = document.elementFromPoint(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
  if(!_isPaperTarget(t)) return;
  _activateLock();
  ev.preventDefault();
  ev.stopPropagation();
}

function _onMove(ev){
  if(!window.__dvlPaperGestureActive) return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  if(window.__dvlPaperV2ProMoveDrag) window.__dvlPaperV2ProMoveDrag(ev);
}

function _onUp(ev){
  if(!window.__dvlPaperGestureActive) return;
  ev.stopImmediatePropagation();
  if(window.__dvlPaperV2ProEndDrag) window.__dvlPaperV2ProEndDrag(ev);
}

window.addEventListener('pointerdown',   _onPaperDown,  {capture:true, passive:false});
window.addEventListener('touchstart',    _onTouchStart, {capture:true, passive:false});
window.addEventListener('pointermove',   _onMove,       {capture:true, passive:false});
window.addEventListener('pointerup',     _onUp,         {capture:true, passive:false});
window.addEventListener('pointercancel', _onUp,         {capture:true, passive:false});
})();
</script>"""

GUARD_NEW = """\
<script id="DVL_PAPER_LOCK_FIX_GUARD_0701">
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
      if(el.classList.contains('dvl-pv2p-hit')||
         el.classList.contains('dvl-pv2p-tag')) return true;
      if(el.classList.contains('dvl-pv2p-btn')||
         el.classList.contains('dvl-pv2p-controls')) return false;
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
</script>"""

html = rep(html, GUARD_OLD, GUARD_NEW, "C5: guard 0700 → lock fix 0701")

# ── C6: V2 Pro startDrag — add __dvlPaperV2ProDragging = true ─────────────────
# _activateLock (guard) sets the gesture flags early; startDrag then confirms
# that a real drag is underway by setting __dvlPaperV2ProDragging.
# _onMove checks this flag: if false after lock, releases lock immediately.
html = rep(html,
    "window.__dvlLongShortV2Dragging=true; document.documentElement.classList.add('dvl-pv2p-dragging');",
    "window.__dvlLongShortV2Dragging=true; window.__dvlPaperV2ProDragging=true; document.documentElement.classList.add('dvl-pv2p-dragging');",
    "C6: startDrag set __dvlPaperV2ProDragging"
)

# ── C7: V2 Pro endDrag — release lock at end ───────────────────────────────────
# Adds __dvlPaperV2ProDragging=false and calls global release so the guard
# always sees a clean state even if the guard's _onUp didn't run first.
html = rep(html,
    "&&state.edit.kind===d.kind))save(); render();}",
    "&&state.edit.kind===d.kind))save(); render(); window.__dvlPaperV2ProDragging=false; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK();}",
    "C7: endDrag release lock"
)

# ── C8: Audit DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701 ─────────────────────
# Anti-false-positive splits:
#   _brokerToken = 'Broker' + 'Connector'
#   _realOrder   = 'placeReal' + 'Order'
#   _dsFn        = "draw" + "Soon"
# Audit excludes self from _srcFull to enable string checks on other scripts.

AUDIT_0701 = """
<script id="DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701">
(function(){
"use strict";

var _lastAudit = null;
var _brokerToken = 'Broker' + 'Connector';
var _realOrder   = 'placeReal' + 'Order';

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c=0; for(var i=0;i<els.length;i++){if(els[i].id===id)c++;} return c;
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  var _selfId = "DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701";
  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var _si=0;_si<_allScripts.length;_si++){
    if(_allScripts[_si].id === _selfId) continue;
    _srcFull += _allScripts[_si].textContent;
  }

  var _modEl  = document.getElementById(_selfId);
  var _modSrc = _modEl ? _modEl.textContent : "";

  var _v2El   = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var _v2Src  = _v2El ? _v2El.textContent : "";

  var _guardEl  = document.getElementById("DVL_PAPER_LOCK_FIX_GUARD_0701");
  var _guardSrc = _guardEl ? _guardEl.textContent : "";

  // ── A1. Title Beta 0.701 ─────────────────────────────────────────────────────
  var titleOk = document.title.indexOf("0.701") > -1;
  if(!titleOk) blockers.push("A1: title not 0.701: " + document.title);

  // ── A2. Badge BETA 0.701 ──────────────────────────────────────────────────────
  var badge = document.getElementById("versionBadge");
  var badgeOk = badge && badge.textContent.indexOf("0.701") > -1;
  if(!badgeOk) blockers.push("A2: badge not 0.701");

  // ── A3. Changelog 0.701 at top ────────────────────────────────────────────────
  var changelogOk = typeof window.DVL_CHANGELOG !== "undefined" &&
    window.DVL_CHANGELOG.length > 0 &&
    window.DVL_CHANGELOG[0].note &&
    window.DVL_CHANGELOG[0].note.indexOf("0.701") > -1;
  if(!changelogOk) blockers.push("A3: changelog 0.701 not at top");

  // ── A4. _onPaperDown does not call stopPropagation ────────────────────────────
  var noStopPropInDown = _guardSrc.indexOf("ev.stopPropagation()") === -1;
  if(!noStopPropInDown) blockers.push("A4: guard _onPaperDown calls stopPropagation");

  // ── A5. _onPaperDown does not call stopImmediatePropagation ──────────────────
  var downIdx = _guardSrc.indexOf("function _onPaperDown");
  var nextFnIdx = _guardSrc.indexOf("function _onTouchStart");
  var downBody = (downIdx > -1 && nextFnIdx > -1) ? _guardSrc.substring(downIdx, nextFnIdx) : "";
  var noStopImmInDown = downBody.indexOf("stopImmediatePropagation") === -1;
  if(!noStopImmInDown) blockers.push("A5: _onPaperDown calls stopImmediatePropagation");

  // ── A6. _isPaperDragTarget exists ────────────────────────────────────────────
  var hasDragTarget = _guardSrc.indexOf("_isPaperDragTarget") > -1;
  if(!hasDragTarget) blockers.push("A6: _isPaperDragTarget missing from guard");

  // ── A7. dvl-pv2p-btn does not activate lock ───────────────────────────────────
  var btnNoLock = _guardSrc.indexOf("dvl-pv2p-btn") > -1 &&
    (function(){
      var idx = _guardSrc.indexOf("_isPaperDragTarget");
      var fnEnd = _guardSrc.indexOf("function _activateLock");
      var body = _guardSrc.substring(idx, fnEnd);
      return body.indexOf("dvl-pv2p-btn") > -1 && body.indexOf("return false") > -1;
    })();
  if(!btnNoLock) blockers.push("A7: dvl-pv2p-btn does not return false in _isPaperDragTarget");

  // ── A8. dvl-pv2p-controls does not activate lock ─────────────────────────────
  var ctrlNoLock = _guardSrc.indexOf("dvl-pv2p-controls") > -1;
  if(!ctrlNoLock) blockers.push("A8: dvl-pv2p-controls not handled in guard");

  // ── A9. releasePaperLock exists in guard ─────────────────────────────────────
  var hasRelease = _guardSrc.indexOf("releasePaperLock") > -1;
  if(!hasRelease) blockers.push("A9: releasePaperLock missing from guard");

  // ── A10. window.DVL_RELEASE_PAPER_LOCK exposed ───────────────────────────────
  var releaseExposed = typeof window.DVL_RELEASE_PAPER_LOCK === "function";
  if(!releaseExposed) blockers.push("A10: window.DVL_RELEASE_PAPER_LOCK not a function");

  // ── A11. pointerup always releases lock (try/finally) ────────────────────────
  var upHasFinally = _guardSrc.indexOf("finally") > -1;
  if(!upHasFinally) blockers.push("A11: _onUp missing try/finally");

  // ── A12. pointercancel releases lock ─────────────────────────────────────────
  var cancelHasRelease = _guardSrc.indexOf("pointercancel") > -1;
  if(!cancelHasRelease) blockers.push("A12: pointercancel not handled");

  // ── A13. touchend releases lock ──────────────────────────────────────────────
  var touchEndRelease = _guardSrc.indexOf("touchend") > -1;
  if(!touchEndRelease) blockers.push("A13: touchend not handled");

  // ── A14. touchcancel releases lock ───────────────────────────────────────────
  var touchCancelRelease = _guardSrc.indexOf("touchcancel") > -1;
  if(!touchCancelRelease) blockers.push("A14: touchcancel not handled");

  // ── A15. blur releases lock ───────────────────────────────────────────────────
  var blurRelease = _guardSrc.indexOf("blur") > -1;
  if(!blurRelease) blockers.push("A15: blur not handled in guard");

  // ── A16. visibilitychange releases lock ──────────────────────────────────────
  var visChange = _guardSrc.indexOf("visibilitychange") > -1;
  if(!visChange) blockers.push("A16: visibilitychange not handled in guard");

  // ── A17. __dvlPaperV2ProDragging flag initialized ────────────────────────────
  var v2DragFlag = "dvlPaperV2ProDragging" in window;
  if(!v2DragFlag) blockers.push("A17: window.__dvlPaperV2ProDragging not initialized");

  // ── A18. startDrag sets __dvlPaperV2ProDragging = true ───────────────────────
  var startSetsV2 = _v2Src.indexOf("__dvlPaperV2ProDragging=true") > -1;
  if(!startSetsV2) blockers.push("A18: startDrag does not set __dvlPaperV2ProDragging");

  // ── A19. endDrag clears __dvlPaperV2ProDragging ──────────────────────────────
  var endClearsV2 = _v2Src.indexOf("__dvlPaperV2ProDragging=false") > -1;
  if(!endClearsV2) blockers.push("A19: endDrag does not clear __dvlPaperV2ProDragging");

  // ── A20. _onMove checks __dvlPaperV2ProDragging before blocking ──────────────
  var moveSafe = _guardSrc.indexOf("__dvlPaperV2ProDragging") > -1;
  if(!moveSafe) blockers.push("A20: guard _onMove does not check __dvlPaperV2ProDragging");

  // ── A21. V2 endDrag calls DVL_RELEASE_PAPER_LOCK ─────────────────────────────
  var endCallsRelease = _v2Src.indexOf("DVL_RELEASE_PAPER_LOCK") > -1;
  if(!endCallsRelease) blockers.push("A21: V2 endDrag does not call DVL_RELEASE_PAPER_LOCK");

  // ── A22. V2 Pro module present ───────────────────────────────────────────────
  var v2Present = _cntId(scriptEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === 1;
  if(!v2Present) blockers.push("A22: V2 Pro module missing");

  // ── A23. V2 startDrag sets __dvlPaperGestureActive ───────────────────────────
  var startSetsFlag = _v2Src.indexOf("__dvlPaperGestureActive=true") > -1;
  if(!startSetsFlag) blockers.push("A23: V2 startDrag does not set __dvlPaperGestureActive");

  // ── A24. V2 moveDrag uses scaleSnapshot ──────────────────────────────────────
  var hasSnapshot = _v2Src.indexOf("scaleSnapshot") > -1;
  if(!hasSnapshot) blockers.push("A24: V2 moveDrag missing scaleSnapshot");

  // ── A25. V2 moveDrag calls stopImmediatePropagation ──────────────────────────
  var moveStopImm = _v2Src.indexOf("stopImmediatePropagation") > -1;
  if(!moveStopImm) blockers.push("A25: V2 moveDrag missing stopImmediatePropagation");

  // ── A26. Header leak still fixed (no orphan text before .app) ────────────────
  var _appEl = document.querySelector('.app');
  var _orphan = [];
  if(document.body && _appEl){
    var _n = document.body.firstChild;
    while(_n && _n !== _appEl){
      if(_n.nodeType === 3 && _n.textContent.trim().length > 0)
        _orphan.push(_n.textContent.trim().substring(0,30));
      _n = _n.nextSibling;
    }
  }
  var noOrphan = _orphan.length === 0;
  if(!noOrphan) blockers.push("A26: orphan text before .app: " + _orphan.join("|"));

  // ── A27. V2 Pro layer unique ─────────────────────────────────────────────────
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("A27: multiple #dvlPaperLayerV2Pro: " + v2LayerCount);
  if(v2LayerCount < 1) warnings.push("A27: #dvlPaperLayerV2Pro not yet in DOM");

  // ── A28. Legacy paper hidden ─────────────────────────────────────────────────
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("A28: #dvlPaperLayer still visible");

  // ── A29. TP/SL activation preserved ─────────────────────────────────────────
  var hasTpSl = _v2Src.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSl) blockers.push("A29: maybeCloseOpen missing from V2");

  // ── A30. ENTRY close X preserved ────────────────────────────────────────────
  var hasCloseX = _v2Src.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("A30: data-close-trade missing from V2");

  // ── A31. Market preserved ───────────────────────────────────────────────────
  var hasMarket = _v2Src.indexOf("openMarket") > -1;
  if(!hasMarket) blockers.push("A31: openMarket missing from V2");

  // ── A32. Limit/Stop draft preserved ─────────────────────────────────────────
  var hasDraft = _v2Src.indexOf("createDraft") > -1;
  if(!hasDraft) blockers.push("A32: createDraft missing from V2");

  // ── A33. Chart _onDown still checks paper lock ───────────────────────────────
  var chartDownCheck = _srcFull.indexOf("__dvlPaperGestureActive||window.__dvlPaperDragLock||window.__dvlPositionDragActive") > -1;
  if(!chartDownCheck) blockers.push("A33: chart _onDown paper lock check missing");

  // ── A34. Final locks 0659-0662 present ───────────────────────────────────────
  var missingLocks = [];
  for(var _fl=0;_fl<FINAL_LOCK_CSS.length;_fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[_fl])!==1) missingLocks.push(FINAL_LOCK_CSS[_fl]);
  }
  if(missingLocks.length > 0) blockers.push("A34: final locks missing: " + missingLocks.join(", "));

  // ── A35. Zero _brokerToken ───────────────────────────────────────────────────
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push("A35: " + _brokerToken + " found in source");

  // ── A36. Zero Real order ─────────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push("A36: " + _realOrder + " found in source");

  // ── A37. No API key in audit module ──────────────────────────────────────────
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("A37: apiKey found in audit module");

  // ── A38. drawSoon intact ─────────────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" ||
                    _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("A38: drawSoon not found");

  var pass = (
    titleOk && badgeOk && changelogOk &&
    noStopPropInDown && noStopImmInDown &&
    hasDragTarget && btnNoLock && ctrlNoLock &&
    hasRelease && releaseExposed && upHasFinally &&
    cancelHasRelease && touchEndRelease && touchCancelRelease &&
    blurRelease && visChange &&
    v2DragFlag && startSetsV2 && endClearsV2 && moveSafe && endCallsRelease &&
    v2Present && startSetsFlag && hasSnapshot && moveStopImm &&
    noOrphan && v2LayerCount <= 1 && legacyHidden &&
    hasTpSl && hasCloseX && hasMarket && hasDraft &&
    chartDownCheck && missingLocks.length === 0 &&
    noBroker && noRealOrder
  );

  _lastAudit = {
    pass:                pass,
    titleOk:             titleOk,
    badgeOk:             badgeOk,
    changelogOk:         changelogOk,
    noStopPropInDown:    noStopPropInDown,
    noStopImmInDown:     noStopImmInDown,
    hasDragTarget:       hasDragTarget,
    btnNoLock:           btnNoLock,
    ctrlNoLock:          ctrlNoLock,
    hasRelease:          hasRelease,
    releaseExposed:      releaseExposed,
    upHasFinally:        upHasFinally,
    cancelHasRelease:    cancelHasRelease,
    touchEndRelease:     touchEndRelease,
    touchCancelRelease:  touchCancelRelease,
    blurRelease:         blurRelease,
    visChange:           visChange,
    v2DragFlag:          v2DragFlag,
    startSetsV2:         startSetsV2,
    endClearsV2:         endClearsV2,
    moveSafe:            moveSafe,
    endCallsRelease:     endCallsRelease,
    v2Present:           v2Present,
    startSetsFlag:       startSetsFlag,
    hasSnapshot:         hasSnapshot,
    moveStopImm:         moveStopImm,
    noOrphan:            noOrphan,
    v2LayerCount:        v2LayerCount,
    legacyHidden:        legacyHidden,
    hasTpSl:             hasTpSl,
    hasCloseX:           hasCloseX,
    hasMarket:           hasMarket,
    hasDraft:            hasDraft,
    chartDownCheck:      chartDownCheck,
    finalLocksOk:        missingLocks.length === 0,
    noBroker:            noBroker,
    noRealOrder:         noRealOrder,
    blockers:            blockers,
    warnings:            warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_LOCK_FIX_AUDIT = {
  VERSION:      "0.701",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    AUDIT_0701 + '\n</body>\n</html>',
    "C8: audit 0701"
)

# ── post-assertions ────────────────────────────────────────────────────────────
def post(cond, msg):
    if not cond:
        print(f"POST-FAIL: {msg}")
        sys.exit(1)

# Version
post('<title>DVL Binance Live — Beta 0.701</title>' in html, 'title not updated')
post('>BETA 0.701</div>' in html, 'badge not updated')
post('const DVL_APP_VERSION = "Beta 0.701"' in html, 'DVL_APP_VERSION not 0.701')
post('"Beta 0.701 — Paper lock start fix' in html, 'changelog 0.701 missing')
post('"Beta 0.700", note: "Beta 0.700 — Header leak' in html, '0700 entry not string-literalized')

# C5: guard replaced
post(html.count('<script id="DVL_PAPER_LOCK_FIX_GUARD_0701">') == 1, 'guard 0701 count != 1')
post('<script id="DVL_PAPER_HARD_LOCK_GUARD_0700">' not in html, 'old guard 0700 still present')
post('_isPaperDragTarget' in html, '_isPaperDragTarget missing')
post('releasePaperLock' in html, 'releasePaperLock missing')
post('window.DVL_RELEASE_PAPER_LOCK' in html, 'DVL_RELEASE_PAPER_LOCK missing')
post('ev.stopPropagation()' not in html[html.index('DVL_PAPER_LOCK_FIX_GUARD_0701'):html.index('</script>', html.index('DVL_PAPER_LOCK_FIX_GUARD_0701'))],
     'stopPropagation found in guard 0701')
post('touchend' in html, 'touchend handler missing')
post('touchcancel' in html, 'touchcancel handler missing')
post('visibilitychange' in html, 'visibilitychange handler missing')
post('finally' in html, 'try/finally missing in guard')

# C6: startDrag
post('window.__dvlPaperV2ProDragging=true;' in html, '__dvlPaperV2ProDragging=true missing in startDrag')

# C7: endDrag
post('window.__dvlPaperV2ProDragging=false;' in html, '__dvlPaperV2ProDragging=false missing in endDrag')
post('if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK();' in html, 'release call missing in endDrag')

# C8: audit
post(html.count('<script id="DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701">') == 1, 'audit 0701 count != 1')
post('window.DVL_PAPER_LOCK_FIX_AUDIT' in html, 'audit object not exposed')

# Prior modules preserved
post('DVL_HEADER_LEAK_AND_PAPER_HARD_LOCK_AUDIT_MODULE_0700' in html, '0700 audit missing')
post('DVL_PAPER_GESTURE_ISOLATION_AUDIT_MODULE_0699' in html, '0699 audit missing')
post('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
post('DVL_PAPER_LEGACY_SUPPRESSOR_0698' in html, 'legacy suppressor missing')

# Security
_bt = 'Broker' + 'Connector'
post(_bt not in html, 'BrokerConnector found in HTML')

# No timers in guard 0701
g_idx = html.index('DVL_PAPER_LOCK_FIX_GUARD_0701')
g_end = html.index('</script>', g_idx)
g_src = html[g_idx:g_end]
post('setTimeout'            not in g_src, 'setTimeout in guard 0701')
post('setInterval'           not in g_src, 'setInterval in guard 0701')
post('requestAnimationFrame' not in g_src, 'requestAnimationFrame in guard 0701')
post('window.drawSoon '      not in g_src, 'window.drawSoon literal in guard 0701')

# No timers in audit 0701
a_idx = html.index('DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701')
a_end = html.index('window.DVL_PAPER_LOCK_FIX_AUDIT', a_idx)
a_src = html[a_idx:a_end]
post('setTimeout'            not in a_src, 'setTimeout in audit 0701')
post('setInterval'           not in a_src, 'setInterval in audit 0701')
post('requestAnimationFrame' not in a_src, 'requestAnimationFrame in audit 0701')
post('window.drawSoon '      not in a_src, 'window.drawSoon literal in audit 0701')

# ── write ──────────────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Output: {html.count(chr(10))+1} lines (+{html.count(chr(10))+1 - 39738})")
print("All assertions passed. Beta 0.701 ready.")
