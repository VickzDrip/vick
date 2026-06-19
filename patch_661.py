#!/usr/bin/env python3
"""patch_661.py — Beta 0.661 / Phase 2.5: final chrome locks (header/assetbar + footer/nav)."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-21.before_0661_chrome_final_lock.html"

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
    "<title>DVL Binance Live — Beta 0.660</title>",
    "<title>DVL Binance Live — Beta 0.661</title>",
    "title 0.660→0.661")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.660<",
    ">BETA 0.661<",
    "static badge 0.660→0.661")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.660";',
    'const DVL_APP_VERSION = "Beta 0.661";',
    "DVL_APP_VERSION 0.660→0.661")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.660 — Phase 2.4: lock final da timer/Indicators hotbar em 30px, alinhando a cascata CSS com o Layout Contract." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.661 — Phase 2.5: lock final do chrome estrutural, travando header/assetbar e footer/footer buttons conforme Layout Contract." },\n  { version: "Beta 0.660", note: "Phase 2.4: lock final da timer/Indicators hotbar em 30px, alinhando a cascata CSS com o Layout Contract." },',
    "changelog 0.661 entry")

# ── 5. Chrome final lock — insert after 0660 toolbar lock, before </head> ─────
CHROME_LOCK_CSS = """<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">
/* DVL Beta 0.661 — Phase 2.5: final structural chrome locks.
   STEP A: header 55px + asset hotbar 50px.
   STEP B: footer 57px + footer buttons 55px.
   Structural cascade lock only. Do NOT alter chart handlers, Paper Trading, Buy/Sell, TP/SL, oscillators, tools, dropdown logic or Button System. */
:root{
  --dvl-header-h:55px!important;
  --dvl-assetbar-h:50px!important;
  --dvl-footer-h:57px!important;
}
.top{
  height:55px!important;
  min-height:55px!important;
  max-height:55px!important;
}
.marketRow{
  height:50px!important;
  min-height:50px!important;
  max-height:50px!important;
}
.bottomNav{
  height:57px!important;
  min-height:57px!important;
  max-height:57px!important;
}
.navInner{
  height:57px!important;
  min-height:57px!important;
  max-height:57px!important;
}
.navItem{
  height:55px!important;
  min-height:55px!important;
  max-height:55px!important;
}
.tradeDrawer{
  bottom:57px!important;
}
</style>

"""

html = rep(html,
    ".indBtn{\n  height:24px!important;\n  min-height:24px!important;\n  max-height:24px!important;\n}\n</style>\n\n</head>\n<body>",
    ".indBtn{\n  height:24px!important;\n  min-height:24px!important;\n  max-height:24px!important;\n}\n</style>\n\n" + CHROME_LOCK_CSS + "</head>\n<body>",
    "insert DVL_CHROME_FINAL_LOCK_CSS_0661 before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_661 applied: title, badge, version, changelog, DVL_CHROME_FINAL_LOCK_CSS_0661 before </head>")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.661</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.660</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.661";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.660";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.661<" in content, "FAIL: static badge"
assert ">BETA 0.660<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.661 — Phase 2.5: lock final do chrome estrutural, travando header/assetbar e footer/footer buttons conforme Layout Contract.' in content, "FAIL: changelog 0.661"
assert '"Beta 0.660", note: "Phase 2.4:' in content, "FAIL: 0.660 changelog preserved"

# 3. Chrome lock CSS present exactly once
assert content.count("DVL_CHROME_FINAL_LOCK_CSS_0661") == 1, "FAIL: chrome lock CSS count != 1"
assert '<style id="DVL_CHROME_FINAL_LOCK_CSS_0661">' in content, "FAIL: chrome CSS tag"

# 4. Prior lock blocks preserved
assert "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659" in content, "FAIL: 0659 price scale lock missing"
assert "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660" in content, "FAIL: 0660 toolbar lock missing"

# 5. Order: 0659 → 0660 → 0661 → </head>
idx_0659 = content.index("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")
idx_0660 = content.index("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")
idx_0661 = content.index("DVL_CHROME_FINAL_LOCK_CSS_0661")
idx_head = content.index("</head>")
assert idx_0659 < idx_0660 < idx_0661 < idx_head, "FAIL: lock blocks not in correct order before </head>"

# 6. Last occurrence of each CSS variable is the lock value
def last_val(text, var):
    idx = text.rfind(var)
    return text[idx:idx+40]

assert "55px" in last_val(content, "--dvl-header-h"), f"FAIL: last --dvl-header-h not 55px: {last_val(content, '--dvl-header-h')}"
assert "50px" in last_val(content, "--dvl-assetbar-h"), f"FAIL: last --dvl-assetbar-h not 50px"
assert "57px" in last_val(content, "--dvl-footer-h"), f"FAIL: last --dvl-footer-h not 57px"

# 7. CSS lock content correct
assert "--dvl-header-h:55px!important;" in content, "FAIL: --dvl-header-h:55px"
assert "--dvl-assetbar-h:50px!important;" in content, "FAIL: --dvl-assetbar-h:50px"
assert "--dvl-footer-h:57px!important;" in content, "FAIL: --dvl-footer-h:57px"
assert ".top{\n  height:55px!important;" in content, "FAIL: .top height:55px"
assert ".marketRow{\n  height:50px!important;" in content, "FAIL: .marketRow height:50px"
assert ".bottomNav{\n  height:57px!important;" in content, "FAIL: .bottomNav height:57px"
assert ".navInner{\n  height:57px!important;" in content, "FAIL: .navInner height:57px"
assert ".navItem{\n  height:55px!important;" in content, "FAIL: .navItem height:55px"
assert ".tradeDrawer{\n  bottom:57px!important;\n}" in content, "FAIL: .tradeDrawer bottom:57px"

# 8. DVL_SECTION_SIZES_PX values unchanged
assert "  header: 55," in content, "FAIL: header: 55"
assert "  assetHotbar: 50," in content, "FAIL: assetHotbar: 50"
assert "  chartToolbar: 30," in content, "FAIL: chartToolbar: 30"
assert "  footerMenu: 57," in content, "FAIL: footerMenu: 57"
assert "  footerButtons: 55," in content, "FAIL: footerButtons: 55"
assert "  rightPriceScaleWidth: 70," in content, "FAIL: rightPriceScaleWidth: 70"

# 9. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 10. No wrongly-created modules
for ver in ["0656", "0657", "0658", "0659", "0660", "0661"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 11. No nested script
assert '<script id="DVL_CHROME' not in content, "FAIL: nested script chrome"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 12. Zero DVL_TODO_0661
assert "DVL_TODO_0661" not in content, "FAIL: DVL_TODO_0661 remaining"

# 13. Price scale JS constants still correct
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 14. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 15. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 16. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

print("[OK] all 46 assertions passed — 0661 clean, chrome lock (header+assetbar+footer+nav) before </head>")
