#!/usr/bin/env python3
"""patch_729.py — Beta 0.729: Fixed pending lifecycle, smart Limit/Stop classification, closed trade history."""
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

print("=== patch_729.py — Beta 0.729 ===")

# ── 1. Version bumps ─────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.728</title>',
    '<title>DVL Binance Live — Beta 0.729</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.728";',
    'const DVL_APP_VERSION = "Beta 0.729";', "version const")

html = rep(html,
    '>BETA 0.728</span>',
    '>BETA 0.729</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.728 — Fixed Positions data adapter and pending order lifecycle: drafts no longer appear or activate before confirmation, and Limit/Stop triggers now respect orderType." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.729 — fixed pending order lifecycle, smart Limit/Stop classification and closed trade history for Positions." },\n  { version: "Beta 0.728", note: "Beta 0.728 — Fixed Positions data adapter and pending order lifecycle: drafts no longer appear or activate before confirmation, and Limit/Stop triggers now respect orderType." },',
    "changelog")

# ── 2. Audit bump 0728 → 0729 ────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0728_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0729_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.728"',
    'window.DVL_APP_VERSION==="Beta 0.729"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.728' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.729' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.728")===-1) blockers.push("A2: title missing 0.728")',
    'indexOf("0.729")===-1) blockers.push("A2: title missing 0.729")', "audit A2")

# ── 3. Add new audit checks A89-A97 + bump N ─────────────────────────────────────
html = rep(html,
    'var N=88, name="DVL_UI_OVERLAY_PHASE_0728_AUDIT_MODULE";',
    '// A89. classifyPendingOrder present in V2 Pro module\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("classifyPendingOrder")===-1) blockers.push("A89: classifyPendingOrder missing from V2 Pro"); })();\n'
    '// A90. render() no longer filters closed from state\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("state.orders=state.orders.filter(function(o){return o&&o.status!==\'closed\';})") !==-1) blockers.push("A90: render() still deletes closed orders from state"); })();\n'
    '// A91. save() no longer filters out closed orders\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("function save(){try{localStorage.setItem(key(), JSON.stringify(state.orders.filter(function(o){return o&&o.status!==\'closed\';})")!==-1) blockers.push("A91: save() still filtering closed orders"); })();\n'
    '// A92. maybeFill checks drag state\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("function maybeFill")===-1) blockers.push("A92: maybeFill missing"); else if(t.indexOf("if(state.drag||window.__dvlPaperV2ProDragging)return")===-1) blockers.push("A92: maybeFill missing drag check"); })();\n'
    '// A93. closeOpenOrder sets exitPrice and realizedPnl\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("o.exitPrice=closePrice")===-1) blockers.push("A93: closeOpenOrder missing exitPrice"); if(t.indexOf("o.realizedPnl=pv")===-1) blockers.push("A93: closeOpenOrder missing realizedPnl"); })();\n'
    '// A94. validDraft no longer blocks buy above / sell below price\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("Buy Limit: arraste ENTRY")!==-1) blockers.push("A94: validDraft still blocking directional orders"); })();\n'
    '// A95. confirmDraft assigns triggerType and orderLabel\n'
    '(function(){ var s=document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697"); var t=s?(s.textContent||""):""; if(t.indexOf("o.triggerType=cls.triggerType")===-1) blockers.push("A95: confirmDraft missing triggerType"); if(t.indexOf("o.orderLabel=cls.orderLabel")===-1) blockers.push("A95: confirmDraft missing orderLabel"); })();\n'
    '// A96. Adapter reads exitPrice for history\n'
    '(function(){ var s=document.getElementById("DVL_POSITIONS_ADAPTER_MODULE_0728"); var t=s?(s.textContent||""):""; if(t.indexOf("exitPrice")===-1) blockers.push("A96: adapter not reading exitPrice for history"); })();\n'
    '// A97. chart engine intact\n'
    'if(typeof setCandleMode!=="function"&&typeof window.setCandleMode!=="function") blockers.push("A97: setCandleMode missing (chart engine altered)");\n'
    '\n'
    'var N=97, name="DVL_UI_OVERLAY_PHASE_0729_AUDIT_MODULE";',
    "audit new checks A89-A97 + N bump")

# ── 4. V2 Pro: save() — keep closed orders, filter only drafts ───────────────────
html = rep(html,
    "  function save(){try{localStorage.setItem(key(), JSON.stringify(state.orders.filter(function(o){return o&&o.status!=='closed';}).slice(-60)));}catch(_){}}",
    "  function save(){try{localStorage.setItem(key(), JSON.stringify(state.orders.filter(function(o){return o&&o.status!=='draft';}).slice(-80)));}catch(_){}}",
    "save: keep closed, filter drafts")

# ── 5. V2 Pro: load() — load closed orders too, filter only drafts ───────────────
html = rep(html,
    "  function load(){try{var a=JSON.parse(localStorage.getItem(key())||'[]'); state.orders=Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='closed';}):[];}catch(_){state.orders=[];}}",
    "  function load(){try{var a=JSON.parse(localStorage.getItem(key())||'[]'); state.orders=Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='draft';}):[];}catch(_){state.orders=[];}}",
    "load: keep closed, filter drafts")

