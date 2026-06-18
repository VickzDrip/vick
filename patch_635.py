#!/usr/bin/env python3
"""
patch_635.py — DVL Beta 0.635
Replaces the temporary 0.634 Paper Trading Bridge with the APPROVED
Paper Trading runtime 0.598 (dvl_paper_trading_script_only_0598.js), plus a
tiny native-neutralizer adapter so the 0.598 runtime is the single owner of
the trade panel (avoids double Buy/Sell, double liq-toggle, divergent state).

The 0.598 logic is injected verbatim — only an introduction/adapter is added,
exactly as requested ("não altere a lógica, apenas integre").
"""
import sys, pathlib

SRC    = pathlib.Path("DepthVisionLab-v106_REAL_UI/public/index.html")
RT0598 = pathlib.Path("/tmp/dvl_0598/dvl_paper_trading_script_only_0598.js")

html = SRC.read_text(encoding="utf-8")

if not RT0598.exists():
    print(f"[FAIL] missing approved runtime: {RT0598}")
    sys.exit(1)

_applied = []
def rep(src, old, new, label):
    c = src.count(old)
    if c == 0:
        print(f"[FAIL] {label}: string not found"); sys.exit(1)
    if c > 1:
        print(f"[FAIL] {label}: ambiguous ({c} matches)"); sys.exit(1)
    _applied.append(label)
    return src.replace(old, new, 1)

# 1. version badge
html = rep(html, 'BETA 0.634', 'BETA 0.635', "version badge text")

# 2. DVL_APP_VERSION constant
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.634";',
    'const DVL_APP_VERSION = "Beta 0.635";',
    "DVL_APP_VERSION constant")

# 3. changelog (replace the 0.634 bridge note)
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Feature: Paper Trading Bridge — wire Buy/Sell, leverage drag, entry pad, liq toggle via DVLPaperTradingBridge." },',
    '  { version: DVL_APP_VERSION, note: "Feature: Paper Trading 0.598 — overlay TP/ENTRY/SL arrastavel, Limit pendente, TP auto-close, SL manual, multi-posicao por simbolo." },',
    "changelog entry 0.635")

# 4. Remove the temporary 0.634 bridge block and inject neutralizer + 0.598 runtime.
open_tag   = '<script id="DVL_PAPER_TRADING_BRIDGE_PATCH">'
close_tail = '</script>\n\n</body>\n</html>'

if html.count(open_tag) != 1 or html.count(close_tail) != 1:
    print("[FAIL] cannot locate unique 0.634 bridge block boundaries"); sys.exit(1)

start = html.index(open_tag)
end   = html.index(close_tail) + len('</script>')
old_block = html[start:end]

runtime_js = RT0598.read_text(encoding="utf-8").strip()

NEUTRALIZER = """<script id="DVL_PAPER_TRADING_0598_NATIVE_NEUTRALIZER">
/*
  Adapter (introduction only) for the approved Paper Trading runtime 0.598.

  The base DVL build (0.633) already wires the trade panel: Buy/Sell demo
  position, leverage drag, order-type menu, margin, entry pad and liquidation
  toggle. The approved 0.598 runtime re-implements ALL of these and must be the
  single owner — otherwise Buy/Sell fires twice (old demo line + paper order)
  and the liquidation toggle cancels itself out (double toggle).

  We neutralize only the conflicting native handlers by clone-replacing the
  control nodes. cloneNode(true) keeps the exact DOM/attributes/layout and only
  drops event listeners, so the visible UI is unchanged. The approved 0.598
  logic below is NOT modified.

  Display nodes (#longLiq/#shortLiq) are also re-cloned so the native 2s poll
  (syncTradePanel) writes to detached nodes instead of fighting the 0.598
  liquidation display.
*/
(function(){
  "use strict";
  function neutralize(){
    var ids = [
      "dvlBuyBtn","dvlSellBtn",
      "isolatedModeBtn","crossModeBtn",
      "liqToggleBtn",
      "levDragCard",
      "entryEditCard","entryPadClose","entryPadClear","entryPadOk",
      "longLiq","shortLiq"
    ];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.parentNode){ el.parentNode.replaceChild(el.cloneNode(true), el); }
    });
    Array.prototype.forEach.call(
      document.querySelectorAll(".orderTypeOption, .numberPadGrid [data-key]"),
      function(el){
        if(el && el.parentNode){ el.parentNode.replaceChild(el.cloneNode(true), el); }
      }
    );
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", neutralize, {once:true});
  }else{
    neutralize();
  }
})();
</script>"""

new_block = NEUTRALIZER + '\n\n<script id="DVL_PAPER_TRADING_SCRIPT_0598">\n' + runtime_js + '\n</script>'

html = html.replace(old_block, new_block, 1)
_applied.append("swap 0.634 bridge -> neutralizer + 0.598 runtime")

SRC.write_text(html, encoding="utf-8")
print(f"[OK] patch_635 applied: {', '.join(_applied)}")
