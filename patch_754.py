#!/usr/bin/env python3
"""patch_754.py — Beta 0.754: Fix risk() hardcoded min=1 that breaks low-priced coins; sanitize corrupted orders."""
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

print("=== patch_754.py — Beta 0.754 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.753</title>',
    '<title>DVL Binance Live — Beta 0.754</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.753";',
    'const DVL_APP_VERSION = "Beta 0.754";', "version const")

html = rep(html,
    '>BETA 0.753</span>',
    '>BETA 0.754</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.753 — Remove setTimeout; fix entry label during loading; re-render paper after loadAll." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.754 — Fix risk() hardcoded min=1 that sent TP/SL to limbo on low-priced coins (XRP, DOGE etc); sanitize corrupted orders." },\n  { version: "Beta 0.753", note: "Beta 0.753 — Remove setTimeout; fix entry label during loading; re-render paper after loadAll." },',
    "changelog")

# ── 2. Audit bump 0753 → 0754 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0753_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0754_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.753"',
    'window.DVL_APP_VERSION==="Beta 0.754"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.753' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.754' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.753")===-1) blockers.push("A2: title missing 0.753")',
    'indexOf("0.754")===-1) blockers.push("A2: title missing 0.754")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0753_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0754_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Fix risk(): replace hardcoded min=1 with entry-relative minimum ───────────
# BUG: Math.max(entry*0.00045, 1) → for XRP at 0.16, min = max(0.000072, 1) = 1
#      This made TP = 0.16+1 = 1.16 (off chart) and SL = 0.16-1 = -0.84 (negative!)
# FIX: Use entry*0.002 (0.2% of price) as minimum instead of hardcoded 1.
#      For XRP 0.16: min = 0.00032 → TP ≈ 0.1603, SL ≈ 0.1597 (both on chart ✓)
#      For BTC 65000: min = 130 (was 29.25 before, capped by max=260 either way ✓)
html = rep(html,
    "  function risk(entry){entry=Math.abs(n(entry)); var r=entry*0.0012; try{var si=priceScaleInfo(); if(si&&si.sc&&Number.isFinite(si.sc.hi)&&Number.isFinite(si.sc.lo)){var span=Math.abs(si.sc.hi-si.sc.lo); if(span>0) r=span*0.14;}}catch(_){} var min=Math.max(entry*0.00045,1); var max=Math.max(entry*0.004,min); return clamp(r,min,max);}",
    "  function risk(entry){entry=Math.abs(n(entry)); var r=entry*0.0012; try{var si=priceScaleInfo(); if(si&&si.sc&&Number.isFinite(si.sc.hi)&&Number.isFinite(si.sc.lo)){var span=Math.abs(si.sc.hi-si.sc.lo); if(span>0) r=span*0.14;}}catch(_){} var min=Math.max(entry*0.002,entry*0.0001); var max=Math.max(entry*0.04,min*2); return clamp(r,min,max);}",
    "risk(): replace hardcoded min=1 with entry*0.002")

# ── 4. Add sanitizeOrder() before load() ─────────────────────────────────────────
# Detects and auto-fixes orders with invalid TP/SL (negative or zero).
# Corrupted orders arise from old risk() bug: entry 0.16 → SL=-0.84, TP=1.16.
# After fixing risk(), sanitizeOrder recalculates TP/SL for such orders so they
# appear correctly on screen without forcing the user to delete and recreate.
html = rep(html,
    "  function find(id){return state.orders.find(function(o){return String(o.id)===String(id);});}",
    "  function sanitizeOrder(o){if(!o||o.status==='closed')return o; var e=n(o.entry); if(!(e>0))return o; var tp=n(o.tp),sl=n(o.sl); if(tp>0&&sl>0)return o; var r=risk(e); if(o.side==='buy'){if(!(tp>0))o.tp=e+r; if(!(sl>0))o.sl=e-r;}else{if(!(tp>0))o.tp=e-r; if(!(sl>0))o.sl=e+r;} return o;}\n  function find(id){return state.orders.find(function(o){return String(o.id)===String(id);});}",
    "sanitizeOrder() before find()")

# ── 5. Call sanitizeOrder in load() after filtering ──────────────────────────────
html = rep(html,
    "  function load(){try{var a=JSON.parse(localStorage.getItem(key())||'[]'); state.orders=Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='draft';}):[];}catch(_){state.orders=[];}}",
    "  function load(){try{var a=JSON.parse(localStorage.getItem(key())||'[]'); state.orders=Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='draft';}).map(sanitizeOrder):[];}catch(_){state.orders=[];}}",
    "load(): call sanitizeOrder on each loaded order")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
