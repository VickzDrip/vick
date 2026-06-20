"""
DVL Binance Live — Beta 0.687 patch
Hotfix: draft confirm buttons removed by renderEditConfirm
"""
import os, sys, shutil

SRC = "/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count != 1:
        print(f"FAIL [{label}]: found {count}x (expected 1)")
        sys.exit(1)
    return html.replace(old, new, 1)

with open(SRC, "r", encoding="utf-8") as f:
    html = f.read()

orig_lines = len(html.splitlines())
print(f"Input: {orig_lines} lines")

backup = SRC.replace("index.html", "index-45.before_0687_draft_confirm_hotfix.html")
shutil.copy2(SRC, backup)
print(f"Backup: {backup}")

# ═══════════════════════════════════════════════════════════════════════════════
# C1 — Version: DVL_APP_VERSION
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.686";',
    'const DVL_APP_VERSION = "Beta 0.687";',
    "C1-version-constant"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C2 — Version: <title>
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<title>DVL Binance Live — Beta 0.686</title>',
    '<title>DVL Binance Live — Beta 0.687</title>',
    "C2-title"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C3 — Version: header badge
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '">BETA 0.686</div>',
    '">BETA 0.687</div>',
    "C3-badge"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C4 — Changelog entry
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.686 — Paper Trading Placement Flow Fix: draft spawns at current price, ENTRY draggable, pending orders cancelable with ×, labels centered on lines." },\n  { version: "Beta 0.685",',
    '  { version: DVL_APP_VERSION, note: "Beta 0.687 — Hotfix: draft Limit/Stop confirm (✓/×) buttons now appear correctly; render() calls renderEditConfirm before renderDraftPosition so draft confirm buttons are not immediately cleared." },\n  { version: "Beta 0.686", note: "Beta 0.686 — Paper Trading Placement Flow Fix: draft spawns at current price, ENTRY draggable, pending orders cancelable with ×, labels centered on lines." },\n  { version: "Beta 0.685",',
    "C4-changelog"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C5 — CSS marker 0687
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    '<style id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686">',
    '<style id="DVL_DRAFT_CONFIRM_HOTFIX_CSS_0687">\n/*\n  DVL Beta 0.687 — Draft Confirm Hotfix.\n  render() now calls renderEditConfirm() before renderDraftPosition() so that\n  renderEditConfirm does not remove the draft confirm buttons added by renderDraftConfirm.\n  No DOM/CSS changes required; this marker records the beta boundary.\n*/\n</style>\n\n<style id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686">',
    "C5-css-0687"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C6 — Fix render(): call renderEditConfirm BEFORE renderDraftPosition
# Root bug: renderEditConfirm removes ALL .dvl-paper-edit-confirm-fixed elements,
# including the draft confirm buttons just appended by renderDraftConfirm.
# Fix: swap order so draft confirm is appended AFTER renderEditConfirm clears.
# ═══════════════════════════════════════════════════════════════════════════════
html = rep(html,
    (
        '      layer.innerHTML = "";\n'
        '      state.positions.slice().forEach(renderPosition);\n'
        '      // 0684: render draft ENTRY/TP/SL preview\n'
        '      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });\n'
        '      if(state.pendingDraft){ renderDraftPosition(state.pendingDraft); }\n'
        '      renderEditConfirm();\n'
        '      updateLiq();\n'
        '    }'
    ),
    (
        '      layer.innerHTML = "";\n'
        '      state.positions.slice().forEach(renderPosition);\n'
        '      // 0687: renderEditConfirm FIRST — clears .dvl-paper-edit-confirm-fixed before draft appends its own\n'
        '      renderEditConfirm();\n'
        '      // draft confirm appended AFTER renderEditConfirm so it is not immediately removed\n'
        '      document.querySelectorAll(".dvl-paper-draft-confirm-fixed").forEach(function(el){ el.remove(); });\n'
        '      if(state.pendingDraft){ renderDraftPosition(state.pendingDraft); }\n'
        '      updateLiq();\n'
        '    }'
    ),
    "C6-render-order-fix"
)

