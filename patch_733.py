#!/usr/bin/env python3
"""patch_733.py — Beta 0.733: Position details panel uses real V2 Pro order data."""
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

print("=== patch_733.py — Beta 0.733 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.732</title>',
    '<title>DVL Binance Live — Beta 0.733</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.732";',
    'const DVL_APP_VERSION = "Beta 0.733";', "version const")

html = rep(html,
    '>BETA 0.732</span>',
    '>BETA 0.733</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.732 — dvl:position-detail-open event; Funding field removed; Gestão rápida moved above grid, open trades only." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.733 — position details panel now shows real V2 Pro order data (entry, qty, TP, SL, PnL, timeline)." },\n  { version: "Beta 0.732", note: "Beta 0.732 — dvl:position-detail-open event; Funding field removed; Gestão rápida moved above grid, open trades only." },',
    "changelog")

# ── 2. Audit bump 0732 → 0733 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0732_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0733_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.732"',
    'window.DVL_APP_VERSION==="Beta 0.733"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.732' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.733' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.732")===-1) blockers.push("A2: title missing 0.732")',
    'indexOf("0.733")===-1) blockers.push("A2: title missing 0.733")', "audit A2")

html = rep(html,
    'var N=102, name="DVL_UI_OVERLAY_PHASE_0732_AUDIT_MODULE";',
    '// A103. Details panel uses buildRealRow for real trade data\n'
    '(function(){ var s=document.getElementById("DVL_POSITION_DETAILS_PANEL_MODULE_0724"); var t=s?(s.textContent||""):""; if(t.indexOf("buildRealRow")===-1) blockers.push("A103: details panel missing buildRealRow"); })();\n'
    '\n'
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0733_AUDIT_MODULE";',
    "audit A103 + N bump")

# ── 3. Adapter primary row: add id field ─────────────────────────────────────────
html = rep(html,
    'var row={symbol:disp,coin:coin,side:buy?"Long":"Short",leverage:(Number(o.leverage)||1)+"x",entry:_fp(ep),current:live>0?_fp(live):"--",pnl:_fm(pv),pct:_ft(pc),direction:pv>=0?"positive":"negative"};',
    'var row={id:o.id,symbol:disp,coin:coin,side:buy?"Long":"Short",leverage:(Number(o.leverage)||1)+"x",entry:_fp(ep),current:live>0?_fp(live):"--",pnl:_fm(pv),pct:_ft(pc),direction:pv>=0?"positive":"negative"};',
    "adapter primary row: add id")

# ── 4. Adapter legacy row: add id field ──────────────────────────────────────────
html = rep(html,
    'var row2={symbol:disp2,coin:coin2,side:buy2?"Long":"Short",leverage:(Number(pos.leverage)||1)+"x",entry:_fp(ep2),current:live>0?_fp(live):"--",pnl:_fm(pv2),pct:_ft(pc2),direction:pv2>=0?"positive":"negative"};',
    'var row2={id:pos.id||"",symbol:disp2,coin:coin2,side:buy2?"Long":"Short",leverage:(Number(pos.leverage)||1)+"x",entry:_fp(ep2),current:live>0?_fp(live):"--",pnl:_fm(pv2),pct:_ft(pc2),direction:pv2>=0?"positive":"negative"};',
    "adapter legacy row: add id")

# ── 5. Overlay renderList(): add data-dvl-order-id to card ───────────────────────
html = rep(html,
    '\'<article class="dvlPosV2Card" data-dvl-symbol="\' + row.symbol + \'" data-dvl-status="\' + state.activeTab + \'">\' +',
    '\'<article class="dvlPosV2Card" data-dvl-symbol="\' + row.symbol + \'" data-dvl-status="\' + state.activeTab + \'" data-dvl-order-id="\' + (row.id||"") + \'">\' +',
    "renderList: add data-dvl-order-id to card")

# ── 6. Details click handler: pass orderId ───────────────────────────────────────
html = rep(html,
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;\n'
    '    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card, card.getAttribute("data-dvl-status") || "open"); return; }',
    '    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;\n'
    '    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card, card.getAttribute("data-dvl-status") || "open", card.getAttribute("data-dvl-order-id") || ""); return; }',
    "click handler: pass orderId")

