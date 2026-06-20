#!/usr/bin/env python3
"""
patch_702.py — Beta 0.702 Paper ENTRY X Close Trade Fix

Root cause of X-not-closing bug:
  1. _isPaperDragTarget returned true for clicks on .dvl-pv2p-close because it
     walks up and hits the parent .dvl-pv2p-tag before checking close class.
     This activated __dvlPaperGestureActive, causing _onUp to call endDrag(null).
     endDrag called render() which removed the click target from the DOM, so
     the subsequent click event could not reliably fire on the detached element.
  2. closePaperTrade only sets status='closed' (doesn't remove) and only handles
     open trades, not pending/draft.

Changes:
  C1:  Title       Beta 0.701 → Beta 0.702
  C2:  versionBadge BETA 0.701 → BETA 0.702
  C3:  DVL_APP_VERSION → "Beta 0.702"
  C4:  Changelog — add 0.702 entry; shift 0.701 to string literal
  C5:  Guard _isPaperDragTarget — check btn/controls/close BEFORE hit/tag so
       tapping X returns false before walking up to .dvl-pv2p-tag
  C6:  V2 Pro — add closeOrCancelPaperOrder(id): removes from state.orders,
       clears selection/drag/edit, calls DVL_RELEASE_PAPER_LOCK, save, render
  C7:  V2 Pro — ENTRY X click handler: replace closePaperTrade with
       closeOrCancelPaperOrder + stopImmediatePropagation
  C8:  Audit DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702 (29 checks)
"""

import os, sys, shutil

HTML   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-51.before_0702_entry_close.html"

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

pre('const DVL_APP_VERSION = "Beta 0.701"' in html, 'not Beta 0.701')
pre('DVL_PAPER_LOCK_FIX_GUARD_0701' in html, '0701 guard missing')
pre('DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701' in html, '0701 audit missing')
pre('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
pre('DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702' not in html, '0702 audit already present')
pre('closeOrCancelPaperOrder' not in html, 'closeOrCancelPaperOrder already present')

# ── backup ─────────────────────────────────────────────────────────────────────
shutil.copy2(HTML, BACKUP)
print(f"Backup: {BACKUP}")

# ── C1: Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.701</title>',
    '<title>DVL Binance Live — Beta 0.702</title>',
    "C1: title"
)

# ── C2: versionBadge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.701</div>',
    '>BETA 0.702</div>',
    "C2: versionBadge"
)

# ── C3: DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.701";',
    'const DVL_APP_VERSION = "Beta 0.702";',
    "C3: DVL_APP_VERSION"
)

# ── C4: Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.701 — Paper lock start fix: Paper drag lock no longer blocks the Paper startDrag event, buttons no longer trigger permanent lock, and all Paper locks are safely released on pointer/touch end." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.702 — Paper ENTRY close fix: ENTRY X now closes active Paper trades or cancels pending Paper orders without starting drag, freezing the chart, or leaving Paper gesture locks active." },\n'
    '  { version: "Beta 0.701", note: "Beta 0.701 — Paper lock start fix: Paper drag lock no longer blocks the Paper startDrag event, buttons no longer trigger permanent lock, and all Paper locks are safely released on pointer/touch end." },',
    "C4: changelog"
)

# ── C5: Guard _isPaperDragTarget — check close/btn/controls BEFORE hit/tag ────
# Bug: old order checked hit/tag first, so .dvl-pv2p-close inside .dvl-pv2p-tag
# returned true (walking up to tag) instead of stopping at the close button.
# Fix: check exclusion classes (btn, controls, close) first at each node level.
html = rep(html,
    'function _isPaperDragTarget(t){\n'
    '  var el = t;\n'
    '  while(el){\n'
    '    if(el.classList){\n'
    '      if(el.classList.contains(\'dvl-pv2p-hit\')||\n'
    '         el.classList.contains(\'dvl-pv2p-tag\')) return true;\n'
    '      if(el.classList.contains(\'dvl-pv2p-btn\')||\n'
    '         el.classList.contains(\'dvl-pv2p-controls\')) return false;\n'
    '    }\n'
    '    if(el.id===\'dvlPaperLayerV2Pro\') return false;\n'
    '    el = el.parentElement;\n'
    '  }\n'
    '  return false;\n'
    '}',
    'function _isPaperDragTarget(t){\n'
    '  var el = t;\n'
    '  while(el){\n'
    '    if(el.classList){\n'
    '      if(el.classList.contains(\'dvl-pv2p-btn\')||\n'
    '         el.classList.contains(\'dvl-pv2p-controls\')||\n'
    '         el.classList.contains(\'dvl-pv2p-close\')) return false;\n'
    '      if(el.classList.contains(\'dvl-pv2p-hit\')||\n'
    '         el.classList.contains(\'dvl-pv2p-tag\')) return true;\n'
    '    }\n'
    '    if(el.id===\'dvlPaperLayerV2Pro\') return false;\n'
    '    el = el.parentElement;\n'
    '  }\n'
    '  return false;\n'
    '}',
    "C5: _isPaperDragTarget — exclusions before drag targets"
)