# ═══════════════════════════════════════════════════════════════════════════════
# C7 — Audit module 0687 (insert before </head>)
# ═══════════════════════════════════════════════════════════════════════════════
_AUDIT_0687 = r'''
<script id="DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687">
(function(){
"use strict";

var _lastAudit = null;

var _dupStyleTag = '<' + '/style><' + '/style>';
var _brokerToken = 'Broker' + 'Connector';

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
  var end = full.indexOf("\n    function ", start + 10);
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

  var _mod687 = document.getElementById("DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687");
  var _mod687src = _mod687 ? _mod687.textContent : "";

  // A1. CSS_0687 present 1x
  var css687Present = _cntId(styleEls, "DVL_DRAFT_CONFIRM_HOTFIX_CSS_0687") === 1;
  if(!css687Present) blockers.push("DVL_DRAFT_CONFIRM_HOTFIX_CSS_0687 not found");

  // A2. Audit module 0687 present 1x
  var mod687Present = _cntId(scriptEls, "DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687") === 1;
  if(!mod687Present) blockers.push("DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687 not 1x");

  // A3. No duplicate closing style tag
  var noDupStyle = document.documentElement.outerHTML.indexOf(_dupStyleTag) === -1;
  if(!noDupStyle) blockers.push("duplicate closing style tag found");

  // A4. Version is "Beta 0.687"
  var versionOk = (typeof window.DVL_APP_VERSION !== "undefined") && window.DVL_APP_VERSION === "Beta 0.687";
  if(!versionOk) blockers.push("DVL_APP_VERSION !== 'Beta 0.687' (got: " + window.DVL_APP_VERSION + ")");

  // A5. render() calls renderEditConfirm BEFORE renderDraftPosition (key fix)
  var renderSrc = _fnSrc(_srcFull, "render");
  var editConfirmIdx = renderSrc.indexOf("renderEditConfirm()");
  var draftPosIdx    = renderSrc.indexOf("renderDraftPosition");
  var renderOrderOk  = editConfirmIdx > -1 && draftPosIdx > -1 && editConfirmIdx < draftPosIdx;
  if(!renderOrderOk) blockers.push("render() does not call renderEditConfirm before renderDraftPosition");

  // A6. render() still calls renderDraftPosition
  var renderCallsDraft = renderSrc.indexOf("renderDraftPosition(state.pendingDraft)") > -1;
  if(!renderCallsDraft) blockers.push("render() no longer calls renderDraftPosition");

  // A7. render() still calls renderEditConfirm
  var renderCallsEditConfirm = renderSrc.indexOf("renderEditConfirm()") > -1;
  if(!renderCallsEditConfirm) blockers.push("render() no longer calls renderEditConfirm");

  // A8. renderDraftConfirm appends to document.body
  var draftConfirmSrc     = _fnSrc(_srcFull, "renderDraftConfirm");
  var draftConfirmAppends = draftConfirmSrc.indexOf("document.body.appendChild") > -1;
  if(!draftConfirmAppends) blockers.push("renderDraftConfirm does not append to document.body");

  // A9. renderDraftConfirm creates dvl-paper-draft-confirm-fixed element
  var hasDraftConfirmClass = draftConfirmSrc.indexOf("dvl-paper-draft-confirm-fixed") > -1;
  if(!hasDraftConfirmClass) blockers.push("renderDraftConfirm does not use dvl-paper-draft-confirm-fixed class");

  // A10. Prior 0686 audit passes
  var audit686Pass = false;
  try{
    if(typeof window.DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT !== "undefined"){
      var r686 = window.DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT.audit();
      audit686Pass = !!(r686 && r686.pass === true);
    }
  }catch(e){ warnings.push("DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT threw: " + e.message); }
  if(!audit686Pass) blockers.push("DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT.audit().pass not true");

  // A11. Final locks 0659-0662 preserved
  var missingLocks = [];
  for(var fl = 0; fl < FINAL_LOCK_CSS.length; fl++){
    if(_cntId(styleEls, FINAL_LOCK_CSS[fl]) !== 1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  var finalLocksPresent = missingLocks.length === 0;
  if(!finalLocksPresent) blockers.push("final locks missing: " + missingLocks.join(", "));

  // A12. DVL_BUTTON_SYSTEM preserved
  var btnSysOk = typeof window.DVL_BUTTON_SYSTEM !== "undefined";
  if(!btnSysOk) blockers.push("DVL_BUTTON_SYSTEM not found");

  // A13. Paper Trading renderPosition exists
  var renderPosExists = _srcFull.indexOf("function renderPosition") > -1;
  if(!renderPosExists) blockers.push("renderPosition not found");

  // A14. renderDraftPosition exists
  var renderDraftExists = _srcFull.indexOf("function renderDraftPosition") > -1;
  if(!renderDraftExists) blockers.push("renderDraftPosition not found");

  // A15. cancelPendingOrder exists (0.686 preserved)
  var cancelPOExists = _srcFull.indexOf("function cancelPendingOrder(") > -1;
  if(!cancelPOExists) blockers.push("cancelPendingOrder not found");

  // A16. orderTagTopFromLineY exists (0.686 preserved)
  var tagTopExists = _srcFull.indexOf("function orderTagTopFromLineY") > -1;
  if(!tagTopExists) blockers.push("orderTagTopFromLineY not found");

  // A17. Zero _brokerToken in source
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken + " found in source");

  // A18. Zero timers/RAF/observers in this module
  var noTimers687 = _mod687src.indexOf("setTimeout") === -1 &&
                    _mod687src.indexOf("setInterval") === -1 &&
                    _mod687src.indexOf("requestAnimationFrame") === -1 &&
                    _mod687src.indexOf("MutationObserver") === -1 &&
                    _mod687src.indexOf("ResizeObserver") === -1;
  if(!noTimers687) blockers.push("timer/RAF/observer found in 0687 module");

  // A19. Zero window.drawSoon= in this module
  var noDrawSoon687 = _mod687src.indexOf("window.drawSoon") === -1;
  if(!noDrawSoon687) blockers.push("window.drawSoon= found in 0687 module");

  var pass = (
    css687Present &&
    mod687Present &&
    noDupStyle &&
    versionOk &&
    renderOrderOk &&
    renderCallsDraft &&
    renderCallsEditConfirm &&
    draftConfirmAppends &&
    hasDraftConfirmClass &&
    audit686Pass &&
    finalLocksPresent &&
    btnSysOk &&
    renderPosExists &&
    renderDraftExists &&
    cancelPOExists &&
    tagTopExists &&
    noBroker &&
    noTimers687 &&
    noDrawSoon687
  );

  _lastAudit = {
    pass:                 pass,
    css687Present:        css687Present,
    mod687Present:        mod687Present,
    noDupStyle:           noDupStyle,
    versionOk:            versionOk,
    renderOrderOk:        renderOrderOk,
    renderCallsDraft:     renderCallsDraft,
    renderCallsEditConfirm: renderCallsEditConfirm,
    draftConfirmAppends:  draftConfirmAppends,
    hasDraftConfirmClass: hasDraftConfirmClass,
    audit686Pass:         audit686Pass,
    finalLocksPresent:    finalLocksPresent,
    btnSysOk:             btnSysOk,
    renderPosExists:      renderPosExists,
    renderDraftExists:    renderDraftExists,
    cancelPOExists:       cancelPOExists,
    tagTopExists:         tagTopExists,
    noBroker:             noBroker,
    noTimers687:          noTimers687,
    noDrawSoon687:        noDrawSoon687,
    blockers:             blockers,
    warnings:             warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_DRAFT_CONFIRM_HOTFIX_AUDIT = {
  VERSION:      "0.687",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
'''

