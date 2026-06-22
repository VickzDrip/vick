#!/usr/bin/env python3
"""patch_753.py — Beta 0.753: Remove setTimeout violation; fix entry label during loading; re-render after loadAll."""
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

print("=== patch_753.py — Beta 0.753 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.752</title>',
    '<title>DVL Binance Live — Beta 0.753</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.752";',
    'const DVL_APP_VERSION = "Beta 0.753";', "version const")

html = rep(html,
    '>BETA 0.752</span>',
    '>BETA 0.753</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.752 — Fix TP/SL visibility regression: clear state.edit after OK/Cancel confirmed, protect renderOrder early return." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.753 — Remove setTimeout; fix entry label during loading; re-render paper after loadAll." },\n  { version: "Beta 0.752", note: "Beta 0.752 — Fix TP/SL visibility regression: clear state.edit after OK/Cancel confirmed, protect renderOrder early return." },',
    "changelog")

# ── 2. Audit bump 0752 → 0753 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0752_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0753_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.752"',
    'window.DVL_APP_VERSION==="Beta 0.753"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.752' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.753' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.752")===-1) blockers.push("A2: title missing 0.752")',
    'indexOf("0.753")===-1) blockers.push("A2: title missing 0.753")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0752_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0753_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Remove setTimeout from endDrag (violates absolute rule) ────────────────────
# Revert endDrag back to clean version without the auto-reset timer.
html = rep(html,
    "  function endDrag(){if(!state.drag)return; var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; window.__dvlPaperGestureActive=false; window.__dvlPaperDragLock=false; window.__dvlPositionDragActive=false; window.__dvlLongShortV2Dragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); document.documentElement.classList.remove('dvl-paper-gesture-active'); if(!(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind))save(); render(); window.__dvlPaperV2ProDragging=false; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); if(state.edit){clearTimeout(state._editAutoResetTimer); state._editAutoResetTimer=setTimeout(function(){if(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind){state.edit=null;render();toast('Edit reverted (timeout)');}},3000);}}",
    "  function endDrag(){if(!state.drag)return; var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; window.__dvlPaperGestureActive=false; window.__dvlPaperDragLock=false; window.__dvlPositionDragActive=false; window.__dvlLongShortV2Dragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); document.documentElement.classList.remove('dvl-paper-gesture-active'); if(!(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind))save(); render(); window.__dvlPaperV2ProDragging=false; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK();}",
    "endDrag: remove setTimeout")

# ── 4. Remove clearTimeout from confirmTpSlEdit ───────────────────────────────────
html = rep(html,
    "  function confirmTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; clearTimeout(state._editAutoResetTimer); state.edit=null; save(); render();}",
    "  function confirmTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; state.edit=null; save(); render();}",
    "confirmTpSlEdit: remove clearTimeout")

# ── 5. Remove clearTimeout from cancelTpSlEdit ────────────────────────────────────
html = rep(html,
    "  function cancelTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; clearTimeout(state._editAutoResetTimer); var o=find(id); if(o&&state.edit.orig){o.entry=n(state.edit.orig.entry); o.tp=n(state.edit.orig.tp); o.sl=n(state.edit.orig.sl); o.qty=qty(o.entry);} state.edit=null; save(); render();}",
    "  function cancelTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; var o=find(id); if(o&&state.edit.orig){o.entry=n(state.edit.orig.entry); o.tp=n(state.edit.orig.tp); o.sl=n(state.edit.orig.sl); o.qty=qty(o.entry);} state.edit=null; save(); render();}",
    "cancelTpSlEdit: remove clearTimeout")

# ── 6. labelText: show entry price when live=0 (during Binance loading) ─────────
# When chart is still loading, currentPrice() returns 0.
# Open trade entry would show "0,00% 0.00$" — confusing. Show the entry price instead.
html = rep(html,
    "  function labelText(o,kind){var price=kind==='tp'?o.tp:(kind==='sl'?o.sl:o.entry); if(kind==='tp'||kind==='sl'){var prefix=kind==='tp'?'TP':'SL'; return prefix+' '+fmtPaperPriceShort(price)+' '+fmtPctSigned(pctAt(o,price));} if(kind==='entry'){if(o.status==='draft'||o.status==='pending') return o.orderLabel||getPendingEntryLabel(o); var live=currentPrice(); return fmtPctSigned(pctAt(o,live))+' '+fmtMoneySigned(pnlAt(o,live));} return fmtPaperPriceShort(price);}",
    "  function labelText(o,kind){var price=kind==='tp'?o.tp:(kind==='sl'?o.sl:o.entry); if(kind==='tp'||kind==='sl'){var prefix=kind==='tp'?'TP':'SL'; return prefix+' '+fmtPaperPriceShort(price)+' '+fmtPctSigned(pctAt(o,price));} if(kind==='entry'){if(o.status==='draft'||o.status==='pending') return o.orderLabel||getPendingEntryLabel(o); var live=currentPrice(); if(!(live>0)) return fmtPaperPriceShort(o.entry); return fmtPctSigned(pctAt(o,live))+' '+fmtMoneySigned(pnlAt(o,live));} return fmtPaperPriceShort(price);}",
    "labelText: show entry price when live=0 during loading")

# ── 7. loadAll success path: re-render V2 Pro after hiding loading screen ─────────
# After loadAll hides loading and calls drawSoon, the V2 Pro 900ms interval may
# not fire immediately. Call render() directly so paper tags appear without delay.
html = rep(html,
    "    els.loading.classList.add(\"hidden\");\n    if(candleMode === \"footprint\") fetchFootprintData();\n    drawSoon();\n    if(typeof _klWsConnect==='function') _klWsConnect();",
    "    els.loading.classList.add(\"hidden\");\n    try{if(window.DVL_PAPER_TRADING_V2_PRO&&typeof window.DVL_PAPER_TRADING_V2_PRO.render==='function')window.DVL_PAPER_TRADING_V2_PRO.render();}catch(_){}\n    if(candleMode === \"footprint\") fetchFootprintData();\n    drawSoon();\n    if(typeof _klWsConnect==='function') _klWsConnect();",
    "loadAll success: re-render V2 Pro after loading hides")

# ── 8. loadAll catch path: re-render V2 Pro after hiding loading screen ───────────
html = rep(html,
    "    els.loading.classList.add(\"hidden\");\n    showToast(\"Binance não respondeu agora. Mantive fallback visual/local até a API voltar.\");",
    "    els.loading.classList.add(\"hidden\");\n    try{if(window.DVL_PAPER_TRADING_V2_PRO&&typeof window.DVL_PAPER_TRADING_V2_PRO.render==='function')window.DVL_PAPER_TRADING_V2_PRO.render();}catch(_){}\n    showToast(\"Binance não respondeu agora. Mantive fallback visual/local até a API voltar.\");",
    "loadAll catch: re-render V2 Pro after loading hides")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
