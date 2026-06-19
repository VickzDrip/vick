#!/usr/bin/env python3
"""patch_666.py — Beta 0.666 / Phase 3.0: Oscillator Bounds Publisher + safe Paper resync hook."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-26.before_0666_osc_bounds_publisher.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ABORT] not found: {label}"); sys.exit(1)
    if count > 1:
        print(f"[ABORT] ambiguous ({count}x): {label}"); sys.exit(1)
    return html.replace(old, new, 1)

shutil.copy2(SRC, BAK)
print(f"[OK] backup: {BAK}")

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    "<title>DVL Binance Live — Beta 0.665</title>",
    "<title>DVL Binance Live — Beta 0.666</title>",
    "title 0.665→0.666")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.665<",
    ">BETA 0.666<",
    "static badge 0.665→0.666")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.665";',
    'const DVL_APP_VERSION = "Beta 0.666";',
    "DVL_APP_VERSION 0.665→0.666")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.665 — Phase 2.9: oscillator safe clamp + audit verification for Paper layer bounds." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.666 — Phase 3.0: oscillator bounds publisher + safe Paper resync hook." },\n  { version: "Beta 0.665", note: "Phase 2.9: oscillator safe clamp + audit verification for Paper layer bounds." },',
    "changelog 0.666 entry")

# ── 5. Add publisher CSS + module before </head> ──────────────────────────────
OLD_HEAD_END = r"""window.DVL_OSCILLATOR_BOUNDS_AUDIT = {
  VERSION:      "0.665",
  audit:        audit,
  getLastAudit: getLastAudit
};

})();
</script>

</head>
<body>"""

PUBLISHER_CSS = r"""<style id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_CSS_0666">
/* DVL Beta 0.666 — Phase 3.0: oscillator bounds publisher marker only.
   DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666 reads canvas-local sub-keys from
   window.__dvlOscillatorPanelBounds, converts to viewport coordinates, and publishes
   the synthesized top/bottom/height into the same object for the Paper clamp module.
   No visual/layout properties here. Read-only/visual-neutral. */
</style>

"""

PUBLISHER_MODULE = r"""<script id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666">
(function(){
"use strict";

var _lastPublish = null;

var SUB_KEYS = ["teste", "teste2", "openInterest", "longShort"];

function publish(){
  var canvas     = document.getElementById("chart");
  var canvasWrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  var bounds     = window.__dvlOscillatorPanelBounds || {};

  var canvasRect = canvas ? canvas.getBoundingClientRect() : null;
  var scaleY     = (canvas && canvasRect && canvas.height > 0)
                   ? (canvasRect.height / canvas.height)
                   : 1;

  var list = [];
  var i, key, entry;

  for(i = 0; i < SUB_KEYS.length; i++){
    key   = SUB_KEYS[i];
    entry = bounds[key];
    if(entry && typeof entry.top === "number" && typeof entry.h === "number"){
      list.push({
        key:    key,
        top:    entry.top,
        bottom: entry.top + entry.h,
        height: entry.h
      });
    }
  }

  list.sort(function(a, b){ return a.top - b.top; });

  var count  = list.length;
  var result;
  var now    = Date.now();

  if(count > 0 && canvasRect){
    var firstTop    = list[0].top;
    var lastBottom  = list[count - 1].bottom;
    var viewportTop = canvasRect.top + firstTop * scaleY;
    var viewportBot = canvasRect.top + lastBottom * scaleY;
    var heightPx    = viewportBot - viewportTop;

    bounds.top       = viewportTop;
    bounds.bottom    = viewportBot;
    bounds.height    = heightPx;
    bounds.count     = count;
    bounds.source    = "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666";
    bounds.updatedAt = now;

    window.__dvlOscillatorPanelBounds     = bounds;
    window.__dvlOscillatorPanelBoundsList = list;

    result = {
      count:     count,
      top:       viewportTop,
      bottom:    viewportBot,
      height:    heightPx,
      source:    "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666",
      updatedAt: now
    };
  } else {
    window.__dvlOscillatorPanelBoundsList = list;

    result = {
      count:     0,
      top:       null,
      bottom:    null,
      height:    null,
      source:    "DVL_OSCILLATOR_BOUNDS_PUBLISHER_0666",
      updatedAt: now
    };
  }

  _lastPublish = result;
  return result;
}

function audit(){
  return {
    version:      "0.666",
    boundsExists: !!(window.__dvlOscillatorPanelBounds &&
                     typeof window.__dvlOscillatorPanelBounds.top === "number"),
    boundsList:   window.__dvlOscillatorPanelBoundsList || [],
    lastPublish:  _lastPublish
  };
}

function getLastPublish(){
  return _lastPublish;
}

window.DVL_OSCILLATOR_BOUNDS_PUBLISHER = {
  VERSION:        "0.666",
  publish:        publish,
  audit:          audit,
  getLastPublish: getLastPublish
};

})();
</script>