# ── 6. V2 Pro: add classifyPendingOrder before clearDrafts ───────────────────────
html = rep(html,
    "  function clearDrafts(){state.orders=state.orders.filter(function(o){return o.status!=='draft';});}",
    "  function classifyPendingOrder(side,entry,live){var e=n(entry),lv=n(live),isBuy=side==='buy'; if(isBuy){return e<lv?{triggerType:'limit',orderLabel:'Buy Limit'}:{triggerType:'stop',orderLabel:'Buy Stop'};} return e>lv?{triggerType:'limit',orderLabel:'Sell Limit'}:{triggerType:'stop',orderLabel:'Sell Stop'};}\n"
    "  function clearDrafts(){state.orders=state.orders.filter(function(o){return o.status!=='draft'});}",
    "add classifyPendingOrder")

# ── 7. V2 Pro: validDraft — remove directional blocking ──────────────────────────
html = rep(html,
    "  function validDraft(o){var live=currentPrice(),e=n(o.entry); if(!(live>0&&e>0))return {ok:false,msg:'Aguardando preço'}; if(o.type==='limit'){if(o.side==='buy'&&e>live)return {ok:false,msg:'Buy Limit: arraste ENTRY abaixo do preço'}; if(o.side==='sell'&&e<live)return {ok:false,msg:'Sell Limit: arraste ENTRY acima do preço'};} if(o.type==='stop'){if(o.side==='buy'&&e<live)return {ok:false,msg:'Buy Stop: arraste ENTRY acima do preço'}; if(o.side==='sell'&&e>live)return {ok:false,msg:'Sell Stop: arraste ENTRY abaixo do preço'};} return {ok:true};}",
    "  function validDraft(o){var live=currentPrice(),e=n(o.entry); if(!(live>0&&e>0))return {ok:false,msg:'Aguardando preço'}; return {ok:true};}",
    "validDraft: remove directional checks")

# ── 8. V2 Pro: confirmDraft — classify on confirm ────────────────────────────────
html = rep(html,
    "  function confirmDraft(id){var o=find(id); if(!o||o.status!=='draft')return; var v=validDraft(o); if(!v.ok){toast(v.msg); render(); return;} o.status='pending'; o.selected=true; state.selectedId=o.id; save(); render();}",
    "  function confirmDraft(id){var o=find(id); if(!o||o.status!=='draft')return; var v=validDraft(o); if(!v.ok){toast(v.msg); render(); return;} var live=currentPrice(); var cls=classifyPendingOrder(o.side,o.entry,live); o.status='pending'; o.triggerType=cls.triggerType; o.orderLabel=cls.orderLabel; o.armedAt=Date.now(); o.selected=true; state.selectedId=o.id; save(); render();}",
    "confirmDraft: add classification")

# ── 9. V2 Pro: closeOpenOrder — add exitPrice, realizedPnl, realizedPnlPct ───────
html = rep(html,
    "  function closeOpenOrder(o,reason,price){if(!o||o.status!=='open')return false; var closePrice=n(price,o.entry); o.status='closed'; o.closedReason=reason||'manual'; o.closedAt=Date.now(); o.closedPrice=closePrice; if(state.selectedId===o.id)state.selectedId=null; if(state.edit&&String(state.edit.id)===String(o.id))state.edit=null; try{window.dispatchEvent(new CustomEvent('dvl:paper-v2-close',{detail:{id:o.id,reason:o.closedReason,price:closePrice,pnl:pnlAt(o,closePrice),pct:pctAt(o,closePrice),symbol:o.symbol,side:o.side}}));}catch(_){} save(); toast(reason==='tp'?'TP ativado':reason==='sl'?'SL ativado':'Trade fechado'); return true;}",
    "  function closeOpenOrder(o,reason,price){if(!o||o.status!=='open')return false; var closePrice=n(price,o.entry); var pv=pnlAt(o,closePrice); var pc=pctAt(o,closePrice); o.status='closed'; o.closeReason=reason||'manual'; o.closedReason=reason||'manual'; o.closedAt=Date.now(); o.closedPrice=closePrice; o.exitPrice=closePrice; o.realizedPnl=pv; o.realizedPnlPct=pc; if(state.selectedId===o.id)state.selectedId=null; if(state.edit&&String(state.edit.id)===String(o.id))state.edit=null; try{window.dispatchEvent(new CustomEvent('dvl:paper-v2-close',{detail:{id:o.id,reason:reason||'manual',price:closePrice,pnl:pv,pct:pc,symbol:o.symbol,side:o.side}}));}catch(_){} save(); toast(reason==='tp'?'TP ativado':reason==='sl'?'SL ativado':'Trade fechado'); return true;}",
    "closeOpenOrder: add exitPrice + realizedPnl")

