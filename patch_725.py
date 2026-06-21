#!/usr/bin/env python3
"""patch_725.py — Beta 0.725: Remove fake trades from Positions panel, remove DVL Teste 1+2."""
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

def rep_re(html, pattern, new, label, expect=1):
    html2, n = re.subn(pattern, new, html, flags=re.DOTALL)
    if n != expect:
        print(f"ABORT [{label}] — expected {expect} regex match(es), got {n}")
        sys.exit(1)
    print(f"  OK: {label}")
    return html2

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_725.py — Beta 0.725 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.724</title>',
    '<title>DVL Binance Live — Beta 0.725</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.724";',
    'const DVL_APP_VERSION = "Beta 0.725";', "version const")

html = rep(html,
    '>BETA 0.724</span>',
    '>BETA 0.725</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.724 — integrated functional Positions panel, Watchlist bottom nav rename, Demo/Real toggle and Position Details drawer." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.725 — removed fake trades from Positions panel, removed DVL Teste 1 and Teste 2 indicators." },\n  { version: "Beta 0.724", note: "Beta 0.724 — integrated functional Positions panel, Watchlist bottom nav rename, Demo/Real toggle and Position Details drawer." },',
    "changelog")

# ── 2. Audit bump 0724 → 0725 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0724_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0725_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.724"',
    'window.DVL_APP_VERSION==="Beta 0.725"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.724' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.725' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.724")===-1) blockers.push("A2: title missing 0.724")',
    'indexOf("0.725")===-1) blockers.push("A2: title missing 0.725")', "audit A2")

html = rep(html,
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0724_AUDIT_MODULE";',
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0725_AUDIT_MODULE";', "audit N name")

# ── 3. Empty fake trades from Positions panel ─────────────────────────────────────
html = rep(html,
    '    open: [\n'
    '      { symbol:"BTC/USDT", coin:"btc", side:"Long", leverage:"10x", entry:"63.420,1", current:"63.995,2", pnl:"+575,10", pct:"+0,91%", direction:"positive" },\n'
    '      { symbol:"ETH/USDT", coin:"eth", side:"Short", leverage:"5x", entry:"3.385,70", current:"3.348,22", pnl:"-187,40", pct:"-0,55%", direction:"negative" },\n'
    '      { symbol:"SOL/USDT", coin:"sol", side:"Long", leverage:"5x", entry:"158,420", current:"161,870", pnl:"+172,50", pct:"+2,17%", direction:"positive" }\n'
    '    ],\n'
    '    pending: [\n'
    '      { symbol:"BTC/USDT", coin:"btc", side:"Buy Limit", leverage:"10x", entry:"63.120,0", current:"Aguardando", pnl:"Pendente", pct:"TP/SL ativo", direction:"positive" },\n'
    '      { symbol:"ETH/USDT", coin:"eth", side:"Sell Stop", leverage:"5x", entry:"3.310,00", current:"Aguardando", pnl:"Pendente", pct:"TP/SL ativo", direction:"negative" }\n'
    '    ],\n'
    '    history: [\n'
    '      { symbol:"BTC/USDT", coin:"btc", side:"Long", leverage:"10x", entry:"62.900,2", current:"63.480,7", pnl:"+251,90", pct:"TP", direction:"positive" },\n'
    '      { symbol:"SOL/USDT", coin:"sol", side:"Short", leverage:"5x", entry:"165,120", current:"167,300", pnl:"-84,20", pct:"SL", direction:"negative" }\n'
    '    ]',
    '    open: [],\n'
    '    pending: [],\n'
    '    history: []',
    "empty fake trades data")

# ── 4. Empty DVL Teste 1 IIFE (keep script tag so audit A42 still passes) ────────
html = rep_re(html,
    r'(<script id="DVL_BETA_0538_TEST_OSCILLATOR_JS">)\s*\(function\(\)\{[\s\S]*?\}\)\(\);\s*(</script>)',
    r'\1\n/* DVL Teste 1 removed */\n\2',
    "empty DVL Teste 1 module")

# ── 5. Empty DVL Teste 2 IIFE (keep script tag) ──────────────────────────────────
html = rep_re(html,
    r'(<script id="DVL_BETA_0549_TESTE2_OSCILLATOR_JS">)\s*\(function\(\)\{[\s\S]*?\}\)\(\);\s*(</script>)',
    r'\1\n/* DVL Teste 2 removed */\n\2',
    "empty DVL Teste 2 module")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
