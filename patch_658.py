#!/usr/bin/env python3
"""patch_658.py — Beta 0.658 / Phase 2.2: Price Scale Contract Sync (rightPriceScaleWidth = 70px)."""

import shutil, sys

SRC = "DepthVisionLab-v106_REAL_UI/public/index.html"
BAK = "DepthVisionLab-v106_REAL_UI/public/index-18.before_0658_price_scale_sync.html"

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
    "<title>DVL Binance Live — Beta 0.657</title>",
    "<title>DVL Binance Live — Beta 0.658</title>",
    "title 0.657→0.658")

# ── 2. Static badge ────────────────────────────────────────────────────────────
html = rep(html,
    ">BETA 0.657<",
    ">BETA 0.658<",
    "static badge 0.657→0.658")

# ── 3. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.657";',
    'const DVL_APP_VERSION = "Beta 0.658";',
    "DVL_APP_VERSION 0.657→0.658")

# ── 4. Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.657 — Phase 2.1: auditoria read-only de assertions do Layout Contract para detectar gaps, sobreposições e divergências de dimensões sem alterar visual." },',
    '  { version: DVL_APP_VERSION, note: "Beta 0.658 — Phase 2.2: sincronização prática da right price scale para 70px conforme Layout Contract." },\n  { version: "Beta 0.657", note: "Phase 2.1: auditoria read-only de assertions do Layout Contract para detectar gaps, sobreposições e divergências de dimensões sem alterar visual." },',
    "changelog 0.658 entry")

# ── 5. CSS block (insert after DVL_LAYOUT_ASSERTIONS_CSS_0657) ────────────────
html = rep(html,
    "/* DVL Beta 0.657 — Phase 2.1: layout assertions diagnostics.\n   Read-only/visual-neutral. No layout, color, spacing, z-index, radius, padding, height or width properties. */\n</style>\n\n<style>\n:root{",
    "/* DVL Beta 0.657 — Phase 2.1: layout assertions diagnostics.\n   Read-only/visual-neutral. No layout, color, spacing, z-index, radius, padding, height or width properties. */\n</style>\n\n<style id=\"DVL_PRICE_SCALE_SYNC_CSS_0658\">\n/* DVL Beta 0.658 — Phase 2.2: right price scale contract sync.\n   Only synchronizes the right price scale width to 70px. */\n:root{\n  --dvl-price-scale-w:70px!important;\n}\n/* Only if needed to keep existing scale controls inside the 70px column. */\n.chartScaleControls{\n  width:70px!important;\n}\n</style>\n\n<style>\n:root{",
    "insert DVL_PRICE_SCALE_SYNC_CSS_0658")

# ── 6. DVL_SECTION_SIZES_PX.rightPriceScaleWidth 55 → 70 ─────────────────────
html = rep(html,
    "  footerButtons: 55,\n  rightPriceScaleWidth: 55,\n  chartCanvas:",
    "  footerButtons: 55,\n  rightPriceScaleWidth: 70,\n  chartCanvas:",
    "DVL_SECTION_SIZES_PX.rightPriceScaleWidth 55→70")

# ── 7. Global PRICE_SCALE_W const 55 → 70 + expose window.DVL_PRICE_SCALE_W ──
html = rep(html,
    "const PRICE_SCALE_W = 55;\nconst PRICE_LABEL_GAP = 2;\nconst PRICE_LABEL_W = PRICE_SCALE_W - 4;",
    "const PRICE_SCALE_W = 70;\nconst PRICE_LABEL_GAP = 2;\nconst PRICE_LABEL_W = PRICE_SCALE_W - 4;\nwindow.DVL_PRICE_SCALE_W = PRICE_SCALE_W;",
    "global PRICE_SCALE_W 55→70 + expose window.DVL_PRICE_SCALE_W")

# ── 8. Local PRICE_SCALE_W _0634 (layer bounds IIFE) ─────────────────────────
html = rep(html,
    '"use strict";\n\nvar PRICE_SCALE_W = 55;\n\nfunction dvlSyncLayerBounds()',
    '"use strict";\n\nvar PRICE_SCALE_W = (typeof window.DVL_PRICE_SCALE_W === "number" ? window.DVL_PRICE_SCALE_W : 70);\n\nfunction dvlSyncLayerBounds()',
    "local PRICE_SCALE_W _0634 synced")

# ── 9. Local PRICE_SCALE_W _0635 (tag positioning IIFE) ──────────────────────
html = rep(html,
    '"use strict";\n\nvar PRICE_SCALE_W = 55;\nvar CANDLE_OFFSET = 10;',
    '"use strict";\n\nvar PRICE_SCALE_W = (typeof window.DVL_PRICE_SCALE_W === "number" ? window.DVL_PRICE_SCALE_W : 70);\nvar CANDLE_OFFSET = 10;',
    "local PRICE_SCALE_W _0635 synced")

with open(SRC, "w", encoding="utf-8") as f:
    f.write(html)

print("[OK] patch_658 applied: title, badge, version, changelog, CSS 0658, rightPriceScaleWidth=70, global+local PRICE_SCALE_W synced")

# ── Assertions ────────────────────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    content = f.read()

# 1. Version strings
assert "<title>DVL Binance Live — Beta 0.658</title>" in content, "FAIL: title"
assert "<title>DVL Binance Live — Beta 0.657</title>" not in content, "FAIL: old title"
assert 'const DVL_APP_VERSION = "Beta 0.658";' in content, "FAIL: DVL_APP_VERSION"
assert 'const DVL_APP_VERSION = "Beta 0.657";' not in content, "FAIL: old DVL_APP_VERSION"
assert ">BETA 0.658<" in content, "FAIL: static badge"
assert ">BETA 0.657<" not in content, "FAIL: old static badge"

