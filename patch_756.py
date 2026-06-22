#!/usr/bin/env python3
"""patch_756.py — Beta 0.756: Fix trade close on symbol change via rawSym() bypassing S.sym lag."""
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

print("=== patch_756.py — Beta 0.756 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.755</title>',
    '<title>DVL Binance Live — Beta 0.756</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.755";',
    'const DVL_APP_VERSION = "Beta 0.756";', "version const")

html = rep(html,
    '>BETA 0.755</span>',
    '>BETA 0.756</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.755 — Fix trade closes on symbol change; fix selector button not updating on symbol change." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.756 — Fix trade close root cause: rawSym() bypasses S.sym lag so symbol guard and key() use the correct symbol immediately." },\n  { version: "Beta 0.755", note: "Beta 0.755 — Fix trade closes on symbol change; fix selector button not updating on symbol change." },',
    "changelog")

# ── 2. Audit bump 0755 → 0756 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0755_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0756_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.755"',
    'window.DVL_APP_VERSION==="Beta 0.756"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.755' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.756' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.755")===-1) blockers.push("A2: title missing 0.755")',
    'indexOf("0.756")===-1) blockers.push("A2: title missing 0.756")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0755_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0756_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Add rawSym() after symbolName() ───────────────────────────────────────────
# BUG ROOT CAUSE: symbolName() reads S.sym FIRST, which is only updated AFTER
# drawSoon() executes the chart draw. But render() is called BEFORE drawSoon()
# (from my patch_753 in loadAll). So symbolName() returns the OLD symbol even
# after selectSymbol() has already changed the global `symbol`.
#
# Result: my patch_755 symbol-change detection in render() never fires because
# symbolName() == _lastSym (both return old S.sym). The renderOrder guard also
# fails because o.symbol='BTCUSDT' === symbolName()='BTCUSDT'. Meanwhile,
# currentPrice() uses the NEW ticker (already loaded by loadAll) → XRP price
# against BTC order's TP/SL → FALSE CLOSE.
#
# FIX: rawSym() reads the raw `symbol` global FIRST (updated synchronously by
# selectSymbol before loadAll), falling back to symbolName() only if undefined.
# This ensures correct behavior immediately after selectSymbol(), without waiting
# for S.sym to be updated by drawSoon().
html = rep(html,
    "  function symbolName(){try{if(window.S&&S.sym)return String(S.sym);}catch(_){} try{if(typeof symbol!=='undefined'&&symbol)return String(symbol);}catch(_){} return 'BTCUSDT';}\n  function key(){return 'dvl_paper_v2_pro_0695_'+symbolName();}",
    "  function symbolName(){try{if(window.S&&S.sym)return String(S.sym);}catch(_){} try{if(typeof symbol!=='undefined'&&symbol)return String(symbol);}catch(_){} return 'BTCUSDT';}\n  function rawSym(){try{if(typeof symbol!=='undefined'&&symbol)return String(symbol);}catch(_){} return symbolName();}\n  function key(){return 'dvl_paper_v2_pro_0695_'+rawSym();}",
    "add rawSym() + key() uses rawSym()")

# ── 4. render(): use rawSym() for symbol change detection ────────────────────────
# Change _sym=symbolName() → _sym=rawSym() so that after selectSymbol() changes
# the `symbol` global, render() immediately detects the symbol change even before
# S.sym is updated by drawSoon().
html = rep(html,
    "  function render(){var _sym=symbolName(); if(_lastSym&&_sym!==_lastSym){",
    "  function render(){var _sym=rawSym(); if(_lastSym&&_sym!==_lastSym){",
    "render(): _sym uses rawSym()")

# ── 5. renderOrder(): guard uses rawSym() ────────────────────────────────────────
# Use rawSym() so the guard correctly blocks orders from other symbols even when
# S.sym hasn't been updated yet.
html = rep(html,
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; if(o.symbol&&o.symbol!==symbolName())return; maybeFill(o);",
    "  function renderOrder(layer,o){if(!o||o.status==='closed')return; if(o.symbol&&o.symbol!==rawSym())return; maybeFill(o);",
    "renderOrder(): guard uses rawSym()")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
