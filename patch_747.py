#!/usr/bin/env python3
"""patch_747.py — Beta 0.747: dropdown 400px + site palette; watchlist opens panel; symbol text syncs."""
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

print("=== patch_747.py — Beta 0.747 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.746</title>',
    '<title>DVL Binance Live — Beta 0.747</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.746";',
    'const DVL_APP_VERSION = "Beta 0.747";', "version const")

html = rep(html,
    '>BETA 0.746</span>',
    '>BETA 0.747</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.746 — drag cannot trigger/close trades; X only on entry line; TP/SL clamped at entry." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.747 — dropdown 400px, site palette (no blue); watchlist opens favorites panel; symbol text syncs after selection." },\n  { version: "Beta 0.746", note: "Beta 0.746 — drag cannot trigger/close trades; X only on entry line; TP/SL clamped at entry." },',
    "changelog")

# ── 2. Audit bump 0746 → 0747 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0746_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0747_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.746"',
    'window.DVL_APP_VERSION==="Beta 0.747"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.746' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.747' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.746")===-1) blockers.push("A2: title missing 0.746")',
    'indexOf("0.747")===-1) blockers.push("A2: title missing 0.747")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0746_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0747_AUDIT_MODULE";',
    "audit name bump")

# ── 3. assetDropdown: 400px + site palette (no blue) ─────────────────────────────
# Remove the cyan/blue glow from box-shadow, fix border to site --line colour,
# bump width from 330px to 400px.
html = rep(html,
    '  width:min(330px, calc(100vw - 28px))!important;\n'
    '  max-height:min(430px, calc(100svh - 180px))!important;\n'
    '  border:1px solid rgba(75,128,174,.34)!important;\n'
    '  border-radius:16px!important;\n'
    '  background:\n'
    '    linear-gradient(180deg, rgba(7,17,14,.985), rgba(3,10,8,.995))!important;\n'
    '  box-shadow:\n'
    '    0 22px 52px rgba(0,0,0,.48),\n'
    '    0 0 24px rgba(25,215,255,.055),\n'
    '    inset 0 0 0 1px rgba(255,255,255,.018)!important;',
    '  width:min(400px, calc(100vw - 28px))!important;\n'
    '  max-height:min(430px, calc(100svh - 180px))!important;\n'
    '  border:1px solid rgba(110,140,130,.26)!important;\n'
    '  border-radius:16px!important;\n'
    '  background:\n'
    '    linear-gradient(180deg, rgba(7,17,14,.985), rgba(3,10,8,.995))!important;\n'
    '  box-shadow:\n'
    '    0 22px 52px rgba(0,0,0,.48),\n'
    '    inset 0 0 0 1px rgba(255,255,255,.018)!important;',
    "assetDropdown: 400px + green border, no cyan shadow")

# ── 4. assetDropdownHead: green border + neutral text colours ─────────────────────
html = rep(html,
    '  border-bottom:1px solid rgba(87,132,170,.16)!important;\n'
    '}\n'
    '\n'
    '.assetDropdownHead b{\n'
    '  font-size:13px!important;\n'
    '  font-weight:900!important;\n'
    '  color:#eef6ff!important;\n'
    '  letter-spacing:.02em!important;\n'
    '}\n'
    '\n'
    '.assetDropdownHead small{\n'
    '  font-size:10px!important;\n'
    '  font-weight:800!important;\n'
    '  color:#7f90a6!important;\n'
    '}',
    '  border-bottom:1px solid rgba(110,140,130,.18)!important;\n'
    '}\n'
    '\n'
    '.assetDropdownHead b{\n'
    '  font-size:13px!important;\n'
    '  font-weight:900!important;\n'
    '  color:var(--text,#f4f6f4)!important;\n'
    '  letter-spacing:.02em!important;\n'
    '}\n'
    '\n'
    '.assetDropdownHead small{\n'
    '  font-size:10px!important;\n'
    '  font-weight:800!important;\n'
    '  color:var(--muted2,#737b79)!important;\n'
    '}',
    "assetDropdownHead: green border + neutral colours")

# ── 5. assetOption: neutral text + green active state ────────────────────────────
html = rep(html,
    '  border-radius:12px!important;\n'
    '  color:#c8d5e6!important;\n'
    '  overflow:hidden!important;\n'
    '}\n'
    '\n'
    '.assetOption.is-active{\n'
    '  background:linear-gradient(90deg, rgba(25,215,255,.12), rgba(25,215,255,.025))!important;\n'
    '  color:#eafcff!important;\n'
    '  box-shadow:inset 0 0 0 1px rgba(25,215,255,.10)!important;\n'
    '}',
    '  border-radius:12px!important;\n'
    '  color:var(--text,#f4f6f4)!important;\n'
    '  overflow:hidden!important;\n'
    '}\n'
    '\n'
    '.assetOption.is-active{\n'
    '  background:linear-gradient(90deg, rgba(16,223,119,.12), rgba(16,223,119,.025))!important;\n'
    '  color:#e8fff3!important;\n'
    '  box-shadow:inset 0 0 0 1px rgba(16,223,119,.10)!important;\n'
    '}',
    "assetOption: neutral text + green active state")

