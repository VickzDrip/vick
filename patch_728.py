#!/usr/bin/env python3
"""patch_728.py — Beta 0.728: DVL_POSITIONS_ADAPTER, remove dangerous handler, proper lifecycle."""
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

print("=== patch_728.py — Beta 0.728 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.727</title>',
    '<title>DVL Binance Live — Beta 0.728</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.727";',
    'const DVL_APP_VERSION = "Beta 0.728";', "version const")

html = rep(html,
    '>BETA 0.727</span>',
    '>BETA 0.728</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.727 — Positions panel refreshes on open; limit order price validation removed." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.728 — Fixed Positions data adapter and pending order lifecycle: drafts no longer appear or activate before confirmation, and Limit/Stop triggers now respect orderType." },\n  { version: "Beta 0.727", note: "Beta 0.727 — Positions panel refreshes on open; limit order price validation removed." },',
    "changelog")

# ── 2. Audit bump 0727 → 0728 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0727_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0728_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.727"',
    'window.DVL_APP_VERSION==="Beta 0.728"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.727' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.728' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.727")===-1) blockers.push("A2: title missing 0.727")',
    'indexOf("0.728")===-1) blockers.push("A2: title missing 0.728")', "audit A2")

# ── 3. Add new audit checks A81-A88 and bump N ───────────────────────────────────
html = rep(html,
    'var N=80, name="DVL_UI_OVERLAY_PHASE_0727_AUDIT_MODULE";',
    '// A81. DVL_POSITIONS_ADAPTER_MODULE_0728 script present\n'
    'if(!document.getElementById("DVL_POSITIONS_ADAPTER_MODULE_0728")) blockers.push("A81: DVL_POSITIONS_ADAPTER_MODULE_0728 missing");\n'
    '// A82. DVL_PAPER_TRADING_V2_PRO present\n'
    'if(!window.DVL_PAPER_TRADING_V2_PRO) warnings.push("A82: DVL_PAPER_TRADING_V2_PRO not yet loaded");\n'
    '// A83. Dangerous __dvlLimitConfirmBound handler removed\n'
    'if(document.__dvlLimitConfirmBound) blockers.push("A83: dangerous __dvlLimitConfirmBound handler is still installed");\n'
    '// A84. window.DVL_POSITIONS_REFRESH is a function\n'
    'if(typeof window.DVL_POSITIONS_REFRESH!=="function") blockers.push("A84: DVL_POSITIONS_REFRESH not exposed");\n'
    '// A85. window.DVL_POSITIONS_ADAPTER present\n'
    'if(!window.DVL_POSITIONS_ADAPTER) blockers.push("A85: DVL_POSITIONS_ADAPTER not present");\n'
    '// A86. DVL_POSITIONS_ADAPTER.readOrders is a function\n'
    'if(window.DVL_POSITIONS_ADAPTER&&typeof window.DVL_POSITIONS_ADAPTER.readOrders!=="function") blockers.push("A86: DVL_POSITIONS_ADAPTER.readOrders not a function");\n'
    '// A87. DVL_POSITIONS_WATCHLIST_OVERLAY_0722.refresh is a function\n'
    'if(window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722&&typeof window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722.refresh!=="function") blockers.push("A87: Positions overlay missing refresh method");\n'
    '// A88. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A88: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=88, name="DVL_UI_OVERLAY_PHASE_0728_AUDIT_MODULE";',
    "audit new checks A81-A88 + N bump")

