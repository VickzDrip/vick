#!/usr/bin/env python3
"""patch_660.py — Beta 0.660 / Phase 2.4: final CSS cascade lock for chart toolbar 30px."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-20.before_0660_chart_toolbar_lock.html"

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
    "<title>DVL Binance Live — Beta 0.659</title>",
    "<title>DVL Binance Live — Beta 0.660</title>",
    "title 0.659→0.660")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.659<",
    ">BETA 0.660<",
    "static badge 0.659→0.660")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.659";',
    'const DVL_APP_VERSION = "Beta 0.660";',
    "DVL_APP_VERSION 0.659→0.660")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.659 — Phase 2.3: hotfix/final cascade lock for right price scale 70px." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.660 — Phase 2.4: lock final da timer/Indicators hotbar em 30px, alinhando a cascata CSS com o Layout Contract." },\n  { version: "Beta 0.659", note: "Phase 2.3: hotfix/final cascade lock for right price scale 70px." },',
    "changelog 0.660 entry")

# ── 5. Chart toolbar final lock — insert after 0659 price scale lock, before </head> ──
TOOLBAR_LOCK_CSS = """<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">
/* DVL Beta 0.660 — Phase 2.4: final cascade lock for 30px chart toolbar.
   Keeps timer/Indicators hotbar aligned with DVL_SECTION_SIZES_PX and Layout Assertions.
   Do NOT alter chart handlers, Paper Trading, Buy/Sell, TP/SL, oscillators, tools, dropdown logic or Button System. */
:root{
  --dvl-chart-toolbar-h:30px!important;
  --dvl-hotbar-btn:24px!important;
  --dvl-hotbar-center:15px!important;
}
.toolbar{
  height:30px!important;
  min-height:30px!important;
  max-height:30px!important;
  padding-top:0!important;
  padding-bottom:0!important;
}
.tfFavoriteShell,
.tfMainRow,
.tfMoreWrap,
.toolBtns,
.candleTypeWrap,
.fxIndicatorWrap{
  height:24px!important;
  min-height:24px!important;
  max-height:24px!important;
}
.tfMainRow .tfBtn,
.tfMoreBtn,
.smallChartBtn,
.candleTypeBtn,
.indBtn{
  height:24px!important;
  min-height:24px!important;
  max-height:24px!important;
}
</style>

"""

html = rep(html,
    "</style>\n\n</head>\n<body>",
    "</style>\n\n" + TOOLBAR_LOCK_CSS + "</head>\n<body>",
    "insert DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660 before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_660 applied: title, badge, version, changelog, DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660 before </head>")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.660</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.659</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.660";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.659";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.660<" in content, "FAIL: static badge"
assert ">BETA 0.659<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.660 — Phase 2.4: lock final da timer/Indicators hotbar em 30px, alinhando a cascata CSS com o Layout Contract.' in content, "FAIL: changelog 0.660"
assert '"Beta 0.659", note: "Phase 2.3:' in content, "FAIL: 0.659 changelog preserved"

# 3. Toolbar lock CSS present exactly once
assert content.count("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660") == 1, "FAIL: toolbar lock CSS count != 1"
assert '<style id="DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660">' in content, "FAIL: toolbar CSS tag"

# 4. 0659 price scale lock still present
assert 'DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659' in content, "FAIL: 0659 price scale lock missing"

# 5. Lock is immediately before </head>
lock_idx   = content.index("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")
head_close = content.index("</head>")
assert lock_idx < head_close, "FAIL: toolbar lock not before </head>"
between = content[lock_idx:head_close]
assert "</style>" in between, "FAIL: toolbar lock </style> not before </head>"

# 6. 0659 lock is before 0660 lock (order: ...0659...</style>...0660...</style>...</head>)
idx_0659 = content.index("DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659")
idx_0660 = content.index("DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660")
assert idx_0659 < idx_0660, "FAIL: 0659 not before 0660"

# 7. Last --dvl-chart-toolbar-h in file is 30px
last_toolbar_h_idx = content.rfind("--dvl-chart-toolbar-h")
last_toolbar_h = content[last_toolbar_h_idx:last_toolbar_h_idx+35]
assert "30px" in last_toolbar_h, f"FAIL: last --dvl-chart-toolbar-h is not 30px, got: {last_toolbar_h}"

# 8. No 40px!important after the 0660 lock
after_lock = content[idx_0660:]
assert "--dvl-chart-toolbar-h:40px!important" not in after_lock, "FAIL: 40px!important after lock"

# 9. CSS lock content correct
assert "--dvl-chart-toolbar-h:30px!important;" in content, "FAIL: --dvl-chart-toolbar-h:30px"
assert "--dvl-hotbar-btn:24px!important;" in content, "FAIL: --dvl-hotbar-btn:24px"
assert "--dvl-hotbar-center:15px!important;" in content, "FAIL: --dvl-hotbar-center:15px"
assert "height:30px!important;" in content, "FAIL: .toolbar height:30px"
assert "min-height:30px!important;" in content, "FAIL: .toolbar min-height:30px"
assert "max-height:30px!important;" in content, "FAIL: .toolbar max-height:30px"
assert "padding-top:0!important;" in content, "FAIL: .toolbar padding-top"
assert "padding-bottom:0!important;" in content, "FAIL: .toolbar padding-bottom"

# 10. Hotbar children 24px
assert ".tfFavoriteShell," in content, "FAIL: tfFavoriteShell selector"
assert ".fxIndicatorWrap{" in content, "FAIL: fxIndicatorWrap selector"
assert ".tfMainRow .tfBtn," in content, "FAIL: tfBtn selector"
assert ".indBtn{" in content, "FAIL: indBtn selector"

# 11. DVL_SECTION_SIZES_PX.chartToolbar unchanged
assert "chartToolbar: 30," in content, "FAIL: chartToolbar=30 changed"

# 12. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 13. No wrongly-created modules
for ver in ["0656", "0657", "0658", "0659", "0660"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 14. No nested script
assert '<script id="DVL_CHART_TOOLBAR' not in content, "FAIL: nested script toolbar"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 15. Zero DVL_TODO_0660
assert "DVL_TODO_0660" not in content, "FAIL: DVL_TODO_0660 remaining"

# 16. Price scale JS constants preserved
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: PRICE_SCALE_W=70"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"
assert 'rightPriceScaleWidth: 70,' in content, "FAIL: rightPriceScaleWidth=70"

# 17. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-icon",
            "dvl-btn-migrated-menu", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 18. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 19. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

print("[OK] all 46 assertions passed — 0660 clean, toolbar lock before </head>, last --dvl-chart-toolbar-h is 30px")
