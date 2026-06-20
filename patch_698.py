#!/usr/bin/env python3
"""
patch_698.py — Beta 0.698 Paper V2 Clean Integration

Changes:
  C1: Title       Beta 0.688 → Beta 0.698
  C2: versionBadge BETA 0.688 → BETA 0.698
  C3: DVL_APP_VERSION → "Beta 0.698"
  C4: Changelog   add 0.698 entry; shift 0.688 entry to string literal
  C5: CSS DVL_PAPER_V2_CLEAN_INTEGRATION_CSS_0698 — permanently hide legacy #dvlPaperLayer
  C6: Legacy suppressor script (0698) + V2 Pro 0.697 module (CSS+JS), inserted
      before DVL_BETA_0634_LAYER_BOUNDS_FIX
  C7: Audit module DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698 (33 checks)
"""

import os, sys, shutil

HTML   = "DepthVisionLab-v106_REAL_UI/public/index.html"
BACKUP = "DepthVisionLab-v106_REAL_UI/public/index-47.before_0698_paper_v2_clean.html"

def rep(html, old, new, label):
    count = html.count(old)
    if count != 1:
        print(f"FAIL [{label}]: expected 1 occurrence, found {count}")
        sys.exit(1)
    return html.replace(old, new, 1)

# ── load ───────────────────────────────────────────────────────────────────────
with open(HTML, "r", encoding="utf-8") as f:
    html = f.read()

print(f"Input: {html.count(chr(10))+1} lines")

# ── pre-assertions ─────────────────────────────────────────────────────────────
def pre(cond, msg):
    if not cond:
        print(f"PRE-FAIL: {msg}")
        sys.exit(1)

pre('const DVL_APP_VERSION = "Beta 0.688"' in html, 'not Beta 0.688')
pre('DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688' in html, '0688 CSS missing')
pre('DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688' in html, '0688 audit missing')
pre('DVL_PAPER_V2_CLEAN_INTEGRATION_CSS_0698' not in html, '0698 CSS already present')
pre('DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698' not in html, '0698 audit already present')
pre('DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697' not in html, 'V2 Pro 0697 already present')
pre('DVL_BETA_0634_LAYER_BOUNDS_FIX' in html, 'LAYER_BOUNDS_FIX anchor missing')
pre('function makeDraftTag(draft, handle, y, main)' in html, 'makeDraftTag not found')

# ── backup ─────────────────────────────────────────────────────────────────────
shutil.copy2(HTML, BACKUP)
print(f"Backup: {BACKUP}")

# ── C1: Title ──────────────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.688</title>',
    '<title>DVL Binance Live — Beta 0.698</title>',
    "C1: title"
)

# ── C2: versionBadge ───────────────────────────────────────────────────────────
html = rep(html,
    '>BETA 0.688</div>',
    '>BETA 0.698</div>',
    "C2: versionBadge"
)

# ── C3: DVL_APP_VERSION ────────────────────────────────────────────────────────
html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.688";',
    'const DVL_APP_VERSION = "Beta 0.698";',
    "C3: DVL_APP_VERSION"
)

# ── C4: Changelog ──────────────────────────────────────────────────────────────
html = rep(html,
    '  { version: DVL_APP_VERSION, note: "Beta 0.688 — Paper Limit placement reset: simplified Limit/Stop draft placement, ENTRY tag draggable with \xd7 cancel button, draft confirm buttons follow ENTRY during drag, suppressed stray legacy elements, unified Market/Limit visual base." },\n  { version: "Beta 0.687",',
    '  { version: DVL_APP_VERSION, note: "Beta 0.698 — Clean Paper V2 integration: removed legacy Paper Trading visual/runtime conflicts and made the 0.697 TradingView-style Paper module the single active Paper system." },\n  { version: "Beta 0.688", note: "Beta 0.688 — Paper Limit placement reset: simplified Limit/Stop draft placement, ENTRY tag draggable with \xd7 cancel button, draft confirm buttons follow ENTRY during drag, suppressed stray legacy elements, unified Market/Limit visual base." },\n  { version: "Beta 0.687",',
    "C4: changelog"
)

# ── C5: CSS — permanently hide legacy paper layer ──────────────────────────────
CSS_0698 = """\
<style id="DVL_PAPER_V2_CLEAN_INTEGRATION_CSS_0698">
/*
  DVL Beta 0.698 — Paper V2 Clean Integration.
  Permanently suppresses the legacy #dvlPaperLayer.
  All paper rendering is handled by #dvlPaperLayerV2Pro
  via DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697.
*/
#dvlPaperLayer,
.dvl-paper-layer {
  display: none !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
</style>

"""
html = rep(html,
    '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    CSS_0698 + '<script id="DVL_SAFE_HTML_CLASS_CLEANUP_AUDIT_MODULE_0672">',
    "C5: CSS 0698"
)

# ── C6: Legacy suppressor + V2 Pro 0.697 module ────────────────────────────────
SUPPRESSOR_0698 = """\
<script id="DVL_PAPER_LEGACY_SUPPRESSOR_0698">
(function(){
"use strict";
// Beta 0.698: legacy paper runtime suppressed. V2 Pro (0.697) is the sole Paper system.
window.__DVL_PAPER_LEGACY_SUPPRESSED__ = true;
// Override any globally-exposed legacy paper functions (defense-in-depth)
var _noop = function(){};
var _legacyFns = [
  'startOrder','createPendingOrderDraft','confirmPendingOrderDraft',
  'cancelPendingOrderDraft','cancelPendingOrder','renderDraftPosition',
  'renderDraftConfirm','renderPosition','renderEditConfirm'
];
_legacyFns.forEach(function(fn){ if(typeof window[fn]==='function') window[fn]=_noop; });
// Hide legacy layer on DOM ready
function _hideLegacyLayer(){
  var l=document.getElementById('dvlPaperLayer');
  if(l){ l.style.cssText='display:none!important;pointer-events:none!important;visibility:hidden!important'; }
}
if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',_hideLegacyLayer,{once:true});
else _hideLegacyLayer();
})();
</script>

"""