# ── 10. V2 Pro: closeOrCancelPaperOrder — use closeOpenOrder for open orders ─────
html = rep(html,
    "  function closeOrCancelPaperOrder(id){var idx=state.orders.findIndex(function(p){return String(p.id)===String(id);}); if(idx<0)return; state.orders.splice(idx,1); if(state.selectedId===id)state.selectedId=null; state.drag=null; state.edit=null; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); save(); render();}",
    "  function closeOrCancelPaperOrder(id){var o=find(id); if(!o)return; if(o.status==='open'){closeOpenOrder(o,'manual',currentPrice()||o.entry); if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); render(); return;} var idx=state.orders.findIndex(function(p){return String(p.id)===String(id);}); if(idx<0)return; state.orders.splice(idx,1); if(state.selectedId===id)state.selectedId=null; state.drag=null; state.edit=null; if(window.DVL_RELEASE_PAPER_LOCK)window.DVL_RELEASE_PAPER_LOCK(); save(); render();}",
    "closeOrCancelPaperOrder: proper close for open orders")

# ── 11. V2 Pro: maybeFill — use stored triggerType + block during drag ────────────
html = rep(html,
    "  function maybeFill(o){if(!o||o.status!=='pending')return; var live=currentPrice(); if(!(live>0))return; var e=n(o.entry); var hit=false; if(o.type==='limit') hit=(o.side==='buy'? live<=e : live>=e); else if(o.type==='stop') hit=(o.side==='buy'? live>=e : live<=e); if(hit){o.status='open'; o.selected=true; state.selectedId=o.id; save();}}",
    "  function maybeFill(o){if(!o||o.status!=='pending')return; if(state.drag||window.__dvlPaperV2ProDragging)return; var live=currentPrice(); if(!(live>0))return; var e=n(o.entry); var trig=o.triggerType||o.type||'limit'; var hit=false; if(trig==='limit') hit=(o.side==='buy'? live<=e : live>=e); else if(trig==='stop') hit=(o.side==='buy'? live>=e : live<=e); if(hit){o.status='open'; o.activatedAt=Date.now(); o.activatedPrice=live; o.selected=true; state.selectedId=o.id; save();}}",
    "maybeFill: stored triggerType + drag guard")

# ── 12. V2 Pro: render() — don't delete closed orders from state ─────────────────
html = rep(html,
    "  function render(){if(!ENABLED)return; var layer=ensureLayer(); if(!layer)return; cleanupLegacy(); layer.innerHTML=''; state.orders=state.orders.filter(function(o){return o&&o.status!=='closed';}); if(state.edit&&!find(state.edit.id))state.edit=null; state.orders.forEach(function(o){renderOrder(layer,o);});}",
    "  function render(){if(!ENABLED)return; var layer=ensureLayer(); if(!layer)return; cleanupLegacy(); layer.innerHTML=''; if(state.edit&&!find(state.edit.id))state.edit=null; state.orders.forEach(function(o){renderOrder(layer,o);});}",
    "render: stop deleting closed orders from state")

# ── 13. V2 Pro: labelText — show orderLabel for pending ──────────────────────────
html = rep(html,
    "if(o.status==='draft'||o.status==='pending') return (o.type==='stop'?'STOP':'LIMIT');",
    "if(o.status==='draft'||o.status==='pending') return o.orderLabel||(o.type==='stop'?'STOP':'LIMIT');",
    "labelText: use orderLabel for pending")

# ── 14. V2 Pro: startPnlRefresh — include pending in check ───────────────────────
html = rep(html,
    "window.__DVL_PAPER_V2_PRO_0697_PNL_INTERVAL__=setInterval(function(){try{if(!state.drag&&state.orders.some(function(o){return o&&o.status==='open';}))render();}catch(_){}},900);",
    "window.__DVL_PAPER_V2_PRO_0697_PNL_INTERVAL__=setInterval(function(){try{if(!state.drag&&!window.__dvlPaperV2ProDragging&&state.orders.some(function(o){return o&&(o.status==='open'||o.status==='pending');}))render();}catch(_){}},900);",
    "startPnlRefresh: include pending orders")

# ── 15. Adapter: pending orderLabel (Buy Limit/Stop vs generic Limite) ────────────
html = rep(html,
    '          else if(o.status==="pending"){ row.current="Aguardando"; row.pnl="Pendente"; row.pct=(o.type||"Limite"); row.direction="positive"; rows.pending.push(row); }',
    '          else if(o.status==="pending"){ row.current="Aguardando"; row.pnl="Pendente"; row.pct=o.orderLabel||(o.type||"Limite"); row.direction="positive"; rows.pending.push(row); }',
    "adapter: pending shows orderLabel")

# ── 16. Adapter: closed order — show exit price and realized PnL ─────────────────
html = rep(html,
    '          else if(o.status==="closed"){ rows.history.push(row); }',
    '          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }',
    "adapter: closed shows exit price + realized PnL")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
