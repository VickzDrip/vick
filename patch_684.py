#!/usr/bin/env python3
"""
Beta 0.684 — Paper Draft Entry Selection + Label Alignment Polish
"""
import sys

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index-42.before_0684_paper_draft_label_polish.html"

def rep(html, old, new, label=""):
    cnt = html.count(old)
    if cnt != 1:
        print(f"ERROR rep({label!r}): found {cnt} (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()
with open(BAK, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Backup → {BAK}")

# Pre-checks
_DUP  = '<' + '/style><' + '/style>'
_BRK  = 'Broker' + 'Connector'
assert _DUP not in html
assert _BRK not in html
assert 'Beta 0.683' in html
assert 'var CANDLE_OFFSET = 10;' in html
assert 'function tagLeftPx(pos, chartW, S){' in html
assert 'function dvlSyncTagLeft(){' in html
assert 'state.pendingDraft' in html
print("Pre-checks OK")

# ── C1: CSS_0684 block ────────────────────────────────────────────────────
CSS_0684 = '''\
<style id="DVL_PAPER_DRAFT_LABEL_POLISH_CSS_0684">
/*
  DVL Beta 0.684 — Paper Draft Entry Selection + Label Alignment Polish.
  Draft preview: lower opacity, fixed-size labels, pointer-events:none.
*/

/* Draft ENTRY/TP/SL tag labels: semi-transparent, no pointer interactions */
.dvl-paper-draft-tag {
  opacity:        0.45;
  pointer-events: none !important;
  width:          130px;
  height:         22px;
  border-radius:  3px;
  font-size:      11px;
  overflow:       hidden;
}

/* Draft lines: lower opacity while awaiting confirmation */
.dvl-paper-draft-line {
  opacity: 0.60;
}
</style>

'''

html = rep(html,
    '</style>\n\n<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    '</style>\n\n' + CSS_0684 + '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "CSS_0684")
print("C1 done")

# ── C2: DVL_ORDER_LABEL_OFFSET_BARS near CANDLE_OFFSET ───────────────────
html = rep(html,
    'var CANDLE_OFFSET = 10;',
    'var CANDLE_OFFSET = 10;\nvar DVL_ORDER_LABEL_OFFSET_BARS = 10;\nwindow.DVL_ORDER_LABEL_OFFSET_BARS = DVL_ORDER_LABEL_OFFSET_BARS;',
    "LABEL_OFFSET_BARS")
print("C2 done")

# ── C3: labelLeftPx function after tagLeftPx ──────────────────────────────
LABEL_LEFT_PX_FN = (
    'function labelLeftPx(pos, chartW, S){\n'
    '  var idx = candleIdxForTime(S.candles, Number(pos.createdAt) || 0);\n'
    '  var span = Math.max(0.1, S.view.end - S.view.start);\n'
    '  // 0684: labels offset DVL_ORDER_LABEL_OFFSET_BARS bars right of anchor candle\n'
    '  return (idx + CANDLE_OFFSET + DVL_ORDER_LABEL_OFFSET_BARS - S.view.start + 0.5) * chartW / span;\n'
    '}\n'
    '\n'
)

html = rep(html,
    '  // 0682: raw pixel position — caller hides label when anchor is off-screen\n'
    '  return (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;\n'
    '}\n'
    '\n'
    'function dvlSyncTagLeft(){',
    '  // 0682: raw pixel position — caller hides label when anchor is off-screen\n'
    '  return (idx + CANDLE_OFFSET - S.view.start + 0.5) * chartW / span;\n'
    '}\n'
    '\n'
    + LABEL_LEFT_PX_FN +
    'function dvlSyncTagLeft(){',
    "labelLeftPx")
print("C3 done")

# ── C4: dvlSyncTagLeft → use labelLeftPx + check pendingDraft ────────────
OLD_SYNC = (
    'function dvlSyncTagLeft(){\n'
    '  var layer = document.getElementById(\'dvlPaperLayer\');\n'
    '  if(!layer) return;\n'
    '  var rt = getRuntime();\n'
    '  if(!rt || !rt.state || !rt.state.positions) return;\n'
    '  var positions = rt.state.positions;\n'
    '  var S = window.S;\n'
    '  if(!S || !S.view || !Array.isArray(S.candles) || !S.candles.length) return;\n'
    '  var wrap = document.getElementById(\'chartWrap\');\n'
    '  if(!wrap) return;\n'
    '  var chartW = Math.max(1, wrap.clientWidth - PRICE_SCALE_W);\n'
    '\n'
    '  var tags = layer.querySelectorAll(\'.dvl-paper-tag[data-id]\');\n'
    '  for(var i = 0; i < tags.length; i++){\n'
    '    var tag = tags[i];\n'
    '    if(tag.classList.contains(\'dvl-paper-edit-label-fixed\')) continue;\n'
    '    var posId = tag.dataset.id;\n'
    '    var pos = null;\n'
    '    for(var j = 0; j < positions.length; j++){\n'
    '      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }\n'
    '    }\n'
    '    if(!pos) continue;\n'
    '    var xPx = tagLeftPx(pos, chartW, S);\n'
    '    // 0682: hide label when anchor candle is off-screen; never clamp to viewport\n'
    '    if(xPx < 0 || xPx > chartW){\n'
    '      tag.style.setProperty(\'display\', \'none\', \'important\');\n'
    '    } else {\n'
    '      tag.style.removeProperty(\'display\');\n'
    '      var clampedX = Math.min(xPx, chartW - MAX_TAG_W);\n'
    '      tag.style.setProperty(\'left\',      clampedX.toFixed(1) + \'px\', \'important\');\n'
    '      tag.style.setProperty(\'right\',     \'auto\',                      \'important\');\n'
    '      tag.style.setProperty(\'transform\', \'none\',                      \'important\');\n'
    '    }\n'
    '  }\n'
    '  // 0681/0682: sync .dvl-ls-box X positions; hide when anchor is off-screen\n'
    '  var boxes = layer.querySelectorAll(\'.dvl-ls-box[data-id]\');\n'
    '  for(var bi = 0; bi < boxes.length; bi++){\n'
    '    var box = boxes[bi];\n'
    '    if(box.classList.contains(\'dvl-paper-edit-label-fixed\')) continue;\n'
    '    var bId = box.dataset.id;\n'
    '    var bPos = null;\n'
    '    for(var bj = 0; bj < positions.length; bj++){\n'
    '      if(String(positions[bj].id) === String(bId)){ bPos = positions[bj]; break; }\n'
    '    }\n'
    '    if(!bPos) continue;\n'
    '    var bX = tagLeftPx(bPos, chartW, S);\n'
    '    if(bX < 0 || bX > chartW){\n'
    '      box.style.setProperty(\'display\', \'none\', \'important\');\n'
    '    } else {\n'
    '      box.style.removeProperty(\'display\');\n'
    '      box.style.setProperty(\'left\', bX.toFixed(1) + \'px\', \'important\');\n'
    '    }\n'
    '  }\n'
    '}'
)

NEW_SYNC = (
    'function dvlSyncTagLeft(){\n'
    '  var layer = document.getElementById(\'dvlPaperLayer\');\n'
    '  if(!layer) return;\n'
    '  var rt = getRuntime();\n'
    '  if(!rt || !rt.state || !rt.state.positions) return;\n'
    '  var positions = rt.state.positions;\n'
    '  var pendingDraft = rt.state.pendingDraft || null;\n'
    '  var S = window.S;\n'
    '  if(!S || !S.view || !Array.isArray(S.candles) || !S.candles.length) return;\n'
    '  var wrap = document.getElementById(\'chartWrap\');\n'
    '  if(!wrap) return;\n'
    '  var chartW = Math.max(1, wrap.clientWidth - PRICE_SCALE_W);\n'
    '\n'
    '  var tags = layer.querySelectorAll(\'.dvl-paper-tag[data-id]\');\n'
    '  for(var i = 0; i < tags.length; i++){\n'
    '    var tag = tags[i];\n'
    '    if(tag.classList.contains(\'dvl-paper-edit-label-fixed\')) continue;\n'
    '    var posId = tag.dataset.id;\n'
    '    var pos = null;\n'
    '    for(var j = 0; j < positions.length; j++){\n'
    '      if(String(positions[j].id) === String(posId)){ pos = positions[j]; break; }\n'
    '    }\n'
    '    // 0684: also resolve draft labels\n'
    '    if(!pos && pendingDraft && String(pendingDraft.id) === String(posId)) pos = pendingDraft;\n'
    '    if(!pos) continue;\n'
    '    var xPx = labelLeftPx(pos, chartW, S);\n'
    '    // 0682: hide label when anchor candle is off-screen; never clamp to viewport\n'
    '    if(xPx < 0 || xPx > chartW){\n'
    '      tag.style.setProperty(\'display\', \'none\', \'important\');\n'
    '    } else {\n'
    '      tag.style.removeProperty(\'display\');\n'
    '      var clampedX = Math.min(xPx, chartW - MAX_TAG_W);\n'
    '      tag.style.setProperty(\'left\',      clampedX.toFixed(1) + \'px\', \'important\');\n'
    '      tag.style.setProperty(\'right\',     \'auto\',                      \'important\');\n'
    '      tag.style.setProperty(\'transform\', \'none\',                      \'important\');\n'
    '    }\n'
    '  }\n'
    '  // 0681/0682/0684: sync .dvl-ls-box X positions; hide when anchor is off-screen\n'
    '  var boxes = layer.querySelectorAll(\'.dvl-ls-box[data-id]\');\n'
    '  for(var bi = 0; bi < boxes.length; bi++){\n'
    '    var box = boxes[bi];\n'
    '    if(box.classList.contains(\'dvl-paper-edit-label-fixed\')) continue;\n'
    '    var bId = box.dataset.id;\n'
    '    var bPos = null;\n'
    '    for(var bj = 0; bj < positions.length; bj++){\n'
    '      if(String(positions[bj].id) === String(bId)){ bPos = positions[bj]; break; }\n'
    '    }\n'
    '    // 0684: also resolve draft boxes\n'
    '    if(!bPos && pendingDraft && String(pendingDraft.id) === String(bId)) bPos = pendingDraft;\n'
    '    if(!bPos) continue;\n'
    '    var bX = labelLeftPx(bPos, chartW, S);\n'
    '    if(bX < 0 || bX > chartW){\n'
    '      box.style.setProperty(\'display\', \'none\', \'important\');\n'
    '    } else {\n'
    '      box.style.removeProperty(\'display\');\n'
    '      box.style.setProperty(\'left\', bX.toFixed(1) + \'px\', \'important\');\n'
    '    }\n'
    '  }\n'
    '}'
)

html = rep(html, OLD_SYNC, NEW_SYNC, "dvlSyncTagLeft")
print("C4 done")

# ── C5: draft helpers + renderDraftPosition before render() ───────────────
DRAFT_HELPERS = (
    '    // 0684: draft position rendering constants and helpers\n'
    '    var ORDER_TAG_W      = 130;\n'
    '    var ORDER_TAG_H      = 22;\n'
    '    var ORDER_TAG_RADIUS = 3;\n'
    '    var ORDER_TAG_FONT   = 11;\n'
    '\n'
    '    function makeDraftLine(draft, handle, y){\n'
    '      var visual = document.createElement("div");\n'
    '      visual.className = "dvl-paper-line " + handle + " dvl-paper-draft-line";\n'
    '      visual.dataset.status = "draft";\n'
    '      visual.dataset.id = draft.id;\n'
    '      visual.style.top = y.toFixed(1) + "px";\n'
    '      visual.style.pointerEvents = "none";\n'
    '      layer.appendChild(visual);\n'
    '    }\n'
    '\n'
    '    function makeDraftTag(draft, handle, y, main){\n'
    '      var el = document.createElement("div");\n'
    '      el.className = "dvl-paper-tag " + handle + " dvl-paper-draft-tag";\n'
    '      el.dataset.status = "draft";\n'
    '      el.dataset.id = draft.id;\n'
    '      el.dataset.handle = handle;\n'
    '      el.style.top = (y - 19).toFixed(1) + "px";\n'
    '      el.style.width        = ORDER_TAG_W      + "px";\n'
    '      el.style.height       = ORDER_TAG_H      + "px";\n'
    '      el.style.borderRadius = ORDER_TAG_RADIUS + "px";\n'
    '      el.style.fontSize     = ORDER_TAG_FONT   + "px";\n'
    '      el.innerHTML = \'<span class="txt"><span class="main">\' + main + \'</span></span>\';\n'
    '      layer.appendChild(el);\n'
    '    }\n'
    '\n'
    '    function renderDraftConfirm(draft){\n'
    '      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });\n'
    '      if(!draft) return;\n'
    '\n'
    '      var entryY = yPrice(draft.entry);\n'
    '      if(!entryY) return;\n'
    '\n'
    '      var si = scaleInfo();\n'
    '      var minTop = si ? Math.max(si.top + 4, 4) : 4;\n'
    '      var maxTop = si ? Math.max(minTop, si.bottom - 24) : Math.max(minTop, (dom.wrap ? dom.wrap.clientHeight - 42 : 420));\n'
    '      var topPx = clamp(entryY.y + 18, minTop, maxTop);\n'
    '\n'
    '      var rect = dom.wrap ? dom.wrap.getBoundingClientRect() : {top:0, right:window.innerWidth};\n'
    '      var fixedTop   = clamp(rect.top + topPx, 4, Math.max(4, window.innerHeight - 34));\n'
    '      var fixedRight = clamp(window.innerWidth - rect.right + 56, 6, Math.max(6, window.innerWidth - 34));\n'
    '\n'
    '      var confirmBox = document.createElement("div");\n'
    '      confirmBox.className = "dvl-paper-edit-confirm dvl-paper-edit-confirm-fixed dvl-paper-draft-confirm-fixed";\n'
    '      confirmBox.dataset.id = draft.id;\n'
    '      confirmBox.style.top   = fixedTop.toFixed(1)   + "px";\n'
    '      confirmBox.style.right = fixedRight.toFixed(1) + "px";\n'
    '      confirmBox.innerHTML =\n'
    '        \'<button class="dvl-paper-confirm ok" type="button">✓</button>\' +\n'
    '        \'<button class="dvl-paper-confirm cancel" type="button">×</button>\';\n'
    '\n'
    '      confirmBox.querySelectorAll(".dvl-paper-confirm").forEach(function(btn){\n'
    '        btn.addEventListener("pointerdown", function(ev){\n'
    '          ev.preventDefault();\n'
    '          ev.stopPropagation();\n'
    '          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
    '        }, {passive:false});\n'
    '        btn.addEventListener("touchstart", function(ev){\n'
    '          ev.stopPropagation();\n'
    '        }, {passive:true});\n'
    '      });\n'
    '\n'
    '      confirmBox.querySelector(".ok").addEventListener("click", function(ev){\n'
    '        ev.preventDefault();\n'
    '        ev.stopPropagation();\n'
    '        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
    '        confirmPendingOrderDraft(draft.id);\n'
    '      });\n'
    '\n'
    '      confirmBox.querySelector(".cancel").addEventListener("click", function(ev){\n'
    '        ev.preventDefault();\n'
    '        ev.stopPropagation();\n'
    '        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
    '        cancelPendingOrderDraft(draft.id);\n'
    '      });\n'
    '\n'
    '      document.body.appendChild(confirmBox);\n'
    '    }\n'
    '\n'
    '    function renderDraftPosition(draft){\n'
    '      if(!draft) return;\n'
    '\n'
    '      var entryY = yPrice(draft.entry);\n'
    '      var tpY    = yPrice(draft.tp);\n'
    '      var slY    = yPrice(draft.sl);\n'
    '\n'
    '      if(entryY) makeDraftLine(draft, "entry", entryY.y);\n'
    '      if(tpY)    makeDraftLine(draft, "tp",    tpY.y);\n'
    '      if(slY)    makeDraftLine(draft, "sl",    slY.y);\n'
    '\n'
    '      if(entryY) makeDraftTag(draft, "entry", entryY.y, "ENTRY");\n'
    '      if(tpY)    makeDraftTag(draft, "tp",    tpY.y,    "TP");\n'
    '      if(slY)    makeDraftTag(draft, "sl",    slY.y,    "SL");\n'
    '\n'
    '      renderDraftConfirm(draft);\n'
    '    }\n'
    '\n'
)

html = rep(html,
    '      document.body.appendChild(box);\n'
    '    }\n'
    '\n'
    '    function render(){\n'
    '      if(!layer) return;\n',
    '      document.body.appendChild(box);\n'
    '    }\n'
    '\n'
    + DRAFT_HELPERS +
    '    function render(){\n'
    '      if(!layer) return;\n',
    "draft helpers")
print("C5 done")

# ── C6: render() calls renderDraftPosition ───────────────────────────────
html = rep(html,
    '      layer.innerHTML = "";\n'
    '      state.positions.slice().forEach(renderPosition);\n'
    '      renderEditConfirm();\n'
    '      updateLiq();',
    '      layer.innerHTML = "";\n'
    '      state.positions.slice().forEach(renderPosition);\n'
    '      // 0684: render draft ENTRY/TP/SL preview\n'
    '      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });\n'
    '      if(state.pendingDraft){ renderDraftPosition(state.pendingDraft); }\n'
    '      renderEditConfirm();\n'
    '      updateLiq();',
    "render() draft call")
print("C6 done")

# ── C7: version bump ─────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.683</title>',
    '<title>DVL Binance Live — Beta 0.684</title>',
    "title")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.683";',
    'const DVL_APP_VERSION = "Beta 0.684";',
    "DVL_APP_VERSION")
