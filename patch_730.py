#!/usr/bin/env python3
"""patch_730.py — Beta 0.730: Click-outside closes panels; history capped at 100 trades."""
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

print("=== patch_730.py — Beta 0.730 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.729</title>',
    '<title>DVL Binance Live — Beta 0.730</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.729";',
    'const DVL_APP_VERSION = "Beta 0.730";', "version const")

html = rep(html,
    '>BETA 0.729</span>',
    '>BETA 0.730</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.729 — fixed pending order lifecycle, smart Limit/Stop classification and closed trade history for Positions." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.730 — click-outside closes all panels (Trade excepted); history capped at 100 trades." },\n  { version: "Beta 0.729", note: "Beta 0.729 — fixed pending order lifecycle, smart Limit/Stop classification and closed trade history for Positions." },',
    "changelog")

# ── 2. Audit bump 0729 → 0730 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0729_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0730_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.729"',
    'window.DVL_APP_VERSION==="Beta 0.730"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.729' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.730' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.729")===-1) blockers.push("A2: title missing 0.729")',
    'indexOf("0.730")===-1) blockers.push("A2: title missing 0.730")', "audit A2")

# ── 3. Add new audit checks A98-A100 + bump N ────────────────────────────────────
html = rep(html,
    'var N=97, name="DVL_UI_OVERLAY_PHASE_0729_AUDIT_MODULE";',
    '// A98. V2 Pro save() caps history at 100\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("hist.length>100")===-1) blockers.push("A98: V2 Pro save() not capping history at 100"); })();\n'
    '// A99. Positions panel has click-outside handler\n'
    '(function(){ var s=document.getElementById("DVL_POSITIONS_WATCHLIST_OVERLAY_MODULE_0722"); var t=s?(s.textContent||""):""; if(t.indexOf("__dvlPositionsOutsideBound")===-1) blockers.push("A99: Positions panel missing click-outside handler"); })();\n'
    '// A100. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A100: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=100, name="DVL_UI_OVERLAY_PHASE_0730_AUDIT_MODULE";',
    "audit new checks A98-A100 + N bump")

# ── 4. V2 Pro: save() — cap history at 100, trim state.orders in-place ───────────
html = rep(html,
    "  function save(){try{localStorage.setItem(key(), JSON.stringify(state.orders.filter(function(o){return o&&o.status!=='draft';}).slice(-80)));}catch(_){}}",
    "  function save(){try{var _a=[],_h=[];for(var _i=0;_i<state.orders.length;_i++){var _o=state.orders[_i];if(!_o)continue;if(_o.status==='closed')_h.push(_o);else if(_o.status!=='draft')_a.push(_o);}if(_h.length>100)_h=_h.slice(-100);var _dr=state.orders.filter(function(_o){return _o&&_o.status==='draft';});state.orders=_dr.concat(_a).concat(_h);localStorage.setItem(key(),JSON.stringify(_a.concat(_h)));}catch(_){}}",
    "save: cap history at 100, trim state.orders")

# ── 5. Positions overlay: add click-outside-to-close in bindEvents() ─────────────
html = rep(html,
    '    var _taBtns = document.querySelectorAll(".tradeAction.buy, .tradeAction.sell");\n'
    '    for(var _ti=0;_ti<_taBtns.length;_ti++){\n'
    '      (function(_btn){\n'
    '        if(_btn.dataset.dvlLimitBound) return;\n'
    '        _btn.dataset.dvlLimitBound = "1";\n'
    '        _btn.addEventListener("click", function(){\n'
    '          var _ol = document.getElementById("orderTypeLabel");\n'
    '          var _ot = _ol ? _ol.textContent.trim() : "";\n'
    '          if(_ot === "Market") return;\n'
    '          var _dr=document.querySelector(".tradeDrawer"); if(_dr) _dr.classList.remove("is-open");\n'
    '          document.body.classList.remove("dvl-trade-v2-open");\n'
    '        }, false);\n'
    '      })(_taBtns[_ti]);\n'
    '    }\n'
    '  }',
    '    var _taBtns = document.querySelectorAll(".tradeAction.buy, .tradeAction.sell");\n'
    '    for(var _ti=0;_ti<_taBtns.length;_ti++){\n'
    '      (function(_btn){\n'
    '        if(_btn.dataset.dvlLimitBound) return;\n'
    '        _btn.dataset.dvlLimitBound = "1";\n'
    '        _btn.addEventListener("click", function(){\n'
    '          var _ol = document.getElementById("orderTypeLabel");\n'
    '          var _ot = _ol ? _ol.textContent.trim() : "";\n'
    '          if(_ot === "Market") return;\n'
    '          var _dr=document.querySelector(".tradeDrawer"); if(_dr) _dr.classList.remove("is-open");\n'
    '          document.body.classList.remove("dvl-trade-v2-open");\n'
    '        }, false);\n'
    '      })(_taBtns[_ti]);\n'
    '    }\n'
    '\n'
    '    if(!document.__dvlPositionsOutsideBound){\n'
    '      document.__dvlPositionsOutsideBound = true;\n'
    '      document.addEventListener("click", function(ev){\n'
    '        if(!state.panelOpen) return;\n'
    '        var inPanel = ev.target.closest ? ev.target.closest("#dvlPositionsPanelV2") : null;\n'
    '        var inNav   = ev.target.closest ? ev.target.closest("#dvlBottomNavV2") : null;\n'
    '        var inDet   = ev.target.closest ? ev.target.closest("#dvlPositionDetailsV2") : null;\n'
    '        var inTrade = ev.target.closest ? ev.target.closest(".tradeDrawer") : null;\n'
    '        if(!inPanel && !inNav && !inDet && !inTrade){\n'
    '          state.panelOpen = false;\n'
    '          renderNav();\n'
    '        }\n'
    '      }, false);\n'
    '    }\n'
    '  }',
    "positions: add click-outside-to-close")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
