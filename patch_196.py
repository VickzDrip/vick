#!/usr/bin/env python3
"""patch_196.py — Beta 0.196: Robust TP/SL trigger with backup interval check"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.195') >= 5, f'count={html.count("Beta 0.195")}'
html = html.replace('Beta 0.195', 'Beta 0.196')

# ── 1. Replace onTick — add direct price comparison + Number coercion ─────────
OLD_ONTICK = (
    'function onTick(price,sym){\n'
    '  sym=sym||_sym();\n'
    '  ST.lastPriceBySymbol[sym]=price;\n'
    '  /* track intra-candle extreme so TP/SL fires even if exact tick was missed */\n'
    '  if(_canLo[sym]===undefined||price<_canLo[sym])_canLo[sym]=price;\n'
    '  if(_canHi[sym]===undefined||price>_canHi[sym])_canHi[sym]=price;\n'
    '  var _lo=_canLo[sym],_hi=_canHi[sym];\n'
    '  var changed=false;\n'
    '  for(var i=ST.positions.length-1;i>=0;i--){\n'
    '    var pos=ST.positions[i];\n'
    '    if(pos.symbol!==sym)continue;\n'
    '    pos.unrealizedPnl=_upnl(pos);\n'
    '    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;\n'
    '    /* TP/SL: check current price AND candle extreme (catches fast wicks) */\n'
    '    var _hitTP=pos.takeProfit!=null&&(pos.side===\'long\'?_hi>=pos.takeProfit:_lo<=pos.takeProfit);\n'
    '    var _hitSL=pos.stopLoss!=null&&(pos.side===\'long\'?_lo<=pos.stopLoss:_hi>=pos.stopLoss);\n'
    '    if(_hitTP){_doClose(pos.id,\'tp\',pos.takeProfit);continue;}\n'
    '    if(_hitSL){_doClose(pos.id,\'sl\',pos.stopLoss);continue;}\n'
    '    /* liquidation */\n'
    '    if(pos.liquidationPrice){\n'
    '      var liqHit=pos.side===\'long\'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;\n'
    '      if(liqHit){_doClose(pos.id,\'liq\',pos.liquidationPrice);continue;}\n'
    '    }\n'
    '    changed=true;\n'
    '  }\n'
    '  if(changed&&!_renderTimer)_renderTimer=setTimeout(function(){_renderTimer=null;_renderLive();},200);\n'
    '}'
)
assert OLD_ONTICK in html, 'onTick not found'
NEW_ONTICK = (
    'function onTick(price,sym){\n'
    '  sym=sym||_sym();\n'
    '  if(!price||isNaN(price))return;\n'
    '  ST.lastPriceBySymbol[sym]=price;\n'
    '  _canLo[sym]=(_canLo[sym]===undefined)?price:Math.min(_canLo[sym],price);\n'
    '  _canHi[sym]=(_canHi[sym]===undefined)?price:Math.max(_canHi[sym],price);\n'
    '  var _lo=_canLo[sym],_hi=_canHi[sym];\n'
    '  var changed=false;\n'
    '  for(var i=ST.positions.length-1;i>=0;i--){\n'
    '    var pos=ST.positions[i];\n'
    '    if(pos.symbol!==sym)continue;\n'
    '    pos.unrealizedPnl=_upnl(pos);\n'
    '    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;\n'
    '    var _tp=pos.takeProfit!=null?+pos.takeProfit:null;\n'
    '    var _sl=pos.stopLoss!=null?+pos.stopLoss:null;\n'
    '    var _hitTP=_tp!=null&&!isNaN(_tp)&&(pos.side===\'long\'?_hi>=_tp:_lo<=_tp);\n'
    '    var _hitSL=_sl!=null&&!isNaN(_sl)&&(pos.side===\'long\'?_lo<=_sl:_hi>=_sl);\n'
    '    if(_hitTP){_doClose(pos.id,\'tp\',_tp);continue;}\n'
    '    if(_hitSL){_doClose(pos.id,\'sl\',_sl);continue;}\n'
    '    if(pos.liquidationPrice){\n'
    '      var liqHit=pos.side===\'long\'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;\n'
    '      if(liqHit){_doClose(pos.id,\'liq\',pos.liquidationPrice);continue;}\n'
    '    }\n'
    '    changed=true;\n'
    '  }\n'
    '  if(changed&&!_renderTimer)_renderTimer=setTimeout(function(){_renderTimer=null;_renderLive();},200);\n'
    '}'
)
html = html.replace(OLD_ONTICK, NEW_ONTICK, 1)

# ── 2. Add _checkTPSL() + update init() ───────────────────────────────────────
OLD_INIT_FULL = (
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
assert OLD_INIT_FULL in html, 'init() not found'
NEW_INIT_FULL = (
    'function _checkTPSL(){\n'
    '  if(!ST.enabled||!ST.positions.length)return;\n'
    '  var syms=Object.keys(ST.lastPriceBySymbol);\n'
    '  for(var si=0;si<syms.length;si++){\n'
    '    var sym=syms[si];\n'
    '    var price=ST.lastPriceBySymbol[sym];\n'
    '    if(!price||isNaN(price))continue;\n'
    '    for(var i=ST.positions.length-1;i>=0;i--){\n'
    '      var pos=ST.positions[i];\n'
    '      if(pos.symbol!==sym)continue;\n'
    '      var _tp=pos.takeProfit!=null?+pos.takeProfit:null;\n'
    '      var _sl=pos.stopLoss!=null?+pos.stopLoss:null;\n'
    '      var hitTP=_tp!=null&&!isNaN(_tp)&&(pos.side===\'long\'?price>=_tp:price<=_tp);\n'
    '      var hitSL=_sl!=null&&!isNaN(_sl)&&(pos.side===\'long\'?price<=_sl:price>=_sl);\n'
    '      if(hitTP){_doClose(pos.id,\'tp\',_tp);break;}\n'
    '      if(hitSL){_doClose(pos.id,\'sl\',_sl);break;}\n'
    '    }\n'
    '  }\n'
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
    '  setInterval(_checkTPSL,1000);\n'
    '  console.log(\'[DVL Paper] v0.196 ready — balance:\',ST.account.balance,ST.account.currency);\n'
    '}'
)
html = html.replace(OLD_INIT_FULL, NEW_INIT_FULL, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_196.py applied — Beta 0.196')
print('  + onTick: NaN guard, explicit Number coercion for TP/SL comparison')
print('  + _checkTPSL: backup setInterval(1s) against last known price for ALL symbols')