# ── 6. assetLabel small: neutral muted colour ────────────────────────────────────
html = rep(html,
    '.assetLabel small{\n'
    '  font-size:10px!important;\n'
    '  color:#7f90a6!important;\n'
    '  font-weight:750!important;\n'
    '}',
    '.assetLabel small{\n'
    '  font-size:10px!important;\n'
    '  color:var(--muted2,#737b79)!important;\n'
    '  font-weight:750!important;\n'
    '}',
    "assetLabel small: neutral muted colour")

# ── 7. assetStar: neutral colour ──────────────────────────────────────────────────
html = rep(html,
    '.assetStar{\n'
    '  width:36px!important;\n'
    '  height:100%!important;\n'
    '  display:grid!important;\n'
    '  place-items:center!important;\n'
    '  color:#8d9bae!important;\n'
    '}',
    '.assetStar{\n'
    '  width:36px!important;\n'
    '  height:100%!important;\n'
    '  display:grid!important;\n'
    '  place-items:center!important;\n'
    '  color:var(--muted,#a5aaa9)!important;\n'
    '}',
    "assetStar: neutral muted colour")

# ── 8. dvl1b_favBtn: open watchlist panel instead of toggling current symbol ─────
# Previously toggled the current asset as a favourite (confusing for watchlist btn).
# Now opens/closes the assetFavoritesDrawer (the actual favourites panel).
html = rep(html,
    '  /* FAVORITE -> toggleFavoriteSymbol(currentSymbol) */\n'
    '  var fav=document.getElementById("dvl1b_favBtn");\n'
    '  if(fav) fav.addEventListener("click", function(){\n'
    '    try{ var s=curSym(); if(s){ if(typeof toggleFavoriteSymbol==="function") toggleFavoriteSymbol(s); else if(window.toggleFavoriteSymbol) window.toggleFavoriteSymbol(s); } }catch(_e){}\n'
    '    try{ fav.classList.toggle("is-fav"); }catch(_e){}\n'
    '  }, false);',
    '  /* WATCHLIST -> toggleAssetFavorites() opens/closes the favorites panel */\n'
    '  var fav=document.getElementById("dvl1b_favBtn");\n'
    '  if(fav) fav.addEventListener("click", function(){\n'
    '    try{ if(typeof toggleAssetFavorites==="function") toggleAssetFavorites(); else if(window.toggleAssetFavorites) window.toggleAssetFavorites(); }catch(_e){}\n'
    '  }, false);',
    "dvl1b_favBtn: open watchlist panel")

# ── 9. dvlOpen: refresh symbol text when dropdown opens ──────────────────────────
html = rep(html,
    '      try{ if(typeof openAssetDropdown==="function") openAssetDropdown();\n'
    '           else if(window.openAssetDropdown) window.openAssetDropdown(); }catch(_e){}\n'
    '      var r=symBtn.getBoundingClientRect();',
    '      try{ if(typeof openAssetDropdown==="function") openAssetDropdown();\n'
    '           else if(window.openAssetDropdown) window.openAssetDropdown(); }catch(_e){}\n'
    '      var _st=document.getElementById("dvl1b_symbolText"),_ns=fmtSym(curSym());\n'
    '      if(_st&&_ns) _st.textContent=_ns;\n'
    '      var r=symBtn.getBoundingClientRect();',
    "dvlOpen: refresh symbol text on open")

# ── 10. document click listener: sync symbol text + bridge state on asset pick ───
# When user selects an asset from the dropdown (clicks .assetPick), the old code
# handles the selection synchronously but we're in capture phase (before old handlers).
# Promise.resolve().then() runs as a microtask AFTER all event handlers, so curSym()
# already reflects the newly selected symbol at that point.
html = rep(html,
    '    document.addEventListener("click",function(e){\n'
    '      if(!dvlDDOpen) return;\n'
    '      var dd=getDD();\n'
    '      if(dd&&dd.contains(e.target)) return;\n'
    '      if(symBtn&&symBtn.contains(e.target)) return;\n'
    '      dvlClose();\n'
    '    },true);',
    '    document.addEventListener("click",function(e){\n'
    '      if(!dvlDDOpen) return;\n'
    '      var dd=getDD();\n'
    '      if(dd&&dd.contains(e.target)){\n'
    '        if(e.target&&e.target.closest&&e.target.closest(".assetPick,.assetOption")){\n'
    '          Promise.resolve().then(function(){\n'
    '            var _st2=document.getElementById("dvl1b_symbolText"),_ns2=fmtSym(curSym());\n'
    '            if(_st2&&_ns2) _st2.textContent=_ns2;\n'
    '            dvlDDOpen=false;\n'
    '          });\n'
    '        }\n'
    '        return;\n'
    '      }\n'
    '      if(symBtn&&symBtn.contains(e.target)) return;\n'
    '      dvlClose();\n'
    '    },true);',
    "document click: sync symbol text on asset pick")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
