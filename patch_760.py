#!/usr/bin/env python3
"""patch_760.py — Beta 0.760: revert adapter changes from 0.759 that broke positions panel."""
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

print("=== patch_760.py — Beta 0.760 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.759</title>',
    '<title>DVL Binance Live — Beta 0.760</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.759";',
    'const DVL_APP_VERSION = "Beta 0.760";', "version const")

html = rep(html,
    '>BETA 0.759</span>',
    '>BETA 0.760</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.759 — DVL_PAPER_TRADE_STORE: store central com pendingOrders, openPositions e tradeHistory; histórico máximo 100 trades; persistência cross-reload." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.760 — Fix positions panel: revert adapter changes from 0.759 que quebraram o painel; store continua ativo via addTradeToHistory + eventos." },\n  { version: "Beta 0.759", note: "Beta 0.759 — DVL_PAPER_TRADE_STORE: store central com pendingOrders, openPositions e tradeHistory; histórico máximo 100 trades; persistência cross-reload." },',
    "changelog")

# ── 2. Audit bump 0759 → 0760 ─────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0759_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0760_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.759"',
    'window.DVL_APP_VERSION==="Beta 0.760"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.759' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.760' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.759")===-1) blockers.push("A2: title missing 0.759")',
    'indexOf("0.760")===-1) blockers.push("A2: title missing 0.760")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0759_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0760_AUDIT_MODULE";',
    "audit name bump")

# ── 3. Revert adapter: remove syncPaperStoreFromOrders() call from readOrders() ─
# This call was added in 0.759 step 5. It runs syncPaperStoreFromOrders() on every
# readOrders() invocation. The store syncs passively via event listeners instead.
html = rep(html,
    "function readOrders(){\n  var rows={open:[],pending:[],history:[]};\n  var live=lvPrc();\n  try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}\n\n  // Primary: DVL_PAPER_TRADING_V2_PRO",
    "function readOrders(){\n  var rows={open:[],pending:[],history:[]};\n  var live=lvPrc();\n\n  // Primary: DVL_PAPER_TRADING_V2_PRO",
    "adapter: remove syncPaperStoreFromOrders from readOrders")

# ── 4. Revert adapter: remove store history override from readOrders() ────────
# This override was added in 0.759 step 6. It replaced rows.history with data from
# DVL_PAPER_TRADE_STORE.tradeHistory. Removing it restores the 0.758 behaviour where
# rows.history is built directly from the getAllOrders() for-loop (closed orders).
html = rep(html,
    '          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        try{if(window.DVL_PAPER_TRADE_STORE&&(window.DVL_PAPER_TRADE_STORE.tradeHistory||[]).length>0){rows.history=[];var _th=window.DVL_PAPER_TRADE_STORE.tradeHistory.slice().reverse();for(var _thi=0;_thi<_th.length;_thi++){var _tho=_th[_thi];if(!_tho)continue;var _thsym=String(_tho.symbol||"").toUpperCase();var _thd=_thsym.replace(/USDT$/i,"/USDT")||_thsym;var _thc=_thsym.replace(/USDT$/i,"").toLowerCase();var _thb=_tho.side==="buy";var _the=Number(_tho.entry)||0;var _thx=Number(_tho.exitPrice||_tho.closedPrice||0);var _thrn=Number(_tho.realizedPnl);var _thrc=Number(_tho.realizedPnlPct);rows.history.push({id:_tho.id,symbol:_thd,coin:_thc,side:_thb?"Long":"Short",leverage:(Number(_tho.leverage)||1)+"x",entry:_fp(_the),current:_thx>0?_fp(_thx):"--",pnl:Number.isFinite(_thrn)?_fm(_thrn):"--",pct:Number.isFinite(_thrc)?_ft(_thrc):"--",direction:Number.isFinite(_thrn)?(_thrn>=0?"positive":"negative"):"positive"});}}catch(_){}\n        return rows;\n      }\n    }catch(_){}\n  }',
    '          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }\n        }\n        return rows;\n      }\n    }catch(_){}\n  }',
    "adapter: remove store history override")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
