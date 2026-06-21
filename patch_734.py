#!/usr/bin/env python3
"""patch_734.py — Beta 0.734: fix history detail using live price; timeline with date."""
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

print("=== patch_734.py — Beta 0.734 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.733</title>',
    '<title>DVL Binance Live — Beta 0.734</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.733";',
    'const DVL_APP_VERSION = "Beta 0.734";', "version const")

html = rep(html,
    '>BETA 0.733</span>',
    '>BETA 0.734</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.733 — position details panel now shows real V2 Pro order data (entry, qty, TP, SL, PnL, timeline)." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.734 — fixed history detail using live price instead of realizedPnl; timeline now shows date." },\n  { version: "Beta 0.733", note: "Beta 0.733 — position details panel now shows real V2 Pro order data (entry, qty, TP, SL, PnL, timeline)." },',
    "changelog")

# ── 2. Audit bump 0733 → 0734 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0733_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0734_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.733"',
    'window.DVL_APP_VERSION==="Beta 0.734"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.733' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.734' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.733")===-1) blockers.push("A2: title missing 0.733")',
    'indexOf("0.734")===-1) blockers.push("A2: title missing 0.734")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0733_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0734_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Fix buildRealRow: "history" tab also uses realizedPnl (not live price) ────
html = rep(html,
    '    if(status==="closed"){\n'
    '      var exitP=Number(o.exitPrice||o.closedPrice||0);\n'
    '      pv=Number(o.realizedPnl); pc=Number(o.realizedPnlPct);\n'
    '      cur=exitP>0?_fp2(exitP):"--"; direction=(Number.isFinite(pv)&&pv>=0)?"positive":"negative";\n'
    '    } else if(status==="pending"){',
    '    if(status==="closed"||status==="history"){\n'
    '      var exitP=Number(o.exitPrice||o.closedPrice||0);\n'
    '      pv=Number(o.realizedPnl); pc=Number(o.realizedPnlPct);\n'
    '      cur=exitP>0?_fp2(exitP):"--"; direction=(Number.isFinite(pv)&&pv>=0)?"positive":"negative";\n'
    '    } else if(status==="pending"){',
    "buildRealRow: history uses realizedPnl")

# ── 4. _fmtTime: return DD/MM HH:MM ─────────────────────────────────────────────
html = rep(html,
    '  function _fmtTime(ts){ try{ var d=new Date(Number(ts)); return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }catch(_){ return "--:--"; } }',
    '  function _fmtTime(ts){ try{ var d=new Date(Number(ts)); return ("0"+d.getDate()).slice(-2)+"/"+(("0"+(d.getMonth()+1)).slice(-2))+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }catch(_){ return "--"; } }',
    "_fmtTime: add date")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