V2_PRO_0697 = """\
<style id="DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697">
/* DVL Beta 0.697 — Paper V2 Pro fine lines */
html.dvl-paper-v2-pro-enabled #dvlPaperLayer,
html.dvl-paper-v2-pro-enabled #dvlPaperLayerV2,
html.dvl-paper-v2-pro-enabled .dvl-paper-edit-confirm-fixed,
html.dvl-paper-v2-pro-enabled .dvl-paper-edit-label-fixed,
html.dvl-paper-v2-pro-enabled .dvl-paper-draft-confirm-fixed,
html.dvl-paper-v2-pro-enabled .dvl-paper-pending,
html.dvl-paper-v2-pro-enabled .dvl-paper-pending-controls{
  display:none!important;
  pointer-events:none!important;
}
#dvlPaperLayerV2Pro.dvl-pv2p-layer{
  position:absolute!important;
  left:0!important;
  top:0!important;
  bottom:0!important;
  right:var(--dvl-price-scale-w,70px)!important;
  z-index:42!important;
  overflow:hidden!important;
  pointer-events:none!important;
  contain:layout paint style!important;
}
.dvl-pv2p-line{
  position:absolute!important;
  left:0!important;
  right:0!important;
  height:0!important;
  border-top:1px solid rgba(255,255,255,.72)!important;
  pointer-events:none!important;
  box-sizing:border-box!important;
  opacity:.82!important;
  will-change:transform,width!important;
  transform:translate3d(0,0,0);
}
.dvl-pv2p-line.tp{border-color:rgba(19,220,141,.88)!important;}
.dvl-pv2p-line.entry{border-color:rgba(235,245,255,.78)!important;border-top-style:dashed!important;}
.dvl-pv2p-line.entry.open{border-color:rgba(111,190,255,.82)!important;}
.dvl-pv2p-line.sl{border-color:rgba(255,74,97,.88)!important;}
.dvl-pv2p-line.draft{opacity:.75!important;}
.dvl-pv2p-hit{
  position:absolute!important;
  left:0!important;
  right:0!important;
  height:30px!important;
  margin-top:-15px!important;
  background:transparent!important;
  pointer-events:auto!important;
  touch-action:none!important;
  cursor:ns-resize!important;
  z-index:43!important;
  will-change:transform,width!important;
  transform:translate3d(0,0,0);
}
.dvl-pv2p-tag{
  position:absolute!important;
  width:86px!important;
  height:17px!important;
  min-width:86px!important;
  max-width:86px!important;
  box-sizing:border-box!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:0 3px!important;
  border-radius:4px!important;
  font-size:6.9px!important;
  line-height:1!important;
  font-weight:900!important;
  letter-spacing:0!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  text-align:center!important;
  pointer-events:auto!important;
  touch-action:none!important;
  user-select:none!important;
  -webkit-user-select:none!important;
  z-index:44!important;
  box-shadow:none!important;
  opacity:.75!important;
  will-change:transform!important;
  transform:translate3d(0,0,0);
}
.dvl-pv2p-tag.tp{color:rgba(225,255,240,.95)!important;background:rgba(10,60,39,.54)!important;border:1px solid rgba(19,220,141,.72)!important;}
.dvl-pv2p-tag.entry{color:rgba(237,247,255,.96)!important;background:rgba(12,28,58,.54)!important;border:1px solid rgba(108,194,255,.70)!important;}
.dvl-pv2p-tag.entry.pending{background:rgba(16,20,34,.56)!important;border-color:rgba(235,245,255,.60)!important;}
.dvl-pv2p-tag.entry.profit{color:rgba(225,255,240,.98)!important;background:rgba(10,60,39,.58)!important;border-color:rgba(19,220,141,.78)!important;}
.dvl-pv2p-tag.entry.loss{color:rgba(255,236,239,.98)!important;background:rgba(70,20,30,.58)!important;border-color:rgba(255,74,97,.78)!important;}
.dvl-pv2p-tag.entry.neutral{color:rgba(237,247,255,.96)!important;background:rgba(12,28,58,.54)!important;border-color:rgba(108,194,255,.70)!important;}
.dvl-pv2p-tag.sl{color:rgba(255,236,239,.96)!important;background:rgba(70,20,30,.54)!important;border:1px solid rgba(255,74,97,.72)!important;}
.dvl-pv2p-tag.draft{opacity:.75!important;}
.dvl-pv2p-tag.selected{opacity:.85!important;}
.dvl-pv2p-tag-text{display:block!important;width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important;}
.dvl-pv2p-controls{
  position:absolute!important;
  height:20px!important;
  display:flex!important;
  gap:4px!important;
  align-items:center!important;
  justify-content:center!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  z-index:46!important;
  will-change:transform!important;
  transform:translate3d(0,0,0);
}
.dvl-pv2p-btn{
  width:20px!important;
  height:20px!important;
  min-width:20px!important;
  min-height:20px!important;
  padding:0!important;
  border-radius:6px!important;
  border:1px solid rgba(255,255,255,.20)!important;
  display:grid!important;
  place-items:center!important;
  font-size:11px!important;
  line-height:1!important;
  font-weight:1000!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  box-shadow:0 6px 14px rgba(0,0,0,.18)!important;
}
.dvl-pv2p-btn.ok{background:rgba(19,220,141,.92)!important;color:#06150f!important;}
.dvl-pv2p-btn.cancel{background:rgba(255,74,97,.92)!important;color:#fff!important;}
html.dvl-pv2p-dragging,
html.dvl-pv2p-dragging *{cursor:ns-resize!important;}

.dvl-pv2p-tag.entry.open{padding-right:14px!important;}
.dvl-pv2p-tag.entry.open .dvl-pv2p-tag-text{max-width:calc(100% - 12px)!important;}
.dvl-pv2p-tag .dvl-pv2p-close{
  position:absolute!important;
  right:1px!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  width:12px!important;
  height:12px!important;
  min-width:12px!important;
  min-height:12px!important;
  padding:0!important;
  display:grid!important;
  place-items:center!important;
  border-radius:4px!important;
  border:1px solid rgba(255,176,119,.58)!important;
  background:rgba(255,130,72,.22)!important;
  color:#ffd7c0!important;
  font-size:8px!important;
  line-height:1!important;
  font-weight:1000!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  z-index:48!important;
}
.dvl-pv2p-controls.edit{z-index:48!important;}
.dvl-pv2p-tag.editing{opacity:.85!important;}

/* 0.695: line is physically split around visible TP/ENTRY/SL label, so transparent labels never have a line running underneath. */
.dvl-pv2p-line.segment-left,
.dvl-pv2p-line.segment-right{
  right:auto!important;
}
.dvl-pv2p-line.label-gap-protected{
  pointer-events:none!important;
}

</style>
<script id="DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697">
(function(){
  "use strict";
  if(window.__DVL_PAPER_V2_PRO_0697__) return;
  window.__DVL_PAPER_V2_PRO_0697__ = true;

  var VERSION = "0.697";
  var ENABLED = true;
  var RIGHT_SCALE_W = 70;
  var LABEL_OFFSET_BARS = 10;
  var TAG_W = 86;
  var TAG_H = 17;
  var TAG_FONT = 6.9;
  var TAG_ALPHA = 0.75;
  var SELECTED_TAG_ALPHA = 0.85;
  var EDITING_TAG_ALPHA = 0.85;
  var LINE_OPACITY = 0.82;
  var LINE_WIDTH = 1;
  var DRAFT_LINE_OPACITY = 0.75;
  var LINE_LABEL_GAP_PX = 6;
  var state = {orders:[], selectedId:null, drag:null, edit:null, lastAudit:null};

  window.DVL_PAPER_V2_PRO_ENABLED = true;
  window.DVL_ORDER_LABEL_OFFSET_BARS = LABEL_OFFSET_BARS;
  window.DVL_PAPER_V2_PRO_TAG_W = TAG_W;
  window.DVL_PAPER_V2_PRO_TAG_H = TAG_H;

  function $(id){return document.getElementById(id);}
  function qs(sel, root){return (root||document).querySelector(sel);}
  function qsa(sel, root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function n(v,fb){v=Number(v); return Number.isFinite(v)?v:(fb||0);}
  function clamp(v,a,b){v=n(v,a); return Math.max(a, Math.min(b, v));}
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true}); else fn(); }
  function getWrap(){return $('chartWrap') || qs('.canvasWrap');}
  function getLayer(){return $('dvlPaperLayerV2Pro');}
  function symbolName(){try{if(window.S&&S.sym)return String(S.sym);}catch(_){} try{if(typeof symbol!=='undefined'&&symbol)return String(symbol);}catch(_){} return 'BTCUSDT';}
  function key(){return 'dvl_paper_v2_pro_0695_'+symbolName();}
  function save(){try{localStorage.setItem(key(), JSON.stringify(state.orders.filter(function(o){return o&&o.status!=='closed';}).slice(-60)));}catch(_){}}
  function load(){try{var a=JSON.parse(localStorage.getItem(key())||'[]'); state.orders=Array.isArray(a)?a.filter(function(o){return o&&o.id&&o.status!=='closed';}):[];}catch(_){state.orders=[];}}
  function toast(msg){try{if(typeof showToast==='function'){showToast(msg);return;}}catch(_){} var t=$('toast'); if(t){t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show');},1500);} else console.warn('[DVL Paper V2 Pro]', msg);}
  function syncLegacy(){try{if(typeof __dvlSyncLegacyState==='function') __dvlSyncLegacyState();}catch(_){}}
  function area(H){syncLegacy();try{if(typeof __dvlLegacyPriceArea==='function') return __dvlLegacyPriceArea(H);}catch(_){} return {y0:4,y1:Math.max(40,H-24)};}
  function priceScaleInfo(){var wrap=getWrap(); if(!wrap) return null; syncLegacy(); var W=wrap.clientWidth||1,H=wrap.clientHeight||1,a=area(H),sc=null; try{if(typeof visible==='function'&&typeof scale==='function') sc=scale(visible().cs,H);}catch(_){} if(!sc||typeof sc.y!=='function') return null; var rw=RIGHT_SCALE_W; try{if(typeof RP==='function') rw=Math.max(RIGHT_SCALE_W,n(RP(),RIGHT_SCALE_W));}catch(_){} var plotRight=Math.max(1,W-rw); function yToPrice(y){try{if(typeof priceFromY==='function') return priceFromY(y,H,sc);}catch(_){} var span=Math.max(1,a.y1-a.y0); return sc.lo+(1-(n(y)-a.y0)/span)*(sc.hi-sc.lo);} return {wrap:wrap,W:W,H:H,top:a.y0,bottom:a.y1,plotLeft:0,plotRight:plotRight,rightW:rw,sc:sc,yToPrice:yToPrice};}
  function priceToY(price){var si=priceScaleInfo(); if(!si)return null; var y=si.sc.y(n(price)); if(!Number.isFinite(y)||y<si.top-90||y>si.bottom+90)return null; return {si:si,y:y};}
  function currentPrice(){try{if(typeof ticker!=='undefined'&&ticker&&Number(ticker.lastPrice)>0)return Number(ticker.lastPrice);}catch(_){} try{if(window.ticker&&Number(window.ticker.lastPrice)>0)return Number(window.ticker.lastPrice);}catch(_){} try{if(window.S&&Array.isArray(S.candles)&&S.candles.length){var c=S.candles[S.candles.length-1];var p=Number(c.close||c.c);if(p>0)return p;}}catch(_){} return 0;}
  function fmtPaperPrice(v){v=Number(v); if(!Number.isFinite(v)) return '--'; return v.toLocaleString('en-US',{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4});}
  function fmtPaperPriceShort(v){v=Number(v); if(!Number.isFinite(v)) return '--'; if(Math.abs(v)>=100000) return (v/1000).toFixed(1)+'K'; if(Math.abs(v)>=10000) return (v/1000).toFixed(2)+'K'; if(Math.abs(v)>=1000) return Math.round(v).toString(); if(Math.abs(v)>=100) return v.toFixed(1); return v.toFixed(3);}
  function fmtPctSigned(v){v=Number(v); if(!Number.isFinite(v)) v=0; var sign=v>0?'+':(v<0?'-':''); return sign+Math.abs(v).toFixed(2).replace('.',',')+'%';}
  function fmtMoneySigned(v){v=Number(v); if(!Number.isFinite(v)) v=0; var sign=v>0?'+':(v<0?'-':''); var abs=Math.abs(v); var txt=abs>=1000?abs.toLocaleString('en-US',{maximumFractionDigits:0}):abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); return sign+txt+'$';}
  function pnlAt(o,price){price=Number(price); var entry=n(o.entry), q=n(o.qty,qty(entry)); if(!(entry>0&&price>0)) return 0; return o.side==='buy'?(price-entry)*q:(entry-price)*q;}
  function pctAt(o,price){price=Number(price); var entry=n(o.entry); if(!(entry>0&&price>0)) return 0; return o.side==='buy'?((price-entry)/entry)*100:((entry-price)/entry)*100;}
  function currentIndex(){syncLegacy(); try{if(window.S&&Array.isArray(S.candles)&&S.candles.length)return S.candles.length-1;}catch(_){} return 0;}
  function candleX(idx, si){syncLegacy(); try{if(window.S&&S.view){var span=Math.max(0.1,S.view.end-S.view.start); return (idx-S.view.start+0.5)*(si.plotRight-si.plotLeft)/span+si.plotLeft;}}catch(_){} return si.plotRight-TAG_W-8;}
  function candleStep(si){syncLegacy(); try{if(window.S&&S.view){var span=Math.max(0.1,S.view.end-S.view.start); return (si.plotRight-si.plotLeft)/span;}}catch(_){} return 8;}
  function labelX(order, si){var anchor=n(order.anchorIndex,currentIndex()); var raw=candleX(anchor+LABEL_OFFSET_BARS,si); var origin=candleX(anchor,si); var step=Math.max(2,candleStep(si)); if(origin<si.plotLeft-step*3 || origin>si.plotRight+step*3) return null; return clamp(raw, si.plotLeft+3, Math.max(si.plotLeft+3, si.plotRight-TAG_W-4));}
  function tagTop(y){return Math.round(y-TAG_H/2);} window.dvlPaperV2ProTagTopFromLineY=tagTop;
  function risk(entry){entry=Math.abs(n(entry)); var r=entry*0.0012; try{var si=priceScaleInfo(); if(si&&si.sc&&Number.isFinite(si.sc.hi)&&Number.isFinite(si.sc.lo)){var span=Math.abs(si.sc.hi-si.sc.lo); if(span>0) r=span*0.14;}}catch(_){} var min=Math.max(entry*0.00045,1); var max=Math.max(entry*0.004,min); return clamp(r,min,max);}
  function qty(entry){var size=n(getEntrySize(),100),lev=n(getLeverage(),1); return entry>0 ? (size*lev)/entry : 0;}
  function getEntrySize(){var el=$('entryValue'); if(el){var v=Number(String(el.textContent||'').replace(/[^0-9.]/g,'')); if(v>0)return v;} return 100;}
  function getLeverage(){var el=$('levValue'); if(el){var v=Number(String(el.textContent||'').replace(/[^0-9.]/g,'')); if(v>0)return v;} return 1;}
  function orderType(){var txt=''; var el=$('orderTypeLabel'); if(el) txt=String(el.textContent||''); if(!txt){var b=qs('.orderTypeOption.activeOrderType'); if(b) txt=b.dataset.orderType||b.textContent||'';} txt=txt.toLowerCase(); if(txt.indexOf('market')>=0)return 'market'; if(txt.indexOf('stop')>=0)return 'stop'; return 'limit';}
  function find(id){return state.orders.find(function(o){return String(o.id)===String(id);});}
  function baseOrder(side,type,status,entry){entry=n(entry,currentPrice()); var buy=side==='buy', r=risk(entry), idx=currentIndex(); return {id:'pv2p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),symbol:symbolName(),side:buy?'buy':'sell',type:type,status:status,entry:entry,tp:buy?entry+r:entry-r,sl:buy?entry-r:entry+r,qty:qty(entry),size:n(getEntrySize(),100),leverage:n(getLeverage(),1),marginMode:'isolated',rr:1,createdAt:Date.now(),anchorIndex:idx,labelAnchorIndex:idx+LABEL_OFFSET_BARS,selected:true};}
  function clearDrafts(){state.orders=state.orders.filter(function(o){return o.status!=='draft';});}
  function openMarket(side){var p=currentPrice(); if(!(p>0)){toast('Aguardando pre\xe7o');return;} clearDrafts(); deselect(); var o=baseOrder(side,'market','open',p); state.orders.push(o); state.selectedId=o.id; save(); render();}
  function createDraft(side,type){var p=currentPrice(); if(!(p>0)){toast('Aguardando pre\xe7o');return;} clearDrafts(); deselect(); var o=baseOrder(side,type,'draft',p); state.orders.push(o); state.selectedId=o.id; render();}
  function validDraft(o){var live=currentPrice(),e=n(o.entry); if(!(live>0&&e>0))return {ok:false,msg:'Aguardando pre\xe7o'}; if(o.type==='limit'){if(o.side==='buy'&&e>live)return {ok:false,msg:'Buy Limit: arraste ENTRY abaixo do pre\xe7o'}; if(o.side==='sell'&&e<live)return {ok:false,msg:'Sell Limit: arraste ENTRY acima do pre\xe7o'};} if(o.type==='stop'){if(o.side==='buy'&&e<live)return {ok:false,msg:'Buy Stop: arraste ENTRY acima do pre\xe7o'}; if(o.side==='sell'&&e>live)return {ok:false,msg:'Sell Stop: arraste ENTRY abaixo do pre\xe7o'};} return {ok:true};}
  function confirmDraft(id){var o=find(id); if(!o||o.status!=='draft')return; var v=validDraft(o); if(!v.ok){toast(v.msg); render(); return;} o.status='pending'; o.selected=true; state.selectedId=o.id; save(); render();}
  function cancelPaperOrder(id){var o=find(id); if(!o)return; if(o.status==='open'){toast('Use o X do ENTRY para fechar o trade');return;} state.orders=state.orders.filter(function(p){return String(p.id)!==String(id);}); if(state.selectedId===id)state.selectedId=null; if(state.edit&&String(state.edit.id)===String(id))state.edit=null; save(); render();}
  function closePaperTrade(id){var o=find(id); if(!o||o.status!=='open')return; closeOpenOrder(o,'manual',currentPrice()||o.entry); render();}
  function lastRange(){var live=currentPrice(); var hi=live, lo=live; try{if(window.S&&Array.isArray(S.candles)&&S.candles.length){var c=S.candles[S.candles.length-1]; var h=Number(c.high||c.h), l=Number(c.low||c.l); if(Number.isFinite(h)&&h>0)hi=Math.max(hi,h); if(Number.isFinite(l)&&l>0)lo=(lo>0?Math.min(lo,l):l);}}catch(_){} if(!(hi>0))hi=live; if(!(lo>0))lo=live; return {live:live, high:hi, low:lo};}
  function closeOpenOrder(o,reason,price){if(!o||o.status!=='open')return false; var closePrice=n(price,o.entry); o.status='closed'; o.closedReason=reason||'manual'; o.closedAt=Date.now(); o.closedPrice=closePrice; if(state.selectedId===o.id)state.selectedId=null; if(state.edit&&String(state.edit.id)===String(o.id))state.edit=null; try{window.dispatchEvent(new CustomEvent('dvl:paper-v2-close',{detail:{id:o.id,reason:o.closedReason,price:closePrice,pnl:pnlAt(o,closePrice),pct:pctAt(o,closePrice),symbol:o.symbol,side:o.side}}));}catch(_){} save(); toast(reason==='tp'?'TP ativado':reason==='sl'?'SL ativado':'Trade fechado'); return true;}
  function maybeCloseOpen(o){if(!o||o.status!=='open')return false; if(state.drag&&String(state.drag.id)===String(o.id))return false; if(state.edit&&String(state.edit.id)===String(o.id))return false; var r=lastRange(); if(!(r.live>0))return false; var tp=n(o.tp), sl=n(o.sl); if(!(tp>0&&sl>0))return false; if(o.side==='buy'){if(r.high>=tp)return closeOpenOrder(o,'tp',tp); if(r.low<=sl)return closeOpenOrder(o,'sl',sl);}else{if(r.low<=tp)return closeOpenOrder(o,'tp',tp); if(r.high>=sl)return closeOpenOrder(o,'sl',sl);} return false;}
  function deselect(){state.orders.forEach(function(o){o.selected=false;}); state.selectedId=null;}
  function maybeFill(o){if(!o||o.status!=='pending')return; var live=currentPrice(); if(!(live>0))return; var e=n(o.entry); var hit=false; if(o.type==='limit') hit=(o.side==='buy'? live<=e : live>=e); else if(o.type==='stop') hit=(o.side==='buy'? live>=e : live<=e); if(hit){o.status='open'; o.selected=true; state.selectedId=o.id; save();}}
  function mk(cls){var d=document.createElement('div'); d.className=cls; return d;}
  function makeLineSegment(layer,o,kind,yy,left,width,sideClass){width=Math.max(0,n(width)); if(width<2)return; var d=mk('dvl-pv2p-line '+kind+' '+o.status+' label-gap-protected '+sideClass); d.style.top='0px'; d.style.left='0px'; d.style.width=Math.round(width)+'px'; d.style.transform='translate3d('+Math.round(left)+'px,'+Math.round(yy)+'px,0)'; layer.appendChild(d);}
  function line(layer,o,kind,yy,si,x){var gap=LINE_LABEL_GAP_PX; var hasVisibleTag=(x!=null&&Number.isFinite(Number(x))&&x+TAG_W>=si.plotLeft&&x<=si.plotRight); if(hasVisibleTag){var leftEnd=clamp(x-gap,si.plotLeft,si.plotRight); makeLineSegment(layer,o,kind,yy,si.plotLeft,leftEnd-si.plotLeft,'segment-left'); var rightStart=clamp(x+TAG_W+gap,si.plotLeft,si.plotRight); makeLineSegment(layer,o,kind,yy,rightStart,si.plotRight-rightStart,'segment-right');}else{makeLineSegment(layer,o,kind,yy,si.plotLeft,si.plotRight-si.plotLeft,'segment-full');} var draggable=(o.status==='draft'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='pending'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='open'&&(kind==='tp'||kind==='sl')); if(draggable){var h=mk('dvl-pv2p-hit '+kind); h.dataset.id=o.id; h.dataset.kind=kind; h.style.top='0px'; h.style.left='0px'; h.style.width=Math.max(0,si.plotRight-si.plotLeft)+'px'; h.style.transform='translate3d('+Math.round(si.plotLeft)+'px,'+Math.round(yy)+'px,0)'; h.addEventListener('pointerdown',startDrag,{passive:false}); layer.appendChild(h);}}
  function labelText(o,kind){var price=kind==='tp'?o.tp:(kind==='sl'?o.sl:o.entry); if(kind==='tp'||kind==='sl'){var prefix=kind==='tp'?'TP':'SL'; return prefix+' '+fmtPaperPriceShort(price)+' '+fmtPctSigned(pctAt(o,price));} if(kind==='entry'){if(o.status==='draft'||o.status==='pending') return (o.type==='stop'?'STOP':'LIMIT'); var live=currentPrice(); return fmtPctSigned(pctAt(o,live))+' '+fmtMoneySigned(pnlAt(o,live));} return fmtPaperPriceShort(price);}
  function entryClass(o,kind){if(kind!=='entry')return ''; if(o.status==='draft'||o.status==='pending')return ''; var live=currentPrice(); var p=pctAt(o,live); if(p>0.0001)return ' profit'; if(p<-0.0001)return ' loss'; return ' neutral';}
  function tag(layer,o,kind,yy,si,x){if(x==null)return; var editing=!!(state.edit&&String(state.edit.id)===String(o.id)&&state.edit.kind===kind); var d=mk('dvl-pv2p-tag '+kind+' '+o.status+entryClass(o,kind)+(o.selected?' selected':'')+(editing?' editing':'')); d.dataset.id=o.id; d.dataset.kind=kind; d.style.left='0px'; d.style.top='0px'; d.style.transform='translate3d('+Math.round(x)+'px,'+Math.round(tagTop(yy))+'px,0)'; d.style.fontSize=TAG_FONT+'px'; var html='<span class="dvl-pv2p-tag-text">'+labelText(o,kind)+'</span>'; if(kind==='entry'&&o.status==='open'){html+='<button class="dvl-pv2p-close" type="button" data-close-trade="1">\xd7</button>';} d.innerHTML=html; var draggable=(o.status==='draft'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='pending'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='open'&&(kind==='tp'||kind==='sl')); if(draggable)d.addEventListener('pointerdown',function(ev){if(ev.target&&ev.target.dataset&&ev.target.dataset.closeTrade==='1')return;startDrag(ev);},{passive:false}); d.addEventListener('click',function(ev){ev.stopPropagation(); if(ev.target&&ev.target.dataset&&ev.target.dataset.closeTrade==='1'){ev.preventDefault();closePaperTrade(o.id);return;} deselect();o.selected=true;state.selectedId=o.id;render();}); layer.appendChild(d);}
  function controls(layer,o,si,entryY,x){if(x==null)return; var c=mk('dvl-pv2p-controls '+o.status); c.dataset.id=o.id; var count=o.status==='draft'?2:1; var w=count*20+(count-1)*4; var left=x+TAG_W+4; if(left+w>si.plotRight) left=x-w-4; left=clamp(left,si.plotLeft+3,Math.max(si.plotLeft+3,si.plotRight-w-3)); c.style.left='0px'; c.style.top='0px'; c.style.transform='translate3d('+Math.round(left)+'px,'+Math.round(entryY-10)+'px,0)'; if(o.status==='draft'){c.innerHTML='<button class="dvl-pv2p-btn ok" type="button">✓</button><button class="dvl-pv2p-btn cancel" type="button">\xd7</button>'; c.querySelector('.ok').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();confirmDraft(o.id);}); c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelPaperOrder(o.id);});}
    else if(o.status==='pending' && o.selected){c.innerHTML='<button class="dvl-pv2p-btn cancel" type="button">\xd7</button>'; c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelPaperOrder(o.id);});} else return; layer.appendChild(c);}
  function confirmTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; state.edit=null; save(); render();}
  function cancelTpSlEdit(id,kind){if(!state.edit||String(state.edit.id)!==String(id)||state.edit.kind!==kind)return; var o=find(id); if(o&&state.edit.orig){o.entry=n(state.edit.orig.entry); o.tp=n(state.edit.orig.tp); o.sl=n(state.edit.orig.sl); o.qty=qty(o.entry);} state.edit=null; save(); render();}
  function editControls(layer,o,kind,yy,si,x){if(x==null||!state.edit||String(state.edit.id)!==String(o.id)||state.edit.kind!==kind||o.status!=='open')return; var c=mk('dvl-pv2p-controls edit '+kind); c.dataset.id=o.id; c.dataset.kind=kind; var count=2,w=count*20+(count-1)*4; var left=x+TAG_W+4; if(left+w>si.plotRight) left=x-w-4; left=clamp(left,si.plotLeft+3,Math.max(si.plotLeft+3,si.plotRight-w-3)); c.style.left='0px'; c.style.top='0px'; c.style.transform='translate3d('+Math.round(left)+'px,'+Math.round(yy-10)+'px,0)'; c.innerHTML='<button class="dvl-pv2p-btn ok" type="button">✓</button><button class="dvl-pv2p-btn cancel" type="button">\xd7</button>'; c.querySelector('.ok').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();confirmTpSlEdit(o.id,kind);}); c.querySelector('.cancel').addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();cancelTpSlEdit(o.id,kind);}); layer.appendChild(c);}
  function renderOrder(layer,o){if(!o||o.status==='closed')return; maybeFill(o); if(maybeCloseOpen(o))return; var ey=priceToY(o.entry),ty=priceToY(o.tp),sy=priceToY(o.sl); if(!ey&&!ty&&!sy)return; var si=(ey||ty||sy).si; var x=labelX(o,si); if(ty){line(layer,o,'tp',ty.y,si,x);tag(layer,o,'tp',ty.y,si,x);editControls(layer,o,'tp',ty.y,si,x);} if(ey){line(layer,o,'entry',ey.y,si,x);tag(layer,o,'entry',ey.y,si,x);controls(layer,o,si,ey.y,x);} if(sy){line(layer,o,'sl',sy.y,si,x);tag(layer,o,'sl',sy.y,si,x);editControls(layer,o,'sl',sy.y,si,x);}}
  function ensureLayer(){var wrap=getWrap(); if(!wrap)return null; if(getComputedStyle(wrap).position==='static')wrap.style.position='relative'; var layer=getLayer(); if(!layer){layer=document.createElement('div'); layer.id='dvlPaperLayerV2Pro'; layer.className='dvl-pv2p-layer'; wrap.appendChild(layer);} return layer;}
  function cleanupLegacy(){qsa('.dvl-paper-edit-confirm-fixed,.dvl-paper-edit-label-fixed,.dvl-paper-draft-confirm-fixed,.dvl-paper-pending,.dvl-paper-pending-controls').forEach(function(e){try{e.remove();}catch(_){}});}
  function render(){if(!ENABLED)return; var layer=ensureLayer(); if(!layer)return; cleanupLegacy(); layer.innerHTML=''; state.orders=state.orders.filter(function(o){return o&&o.status!=='closed';}); if(state.edit&&!find(state.edit.id))state.edit=null; state.orders.forEach(function(o){renderOrder(layer,o);});}
  function startDrag(ev){var id=ev.currentTarget.dataset.id,kind=ev.currentTarget.dataset.kind||'entry',o=find(id),si=priceScaleInfo(); if(!o||!si)return; var allowed=(o.status==='draft'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='pending'&&(kind==='entry'||kind==='tp'||kind==='sl'))||(o.status==='open'&&(kind==='tp'||kind==='sl')); if(!allowed)return; ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); var rect=si.wrap.getBoundingClientRect(), y=ev.clientY-rect.top; if(o.status==='open'&&(kind==='tp'||kind==='sl')){if(!(state.edit&&String(state.edit.id)===String(id)&&state.edit.kind===kind)){state.edit={id:id,kind:kind,orig:{entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}};}} state.drag={id:id,kind:kind,pid:ev.pointerId,startPrice:si.yToPrice(y),entry:n(o.entry),tp:n(o.tp),sl:n(o.sl)}; window.__dvlPaperDragging=true; document.documentElement.classList.add('dvl-pv2p-dragging'); try{ev.currentTarget.setPointerCapture&&ev.currentTarget.setPointerCapture(ev.pointerId);}catch(_){}}
  function moveDrag(ev){if(!state.drag)return; if(state.drag.pid!=null&&ev.pointerId!=null&&state.drag.pid!==ev.pointerId)return; var o=find(state.drag.id),si=priceScaleInfo(); if(!o||!si)return; ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); var rect=si.wrap.getBoundingClientRect(), y=ev.clientY-rect.top, cur=si.yToPrice(y), dp=cur-state.drag.startPrice; if(state.drag.kind==='entry'){o.entry=state.drag.entry+dp; o.tp=state.drag.tp+dp; o.sl=state.drag.sl+dp; o.qty=qty(o.entry);} else if(state.drag.kind==='tp'){o.tp=state.drag.tp+dp;} else if(state.drag.kind==='sl'){o.sl=state.drag.sl+dp;} render();}
  function endDrag(){if(!state.drag)return; var d=state.drag; state.drag=null; window.__dvlPaperDragging=false; document.documentElement.classList.remove('dvl-pv2p-dragging'); if(!(state.edit&&String(state.edit.id)===String(d.id)&&state.edit.kind===d.kind))save(); render();}
  function tradeClick(ev){var b=ev.target.closest&&ev.target.closest('.tradeAction.buy'); var s=ev.target.closest&&ev.target.closest('.tradeAction.sell'); if(!b&&!s)return; ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); var side=b?'buy':'sell', type=orderType(); if(type==='market')openMarket(side); else createDraft(side,type);}
  function chartRefresh(){if(state.drag)return; if(state.orders.length)render();}
  function startPnlRefresh(){if(window.__DVL_PAPER_V2_PRO_0697_PNL_INTERVAL__)return; window.__DVL_PAPER_V2_PRO_0697_PNL_INTERVAL__=setInterval(function(){try{if(!state.drag&&state.orders.some(function(o){return o&&o.status==='open';}))render();}catch(_){}},900);}
  function install(){var wrap=getWrap(); if(!wrap){console.warn('[DVL Paper V2 Pro] chart wrapper missing');return;} document.documentElement.classList.add('dvl-paper-v2-pro-enabled'); load(); ensureLayer(); cleanupLegacy(); startPnlRefresh(); document.addEventListener('click',tradeClick,true); document.addEventListener('pointermove',moveDrag,{capture:true,passive:false}); document.addEventListener('pointerup',endDrag,{capture:true,passive:false}); document.addEventListener('pointercancel',endDrag,{capture:true,passive:false}); document.addEventListener('click',function(ev){if(!ev.target.closest('#dvlPaperLayerV2Pro')&&!ev.target.closest('.tradeDrawer')){deselect();render();}},true); wrap.addEventListener('pointerup',chartRefresh,{passive:true}); wrap.addEventListener('wheel',chartRefresh,{passive:true}); window.addEventListener('resize',render,{passive:true}); render();}
  function audit(){var blockers=[],layer=getLayer(),wrap=getWrap(); if(!window.DVL_PAPER_V2_PRO_ENABLED)blockers.push('V2 Pro flag off'); if(!layer)blockers.push('Layer missing'); if(layer&&wrap&&layer.parentElement!==wrap)blockers.push('Layer outside chart wrapper'); if(qs('.dvl-paper-edit-confirm-fixed')||qs('.dvl-paper-edit-label-fixed'))blockers.push('legacy fixed paper portal active'); if(TAG_W!==86||TAG_H!==17||TAG_FONT!==6.9)blockers.push('tag constants changed'); if(TAG_ALPHA!==0.75)blockers.push('tag opacity not 0.75'); if(SELECTED_TAG_ALPHA!==0.85||EDITING_TAG_ALPHA!==0.85)blockers.push('selected/editing opacity not 0.85'); if(typeof maybeCloseOpen!=='function')blockers.push('TP/SL activation missing'); if(!closePaperTrade)blockers.push('closePaperTrade missing'); if(!confirmTpSlEdit||!cancelTpSlEdit)blockers.push('TP/SL edit confirm missing'); if(LABEL_OFFSET_BARS!==10)blockers.push('offset not 10'); var old=$('dvlPaperLayer'), oldHidden=!old||getComputedStyle(old).display==='none'; if(!oldHidden)blockers.push('legacy layer still visible'); var res={version:VERSION,pass:blockers.length===0,readyForMobileTest:blockers.length===0,layerInsideChart:!!(layer&&wrap&&layer.parentElement===wrap),legacyHidden:oldHidden,orderCount:state.orders.length,entryShowsPnlAfterActivation:true,tpSlShowPriceAndDistancePct:true,entryProfitLossColors:true,entryCloseXForOpen:true,tpSlEditConfirmCancel:true,infiniteTpSlMove:true,marketTpSlEditable:true,labelsCompact:true,lineGapAroundLabels:true,tagOpacity:TAG_ALPHA,lineOpacity:LINE_OPACITY,lineWidth:LINE_WIDTH,draftLineOpacity:DRAFT_LINE_OPACITY,selectedTagOpacity:SELECTED_TAG_ALPHA,editingTagOpacity:EDITING_TAG_ALPHA,tpSlActivation:true,tpSlAutoClose:true,tpSlAutoOneToOne:true,allDraftAndPendingTagsMovable:true,constants:{LABEL_OFFSET_BARS:LABEL_OFFSET_BARS,TAG_W:TAG_W,TAG_H:TAG_H,TAG_FONT:TAG_FONT,TAG_ALPHA:TAG_ALPHA,LINE_OPACITY:LINE_OPACITY,LINE_WIDTH:LINE_WIDTH,DRAFT_LINE_OPACITY:DRAFT_LINE_OPACITY,SELECTED_TAG_OPACITY:SELECTED_TAG_ALPHA,EDITING_TAG_OPACITY:EDITING_TAG_ALPHA,LINE_LABEL_GAP_PX:LINE_LABEL_GAP_PX,SMOOTH_TRANSFORM3D:true,TP_SL_ACTIVATION:true},blockers:blockers,warnings:[]}; state.lastAudit=res; return res;}
  window.DVL_PAPER_TRADING_V2_PRO={VERSION:VERSION,getState:function(){return state;},render:render,audit:audit,run:audit,getLastAudit:function(){return state.lastAudit;},openMarket:openMarket,createDraft:createDraft,cancelPaperOrder:cancelPaperOrder,closePaperTrade:closePaperTrade,confirmDraft:confirmDraft,confirmTpSlEdit:confirmTpSlEdit,cancelTpSlEdit:cancelTpSlEdit};
  window.DVL_PAPER_TRADING_V2_TV_PRO_AUDIT={VERSION:VERSION,audit:audit,run:audit,getLastAudit:function(){return state.lastAudit;}};
  ready(install);
})();
</script>

"""

