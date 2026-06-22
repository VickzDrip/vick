#!/usr/bin/env python3
"""patch_757.py — Beta 0.757: Multi-symbol positions; fix history lost on symbol switch; baseOrder rawSym."""
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

print("=== patch_757.py — Beta 0.757 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.756</title>',
    '<title>DVL Binance Live — Beta 0.757</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.756";',
    'const DVL_APP_VERSION = "Beta 0.757";', "version const")

html = rep(html,
    '>BETA 0.756</span>',
    '>BETA 0.757</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.756 — Fix trade close root cause: rawSym() bypasses S.sym lag so symbol guard and key() use the correct symbol immediately." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.757 — Multi-symbol positions: show all assets\' trades in Positions panel; fix history lost on symbol switch; baseOrder uses rawSym()." },\n  { version: "Beta 0.756", note: "Beta 0.756 — Fix trade close root cause: rawSym() bypasses S.sym lag so symbol guard and key() use the correct symbol immediately." },',
    "changelog")

# ── 2. Audit bump 0756 → 0757 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0756_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0757_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.756"',
    'window.DVL_APP_VERSION==="Beta 0.757"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.756' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.757' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.756")===-1) blockers.push("A2: title missing 0.756")',
    'indexOf("0.757")===-1) blockers.push("A2: title missing 0.757")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0756_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0757_AUDIT_MODULE";',
    "audit name bump")

# ── 3. V2 Pro: save() — register current symbol in global registry ────────────────
# After saving orders to the per-symbol key, also update the registry key
# 'dvl_paper_v2_pro_0695_symbols' so getAllOrders() can find all symbols.
html = rep(html,
    "  function save(){try{var _a=[],_h=[];for(var _i=0;_i<state.orders.length;_i++){var _o=state.orders[_i];if(!_o)continue;if(_o.status==='closed')_h.push(_o);else if(_o.status!=='draft')_a.push(_o);}if(_h.length>100)_h=_h.slice(-100);var _dr=state.orders.filter(function(_o){return _o&&_o.status==='draft';});state.orders=_dr.concat(_a).concat(_h);localStorage.setItem(key(),JSON.stringify(_a.concat(_h)));}catch(_){}}",
    "  function save(){try{var _a=[],_h=[];for(var _i=0;_i<state.orders.length;_i++){var _o=state.orders[_i];if(!_o)continue;if(_o.status==='closed')_h.push(_o);else if(_o.status!=='draft')_a.push(_o);}if(_h.length>100)_h=_h.slice(-100);var _dr=state.orders.filter(function(_o){return _o&&_o.status==='draft';});state.orders=_dr.concat(_a).concat(_h);localStorage.setItem(key(),JSON.stringify(_a.concat(_h)));}catch(_){} try{var _rk='dvl_paper_v2_pro_0695_symbols';var _rs=JSON.parse(localStorage.getItem(_rk)||'[]');var _cs=rawSym();if(_cs&&_rs.indexOf(_cs)===-1){_rs.push(_cs);localStorage.setItem(_rk,JSON.stringify(_rs));}}catch(_){}}",
    "save(): register symbol")

# ── 4. V2 Pro: render() switch save — preserve closed + register old symbol ───────
# BUG: the switch save was filtering out closed orders (!=='closed'&&!=='draft')
# which caused trade history to be wiped whenever the user changed symbols.
# FIX: save all non-draft orders (open + pending + closed) so history persists.
# Also register the old symbol in the global registry on every switch.
html = rep(html,
    "try{var _sv=state.orders.filter(function(o){return o&&o.status!=='closed'&&o.status!=='draft';}); if(_sv.length)localStorage.setItem('dvl_paper_v2_pro_0695_'+_lastSym,JSON.stringify(_sv));}catch(_){}",
    "try{var _sv=state.orders.filter(function(o){return o&&o.status!=='draft';}); if(_sv.length){localStorage.setItem('dvl_paper_v2_pro_0695_'+_lastSym,JSON.stringify(_sv)); try{var _rk='dvl_paper_v2_pro_0695_symbols';var _rs=JSON.parse(localStorage.getItem(_rk)||'[]');if(_lastSym&&_rs.indexOf(_lastSym)===-1){_rs.push(_lastSym);localStorage.setItem(_rk,JSON.stringify(_rs));}}catch(_){}}}catch(_){}",
    "render(): preserve closed + register old symbol")

# ── 5. V2 Pro: add getAllOrders() ────────────────────────────────────────────────
# Returns all orders from ALL symbols: current state.orders (non-draft) merged with
# orders from every other symbol's localStorage key found in the registry.
html = rep(html,
    "  function toast(msg){try{if(typeof showToast==='function'){showToast(msg);return;}}catch(_){}",
    "  function getAllOrders(){var _all=state.orders.filter(function(o){return o&&o.id&&o.status!=='draft';}); var _cur=rawSym(); try{var _syms=JSON.parse(localStorage.getItem('dvl_paper_v2_pro_0695_symbols')||'[]'); _syms.forEach(function(_s){if(_s===_cur)return; try{var _a=JSON.parse(localStorage.getItem('dvl_paper_v2_pro_0695_'+_s)||'[]'); if(Array.isArray(_a))_all=_all.concat(_a.filter(function(o){return o&&o.id&&o.status!=='draft';}));}catch(_){}});}catch(_){} return _all;}\n  function toast(msg){try{if(typeof showToast==='function'){showToast(msg);return;}}catch(_){}",
    "add getAllOrders()")