# ── C6: V2 Pro — add closeOrCancelPaperOrder ──────────────────────────────────
# Completely removes the order from state.orders (no status='closed' dance),
# clears related state, releases the Paper lock, saves, and re-renders.
# Handles open, pending, and draft orders uniformly.
html = rep(html,
    "function closePaperTrade(id){var o=find(id); if(!o||o.status!=='open')return; closeOpenOrder(o,'manual',currentPrice()||o.entry); render();}",
    "function closePaperTrade(id){var o=find(id); if(!o||o.status!=='open')return; closeOpenOrder(o,'manual',currentPrice()||o.entry); render();}\n"
    "  function closeOrCancelPaperOrder(id){var idx=state.orders.findIndex(function(p){return String(p.id)===String(id);}); if(idx<0)return; state.orders.splice(idx,1); if(state.selectedId===id)state.selectedId=null; state.drag=null; state.edit=null; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); save(); render();}",
    "C6: closeOrCancelPaperOrder"
)

# ── C7: V2 Pro — ENTRY X click handler uses closeOrCancelPaperOrder ───────────
# Also adds stopImmediatePropagation so no other click listener can interfere.
html = rep(html,
    "d.addEventListener('click',function(ev){ev.stopPropagation(); if(ev.target&&ev.target.dataset&&ev.target.dataset.closeTrade==='1'){ev.preventDefault();closePaperTrade(o.id);return;}",
    "d.addEventListener('click',function(ev){ev.stopPropagation(); if(ev.target&&ev.target.dataset&&ev.target.dataset.closeTrade==='1'){ev.preventDefault();ev.stopImmediatePropagation();closeOrCancelPaperOrder(o.id);return;}",
    "C7: ENTRY X → closeOrCancelPaperOrder"
)