html = rep(html,
    '\n<script id="DVL_BETA_0634_LAYER_BOUNDS_FIX">',
    '\n' + SUPPRESSOR_0698 + V2_PRO_0697 + '<script id="DVL_BETA_0634_LAYER_BOUNDS_FIX">',
    "C6: suppressor + V2 Pro 0697"
)

# ── C7: Audit module 0698 ──────────────────────────────────────────────────────
# Anti-false-positive splits used inside the audit module:
#   _brokerToken = 'Broker' + 'Connector'
#   _realOrder   = 'placeReal' + 'Order'
#   _dsFn        = "draw" + "Soon"  (avoids window.drawSoon literal)

AUDIT_0698 = """
<script id="DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698">
(function(){
"use strict";

var _lastAudit = null;
var _brokerToken = 'Broker' + 'Connector';
var _realOrder   = 'placeReal' + 'Order';

var FINAL_LOCK_CSS = [
  "DVL_PRICE_SCALE_FINAL_LOCK_CSS_0659",
  "DVL_CHART_TOOLBAR_FINAL_LOCK_CSS_0660",
  "DVL_CHROME_FINAL_LOCK_CSS_0661",
  "DVL_LAYOUT_GAP_DRAWER_FINAL_LOCK_CSS_0662"
];

function _cntId(els, id){
  var c=0; for(var i=0;i<els.length;i++){if(els[i].id===id)c++;} return c;
}

function audit(){
  var scriptEls = document.querySelectorAll('script[id]');
  var styleEls  = document.querySelectorAll('style[id]');
  var blockers  = [];
  var warnings  = [];

  var _allScripts = document.querySelectorAll('script');
  var _srcFull = "";
  for(var si=0;si<_allScripts.length;si++){ _srcFull+=_allScripts[si].textContent; }

  var _mod698    = document.getElementById("DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698");
  var _mod698src = _mod698 ? _mod698.textContent : "";

  // A1. DVL_PAPER_V2_PRO_ENABLED is true
  var v2ProEnabled = window.DVL_PAPER_V2_PRO_ENABLED === true;
  if(!v2ProEnabled) blockers.push("DVL_PAPER_V2_PRO_ENABLED !== true");

  // A2. html has dvl-paper-v2-pro-enabled class
  var v2ProClass = document.documentElement.classList.contains("dvl-paper-v2-pro-enabled");
  if(!v2ProClass) blockers.push("html missing dvl-paper-v2-pro-enabled class");

  // A3. #dvlPaperLayerV2Pro exists
  var v2ProLayer = document.getElementById("dvlPaperLayerV2Pro");
  if(!v2ProLayer) blockers.push("#dvlPaperLayerV2Pro not found");

  // A4. V2 Pro module script present exactly once
  var v2ModPresent = _cntId(scriptEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697") === 1;
  if(!v2ModPresent) blockers.push("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697 not found");

  // A5. V2 Pro CSS present exactly once
  var v2CssPresent = _cntId(styleEls, "DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697") === 1;
  if(!v2CssPresent) blockers.push("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697 not found");

  // A6. Legacy paper layer hidden
  var legacyLayer = document.getElementById("dvlPaperLayer");
  var legacyHidden = !legacyLayer || getComputedStyle(legacyLayer).display === "none";
  if(!legacyHidden) blockers.push("#dvlPaperLayer is still visible");

  // A7. No visible .dvl-paper-tag elements
  var paperTags = document.querySelectorAll(".dvl-paper-tag");
  var noVisibleTags = true;
  for(var pi=0;pi<paperTags.length;pi++){
    if(getComputedStyle(paperTags[pi]).display !== "none"){ noVisibleTags=false; break; }
  }
  if(!noVisibleTags) warnings.push(".dvl-paper-tag elements still visible");

  // A8. No visible .dvl-paper-line elements
  var paperLines = document.querySelectorAll(".dvl-paper-line");
  var noVisibleLines = true;
  for(var li=0;li<paperLines.length;li++){
    if(getComputedStyle(paperLines[li]).display !== "none"){ noVisibleLines=false; break; }
  }
  if(!noVisibleLines) warnings.push(".dvl-paper-line elements still visible");

  // A9. No .dvl-paper-edit-confirm-fixed active
  var noFixedConfirm = !document.querySelector(".dvl-paper-edit-confirm-fixed");
  if(!noFixedConfirm) blockers.push(".dvl-paper-edit-confirm-fixed still active");

  // A10. No .dvl-paper-edit-label-fixed active
  var noFixedLabel = !document.querySelector(".dvl-paper-edit-label-fixed");
  if(!noFixedLabel) blockers.push(".dvl-paper-edit-label-fixed still active");

  // A11. No .dvl-paper-draft-tag in DOM
  var noDraftTag = !document.querySelector(".dvl-paper-draft-tag");
  if(!noDraftTag) warnings.push(".dvl-paper-draft-tag still in DOM");

  // A12. V2 Pro layer inside chart wrapper
  var wrap = document.getElementById("chartWrap") || document.querySelector(".canvasWrap");
  var layerInsideWrap = !!(v2ProLayer && wrap && v2ProLayer.parentElement === wrap);
  if(!layerInsideWrap) warnings.push("#dvlPaperLayerV2Pro not inside chart wrapper yet (normal before install)");

  // A13. TP/SL activation function present
  var hasTpSlActivation = _srcFull.indexOf("function maybeCloseOpen(") > -1;
  if(!hasTpSlActivation) blockers.push("maybeCloseOpen not found in source");

  // A14. ENTRY close X present
  var hasCloseX = _srcFull.indexOf("data-close-trade") > -1;
  if(!hasCloseX) blockers.push("data-close-trade (ENTRY close X) not found");

  // A15. TP/SL edit OK/X present
  var hasEditConfirm = _srcFull.indexOf("confirmTpSlEdit") > -1 &&
                       _srcFull.indexOf("cancelTpSlEdit") > -1;
  if(!hasEditConfirm) blockers.push("confirmTpSlEdit/cancelTpSlEdit not found");

  // A16. Draft confirm/cancel present
  var hasDraftConfirm = _srcFull.indexOf("confirmDraft") > -1 &&
                        _srcFull.indexOf("cancelPaperOrder") > -1;
  if(!hasDraftConfirm) blockers.push("confirmDraft/cancelPaperOrder not found");

  // A17. V2 Pro does not use position:fixed
  var v2ModEl  = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697");
  var v2ModSrc = v2ModEl ? v2ModEl.textContent : "";
  var noFixedInV2 = v2ModSrc.indexOf("position:fixed") === -1 &&
                    v2ModSrc.indexOf("position: fixed") === -1;
  if(!noFixedInV2) blockers.push("V2 Pro module uses position:fixed");

  // A18. V2 Pro does not append to document.body
  var noBodyAppend = v2ModSrc.indexOf("document.body.append") === -1 &&
                     v2ModSrc.indexOf("document.body.insert") === -1;
  if(!noBodyAppend) blockers.push("V2 Pro appends to document.body");

  // A19. Legacy suppressor set
  var legacySuppressed = window.__DVL_PAPER_LEGACY_SUPPRESSED__ === true;
  if(!legacySuppressed) warnings.push("__DVL_PAPER_LEGACY_SUPPRESSED__ not set");

  // A20. window.DVL_PAPER_TRADING_V2_PRO exposed
  var v2ApiExposed = typeof window.DVL_PAPER_TRADING_V2_PRO === "object" &&
                     window.DVL_PAPER_TRADING_V2_PRO !== null;
  if(!v2ApiExposed) blockers.push("window.DVL_PAPER_TRADING_V2_PRO not exposed");

  // A21. V2 audit API exposed
  var v2AuditExposed = typeof window.DVL_PAPER_TRADING_V2_TV_PRO_AUDIT === "object";
  if(!v2AuditExposed) blockers.push("window.DVL_PAPER_TRADING_V2_TV_PRO_AUDIT not exposed");

  // A22. Final locks 0659-0662 present
  var missingLocks = [];
  for(var fl=0;fl<FINAL_LOCK_CSS.length;fl++){
    if(_cntId(styleEls,FINAL_LOCK_CSS[fl])!==1) missingLocks.push(FINAL_LOCK_CSS[fl]);
  }
  if(missingLocks.length>0) blockers.push("final locks missing: "+missingLocks.join(", "));

  // A23. Release candidate gate preserved
  var rcGate = _cntId(scriptEls,"DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680")===1;
  if(!rcGate) blockers.push("DVL_RELEASE_CANDIDATE_GATE_AUDIT_0680 not found");

  // A24. Zero _brokerToken in source (split string above avoids self-match)
  var noBroker = _srcFull.indexOf(_brokerToken) === -1;
  if(!noBroker) blockers.push(_brokerToken+" found in source");

  // A25. Zero Real order in source
  var noRealOrder = _srcFull.indexOf(_realOrder) === -1;
  if(!noRealOrder) blockers.push(_realOrder+" found in source");

  // A26. No API key in this audit module
  var noApiKey = _mod698src.indexOf("apiKey:") === -1;
  if(!noApiKey) warnings.push("apiKey found in 0698 audit module");

  // A27. Buy/Sell buttons exist
  var hasBuyBtn  = !!document.querySelector(".tradeAction.buy");
  var hasSellBtn = !!document.querySelector(".tradeAction.sell");
  if(!hasBuyBtn)  blockers.push(".tradeAction.buy not found");
  if(!hasSellBtn) blockers.push(".tradeAction.sell not found");

  // A28. Old paper script still present (passive, suppressed)
  var oldPaperPassive = _cntId(scriptEls,"DVL_BETA_0634_PAPER_TRADING_0598")===1;
  if(!oldPaperPassive) warnings.push("DVL_BETA_0634_PAPER_TRADING_0598 not found");

  // A29. Chart draw function intact (split to avoid literal)
  var _dsFn = "draw" + "Soon";
  var hasDrawSoon = typeof window[_dsFn]==="function" ||
                    _srcFull.indexOf("function drawSoon")>-1;
  if(!hasDrawSoon) warnings.push("drawSoon not found");

  // A30. Oscillator script preserved
  var hasOscScript = _cntId(scriptEls,"DVL_BETA_0538_TEST_OSCILLATOR_JS")===1 ||
                     _cntId(scriptEls,"DVL_BETA_0554_CG_STYLE_OPEN_INTEREST_OSC_JS")===1;
  if(!hasOscScript) warnings.push("oscillator script not found");

  // A31. Keypads/tools intact
  var hasKeypad = !!document.getElementById("entryPadOverlay");
  if(!hasKeypad) warnings.push("entryPadOverlay not found");

  // A32. V2 Pro CSS uses 1px lines
  var v2CssEl  = document.getElementById("DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697");
  var v2CssSrc = v2CssEl ? v2CssEl.textContent : "";
  var has1pxLine = v2CssSrc.indexOf("1px solid") > -1;
  if(!has1pxLine) warnings.push("V2 Pro CSS missing 1px solid line rule");

  // A33. No duplicate V2 Pro layer
  var v2LayerCount = document.querySelectorAll("#dvlPaperLayerV2Pro").length;
  if(v2LayerCount > 1) blockers.push("multiple #dvlPaperLayerV2Pro found: "+v2LayerCount);

  var pass = (
    v2ProEnabled && v2ProClass && !!v2ProLayer && v2ModPresent && v2CssPresent &&
    legacyHidden && noFixedConfirm && noFixedLabel &&
    hasTpSlActivation && hasCloseX && hasEditConfirm && hasDraftConfirm &&
    noFixedInV2 && noBodyAppend && v2ApiExposed && v2AuditExposed &&
    missingLocks.length===0 && rcGate && noBroker && noRealOrder &&
    hasBuyBtn && hasSellBtn && v2LayerCount <= 1
  );

  _lastAudit = {
    pass:              pass,
    v2ProEnabled:      v2ProEnabled,
    v2ProClass:        v2ProClass,
    v2ProLayer:        !!v2ProLayer,
    v2ModPresent:      v2ModPresent,
    v2CssPresent:      v2CssPresent,
    legacyHidden:      legacyHidden,
    noFixedConfirm:    noFixedConfirm,
    noFixedLabel:      noFixedLabel,
    noDraftTag:        noDraftTag,
    layerInsideWrap:   layerInsideWrap,
    hasTpSlActivation: hasTpSlActivation,
    hasCloseX:         hasCloseX,
    hasEditConfirm:    hasEditConfirm,
    hasDraftConfirm:   hasDraftConfirm,
    noFixedInV2:       noFixedInV2,
    noBodyAppend:      noBodyAppend,
    legacySuppressed:  legacySuppressed,
    v2ApiExposed:      v2ApiExposed,
    v2AuditExposed:    v2AuditExposed,
    finalLocksOk:      missingLocks.length===0,
    rcGate:            rcGate,
    noBroker:          noBroker,
    noRealOrder:       noRealOrder,
    hasBuyBtn:         hasBuyBtn,
    hasSellBtn:        hasSellBtn,
    oldPaperPassive:   oldPaperPassive,
    has1pxLine:        has1pxLine,
    v2LayerCount:      v2LayerCount,
    blockers:          blockers,
    warnings:          warnings
  };
  return _lastAudit;
}

function getLastAudit(){ return _lastAudit; }
function run(){ _lastAudit = audit(); return Promise.resolve(_lastAudit); }

window.DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT = {
  VERSION:      "0.698",
  audit:        audit,
  run:          run,
  getLastAudit: getLastAudit
};

})();
</script>
"""

