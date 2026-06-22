#!/usr/bin/env python3
"""patch_750.py — Beta 0.750: global drag guard; no X on resting limit; BUY/SELL LIMIT/STOP label; re-drag shows confirm."""
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

print("=== patch_750.py — Beta 0.750 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.749</title>',
    '<title>DVL Binance Live — Beta 0.750</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.749";',
    'const DVL_APP_VERSION = "Beta 0.750";', "version const")

html = rep(html,
    '>BETA 0.749</span>',
    '>BETA 0.750</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.749 — limit order X lives inside label (reverts edit); no external cancel button." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.750 — global drag guard; no X on resting limit tag; BUY/SELL LIMIT/STOP label; re-drag shows confirm." },\n  { version: "Beta 0.749", note: "Beta 0.749 — limit order X lives inside label (reverts edit); no external cancel button." },',
    "changelog")

# ── 2. Audit bump 0749 → 0750 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0749_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0750_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.749"',
    'window.DVL_APP_VERSION==="Beta 0.750"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.749' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.750' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.749")===-1) blockers.push("A2: title missing 0.749")',
    'indexOf("0.750")===-1) blockers.push("A2: title missing 0.750")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0749_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0750_AUDIT_MODULE";',
    "audit name bump")

# ── 3. maybeTriggerPending: global drag guard ─────────────────────────────────────
# Previously only blocked the specific position being dragged. Now any active drag
# (state.drag OR window flags) prevents ALL pending orders from activating.
html = rep(html,
    '      if(!pos || pos.status !== "pending") return false;\n'
    '      if(state.drag && String(state.drag.id) === String(pos.id)) return false;\n'
    '      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)) return false;',
    '      if(!pos || pos.status !== "pending") return false;\n'
    '      if(state.drag || window.__dvlPaperDragging || window.__dvlPositionDragActive) return false;\n'
    '      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)) return false;',
    "maybeTriggerPending: global drag guard")

# ── 4. makeTag: no X on resting pending limit tag ────────────────────────────────
# Pending orders in resting state show clean label — no external X button.
# X only appears inside the fixedLabel during edit mode (reverts the drag).
html = rep(html,
    "        '<span class=\"pct\">' + pct + '</span>' +\n"
    "        '</span>' +\n"
    "        (handle === \"entry\" ? '<span class=\"x\" data-remove=\"1\">×</span>' : \"\");",
    "        '<span class=\"pct\">' + pct + '</span>' +\n"
    "        '</span>' +\n"
    "        (handle === \"entry\" && pos.status !== \"pending\" ? '<span class=\"x\" data-remove=\"1\">×</span>' : \"\");",
    "makeTag: no X on resting pending tag")

# ── 5. renderPosition: dynamic BUY/SELL LIMIT/STOP label ─────────────────────────
# BUY  + entry > live  → BUY STOP   (price must rise to reach entry)
# BUY  + entry <= live → BUY LIMIT  (price must drop to reach entry)
# SELL + entry < live  → SELL STOP  (price must drop to reach entry)
# SELL + entry >= live → SELL LIMIT (price must rise to reach entry)
html = rep(html,
    '        if(pos.status === "pending"){\n'
    '          const pendingTitle = "LIMIT";\n'
    '          makeTag(pos, "entry", entryY.y, pendingTitle, "");\n'
    '        }else{',
    '        if(pos.status === "pending"){\n'
    '          const _live2 = lastPrice();\n'
    '          const _entry2 = Number(pos.entry);\n'
    '          let _kind2 = "LIMIT";\n'
    '          if(_live2 > 0 && _entry2 > 0){\n'
    '            if(pos.side === "buy") _kind2 = _entry2 > _live2 ? "STOP" : "LIMIT";\n'
    '            else _kind2 = _entry2 < _live2 ? "STOP" : "LIMIT";\n'
    '          }\n'
    '          const pendingTitle = ((pos.side||"").toLowerCase()==="buy" ? "BUY" : "SELL") + " " + _kind2;\n'
    '          makeTag(pos, "entry", entryY.y, pendingTitle, "");\n'
    '        }else{',
    "renderPosition: dynamic BUY/SELL LIMIT/STOP label")

# ── 6. fixedLabelText: dynamic BUY/SELL LIMIT/STOP label during edit ─────────────
# Same logic as renderPosition — label updates live while user drags the order.
html = rep(html,
    '        if(pos.status === "pending"){\n'
    '          return { main:"LIMIT", pct:"" };\n'
    '        }',
    '        if(pos.status === "pending"){\n'
    '          const _live3 = lastPrice();\n'
    '          const _entry3 = Number(pos.entry);\n'
    '          let _kind3 = "LIMIT";\n'
    '          if(_live3 > 0 && _entry3 > 0){\n'
    '            if(pos.side === "buy") _kind3 = _entry3 > _live3 ? "STOP" : "LIMIT";\n'
    '            else _kind3 = _entry3 < _live3 ? "STOP" : "LIMIT";\n'
    '          }\n'
    '          const _label3 = ((pos.side||"").toLowerCase()==="buy" ? "BUY" : "SELL") + " " + _kind3;\n'
    '          return { main:_label3, pct:"" };\n'
    '        }',
    "fixedLabelText: dynamic BUY/SELL LIMIT/STOP label")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
