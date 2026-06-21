#!/usr/bin/env python3
"""patch_746.py — Beta 0.746: drag cannot trigger/close trades; X only on entry; TP/SL clamped at entry."""
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

print("=== patch_746.py — Beta 0.746 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.745</title>',
    '<title>DVL Binance Live — Beta 0.746</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.745";',
    'const DVL_APP_VERSION = "Beta 0.746";', "version const")

html = rep(html,
    '>BETA 0.745</span>',
    '>BETA 0.746</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.745 — symbol dropdown: full-width on mobile, clamped on desktop." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.746 — drag cannot trigger/close trades; X only on entry line; TP/SL clamped at entry." },\n  { version: "Beta 0.745", note: "Beta 0.745 — symbol dropdown: full-width on mobile, clamped on desktop." },',
    "changelog")

# ── 2. Audit bump 0745 → 0746 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0745_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0746_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.745"',
    'window.DVL_APP_VERSION==="Beta 0.746"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.745' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.746' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.745")===-1) blockers.push("A2: title missing 0.745")',
    'indexOf("0.746")===-1) blockers.push("A2: title missing 0.746")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0745_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0746_AUDIT_MODULE";',
    "audit name bump")

# ── 3. maybeTriggerPending: add drag guard ────────────────────────────────────────
# Without this, dragging a limit order's entry line past the live price activates the
# trade mid-drag, which then immediately checks TP/SL and can close it as win/loss.
html = rep(html,
    'function maybeTriggerPending(pos){\n'
    '      if(!pos || pos.status !== "pending") return false;\n'
    '\n'
    '      const live = lastPrice();',
    'function maybeTriggerPending(pos){\n'
    '      if(!pos || pos.status !== "pending") return false;\n'
    '      if(state.drag && String(state.drag.id) === String(pos.id)) return false;\n'
    '\n'
    '      const live = lastPrice();',
    "maybeTriggerPending: drag guard")

# ── 4. makeTag: X button only on entry line (same as market orders) ───────────────
# Previously: pending orders showed X on entry AND tp AND sl, which is confusing.
# Now: X only on entry for all positions, matching market order behaviour.
html = rep(html,
    '        (pos.status === "pending" || handle === "entry" ? \'<span class="x" data-remove="1">×</span>\' : "");',
    '        (handle === "entry" ? \'<span class="x" data-remove="1">×</span>\' : "");',
    "makeTag: X only on entry handle")

# ── 5. movePaperDrag: clamp TP/SL so they cannot cross entry price ─────────────────
# BUY:  TP must stay >= entry; SL must stay <= entry
# SELL: TP must stay <= entry; SL must stay >= entry
html = rep(html,
    '      }else if(state.drag.handle === "tp"){\n'
    '        pos.tp = state.drag.orig.tp + dp;\n'
    '      }else if(state.drag.handle === "sl"){\n'
    '        pos.sl = state.drag.orig.sl + dp;\n'
    '      }',
    '      }else if(state.drag.handle === "tp"){\n'
    '        const rawTp = state.drag.orig.tp + dp;\n'
    '        pos.tp = pos.side === "buy" ? Math.max(rawTp, pos.entry) : Math.min(rawTp, pos.entry);\n'
    '      }else if(state.drag.handle === "sl"){\n'
    '        const rawSl = state.drag.orig.sl + dp;\n'
    '        pos.sl = pos.side === "buy" ? Math.min(rawSl, pos.entry) : Math.max(rawSl, pos.entry);\n'
    '      }',
    "movePaperDrag: clamp TP/SL at entry")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
