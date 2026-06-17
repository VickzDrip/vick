#!/usr/bin/env python3
"""
patch_634.py — DVL Beta 0.634
Injects the DVL Paper Trading Bridge script into Beta 0.633.
"""
import sys, pathlib

SRC  = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
BRIDGE = pathlib.Path("/tmp/DVL_PAPER_TRADING_BRIDGE_SNIPPET_COM_SCRIPT_TAG.html")

html = SRC.read_text(encoding="utf-8")

_applied = []
def rep(src, old, new, label):
    count = src.count(old)
    if count == 0:
        print(f"[FAIL] {label}: string not found")
        sys.exit(1)
    if count > 1:
        print(f"[FAIL] {label}: ambiguous ({count} matches)")
        sys.exit(1)
    _applied.append(label)
    return src.replace(old, new, 1)

# 1. Version badge (static HTML)
html = rep(html,
    'BETA 0.633',
    'BETA 0.634',
    "version badge text")

# 2. DVL_APP_VERSION JS constant
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.633";',
    'const DVL_APP_VERSION = "Beta 0.634";',
    "DVL_APP_VERSION constant")

# 3. Add changelog entry
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    '  { version: DVL_APP_VERSION, note: "Feature: Paper Trading Bridge — wire Buy/Sell, leverage drag, entry pad, liq toggle via DVLPaperTradingBridge." },\n  { version: "Beta 0.633", note: "Fix: candle fluido real — bug ticker stale 15s corrigido + poll REST 2s." },',
    "changelog entry 0.634")

# 4. Inject bridge script before </body></html>
bridge_content = BRIDGE.read_text(encoding="utf-8").strip()
html = rep(html,
    '\n</body>\n</html>',
    '\n' + bridge_content + '\n\n</body>\n</html>',
    "inject paper trading bridge script")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_634 applied: {', '.join(_applied)}")
