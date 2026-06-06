#!/usr/bin/env python3
"""patch_181.py — Beta 0.181: Fix regressions mobile + trading logic

Correções:
1. Labels TP/SL: sem background block, apenas texto com sombra
2. Buy/Sell flutuantes: voltam ao ecrã, toggle eye sempre funciona
3. Cores Buy=verde / Sell=vermelho mais vívidas
4. Drag TP/SL não arrasta o gráfico (stopPropagation + flag global)
5. TP/SL executa no tick (não só no fecho de vela)
6. Limit/Stop: linha preview no gráfico ao digitar o preço
7. 24H High/Low: visível por default no mobile
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.180') >= 10, f'count={html.count("Beta 0.180")}'
html = html.replace('Beta 0.180', 'Beta 0.181')

# ── 1. _drawLineLabel: sem background, texto puro com sombra ─────────────────
OLD_LABEL = (
    '  ctx.fillStyle=bgColor;ctx.fillRect(lx,ly,lw,lh);\n'
    '  ctx.fillStyle=borderColor;ctx.fillRect(lx,ly,2,lh);\n'
    '  ctx.fillStyle=borderColor;ctx.textAlign=\'left\';\n'
    '  ctx.fillText(text,lx+5,ly+lh-3);\n'
    '  if(hasClose){\n'
    '    ctx.fillStyle=\'rgba(200,100,50,.85)\';\n'
    '    ctx.fillText(\'x\',lx+lw-14,ly+lh-3);\n'
    '  }'
)
assert OLD_LABEL in html, '_drawLineLabel body not found'
html = html.replace(OLD_LABEL,
    '  /* text-only label with drop shadow for readability */\n'
    '  ctx.shadowColor=\'rgba(0,0,0,0.95)\';ctx.shadowBlur=5;\n'
    '  ctx.fillStyle=borderColor;ctx.textAlign=\'left\';\n'
    '  ctx.fillText(text,lx+5,ly+lh-3);\n'
    '  ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    '  if(hasClose){\n'
    '    ctx.shadowColor=\'rgba(0,0,0,0.9)\';ctx.shadowBlur=4;\n'
    '    ctx.fillStyle=\'rgba(255,140,80,1)\';\n'
    '    ctx.fillText(\'x\',lx+lw-14,ly+lh-3);\n'
    '    ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    '  }',
    1
)

# ── 2. drawOverlay: não sair cedo se hover preview de limit ──────────────────
OLD_EARLY_RETURN = (
    '  if(!positions.length&&!orders.length)return;'
)
assert OLD_EARLY_RETURN in html, 'drawOverlay early return not found'
html = html.replace(OLD_EARLY_RETURN,
    '  var _lpEl=document.getElementById(\'ppLimitPx\');\n'
    '  var _lpVal=_lpEl?parseFloat(_lpEl.value):NaN;\n'
    '  var _lpActive=!isNaN(_lpVal)&&_lpVal>0&&ST.settings&&ST.settings.orderType!==\'market\';\n'
    '  if(!positions.length&&!orders.length&&!_lpActive)return;',
    1
)

# ── 3. drawOverlay: desenhar linha preview de limit/stop ──────────────────────
OLD_CTX_RESTORE = (
    '  ctx.restore();\n'
    '}'
)
# Use the one inside drawOverlay (the last ctx.restore before the function ends)
# Find it by context
OLD_ORDERS_RESTORE = (
    '  orders.forEach(function(o){\n'
    '    if(!o.price)return;\n'
    '    var yO=sc.y(o.price);if(yO<-10||yO>H+10)return;\n'
    '    var col=o.side===\'buy\'?\'rgba(0,200,100,.5)\':\'rgba(200,60,40,.5)\';\n'
    '    ctx.lineWidth=1;ctx.strokeStyle=col;ctx.setLineDash([2,4]);\n'
    '    ctx.beginPath();ctx.moveTo(0,yO);ctx.lineTo(xR,yO);ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '    ctx.fillStyle=col.replace(\'.5\',\'.85\');ctx.textAlign=\'left\';ctx.textBaseline=\'alphabetic\';\n'
    '    ctx.fillText((o.side===\'buy\'?\'Buy\':\'Sell\')+\' \'+o.type+\' \'+_f(o.price,4),6,yO-3);\n'
    '  });\n'
    '\n'
    '  ctx.restore();\n'
    '}'
)
assert OLD_ORDERS_RESTORE in html, 'orders.forEach + ctx.restore not found'
html = html.replace(OLD_ORDERS_RESTORE,
    '  orders.forEach(function(o){\n'
    '    if(!o.price)return;\n'
    '    var yO=sc.y(o.price);if(yO<-10||yO>H+10)return;\n'
    '    var col=o.side===\'buy\'?\'rgba(0,200,100,.5)\':\'rgba(200,60,40,.5)\';\n'
    '    ctx.lineWidth=1;ctx.strokeStyle=col;ctx.setLineDash([2,4]);\n'
    '    ctx.beginPath();ctx.moveTo(0,yO);ctx.lineTo(xR,yO);ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '    ctx.fillStyle=col.replace(\'.5\',\'.85\');ctx.textAlign=\'left\';ctx.textBaseline=\'alphabetic\';\n'
    '    ctx.fillText((o.side===\'buy\'?\'Buy\':\'Sell\')+\' \'+o.type+\' \'+_f(o.price,4),6,yO-3);\n'
    '  });\n'
    '\n'
    '  /* Limit/Stop price preview line */\n'
    '  if(_lpActive){\n'
    '    var yLP=sc.y(_lpVal);\n'
    '    if(yLP>=-10&&yLP<=H+10){\n'
    '      ctx.lineWidth=1;ctx.setLineDash([5,4]);\n'
    '      ctx.strokeStyle=\'rgba(255,200,50,0.65)\';\n'
    '      ctx.beginPath();ctx.moveTo(0,yLP);ctx.lineTo(xR,yLP);ctx.stroke();\n'
    '      ctx.setLineDash([]);\n'
    '      var _ltype=(ST.settings.orderType||\'limit\').toUpperCase();\n'
    '      ctx.font=\'bold 9px monospace\';ctx.textAlign=\'left\';ctx.textBaseline=\'alphabetic\';\n'
    '      ctx.shadowColor=\'rgba(0,0,0,0.9)\';ctx.shadowBlur=4;\n'
    '      ctx.fillStyle=\'rgba(255,210,60,0.9)\';\n'
    '      ctx.fillText(_ltype+\' @ \'+_f(_lpVal,4)+ \' — click Buy/Sell to place\',6,yLP-4);\n'
    '      ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    '      /* check marker */\n'
    '      ctx.font=\'bold 11px monospace\';ctx.fillStyle=\'rgba(80,220,120,1)\';\n'
    '      ctx.shadowColor=\'rgba(0,0,0,0.9)\';ctx.shadowBlur=4;\n'
    '      ctx.fillText(\'v\',xR-22,yLP+4);\n'
    '      ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    '    }\n'
    '  }\n'
    '\n'
    '  ctx.restore();\n'
    '}',
    1
)

# ── 4. onTick: verificar TP/SL a cada tick ────────────────────────────────────
OLD_ONTICK_BODY = (
    '    pos.unrealizedPnl=_upnl(pos);\n'
    '    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;\n'
    '    if(pos.liquidationPrice){\n'
    '      var liqHit=pos.side===\'long\'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;\n'
    '      if(liqHit){_doClose(pos.id,\'liq\',pos.liquidationPrice);continue;}\n'
    '    }\n'
    '    changed=true;'
)
assert OLD_ONTICK_BODY in html, 'onTick body not found'
html = html.replace(OLD_ONTICK_BODY,
    '    pos.unrealizedPnl=_upnl(pos);\n'
    '    pos.roe=pos.margin>0?pos.unrealizedPnl/pos.margin*100:0;\n'
    '    /* TP/SL check on every tick */\n'
    '    var _hitTP=pos.takeProfit!=null&&(pos.side===\'long\'?price>=pos.takeProfit:price<=pos.takeProfit);\n'
    '    var _hitSL=pos.stopLoss!=null&&(pos.side===\'long\'?price<=pos.stopLoss:price>=pos.stopLoss);\n'
    '    if(_hitTP){_doClose(pos.id,\'tp\',pos.takeProfit);continue;}\n'
    '    if(_hitSL){_doClose(pos.id,\'sl\',pos.stopLoss);continue;}\n'
    '    /* liquidation */\n'
    '    if(pos.liquidationPrice){\n'
    '      var liqHit=pos.side===\'long\'?price<=pos.liquidationPrice:price>=pos.liquidationPrice;\n'
    '      if(liqHit){_doClose(pos.id,\'liq\',pos.liquidationPrice);continue;}\n'
    '    }\n'
    '    changed=true;',
    1
)

# ── 5. _initDrag: stopPropagation + flag global ───────────────────────────────
# Close button hit: add stopPropagation
OLD_CLOSE_HIT = (
    '        e.preventDefault();_doClose(b.posId,\'manual\');return;'
)
assert OLD_CLOSE_HIT in html, 'close hit anchor not found'
html = html.replace(OLD_CLOSE_HIT,
    '        e.preventDefault();e.stopPropagation();_doClose(b.posId,\'manual\');return;',
    1
)

# Drag start: add stopPropagation + flag
OLD_DRAG_START = (
    '        e.preventDefault();\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy};\n'
    '        return;'
)
assert OLD_DRAG_START in html, 'drag start anchor not found'
html = html.replace(OLD_DRAG_START,
    '        e.preventDefault();e.stopPropagation();\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy};\n'
    '        window._dvlPaperDragging=true;\n'
    '        return;',
    1
)

# Move: add stopPropagation
OLD_MOVE_BODY = (
    '  function _move(e){\n'
    '    if(!_drag||!_scRef)return;\n'
    '    e.preventDefault();'
)
assert OLD_MOVE_BODY in html, '_move anchor not found'
html = html.replace(OLD_MOVE_BODY,
    '  function _move(e){\n'
    '    if(!_drag||!_scRef)return;\n'
    '    e.preventDefault();e.stopPropagation();',
    1
)

# End: clear flag
OLD_END_BODY = (
    '  function _end(){\n'
    '    if(!_drag)return;\n'
    '    _save();_drag=null;\n'
    '  }'
)
assert OLD_END_BODY in html, '_end anchor not found'
html = html.replace(OLD_END_BODY,
    '  function _end(){\n'
    '    window._dvlPaperDragging=false;\n'
    '    if(!_drag)return;\n'
    '    _save();_drag=null;\n'
    '  }',
    1
)

# ── 6. _updateQuickVis: mostrar botões independente de ST.enabled ─────────────
OLD_QUICK_VIS = (
    '  if(ST.enabled&&ST.quickVisible)qb.classList.add(\'pp-qvis\');\n'
    '  else qb.classList.remove(\'pp-qvis\');'
)
assert OLD_QUICK_VIS in html, '_updateQuickVis enabled check not found'
html = html.replace(OLD_QUICK_VIS,
    '  if(ST.quickVisible)qb.classList.add(\'pp-qvis\');\n'
    '  else qb.classList.remove(\'pp-qvis\');',
    1
)

# ── 7. _quickOrder: auto-enable ao usar botões flutuantes ─────────────────────
OLD_QUICK_ORDER = (
    'function _quickOrder(side){\n'
    '  _saveSettings();\n'
    '  placeOrder({side:side,type:ST.settings.orderType||\'market\'});\n'
    '}'
)
assert OLD_QUICK_ORDER in html, '_quickOrder anchor not found'
html = html.replace(OLD_QUICK_ORDER,
    'function _quickOrder(side){\n'
    '  if(!ST.enabled){ST.enabled=true;_save();}\n'
    '  _saveSettings();\n'
    '  placeOrder({side:side,type:ST.settings.orderType||\'market\'});\n'
    '}',
    1
)

# ── 8. 24H stats: visível por default no mobile (collapsed='0') ───────────────
OLD_INIT_24H = (
    "  /* Default collapsed on first mobile visit */\n"
    "  if(collapsed===null)collapsed='1';"
)
assert OLD_INIT_24H in html, '24H init script not found'
html = html.replace(OLD_INIT_24H,
    "  /* Default expanded on first mobile visit */\n"
    "  if(collapsed===null)collapsed='0';",
    1
)

# ── 9. CSS: cores Buy/Sell mais vívidas + fix ppQuickBtns sempre visível ──────
OLD_QBTN_CSS = (
    '.pp-qbtn.buy{background:rgba(0,180,80,.18);color:#00e676;border-color:rgba(0,200,90,.5);}\n'
    '.pp-qbtn.sell{background:rgba(200,40,50,.18);color:#ff3d57;border-color:rgba(220,60,60,.5);}'
)
assert OLD_QBTN_CSS in html, 'pp-qbtn color CSS not found'
html = html.replace(OLD_QBTN_CSS,
    '.pp-qbtn.buy{background:rgba(0,200,80,.28)!important;color:#00ff6e!important;border-color:rgba(0,220,90,.65)!important;text-shadow:0 0 8px rgba(0,255,100,.5);}\n'
    '.pp-qbtn.sell{background:rgba(230,30,40,.28)!important;color:#ff2244!important;border-color:rgba(240,50,50,.65)!important;text-shadow:0 0 8px rgba(255,30,60,.5);}',
    1
)

# ── 10. CSS: remover a regra que escondia 24H stats por default ───────────────
OLD_STATS_HIDE = (
    '  /* ── 24H stats: collapsed by default on mobile (JS restores from localStorage) ── */\n'
    '  .tb-price-stats:not(.tb-stats-force-open){display:none;}'
)
assert OLD_STATS_HIDE in html, '24H stats hide CSS not found'
html = html.replace(OLD_STATS_HIDE,
    '  /* ── 24H stats: visible by default on mobile, user can collapse with toggle ── */\n'
    '  /* .tb-price-stats handled by JS toggle only */',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_181.py applied — Beta 0.181')
print('  Labels TP/SL: sem background, texto+sombra apenas')
print('  Buy/Sell flutuantes: visíveis sem depender de ST.enabled')
print('  Cores Buy=verde / Sell=vermelho mais vívidas')
print('  Drag stopPropagation + window._dvlPaperDragging flag')
print('  TP/SL executam no tick (não só no candle close)')
print('  Limite/Stop: preview line no gráfico')
print('  24H stats: visível por default no mobile')