# ── C8: Audit DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702 ────────────────────────
AUDIT_0702 = """
<script id="DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702">
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

  var _selfId = "DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702";
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

  // ── A1. Title Beta 0.702 ─────────────────────────────────────────────────────
  var titleOk = document.title.indexOf("0.702") > -1;
  if(!titleOk) blockers.push("A1: title not 0.702: " + document.title);

  // ── A2. Badge BETA 0.702 ──────────────────────────────────────────────────────
  var badge = document.getElementById("versionBadge");
  var badgeOk = badge && badge.textContent.indexOf("0.702") > -1;
  if(!badgeOk) blockers.push("A2: badge not 0.702");

  // ── A3. Changelog 0.702 at top ────────────────────────────────────────────────
  var changelogOk = typeof window.DVL_CHANGELOG !== "undefined" &&
    window.DVL_CHANGELOG.length > 0 &&
    window.DVL_CHANGELOG[0].note &&
    window.DVL_CHANGELOG[0].note.indexOf("0.702") > -1;
  if(!changelogOk) blockers.push("A3: changelog 0.702 not at top");

  // ── A4. closeOrCancelPaperOrder exists in V2 ─────────────────────────────────
  var hasClose = _v2Src.indexOf("closeOrCancelPaperOrder") > -1;
  if(!hasClose) blockers.push("A4: closeOrCancelPaperOrder missing from V2");

  // ── A5. closeOrCancelPaperOrder splices from state.orders ────────────────────
  var hasSpli = _v2Src.indexOf("state.orders.splice") > -1;
  if(!hasSpli) blockers.push("A5: state.orders.splice missing from closeOrCancelPaperOrder");

  // ── A6. X handler calls closeOrCancelPaperOrder (not closePaperTrade) ────────
  var xCallsNew = _v2Src.indexOf("closeOrCancelPaperOrder(o.id)") > -1;
  if(!xCallsNew) blockers.push("A6: ENTRY X handler does not call closeOrCancelPaperOrder");

  // ── A7. closeOrCancelPaperOrder clears state.drag ────────────────────────────
  var clearsDrag = _v2Src.indexOf("state.drag=null") > -1;
  if(!clearsDrag) blockers.push("A7: closeOrCancelPaperOrder does not null state.drag");

  // ── A8. closeOrCancelPaperOrder clears state.edit ────────────────────────────
  var clearsEdit = _v2Src.indexOf("state.edit=null") > -1;
  if(!clearsEdit) blockers.push("A8: closeOrCancelPaperOrder does not null state.edit");

  // ── A9. closeOrCancelPaperOrder calls DVL_RELEASE_PAPER_LOCK ─────────────────
  var closeClearsLock = (function(){
    var idx = _v2Src.indexOf("function closeOrCancelPaperOrder");
    if(idx < 0) return false;
    var end = _v2Src.indexOf("}", idx);
    return _v2Src.substring(idx, end+1).indexOf("DVL_RELEASE_PAPER_LOCK") > -1;
  })();
  if(!closeClearsLock) blockers.push("A9: closeOrCancelPaperOrder does not call DVL_RELEASE_PAPER_LOCK");

  // ── A10. _isPaperDragTarget excludes dvl-pv2p-close ──────────────────────────
  var guardExcludesClose = _guardSrc.indexOf("dvl-pv2p-close") > -1;
  if(!guardExcludesClose) blockers.push("A10: guard _isPaperDragTarget missing dvl-pv2p-close exclusion");

  // ── A11. Exclusions checked BEFORE drag targets in guard ─────────────────────
  var guardExclFirst = (function(){
    var idx = _guardSrc.indexOf("_isPaperDragTarget");
    var body = _guardSrc.substring(idx, _guardSrc.indexOf("function _activateLock"));
    var closeIdx = body.indexOf("dvl-pv2p-close");
    var hitIdx = body.indexOf("dvl-pv2p-hit");
    return closeIdx > -1 && hitIdx > -1 && closeIdx < hitIdx;
  })();
  if(!guardExclFirst) blockers.push("A11: guard checks exclusions after drag targets (wrong order)");

  // ── A12. X click has stopImmediatePropagation ────────────────────────────────
  var xHasStop = (function(){
    var idx = _v2Src.indexOf("closeOrCancelPaperOrder(o.id)");
    if(idx < 0) return false;
    var before = _v2Src.substring(Math.max(0, idx-200), idx);
    return before.indexOf("stopImmediatePropagation") > -1;
  })();
  if(!xHasStop) blockers.push("A12: ENTRY X click missing stopImmediatePropagation");

  // ── A13. DVL_RELEASE_PAPER_LOCK is a function ─────────────────────────────────
  var releaseOk = typeof window.DVL_RELEASE_PAPER_LOCK === "function";
  if(!releaseOk) blockers.push("A13: window.DVL_RELEASE_PAPER_LOCK not a function");

  // ── A14. Guard lock fix 0701 still present ───────────────────────────────────
  var guardPresent = _cntId(scriptEls, "DVL_PAPER_LOCK_FIX_GUARD_0701") === 1;
  if(!guardPresent) blockers.push("A14: DVL_PAPER_LOCK_FIX_GUARD_0701 missing");

  // ── A15. _onPaperDown has no stopPropagation ──────────────────────────────────
  var noStopProp = _guardSrc.indexOf("ev.stopPropagation()") === -1;
  if(!noStopProp) blockers.push("A15: guard still has ev.stopPropagation in _onPaperDown");

  // ── A16. Guard handles touchend/touchcancel ───────────────────────────────────
  var guardTouch = _guardSrc.indexOf("touchend") > -1 && _guardSrc.indexOf("touchcancel") > -1;
  if(!guardTouch) blockers.push("A16: guard missing touchend/touchcancel");

  // ── A17. startDrag skips X button (data-close-trade check) ───────────────────
  var startSkipsX = _v2Src.indexOf("closeTrade") > -1;
  if(!startSkipsX) blockers.push("A17: pointerdown handler missing close-trade skip");

  // ── A18. TP drag preserved (startDrag in V2) ─────────────────────────────────
  var hasStartDrag = _v2Src.indexOf("function startDrag") > -1 ||
                     _v2Src.indexOf("startDrag(ev)") > -1;
  if(!hasStartDrag) blockers.push("A18: startDrag missing from V2");

  // ── A19. SL drag preserved ───────────────────────────────────────────────────
  var hasSL = _v2Src.indexOf("'sl'") > -1 || _v2Src.indexOf('"sl"') > -1;
  if(!hasSL) blockers.push("A19: SL kind missing from V2");

  // ── A20. ENTRY drag preserved ────────────────────────────────────────────────
  var hasEntry = _v2Src.indexOf("'entry'") > -1 || _v2Src.indexOf('"entry"') > -1;
  if(!hasEntry) blockers.push("A20: entry kind missing from V2");

  // ── A21. TP/SL edit OK/X preserved ──────────────────────────────────────────
  var hasEditOkX = _v2Src.indexOf("confirmTpSlEdit") > -1;
  if(!hasEditOkX) blockers.push("A21: confirmTpSlEdit missing from V2");

  // ── A22. Header leak still fixed ────────────────────────────────────────────
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
  if(!noOrphan) blockers.push("A22: orphan text before .app: " + _orphan.join("|"));

  // ── A23. V2 Pro layer unique ─────────────────────────────────────────────────
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("A23: multiple #dvlPaperLayerV2Pro: " + v2LayerCount);
  if(v2LayerCount < 1) warnings.push("A23: #dvlPaperLayerV2Pro not yet in DOM");

  // ── A24. Legacy paper hidden ─────────────────────────────────────────────────
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("A24: #dvlPaperLayer still visible");

  // ── A25. Final locks 0659-0662 present ───────────────────────────────────────
  var missingLocks = [];
  for(var _fl=0;_fl<FINAL_LOCK_CSS.length;_fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[_fl])!==1) missingLocks.push(FINAL_LOCK_CSS[_fl]);
  }
  if(missingLocks.length > 0) blockers.push("A25: final locks missing: " + missingLocks.join(", "));

  // ── A26. Zero _brokerToken ───────────────────────────────────────────────────
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push("A26: " + _brokerToken + " found in source");

  // ── A27. Zero Real order ─────────────────────────────────────────────────────
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push("A27: " + _realOrder + " found in source");

  // ── A28. No API key in audit module ──────────────────────────────────────────
  var noApiKey = _modSrc.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("A28: apiKey found in audit module");

  // ── A29. drawSoon intact ─────────────────────────────────────────────────────
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn] === "function" ||
                    _srcFull.indexOf("function drawSoon") > -1;
  if(!hasDrawSoon) warnings.push("A29: drawSoon not found");

  var pass = (
    titleOk && badgeOk && changelogOk &&
    hasClose && hasSpli && xCallsNew &&
    clearsDrag && clearsEdit && closeClearsLock &&
    guardExcludesClose && guardExclFirst &&
    xHasStop && releaseOk &&
    guardPresent && noStopProp && guardTouch &&
    startSkipsX && hasStartDrag && hasSL && hasEntry && hasEditOkX &&
    noOrphan && v2LayerCount <= 1 && legacyHidden &&
    missingLocks.length === 0 && noBroker && noRealOrder
  );

  _lastAudit = {
    pass:               pass,
    titleOk:            titleOk,
    badgeOk:            badgeOk,
    changelogOk:        changelogOk,
    hasClose:           hasClose,
    hasSpli:            hasSpli,
    xCallsNew:          xCallsNew,
    clearsDrag:         clearsDrag,
    clearsEdit:         clearsEdit,
    closeClearsLock:    closeClearsLock,
    guardExcludesClose: guardExcludesClose,
    guardExclFirst:     guardExclFirst,
    xHasStop:           xHasStop,
    releaseOk:          releaseOk,
    guardPresent:       guardPresent,
    noStopProp:         noStopProp,
    guardTouch:         guardTouch,
    startSkipsX:        startSkipsX,
    hasStartDrag:       hasStartDrag,
    hasSL:              hasSL,
    hasEntry:           hasEntry,
    hasEditOkX:         hasEditOkX,
    noOrphan:           noOrphan,
    v2LayerCount:       v2LayerCount,
    legacyHidden:       legacyHidden,
    finalLocksOk:       missingLocks.length === 0,
    noBroker:           noBroker,
    noRealOrder:        noRealOrder,
    blockers:           blockers,
    warnings:           warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_ENTRY_CLOSE_AUDIT = {
  VERSION:      "0.702",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    AUDIT_0702 + '\n</body>\n</html>',
    "C8: audit 0702"
)

# ── post-assertions ────────────────────────────────────────────────────────────
def post(cond, msg):
    if not cond:
        print(f"POST-FAIL: {msg}")
        sys.exit(1)

# Version
post('<title>DVL Binance Live — Beta 0.702</title>' in html, 'title not updated')
post('>BETA 0.702</div>' in html, 'badge not updated')
post('const DVL_APP_VERSION = "Beta 0.702"' in html, 'DVL_APP_VERSION not 0.702')
post('"Beta 0.702 — Paper ENTRY close fix' in html, 'changelog 0.702 missing')
post('"Beta 0.701", note: "Beta 0.701 — Paper lock start fix' in html, '0701 not string-literalized')

# C5: guard _isPaperDragTarget
guard_idx = html.index('DVL_PAPER_LOCK_FIX_GUARD_0701')
guard_end = html.index('</script>', guard_idx)
guard_src = html[guard_idx:guard_end]
post('dvl-pv2p-close' in guard_src, 'dvl-pv2p-close not in guard _isPaperDragTarget')
close_idx = guard_src.index('dvl-pv2p-close')
hit_idx   = guard_src.index('dvl-pv2p-hit')
post(close_idx < hit_idx, 'guard: dvl-pv2p-close check comes after dvl-pv2p-hit (wrong order)')
post('ev.stopPropagation()' not in guard_src, 'guard still has ev.stopPropagation()')

# C6: closeOrCancelPaperOrder
post('function closeOrCancelPaperOrder' in html, 'closeOrCancelPaperOrder function missing')
post('state.orders.splice' in html, 'state.orders.splice missing')
post('state.drag=null' in html, 'state.drag=null missing from closeOrCancelPaperOrder')
post('state.edit=null' in html, 'state.edit=null missing from closeOrCancelPaperOrder')

# C7: click handler
post('closeOrCancelPaperOrder(o.id)' in html, 'closeOrCancelPaperOrder not called in click handler')
post('closePaperTrade(o.id)' not in html, 'closePaperTrade(o.id) still in click handler')

# C8: audit
post(html.count('<script id="DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702">') == 1, 'audit 0702 count != 1')
post('window.DVL_ENTRY_CLOSE_AUDIT' in html, 'audit object not exposed')

# Prior modules preserved
post('DVL_PAPER_LOCK_START_FIX_AUDIT_MODULE_0701' in html, '0701 audit missing')
post('<script id="DVL_PAPER_HARD_LOCK_GUARD_0700">' not in html, 'old 0700 guard script tag still present')
post('DVL_PAPER_LOCK_FIX_GUARD_0701' in html, '0701 guard missing')
post('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' in html, 'V2 Pro module missing')
post('DVL_PAPER_LEGACY_SUPPRESSOR_0698' in html, 'legacy suppressor missing')

# Security
_bt = 'Broker' + 'Connector'
post(_bt not in html, 'BrokerConnector found in HTML')

# No timers in audit 0702
a_idx = html.index('DVL_PAPER_ENTRY_CLOSE_AUDIT_MODULE_0702')
a_end = html.index('window.DVL_ENTRY_CLOSE_AUDIT', a_idx)
a_src = html[a_idx:a_end]
post('setTimeout'            not in a_src, 'setTimeout in audit 0702')
post('setInterval'           not in a_src, 'setInterval in audit 0702')
post('requestAnimationFrame' not in a_src, 'requestAnimationFrame in audit 0702')
post('window.drawSoon '      not in a_src, 'window.drawSoon literal in audit 0702')

# ── write ──────────────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Output: {html.count(chr(10))+1} lines (+{html.count(chr(10))+1 - 40067})")
print("All assertions passed. Beta 0.702 ready.")