html = rep(html,
    '>BETA 0.683<',
    '>BETA 0.684<',
    "versionBadge")
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.683 — HTML/CSS structure hotfix',
    '{ version: DVL_APP_VERSION, note: "Beta 0.684 — Paper Draft Entry Selection + Label Alignment Polish: draft Limit/Stop plots ENTRY/TP/SL immediately, labels 10 bars right of anchor, reduced opacity, fixed size, pointer-events:none." },\n'
    '  { version: "Beta 0.683", note: "Beta 0.683 — HTML/CSS structure hotfix',
    "changelog")
print("C7 done")

# ── C8: audit module ─────────────────────────────────────────────────────
MOD_ANCHOR = '})();\n</script>\n\n</head>\n<body>'

MOD_0684 = '''\
<script id="DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT_MODULE_0684">
(function(){
"use strict";

var _lastAudit = null;

// Anti-false-positive splits
var _dupStyleTag   = '<' + '/style><' + '/style>';
var _brokerToken   = 'Broker' + 'Connector';

var STYLE_IDS_0684 = [
  "DVL_BUTTON_SYSTEM_SHIM_REMOVAL_CSS_0675",
  "DVL_AUDIT_CHAIN_RECONCILIATION_CSS_0676",
  "DVL_POST_CLEANUP_INVENTORY_CSS_0677",
  "DVL_SAFE_HISTORICAL_AUDIT_CLEANUP_CSS_0678",
  "DVL_OPTIMIZED_BASELINE_FREEZE_CSS_0679",
  "DVL_RELEASE_CANDIDATE_GATE_CSS_0680",
  "DVL_MOBILE_UI_POLISH_CSS_0681",
  "DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682",
  "DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683",
  "DVL_PAPER_DRAFT_LABEL_POLISH_CSS_0684"
];

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c = 0;
  for(var i = 0; i < els.length; i++){ if(els[i].id === id) c++; }
  return c;
}

function _fnSrc(full, fnName){
  var start = full.indexOf("function " + fnName);
  if(start === -1) return "";
  var end = full.indexOf("\\n    function ", start + 10);
  return end === -1 ? full.slice(start) : full.slice(start, end);
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si = 0; si < _allScripts.length; si++){ _srcFull += _allScripts[si].textContent; }

  // A1. All style markers 0675-0684 present 1x each
  var allStylesOk = true;
  var styleProblems = [];
  for(var ci = 0; ci < STYLE_IDS_0684.length; ci++){
    var ccnt = _cntId(styleEls, STYLE_IDS_0684[ci]);
    if(ccnt !== 1){ allStylesOk = false; styleProblems.push(STYLE_IDS_0684[ci] + ":" + ccnt); }
  }
  if(!allStylesOk) blockers.push("style count problems: " + styleProblems.join(", "));

  // A2. No duplicate closing style tag
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate closing style tag found");

  // A3. Header .top exists
  var headerEl = document.querySelector('header.top, .top');
  var headerOk = !!headerEl;
  if(!headerOk) blockers.push(".top not found");

  // A4. No raw code text nodes before .top
  var headerLeakFixed = true;
  if(headerEl && document.body){
    var node = document.body.firstChild;
    while(node && node !== headerEl && node !== headerEl.parentElement){
      if(node.nodeType === 3){
        var ntxt = (node.textContent || "").trim();
        if(ntxt && /[)();{}]|function|return|const|let|var/.test(ntxt)){
          headerLeakFixed = false;
          blockers.push("code leak before .top: " + ntxt.slice(0, 40));
        }
      }
      node = node.nextSibling;
    }
  }

  // A5. Final locks 0659-0662 each present 1x
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // A6. DVL_BUTTON_SYSTEM present
  var btnSysPresent = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnSysPresent) blockers.push("window.DVL_BUTTON_SYSTEM not found");

  // A7. state.pendingDraft in source
  var hasPendingDraft = _srcFull.indexOf("pendingDraft") > -1;
  if(!hasPendingDraft) blockers.push("pendingDraft not found in source");

  // A8. createPendingOrderDraft does NOT call createPosition
  var draftFnSrc       = _fnSrc(_srcFull, "createPendingOrderDraft");
  var draftNoCreatePos = draftFnSrc.indexOf("createPosition") === -1;
  if(!draftNoCreatePos) blockers.push("createPendingOrderDraft still calls createPosition");

  // A9. createPendingOrderDraft does NOT push to positions
  var draftNoPush = draftFnSrc.indexOf("state.positions.push") === -1;
  if(!draftNoPush) blockers.push("createPendingOrderDraft still calls state.positions.push");

  // A10. confirmPendingOrderDraft exists
  var confirmExists = _srcFull.indexOf("function confirmPendingOrderDraft") > -1;
  if(!confirmExists) blockers.push("confirmPendingOrderDraft not found");

  // A11. confirmPendingOrderDraft sets status:"pending"
  var confirmFnSrc   = _fnSrc(_srcFull, "confirmPendingOrderDraft");
  var confirmPending = confirmFnSrc.indexOf('status: "pending"') > -1;
  if(!confirmPending) blockers.push('confirmPendingOrderDraft does not set status:"pending"');

  // A12. cancelPendingOrderDraft clears pendingDraft
  var cancelFnSrc  = _fnSrc(_srcFull, "cancelPendingOrderDraft");
  var cancelClears = cancelFnSrc.indexOf("pendingDraft = null") > -1;
  if(!cancelClears) warnings.push("cancelPendingOrderDraft doesn't clear pendingDraft");

  // A13. Module 0682 preserved
  var m682Present = _cntId(scriptEls, "DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682") === 1;
  if(!m682Present) blockers.push("DVL_MOBILE_UI_POLISH_HOTFIX_AUDIT_MODULE_0682 not found");

  // A14. Module 0683 preserved
  var m683Present = _cntId(scriptEls, "DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683") === 1;
  if(!m683Present) blockers.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT_MODULE_0683 not found");

  // A15. CSS 0681 present 1x
  var css681 = _cntId(styleEls, "DVL_MOBILE_UI_POLISH_CSS_0681") === 1;
  if(!css681) warnings.push("DVL_MOBILE_UI_POLISH_CSS_0681 not 1x");

  // A16. CSS 0682 present 1x
  var css682 = _cntId(styleEls, "DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682") === 1;
  if(!css682) warnings.push("DVL_MOBILE_UI_POLISH_HOTFIX_CSS_0682 not 1x");

  // A17. CSS 0683 present 1x
  var css683 = _cntId(styleEls, "DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683") === 1;
  if(!css683) warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_CSS_0683 not 1x");

  // A18. DVL_ORDER_LABEL_OFFSET_BARS defined in source
  var labelOffsetBars = _srcFull.indexOf("DVL_ORDER_LABEL_OFFSET_BARS") > -1;
  if(!labelOffsetBars) blockers.push("DVL_ORDER_LABEL_OFFSET_BARS not found in source");

  // A19. labelLeftPx function defined
  var labelLeftPxPresent = _srcFull.indexOf("function labelLeftPx") > -1;
  if(!labelLeftPxPresent) blockers.push("labelLeftPx function not found in source");

  // A20. labelLeftPx uses CANDLE_OFFSET + DVL_ORDER_LABEL_OFFSET_BARS
  var labelPxUsesOffset = _srcFull.indexOf("CANDLE_OFFSET + DVL_ORDER_LABEL_OFFSET_BARS") > -1;
  if(!labelPxUsesOffset) warnings.push("labelLeftPx does not use CANDLE_OFFSET + DVL_ORDER_LABEL_OFFSET_BARS");

  // A21. dvlSyncTagLeft uses labelLeftPx (not tagLeftPx) for tag/box positioning
  var _dvlSyncStart = _srcFull.indexOf("function dvlSyncTagLeft");
  var _dvlSyncEnd   = _srcFull.indexOf("function attachLayerObserver", _dvlSyncStart + 10);
  var dvlSyncSrc    = _dvlSyncStart > -1
    ? (_dvlSyncEnd > -1 ? _srcFull.slice(_dvlSyncStart, _dvlSyncEnd) : _srcFull.slice(_dvlSyncStart, _dvlSyncStart + 3000))
    : "";
  var syncUsesLabelPx = dvlSyncSrc.indexOf("labelLeftPx(pos, chartW, S)") > -1 ||
                        dvlSyncSrc.indexOf("labelLeftPx(bPos, chartW, S)") > -1;
  if(!syncUsesLabelPx) blockers.push("dvlSyncTagLeft does not use labelLeftPx");

  // A22. dvlSyncTagLeft checks pendingDraft
  var syncChecksDraft = dvlSyncSrc.indexOf("pendingDraft") > -1;
  if(!syncChecksDraft) warnings.push("dvlSyncTagLeft does not check pendingDraft");

  // A23. renderDraftPosition defined
  var renderDraftFnSrc  = _fnSrc(_srcFull, "renderDraftPosition");
  var renderDraftPresent = renderDraftFnSrc.length > 0;
  if(!renderDraftPresent) blockers.push("renderDraftPosition not found in source");

  // A24. renderDraftPosition calls makeDraftLine
  var draftCallsLine = renderDraftFnSrc.indexOf("makeDraftLine") > -1;
  if(!draftCallsLine) blockers.push("renderDraftPosition does not call makeDraftLine");

  // A25. renderDraftPosition calls makeDraftTag
  var draftCallsTag = renderDraftFnSrc.indexOf("makeDraftTag") > -1;
  if(!draftCallsTag) blockers.push("renderDraftPosition does not call makeDraftTag");

  // A26. render() calls renderDraftPosition(state.pendingDraft)
  var renderCallsDraft = _srcFull.indexOf("renderDraftPosition(state.pendingDraft)") > -1;
  if(!renderCallsDraft) blockers.push("render() does not call renderDraftPosition(state.pendingDraft)");

  // A27. dvl-paper-draft-tag in CSS_0684
  var css684El  = document.getElementById("DVL_PAPER_DRAFT_LABEL_POLISH_CSS_0684");
  var css684Txt = css684El ? css684El.textContent : "";
  var hasDraftTagCSS = css684Txt.indexOf("dvl-paper-draft-tag") > -1;
  if(!hasDraftTagCSS) blockers.push("dvl-paper-draft-tag not found in CSS_0684");

  // A28. pointer-events in CSS_0684
  var hasPointerNone684 = css684Txt.indexOf("pointer-events") > -1;
  if(!hasPointerNone684) blockers.push("pointer-events not found in CSS_0684");

  // A29. Draft label opacity (0.38-0.55) in CSS_0684
  var hasDraftLabelOpacity = /opacity:\s*0\.[3-5]/.test(css684Txt);
  if(!hasDraftLabelOpacity) warnings.push("draft label opacity (0.38-0.55) not found in CSS_0684");

  // A30. Draft line opacity 0.60 in CSS_0684
  var hasDraftLineOpacity = css684Txt.indexOf("0.60") > -1 || css684Txt.indexOf("0.6;") > -1;
  if(!hasDraftLineOpacity) warnings.push("draft line opacity 0.60 not found in CSS_0684");

  // A31. ORDER_TAG_W constant defined
  var hasTagW = _srcFull.indexOf("ORDER_TAG_W") > -1;
  if(!hasTagW) blockers.push("ORDER_TAG_W not found");

  // A32. ORDER_TAG_H constant defined
  var hasTagH = _srcFull.indexOf("ORDER_TAG_H") > -1;
  if(!hasTagH) blockers.push("ORDER_TAG_H not found");

  // A33. ORDER_TAG_RADIUS constant defined
  var hasTagRadius = _srcFull.indexOf("ORDER_TAG_RADIUS") > -1;
  if(!hasTagRadius) blockers.push("ORDER_TAG_RADIUS not found");

  // A34. ORDER_TAG_FONT constant defined
  var hasTagFont = _srcFull.indexOf("ORDER_TAG_FONT") > -1;
  if(!hasTagFont) blockers.push("ORDER_TAG_FONT not found");

  // A35. makeDraftLine sets dataset.status = "draft"
  var draftLineSrc      = _fnSrc(_srcFull, "makeDraftLine");
  var draftLineSetsDraft = draftLineSrc.indexOf('dataset.status = "draft"') > -1;
  if(!draftLineSetsDraft) warnings.push('makeDraftLine does not set dataset.status="draft"');

  // A36. makeDraftTag sets dataset.status = "draft"
  var draftTagSrc       = _fnSrc(_srcFull, "makeDraftTag");
  var draftTagSetsDraft = draftTagSrc.indexOf('dataset.status = "draft"') > -1;
  if(!draftTagSetsDraft) warnings.push('makeDraftTag does not set dataset.status="draft"');

  // A37. renderDraftConfirm appends to document.body
  var draftConfirmSrc     = _fnSrc(_srcFull, "renderDraftConfirm");
  var draftConfirmAppends = draftConfirmSrc.indexOf("document.body.appendChild") > -1;
  if(!draftConfirmAppends) warnings.push("renderDraftConfirm does not append to document.body");

  // A38. 0683 audit chain still passes
  var chain683Pass = false;
  try{
    if(typeof window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT !== "undefined"){
      var r683 = window.DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit();
      chain683Pass = !!(r683 && r683.pass === true);
    }
  }catch(e){ warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit() threw: " + e.message); }
  if(!chain683Pass) warnings.push("DVL_HTML_CSS_STRUCTURE_HOTFIX_AUDIT.audit().pass not true");

  // Zero _brokerToken in source (split string above avoids false-positive)
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found");

  var pass = (
    allStylesOk &&
    noDupStyle &&
    headerOk &&
    headerLeakFixed &&
    finalLocksPresent &&
    btnSysPresent &&
    hasPendingDraft &&
    draftNoCreatePos &&
    draftNoPush &&
    confirmExists &&
    confirmPending &&
    m682Present &&
    m683Present &&
    labelOffsetBars &&
    labelLeftPxPresent &&
    syncUsesLabelPx &&
    renderDraftPresent &&
    draftCallsLine &&
    draftCallsTag &&
    renderCallsDraft &&
    hasDraftTagCSS &&
    hasPointerNone684 &&
    hasTagW &&
    hasTagH &&
    hasTagRadius &&
    hasTagFont &&
    noBroker
  );

  _lastAudit = {
    pass:                 pass,
    allStylesOk:          allStylesOk,
    noDupStyle:           noDupStyle,
    headerOk:             headerOk,
    headerLeakFixed:      headerLeakFixed,
    finalLocksPresent:    finalLocksPresent,
    btnSysPresent:        btnSysPresent,
    hasPendingDraft:      hasPendingDraft,
    draftNoCreatePos:     draftNoCreatePos,
    draftNoPush:          draftNoPush,
    confirmExists:        confirmExists,
    confirmPending:       confirmPending,
    cancelClears:         cancelClears,
    m682Present:          m682Present,
    m683Present:          m683Present,
    css681:               css681,
    css682:               css682,
    css683:               css683,
    labelOffsetBars:      labelOffsetBars,
    labelLeftPxPresent:   labelLeftPxPresent,
    labelPxUsesOffset:    labelPxUsesOffset,
    syncUsesLabelPx:      syncUsesLabelPx,
    syncChecksDraft:      syncChecksDraft,
    renderDraftPresent:   renderDraftPresent,
    draftCallsLine:       draftCallsLine,
    draftCallsTag:        draftCallsTag,
    renderCallsDraft:     renderCallsDraft,
    hasDraftTagCSS:       hasDraftTagCSS,
    hasPointerNone684:    hasPointerNone684,
    hasDraftLabelOpacity: hasDraftLabelOpacity,
    hasDraftLineOpacity:  hasDraftLineOpacity,
    hasTagW:              hasTagW,
    hasTagH:              hasTagH,
    hasTagRadius:         hasTagRadius,
    hasTagFont:           hasTagFont,
    draftLineSetsDraft:   draftLineSetsDraft,
    draftTagSetsDraft:    draftTagSetsDraft,
    draftConfirmAppends:  draftConfirmAppends,
    chain683Pass:         chain683Pass,
    noBroker:             noBroker,
    blockers:             blockers,
    warnings:             warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT = {
  VERSION:      "0.684",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>

'''

