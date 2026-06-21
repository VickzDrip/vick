#!/usr/bin/env python3
"""patch_727.py — Beta 0.727: Refresh Positions panel on open, remove limit order price validation."""
import sys, re

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

print("=== patch_727.py — Beta 0.727 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.726</title>',
    '<title>DVL Binance Live — Beta 0.727</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.726";',
    'const DVL_APP_VERSION = "Beta 0.727";', "version const")

html = rep(html,
    '>BETA 0.726</span>',
    '>BETA 0.727</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.726 — Positions panel wired to paper trading runtime; Limit/Stop orders auto-close drawer." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.727 — Positions panel refreshes on open; limit order price validation removed." },\n  { version: "Beta 0.726", note: "Beta 0.726 — Positions panel wired to paper trading runtime; Limit/Stop orders auto-close drawer." },',
    "changelog")

# ── 2. Audit bump 0726 → 0727 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0726_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0727_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.726"',
    'window.DVL_APP_VERSION==="Beta 0.727"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.726' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.727' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.726")===-1) blockers.push("A2: title missing 0.726")',
    'indexOf("0.727")===-1) blockers.push("A2: title missing 0.727")', "audit A2")

html = rep(html,
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0726_AUDIT_MODULE";',
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0727_AUDIT_MODULE";', "audit N name")

# ── 3. Refresh Positions panel list when panel opens ─────────────────────────────
html = rep(html,
    '        if(key === "positions"){\n'
    '          closeTradeIfOpen();\n'
    '          state.panelOpen = !state.panelOpen;\n'
    '          renderNav();\n'
    '          return;\n'
    '        }',
    '        if(key === "positions"){\n'
    '          closeTradeIfOpen();\n'
    '          state.panelOpen = !state.panelOpen;\n'
    '          if(state.panelOpen) renderList();\n'
    '          renderNav();\n'
    '          return;\n'
    '        }',
    "refresh list on panel open")

# ── 4. Bypass limit order price validation ───────────────────────────────────────
# Add a document capture listener that intercepts ✓ on draft confirm boxes,
# pushes the order without price validation, then stops further propagation
# so the existing confirmPendingOrderDraft (with its validation) never fires.
html = rep(html,
    '      })(_taBtns[_ti]);\n'
    '    }\n'
    '  }\n\n'
    '  function updateOldLabels(){',
    '      })(_taBtns[_ti]);\n'
    '    }\n\n'
    '    if(!document.__dvlLimitConfirmBound){\n'
    '      document.__dvlLimitConfirmBound = true;\n'
    '      document.addEventListener("click", function(ev){\n'
    '        if(!ev.target||!ev.target.closest) return;\n'
    '        var _ok=ev.target.closest(".dvl-paper-draft-confirm-fixed .dvl-paper-confirm.ok");\n'
    '        if(!_ok) return;\n'
    '        var rt=paperRt();\n'
    '        if(!rt||!rt.state||!rt.state.pendingDraft) return;\n'
    '        var draft=rt.state.pendingDraft;\n'
    '        if((draft.orderType||"")==="Market") return;\n'
    '        ev.stopImmediatePropagation();\n'
    '        ev.preventDefault();\n'
    '        var pos=Object.assign({},draft,{status:"pending"});\n'
    '        rt.state.positions.push(pos);\n'
    '        rt.state.pendingDraft=null;\n'
    '        try{ var _s=(window.S&&window.S.symbol)?String(window.S.symbol):"BTCUSDT"; localStorage.setItem("dvl_paper_runtime_0581_"+_s,JSON.stringify(rt.state.positions.slice(-40))); }catch(_){}\n'
    '        try{ if(typeof rt.render==="function") rt.render(); }catch(_){}\n'
    '        try{ if(typeof showToast==="function") showToast("Ordem criada"); }catch(_){}\n'
    '      }, true);\n'
    '    }\n'
    '  }\n\n'
    '  function updateOldLabels(){',
    "bypass limit order price validation")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
