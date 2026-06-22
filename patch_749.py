#!/usr/bin/env python3
"""patch_749.py — Beta 0.749: limit order X inside label; no external cancel button."""
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

print("=== patch_749.py — Beta 0.749 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.748</title>',
    '<title>DVL Binance Live — Beta 0.749</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.748";',
    'const DVL_APP_VERSION = "Beta 0.749";', "version const")

html = rep(html,
    '>BETA 0.748</span>',
    '>BETA 0.749</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.748 — limit orders show confirm/cancel on drag; editConfirm guards maybeTriggerPending; infinite re-edit." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.749 — limit order X lives inside label (reverts edit); no external cancel button." },\n  { version: "Beta 0.748", note: "Beta 0.748 — limit orders show confirm/cancel on drag; editConfirm guards maybeTriggerPending; infinite re-edit." },',
    "changelog")

# ── 2. Audit bump 0748 → 0749 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0748_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0749_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.748"',
    'window.DVL_APP_VERSION==="Beta 0.749"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.748' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.749' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.748")===-1) blockers.push("A2: title missing 0.748")',
    'indexOf("0.749")===-1) blockers.push("A2: title missing 0.749")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0748_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0749_AUDIT_MODULE";',
    "audit name bump")

# ── 3. renderEditConfirm: fixedLabel × → revert edit for pending, remove for open ─
# Previously the × inside the fixedLabel always called removePosition (closes trade).
# For pending orders we want it to revert the drag (undo) without removing the order,
# matching the UX of market orders where ✓ = confirm and × inside = cancel-edit.
html = rep(html,
    '      fixedLabel.addEventListener("click", function(ev){\n'
    '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){\n'
    '          ev.preventDefault();\n'
    '          ev.stopPropagation();\n'
    '          removePosition(pos.id);\n'
    '        }\n'
    '      });',
    '      fixedLabel.addEventListener("click", function(ev){\n'
    '        if(ev.target && ev.target.dataset && ev.target.dataset.remove === "1"){\n'
    '          ev.preventDefault();\n'
    '          ev.stopPropagation();\n'
    '          if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();\n'
    '          if(pos.status === "pending"){\n'
    '            const t=findPaperPosition(pos.id);\n'
    '            if(t && state.editConfirm && state.editConfirm.orig){\n'
    '              t.entry=Number(state.editConfirm.orig.entry);\n'
    '              t.tp=Number(state.editConfirm.orig.tp);\n'
    '              t.sl=Number(state.editConfirm.orig.sl);\n'
    '              t.qty=qtyFor(t.entry);\n'
    '            }\n'
    '            document.querySelectorAll(".dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed").forEach(function(el){ el.remove(); });\n'
    '            state.editConfirm=null;\n'
    '            render();\n'
    '          } else {\n'
    '            removePosition(pos.id);\n'
    '          }\n'
    '        }\n'
    '      });',
    "fixedLabel ×: revert for pending, remove for open")

# ── 4. renderEditConfirm: confirmBox — no external cancel button for pending ──────
# For market orders: external ✓ and × both show (× reverts the TP/SL/entry edit).
# For pending orders: only ✓ shows; the × inside the fixedLabel handles cancel/revert.
html = rep(html,
    '      box.style.top = Number(state.editConfirm.fixedTop).toFixed(1) + "px";\n'
    '      box.style.right = Number(state.editConfirm.fixedRight || 56).toFixed(1) + "px";\n'
    '      box.innerHTML =\n'
    '        \'<button class="dvl-paper-confirm ok" type="button">✓</button>\' +\n'
    '        \'<button class="dvl-paper-confirm cancel" type="button">×</button>\';',
    '      box.style.top = Number(state.editConfirm.fixedTop).toFixed(1) + "px";\n'
    '      box.style.right = Number(state.editConfirm.fixedRight || 56).toFixed(1) + "px";\n'
    '      box.innerHTML =\n'
    '        \'<button class="dvl-paper-confirm ok" type="button">✓</button>\' +\n'
    '        (pos.status !== "pending" ? \'<button class="dvl-paper-confirm cancel" type="button">×</button>\' : "");',
    "confirmBox: hide external cancel for pending")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