# ── 4. Insert DVL_POSITIONS_ADAPTER_MODULE_0728 before overlay module ─────────────
ADAPTER_SCRIPT = (
    '<script id="DVL_POSITIONS_ADAPTER_MODULE_0728">\n'
    '(function(){\n'
    '"use strict";\n'
    'if(window.DVL_POSITIONS_ADAPTER) return;\n'
    '\n'
    'function lvPrc(){\n'
    '  try{ if(window.ticker&&Number(window.ticker.lastPrice)>0) return Number(window.ticker.lastPrice); }catch(_){}\n'
    '  try{ if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){ var _c=window.S.candles[window.S.candles.length-1]; var _p=Number(_c.close||_c.c||0); if(Number.isFinite(_p)&&_p>0) return _p; } }catch(_){}\n'
    '  return 0;\n'
    '}\n'
    'function _fp(v){ v=Number(v); if(!Number.isFinite(v)) return "--"; return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4}); }\n'
    'function _fm(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }\n'
    'function _ft(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toFixed(2)+"%"; }\n'
    '\n'
    'function readOrders(){\n'
    '  var rows={open:[],pending:[],history:[]};\n'
    '  var live=lvPrc();\n'
    '\n'
    '  // Primary: DVL_PAPER_TRADING_V2_PRO\n'
    '  if(window.DVL_PAPER_TRADING_V2_PRO){\n'
    '    try{\n'
    '      var st=window.DVL_PAPER_TRADING_V2_PRO.getState();\n'
    '      if(st&&Array.isArray(st.orders)){\n'
    '        for(var i=0;i<st.orders.length;i++){\n'
    '          var o=st.orders[i];\n'
    '          if(!o||o.status==="draft") continue;\n'
    '          var sym=String(o.symbol||"").toUpperCase();\n'
    '          var disp=sym.replace(/USDT$/i,"/USDT")||sym;\n'
    '          var coin=sym.replace(/USDT$/i,"").toLowerCase();\n'
    '          var buy=o.side==="buy";\n'
    '          var ep=Number(o.entry)||0;\n'
    '          var qty=Number(o.qty)||0;\n'
    '          var pv=live>0&&ep>0?(buy?(live-ep)*qty:(ep-live)*qty):0;\n'
    '          var pc=live>0&&ep>0?(buy?((live-ep)/ep)*100:((ep-live)/ep)*100):0;\n'
    '          var row={symbol:disp,coin:coin,side:buy?"Long":"Short",leverage:(Number(o.leverage)||1)+"x",entry:_fp(ep),current:live>0?_fp(live):"--",pnl:_fm(pv),pct:_ft(pc),direction:pv>=0?"positive":"negative"};\n'
    '          if(o.status==="open"){ rows.open.push(row); }\n'
    '          else if(o.status==="pending"){ row.current="Aguardando"; row.pnl="Pendente"; row.pct=(o.type||"Limite"); row.direction="positive"; rows.pending.push(row); }\n'
    '          else if(o.status==="closed"){ rows.history.push(row); }\n'
    '        }\n'
    '        return rows;\n'
    '      }\n'
    '    }catch(_){}\n'
    '  }\n'
    '\n'
    '  // Fallback: legacy runtime\n'
    '  var rt=window.__dvlPaperRuntime0581||window.__dvlPaperRuntime0582||window.__dvlPaperRuntime0580||window.__dvlPaperRuntime;\n'
    '  if(rt&&rt.state&&Array.isArray(rt.state.positions)){\n'
    '    for(var j=0;j<rt.state.positions.length;j++){\n'
    '      var pos=rt.state.positions[j];\n'
    '      if(!pos) continue;\n'
    '      var sym2=String(pos.symbol||"").toUpperCase();\n'
    '      var disp2=sym2.replace(/USDT$/i,"/USDT")||sym2;\n'
    '      var coin2=sym2.replace(/USDT$/i,"").toLowerCase();\n'
    '      var buy2=pos.side==="buy";\n'
    '      var ep2=Number(pos.entry)||0;\n'
    '      var qty2=Number(pos.qty)||0;\n'
    '      var pv2=live>0&&ep2>0?(buy2?(live-ep2)*qty2:(ep2-live)*qty2):0;\n'
    '      var pc2=live>0&&ep2>0?(buy2?((live-ep2)/ep2)*100:((ep2-live)/ep2)*100):0;\n'
    '      var row2={symbol:disp2,coin:coin2,side:buy2?"Long":"Short",leverage:(Number(pos.leverage)||1)+"x",entry:_fp(ep2),current:live>0?_fp(live):"--",pnl:_fm(pv2),pct:_ft(pc2),direction:pv2>=0?"positive":"negative"};\n'
    '      if(pos.status==="open"){ rows.open.push(row2); }\n'
    '      else if(pos.status==="pending"){ row2.current="Aguardando"; row2.pnl="Pendente"; row2.pct=pos.orderType||"Limite"; row2.direction="positive"; rows.pending.push(row2); }\n'
    '    }\n'
    '  }\n'
    '\n'
    '  return rows;\n'
    '}\n'
    '\n'
    'window.DVL_POSITIONS_ADAPTER={\n'
    '  readOrders:readOrders\n'
    '};\n'
    '\n'
    'window.DVL_POSITIONS_REFRESH=function(){\n'
    '  try{\n'
    '    var ov=window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722;\n'
    '    if(ov&&typeof ov.refresh==="function") ov.refresh();\n'
    '  }catch(_){}\n'
    '};\n'
    '\n'
    'document.addEventListener("dvl:paper-v2-close",function(){ window.DVL_POSITIONS_REFRESH(); });\n'
    'document.addEventListener("dvl:paper-position",function(){ window.DVL_POSITIONS_REFRESH(); });\n'
    'document.addEventListener("dvl:paper-position-closed",function(){ window.DVL_POSITIONS_REFRESH(); });\n'
    '})();\n'
    '</script>\n'
    '\n'
    '<script id="DVL_POSITIONS_WATCHLIST_OVERLAY_MODULE_0722">'
)

