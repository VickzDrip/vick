#!/usr/bin/env python3
"""patch_736.py — Beta 0.736: pending order always shows × on chart; drag clamped to chart bounds."""
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

print("=== patch_736.py — Beta 0.736 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.735</title>',
    '<title>DVL Binance Live — Beta 0.736</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.735";',
    'const DVL_APP_VERSION = "Beta 0.736";', "version const")

html = rep(html,
    '>BETA 0.735</span>',
    '>BETA 0.736</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.735 — Real mode shows no demo data; pending orders have delete button." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.736 — pending order × always visible on chart; drag clamped to chart bounds." },\n  { version: "Beta 0.735", note: "Beta 0.735 — Real mode shows no demo data; pending orders have delete button." },',
    "changelog")

# ── 2. Audit bump 0735 → 0736 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0735_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0736_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.735"',
    'window.DVL_APP_VERSION==="Beta 0.736"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.735' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.736' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.735")===-1) blockers.push("A2: title missing 0.735")',
    'indexOf("0.736")===-1) blockers.push("A2: title missing 0.736")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0735_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0736_AUDIT_MODULE";',
    "audit name bump")

# ── 3. controls(): × always visible for pending (remove && o.selected guard) ─────
html = rep(html,
    "    else if(o.status==='pending' && o.selected){c.innerHTML='<button class=\"dvl-pv2p-btn cancel\" type=\"button\">×</button>'; c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelPaperOrder(o.id);});} else return; layer.appendChild(c);}",
    "    else if(o.status==='pending'){c.innerHTML='<button class=\"dvl-pv2p-btn cancel\" type=\"button\">×</button>'; c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelPaperOrder(o.id);});} else return; layer.appendChild(c);}",
    "controls: × always visible for pending")

# ── 4. moveDrag(): clamp Y to chart plot area before price conversion ─────────────
html = rep(html,
    ' var rect=si.wrap.getBoundingClientRect(), y=ev.clientY-rect.top, cur=si.yToPrice(y), dp=cur-state.drag.startPrice;',
    ' var rect=si.wrap.getBoundingClientRect(), y=clamp(ev.clientY-rect.top,si.top,si.bottom), cur=si.yToPrice(y), dp=cur-state.drag.startPrice;',
    "moveDrag: clamp y to si.top/si.bottom")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
