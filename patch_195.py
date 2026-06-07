#!/usr/bin/env python3
"""patch_195.py — Beta 0.195: Large Buy/Sell + compact controls in main page flow"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.194') >= 5, f'count={html.count("Beta 0.194")}'
html = html.replace('Beta 0.194', 'Beta 0.195')

# ── 1. CSS for trade bar + summary strip ─────────────────────────────────────
OLD_CSS_END = '.pp-qctl:hover{color:#c8d8f0;}\n</style>'
assert OLD_CSS_END in html, 'CSS end anchor not found'
NEW_CSS_BLOCK = """\
/* ── DVL Trade Bar ── */
#dvlTradeBar{display:none;flex-direction:column;gap:5px;padding:6px 8px 5px;background:#020508;border-bottom:1px solid rgba(255,255,255,.06);font-family:monospace;flex-shrink:0;width:100%;box-sizing:border-box;}
#dvlTradeBar.dtb-on{display:flex;}
.dtb-action-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.dtb-btn{height:44px;font-family:monospace;font-size:13px;font-weight:800;border-radius:5px;cursor:pointer;border:1.5px solid;letter-spacing:.08em;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:7px;background:none;}
.dtb-btn:active{transform:scale(.97);}
.dtb-btn.buy{background:rgba(0,200,80,.08);color:#00ff7a;border-color:rgba(0,210,80,.50);box-shadow:0 0 18px rgba(0,210,80,.15),inset 0 0 12px rgba(0,200,80,.05);}
.dtb-btn.buy:hover{background:rgba(0,200,80,.15);box-shadow:0 0 26px rgba(0,210,80,.28);}
.dtb-btn.sell{background:rgba(220,30,40,.08);color:#ff3355;border-color:rgba(220,40,50,.50);box-shadow:0 0 18px rgba(220,40,50,.15),inset 0 0 12px rgba(220,30,40,.05);}
.dtb-btn.sell:hover{background:rgba(220,30,40,.15);box-shadow:0 0 26px rgba(220,40,50,.28);}
.dtb-ctrl-row{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:6px;align-items:end;}
.dtb-cell{display:flex;flex-direction:column;gap:2px;}
.dtb-lbl{font-size:7px;color:#3a5068;letter-spacing:.08em;text-transform:uppercase;}
.dtb-sel,.dtb-inp{background:#060c16;border:1px solid rgba(255,255,255,.08);color:#b8cce0;border-radius:4px;padding:5px 6px;font-family:monospace;font-size:9.5px;width:100%;box-sizing:border-box;}
.dtb-sel:focus,.dtb-inp:focus{outline:none;border-color:rgba(0,212,255,.45);}
.dtb-rr{font-size:11px;font-weight:700;color:#00d4ff;text-align:center;padding:4px 0 3px;border:1px solid rgba(0,212,255,.20);border-radius:4px;background:#060c16;min-width:40px;font-family:monospace;}
.dtb-limit-row{display:none;align-items:center;gap:6px;margin-top:2px;}
.dtb-limit-row .dtb-inp{flex:1;}
/* ── DVL Summary Strip (fixed bottom) ── */
#dvlSummaryStrip{display:none;position:fixed;bottom:0;left:0;right:0;z-index:192;background:#010306;border-top:1px solid rgba(255,255,255,.07);padding:4px 10px;font-family:monospace;align-items:center;gap:0;}
#dvlSummaryStrip.dss-on{display:flex;}
.dss-item{display:flex;flex-direction:column;align-items:center;gap:1px;flex:1;min-width:0;border-right:1px solid rgba(255,255,255,.04);padding:0 4px;}
.dss-item:last-child{border-right:none;}
.dss-k{font-size:6.5px;color:#2d4460;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}
.dss-v{font-size:8.5px;font-weight:700;color:#6a8faf;font-family:monospace;white-space:nowrap;}
.dss-v.pos{color:#00cc66;}.dss-v.neg{color:#ff3355;}.dss-v.hi{color:#00d4ff;}
.dss-inp{background:none;border:none;border-bottom:1px solid rgba(255,255,255,.10);color:#b8cce0;font-family:monospace;font-size:8.5px;font-weight:700;text-align:center;width:75px;padding:1px 2px;outline:none;}
.dss-inp.sl{color:#ff5566;border-bottom-color:rgba(220,60,80,.35);}
.dss-inp.tp{color:#00cc66;border-bottom-color:rgba(0,180,80,.35);}
.dss-inp:focus{border-bottom-color:rgba(0,212,255,.5);}
"""
html = html.replace(OLD_CSS_END,
    '.pp-qctl:hover{color:#c8d8f0;}\n' + NEW_CSS_BLOCK + '</style>', 1)

# ── 2. Insert #dvlTradeBar between topbar and .main ──────────────────────────
TRADE_BAR_HTML = """\
  <!-- DVL Trade Bar — between TF bar and chart -->
  <div id="dvlTradeBar">
    <div class="dtb-action-row">
      <button class="dtb-btn buy" onclick="window.DVL_PAPER&&DVL_PAPER._submitOrder('buy')">
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5,1 9,5 5,9"/><line x1="1" y1="5" x2="9" y2="5"/></svg>
        <span id="dtbBuyLbl">Buy Market</span>
      </button>
      <button class="dtb-btn sell" onclick="window.DVL_PAPER&&DVL_PAPER._submitOrder('sell')">
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5,9 9,5 5,1"/><line x1="1" y1="5" x2="9" y2="5"/></svg>
        <span id="dtbSellLbl">Sell Market</span>
      </button>
    </div>
    <div class="dtb-ctrl-row">
      <div class="dtb-cell">
        <span class="dtb-lbl">Type</span>
        <select class="dtb-sel" id="ppOrderType" onchange="window.DVL_PAPER&&DVL_PAPER._onTypeChange(this.value)">
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </select>
      </div>
      <div class="dtb-cell">
        <span class="dtb-lbl">Size</span>
        <input class="dtb-inp" id="ppQty" type="number" min="0" step="0.0001" placeholder="auto">
      </div>
      <div class="dtb-cell">
        <span class="dtb-lbl">Risk %</span>
        <input class="dtb-inp" id="ppRiskPct" type="number" min="0.1" max="100" step="0.1" value="1" oninput="window.DVL_PAPER&&DVL_PAPER._updateSummaryBar()">
      </div>
      <div class="dtb-cell">
        <span class="dtb-lbl">RR</span>
        <div class="dtb-rr" id="ppRRDisp">—</div>
      </div>
    </div>
    <div class="dtb-limit-row" id="dtbLimitRow">
      <span class="dtb-lbl">Price</span>
      <input class="dtb-inp" id="ppLimitPx" type="number" step="0.01" placeholder="limit price">
    </div>
  </div>
"""
OLD_TF_POPUP_ANCHOR = '\n\n  <!-- tfMorePopup kept hidden in DOM (legacy compat) -->'
assert OLD_TF_POPUP_ANCHOR in html, 'tfMorePopup anchor not found'
html = html.replace(OLD_TF_POPUP_ANCHOR,
    '\n\n' + TRADE_BAR_HTML + '\n  <!-- tfMorePopup kept hidden in DOM (legacy compat) -->', 1)

# ── 3. Insert #dvlSummaryStrip after dvlPaperNotif ───────────────────────────
STRIP_HTML = """\
<div id="dvlSummaryStrip">
  <div class="dss-item"><span class="dss-k">Entry</span><span class="dss-v hi" id="dssEntry">—</span></div>
  <div class="dss-item">
    <span class="dss-k">SL</span>
    <input class="dss-inp sl" id="ppSL" type="number" step="0.01" placeholder="—" oninput="window.DVL_PAPER&&DVL_PAPER._updateSummaryBar()">
  </div>
  <div class="dss-item">
    <span class="dss-k">TP</span>
    <input class="dss-inp tp" id="ppTP" type="number" step="0.01" placeholder="—" oninput="window.DVL_PAPER&&DVL_PAPER._updateSummaryBar()">
  </div>
  <div class="dss-item"><span class="dss-k">Risk</span><span class="dss-v" id="dssRisk">—</span></div>
  <div class="dss-item"><span class="dss-k">Profit</span><span class="dss-v pos" id="dssProfit">—</span></div>
  <div class="dss-item"><span class="dss-k">RR</span><span class="dss-v hi" id="dssRR">—</span></div>
</div>
"""
OLD_NOTIF = '<div id="dvlPaperNotif"></div>\n'
assert OLD_NOTIF in html, 'dvlPaperNotif anchor not found'
html = html.replace(OLD_NOTIF, OLD_NOTIF + STRIP_HTML, 1)

# ── 4. Replace _renderTrade() with simplified version ─────────────────────────
START_RT = 'function _renderTrade(){'
END_RT = '\nfunction _renderPos(){'
assert START_RT in html, '_renderTrade start not found'
idx_s = html.index(START_RT)
idx_e = html.index(END_RT, idx_s)
# fmt: off
NEW_RT = (
'function _renderTrade(){\n'
'  var acc=ST.account,set=ST.settings;\n'
'  var eq=_equity();\n'
'  var upnlTotal=ST.positions.reduce(function(s,p){return s+(p.unrealizedPnl||0);},0);\n'
'  var h=\'\';\n'
'  var pnlCls=upnlTotal>=0?\'acct-pnl-pos\':\'acct-pnl-neg\';\n'
'  h+=\'<div class="pp-acct-bar" id="ppAcctBar">\';\n'
'  h+=\'<span>Bal <b>\'+_f(acc.balance)+\'</b></span>\';\n'
'  h+=\'<span>Eq <b>\'+_f(eq)+\'</b></span>\';\n'
'  h+=\'<span class="\'+pnlCls+\'"><b>\'+_fp(upnlTotal)+\'</b></span>\';\n'
'  h+=\'</div>\';\n'
'  if(ST.pendingOrders.filter(function(o){return o.symbol===_sym();}).length){\n'
'    h+=\'<button class="pp-btn cncl full" onclick="DVL_PAPER._cancelAll()" style="width:100%;margin-bottom:4px;">Cancel All Pending</button>\';\n'
'  }\n'
'  h+=\'<button class="pp-adv-toggle" onclick="DVL_PAPER._toggleAdv(this)"><span>▼ Advanced</span></button>\';\n'
'  h+=\'<div class="pp-adv-body" id="ppAdvBody">\';\n'
'  h+=\'<div class="pp-inp-row"><span class="pp-lbl">Leverage</span><input class="pp-inp" id="ppLev" type="number" min="1" max="125" step="1" value="\'+set.leverage+\'"></div>\';\n'
'  h+=\'<div class="pp-inp-row"><span class="pp-lbl">Fee %</span><input class="pp-inp" id="ppFee" type="number" min="0" max="1" step="0.01" value="\'+set.feePct+\'"></div>\';\n'
'  h+=\'<div class="pp-inp-row"><span class="pp-lbl">Slippage %</span><input class="pp-inp" id="ppSlip" type="number" min="0" max="1" step="0.01" value="\'+set.slippagePct+\'"></div>\';\n'
'  h+=\'<div class="pp-inp-row"><span class="pp-lbl">Intrabar</span>\';\n'
'  h+=\'<select class="pp-sel" id="ppIntrabar">\';\n'
'  [\'conservative\',\'optimistic\',\'closeBased\'].forEach(function(m){\n'
'    h+=\'<option value="\'+m+\'"\'+(set.intrabarMode===m?\' selected\':\'\')+\'>\'+m+\'</option>\';\n'
'  });\n'
'  h+=\'</select></div>\';\n'
'  h+=\'<div class="pp-inp-row"><span class="pp-lbl">Auto SL/TP</span>\';\n'
'  h+=\'<select class="pp-sel" id="ppAutoSLTP"><option value="1"\'+(set.autoSLTP?\' selected\':\'\')+\'>On</option><option value="0"\'+(set.autoSLTP?\'\':\' selected\')+\'>Off</option></select></div>\';\n'
'  h+=\'<button class="pp-btn rst" onclick="DVL_PAPER._resetConfirm()" style="width:100%;margin-top:6px;">Reset Account</button>\';\n'
'  h+=\'</div>\';\n'
'  h+=\'<div style="height:8px;"></div>\';\n'
'  return h;\n'
'}'
)
# fmt: on
html = html[:idx_s] + NEW_RT + html[idx_e:]

# ── 5. Replace _renderLive() — avoid re-rendering static trade form ───────────
OLD_RL = (
    'function _renderLive(){\n'
    '  if(_tab===\'trade\'||_tab===\'pos\'){\n'
    '    var body=document.getElementById(\'ppBody\');if(!body)return;\n'
    '    if(_tab===\'trade\')body.innerHTML=_renderTrade();\n'
    '    else body.innerHTML=_renderPos();\n'
    '  }\n'
    '}'
)
assert OLD_RL in html, '_renderLive not found'
NEW_RL = (
    'function _renderLive(){\n'
    '  if(_tab===\'pos\'){\n'
    '    var body=document.getElementById(\'ppBody\');if(!body)return;\n'
    '    body.innerHTML=_renderPos();\n'
    '  } else if(_tab===\'trade\'){\n'
    '    _updateAcctBar();\n'
    '  }\n'
    '  _updateSummaryBar();\n'
    '}\n'
    'function _updateAcctBar(){\n'
    '  var el=document.getElementById(\'ppAcctBar\');if(!el)return;\n'
    '  var upnlTotal=ST.positions.reduce(function(s,p){return s+(p.unrealizedPnl||0);},0);\n'
    '  var eq=_equity();\n'
    '  var pnlCls=upnlTotal>=0?\'acct-pnl-pos\':\'acct-pnl-neg\';\n'
    '  el.innerHTML=\n'
    '    \'<span>Bal <b>\'+_f(ST.account.balance)+\'</b></span>\'+\n'
    '    \'<span>Eq <b>\'+_f(eq)+\'</b></span>\'+\n'
    '    \'<span class="\'+pnlCls+\'"><b>\'+_fp(upnlTotal)+\'</b></span>\';\n'
    '}'
)
html = html.replace(OLD_RL, NEW_RL, 1)

# ── 6. Replace _onTypeChange() ────────────────────────────────────────────────
OLD_OTC_START = 'function _onTypeChange(type){'
OLD_OTC_END = '\nfunction _closePos'
assert OLD_OTC_START in html
idx_s2 = html.index(OLD_OTC_START)
idx_e2 = html.index(OLD_OTC_END, idx_s2)
NEW_OTC = (
    'function _onTypeChange(type){\n'
    '  ST.settings.orderType=type;\n'
    '  var lbl=type.charAt(0).toUpperCase()+type.slice(1);\n'
    '  var buyLbl=document.getElementById(\'dtbBuyLbl\');\n'
    '  var sellLbl=document.getElementById(\'dtbSellLbl\');\n'
    '  if(buyLbl)buyLbl.textContent=\'Buy \'+lbl;\n'
    '  if(sellLbl)sellLbl.textContent=\'Sell \'+lbl;\n'
    '  var limRow=document.getElementById(\'dtbLimitRow\');\n'
    '  if(limRow)limRow.style.display=(type===\'market\'?\'none\':\'flex\');\n'
    '  _save();\n'
    '}'
)
html = html[:idx_s2] + NEW_OTC + html[idx_e2:]

# ── 7. Replace togglePanel() — call _updateQuickVis on enable ─────────────────
OLD_TP = (
    'function togglePanel(){\n'
    '  var p=document.getElementById(\'dvlPaperPanel\');if(!p)return;\n'
    '  var isOpen=p.classList.toggle(\'pp-open\');\n'
    '  if(isOpen){\n'
    '    if(!ST.enabled){ST.enabled=true;_save();}\n'
    '    var badge=document.getElementById(\'paperTradingBadge\');\n'
    '    if(badge)badge.style.display=\'block\';\n'
    '    _render();\n'
    '  }\n'
    '}'
)
assert OLD_TP in html, 'togglePanel not found'
NEW_TP = (
    'function togglePanel(){\n'
    '  var p=document.getElementById(\'dvlPaperPanel\');if(!p)return;\n'
    '  var isOpen=p.classList.toggle(\'pp-open\');\n'
    '  if(isOpen){\n'
    '    if(!ST.enabled){ST.enabled=true;_save();}\n'
    '    var badge=document.getElementById(\'paperTradingBadge\');\n'
    '    if(badge)badge.style.display=\'block\';\n'
    '    _updateQuickVis();\n'
    '    _render();\n'
    '  }\n'
    '}'
)
html = html.replace(OLD_TP, NEW_TP, 1)

# ── 8. Replace _updateQuickVis() ─────────────────────────────────────────────
OLD_UQV = (
    'function _updateQuickVis(){\n'
    '  var qb=document.getElementById(\'ppQuickBtns\');\n'
    '  if(!qb)return;\n'
    '  if(ST.quickVisible)qb.classList.add(\'pp-qvis\');\n'
    '  else qb.classList.remove(\'pp-qvis\');\n'
    '  var eye=document.getElementById(\'ppQEye\');\n'
    '  if(eye)eye.style.opacity=ST.quickVisible?\'1\':\'0.4\';\n'
    '}'
)
assert OLD_UQV in html, '_updateQuickVis not found'
NEW_UQV = (
    'function _updateQuickVis(){\n'
    '  var enabled=ST.enabled;\n'
    '  var tb=document.getElementById(\'dvlTradeBar\');\n'
    '  var ss=document.getElementById(\'dvlSummaryStrip\');\n'
    '  if(tb){\n'
    '    if(enabled&&ST.quickVisible)tb.classList.add(\'dtb-on\');\n'
    '    else tb.classList.remove(\'dtb-on\');\n'
    '  }\n'
    '  if(ss){\n'
    '    if(enabled&&ST.quickVisible)ss.classList.add(\'dss-on\');\n'
    '    else ss.classList.remove(\'dss-on\');\n'
    '  }\n'
    '  var qb=document.getElementById(\'ppQuickBtns\');\n'
    '  if(qb)qb.style.display=\'none\';\n'
    '}'
)
html = html.replace(OLD_UQV, NEW_UQV, 1)

# ── 9. Replace _updateSummaryBar() — also update strip ───────────────────────
OLD_USB_START = 'function _updateSummaryBar(){'
OLD_USB_END = '\nfunction _pollOtherSymbols(){'
assert OLD_USB_START in html
idx_s3 = html.index(OLD_USB_START)
idx_e3 = html.index(OLD_USB_END, idx_s3)
NEW_USB = (
    'function _updateSummaryBar(){\n'
    '  var px=_price(_sym())||0;\n'
    '  var slEl=document.getElementById(\'ppSL\');\n'
    '  var tpEl=document.getElementById(\'ppTP\');\n'
    '  var riskEl=document.getElementById(\'ppRiskPct\');\n'
    '  var sl=slEl?parseFloat(slEl.value):NaN;\n'
    '  var tp=tpEl?parseFloat(tpEl.value):NaN;\n'
    '  var riskPct=riskEl?parseFloat(riskEl.value):ST.settings.riskPct;\n'
    '  var eq=_equity();\n'
    '  var riskAmt=isNaN(riskPct)?0:eq*riskPct/100;\n'
    '  var rrStr=\'—\',profitAmt=NaN;\n'
    '  if(!isNaN(sl)&&!isNaN(tp)&&px){\n'
    '    var risk=Math.abs(px-sl),reward=Math.abs(tp-px);\n'
    '    if(risk>0){rrStr=\'1:\'+(reward/risk).toFixed(1);profitAmt=riskAmt*(reward/risk);}\n'
    '  }\n'
    '  var rrDisp=document.getElementById(\'ppRRDisp\');\n'
    '  if(rrDisp)rrDisp.textContent=rrStr;\n'
    '  var dEntry=document.getElementById(\'dssEntry\');\n'
    '  if(dEntry)dEntry.textContent=px?_f(px,2):\'—\';\n'
    '  var dRisk=document.getElementById(\'dssRisk\');\n'
    '  if(dRisk)dRisk.textContent=isNaN(riskPct)?\'—\':riskPct.toFixed(1)+\'%\';\n'
    '  var dProfit=document.getElementById(\'dssProfit\');\n'
    '  if(dProfit){\n'
    '    dProfit.textContent=!isNaN(profitAmt)?\'+\'+_f(profitAmt):\'—\';\n'
    '    dProfit.className=\'dss-v \'+(profitAmt>0?\'pos\':\'\');\n'
    '  }\n'
    '  var dRR=document.getElementById(\'dssRR\');\n'
    '  if(dRR)dRR.textContent=rrStr;\n'
    '  var bar=document.getElementById(\'ppSummaryBar\');\n'
    '  if(!bar)return;\n'
    '  var mkItem=function(k,v,cls){\n'
    '    return \'<div class="psb-item"><span class="psb-k">\'+k+\'</span><span class="psb-v\'+(cls?\' \'+cls:\'\')+\'">\'+v+\'</span></div>\';\n'
    '  };\n'
    '  bar.innerHTML=\n'
    '    mkItem(\'Entry\',px?_f(px,2):\'—\',\'hi\')+\n'
    '    mkItem(\'SL\',!isNaN(sl)?_f(sl,2):\'—\',\'neg\')+\n'
    '    mkItem(\'TP\',!isNaN(tp)?_f(tp,2):\'—\',\'pos\')+\n'
    '    mkItem(\'Risk\',isNaN(riskPct)?\'—\':riskPct.toFixed(1)+\'%\',\'\')+\n'
    '    mkItem(\'Profit\',!isNaN(profitAmt)?\'+\'+_f(profitAmt):\'—\',\'pos\')+\n'
    '    mkItem(\'RR\',rrStr,rrStr!==\'—\'?\'hi\':\'\');\n'
    '}'
)
html = html[:idx_s3] + NEW_USB + html[idx_e3:]

# ── 10. Add _toggleAdv + _initTradeBar + replace init() ──────────────────────
OLD_INIT_START = 'function init(){\n  _load();\n  _updateQuickVis();'
assert OLD_INIT_START in html, 'init() anchor not found'
idx_init = html.index(OLD_INIT_START)
OLD_INIT_END = '\n\n/* ── PUBLIC API ── */'
idx_init_e = html.index(OLD_INIT_END, idx_init)
OLD_INIT_BLOCK = html[idx_init:idx_init_e]
NEW_INIT_BLOCK = (
    'function _toggleAdv(btn){\n'
    '  var d=document.getElementById(\'ppAdvBody\');if(!d)return;\n'
    '  d.classList.toggle(\'open\');\n'
    '  var s=btn.querySelector(\'span\');\n'
    '  if(s)s.textContent=d.classList.contains(\'open\')?\'▲ Advanced\':\'▼ Advanced\';\n'
    '}\n'
    'function _initTradeBar(){\n'
    '  var set=ST.settings;\n'
    '  var ot=document.getElementById(\'ppOrderType\');\n'
    '  if(ot)ot.value=set.orderType||\'market\';\n'
    '  var rp=document.getElementById(\'ppRiskPct\');\n'
    '  if(rp)rp.value=set.riskPct||1;\n'
    '  var type=set.orderType||\'market\';\n'
    '  var lbl=type.charAt(0).toUpperCase()+type.slice(1);\n'
    '  var buyLbl=document.getElementById(\'dtbBuyLbl\');\n'
    '  var sellLbl=document.getElementById(\'dtbSellLbl\');\n'
    '  if(buyLbl)buyLbl.textContent=\'Buy \'+lbl;\n'
    '  if(sellLbl)sellLbl.textContent=\'Sell \'+lbl;\n'
    '  var limRow=document.getElementById(\'dtbLimitRow\');\n'
    '  if(limRow)limRow.style.display=(type===\'market\'?\'none\':\'flex\');\n'
    '}\n'
    'function init(){\n'
    '  _load();\n'
    '  _initTradeBar();\n'
    '  _updateQuickVis();\n'
    '  var cv=document.getElementById(\'mainCanvas\')||document.querySelector(\'#chartWrap canvas\')||document.querySelector(\'canvas\');\n'
    '  if(cv)_initDrag(cv);\n'
    '  _initOutsideClick();\n'
    '  if(ST.enabled){\n'
    '    var badge=document.getElementById(\'paperTradingBadge\');\n'
    '    if(badge)badge.style.display=\'block\';\n'
    '  }\n'
    '  setInterval(_pollOtherSymbols,3000);\n'
    '  console.log(\'[DVL Paper] v0.195 ready — balance:\',ST.account.balance,ST.account.currency);\n'
    '}'
)
html = html[:idx_init] + NEW_INIT_BLOCK + html[idx_init_e:]

# ── 11. Add _toggleAdv to public API ─────────────────────────────────────────
OLD_API_END = '_updateStopsFromUI:_updateStopsFromUI,_toggleQuick:_toggleQuick,_onTypeChange:_onTypeChange,_updateSummaryBar:_updateSummaryBar'
assert OLD_API_END in html, 'public API end not found'
html = html.replace(OLD_API_END,
    OLD_API_END + ',_toggleAdv:_toggleAdv,_initTradeBar:_initTradeBar', 1)

# ── 12. Verify ppSummaryBar is still in panel HTML (not broken) ───────────────
assert 'id="ppSummaryBar"' in html, 'ppSummaryBar missing'
assert 'id="dvlTradeBar"' in html, 'dvlTradeBar missing'
assert 'id="dvlSummaryStrip"' in html, 'dvlSummaryStrip missing'
assert 'id="ppSL"' in html, 'ppSL missing'
assert 'id="ppTP"' in html, 'ppTP missing'

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_195.py applied — Beta 0.195')
print('  + #dvlTradeBar: large Buy/Sell + compact controls between TF bar and chart')
print('  + #dvlSummaryStrip: fixed bottom — Entry|SL|TP|Risk|Profit|RR')
print('  + _renderTrade() simplified (account bar + advanced settings only)')
print('  + _renderLive() no longer re-renders the form on every tick')