# 2. Changelog
assert 'Beta 0.658 — Phase 2.2: sincronização prática da right price scale para 70px conforme Layout Contract.' in content, "FAIL: changelog 0.658"
assert '"Beta 0.657", note: "Phase 2.1:' in content, "FAIL: 0.657 changelog preserved"

# 3. CSS block
assert '<style id="DVL_PRICE_SCALE_SYNC_CSS_0658">' in content, "FAIL: CSS tag"
assert '--dvl-price-scale-w:70px!important;' in content, "FAIL: CSS --dvl-price-scale-w"
assert '.chartScaleControls{\n  width:70px!important;\n}' in content, "FAIL: CSS chartScaleControls"

# 4. DVL_SECTION_SIZES_PX.rightPriceScaleWidth = 70
assert 'rightPriceScaleWidth: 70,' in content, "FAIL: rightPriceScaleWidth=70 in SECTION_SIZES"
assert content.count('rightPriceScaleWidth: 55') == 0, "FAIL: old rightPriceScaleWidth=55 still present"

# 5. Global PRICE_SCALE_W = 70
assert 'const PRICE_SCALE_W = 70;' in content, "FAIL: global PRICE_SCALE_W=70"
assert 'const PRICE_SCALE_W = 55;' not in content, "FAIL: old global PRICE_SCALE_W=55"

# 6. PRICE_LABEL_W derives from PRICE_SCALE_W (unchanged)
assert 'const PRICE_LABEL_W = PRICE_SCALE_W - 4;' in content, "FAIL: PRICE_LABEL_W derivation"

# 7. window.DVL_PRICE_SCALE_W exposed
assert 'window.DVL_PRICE_SCALE_W = PRICE_SCALE_W;' in content, "FAIL: window.DVL_PRICE_SCALE_W"

# 8. Local _0634 synced (no more hardcoded 55)
assert '"use strict";\n\nvar PRICE_SCALE_W = (typeof window.DVL_PRICE_SCALE_W === "number" ? window.DVL_PRICE_SCALE_W : 70);\n\nfunction dvlSyncLayerBounds()' in content, "FAIL: _0634 local PRICE_SCALE_W synced"

# 9. Local _0635 synced
assert '"use strict";\n\nvar PRICE_SCALE_W = (typeof window.DVL_PRICE_SCALE_W === "number" ? window.DVL_PRICE_SCALE_W : 70);\nvar CANDLE_OFFSET = 10;' in content, "FAIL: _0635 local PRICE_SCALE_W synced"

# 10. No remaining hardcoded local 55
assert 'var PRICE_SCALE_W = 55;' not in content, "FAIL: old local var PRICE_SCALE_W = 55 still present"

# 11. Prior modules preserved
assert "DVL_BUTTON_SYSTEM_MODULE_0655" in content, "FAIL: button system 0655 missing"
assert "DVL_LAYOUT_CONTRACT_MODULE_0656" in content, "FAIL: layout contract 0656 missing"
assert "DVL_LAYOUT_ASSERTIONS_MODULE_0657" in content, "FAIL: layout assertions 0657 missing"

# 12. No wrongly-created modules
assert "DVL_BUTTON_SYSTEM_MODULE_0656" not in content, "FAIL: wrongly created 0656"
assert "DVL_BUTTON_SYSTEM_MODULE_0657" not in content, "FAIL: wrongly created 0657"
assert "DVL_BUTTON_SYSTEM_MODULE_0658" not in content, "FAIL: wrongly created 0658"

# 13. Assertions module still expects 70 (unchanged)
assert "rightPriceScaleWidth: 70," in content, "FAIL: assertions module expected 70"

# 14. No nested script
assert '<script id="DVL_PRICE_SCALE' not in content, "FAIL: nested script"
assert '<script id="DVL_BUTTON_SYSTEM' not in content, "FAIL: nested script button"

# 15. Zero DVL_TODO_0658
assert "DVL_TODO_0658" not in content, "FAIL: DVL_TODO_0658 remaining"

# 16. Prior migrations preserved
for cls in ["dvl-btn-migrated-footer", "dvl-btn-migrated-timeframe",
            "dvl-btn-migrated-header", "dvl-btn-migrated-icon",
            "dvl-btn-migrated-menu", "dvl-btn-migrated-panel",
            "dvl-btn-migrated-order-option", "dvl-btn-migrated-keypad",
            "dvl-btn-migrated-asset-favorite", "dvl-btn-migrated-asset-dropdown",
            "dvl-btn-migrated-indicator-dropdown", "dvl-btn-migrated-tools",
            "dvl-btn-migrated-paper-confirm", "dvl-btn-migrated-paper-edit",
            "dvl-btn-migrated-drawer", "dvl-btn-migrated-trade-action"]:
    assert cls in content, f"FAIL: {cls} missing"

# 17. Buy/Sell HTML untouched
assert 'class="tradeAction buy"' in content, "FAIL: buy button HTML"
assert 'class="tradeAction sell"' in content, "FAIL: sell button HTML"

# 18. DVL_TOUCH_GUARD preserved
assert "DVL_TOUCH_GUARD" in content, "FAIL: DVL_TOUCH_GUARD removed"

# 19. PRICE_LABEL_GAP unchanged
assert 'const PRICE_LABEL_GAP = 2;' in content, "FAIL: PRICE_LABEL_GAP changed"

# 20. getExpectedContract rightPriceScaleWidth = 70 still present in assertions module
assert content.count("rightPriceScaleWidth: 70") >= 2, "FAIL: rightPriceScaleWidth=70 should appear in both SECTION_SIZES and assertions expected contract"

print("[OK] all 48 assertions passed — 0658 clean, rightPriceScaleWidth synced to 70px, prior modules preserved")
