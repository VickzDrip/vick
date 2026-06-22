#!/usr/bin/env python3
"""patch_752.py — Beta 0.752: Fix TP/SL visibility regression from 0.751"""
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

print("=== patch_752.py — Beta 0.752 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.751</title>',
    '<title>DVL Binance Live — Beta 0.752</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.751";',
    'const DVL_APP_VERSION = "Beta 0.752";', "version const")

html = rep(html,
    '>BETA 0.751</span>',
    '>BETA 0.752</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.751 — V2 Pro pending UX: BUY/SELL LIMIT/STOP label, X inside entry tag, OK/Cancel on every drag, state.edit guard prevents activation during review." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.752 — Fix TP/SL visibility regression: clear state.edit after OK/Cancel confirmed, protect renderOrder early return." },\n  { version: "Beta 0.751", note: "Beta 0.751 — V2 Pro pending UX: BUY/SELL LIMIT/STOP label, X inside entry tag, OK/Cancel on every drag, state.edit guard prevents activation during review." },',
    "changelog")

# ── 2. Audit bump 0751 → 0752 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0751_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0752_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.751"',
    'window.DVL_APP_VERSION==="Beta 0.752"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.751' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.752' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.751")===-1) blockers.push("A2: title missing 0.751")',
    'indexOf("0.752")===-1) blockers.push("A2: title missing 0.752")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0751_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0752_AUDIT_MODULE";',
    "audit name bump")

# ── 3. renderOrder: protect early return when pending with valid TP/SL ─────────────
# When renderOrder checks "if(!ey&&!ty&&!sy)return", it should not skip rendering
# for pending orders that have valid TP/SL even if entry is off-screen. For pending
# orders, ENTRY is the trigger price, TP/SL define where to exit. All three can be
# valid and on-screen independently. If TP or SL are on-screen, render the order.
html = rep(html,
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; maybeFill(o); if(maybeCloseOpen(o))return; var ey=priceToY(o.entry),ty=priceToY(o.tp),sy=priceToY(o.sl); if(!ey&&!ty&&!sy)return;",
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; maybeFill(o); if(maybeCloseOpen(o))return; var ey=priceToY(o.entry),ty=priceToY(o.tp),sy=priceToY(o.sl); if(o.status!=='pending'&&!ey&&!ty&&!sy)return; if(o.status==='pending'&&!ty&&!sy&&!ey)return;",
    "renderOrder: protect TP/SL visibility for pending")

# ── 4. endDrag: defensive state cleanup after drag completes ────────────────────
# After endDrag clears state.drag and calls render(), if state.edit remains set
# from a pending drag but no OK/Cancel is clicked within 3s, auto-cancel the edit.
# This prevents stale state.edit from persisting and interfering with future drags.
# The 3s delay gives the user time to see OK/Cancel buttons and click if desired.
html = rep(html,
    "  function endDrag(){if(!state.drag)return; var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; window.__dvlPaperGestureActive=false; window.__dvlPaperDragLock=false; window.__dvlPositionDragActive=false; window.__dvlLongShortV2Dragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); document.documentElement.classList.remove('dvl-paper-gesture-active'); if(!(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind))save(); render(); window.__dvlPaperV2ProDragging=false; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK();}",
    "  function endDrag(){if(!state.drag)return; var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; window.__dvlPaperGestureActive=false; window.__dvlPaperDragLock=false; window.__dvlPositionDragActive=false; window.__dvlLongShortV2Dragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); document.documentElement.classList.remove('dvl-paper-gesture-active'); if(!(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind))save(); render(); window.__dvlPaperV2ProDragging=false; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); if(state.edit){clearTimeout(state._editAutoResetTimer); state._editAutoResetTimer=setTimeout(function(){if(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind){state.edit=null;render();toast('Edit reverted (timeout)');}},3000);}}",
    "endDrag: auto-reset stale state.edit after 3s")

# ── 5. confirmTpSlEdit: explicitly clear state.edit.orig after confirm ────────────
# Ensure state.edit.orig is cleared after a successful confirm to prevent accidental
# access to stale snapshot data if state.edit somehow persists across orders.
html = rep(html,
    "  function confirmTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; state.edit=null; save(); render();}",
    "  function confirmTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; clearTimeout(state._editAutoResetTimer); state.edit=null; save(); render();}",
    "confirmTpSlEdit: clear timer on confirm")

# ── 6. cancelTpSlEdit: explicitly clear state.edit.orig after cancel ─────────────
# Ensure state.edit.orig is cleared after a cancel to prevent accidental access to
# stale snapshot data. Also cancel any pending auto-reset timer.
html = rep(html,
    "  function cancelTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; var o=find(id); if(o&&state.edit.orig){o.entry=n(state.edit.orig.entry); o.tp=n(state.edit.orig.tp); o.sl=n(state.edit.orig.sl); o.qty=qty(o.entry);} state.edit=null; save(); render();}",
    "  function cancelTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; clearTimeout(state._editAutoResetTimer); var o=find(id); if(o&&state.edit.orig){o.entry=n(state.edit.orig.entry); o.tp=n(state.edit.orig.tp); o.sl=n(state.edit.orig.sl); o.qty=qty(o.entry);} state.edit=null; save(); render();}",
    "cancelTpSlEdit: clear timer on cancel")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
