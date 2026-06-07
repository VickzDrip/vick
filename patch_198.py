#!/usr/bin/env python3
"""patch_198.py — Beta 0.198: Split Buy/Sell button — main=execute, arrow=dropdown"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.197') >= 10, f'count={html.count("Beta 0.197")}'
html = html.replace('Beta 0.197', 'Beta 0.198')

# ── 1. Replace Trade Bar HTML — split button structure ────────────────────────
OLD_TB = (
    '  <!-- DVL Trade Bar — between TF bar and chart -->\n'
    '  <div id="dvlTradeBar">\n'
    '    <div class="dtb-action-row">\n'
    '      <div class="dtb-dd-wrap">\n'
    '        <button class="dtb-btn buy" id="dtbBuyBtn" onclick="window.DVL_PAPER&&DVL_PAPER._openDropdown(\'buy\')">\n'
    '          <span id="dtbBuyLbl">Buy Market</span>\n'
    '          <svg class="dtb-chev" width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,3 5,7 8,3"/></svg>\n'
    '        </button>\n'
    '        <div class="dtb-dropdown" id="dtbBuyMenu">\n'
    '          <button class="dtb-di buy" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'market\')">Buy Market</button>\n'
    '          <button class="dtb-di buy" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'limit\')">Buy Limit</button>\n'
    '          <button class="dtb-di buy" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'stop\')">Buy Stop</button>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dtb-dd-wrap">\n'
    '        <button class="dtb-btn sell" id="dtbSellBtn" onclick="window.DVL_PAPER&&DVL_PAPER._openDropdown(\'sell\')">\n'
    '          <span id="dtbSellLbl">Sell Market</span>\n'
    '          <svg class="dtb-chev" width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,3 5,7 8,3"/></svg>\n'
    '        </button>\n'
    '        <div class="dtb-dropdown" id="dtbSellMenu">\n'
    '          <button class="dtb-di sell" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'market\')">Sell Market</button>\n'
    '          <button class="dtb-di sell" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'limit\')">Sell Limit</button>\n'
    '          <button class="dtb-di sell" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'stop\')">Sell Stop</button>\n'
    '        </div>\n'
    '      </div>\n'
    '    </div>'
)
assert OLD_TB in html, 'trade bar HTML not found'

NEW_TB = (
    '  <!-- DVL Trade Bar — between TF bar and chart -->\n'
    '  <div id="dvlTradeBar">\n'
    '    <div class="dtb-action-row">\n'
    '      <div class="dtb-dd-wrap">\n'
    '        <div class="dtb-split buy">\n'
    '          <button class="dtb-main buy" id="dtbBuyMain" onclick="window.DVL_PAPER&&DVL_PAPER._execCurrent(\'buy\')">\n'
    '            <span id="dtbBuyLbl">Buy Market</span>\n'
    '          </button>\n'
    '          <button class="dtb-arrow buy" id="dtbBuyArrow" onclick="window.DVL_PAPER&&DVL_PAPER._openDropdown(\'buy\')">\n'
    '            <svg class="dtb-chev" width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,3 5,7 8,3"/></svg>\n'
    '          </button>\n'
    '        </div>\n'
    '        <div class="dtb-dropdown" id="dtbBuyMenu">\n'
    '          <button class="dtb-di buy" data-type="market" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'market\')">Buy Market</button>\n'
    '          <button class="dtb-di buy" data-type="limit" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'limit\')">Buy Limit</button>\n'
    '          <button class="dtb-di buy" data-type="stop" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'buy\',\'stop\')">Buy Stop</button>\n'
    '        </div>\n'
    '      </div>\n'
    '      <div class="dtb-dd-wrap">\n'
    '        <div class="dtb-split sell">\n'
    '          <button class="dtb-main sell" id="dtbSellMain" onclick="window.DVL_PAPER&&DVL_PAPER._execCurrent(\'sell\')">\n'
    '            <span id="dtbSellLbl">Sell Market</span>\n'
    '          </button>\n'
    '          <button class="dtb-arrow sell" id="dtbSellArrow" onclick="window.DVL_PAPER&&DVL_PAPER._openDropdown(\'sell\')">\n'
    '            <svg class="dtb-chev" width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,3 5,7 8,3"/></svg>\n'
    '          </button>\n'
    '        </div>\n'
    '        <div class="dtb-dropdown" id="dtbSellMenu">\n'
    '          <button class="dtb-di sell" data-type="market" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'market\')">Sell Market</button>\n'
    '          <button class="dtb-di sell" data-type="limit" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'limit\')">Sell Limit</button>\n'
    '          <button class="dtb-di sell" data-type="stop" onclick="window.DVL_PAPER&&DVL_PAPER._selectType(\'sell\',\'stop\')">Sell Stop</button>\n'
    '        </div>\n'
    '      </div>\n'
    '    </div>'
)
html = html.replace(OLD_TB, NEW_TB, 1)

# ── 2. Replace button CSS — remove .dtb-btn, add .dtb-split/.dtb-main/.dtb-arrow ──
OLD_BTN_CSS = (
    '.dtb-dd-wrap{position:relative;}\n'
    '.dtb-btn{height:28px;font-family:monospace;font-size:11px;font-weight:700;border-radius:4px;cursor:pointer;border:1px solid;letter-spacing:.04em;transition:all .12s;display:flex;align-items:center;justify-content:space-between;padding:0 8px;background:none;width:100%;}\n'
    '.dtb-btn:active{transform:scale(.98);}\n'
    '.dtb-btn.buy{background:rgba(0,200,80,.08);color:#00ff7a;border-color:rgba(0,210,80,.40);}\n'
    '.dtb-btn.buy:hover{background:rgba(0,200,80,.14);}\n'
    '.dtb-btn.sell{background:rgba(220,30,40,.08);color:#ff3355;border-color:rgba(220,40,50,.40);}\n'
    '.dtb-btn.sell:hover{background:rgba(220,30,40,.14);}\n'
    '.dtb-chev{flex-shrink:0;opacity:.55;}'
)
assert OLD_BTN_CSS in html, 'button CSS not found'

NEW_BTN_CSS = (
    '.dtb-dd-wrap{position:relative;}\n'
    '.dtb-split{display:flex;width:100%;height:28px;border-radius:4px;overflow:hidden;}\n'
    '.dtb-split.buy{border:1px solid rgba(0,210,80,.60);background:rgba(0,200,80,.10);box-shadow:0 0 12px rgba(0,210,80,.10);}\n'
    '.dtb-split.sell{border:1px solid rgba(220,40,50,.60);background:rgba(220,30,40,.10);box-shadow:0 0 12px rgba(220,40,50,.10);}\n'
    '.dtb-main{flex:1;background:none;border:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;padding:0 8px;text-align:left;height:100%;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n'
    '.dtb-main.buy{color:#00ff7a;}\n'
    '.dtb-main.buy:hover{background:rgba(0,200,80,.10);}\n'
    '.dtb-main.buy:active{background:rgba(0,200,80,.22);}\n'
    '.dtb-main.sell{color:#ff3355;}\n'
    '.dtb-main.sell:hover{background:rgba(220,30,40,.10);}\n'
    '.dtb-main.sell:active{background:rgba(220,30,40,.22);}\n'
    '.dtb-arrow{width:26px;flex-shrink:0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;height:100%;transition:background .1s;padding:0;}\n'
    '.dtb-arrow.buy{border-left:1px solid rgba(0,210,80,.28);color:rgba(0,255,122,.55);}\n'
    '.dtb-arrow.buy:hover{background:rgba(0,200,80,.15);color:#00ff7a;}\n'
    '.dtb-arrow.buy:active{background:rgba(0,200,80,.28);}\n'
    '.dtb-arrow.sell{border-left:1px solid rgba(220,40,50,.28);color:rgba(255,51,85,.55);}\n'
    '.dtb-arrow.sell:hover{background:rgba(220,30,40,.15);color:#ff3355;}\n'
    '.dtb-arrow.sell:active{background:rgba(220,30,40,.28);}\n'
    '.dtb-chev{flex-shrink:0;}'
)
html = html.replace(OLD_BTN_CSS, NEW_BTN_CSS, 1)

# ── 3. Add .dtb-di.active styles after the hover styles ──────────────────────
OLD_DI_HOVER = (
    '.dtb-di.buy:hover{color:#00ff7a;background:rgba(0,200,80,.06);}\n'
    '.dtb-di.sell:hover{color:#ff3355;background:rgba(220,30,40,.06);}'
)
assert OLD_DI_HOVER in html, 'dtb-di hover CSS not found'
NEW_DI_HOVER = (
    '.dtb-di.buy:hover{color:#00ff7a;background:rgba(0,200,80,.06);}\n'
    '.dtb-di.sell:hover{color:#ff3355;background:rgba(220,30,40,.06);}\n'
    '.dtb-di.active{background:rgba(255,255,255,.04);}\n'
    '.dtb-di.buy.active{color:#00ff7a;}\n'
    '.dtb-di.sell.active{color:#ff3355;}'
)
html = html.replace(OLD_DI_HOVER, NEW_DI_HOVER, 1)

# ── 4. Add per-side type state variables ──────────────────────────────────────
OLD_PENDING_VAR = 'var _pendingLine=null;'
assert OLD_PENDING_VAR in html, '_pendingLine var not found'
html = html.replace(
    OLD_PENDING_VAR,
    'var _pendingLine=null;\nvar _buyType=\'market\',_sellType=\'market\';',
    1
)

# ── 5. Replace _openDropdown — mark active items when opening ─────────────────
OLD_OPEN_DD = (
    'function _openDropdown(side){\n'
    '  var buyM=document.getElementById(\'dtbBuyMenu\');\n'
    '  var sellM=document.getElementById(\'dtbSellMenu\');\n'
    '  if(side===\'buy\'){\n'
    '    if(buyM)buyM.classList.toggle(\'open\');\n'
    '    if(sellM)sellM.classList.remove(\'open\');\n'
    '  } else {\n'
    '    if(sellM)sellM.classList.toggle(\'open\');\n'
    '    if(buyM)buyM.classList.remove(\'open\');\n'
    '  }\n'
    '}'
)
assert OLD_OPEN_DD in html, '_openDropdown not found'
NEW_OPEN_DD = (
    'function _openDropdown(side){\n'
    '  var buyM=document.getElementById(\'dtbBuyMenu\');\n'
    '  var sellM=document.getElementById(\'dtbSellMenu\');\n'
    '  function _markActive(menu,curType){\n'
    '    if(!menu)return;\n'
    '    var items=menu.querySelectorAll(\'.dtb-di\');\n'
    '    for(var k=0;k<items.length;k++)\n'
    '      items[k].classList.toggle(\'active\',items[k].getAttribute(\'data-type\')===curType);\n'
    '  }\n'
    '  if(side===\'buy\'){\n'
    '    if(buyM){buyM.classList.toggle(\'open\');if(buyM.classList.contains(\'open\'))_markActive(buyM,_buyType);}\n'
    '    if(sellM)sellM.classList.remove(\'open\');\n'
    '  } else {\n'
    '    if(sellM){sellM.classList.toggle(\'open\');if(sellM.classList.contains(\'open\'))_markActive(sellM,_sellType);}\n'
    '    if(buyM)buyM.classList.remove(\'open\');\n'
    '  }\n'
    '}'
)
html = html.replace(OLD_OPEN_DD, NEW_OPEN_DD, 1)

# ── 6. Replace _selectType — update label/type only, do NOT execute ───────────
OLD_SELECT = (
    'function _selectType(side,type){\n'
    '  _closeDropdowns();\n'
    '  ST.settings.orderType=type;\n'
    '  var capType=type.charAt(0).toUpperCase()+type.slice(1);\n'
    '  var lbl=document.getElementById(side===\'buy\'?\'dtbBuyLbl\':\'dtbSellLbl\');\n'
    '  if(lbl)lbl.textContent=(side===\'buy\'?\'Buy \':\'Sell \')+capType;\n'
    '  var otEl=document.getElementById(\'ppOrderType\');\n'
    '  if(otEl)otEl.value=type;\n'
    '  if(type===\'market\'){\n'
    '    _submitOrder(side);\n'
    '  } else {\n'
    '    _startPending(side,type);\n'
    '  }\n'
    '  _save();\n'
    '}'
)
assert OLD_SELECT in html, '_selectType not found'
NEW_SELECT = (
    'function _selectType(side,type){\n'
    '  _closeDropdowns();\n'
    '  if(side===\'buy\')_buyType=type; else _sellType=type;\n'
    '  ST.settings.orderType=type;\n'
    '  var capType=type.charAt(0).toUpperCase()+type.slice(1);\n'
    '  var lbl=document.getElementById(side===\'buy\'?\'dtbBuyLbl\':\'dtbSellLbl\');\n'
    '  if(lbl)lbl.textContent=(side===\'buy\'?\'Buy \':\'Sell \')+capType;\n'
    '  var otEl=document.getElementById(\'ppOrderType\');\n'
    '  if(otEl)otEl.value=type;\n'
    '  _save();\n'
    '}\n'
    'function _execCurrent(side){\n'
    '  var type=side===\'buy\'?_buyType:_sellType;\n'
    '  if(type===\'market\'){\n'
    '    _submitOrder(side);\n'
    '  } else {\n'
    '    _startPending(side,type);\n'
    '  }\n'
    '}'
)
html = html.replace(OLD_SELECT, NEW_SELECT, 1)

# ── 7. Update _initTradeBar — init per-side type variables ────────────────────
OLD_INIT_TB = (
    'function _initTradeBar(){\n'
    '  var set=ST.settings;\n'
    '  var rp=document.getElementById(\'ppRiskPct\');\n'
    '  if(rp)rp.value=set.riskPct||1;\n'
    '  var otEl=document.getElementById(\'ppOrderType\');\n'
    '  if(otEl)otEl.value=set.orderType||\'market\';\n'
    '}'
)
assert OLD_INIT_TB in html, '_initTradeBar not found'
NEW_INIT_TB = (
    'function _initTradeBar(){\n'
    '  var set=ST.settings;\n'
    '  var rp=document.getElementById(\'ppRiskPct\');\n'
    '  if(rp)rp.value=set.riskPct||1;\n'
    '  var otEl=document.getElementById(\'ppOrderType\');\n'
    '  if(otEl)otEl.value=set.orderType||\'market\';\n'
    '  _buyType=\'market\';_sellType=\'market\';\n'
    '}'
)
html = html.replace(OLD_INIT_TB, NEW_INIT_TB, 1)

# ── 8. Update exports — add _execCurrent ─────────────────────────────────────
OLD_EXPORTS = (
    '  _openDropdown:_openDropdown,_selectType:_selectType,_startPending:_startPending,_confirmPending:_confirmPending,_cancelPending:_cancelPending\n'
    '};'
)
assert OLD_EXPORTS in html, 'exports not found'
NEW_EXPORTS = (
    '  _openDropdown:_openDropdown,_selectType:_selectType,_execCurrent:_execCurrent,\n'
    '  _startPending:_startPending,_confirmPending:_confirmPending,_cancelPending:_cancelPending\n'
    '};'
)
html = html.replace(OLD_EXPORTS, NEW_EXPORTS, 1)

# ── 9. Update console log version ─────────────────────────────────────────────
html = html.replace(
    "console.log('[DVL Paper] v0.197 ready",
    "console.log('[DVL Paper] v0.198 ready"
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_198.py applied — Beta 0.198')
print('  + Split button: main area=execute, ▼ arrow=open dropdown only')
print('  + _execCurrent(side): executes with per-side tracked type')
print('  + _selectType: updates label only — no longer executes')
print('  + Active item highlighted in dropdown (data-type attr)')
print('  + Vivid green/red: border 60% opacity, background 10%, glow shadow')
print('  + _buyType/_sellType: independent per-side order type tracking')
