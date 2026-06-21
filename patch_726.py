#!/usr/bin/env python3
"""patch_726.py — Beta 0.726: Wire Positions panel to paper trading runtime, auto-close drawer on Limit/Stop order."""
import sys, re

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

print("=== patch_726.py — Beta 0.726 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.725</title>',
    '<title>DVL Binance Live — Beta 0.726</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.725";',
    'const DVL_APP_VERSION = "Beta 0.726";', "version const")

html = rep(html,
    '>BETA 0.725</span>',
    '>BETA 0.726</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.725 — removed fake trades from Positions panel, removed DVL Teste 1 and Teste 2 indicators." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.726 — Positions panel wired to paper trading runtime; Limit/Stop orders auto-close drawer." },\n  { version: "Beta 0.725", note: "Beta 0.725 — removed fake trades from Positions panel, removed DVL Teste 1 and Teste 2 indicators." },',
    "changelog")

# ── 2. Audit bump 0725 → 0726 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0725_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0726_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.725"',
    'window.DVL_APP_VERSION==="Beta 0.726"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.725' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.726' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.725")===-1) blockers.push("A2: title missing 0.725")',
    'indexOf("0.726")===-1) blockers.push("A2: title missing 0.726")', "audit A2")

html = rep(html,
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0725_AUDIT_MODULE";',
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0726_AUDIT_MODULE";', "audit N name")

# ── 3. Wire Positions panel to paper trading runtime ─────────────────────────────
# Insert helper functions (paperRt, lvPrc, formatters, syncFromRt) before svgIcon
html = rep(html,
    '  function elById(id){ return document.getElementById(id); }\n\n  function svgIcon(name){',
    '  function elById(id){ return document.getElementById(id); }\n\n'
    '  function paperRt(){\n'
    '    return window.__dvlPaperRuntime0581||window.__dvlPaperRuntime0582||window.__dvlPaperRuntime0580||window.__dvlPaperRuntime;\n'
    '  }\n'
    '  function lvPrc(){\n'
    '    try{ if(window.ticker&&Number(window.ticker.lastPrice)>0) return Number(window.ticker.lastPrice); }catch(_){}\n'
    '    try{ if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){ var _c=window.S.candles[window.S.candles.length-1]; var _p=Number(_c.close||_c.c||0); if(Number.isFinite(_p)&&_p>0) return _p; } }catch(_){}\n'
    '    return 0;\n'
    '  }\n'
    '  function _fp(v){ v=Number(v); if(!Number.isFinite(v)) return "--"; return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4}); }\n'
    '  function _fm(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }\n'
    '  function _ft(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toFixed(2)+"%"; }\n'
    '  function syncFromRt(){\n'
    '    var rt=paperRt();\n'
    '    if(!rt||!rt.state||!Array.isArray(rt.state.positions)) return;\n'
    '    var live=lvPrc();\n'
    '    data.open=[];\n'
    '    data.pending=[];\n'
    '    for(var _i=0;_i<rt.state.positions.length;_i++){\n'
    '      var _pos=rt.state.positions[_i];\n'
    '      if(!_pos) continue;\n'
    '      var _sym=String(_pos.symbol||"").toUpperCase();\n'
    '      var _disp=_sym.replace(/USDT$/i,"/USDT")||_sym;\n'
    '      var _coin=_sym.replace(/USDT$/i,"").toLowerCase();\n'
    '      var _buy=_pos.side==="buy";\n'
    '      var _ep=Number(_pos.entry)||0;\n'
    '      var _qty=Number(_pos.qty)||0;\n'
    '      var _pv=live>0&&_ep>0?(_buy?(live-_ep)*_qty:(_ep-live)*_qty):0;\n'
    '      var _pc=live>0&&_ep>0?(_buy?((live-_ep)/_ep)*100:((_ep-live)/_ep)*100):0;\n'
    '      var _row={symbol:_disp,coin:_coin,side:_buy?"Long":"Short",leverage:(Number(_pos.leverage)||1)+"x",entry:_fp(_ep),current:live>0?_fp(live):"--",pnl:_fm(_pv),pct:_ft(_pc),direction:_pv>=0?"positive":"negative"};\n'
    '      if(_pos.status==="open"){ data.open.push(_row); }\n'
    '      else if(_pos.status==="pending"){ _row.current="Aguardando"; _row.pnl="Pendente"; _row.pct=_pos.orderType||"Limite"; _row.direction="positive"; data.pending.push(_row); }\n'
    '    }\n'
    '  }\n\n'
    '  function svgIcon(name){',
    "add syncFromRt helpers")

# ── 4. Call syncFromRt() at top of renderList() ──────────────────────────────────
html = rep(html,
    '  function renderList(){\n'
    '    var list = elById("dvlPosV2List");\n',
    '  function renderList(){\n'
    '    syncFromRt();\n'
    '    var list = elById("dvlPosV2List");\n',
    "renderList calls syncFromRt")

# ── 5. Auto-close drawer after Limit/Stop order placed ───────────────────────────
html = rep(html,
    '        if(tabBtn){\n'
    '          state.activeTab = tabBtn.getAttribute("data-dvl-tab");\n'
    '          renderTabs();\n'
    '          renderList();\n'
    '        }\n'
    '      });\n'
    '    }\n'
    '  }\n\n'
    '  function updateOldLabels(){',
    '        if(tabBtn){\n'
    '          state.activeTab = tabBtn.getAttribute("data-dvl-tab");\n'
    '          renderTabs();\n'
    '          renderList();\n'
    '        }\n'
    '      });\n'
    '    }\n\n'
    '    var _taBtns = document.querySelectorAll(".tradeAction.buy, .tradeAction.sell");\n'
    '    for(var _ti=0;_ti<_taBtns.length;_ti++){\n'
    '      (function(_btn){\n'
    '        if(_btn.dataset.dvlLimitBound) return;\n'
    '        _btn.dataset.dvlLimitBound = "1";\n'
    '        _btn.addEventListener("click", function(){\n'
    '          var _ol = document.getElementById("orderTypeLabel");\n'
    '          var _ot = _ol ? _ol.textContent.trim() : "";\n'
    '          if(_ot === "Market") return;\n'
    '          var _rt = paperRt();\n'
    '          if(_rt && typeof _rt.close === "function"){ _rt.close(); }\n'
    '          else{ var _dr=document.querySelector(".tradeDrawer"); if(_dr) _dr.classList.remove("is-open"); }\n'
    '          document.body.classList.remove("dvl-trade-v2-open");\n'
    '        }, false);\n'
    '      })(_taBtns[_ti]);\n'
    '    }\n'
    '  }\n\n'
    '  function updateOldLabels(){',
    "auto-close drawer on Limit/Stop")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
