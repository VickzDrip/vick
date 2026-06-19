#!/usr/bin/env python3
"""patch_662.py — Beta 0.662 / Phase 2.6: chart/footer gap + trade drawer final lock."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-22.before_0662_layout_gap_drawer_lock.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count == 0:
        print(f"[ABORT] not found: {label}"); sys.exit(1)
    if count > 1:
        print(f"[ABORT] ambiguous ({count}x): {label}"); sys.exit(1)
    return html.replace(old, new, 1)

shutil.copy2(SRC, BAK)
print(f"[OK] backup: {BAK}")

with open(SRC, encoding="utf-8") as f:
    html = f.read()

# ── 1. Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    "<title>DVL Binance Live — Beta 0.661</title>",
    "<title>DVL Binance Live — Beta 0.662</title>",
    "title 0.661→0.662")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.661<",
    ">BETA 0.662<",
    "static badge 0.661→0.662")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.661";',
    'const DVL_APP_VERSION = "Beta 0.662";',
    "DVL_APP_VERSION 0.661→0.662")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.661 — Phase 2.5: lock final do chrome estrutural, travando header/assetbar e footer/footer buttons conforme Layout Contract." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.662 — Phase 2.6: lock final de gap chart/canvas/footer e geometria do trade drawer 150px sem sobrepor o footer." },\n  { version: "Beta 0.661", note: "Phase 2.5: lock final do chrome estrutural, travando header/assetbar e footer/footer buttons conforme Layout Contract." },',
    "changelog 0.662 entry")

# ── 5. Gap + drawer final lock CSS — insert after 0661 chrome lock ─────────────
GAP_DRAWER_CSS = """<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">
/* DVL Beta 0.662 — Phase 2.6: chart/footer gap + trade drawer final lock.
   Structural layout lock only. Does not alter Paper Trading logic, Buy/Sell handlers,
   TP/SL logic, chart handlers, oscillators, tools, dropdowns or Button System. */
:root{
  --dvl-header-h:55px!important;
  --dvl-assetbar-h:50px!important;
  --dvl-chart-toolbar-h:30px!important;
  --dvl-footer-h:57px!important;
  --dvl-price-scale-w:70px!important;
  --dvl-trade-drawer-max-h:150px!important;
}

html,
body{
  height:100%!important;
  min-height:100%!important;
  overflow:hidden!important;
}

.app{
  height:100svh!important;
  min-height:100svh!important;
  max-height:100svh!important;
  overflow:hidden!important;
  padding-bottom:57px!important;
}

.chartCard{
  flex:1 1 auto!important;
  min-height:0!important;
  height:auto!important;
  overflow:hidden!important;
  display:flex!important;
  flex-direction:column!important;
}

.canvasWrap{
  flex:1 1 auto!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  margin-top:0!important;
  margin-bottom:0!important;
  padding-bottom:0!important;
  overflow:hidden!important;
}

#chart{
  width:100%!important;
  height:100%!important;
  display:block!important;
}

.tradeDrawer{
  bottom:57px!important;
  padding:0 5px!important;
  justify-content:center!important;
  align-items:flex-end!important;
  pointer-events:none!important;
}

.tradeDrawer.is-open{
  pointer-events:auto!important;
}

.tradeDrawerSheet{
  width:100%!important;
  max-width:calc(100vw - 10px)!important;
  max-height:150px!important;
  min-height:0!important;
  overflow:hidden!important;
  margin:0!important;
}

.tradeDrawerBody{
  max-height:150px!important;
  overflow:hidden!important;
}
</style>