"""

NEW_HEAD_END = (
    "window.DVL_OSCILLATOR_BOUNDS_AUDIT = {\n"
    '  VERSION:      "0.665",\n'
    "  audit:        audit,\n"
    "  getLastAudit: getLastAudit\n"
    "};\n\n})();\n</script>\n\n"
    + PUBLISHER_CSS
    + PUBLISHER_MODULE
    + "</head>\n<body>"
)

html = rep(html, OLD_HEAD_END, NEW_HEAD_END, "insert DVL_OSCILLATOR_BOUNDS_PUBLISHER before </head>")

# ── 6. Add safe hook after oscillator draw loop, before crosshair ─────────────
OLD_HOOK_ANCHOR = (
    "      panelTop += panelHeight;\n"
    "    });\n"
    "  }\n"
    "\n"
    "  if(crosshair.visible && window.__dvlLastCrossCfg){"
)

NEW_HOOK_ANCHOR = (
    "      panelTop += panelHeight;\n"
    "    });\n"
    "  }\n"
    "\n"
    "  if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER){ window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish(); }\n"
    "  if(window.DVL_PAPER_LAYER_ANCHOR && typeof window.DVL_PAPER_LAYER_ANCHOR.scheduleSync === \"function\"){ window.DVL_PAPER_LAYER_ANCHOR.scheduleSync(); }\n"
    "\n"
    "  if(crosshair.visible && window.__dvlLastCrossCfg){"
)

html = rep(html, OLD_HOOK_ANCHOR, NEW_HOOK_ANCHOR, "insert publisher+resync hook after oscillator draw loop")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_666 applied: title, badge, version, changelog, publisher module, safe hook")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.666</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.665</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.666";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.665";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.666<" in content, "FAIL: static badge"
assert ">BETA 0.665<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.666 — Phase 3.0: oscillator bounds publisher + safe Paper resync hook.' in content, "FAIL: changelog 0.666"
assert '"Beta 0.665", note: "Phase 2.9:' in content, "FAIL: 0.665 changelog preserved"

# 3. Publisher CSS and module present exactly once
assert content.count('id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_CSS_0666"') == 1,  "FAIL: publisher CSS count != 1"
assert content.count('id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666"') == 1, "FAIL: publisher module count != 1"

# 4. Extract publisher module block
pub_start = content.index('<script id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666">')
pub_end   = content.index('</script>', pub_start) + len('</script>')
pub_block = content[pub_start:pub_end]

# 5. Publisher module: VERSION "0.666"
assert 'VERSION:        "0.666"' in pub_block, "FAIL: publisher VERSION not 0.666"

# 6. Publisher module: required functions exposed
assert 'function publish()' in pub_block,       "FAIL: publish() missing from publisher module"
assert 'function audit()' in pub_block,         "FAIL: audit() missing from publisher module"
assert 'function getLastPublish()' in pub_block, "FAIL: getLastPublish() missing from publisher module"
assert 'window.DVL_OSCILLATOR_BOUNDS_PUBLISHER' in pub_block, "FAIL: DVL_OSCILLATOR_BOUNDS_PUBLISHER not exported"
assert 'publish:        publish' in pub_block,   "FAIL: publish not exported"
assert 'audit:          audit' in pub_block,     "FAIL: audit not exported"
assert 'getLastPublish: getLastPublish' in pub_block, "FAIL: getLastPublish not exported"

# 7. Publisher module: updates both bounds globals
assert 'window.__dvlOscillatorPanelBounds' in pub_block,     "FAIL: __dvlOscillatorPanelBounds not updated"
assert 'window.__dvlOscillatorPanelBoundsList' in pub_block, "FAIL: __dvlOscillatorPanelBoundsList not updated"

# 8. Publisher module: returns required fields
assert 'count:' in pub_block,     "FAIL: count missing from publish result"
assert 'top:' in pub_block,       "FAIL: top missing from publish result"
assert 'bottom:' in pub_block,    "FAIL: bottom missing from publish result"
assert 'height:' in pub_block,    "FAIL: height missing from publish result"
assert 'source:' in pub_block,    "FAIL: source missing from publish result"
assert 'updatedAt:' in pub_block, "FAIL: updatedAt missing from publish result"

# 9. Publisher module: uses canvas getBoundingClientRect for viewport conversion
assert 'getBoundingClientRect' in pub_block,            "FAIL: getBoundingClientRect missing (viewport conversion)"
assert 'canvas.height' in pub_block,                    "FAIL: canvas.height missing (scale factor)"
assert 'getElementById("chart")' in pub_block,          "FAIL: #chart canvas not referenced"
assert 'canvasRect.top' in pub_block,                   "FAIL: canvasRect.top missing (viewport top)"

# 10. Publisher module: no forbidden patterns
assert 'window.drawSoon'       not in pub_block, "FAIL: window.drawSoon in publisher module"
assert 'requestAnimationFrame(' not in pub_block, "FAIL: requestAnimationFrame( in publisher module"
assert 'setInterval('          not in pub_block, "FAIL: setInterval in publisher module"
assert 'setTimeout('           not in pub_block, "FAIL: setTimeout in publisher module"
assert 'MutationObserver'      not in pub_block, "FAIL: MutationObserver in publisher module"
assert 'ResizeObserver'        not in pub_block, "FAIL: ResizeObserver in publisher module"

# 11. Publisher module: no DOM mutation (no style/class/attr/append writes)
assert 'style.set'    not in pub_block, "FAIL: style write in publisher module"
assert 'classList'    not in pub_block, "FAIL: classList in publisher module"
assert 'setAttribute' not in pub_block, "FAIL: setAttribute in publisher module"
assert 'appendChild'  not in pub_block, "FAIL: appendChild in publisher module"

# 12. Hook present in main script body (not in <head>)
main_script_start = content.index('<script>\nconst DVL_APP_VERSION')
hook_line1 = 'if(window.DVL_OSCILLATOR_BOUNDS_PUBLISHER){ window.DVL_OSCILLATOR_BOUNDS_PUBLISHER.publish(); }'
hook_line2 = 'if(window.DVL_PAPER_LAYER_ANCHOR && typeof window.DVL_PAPER_LAYER_ANCHOR.scheduleSync === "function"){ window.DVL_PAPER_LAYER_ANCHOR.scheduleSync(); }'
assert hook_line1 in content,    "FAIL: publisher hook line 1 not found"
assert hook_line2 in content,    "FAIL: resync hook line 2 not found"
hook_pos = content.index(hook_line1)
assert hook_pos > main_script_start, "FAIL: hook not in main script body (should be in <body> script)"

# 13. Hook is after oscillator loop (after panelTop += panelHeight and before crosshair)
panelTop_pos  = content.rindex('panelTop += panelHeight;', 0, hook_pos)
crosshair_pos = content.index('if(crosshair.visible && window.__dvlLastCrossCfg)', hook_pos)
assert panelTop_pos < hook_pos < crosshair_pos, "FAIL: hook not between oscillator loop and crosshair"

# 14. Publisher module is in <head> (before main script)
pub_pos = content.index('<script id="DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666">')
assert pub_pos < main_script_start, "FAIL: publisher module not in <head>"

# 15. Order of blocks before </head>
idx_pa_css   = content.index('DVL_PAPER_LAYER_ANCHOR_CSS_0663')
idx_pa_mod   = content.index('DVL_PAPER_LAYER_ANCHOR_MODULE_0665')
idx_clamp    = content.index('DVL_OSCILLATOR_SAFE_CLAMP_CSS_0665')
idx_osc_aud  = content.index('DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665')
idx_pub_css  = content.index('DVL_OSCILLATOR_BOUNDS_PUBLISHER_CSS_0666')
idx_pub_mod  = content.index('DVL_OSCILLATOR_BOUNDS_PUBLISHER_MODULE_0666')
idx_head     = content.index('</head>')
assert idx_pa_css < idx_pa_mod < idx_clamp < idx_osc_aud < idx_pub_css < idx_pub_mod < idx_head, \
    "FAIL: head block order wrong"

# 16. Publisher module does not wrap drawSoon (already checked via pub_block above)
# (window.drawSoon = function exists legitimately in original app code — only verify new modules don't wrap it)
assert 'window.drawSoon'       not in pub_block, "FAIL: publisher module references drawSoon"

# 17. Prior CSS locks preserved
for lock_id in ["DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659", "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
                 "DVL_CHROME_FINAL_LOCK_CSS_0661", "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"]:
    assert lock_id in content, f"FAIL: {lock_id} missing"

# 18. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655"    in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656"  in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"
assert "DVL_PAPER_LAYER_ANCHOR_MODULE_0665" in content, "FAIL: paper anchor 0665 missing"
assert "DVL_OSCILLATOR_BOUNDS_AUDIT_MODULE_0665" in content, "FAIL: oscillator audit 0665 missing"

# 19. No wrongly-created button system modules
for ver in ["0656","0657","0658","0659","0660","0661","0662","0663","0664","0665","0666"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 20. Zero DVL_TODO_0666
assert "DVL_TODO_0666" not in content, "FAIL: DVL_TODO_0666 remaining"

# 21. Buy/Sell HTML untouched
assert 'class="tradeAction buy"'  in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 22. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 23. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;'                in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 24. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-header",
            "dvl-btn-migrated-panel",  "dvl-btn-migrated-drawer",
            "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

print("[OK] all 45 assertions passed — 0666 clean: oscillator bounds publisher + safe Paper resync hook")
