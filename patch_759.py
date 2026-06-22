#!/usr/bin/env python3
"""patch_759.py — Beta 0.759: DVL_PAPER_TRADE_STORE — store central, histórico máx 100, persistência."""
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

print("=== patch_759.py — Beta 0.759 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.758</title>',
    '<title>DVL Binance Live — Beta 0.759</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.758";',
    'const DVL_APP_VERSION = "Beta 0.759";', "version const")

html = rep(html,
    '>BETA 0.758</span>',
    '>BETA 0.759</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.758 — getAllOrders() scan direto de localStorage: garante todos os ativos sem depender de registry." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.759 — DVL_PAPER_TRADE_STORE: store central com pendingOrders, openPositions e tradeHistory; histórico máximo 100 trades; persistência cross-reload." },\n  { version: "Beta 0.758", note: "Beta 0.758 — getAllOrders() scan direto de localStorage: garante todos os ativos sem depender de registry." },',
    "changelog")

# ── 2. Audit bump 0758 → 0759 ─────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0758_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0759_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.758"',
    'window.DVL_APP_VERSION==="Beta 0.759"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.758' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.759' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.758")===-1) blockers.push("A2: title missing 0.758")',
    'indexOf("0.759")===-1) blockers.push("A2: title missing 0.759")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0758_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0759_AUDIT_MODULE";',
    "audit name bump")

# ── 3. V2 Pro: closeOpenOrder() → addTradeToHistory() antes de save() ─────────
# Trade fecha (TP/SL/manual) → o já tem status=closed, closedAt, realizedPnl.
# Pending cancelada usa cancelPaperOrder() → NÃO chama closeOpenOrder() → não entra.
html = rep(html,
    "}));}catch(_){} save(); toast(reason==='tp'?'TP ativado':reason==='sl'?'SL ativado':'Trade fechado'); return true;}",
    "}));}catch(_){} try{if(typeof window.addTradeToHistory==='function')window.addTradeToHistory(o);}catch(_){} save(); toast(reason==='tp'?'TP ativado':reason==='sl'?'SL ativado':'Trade fechado'); return true;}",
    "closeOpenOrder(): addTradeToHistory")

# ── 4. Inserir DVL_PAPER_TRADE_STORE_MODULE_0759 antes do adapter ─────────────
STORE = (
'<script id="DVL_PAPER_TRADE_STORE_MODULE_0759">\n'
'(function(){\n'
'"use strict";\n'
'if(window.DVL_PAPER_TRADE_STORE)return;\n'
"var _SKEY='DVL_PAPER_TRADE_STORE_V1';\n"
'var _MAX=100;\n'
"window.DVL_PAPER_TRADE_STORE={version:'0.759',pendingOrders:[],openPositions:[],tradeHistory:[],maxHistory:_MAX};\n"
'\n'
'function savePaperTradeStore(){try{var s=window.DVL_PAPER_TRADE_STORE;localStorage.setItem(_SKEY,JSON.stringify({version:s.version,pendingOrders:s.pendingOrders,openPositions:s.openPositions,tradeHistory:s.tradeHistory}));}catch(e){}}\n'
'\n'
'function loadPaperTradeStore(){\n'
'  try{\n'
"    var raw=localStorage.getItem(_SKEY);var s=window.DVL_PAPER_TRADE_STORE;\n"
"    if(raw){var data=JSON.parse(raw);if(data){s.pendingOrders=Array.isArray(data.pendingOrders)?data.pendingOrders:[];s.openPositions=Array.isArray(data.openPositions)?data.openPositions:[];s.tradeHistory=Array.isArray(data.tradeHistory)?data.tradeHistory.slice(-_MAX):[];}}\n"
"    if(!s.tradeHistory.length){\n"
"      var _pfx='dvl_paper_v2_pro_0695_',_rk=_pfx+'symbols',_seen={};\n"
'      try{\n'
"        for(var _k=0;_k<localStorage.length;_k++){var _lk=localStorage.key(_k);if(!_lk||_lk.indexOf(_pfx)!==0||_lk===_rk)continue;try{var _la=JSON.parse(localStorage.getItem(_lk)||'[]');if(Array.isArray(_la))_la.forEach(function(o){if(o&&o.id&&o.status==='closed'&&!_seen[o.id]){_seen[o.id]=true;s.tradeHistory.push(o);}});}catch(_){}}\n"
'      }catch(_){}\n'
'      s.tradeHistory.sort(function(a,b){return(a.closedAt||0)-(b.closedAt||0);});\n'
'      if(s.tradeHistory.length>_MAX)s.tradeHistory=s.tradeHistory.slice(-_MAX);\n'
'    }\n'
'  }catch(e){}\n'
'}\n'
'\n'
'function addTradeToHistory(trade){var s=window.DVL_PAPER_TRADE_STORE;if(!s||!trade)return;s.tradeHistory.push(trade);while(s.tradeHistory.length>s.maxHistory)s.tradeHistory.shift();savePaperTradeStore();}\n'
'\n'
"function syncPaperStoreFromOrders(){var s=window.DVL_PAPER_TRADE_STORE;if(!s)return;try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(!V2)return;var all=typeof V2.getAllOrders==='function'?V2.getAllOrders():(V2.getState().orders||[]);s.pendingOrders=all.filter(function(o){return o&&(o.status==='pending'||o.status==='draft');});s.openPositions=all.filter(function(o){return o&&o.status==='open';});}catch(_){}}\n"
'\n'
'window.savePaperTradeStore=savePaperTradeStore;\n'
'window.loadPaperTradeStore=loadPaperTradeStore;\n'
'window.addTradeToHistory=addTradeToHistory;\n'
'window.syncPaperStoreFromOrders=syncPaperStoreFromOrders;\n'
"\nwindow.DVL_PAPER_TRADE_STORE_AUDIT={run:function(){var bl=[];var s=window.DVL_PAPER_TRADE_STORE;if(!s){bl.push('store missing');}else{if(!Array.isArray(s.pendingOrders))bl.push('pendingOrders missing');if(!Array.isArray(s.openPositions))bl.push('openPositions missing');if(!Array.isArray(s.tradeHistory))bl.push('tradeHistory missing');if(s.maxHistory!==100)bl.push('maxHistory!=100');if(s.tradeHistory.length>100)bl.push('history>100');}if(typeof window.savePaperTradeStore!=='function')bl.push('savePaperTradeStore missing');if(typeof window.loadPaperTradeStore!=='function')bl.push('loadPaperTradeStore missing');if(typeof window.addTradeToHistory!=='function')bl.push('addTradeToHistory missing');if(typeof window.syncPaperStoreFromOrders!=='function')bl.push('syncPaperStoreFromOrders missing');return{pass:bl.length===0,blockers:bl,version:'0.759'};}};\n"
'\n'
"function _init(){loadPaperTradeStore();syncPaperStoreFromOrders();}\n"
"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_init,{once:true});else _init();\n"
"document.addEventListener('dvl:paper-v2-close',syncPaperStoreFromOrders);\n"
"document.addEventListener('dvl:paper-position',syncPaperStoreFromOrders);\n"
"document.addEventListener('dvl:paper-position-closed',syncPaperStoreFromOrders);\n"
'})();\n'
'</script>\n'
'\n'
)

