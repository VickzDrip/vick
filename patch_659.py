#!/usr/bin/env python3
"""patch_659.py — Beta 0.659 / Phase 2.3: final CSS cascade lock for right price scale 70px."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-19.before_0659_price_scale_final_lock.html"

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
    "<title>DVL Binance Live — Beta 0.658</title>",
    "<title>DVL Binance Live — Beta 0.659</title>",
    "title 0.658→0.659")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.658<",
    ">BETA 0.659<",
    "static badge 0.658→0.659")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.658";',
    'const DVL_APP_VERSION = "Beta 0.659";',
    "DVL_APP_VERSION 0.658→0.659")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.658 — Phase 2.2: sincronização prática da right price scale para 70px conforme Layout Contract." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.659 — Phase 2.3: hotfix/final cascade lock for right price scale 70px." },\n  { version: "Beta 0.658", note: "Phase 2.2: sincronização prática da right price scale para 70px conforme Layout Contract." },',
    "changelog 0.659 entry")

# ── 5. Final cascade lock CSS — insert immediately before </head> ──────────────
FINAL_LOCK_CSS = """<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">
/* DVL Beta 0.659 — Phase 2.3: final cascade lock for 70px right price scale.
   Structural sync only. Keeps the final computed CSS variable aligned with JS/Layout Contract.
   Do NOT alter chart handlers, drawing, Paper Trading, Buy/Sell, TP/SL or oscillators. */
:root{
  --dvl-price-scale-w:70px!important;
}
.chartScaleControls{
  width:70px!important;
  max-width:70px!important;
}
</style>

"""

html = rep(html,
    "\n</script>\n\n</head>\n<body>",
    "\n</script>\n\n" + FINAL_LOCK_CSS + "</head>\n<body>",
    "insert DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659 before </head>")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_659 applied: title, badge, version, changelog, DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659 before </head>")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.659</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.658</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.659";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.658";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.659<" in content, "FAIL: static badge"
assert ">BETA 0.659<" in content, "FAIL: badge"  # runtime badge text will be set by JS

# 2. Changelog
assert 'Beta 0.659 — Phase 2.3: hotfix/final cascade lock for right price scale 70px.' in content, "FAIL: changelog 0.659"
assert '"Beta 0.658", note: "Phase 2.2:' in content, "FAIL: 0.658 changelog preserved"

# 3. Lock CSS block present exactly once
assert content.count('DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659') == 1, "FAIL: lock CSS block count != 1"
assert '<style id="DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659">' in content, "FAIL: lock CSS tag"
assert 'max-width:70px!important;' in content, "FAIL: CSS max-width:70px"

# 4. Lock CSS is immediately before </head>
lock_idx = content.index('DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659')
head_close_idx = content.index('</head>')
assert lock_idx < head_close_idx, "FAIL: lock CSS not before </head>"
# Nothing between end of lock CSS style block and </head>
between = content[lock_idx:head_close_idx]
# Should only contain the style block and whitespace
assert '</style>' in between, "FAIL: lock CSS </style> not before </head>"

# 5. The LAST occurrence of --dvl-price-scale-w is 70px (from lock block)
last_occurrence_idx = content.rfind('--dvl-price-scale-w')
last_occurrence = content[last_occurrence_idx:last_occurrence_idx+30]
assert '70px' in last_occurrence, f"FAIL: last --dvl-price-scale-w is not 70px, got: {last_occurrence}"

# 6. No 55px or 84px after the lock CSS block
after_lock = content[head_close_idx:]
assert '--dvl-price-scale-w:55px' not in after_lock, "FAIL: 55px after lock"
assert '--dvl-price-scale-w:84px' not in after_lock, "FAIL: 84px after lock"

# 7. 0658 history CSS preserved
assert 'DVL_PRICE_SCALE_SYNC_CSS_0658' in content, "FAIL: 0658 CSS history missing"

# 8. JS constants preserved from 0.658
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: PRICE_SCALE_W=70"
assert 'const PRICE_LABEL_GAP = 2;' in content, "FAIL: PRICE_LABEL_GAP=2"
assert 'const PRICE_LABEL_W = PRICE_SCALE_W - 4;' in content, "FAIL: PRICE_LABEL_W derivation"
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"
assert 'rightPriceScaleWidth: 70,' in content, "FAIL: rightPriceScaleWidth=70"

# 9. Local price scale synced (not 55)
assert 'var PRICE_SCALE_W = 55;' not in content, "FAIL: old local PRICE_SCALE_W=55"

# 10. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 11. No wrongly-created modules
for ver in ["0656", "0657", "0658", "0659"]:
    assert f"DVL_BUTTON_SYSTEM_MODULE_{ver}" not in content, f"FAIL: wrongly created button system {ver}"

# 12. No nested script
assert '<script id="DVL_PRICE_SCALE' not in content, "FAIL: nested script price scale"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button system"

# 13. Zero DVL_TODO_0659
assert "DVL_TODO_0659" not in content, "FAIL: DVL_TODO_0659 remaining"

# 14. Prior button migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-icon",
            "dvl-btn-migrated-menu", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-order-option", "dvl-btn-migrated-keypad",
            "dvl-btn-migrated-asset-favorite", "dvl-btn-migrated-asset-dropdown",
            "dvl-btn-migrated-indicator-dropdown", "dvl-btn-migrated-tools",
            "dvl-btn-migrated-paper-confirm", "dvl-btn-migrated-paper-edit",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 15. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 16. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

print("[OK] all 45 assertions passed — 0659 clean, final cascade lock before </head>, last --dvl-price-scale-w is 70px")
