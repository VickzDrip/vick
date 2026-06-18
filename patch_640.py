#!/usr/bin/env python3
"""
patch_640.py — DVL Beta 0.640
Touch guard selector patch:
  - Update version to Beta 0.640
  - Add changelog entry
  - Rename DVL_TOUCH_GUARD_MODULE_0639 → DVL_TOUCH_GUARD_MODULE_0640
  - Add to UI_SELECTOR: .dvl-paper-layer, .dvl-paper-edit-confirm,
    .dvl-paper-line, .dvl-paper-edit-label
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-5.before_0640_touch_guard_selector_patch.html")

# ── Backup ────────────────────────────────────────────────────────────────────
shutil.copy2(SRC, BACKUP)
print(f"[OK] backup created: {BACKUP}")

html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. <title> ────────────────────────────────────────────────────────────────
html = rep(html,
    'DVL Binance Live — Beta 0.639',
    'DVL Binance Live — Beta 0.640',
    "title")

# ── 2. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.639";',
    'const DVL_APP_VERSION = "Beta 0.640";',
    "DVL_APP_VERSION")

# ── 3. Static badge ───────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.639',
    'BETA 0.640',
    "static badge")

# ── 4. Changelog entry ────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Phase 0: UI/touch guard scaffold e marcação de superfícies UI antes da padronização de botões." },',
    '  { version: DVL_APP_VERSION, note: "Touch guard selector patch: inclui paper layer e confirmação de edição para impedir vazamento de eventos ao gráfico." },\n'
    '  { version: "Beta 0.639", note: "Phase 0: UI/touch guard scaffold e marcação de superfícies UI antes da padronização de botões." },',
    "changelog 0.640")

# ── 5. Rename module title comment ────────────────────────────────────────────
html = rep(html,
    'DVL_TOUCH_GUARD_MODULE_0639',
    'DVL_TOUCH_GUARD_MODULE_0640',
    "module title rename")

# ── 6. Add selectors to UI_SELECTOR ──────────────────────────────────────────
html = rep(html,
    "    '.dvl-paper-tag','.dvl-paper-edit-label-fixed','.dvl-paper-confirm',\n"
    "    '.assetFavoritesDrawer','.assetFavoritesSheet'\n"
    "  ].join(',');",
    "    '.dvl-paper-tag','.dvl-paper-edit-label-fixed','.dvl-paper-confirm',\n"
    "    '.assetFavoritesDrawer','.assetFavoritesSheet',\n"
    "    '.dvl-paper-layer','.dvl-paper-edit-confirm','.dvl-paper-line','.dvl-paper-edit-label'\n"
    "  ].join(',');",
    "UI_SELECTOR selectors 0640")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_640 applied: {', '.join(_ok)}")