html = rep(html,
    '<script id="DVL_POSITIONS_ADAPTER_MODULE_0728">',
    STORE + '<script id="DVL_POSITIONS_ADAPTER_MODULE_0728">',
    "insert store module")

# ── 5. Adapter: sync no início de readOrders() ────────────────────────────────
html = rep(html,
    "function readOrders(){\n  var rows={open:[],pending:[],history:[]};\n  var live=lvPrc();\n\n  // Primary: DVL_PAPER_TRADING_V2_PRO",
    "function readOrders(){\n  var rows={open:[],pending:[],history:[]};\n  var live=lvPrc();\n  try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}\n\n  // Primary: DVL_PAPER_TRADING_V2_PRO",
    "adapter: sync call início")

# ── 6. Adapter: history vem do store (mais recente primeiro) ──────────────────
# Mantém o loop original para fallback caso store esteja vazio.
# Depois do loop, se store.tradeHistory tiver dados, sobrescreve rows.history.
html = rep(html,
    '          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        return rows;\n      }\n    }catch(_){}\n  }',
    '          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        try{if(window.DVL_PAPER_TRADE_STORE&&(window.DVL_PAPER_TRADE_STORE.tradeHistory||[]).length>0){rows.history=[];var _th=window.DVL_PAPER_TRADE_STORE.tradeHistory.slice().reverse();for(var _thi=0;_thi<_th.length;_thi++){var _tho=_th[_thi];if(!_tho)continue;var _thsym=String(_tho.symbol||"").toUpperCase();var _thd=_thsym.replace(/USDT$/i,"/USDT")||_thsym;var _thc=_thsym.replace(/USDT$/i,"").toLowerCase();var _thb=_tho.side==="buy";var _the=Number(_tho.entry)||0;var _thx=Number(_tho.exitPrice||_tho.closedPrice||0);var _thrn=Number(_tho.realizedPnl);var _thrc=Number(_tho.realizedPnlPct);rows.history.push({id:_tho.id,symbol:_thd,coin:_thc,side:_thb?"Long":"Short",leverage:(Number(_tho.leverage)||1)+"x",entry:_fp(_the),current:_thx>0?_fp(_thx):"--",pnl:Number.isFinite(_thrn)?_fm(_thrn):"--",pct:Number.isFinite(_thrc)?_ft(_thrc):"--",direction:Number.isFinite(_thrn)?(_thrn>=0?"positive":"negative"):"positive"});}}catch(_){}\n        return rows;\n      }\n    }catch(_){}\n  }',
    "adapter: history do store")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