# ── 7. Details module: add helpers + buildRealRow + real data lookup ──────────────
html = rep(html,
    '  function renderDetails(symbol, sourceCard, status){\n'
    '    status = status || "open";\n'
    '    var row = details[symbol] || details["BTC/USDT"];\n'
    '    var panel = ensurePanel();',

    '  function _lvPrc(){ try{ if(window.ticker&&Number(window.ticker.lastPrice)>0) return Number(window.ticker.lastPrice); }catch(_){} try{ if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){ var _c=window.S.candles[window.S.candles.length-1]; var _p=Number(_c.close||_c.c||0); if(Number.isFinite(_p)&&_p>0) return _p; } }catch(_){} return 0; }\n'
    '  function _fmtTime(ts){ try{ var d=new Date(Number(ts)); return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }catch(_){ return "--:--"; } }\n'
    '  function _fp2(v){ v=Number(v); if(!Number.isFinite(v)||v<=0) return "--"; return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4}); }\n'
    '  function _fm2(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>=0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT"; }\n'
    '  function _ft2(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>=0?"+":(v<0?"-":""); return s+Math.abs(v).toFixed(2)+"%"; }\n'
    '\n'
    '  function buildRealRow(o, status){\n'
    '    var live=_lvPrc(), buy=o.side==="buy", ep=Number(o.entry)||0, qty=Number(o.qty)||0;\n'
    '    var lev=Number(o.leverage)||1, sizUSDT=Number(o.size)||0;\n'
    '    var sym=String(o.symbol||"").toUpperCase(), disp=sym.replace(/USDT$/i,"/USDT")||sym;\n'
    '    var coin=sym.replace(/USDT$/i,"").toLowerCase(), coinUpper=sym.replace(/USDT$/i,"");\n'
    '    var pv=0, pc=0, cur="--", direction="positive";\n'
    '    if(status==="closed"){\n'
    '      var exitP=Number(o.exitPrice||o.closedPrice||0);\n'
    '      pv=Number(o.realizedPnl); pc=Number(o.realizedPnlPct);\n'
    '      cur=exitP>0?_fp2(exitP):"--"; direction=(Number.isFinite(pv)&&pv>=0)?"positive":"negative";\n'
    '    } else if(status==="pending"){\n'
    '      cur="Aguardando";\n'
    '    } else {\n'
    '      pv=live>0&&ep>0?(buy?(live-ep)*qty:(ep-live)*qty):0;\n'
    '      pc=live>0&&ep>0?(buy?((live-ep)/ep)*100:((ep-live)/ep)*100):0;\n'
    '      cur=live>0?_fp2(live):"--"; direction=pv>=0?"positive":"negative";\n'
    '    }\n'
    '    var sizeStr=qty>0?qty.toFixed(qty<1?4:3)+" "+coinUpper:"--";\n'
    '    var marginStr=sizUSDT>0?sizUSDT.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT":"--";\n'
    '    var tl=[];\n'
    '    if(o.createdAt) tl.push([_fmtTime(o.createdAt),"Ordem criada"]);\n'
    '    if(o.armedAt&&status==="pending") tl.push([_fmtTime(o.armedAt),"Aguardando ativação"]);\n'
    '    if(o.armedAt&&status==="open") tl.push([_fmtTime(o.armedAt),"Posição aberta"]);\n'
    '    if(o.closedAt) tl.push([_fmtTime(o.closedAt),"Fechada — "+(o.closeReason==="tp"?"TP":o.closeReason==="sl"?"SL":"Manual")]);\n'
    '    var pnlFmt=Number.isFinite(pv)?_fm2(pv):"--", pctFmt=Number.isFinite(pc)?_ft2(pc):"--";\n'
    '    return {\n'
    '      _real:true, coin:coin, symbol:disp, side:buy?"Long":"Short", leverage:lev+"x", mode:"Demo",\n'
    '      size:sizeStr, margin:marginStr, entry:_fp2(ep), current:cur, average:ep>0?_fp2(ep):"--",\n'
    '      liquidation:"--", tp:Number(o.tp)>0?_fp2(Number(o.tp)):"--", sl:Number(o.sl)>0?_fp2(Number(o.sl)):"--",\n'
    '      fees:"--", pnl:pnlFmt, pct:pctFmt, net:pnlFmt, direction:direction, timeline:tl\n'
    '    };\n'
    '  }\n'
    '\n'
    '  function renderDetails(symbol, sourceCard, status, orderId){\n'
    '    status = status || "open";\n'
    '    var row = null;\n'
    '    if(orderId && window.DVL_PAPER_TRADING_V2_PRO){\n'
    '      try{\n'
    '        var st=window.DVL_PAPER_TRADING_V2_PRO.getState();\n'
    '        if(st&&Array.isArray(st.orders)){\n'
    '          for(var _oi=0;_oi<st.orders.length;_oi++){\n'
    '            if(st.orders[_oi]&&String(st.orders[_oi].id)===String(orderId)){ row=buildRealRow(st.orders[_oi],status); break; }\n'
    '          }\n'
    '        }\n'
    '      }catch(_){}\n'
    '    }\n'
    '    if(!row) row = details[symbol] || details["BTC/USDT"];\n'
    '    var panel = ensurePanel();',
    "details: add helpers + buildRealRow + real data lookup")

# ── 8. Fix sideClass: use row.side instead of row.direction ──────────────────────
html = rep(html,
    '    var sideClass = row.direction === "short" ? "short" : "long";',
    '    var sideClass = (String(row.side).toLowerCase().indexOf("short") !== -1) ? "short" : "long";',
    "sideClass: use row.side")

# ── 9. Dispatch event: also pass orderId ─────────────────────────────────────────
html = rep(html,
    '    try{ document.dispatchEvent(new CustomEvent("dvl:position-detail-open", {bubbles:true, detail:{symbol:symbol, status:status, row:row}})); }catch(_){}',
    '    try{ document.dispatchEvent(new CustomEvent("dvl:position-detail-open", {bubbles:true, detail:{symbol:symbol, status:status, orderId:orderId, row:row}})); }catch(_){}',
    "event: add orderId to detail")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
