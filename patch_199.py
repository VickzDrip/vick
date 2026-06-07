#!/usr/bin/env python3
"""patch_199.py — Beta 0.199: Fully filled buttons + draggable pending-order TP/SL"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.198') >= 10, f'count={html.count("Beta 0.198")}'
html = html.replace('Beta 0.198', 'Beta 0.199')

# ── 1. Fully filled button colors ─────────────────────────────────────────────
OLD_FILL_CSS = (
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
assert OLD_FILL_CSS in html, 'button fill CSS not found'

NEW_FILL_CSS = (
    '.dtb-split.buy{border:1px solid rgba(0,195,75,.45);background:rgba(0,160,58,.80);box-shadow:0 0 14px rgba(0,200,70,.18);}\n'
    '.dtb-split.sell{border:1px solid rgba(215,35,50,.50);background:rgba(188,22,38,.80);box-shadow:0 0 14px rgba(210,35,50,.18);}\n'
    '.dtb-main{flex:1;background:none;border:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:.04em;cursor:pointer;padding:0 8px;text-align:left;height:100%;transition:background .1s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n'
    '.dtb-main.buy{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);}\n'
    '.dtb-main.buy:hover{background:rgba(255,255,255,.08);}\n'
    '.dtb-main.buy:active{background:rgba(255,255,255,.18);}\n'
    '.dtb-main.sell{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4);}\n'
    '.dtb-main.sell:hover{background:rgba(255,255,255,.08);}\n'
    '.dtb-main.sell:active{background:rgba(255,255,255,.18);}\n'
    '.dtb-arrow{width:26px;flex-shrink:0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;height:100%;transition:background .1s;padding:0;}\n'
    '.dtb-arrow.buy{border-left:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.80);}\n'
    '.dtb-arrow.buy:hover{background:rgba(255,255,255,.12);color:#fff;}\n'
    '.dtb-arrow.buy:active{background:rgba(255,255,255,.22);}\n'
    '.dtb-arrow.sell{border-left:1px solid rgba(255,255,255,.22);color:rgba(255,255,255,.80);}\n'
    '.dtb-arrow.sell:hover{background:rgba(255,255,255,.12);color:#fff;}\n'
    '.dtb-arrow.sell:active{background:rgba(255,255,255,.22);}\n'
    '.dtb-chev{flex-shrink:0;}'
)
html = html.replace(OLD_FILL_CSS, NEW_FILL_CSS, 1)

# ── 2. Add scRef update for pending orders (no positions, no pendingLine) ──────
OLD_SCREF = (
    '  /* Update scale ref for drag */\n'
    '  if(positions.length){\n'
    '    var _rp0=positions[0].entryPrice;\n'
    '    var _ry0=sc.y(_rp0);\n'
    '    var _rp1=_rp0*1.001;\n'
    '    var _ry1=sc.y(_rp1);\n'
    '    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};\n'
    '  } else if(_pendingLine){\n'
    '    var _rp0=_pendingLine.price;\n'
    '    var _ry0=sc.y(_rp0);\n'
    '    var _rp1=_rp0*1.001;\n'
    '    var _ry1=sc.y(_rp1);\n'
    '    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};\n'
    '  }'
)
assert OLD_SCREF in html, 'scRef update not found'

NEW_SCREF = (
    '  /* Update scale ref for drag */\n'
    '  if(positions.length){\n'
    '    var _rp0=positions[0].entryPrice;\n'
    '    var _ry0=sc.y(_rp0);\n'
    '    var _rp1=_rp0*1.001;\n'
    '    var _ry1=sc.y(_rp1);\n'
    '    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};\n'
    '  } else if(_pendingLine){\n'
    '    var _rp0=_pendingLine.price;\n'
    '    var _ry0=sc.y(_rp0);\n'
    '    var _rp1=_rp0*1.001;\n'
    '    var _ry1=sc.y(_rp1);\n'
    '    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};\n'
    '  } else if(orders.length){\n'
    '    var _rp0=orders[0].price;\n'
    '    var _ry0=sc.y(_rp0);\n'
    '    var _rp1=_rp0*1.001;\n'
    '    var _ry1=sc.y(_rp1);\n'
    '    if(_ry1!==_ry0)_scRef={refY:_ry0,refP:_rp0,dpDy:(_rp1-_rp0)/(_ry1-_ry0)};\n'
    '  }'
)
html = html.replace(OLD_SCREF, NEW_SCREF, 1)

# ── 3. Replace pending orders drawing — make TP/SL/entry draggable ────────────
OLD_ORDERS_DRAW = (
    '  /* pending orders — draw entry + TP/SL lines */\n'
    '  orders.forEach(function(o){\n'
    '    if(!o.price)return;\n'
    '    var yO=sc.y(o.price);if(yO<-10||yO>H+10)return;\n'
    '    var col=o.side===\'buy\'?\'rgba(0,200,100,.5)\':\'rgba(200,60,40,.5)\';\n'
    '    ctx.lineWidth=1;ctx.strokeStyle=col;ctx.setLineDash([2,4]);\n'
    '    ctx.beginPath();ctx.moveTo(0,yO);ctx.lineTo(xR,yO);ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '    ctx.fillStyle=col.replace(\'.5\',\'.85\');ctx.textAlign=\'left\';ctx.textBaseline=\'alphabetic\';\n'
    '    ctx.fillText((o.side===\'buy\'?\'Buy\':\'Sell\')+\' \'+o.type+\' \'+_f(o.price,4),6,yO-3);\n'
    '    if(o.tp){var yOTP=sc.y(o.tp);if(yOTP>=-10&&yOTP<=H+10){\n'
    '      ctx.lineWidth=1;ctx.strokeStyle=\'rgba(0,200,100,.35)\';ctx.setLineDash([2,3]);\n'
    '      ctx.beginPath();ctx.moveTo(0,yOTP);ctx.lineTo(xR,yOTP);ctx.stroke();\n'
    '      ctx.setLineDash([]);ctx.fillStyle=\'rgba(0,200,100,.55)\';\n'
    '      ctx.fillText(\'TP \'+_f(o.tp,4),6,yOTP-3);\n'
    '    }}\n'
    '    if(o.sl){var yOSL=sc.y(o.sl);if(yOSL>=-10&&yOSL<=H+10){\n'
    '      ctx.lineWidth=1;ctx.strokeStyle=\'rgba(220,80,50,.35)\';ctx.setLineDash([2,3]);\n'
    '      ctx.beginPath();ctx.moveTo(0,yOSL);ctx.lineTo(xR,yOSL);ctx.stroke();\n'
    '      ctx.setLineDash([]);ctx.fillStyle=\'rgba(220,100,70,.55)\';\n'
    '      ctx.fillText(\'SL \'+_f(o.sl,4),6,yOSL-3);\n'
    '    }}\n'
    '  });'
)
assert OLD_ORDERS_DRAW in html, 'orders drawing not found'

NEW_ORDERS_DRAW = (
    '  /* pending orders — draggable TP/SL/entry lines */\n'
    '  orders.forEach(function(o){\n'
    '    if(!o.price)return;\n'
    '    var yO=sc.y(o.price);if(yO<-10||yO>H+10)return;\n'
    '    var isBuy=o.side===\'buy\';\n'
    '    var oId=\'ord_\'+o.id;\n'
    '    var entryCol=isBuy?\'rgba(0,210,110,.85)\':\'rgba(210,60,45,.85)\';\n'
    '    /* TP — draggable */\n'
    '    if(o.tp!=null){var yOTP=sc.y(o.tp);if(yOTP>=-10&&yOTP<=H+10){\n'
    '      ctx.lineWidth=1;ctx.strokeStyle=\'rgba(0,200,100,.75)\';ctx.setLineDash([]);\n'
    '      ctx.beginPath();ctx.moveTo(0,yOTP);ctx.lineTo(xR,yOTP);ctx.stroke();\n'
    '      _drawLineLabel(ctx,xR,yOTP,\'rgba(0,25,15,.85)\',\'rgba(0,200,100,.95)\',\'TP \'+_f(o.tp,4),oId,\'tp\',false);\n'
    '    }}\n'
    '    /* SL — draggable */\n'
    '    if(o.sl!=null){var yOSL=sc.y(o.sl);if(yOSL>=-10&&yOSL<=H+10){\n'
    '      ctx.lineWidth=1;ctx.strokeStyle=\'rgba(220,80,50,.75)\';ctx.setLineDash([]);\n'
    '      ctx.beginPath();ctx.moveTo(0,yOSL);ctx.lineTo(xR,yOSL);ctx.stroke();\n'
    '      _drawLineLabel(ctx,xR,yOSL,\'rgba(25,8,4,.85)\',\'rgba(220,100,70,.95)\',\'SL \'+_f(o.sl,4),oId,\'sl\',false);\n'
    '    }}\n'
    '    /* Entry — draggable (adjusts pending price) */\n'
    '    ctx.lineWidth=1;ctx.strokeStyle=entryCol;ctx.setLineDash([3,4]);\n'
    '    ctx.beginPath();ctx.moveTo(0,yO);ctx.lineTo(xR,yO);ctx.stroke();\n'
    '    ctx.setLineDash([]);\n'
    '    var oLbl=(isBuy?\'Buy\':\'Sell\')+\' \'+o.type+\' \'+_f(o.price,4);\n'
    '    _drawLineLabel(ctx,xR,yO,\'rgba(4,10,22,.85)\',entryCol,oLbl,oId,\'entry\',false);\n'
    '  });'
)
html = html.replace(OLD_ORDERS_DRAW, NEW_ORDERS_DRAW, 1)

# ── 4. Update _initDrag._start — include pending order entry drag ──────────────
OLD_START_TPSL = (
    '    /* check drag handles for TP/SL on open positions */\n'
    '    for(var j=0;j<_drawCache.length;j++){\n'
    '      var bb=_drawCache[j];\n'
    '      if(bb.posId!==\'_pending\'&&(bb.field===\'tp\'||bb.field===\'sl\')&&Math.abs(cy-bb.lineY)<=10){\n'
    '        e.preventDefault();e.stopPropagation();\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy};\n'
    '        window._dvlPaperDragging=true;\n'
    '        return;\n'
    '      }\n'
    '    }'
)
assert OLD_START_TPSL in html, '_start TP/SL loop not found'

NEW_START_TPSL = (
    '    /* check drag handles for TP/SL/entry on positions and pending orders */\n'
    '    for(var j=0;j<_drawCache.length;j++){\n'
    '      var bb=_drawCache[j];\n'
    '      if(bb.posId===\'_pending\')continue;\n'
    '      var _isOrdEntry=bb.field===\'entry\'&&bb.posId.indexOf(\'ord_\')===0;\n'
    '      if((bb.field===\'tp\'||bb.field===\'sl\'||_isOrdEntry)&&Math.abs(cy-bb.lineY)<=10){\n'
    '        e.preventDefault();e.stopPropagation();\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy};\n'
    '        window._dvlPaperDragging=true;\n'
    '        return;\n'
    '      }\n'
    '    }'
)
html = html.replace(OLD_START_TPSL, NEW_START_TPSL, 1)

# ── 5. Update _initDrag._move — handle pending order TP/SL/entry drag ─────────
OLD_MOVE = (
    '    if(_drag.posId===\'_pending\'){\n'
    '      if(_pendingLine){\n'
    '        _pendingLine.price=newPrice;\n'
    '        var auto=_autoSLTP(_pendingLine.side===\'buy\'?\'long\':\'short\',newPrice);\n'
    '        _pendingLine.sl=auto.sl;_pendingLine.tp=auto.tp;\n'
    '        var lpEl=document.getElementById(\'ppLimitPx\');\n'
    '        if(lpEl)lpEl.value=newPrice;\n'
    '        _updateSummaryBar();\n'
    '      }\n'
    '    } else {\n'
    '      var pos=ST.positions.find(function(p){return p.id===_drag.posId;});\n'
    '      if(!pos)return;\n'
    '      if(_drag.field===\'tp\')pos.takeProfit=newPrice;\n'
    '      else pos.stopLoss=newPrice;\n'
    '    }'
)
assert OLD_MOVE in html, '_move body not found'

NEW_MOVE = (
    '    if(_drag.posId===\'_pending\'){\n'
    '      if(_pendingLine){\n'
    '        _pendingLine.price=newPrice;\n'
    '        var auto=_autoSLTP(_pendingLine.side===\'buy\'?\'long\':\'short\',newPrice);\n'
    '        _pendingLine.sl=auto.sl;_pendingLine.tp=auto.tp;\n'
    '        var lpEl=document.getElementById(\'ppLimitPx\');\n'
    '        if(lpEl)lpEl.value=newPrice;\n'
    '        _updateSummaryBar();\n'
    '      }\n'
    '    } else if(_drag.posId.indexOf(\'ord_\')===0){\n'
    '      var ordId=_drag.posId.slice(4);\n'
    '      var o=ST.pendingOrders.find(function(o){return o.id===ordId;});\n'
    '      if(!o)return;\n'
    '      if(_drag.field===\'tp\')o.tp=newPrice;\n'
    '      else if(_drag.field===\'sl\')o.sl=newPrice;\n'
    '      else if(_drag.field===\'entry\'){o.price=newPrice;o.triggerPrice=newPrice;}\n'
    '    } else {\n'
    '      var pos=ST.positions.find(function(p){return p.id===_drag.posId;});\n'
    '      if(!pos)return;\n'
    '      if(_drag.field===\'tp\')pos.takeProfit=newPrice;\n'
    '      else pos.stopLoss=newPrice;\n'
    '    }'
)
html = html.replace(OLD_MOVE, NEW_MOVE, 1)

# ── 6. Version console log ─────────────────────────────────────────────────────
html = html.replace(
    "console.log('[DVL Paper] v0.198 ready",
    "console.log('[DVL Paper] v0.199 ready"
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_199.py applied — Beta 0.199')
print('  + Buttons: fully filled green/red background (#00a03a / #bc1626) + white text')
print('  + Arrow: white separator + white chevron, :active feedback separate from main')
print('  + Pending orders: TP/SL/entry lines now in _drawCache (draggable)')
print('  + scRef updated from pending orders when no positions/pendingLine')
print('  + _initDrag._start: allows pending order entry drag (ord_ prefix)')
print('  + _initDrag._move: handles ord_ posId for TP/SL/entry of pending orders')
