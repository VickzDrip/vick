#!/usr/bin/env python3
"""
patch_642.py — DVL Beta 0.642 Hotfix
Removes nested <script> tag and extra </script> left by patch_641.

Bug: patch_641 inserted <script id="DVL_BUTTON_SYSTEM_MODULE_0641"> as a
literal HTML tag inside an already-open <script> block, then a </script>
that prematurely closed the main script, leaving window.DVL_SECTION_SIZES_PX
and all subsequent code outside any script context.

Fix:
  1. Remove the literal <script id="DVL_BUTTON_SYSTEM_MODULE_0641"> line.
  2. Rename title comment to DVL_BUTTON_SYSTEM_MODULE_0642.
  3. Remove the literal </script> that followed the button-system IIFE.
  4. Update version to Beta 0.642.
"""
import sys, pathlib, shutil

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BACKUP = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index-7.before_hotfix_0642_nested_script.html")

shutil.copy2(SRC, BACKUP)
print(f"[OK] backup: {BACKUP}")

html = SRC.read_text(encoding="utf-8")

_ok = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0: print(f"[FAIL] {label}: not found"); sys.exit(1)
    if c > 1:  print(f"[FAIL] {label}: ambiguous ({c})"); sys.exit(1)
    _ok.append(label)
    return src.replace(old, new, 1)

# ── 1. Remove nested <script> opening tag + rename module title ───────────────
# Replaces the bad literal <script> tag + old title with just the clean title
html = rep(html,
    '\n<script id="DVL_BUTTON_SYSTEM_MODULE_0641">\n'
    '// ===== DVL_BUTTON_SYSTEM_MODULE_0641 =====\n',
    '\n// ===== DVL_BUTTON_SYSTEM_MODULE_0642 =====\n',
    "remove nested <script> tag + rename to 0642")

# ── 2. Remove the spurious </script> after the button-system IIFE ────────────
# The </script> sits between })(); and window.DVL_SECTION_SIZES_PX
html = rep(html,
    '})();\n</script>\n\nwindow.DVL_SECTION_SIZES_PX = {',
    '})();\n\nwindow.DVL_SECTION_SIZES_PX = {',
    "remove extra </script> after button-system IIFE")

# ── 3. title ─────────────────────────────────────────────────────────────────
html = rep(html,
    'DVL Binance Live — Beta 0.641',
    'DVL Binance Live — Beta 0.642',
    "title")

# ── 4. DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.641";',
    'const DVL_APP_VERSION = "Beta 0.642";',
    "DVL_APP_VERSION")

# ── 5. static badge ──────────────────────────────────────────────────────────
html = rep(html,
    'BETA 0.641',
    'BETA 0.642',
    "static badge")

# ── 6. changelog ─────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Phase 1: scaffold do DVL_BUTTON_SYSTEM para padronização futura de botões sem alteração visual." },',
    '  { version: DVL_APP_VERSION, note: "Hotfix: corrige DVL_BUTTON_SYSTEM inserido como <script> aninhado dentro do script principal." },\n'
    '  { version: "Beta 0.641", note: "Phase 1: scaffold do DVL_BUTTON_SYSTEM para padronização futura de botões sem alteração visual." },',
    "changelog 0.642")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_642 applied: {', '.join(_ok)}")

# ── 7. Verify: no <script id="DVL_BUTTON_SYSTEM_MODULE_0641"> remains ─────────
html2 = SRC.read_text(encoding="utf-8")
assert '<script id="DVL_BUTTON_SYSTEM_MODULE_0641">' not in html2, "FAIL: nested script tag still present!"
assert 'DVL_BUTTON_SYSTEM_MODULE_0642' in html2, "FAIL: 0642 module title missing!"
print("[OK] verification: no nested <script> tag; DVL_BUTTON_SYSTEM_MODULE_0642 present")
