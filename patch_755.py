#!/usr/bin/env python3
"""patch_755.py — Beta 0.755: Fix trade closes on symbol change; fix selector button not updating."""
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

print("=== patch_755.py — Beta 0.755 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.754</title>',
    '<title>DVL Binance Live — Beta 0.755</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.754";',
    'const DVL_APP_VERSION = "Beta 0.755";', "version const")

html = rep(html,
    '>BETA 0.754</span>',
    '>BETA 0.755</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.754 — Fix risk() hardcoded min=1 that sent TP/SL to limbo on low-priced coins (XRP, DOGE etc); sanitize corrupted orders." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.755 — Fix trade closes on symbol change; fix selector button not updating on symbol change." },\n  { version: "Beta 0.754", note: "Beta 0.754 — Fix risk() hardcoded min=1 that sent TP/SL to limbo on low-priced coins (XRP, DOGE etc); sanitize corrupted orders." },',
    "changelog")

# ── 2. Audit bump 0754 → 0755 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0754_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0755_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.754"',
    'window.DVL_APP_VERSION==="Beta 0.755"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.754' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.755' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.754")===-1) blockers.push("A2: title missing 0.754")',
    'indexOf("0.755")===-1) blockers.push("A2: title missing 0.755")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0754_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0755_AUDIT_MODULE";',
    "audit name bump")

# ── 3. V2 Pro: add _lastSym tracker after state declaration ──────────────────────
# _lastSym tracks the previously rendered symbol so render() can detect changes.
html = rep(html,
    "  var state = {orders:[], selectedId:null, drag:null, edit:null, lastAudit:null};",
    "  var state = {orders:[], selectedId:null, drag:null, edit:null, lastAudit:null};\n  var _lastSym = '';",
    "V2 Pro: add _lastSym tracker")

# ── 4. V2 Pro: render() — detect symbol change, save old, load new ────────────────
# BUG: When user switches symbol, loadAll() triggers render() (via patch_753).
# state.orders still has OLD symbol's orders. maybeCloseOpen() uses currentPrice()
# = NEW symbol's price → false close! (e.g. BTC price 65000 > XRP TP 0.165 → closes)
#
# FIX: At the start of render(), detect if symbol changed. If so:
# 1. Manually save old symbol's orders to its own localStorage key
# 2. Clear state
# 3. Load new symbol's orders via load()
html = rep(html,
    "  function render(){if(!ENABLED)return; var layer=ensureLayer(); if(!layer)return; cleanupLegacy(); layer.innerHTML=''; if(state.edit&&!find(state.edit.id))state.edit=null; state.orders.forEach(function(o){renderOrder(layer,o);});}",
    "  function render(){var _sym=symbolName(); if(_lastSym&&_sym!==_lastSym){try{var _sv=state.orders.filter(function(o){return o&&o.status!=='closed'&&o.status!=='draft';}); if(_sv.length)localStorage.setItem('dvl_paper_v2_pro_0695_'+_lastSym,JSON.stringify(_sv));}catch(_){} state.orders=[];state.selectedId=null;state.edit=null;state.drag=null; load();} _lastSym=_sym; if(!ENABLED)return; var layer=ensureLayer(); if(!layer)return; cleanupLegacy(); layer.innerHTML=''; if(state.edit&&!find(state.edit.id))state.edit=null; state.orders.forEach(function(o){renderOrder(layer,o);});}",
    "render(): detect symbol change, save old, load new")

# ── 5. V2 Pro: renderOrder() — symbol guard as safety belt ───────────────────────
# Even if state.orders were somehow populated with orders from another symbol
# (edge case or timing issue), this guard prevents false maybeFill/maybeCloseOpen.
html = rep(html,
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; maybeFill(o);",
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; if(o.symbol&&o.symbol!==symbolName())return; maybeFill(o);",
    "renderOrder(): symbol guard")

# ── 6. updateHeader(): also update dvl1b_symbolText (DVL 1B selector button) ─────
# BUG: updateHeader() updates els.symbolText (old header) but NOT dvl1b_symbolText
# (DVL 1B button). The Promise.then() in bridge only fires on dropdown clicks, not
# on asset changes via watchlist, Markets tab, keyboard shortcuts, etc.
#
# FIX: Add dvl1b_symbolText update inside updateHeader() — fires for ALL symbol
# changes from any source (selectSymbol → updateHeader → both headers updated).
html = rep(html,
    "function updateHeader(){\n  els.symbolText.textContent = symbol.replace(\"USDT\",\"/USDT\");",
    "function updateHeader(){\n  els.symbolText.textContent = symbol.replace(\"USDT\",\"/USDT\");\n  try{var _d1bST=document.getElementById(\"dvl1b_symbolText\");if(_d1bST)_d1bST.textContent=symbol.replace(\"USDT\",\"/USDT\");}catch(_){}",
    "updateHeader(): sync dvl1b_symbolText")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
