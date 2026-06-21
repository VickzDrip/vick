#!/usr/bin/env python3
"""patch_741.py — Beta 0.741: gear icon fixed; settings panel wired."""
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

print("=== patch_741.py — Beta 0.741 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.740</title>',
    '<title>DVL Binance Live — Beta 0.741</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.740";',
    'const DVL_APP_VERSION = "Beta 0.741";', "version const")

html = rep(html,
    '>BETA 0.740</span>',
    '>BETA 0.741</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.740 — reset ↺ fills pill height; symbol selector wired in new header." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.741 — gear icon fixed; settings panel wired to chart settings." },\n  { version: "Beta 0.740", note: "Beta 0.740 — reset ↺ fills pill height; symbol selector wired in new header." },',
    "changelog")

# ── 2. Audit bump 0740 → 0741 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0740_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0741_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.740"',
    'window.DVL_APP_VERSION==="Beta 0.741"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.740' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.741' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.740")===-1) blockers.push("A2: title missing 0.740")',
    'indexOf("0.741")===-1) blockers.push("A2: title missing 0.741")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0740_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0741_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Gear SVG: replace with clean symmetric Feather-style gear ──────────────────
html = rep(html,
    '<svg viewBox="0 0 24 24"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8A3.8 3.8 0 0 0 12 8.2Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a8.1 8.1 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-1.7-1L15 6.4h-4L10.6 9a8.2 8.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a8.1 8.1 0 0 0 .1 1l-2 1.5 2 3.5 2.4-1a8.2 8.2 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8.2 8.2 0 0 0 1.7-1l2.4 1 2-3.5-2.2-1.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    "gear SVG: symmetric Feather gear")

# ── 4. CSS: make chartSettingsPanel show over new overlay ─────────────────────────
html = rep(html,
    '/* Bottom nav label text */\n'
    '.navItem span,.navItem .navLabel{color:inherit !important}\n'
    '</style>',
    '/* Bottom nav label text */\n'
    '.navItem span,.navItem .navLabel{color:inherit !important}\n'
    '\n'
    '/* settings via new header: expose toolbar overflow so panel can escape display:none */\n'
    'html.dvl-ui-1b-active .chartCard>.toolbar:has(#chartSettingsPanel.is-open){'
    'display:block!important;visibility:hidden!important;position:fixed!important;'
    'left:0!important;top:0!important;width:0!important;height:0!important;'
    'min-height:0!important;padding:0!important;margin:0!important;'
    'border:0!important;background:transparent!important;box-shadow:none!important;'
    'overflow:visible!important;pointer-events:none!important;z-index:100000!important;}\n'
    'html.dvl-ui-1b-active #chartSettingsPanel.is-open{'
    'position:fixed!important;right:10px!important;bottom:70px!important;'
    'top:auto!important;left:auto!important;pointer-events:auto!important;}\n'
    '</style>',
    "CSS: settings panel over new overlay")

# ── 5. Bridge: wire dvl1b_settingsBtn → setChartSettings ─────────────────────────
html = rep(html,
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    '  /* ── Settings button — open/close chart settings panel ── */\n'
    '  var settBtn=document.getElementById("dvl1b_settingsBtn");\n'
    '  if(settBtn) settBtn.addEventListener("click", function(e){\n'
    '    e.stopPropagation();\n'
    '    try{\n'
    '      var isOpen=(typeof chartSettingsOpen!=="undefined")?chartSettingsOpen:(window.chartSettingsOpen||false);\n'
    '      if(typeof setChartSettings==="function") setChartSettings(!isOpen);\n'
    '      else if(window.setChartSettings) window.setChartSettings(!isOpen);\n'
    '    }catch(_e){}\n'
    '  }, false);\n'
    '\n'
    '  /* Console helper: toggle the new UI on/off (also restores old chrome). */',
    "bridge: wire dvl1b_settingsBtn")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
