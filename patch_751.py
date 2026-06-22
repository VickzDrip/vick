#!/usr/bin/env python3
"""patch_751.py — Beta 0.751: V2 Pro pending UX — correct label, X inside tag, OK/Cancel per drag, edit guard."""
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

print("=== patch_751.py — Beta 0.751 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.750</title>',
    '<title>DVL Binance Live — Beta 0.751</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.750";',
    'const DVL_APP_VERSION = "Beta 0.751";', "version const")

html = rep(html,
    '>BETA 0.750</span>',
    '>BETA 0.751</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.750 — global drag guard; no X on resting limit tag; BUY/SELL LIMIT/STOP label; re-drag shows confirm." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.751 — V2 Pro pending UX: BUY/SELL LIMIT/STOP label, X inside entry tag, OK/Cancel on every drag, state.edit guard prevents activation during review." },\n  { version: "Beta 0.750", note: "Beta 0.750 — global drag guard; no X on resting limit tag; BUY/SELL LIMIT/STOP label; re-drag shows confirm." },',
    "changelog")

# ── 2. Audit bump 0750 → 0751 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0750_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0751_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.750"',
    'window.DVL_APP_VERSION==="Beta 0.751"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.750' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.751' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.750")===-1) blockers.push("A2: title missing 0.750")',
    'indexOf("0.751")===-1) blockers.push("A2: title missing 0.751")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0750_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0751_AUDIT_MODULE";',
    "audit name bump")

# ── 3. V2 Pro — maybeFill: add state.edit guard ──────────────────────────────────
# Without this, a pending order being reviewed (edit state) could activate if
# the live price crosses its entry between endDrag clearing state.drag and the
# user clicking OK. state.drag is already cleared at render time.
html = rep(html,
    "if(state.drag||window.__dvlPaperV2ProDragging)return; var live=currentPrice();",
    "if(state.drag||window.__dvlPaperV2ProDragging)return; if(state.edit&&String(state.edit.id)===String(o.id))return; var live=currentPrice();",
    "V2 maybeFill: state.edit guard")

# ── 4. V2 Pro — add getPendingEntryLabel before labelText ────────────────────────
# Uses pos.side + orderType/type/triggerType to return BUY/SELL LIMIT/STOP.
html = rep(html,
    "  function labelText(o,kind){",
    "  function getPendingEntryLabel(o){var side=String(o.side||'').toLowerCase();var type=String(o.orderType||o.type||o.triggerType||'').toLowerCase();if(side==='buy'&&type==='stop')return 'BUY STOP';if(side==='sell'&&type==='stop')return 'SELL STOP';if(side==='buy')return 'BUY LIMIT';return 'SELL LIMIT';}\n  function labelText(o,kind){",
    "V2 getPendingEntryLabel function")

# ── 5. V2 Pro — labelText: use getPendingEntryLabel for pending/draft entry ──────
# Replaces generic 'LIMIT'/'STOP' fallback with the proper side+type label.
html = rep(html,
    "if(o.status==='draft'||o.status==='pending') return o.orderLabel||(o.type==='stop'?'STOP':'LIMIT');",
    "if(o.status==='draft'||o.status==='pending') return o.orderLabel||getPendingEntryLabel(o);",
    "V2 labelText: use getPendingEntryLabel")

# ── 6. V2 Pro — tag: X inside entry tag for pending (same as open) ───────────────
# Clicking X on a pending entry calls closeOrCancelPaperOrder which cancels the order.
# Previously X only appeared inside the tag for open (active) orders.
html = rep(html,
    "if(kind==='entry'&&o.status==='open'){html+='<button class=\"dvl-pv2p-close\" type=\"button\" data-close-trade=\"1\">×</button>';}",
    "if(kind==='entry'&&(o.status==='open'||o.status==='pending')){html+='<button class=\"dvl-pv2p-close\" type=\"button\" data-close-trade=\"1\">×</button>';}",
    "V2 tag: X inside entry tag for pending")

# ── 7. V2 Pro — controls: track pendingEdit + correct count ──────────────────────
# pendingEdit = pending order has state.edit set for the 'entry' handle.
# count=2 for both draft AND pendingEdit (shows two buttons: OK + Cancel).
html = rep(html,
    "c.dataset.id=o.id; var count=o.status==='draft'?2:1; var w=",
    "c.dataset.id=o.id; var pendingEdit=!!(state.edit&&String(state.edit.id)===String(o.id)&&state.edit.kind==='entry'); var count=(o.status==='draft'||pendingEdit)?2:1; var w=",
    "V2 controls: pendingEdit flag + count fix")

# ── 8. V2 Pro — controls: pending resting = nothing; pending edit = OK/Cancel ────
# In resting state (no state.edit) the X is already inside the tag — no external button.
# In edit state (after entry drag) show OK (confirm) and × (revert to orig).
html = rep(html,
    "else if(o.status==='pending'){c.innerHTML='<button class=\"dvl-pv2p-btn cancel\" type=\"button\">×</button>'; c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelPaperOrder(o.id);});} else return;",
    "else if(o.status==='pending'){if(!pendingEdit)return; c.innerHTML='<button class=\"dvl-pv2p-btn ok\" type=\"button\">✓</button><button class=\"dvl-pv2p-btn cancel\" type=\"button\">×</button>'; c.querySelector('.ok').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();confirmTpSlEdit(o.id,'entry');}); c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelTpSlEdit(o.id,'entry');});} else return;",
    "V2 controls: pending OK/Cancel in edit, nothing in resting")

# ── 9. V2 Pro — editControls: extend to pending (TP/SL drag confirm) ─────────────
# Previously only showed OK/Cancel buttons for open orders dragging TP/SL.
# Now pending orders also get OK/Cancel when dragging TP or SL.
html = rep(html,
    "||String(state.edit.id)!==String(o.id)||state.edit.kind!==kind||o.status!=='open')return; var c=mk('dvl-pv2p-controls edit",
    "||String(state.edit.id)!==String(o.id)||state.edit.kind!==kind||!(o.status==='open'||o.status==='pending'))return; var c=mk('dvl-pv2p-controls edit",
    "V2 editControls: extend to pending")

# ── 10. V2 Pro — startDrag: set state.edit for ALL pending drags ──────────────────
# Previously state.edit was only set for open-status TP/SL drags. For pending,
# state.edit was null, so endDrag auto-saved without showing OK/Cancel.
# Now pending drags also set state.edit → endDrag does NOT auto-save → shows OK/Cancel.
html = rep(html,
    "if(o.status==='open'&&(kind==='tp'||kind==='sl')){if(!(state.edit&&String(state.edit.id)===String(id)&&state.edit.kind===kind)){state.edit={id:id,kind:kind,orig:{entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}};}} state.drag={id:id,kind:kind,pid:ev.pointerId",
    "if(o.status==='open'&&(kind==='tp'||kind==='sl')){if(!(state.edit&&String(state.edit.id)===String(id)&&state.edit.kind===kind)){state.edit={id:id,kind:kind,orig:{entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}};}} if(o.status==='pending'){if(!(state.edit&&String(state.edit.id)===String(id)&&state.edit.kind===kind)){state.edit={id:id,kind:kind,orig:{entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}};}} state.drag={id:id,kind:kind,pid:ev.pointerId",
    "V2 startDrag: set state.edit for pending drags")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