"""

html = rep(html,
    ".tradeDrawer{\n  bottom:57px!important;\n}\n</style>\n\n</head>\n<body>",
    ".tradeDrawer{\n  bottom:57px!important;\n}\n</style>\n\n" + GAP_DRAWER_CSS + "</head>\n<body>",
    "insert DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662 before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_662 applied: title, badge, version, changelog, DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662 before </head>")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.662</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.661</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.662";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.661";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.662<" in content, "FAIL: static badge"
assert ">BETA 0.661<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.662 — Phase 2.6: lock final de gap chart/canvas/footer e geometria do trade drawer 150px sem sobrepor o footer.' in content, "FAIL: changelog 0.662"
assert '"Beta 0.661", note: "Phase 2.5:' in content, "FAIL: 0.661 changelog preserved"

# 3. New CSS present exactly once
assert content.count("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662") == 1, "FAIL: CSS 0662 count != 1"
assert '<style id="DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662">' in content, "FAIL: CSS tag"

# 4. Prior lock blocks preserved
assert "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659" in content, "FAIL: 0659 lock missing"
assert "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660" in content, "FAIL: 0660 lock missing"
assert "DVL_CHROME_FINAL_LOCK_CSS_0661" in content, "FAIL: 0661 lock missing"

# 5. Order: 0659 → 0660 → 0661 → 0662 → </head>
idx_0659 = content.index("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")
idx_0660 = content.index("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")
idx_0661 = content.index("DVL_CHROME_FINAL_LOCK_CSS_0661")
idx_0662 = content.index("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")
idx_head = content.index("</head>")
assert idx_0659 < idx_0660 < idx_0661 < idx_0662 < idx_head, "FAIL: lock blocks not in correct order"

# 6. Last occurrences of CSS variables are correct
def last_val(text, var):
    idx = text.rfind(var)
    return text[idx:idx+50]

assert "55px" in last_val(content, "--dvl-header-h"), "FAIL: last --dvl-header-h not 55px"
assert "50px" in last_val(content, "--dvl-assetbar-h"), "FAIL: last --dvl-assetbar-h not 50px"
assert "30px" in last_val(content, "--dvl-chart-toolbar-h"), "FAIL: last --dvl-chart-toolbar-h not 30px"
assert "57px" in last_val(content, "--dvl-footer-h"), "FAIL: last --dvl-footer-h not 57px"
assert "70px" in last_val(content, "--dvl-price-scale-w"), "FAIL: last --dvl-price-scale-w not 70px"
assert "150px" in last_val(content, "--dvl-trade-drawer-max-h"), "FAIL: last --dvl-trade-drawer-max-h not 150px"

# 7. Key CSS properties present in the new block
# Get the new block slice
block_start = content.index("DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662")
block_end   = content.index("</head>")
block       = content[block_start:block_end]

assert "--dvl-trade-drawer-max-h:150px!important;" in block, "FAIL: --dvl-trade-drawer-max-h"
assert "overflow:hidden!important;" in block, "FAIL: overflow:hidden"
assert "padding-bottom:57px!important;" in block, "FAIL: .app padding-bottom:57px"
assert ".canvasWrap{" in block, "FAIL: .canvasWrap block"
assert "flex:1 1 auto!important;" in block, "FAIL: flex:1 1 auto"
assert "max-height:none!important;" in block, "FAIL: max-height:none"
assert ".tradeDrawer{" in block, "FAIL: .tradeDrawer in 0662 block"
assert "bottom:57px!important;" in block, "FAIL: tradeDrawer bottom:57px"
assert ".tradeDrawer.is-open{" in block, "FAIL: .tradeDrawer.is-open"
assert "pointer-events:auto!important;" in block, "FAIL: pointer-events:auto"
assert ".tradeDrawerSheet{" in block, "FAIL: .tradeDrawerSheet"
assert "max-height:150px!important;" in block, "FAIL: tradeDrawerSheet max-height:150px"
assert "max-width:calc(100vw - 10px)!important;" in block, "FAIL: max-width calc"
assert ".tradeDrawerBody{" in block, "FAIL: .tradeDrawerBody"

# 8. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 9. No wrongly-created modules
for ver in ["0656","0657","0658","0659","0660","0661","0662"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 10. No nested script
assert '<script id="DVL_LAYOUT_GAP' not in content, "FAIL: nested script"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 11. Zero DVL_TODO_0662
assert "DVL_TODO_0662" not in content, "FAIL: DVL_TODO_0662 remaining"

# 12. DVL_SECTION_SIZES_PX values preserved
assert "  header: 55," in content, "FAIL: header: 55"
assert "  assetHotbar: 50," in content, "FAIL: assetHotbar: 50"
assert "  chartToolbar: 30," in content, "FAIL: chartToolbar: 30"
assert "  footerMenu: 57," in content, "FAIL: footerMenu: 57"
assert "  footerButtons: 55," in content, "FAIL: footerButtons: 55"
assert "  rightPriceScaleWidth: 70," in content, "FAIL: rightPriceScaleWidth: 70"

# 13. JS price scale constants preserved
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 14. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 15. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 16. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 17. No size classes applied
assert "classList.add('dvl-btn-xs')" not in content, "FAIL: dvl-btn-xs applied"
assert "classList.add('dvl-btn-sm')" not in content, "FAIL: dvl-btn-sm applied"

print("[OK] all 49 assertions passed — 0662 clean, gap+drawer lock before </head>, last CSS vars at correct values")
