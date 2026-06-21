#!/usr/bin/env python3
"""patch_731.py — Beta 0.731: Fix Positions click-outside using composedPath (survives DOM mutation)."""
import sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_731.py — Beta 0.731 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.730</title>',
    '<title>DVL Binance Live — Beta 0.731</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.730";',
    'const DVL_APP_VERSION = "Beta 0.731";', "version const")

html = rep(html,
    '>BETA 0.730</span>',
    '>BETA 0.731</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.730 — click-outside closes all panels (Trade excepted); history capped at 100 trades." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.731 — fixed Positions click-outside using composedPath so tab/list clicks inside the panel never trigger close." },\n  { version: "Beta 0.730", note: "Beta 0.730 — click-outside closes all panels (Trade excepted); history capped at 100 trades." },',
    "changelog")

# ── 2. Audit bump 0730 → 0731 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0730_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0731_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.730"',
    'window.DVL_APP_VERSION==="Beta 0.731"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.730' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.731' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.730")===-1) blockers.push("A2: title missing 0.730")',
    'indexOf("0.731")===-1) blockers.push("A2: title missing 0.731")', "audit A2")

html = rep(html,
    'var N=100, name="DVL_UI_OVERLAY_PHASE_0730_AUDIT_MODULE";',
    '// A101. Positions click-outside uses composedPath\n'
    '(function(){ var s=document.getElementById("DVL_POSITIONS_WATCHLIST_OVERLAY_MODULE_0722"); var t=s?(s.textContent||""):""; if(t.indexOf("composedPath")===-1) blockers.push("A101: Positions click-outside not using composedPath"); })();\n'
    '\n'
    'var N=101, name="DVL_UI_OVERLAY_PHASE_0731_AUDIT_MODULE";',
    "audit A101 + N bump")

# ── 3. Fix Positions click-outside: replace closest() with composedPath() ────────
html = rep(html,
    '    if(!document.__dvlPositionsOutsideBound){\n'
    '      document.__dvlPositionsOutsideBound = true;\n'
    '      document.addEventListener("click", function(ev){\n'
    '        if(!state.panelOpen) return;\n'
    '        var inPanel = ev.target.closest ? ev.target.closest("#dvlPositionsPanelV2") : null;\n'
    '        var inNav   = ev.target.closest ? ev.target.closest("#dvlBottomNavV2") : null;\n'
    '        var inDet   = ev.target.closest ? ev.target.closest("#dvlPositionDetailsV2") : null;\n'
    '        var inTrade = ev.target.closest ? ev.target.closest(".tradeDrawer") : null;\n'
    '        if(!inPanel && !inNav && !inDet && !inTrade){\n'
    '          state.panelOpen = false;\n'
    '          renderNav();\n'
    '        }\n'
    '      }, false);\n'
    '    }',
    '    if(!document.__dvlPositionsOutsideBound){\n'
    '      document.__dvlPositionsOutsideBound = true;\n'
    '      document.addEventListener("click", function(ev){\n'
    '        if(!state.panelOpen) return;\n'
    '        // composedPath() captures the event path at dispatch time,\n'
    '        // before renderTabs()/renderList() can detach the clicked element.\n'
    '        var path = ev.composedPath ? ev.composedPath() : [];\n'
    '        var panelEl = elById("dvlPositionsPanelV2");\n'
    '        var navEl   = elById("dvlBottomNavV2");\n'
    '        var detEl   = elById("dvlPositionDetailsV2");\n'
    '        var tradeEl = document.querySelector(".tradeDrawer");\n'
    '        function _inPath(el){ return !!el && path.indexOf(el) !== -1; }\n'
    '        if(!_inPath(panelEl) && !_inPath(navEl) && !_inPath(detEl) && !_inPath(tradeEl)){\n'
    '          state.panelOpen = false;\n'
    '          renderNav();\n'
    '        }\n'
    '      }, false);\n'
    '    }',
    "positions click-outside: composedPath fix")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
