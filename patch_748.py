#!/usr/bin/env python3
"""patch_748.py — Beta 0.748: limit orders show confirm/cancel on drag; infinite re-edit."""
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

print("=== patch_748.py — Beta 0.748 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.747</title>',
    '<title>DVL Binance Live — Beta 0.748</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.747";',
    'const DVL_APP_VERSION = "Beta 0.748";', "version const")

html = rep(html,
    '>BETA 0.747</span>',
    '>BETA 0.748</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.747 — dropdown 400px, site palette (no blue); watchlist opens favorites panel; symbol text syncs after selection." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.748 — limit orders show confirm/cancel on drag; editConfirm guards maybeTriggerPending; infinite re-edit." },\n  { version: "Beta 0.747", note: "Beta 0.747 — dropdown 400px, site palette (no blue); watchlist opens favorites panel; symbol text syncs after selection." },',
    "changelog")

# ── 2. Audit bump 0747 → 0748 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0747_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0748_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.747"',
    'window.DVL_APP_VERSION==="Beta 0.748"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.747' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.748' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.747")===-1) blockers.push("A2: title missing 0.747")',
    'indexOf("0.748")===-1) blockers.push("A2: title missing 0.748")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0747_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0748_AUDIT_MODULE";',
    "audit name bump")

# ── 3. startPaperDrag: always set editConfirm for pending orders too ──────────────
# Previously pending orders set editConfirm=null so no confirm/cancel appeared.
# Now both open AND pending orders go through the same editConfirm flow.
# orig is preserved across re-drags so cancel always reverts to the true original.
html = rep(html,
    '      if(pos.status !== "pending"){\n'
    '        state.editConfirm = {\n'
    '          id: pos.id,\n'
    '          handle: activeHandle,\n'
    '          yPx: y,\n'
    '          fixedTop: previousEdit ? previousEdit.fixedTop : undefined,\n'
    '          fixedRight: previousEdit ? previousEdit.fixedRight : undefined,\n'
    '          orig: previousEdit && previousEdit.orig ? previousEdit.orig : {\n'
    '            entry: Number(pos.entry),\n'
    '            tp: Number(pos.tp),\n'
    '            sl: Number(pos.sl)\n'
    '          }\n'
    '        };\n'
    '      }else{\n'
    '        state.editConfirm = null;\n'
    '      }',
    '      state.editConfirm = {\n'
    '        id: pos.id,\n'
    '        handle: activeHandle,\n'
    '        yPx: y,\n'
    '        fixedTop: previousEdit ? previousEdit.fixedTop : undefined,\n'
    '        fixedRight: previousEdit ? previousEdit.fixedRight : undefined,\n'
    '        orig: previousEdit && previousEdit.orig ? previousEdit.orig : {\n'
    '          entry: Number(pos.entry),\n'
    '          tp: Number(pos.tp),\n'
    '          sl: Number(pos.sl)\n'
    '        }\n'
    '      };',
    "startPaperDrag: always set editConfirm")

# ── 4. endPaperDrag: remove early-return for pending orders ──────────────────────
# Previously pending orders saved immediately on drag-end without confirm/cancel.
# Removing the early return lets them fall through to the editConfirm path,
# which leaves the confirm/cancel UI visible and does NOT save until confirmed.
html = rep(html,
    '      if(pos && pos.status === "pending"){\n'
    '        state.editConfirm = null;\n'
    '        document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){\n'
    '          el.remove();\n'
    '        });\n'
    '        save();\n'
    '        render();\n'
    '        return;\n'
    '      }\n'
    '\n'
    '      if(pos){',
    '      if(pos){',
    "endPaperDrag: remove pending early-return")

# ── 5. maybeTriggerPending: add editConfirm guard ────────────────────────────────
# Without this, a pending order being shown in confirm/review state could still
# be triggered if the live price crosses its entry during that time.
html = rep(html,
    '      if(state.drag && String(state.drag.id) === String(pos.id)) return false;\n'
    '\n'
    '      const live = lastPrice();\n'
    '      if(!(live > 0)) return false;\n'
    '\n'
    '      const entry = Number(pos.entry);',
    '      if(state.drag && String(state.drag.id) === String(pos.id)) return false;\n'
    '      if(state.editConfirm && String(state.editConfirm.id) === String(pos.id)) return false;\n'
    '\n'
    '      const live = lastPrice();\n'
    '      if(!(live > 0)) return false;\n'
    '\n'
    '      const entry = Number(pos.entry);',
    "maybeTriggerPending: editConfirm guard")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
