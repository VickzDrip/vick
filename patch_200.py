# patch_200.py — Beta 0.200
# 1. CSS: fully solid button fills (#009e3c green / #b81422 red)
# 2. _pendingMod: TP/SL drag shows confirm/cancel instead of instant apply
# 3. _checkTPSL: guarded against drag + pendingMod to prevent accidental close
# 4. drawOverlay: dashed preview line + ✓/× for pending modification
# 5. _initDrag: detects _mod clicks, saves origVal, new _end confirm flow
# 6. _confirmMod / _cancelMod functions

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

errors = []

def rep(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    c = html.count(old)
    if c > 1:
        errors.append('AMBIGUOUS (%dx): %s' % (c, label))
        return html
    return html.replace(old, new)

def rep_all(html, old, new, label):
    if old not in html:
        errors.append('NOT FOUND: ' + label)
        return html
    return html.replace(old, new)

# ── 1. version bump ──────────────────────────────────────────────────────────
html = rep_all(html, 'Beta 0.199', 'Beta 0.200', 'version bump')

# ── 2. CSS: solid fills ───────────────────────────────────────────────────────
html = rep(html,
    '.dtb-split.buy{border:1px solid rgba(0,195,75,.45);background:rgba(0,160,58,.80);box-shadow:0 0 14px rgba(0,200,70,.18);}\n'
    '.dtb-split.sell{border:1px solid rgba(215,35,50,.50);background:rgba(188,22,38,.80);box-shadow:0 0 14px rgba(210,35,50,.18);}',
    '.dtb-split.buy{border:1px solid #00c44a;background:#009e3c;box-shadow:0 0 14px rgba(0,200,70,.22);}\n'
    '.dtb-split.sell{border:1px solid #d4162a;background:#b81422;box-shadow:0 0 14px rgba(210,35,50,.22);}',
    'dtb-split CSS solid fills'
)

# ── 3. add _pendingMod state variable ─────────────────────────────────────────
html = rep(html,
    "var _buyType='market',_sellType='market';",
    "var _buyType='market',_sellType='market';\nvar _pendingMod=null;",
    '_pendingMod variable'
)

# ── 4. _checkTPSL: guard against drag and pendingMod ─────────────────────────
html = rep(html,
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
    '}',
    'function _checkTPSL(){\n'
    '  if(!ST.enabled||!ST.positions.length)return;\n'
    '  if(_drag&&(_drag.field===\'tp\'||_drag.field===\'sl\'))return;\n'
    '  var syms=Object.keys(ST.lastPriceBySymbol);\n'
    '  for(var si=0;si<syms.length;si++){\n'
    '    var sym=syms[si];\n'
    '    var price=ST.lastPriceBySymbol[sym];\n'
    '    if(!price||isNaN(price))continue;\n'
    '    for(var i=ST.positions.length-1;i>=0;i--){\n'
    '      var pos=ST.positions[i];\n'
    '      if(pos.symbol!==sym)continue;\n'
    '      if(_pendingMod&&_pendingMod.posId===pos.id)continue;\n'
    '      var _tp=pos.takeProfit!=null?+pos.takeProfit:null;\n'
    '      var _sl=pos.stopLoss!=null?+pos.stopLoss:null;\n'
    '      var hitTP=_tp!=null&&!isNaN(_tp)&&(pos.side===\'long\'?price>=_tp:price<=_tp);\n'
    '      var hitSL=_sl!=null&&!isNaN(_sl)&&(pos.side===\'long\'?price<=_sl:price>=_sl);\n'
    '      if(hitTP){_doClose(pos.id,\'tp\',_tp);break;}\n'
    '      if(hitSL){_doClose(pos.id,\'sl\',_sl);break;}\n'
    '    }\n'
    '  }\n'
    '}',
    '_checkTPSL guard'
)

# ── 5. drawOverlay: add _pendingMod preview before ctx.restore() ──────────────
html = rep(html,
    '  ctx.restore();\n'
    '}\n'
    '\n'
    'function _drawLineLabel',
    '  /* pending modification preview — shown after drag ends, waiting for confirm/cancel */\n'
    '  if(_pendingMod){\n'
    '    var pmY=sc.y(_pendingMod.newVal);\n'
    '    if(pmY>=-10&&pmY<=H+10){\n'
    '      var pmCol=_pendingMod.field===\'tp\'?\'rgba(0,255,140,.75)\':\''
    'rgba(255,110,80,.75)\';\n'
    '      ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.strokeStyle=pmCol;\n'
    '      ctx.beginPath();ctx.moveTo(0,pmY);ctx.lineTo(xR,pmY);ctx.stroke();ctx.setLineDash([]);\n'
    '      var bW=22,bH=17;\n'
    '      var confirmX=xR-bW*2-8,cancelX=xR-bW-4;\n'
    '      var bY=Math.round(pmY-bH/2);\n'
    '      ctx.textAlign=\'center\';ctx.textBaseline=\'middle\';\n'
    '      ctx.fillStyle=\'rgba(0,155,72,0.92)\';ctx.beginPath();ctx.rect(confirmX,bY,bW,bH);ctx.fill();\n'
    '      ctx.font=\'bold 13px monospace\';ctx.fillStyle=\'#efffef\';\n'
    '      ctx.shadowColor=\'rgba(0,0,0,0.85)\';ctx.shadowBlur=3;\n'
    "      ctx.fillText('✓',confirmX+bW/2,pmY);\n"
    '      ctx.fillStyle=\'rgba(155,28,28,0.92)\';ctx.beginPath();ctx.rect(cancelX,bY,bW,bH);ctx.fill();\n'
    "      ctx.fillStyle='#ffefef';ctx.fillText('×',cancelX+bW/2,pmY);\n"
    '      ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    '      ctx.font=\'bold 9px monospace\';ctx.textAlign=\'left\';ctx.textBaseline=\'alphabetic\';\n'
    "      var modTxt=(_pendingMod.field==='tp'?'TP ':'SL ')+_f(_pendingMod.newVal,4);\n"
    '      ctx.shadowColor=\'rgba(0,0,0,0.9)\';ctx.shadowBlur=4;ctx.fillStyle=pmCol;\n'
    '      ctx.fillText(modTxt,6,pmY-3);\n'
    '      ctx.shadowBlur=0;ctx.shadowColor=\'transparent\';\n'
    "      _drawCache.push({x:confirmX,y:bY,w:bW,h:bH,posId:'_mod',field:'mod_confirm',hasClose:false,lineY:pmY});\n"
    "      _drawCache.push({x:cancelX,y:bY,w:bW,h:bH,posId:'_mod',field:'mod_cancel',hasClose:false,lineY:pmY});\n"
    '    }\n'
    '  }\n'
    '\n'
    '  ctx.restore();\n'
    '}\n'
    '\n'
    'function _drawLineLabel',
    '_pendingMod preview in drawOverlay'
)

# ── 6. _initDrag._start: _mod buttons check + origVal save ────────────────────
html = rep(html,
    '    /* check close buttons for open positions */\n'
    '    for(var i=0;i<_drawCache.length;i++){\n'
    '      var b=_drawCache[i];\n'
    "      if(b.posId!=='_pending'&&b.hasClose&&cx>=b.x+b.w-18&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){\n"
    "        e.preventDefault();e.stopPropagation();_doClose(b.posId,'manual');return;\n"
    '      }\n'
    '    }\n'
    '    /* check drag handles for TP/SL/entry on positions and pending orders */\n'
    '    for(var j=0;j<_drawCache.length;j++){\n'
    '      var bb=_drawCache[j];\n'
    "      if(bb.posId==='_pending')continue;\n"
    "      var _isOrdEntry=bb.field==='entry'&&bb.posId.indexOf('ord_')===0;\n"
    "      if((bb.field==='tp'||bb.field==='sl'||_isOrdEntry)&&Math.abs(cy-bb.lineY)<=10){\n"
    '        e.preventDefault();e.stopPropagation();\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy};\n'
    '        window._dvlPaperDragging=true;\n'
    '        return;\n'
    '      }\n'
    '    }',
    '    /* check _pendingMod confirm/cancel buttons */\n'
    '    for(var mi=0;mi<_drawCache.length;mi++){\n'
    '      var mb=_drawCache[mi];\n'
    "      if(mb.posId==='_mod'&&cx>=mb.x&&cx<=mb.x+mb.w&&cy>=mb.y&&cy<=mb.y+mb.h){\n"
    '        e.preventDefault();e.stopPropagation();\n'
    "        if(mb.field==='mod_confirm')_confirmMod();\n"
    "        else if(mb.field==='mod_cancel')_cancelMod();\n"
    '        return;\n'
    '      }\n'
    '    }\n'
    '    /* check close buttons for open positions */\n'
    '    for(var i=0;i<_drawCache.length;i++){\n'
    '      var b=_drawCache[i];\n'
    "      if(b.posId!=='_pending'&&b.posId!=='_mod'&&b.hasClose&&cx>=b.x+b.w-18&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h){\n"
    "        e.preventDefault();e.stopPropagation();_doClose(b.posId,'manual');return;\n"
    '      }\n'
    '    }\n'
    '    /* check drag handles for TP/SL/entry on positions and pending orders */\n'
    '    for(var j=0;j<_drawCache.length;j++){\n'
    '      var bb=_drawCache[j];\n'
    "      if(bb.posId==='_pending'||bb.posId==='_mod')continue;\n"
    "      var _isOrdEntry=bb.field==='entry'&&bb.posId.indexOf('ord_')===0;\n"
    "      if((bb.field==='tp'||bb.field==='sl'||_isOrdEntry)&&Math.abs(cy-bb.lineY)<=10){\n"
    '        e.preventDefault();e.stopPropagation();\n'
    '        /* save origVal for confirm/cancel rollback */\n'
    '        var _ov=null;\n'
    "        if(bb.posId.indexOf('ord_')===0){\n"
    "          var _oo=ST.pendingOrders.find(function(o){return o.id===bb.posId.slice(4);});\n"
    "          if(_oo)_ov=bb.field==='tp'?_oo.tp:bb.field==='sl'?_oo.sl:_oo.price;\n"
    '        } else {\n'
    "          var _pp=ST.positions.find(function(p){return p.id===bb.posId;});\n"
    "          if(_pp)_ov=bb.field==='tp'?_pp.takeProfit:_pp.stopLoss;\n"
    '        }\n'
    '        _pendingMod=null;\n'
    '        _drag={posId:bb.posId,field:bb.field,startY:cy,origVal:_ov};\n'
    '        window._dvlPaperDragging=true;\n'
    '        return;\n'
    '      }\n'
    '    }',
    '_initDrag._start with _mod + origVal'
)

# ── 7. _initDrag._end: transition to _pendingMod ─────────────────────────────
html = rep(html,
    '  function _end(){\n'
    '    window._dvlPaperDragging=false;\n'
    '    if(!_drag)return;\n'
    '    _save();_drag=null;\n'
    '  }',
    '  function _end(){\n'
    '    window._dvlPaperDragging=false;\n'
    '    if(!_drag){return;}\n'
    "    if(_drag.posId==='_pending'){_save();_drag=null;return;}\n"
    '    /* for positions/pending orders: capture newVal, revert, enter confirm mode */\n'
    '    var _newVal=null;\n'
    "    if(_drag.posId.indexOf('ord_')===0){\n"
    '      var _eoId=_drag.posId.slice(4);\n'
    "      var _eo=ST.pendingOrders.find(function(o){return o.id===_eoId;});\n"
    '      if(_eo){\n'
    "        if(_drag.field==='tp')_newVal=_eo.tp;\n"
    "        else if(_drag.field==='sl')_newVal=_eo.sl;\n"
    '        else _newVal=_eo.price;\n'
    "        if(_drag.field==='tp')_eo.tp=_drag.origVal;\n"
    "        else if(_drag.field==='sl')_eo.sl=_drag.origVal;\n"
    '        else{_eo.price=_drag.origVal;_eo.triggerPrice=_drag.origVal;}\n'
    '      }\n'
    '    } else {\n'
    "      var _ep=ST.positions.find(function(p){return p.id===_drag.posId;});\n"
    '      if(_ep){\n'
    "        _newVal=_drag.field==='tp'?_ep.takeProfit:_ep.stopLoss;\n"
    "        if(_drag.field==='tp')_ep.takeProfit=_drag.origVal;\n"
    '        else _ep.stopLoss=_drag.origVal;\n'
    '      }\n'
    '    }\n'
    '    if(_newVal!=null&&_newVal!==_drag.origVal){\n'
    '      _pendingMod={posId:_drag.posId,field:_drag.field,newVal:_newVal,origVal:_drag.origVal};\n'
    '    }\n'
    '    _drag=null;\n'
    '    if(window.drawSoon)drawSoon();\n'
    '  }',
    '_initDrag._end with pendingMod'
)

# ── 8. add _confirmMod and _cancelMod after _initDrag ────────────────────────
html = rep(html,
    "  canvas.addEventListener('touchend',_end);\n"
    '}\n'
    '\n'
    '/* ── PANEL RENDER ── */\n',
    "  canvas.addEventListener('touchend',_end);\n"
    '}\n'
    '\n'
    'function _confirmMod(){\n'
    '  if(!_pendingMod)return;\n'
    '  var pm=_pendingMod;_pendingMod=null;\n'
    "  if(pm.posId.indexOf('ord_')===0){\n"
    "    var o=ST.pendingOrders.find(function(o){return o.id===pm.posId.slice(4);});\n"
    "    if(o){if(pm.field==='tp')o.tp=pm.newVal;else if(pm.field==='sl')o.sl=pm.newVal;else{o.price=pm.newVal;o.triggerPrice=pm.newVal;}}\n"
    '  } else {\n'
    "    var p=ST.positions.find(function(p){return p.id===pm.posId;});\n"
    "    if(p){if(pm.field==='tp')p.takeProfit=pm.newVal;else p.stopLoss=pm.newVal;}\n"
    '  }\n'
    '  _save();if(window.drawSoon)drawSoon();\n'
    '}\n'
    'function _cancelMod(){\n'
    '  if(!_pendingMod)return;\n'
    '  _pendingMod=null;\n'
    '  if(window.drawSoon)drawSoon();\n'
    '}\n'
    '\n'
    '/* ── PANEL RENDER ── */\n',
    '_confirmMod and _cancelMod'
)

# ── result ───────────────────────────────────────────────────────────────────
if errors:
    print('ERRORS:')
    for e in errors:
        print(' ', e)
else:
    with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('patch_200.py applied — Beta 0.200')
    print('  + Buttons: solid #009e3c green / #b81422 red (full opacity)')
    print('  + _pendingMod: TP/SL drag enters confirm/cancel mode on release')
    print('  + _checkTPSL: guarded against active drag + pendingMod')
    print('  + drawOverlay: dashed preview line + ✓/× confirm/cancel buttons')
    print('  + _initDrag._start: detects _mod buttons, saves origVal, cancels prior mod')
    print('  + _initDrag._end: reverts value to origVal, creates _pendingMod')
    print('  + _confirmMod / _cancelMod: apply or discard the pending change')
