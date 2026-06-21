#!/usr/bin/env python3
"""patch_723.py — Beta 0.723: All indicators OFF by default for new users,
Sessions OFF by default, DVL Teste 1+2 default off (new users only)."""
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

print("=== patch_723.py — Beta 0.723 ===")

# ── 1-4. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.722</title>',
    '<title>DVL Binance Live — Beta 0.723</title>', "title")
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.722";',
    'const DVL_APP_VERSION = "Beta 0.723";', "version const")
html = rep(html, '>BETA 0.722</span>', '>BETA 0.723</span>', "badge")
html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.722 — footer active button 55px centered, logo click reloads page, indicator panel 250px." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.723 — all indicators OFF by default for new users, sessions OFF by default, DVL Teste removed from defaults." },\n  { version: "Beta 0.722", note: "Beta 0.722 — footer active button 55px centered, logo click reloads page, indicator panel 250px." },',
    "changelog")

# ── 2. Audit bump ────────────────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0722_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0723_AUDIT_MODULE">', "audit script id")
html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.722"',
    'window.DVL_APP_VERSION==="Beta 0.723"', "audit A1 check")
html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.722' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.723' (got: ", "audit A1 msg")
html = rep(html,
    'indexOf("0.722")===-1) blockers.push("A2: title missing 0.722")',
    'indexOf("0.723")===-1) blockers.push("A2: title missing 0.723")', "audit A2")
html = rep(html,
    'var N=77, name="DVL_UI_OVERLAY_PHASE_0722_AUDIT_MODULE";',
    'var N=77, name="DVL_UI_OVERLAY_PHASE_0723_AUDIT_MODULE";', "audit N name")

# ── 3. INDICATORS — set DEFAULTS.on:false for new users ─────────────────────────
# Each replacement uses unique context from the next line to distinguish blocks.

# DVL Volume Trace (unique: visualStyle)
html = rep(html,
    'on:true,\n    visualStyle:"horizontal",',
    'on:false,\n    visualStyle:"horizontal",', "DEFAULTS off: DVL Volume Trace")

# DVL MA (unique: showLabels:false after on)
html = rep(html,
    'on:true,\n    showLabels:false,\n    items:[\n      {enabled:true',
    'on:false,\n    showLabels:false,\n    items:[\n      {enabled:true', "DEFAULTS off: DVL MA")

# DVL Spike Zones (unique: tf:"chart")
html = rep(html,
    'on:true,\n    tf:"chart",',
    'on:false,\n    tf:"chart",', "DEFAULTS off: DVL Spike Zones")

# DVL Volume Indicator (unique: maOn:true after on)
html = rep(html,
    'on:true,\n    maOn:true,',
    'on:false,\n    maOn:true,', "DEFAULTS off: DVL Volume Indicator")

# DVL Teste 1 (unique: splitRatio:0.62)
html = rep(html,
    'on:true,\n    viewCount:140,\n    offset:-24,\n    splitRatio:0.62,',
    'on:false,\n    viewCount:140,\n    offset:-24,\n    splitRatio:0.62,', "DEFAULTS off: DVL Teste 1")

# DVL Teste 2 (unique: center:50 + range:100, NO splitRatio)
html = rep(html,
    'on:true,\n    viewCount:140,\n    offset:-24,\n    center:50,\n    range:100',
    'on:false,\n    viewCount:140,\n    offset:-24,\n    center:50,\n    range:100', "DEFAULTS off: DVL Teste 2")

# DVL OI (unique: source:"binance")
html = rep(html,
    'on:true,\n    source:"binance",',
    'on:false,\n    source:"binance",', "DEFAULTS off: DVL OI")

# DVL Long/Short (unique: mode:"global")
html = rep(html,
    'on:true,\n    mode:"global",',
    'on:false,\n    mode:"global",', "DEFAULTS off: DVL Long/Short")

# DVL Delta Volume (unique: single-line DEFAULTS)
html = rep(html,
    'const DEFAULTS = { on:true, maLen:0 };',
    'const DEFAULTS = { on:false, maLen:0 };', "DEFAULTS off: DVL Delta Volume")

# DVL Volume Profile (unique: rows: 120)
html = rep(html,
    'on: true,\n    rows: 120,',
    'on: false,\n    rows: 120,', "DEFAULTS off: DVL Volume Profile")

# ── 4. SESSIONS — off by default for new users ──────────────────────────────────
# JS default
html = rep(html,
    'let sessionsOn = true;',
    'let sessionsOn = false;', "sessionsOn default false")

# sessionsToggle HTML checkbox: remove checked
html = rep(html,
    '<input id="sessionsToggle" type="checkbox" checked>',
    '<input id="sessionsToggle" type="checkbox">', "sessionsToggle unchecked")

# Individual session checkboxes: remove checked
html = rep(html,
    'data-session="asia" checked>',
    'data-session="asia">', "session asia unchecked")
html = rep(html,
    'data-session="london" checked>',
    'data-session="london">', "session london unchecked")
html = rep(html,
    'data-session="newyork" checked>',
    'data-session="newyork">', "session newyork unchecked")
html = rep(html,
    'data-session="sydney" checked>',
    'data-session="sydney">', "session sydney unchecked")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