html = rep(html, MOD_ANCHOR, '})();\n</script>\n\n' + MOD_0684 + '</head>\n<body>', "audit_0684")
print("C8 done")

# ── Post-patch assertions ─────────────────────────────────────────────────
_DUP = '<' + '/style><' + '/style>'
_BRK = 'Broker' + 'Connector'

assert _DUP not in html,                                    "POST: dup style tag"
assert _BRK not in html,                                    "POST: BrokerConnector"
assert 'id="DVL_PAPER_DRAFT_LABEL_POLISH_CSS_0684"' in html, "POST: CSS_0684 marker"
assert 'var DVL_ORDER_LABEL_OFFSET_BARS = 10;' in html,    "POST: LABEL_OFFSET_BARS"
assert 'function labelLeftPx(pos, chartW, S){' in html,    "POST: labelLeftPx"
assert 'CANDLE_OFFSET + DVL_ORDER_LABEL_OFFSET_BARS' in html, "POST: offset expression"
assert 'labelLeftPx(pos, chartW, S)' in html,              "POST: labelLeftPx in sync"
assert 'pendingDraft' in html,                             "POST: pendingDraft"
assert 'function renderDraftPosition(draft){' in html,     "POST: renderDraftPosition"
assert 'renderDraftPosition(state.pendingDraft)' in html,  "POST: render() draft call"
assert 'function makeDraftLine(draft, handle, y){' in html, "POST: makeDraftLine"
assert 'function makeDraftTag(draft, handle, y, main){' in html, "POST: makeDraftTag"
assert 'function renderDraftConfirm(draft){' in html,      "POST: renderDraftConfirm"
assert 'dvl-paper-draft-tag' in html,                      "POST: draft-tag CSS class"
assert 'pointer-events' in html,                           "POST: pointer-events"
assert 'dvl-paper-draft-line' in html,                     "POST: draft-line CSS class"
assert 'ORDER_TAG_W' in html,                              "POST: ORDER_TAG_W"
assert 'ORDER_TAG_H' in html,                              "POST: ORDER_TAG_H"
assert 'ORDER_TAG_RADIUS' in html,                         "POST: ORDER_TAG_RADIUS"
assert 'ORDER_TAG_FONT' in html,                           "POST: ORDER_TAG_FONT"
assert 'id="DVL_PAPER_DRAFT_LABEL_POLISH_AUDIT_MODULE_0684"' in html, "POST: audit module"
assert 'Beta 0.684' in html,                               "POST: version 0.684"
assert 'Beta 0.683' in html,                               "POST: 0.683 in changelog"
assert 'function tagLeftPx(pos, chartW, S){' in html,      "POST: tagLeftPx preserved"

# Verify dvlSyncTagLeft does NOT use tagLeftPx directly (should use labelLeftPx)
_sync_start = html.find('function dvlSyncTagLeft(){')
_sync_end   = html.find('/* ── MutationObserver', _sync_start + 10)
_sync_src   = html[_sync_start:_sync_end] if _sync_end > _sync_start else ""
assert 'tagLeftPx' not in _sync_src, "POST: dvlSyncTagLeft still uses tagLeftPx"

print("Post-patch assertions: ALL PASSED")

# ── Write ─────────────────────────────────────────────────────────────────
with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

lines = html.count('\n') + 1
print(f"Wrote {SRC}  ({lines} lines)")
print("Beta 0.684 — Paper Draft Entry Selection + Label Alignment Polish — DONE.")