# ── 6. V2 Pro: expose getAllOrders in window export ──────────────────────────────
html = rep(html,
    "window.DVL_PAPER_TRADING_V2_PRO={VERSION:VERSION,getState:function(){return state;},render:render,",
    "window.DVL_PAPER_TRADING_V2_PRO={VERSION:VERSION,getState:function(){return state;},getAllOrders:getAllOrders,render:render,",
    "export getAllOrders")

# ── 7. V2 Pro: baseOrder() uses rawSym() for order.symbol ────────────────────────
# symbolName() reads S.sym first which lags behind the symbol global. Use rawSym()
# so orders created immediately after selectSymbol() store the correct symbol.
html = rep(html,
    "+'_'+Math.random().toString(36).slice(2,7),symbol:symbolName(),side:buy?'buy':'sell',",
    "+'_'+Math.random().toString(36).slice(2,7),symbol:rawSym(),side:buy?'buy':'sell',",
    "baseOrder(): symbol uses rawSym()")

# ── 8. Adapter: readOrders() uses getAllOrders() + per-symbol price for PnL ───────
# Use getAllOrders() to get orders from ALL symbols (current + others in registry).
# For non-current symbols: _lv=0 → PnL and current price show "--" (no live feed).
# History (closed orders) always shows realized PnL stored at close time.
html = rep(html,
    "      var st=window.DVL_PAPER_TRADING_V2_PRO.getState();\n      if(st&&Array.isArray(st.orders)){\n        for(var i=0;i<st.orders.length;i++){\n          var o=st.orders[i];\n          if(!o||o.status===\"draft\") continue;\n          var sym=String(o.symbol||\"\").toUpperCase();\n          var disp=sym.replace(/USDT$/i,\"/USDT\")||sym;\n          var coin=sym.replace(/USDT$/i,\"\").toLowerCase();\n          var buy=o.side===\"buy\";\n          var ep=Number(o.entry)||0;\n          var qty=Number(o.qty)||0;\n          var pv=live>0&&ep>0?(buy?(live-ep)*qty:(ep-live)*qty):0;\n          var pc=live>0&&ep>0?(buy?((live-ep)/ep)*100:((ep-live)/ep)*100):0;\n          var row={id:o.id,symbol:disp,coin:coin,side:buy?\"Long\":\"Short\",leverage:(Number(o.leverage)||1)+\"x\",entry:_fp(ep),current:live>0?_fp(live):\"--\",pnl:_fm(pv),pct:_ft(pc),direction:pv>=0?\"positive\":\"negative\"};\n          if(o.status===\"open\"){ rows.open.push(row); }\n          else if(o.status===\"pending\"){ row.current=\"Aguardando\"; row.pnl=\"Pendente\"; row.pct=o.orderLabel||(o.type||\"Limite\"); row.direction=\"positive\"; rows.pending.push(row); }\n          else if(o.status===\"closed\"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?\"positive\":\"negative\"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        return rows;\n      }",
    "      var _allOrds=typeof window.DVL_PAPER_TRADING_V2_PRO.getAllOrders==='function'?window.DVL_PAPER_TRADING_V2_PRO.getAllOrders():(function(){var _st=window.DVL_PAPER_TRADING_V2_PRO.getState();return _st&&Array.isArray(_st.orders)?_st.orders:[];})();\n      var _curSym=(window.symbol&&String(window.symbol).toUpperCase())||'';\n      if(Array.isArray(_allOrds)){\n        for(var i=0;i<_allOrds.length;i++){\n          var o=_allOrds[i];\n          if(!o||o.status===\"draft\") continue;\n          var sym=String(o.symbol||\"\").toUpperCase();\n          var disp=sym.replace(/USDT$/i,\"/USDT\")||sym;\n          var coin=sym.replace(/USDT$/i,\"\").toLowerCase();\n          var buy=o.side===\"buy\";\n          var ep=Number(o.entry)||0;\n          var qty=Number(o.qty)||0;\n          var _lv=sym===_curSym?live:0;\n          var pv=_lv>0&&ep>0?(buy?(_lv-ep)*qty:(ep-_lv)*qty):0;\n          var pc=_lv>0&&ep>0?(buy?((_lv-ep)/ep)*100:((ep-_lv)/ep)*100):0;\n          var row={id:o.id,symbol:disp,coin:coin,side:buy?\"Long\":\"Short\",leverage:(Number(o.leverage)||1)+\"x\",entry:_fp(ep),current:_lv>0?_fp(_lv):\"--\",pnl:_lv>0?_fm(pv):\"--\",pct:_lv>0?_ft(pc):\"--\",direction:pv>=0?\"positive\":\"negative\"};\n          if(o.status===\"open\"){ rows.open.push(row); }\n          else if(o.status===\"pending\"){ row.current=\"Aguardando\"; row.pnl=\"Pendente\"; row.pct=o.orderLabel||(o.type||\"Limite\"); row.direction=\"positive\"; rows.pending.push(row); }\n          else if(o.status===\"closed\"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?\"positive\":\"negative\"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        return rows;\n      }",
    "adapter: readOrders uses getAllOrders + per-symbol price")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