html = rep(html,
    '<script id="DVL_POSITIONS_WATCHLIST_OVERLAY_MODULE_0722">',
    ADAPTER_SCRIPT,
    "insert DVL_POSITIONS_ADAPTER_MODULE_0728")

# ── 5. Replace legacy helpers + syncFromRt with syncFromAdapter ───────────────────
html = rep(html,
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
    '  }',
    '  function syncFromAdapter(){\n'
    '    var rows=window.DVL_POSITIONS_ADAPTER?window.DVL_POSITIONS_ADAPTER.readOrders():{open:[],pending:[],history:[]};\n'
    '    data.open=rows.open;\n'
    '    data.pending=rows.pending;\n'
    '    data.history=rows.history;\n'
    '  }',
    "replace legacy helpers+syncFromRt with syncFromAdapter")

# ── 6. Update renderList to call syncFromAdapter ──────────────────────────────────
html = rep(html,
    '  function renderList(){\n'
    '    syncFromRt();\n'
    '    var list = elById("dvlPosV2List");\n',
    '  function renderList(){\n'
    '    syncFromAdapter();\n'
    '    var list = elById("dvlPosV2List");\n',
    "renderList calls syncFromAdapter")

# ── 7. Remove dangerous capture handler + fix _taBtns to not call paperRt ─────────
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
    '          var _rt = paperRt();\n'
    '          if(_rt && typeof _rt.close === "function"){ _rt.close(); }\n'
    '          else{ var _dr=document.querySelector(".tradeDrawer"); if(_dr) _dr.classList.remove("is-open"); }\n'
    '          document.body.classList.remove("dvl-trade-v2-open");\n'
    '        }, false);\n'
    '      })(_taBtns[_ti]);\n'
    '    }\n'
    '\n'
    '    if(!document.__dvlLimitConfirmBound){\n'
    '      document.__dvlLimitConfirmBound = true;\n'
    '      document.addEventListener("click", function(ev){\n'
    '        if(!ev.target||!ev.target.closest) return;\n'
    '        var _ok=ev.target.closest(".dvl-paper-draft-confirm-fixed .dvl-paper-confirm.ok");\n'
    '        if(!_ok) return;\n'
    '        var rt=paperRt();\n'
    '        if(!rt||!rt.state||!rt.state.pendingDraft) return;\n'
    '        var draft=rt.state.pendingDraft;\n'
    '        if((draft.orderType||"")==="Market") return;\n'
    '        ev.stopImmediatePropagation();\n'
    '        ev.preventDefault();\n'
    '        var pos=Object.assign({},draft,{status:"pending"});\n'
    '        rt.state.positions.push(pos);\n'
    '        rt.state.pendingDraft=null;\n'
    '        try{ var _s=(window.S&&window.S.symbol)?String(window.S.symbol):"BTCUSDT"; localStorage.setItem("dvl_paper_runtime_0581_"+_s,JSON.stringify(rt.state.positions.slice(-40))); }catch(_){}\n'
    '        try{ if(typeof rt.render==="function") rt.render(); }catch(_){}\n'
    '        try{ if(typeof showToast==="function") showToast("Ordem criada"); }catch(_){}\n'
    '      }, true);\n'
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
    '  }',
    "remove dangerous handler + fix _taBtns no paperRt")

# ── 8. Add refresh method to exposed overlay API ──────────────────────────────────
html = rep(html,
    '    setTab: function(tab){ state.activeTab = tab; renderTabs(); renderList(); }\n'
    '  };',
    '    setTab: function(tab){ state.activeTab = tab; renderTabs(); renderList(); },\n'
    '    refresh: function(){ if(state.panelOpen) renderList(); }\n'
    '  };',
    "add refresh to overlay API")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