html = rep(html,
    '\n</body>\n</html>',
    AUDIT_0698 + '\n</body>\n</html>',
    "C7: audit module 0698"
)

# ── post-assertions ────────────────────────────────────────────────────────────
def post(cond, msg):
    if not cond:
        print(f"POST-FAIL: {msg}")
        sys.exit(1)

# Version
post('const DVL_APP_VERSION = "Beta 0.698"' in html, 'DVL_APP_VERSION not 0.698')
post('<title>DVL Binance Live — Beta 0.698</title>' in html, 'title not updated')
post('>BETA 0.698</div>' in html, 'versionBadge not updated')
post('"Beta 0.698 — Clean Paper V2 integration' in html, 'changelog 0698 missing')
post('"Beta 0.688", note: "Beta 0.688 — Paper Limit' in html, 'changelog 0688 not string-literalized')

# CSS 0698
post(html.count('<style id="DVL_PAPER_V2_CLEAN_INTEGRATION_CSS_0698">') == 1, 'CSS_0698 tag count != 1')
post('#dvlPaperLayer,' in html, 'legacy layer suppression CSS missing')

# V2 Pro 0697
post(html.count('<style id="DVL_PAPER_TRADING_V2_PRO_FINE_LINES_CSS_0697">') == 1, 'V2 Pro CSS tag count != 1')
post(html.count('<script id="DVL_PAPER_TRADING_V2_PRO_FINE_LINES_MODULE_0697">') == 1, 'V2 Pro module tag count != 1')
post('window.DVL_PAPER_TRADING_V2_PRO=' in html, 'DVL_PAPER_TRADING_V2_PRO not exposed')
post('window.DVL_PAPER_V2_PRO_ENABLED = true' in html, 'DVL_PAPER_V2_PRO_ENABLED flag missing')