html = rep(html,
    'window.DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT = {\n  VERSION:      "0.686",\n  audit:        audit,\n  run:          run,\n  getLastAudit: getLastAudit\n};\n\n})();\n</script>\n\n</head>',
    'window.DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT = {\n  VERSION:      "0.686",\n  audit:        audit,\n  run:          run,\n  getLastAudit: getLastAudit\n};\n\n})();\n</script>\n' + _AUDIT_0687 + '\n</head>',
    "C7-audit-module-0687"
)

# ── Write ────────────────────────────────────────────────────────────────────
with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

new_lines = len(html.splitlines())
print(f"Output: {new_lines} lines (+{new_lines - orig_lines})")

# ── POST-ASSERTIONS ───────────────────────────────────────────────────────────
def chk(cond, msg):
    if not cond:
        print(f"ASSERT FAIL: {msg}")
        sys.exit(1)

chk('"Beta 0.687"' in html, "POST: version not 0.687")
chk('Beta 0.687</title>' in html, "POST: title not 0.687")
chk('>BETA 0.687</div>' in html, "POST: badge not 0.687")
chk('id="DVL_DRAFT_CONFIRM_HOTFIX_CSS_0687"' in html, "POST: CSS_0687 not found")
chk(html.count('id="DVL_DRAFT_CONFIRM_HOTFIX_CSS_0687"') == 1, "POST: CSS_0687 not unique")
chk('id="DVL_DRAFT_CONFIRM_HOTFIX_AUDIT_MODULE_0687"' in html, "POST: audit_0687 not found")

# Verify render order fix: renderEditConfirm must appear BEFORE renderDraftPosition in render()
_render_start = html.find('\n    function render(){')
_render_end   = html.find('\n    function removePosition', _render_start + 10) if _render_start != -1 else -1
_render_src   = html[_render_start:_render_end] if _render_start != -1 and _render_end != -1 else ""
_ec_idx  = _render_src.find('renderEditConfirm()')
_rdp_idx = _render_src.find('renderDraftPosition')
chk(_ec_idx != -1 and _rdp_idx != -1, "POST: renderEditConfirm or renderDraftPosition missing from render()")
chk(_ec_idx < _rdp_idx, "POST: renderEditConfirm is NOT before renderDraftPosition in render()")

# Prior patches
chk('id="DVL_PAPER_PLACEMENT_FLOW_FIX_CSS_0686"' in html, "POST: CSS_0686 missing")
chk('id="DVL_PAPER_PLACEMENT_FLOW_FIX_AUDIT_MODULE_0686"' in html, "POST: audit_0686 missing")
chk('function cancelPendingOrder(' in html, "POST: cancelPendingOrder missing")
chk('function orderTagTopFromLineY(' in html, "POST: orderTagTopFromLineY missing")
chk('function renderDraftPosition' in html, "POST: renderDraftPosition missing")

_broker = 'Broker' + 'Connector'
chk(_broker not in html, f"POST: {_broker} found in HTML")
chk('</style></style>' not in html, "POST: duplicate </style> found")

print(f"\nAll assertions passed. Beta 0.687 ready ({new_lines} lines).")