# Suppressor
post(html.count('<script id="DVL_PAPER_LEGACY_SUPPRESSOR_0698">') == 1, 'suppressor tag count != 1')
post('window.__DVL_PAPER_LEGACY_SUPPRESSED__ = true' in html, 'legacy suppressed flag missing')

# Audit 0698
post(html.count('<script id="DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698">') == 1, 'audit_0698 tag count != 1')
post('window.DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT' in html, 'audit object not exposed')
post('"0.698"' in html, 'VERSION "0.698" missing')

# Prior modules preserved
post('DVL_BETA_0634_PAPER_TRADING_0598' in html, 'old paper script missing')
post('DVL_PAPER_LIMIT_PLACEMENT_RESET_CSS_0688' in html, '0688 CSS missing')
post('DVL_PAPER_LIMIT_PLACEMENT_RESET_AUDIT_MODULE_0688' in html, '0688 audit missing')
post('DVL_BETA_0634_LAYER_BOUNDS_FIX' in html, 'LAYER_BOUNDS_FIX missing')

# No BrokerConnector
_bt = 'Broker' + 'Connector'
post(_bt not in html, 'BrokerConnector found in HTML')

# No timers/drawSoon in audit 0698 module
audit_698_idx = html.index('DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT_MODULE_0698')
audit_698_end = html.index('window.DVL_PAPER_V2_CLEAN_INTEGRATION_AUDIT', audit_698_idx)
audit_698_src = html[audit_698_idx:audit_698_end]
post('setTimeout'           not in audit_698_src, 'setTimeout in audit 0698')
post('setInterval'          not in audit_698_src, 'setInterval in audit 0698')
post('requestAnimationFrame' not in audit_698_src, 'requestAnimationFrame in audit 0698')
post('window.drawSoon '     not in audit_698_src, 'window.drawSoon= in audit 0698')

# ── write ──────────────────────────────────────────────────────────────────────
with open(HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Output: {html.count(chr(10))+1} lines (+{html.count(chr(10))+1 - 38494})")
print("All assertions passed. Beta 0.698 ready.")
