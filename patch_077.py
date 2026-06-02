#!/usr/bin/env python3
"""Beta 0.077 — TF selector in HVN Signals + Strategy Tester; SL/TP dotted lines on chart"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.076', 'Beta 0.077')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.077\n  - HVN Signals settings: added FILTROS section',
    '''Beta 0.077
  - TF selector (hvnSigTF) added to HVN Signals settings; _syncAllFromCfg
    propagates tf to hvnSigTF, stTf, and the main chart tfSelect
    (dispatches change event → triggers bootDebounced).
  - SL/TP dotted lines on chart: each HVN Signal draws subtle dashed
    horizontal lines for SL (red, 0.42 opacity) and TP (green, 0.38
    opacity), extending until price crosses them or after 40 candles.
  - _cfg() now returns sl, tp, tf fields for the SL/TP drawing logic.
  - Backtest run cfg now includes tf so _hashCfg produces correct key.

Beta 0.076
  - HVN Signals settings: added FILTROS section''',
    1
)

# ── 3. Add TIMEFRAME section to HVN Signals settings ─────────────────────────
OLD_VISUAL_DIV = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>\n'
    '            <div class="kv"><span class="k">Tamanho label</span>'
)

NEW_VISUAL_DIV = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">TIMEFRAME</div>\n'
    '            <div class="kv"><span class="k">TF do HVN Signals</span>\n'
    '              <select class="select" id="hvnSigTF" style="width:80px">\n'
    '                <option value="5m" selected>5m</option>\n'
    '                <option value="15m">15m</option>\n'
    '                <option value="1h">1h</option>\n'
    '                <option value="4h">4h</option>\n'
    '                <option value="1d">1D</option>\n'
    '              </select></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>\n'
    '            <div class="kv"><span class="k">Tamanho label</span>'
)

assert OLD_VISUAL_DIV in html, "VISUAL div section not found"
html = html.replace(OLD_VISUAL_DIV, NEW_VISUAL_DIV, 1)

# ── 4. Update _cfg() to return sl, tp, tf fields ────────────────────────────
OLD_CFG_RETURN = (
    "      longColor : g('hvnSigLongColor')?.value||'#00d2c8',\n"
    "      shortColor: g('hvnSigShortColor')?.value||'#ff4a64',\n"
    "    };\n"
    "  }"
)

NEW_CFG_RETURN = (
    "      longColor : g('hvnSigLongColor')?.value||'#00d2c8',\n"
    "      shortColor: g('hvnSigShortColor')?.value||'#ff4a64',\n"
    "      sl        : g('hvnSigSL')?.value||'wick',\n"
    "      tp        : g('hvnSigTP')?.value||'hvn',\n"
    "      tf        : g('hvnSigTF')?.value||'5m',\n"
    "    };\n"
    "  }"
)

assert OLD_CFG_RETURN in html, "_cfg() return not found"
html = html.replace(OLD_CFG_RETURN, NEW_CFG_RETURN, 1)

# ── 5. Update _syncAllFromCfg to extract and sync TF ────────────────────────
OLD_SYNC_VARS = (
    "  var maxCandles=cfg.maxCandles||cfg.cons;\n"
    "  var risk=cfg.risk;"
)

NEW_SYNC_VARS = (
    "  var maxCandles=cfg.maxCandles||cfg.cons;\n"
    "  var risk=cfg.risk;\n"
    "  var tf=cfg.tf||cfg.timeframe||null;"
)

assert OLD_SYNC_VARS in html, "maxCandles/risk vars not found"
html = html.replace(OLD_SYNC_VARS, NEW_SYNC_VARS, 1)

OLD_SYNC_RISK_LINE = "  if(risk)        _setVal('stRisk',      risk);"

NEW_SYNC_RISK_LINE = (
    "  if(risk)        _setVal('stRisk',      risk);\n"
    "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);\n"
    "    var _chartTF=document.getElementById('tfSelect');\n"
    "    if(_chartTF&&_chartTF.value!==tf){_chartTF.value=tf;_chartTF.dispatchEvent(new Event('change'));}\n"
    "  }"
)

assert OLD_SYNC_RISK_LINE in html, "stRisk sync line not found"
html = html.replace(OLD_SYNC_RISK_LINE, NEW_SYNC_RISK_LINE, 1)

# ── 6. Add tf to backtest run cfg object ─────────────────────────────────────
OLD_BT_CFG_END = (
    "        risk:(_g('stRisk')||{value:'1.0'}).value,\n"
    "        be:(_g('stBE')||{value:'off'}).value,\n"
    "      };"
)

NEW_BT_CFG_END = (
    "        risk:(_g('stRisk')||{value:'1.0'}).value,\n"
    "        be:(_g('stBE')||{value:'off'}).value,\n"
    "        tf:(_g('stTf')||{value:'5m'}).value,\n"
    "      };"
)

assert OLD_BT_CFG_END in html, "backtest cfg end not found"
html = html.replace(OLD_BT_CFG_END, NEW_BT_CFG_END, 1)

# ── 7. Add _computeSLTP helper + SL/TP dotted lines in drawHVNSignalsOverlay ─
OLD_DRAW_OVERLAY = (
    "  function drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw){\n"
    "    if(!window.S||!S.inds.hvnSignals||!S.candles.length)return;\n"
    "    var signals=S.hvnSignals;\n"
    "    if(!signals||!signals.length)return;\n"
    "    var cfg=_cfg();\n"
    "    var rp=window.RP?window.RP():68;\n"
    "    var right=W-rp;\n"
    "    var PB=window._dvlLastPB||10;\n"
    "    ctx.save();\n"
    "    ctx.beginPath();ctx.rect(0,8,right,H-8-PB);ctx.clip();\n"
    "    ctx.setLineDash([]);\n"
    "    for(var i=V.a;i<=V.b&&i<signals.length;i++){\n"
    "      var sig=signals[i];if(!sig)continue;\n"
    "      var c=S.candles[i];if(!c)continue;\n"
    "      var cx=x(i);\n"
    "      if(cx<-40||cx>right+40)continue;\n"
    "      _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB);\n"
    "    }\n"
    "    ctx.restore();\n"
    "  }"
)

NEW_DRAW_OVERLAY = (
    "  function _computeSLTP(sig,c,cfg,zones){\n"
    "    var isLong=(sig.type==='long');\n"
    "    var entry=c.c;\n"
    "    var sl;\n"
    "    var slMode=cfg.sl||'wick';\n"
    "    if(slMode==='wick'){sl=isLong?c.l:c.h;}\n"
    "    else if(slMode==='hvn'){sl=isLong?sig.zone.lo:sig.zone.hi;}\n"
    "    else{var zs=sig.zone.hi-sig.zone.lo;sl=isLong?entry-zs*1.5:entry+zs*1.5;}\n"
    "    var risk=Math.abs(entry-sl)||entry*0.002;\n"
    "    var tp;\n"
    "    var tpMode=cfg.tp||'hvn';\n"
    "    if(tpMode==='1r'){tp=isLong?entry+risk:entry-risk;}\n"
    "    else if(tpMode==='1.5r'){tp=isLong?entry+risk*1.5:entry-risk*1.5;}\n"
    "    else if(tpMode==='2r'){tp=isLong?entry+risk*2:entry-risk*2;}\n"
    "    else{\n"
    "      var nearest=null;\n"
    "      for(var zi=0;zi<zones.length;zi++){\n"
    "        var z=zones[zi];var zm=(z.lo+z.hi)/2;\n"
    "        if(isLong&&zm>entry&&(nearest===null||zm<nearest))nearest=zm;\n"
    "        else if(!isLong&&zm<entry&&(nearest===null||zm>nearest))nearest=zm;\n"
    "      }\n"
    "      tp=nearest!==null?nearest:(isLong?entry+risk:entry-risk);\n"
    "    }\n"
    "    return{sl:sl,tp:tp};\n"
    "  }\n"
    "\n"
    "  function drawHVNSignalsOverlay(ctx,W,H,V,sc,x,bw){\n"
    "    if(!window.S||!S.inds.hvnSignals||!S.candles.length)return;\n"
    "    var signals=S.hvnSignals;\n"
    "    if(!signals||!signals.length)return;\n"
    "    var cfg=_cfg();\n"
    "    var rp=window.RP?window.RP():68;\n"
    "    var right=W-rp;\n"
    "    var PB=window._dvlLastPB||10;\n"
    "    var allCandles=S.candles;\n"
    "    ctx.save();\n"
    "    ctx.beginPath();ctx.rect(0,8,right,H-8-PB);ctx.clip();\n"
    "\n"
    "    /* SL/TP dashed lines — drawn first so labels appear on top */\n"
    "    var _zones=window.__hvnZones?(window.__hvnZones()||[]):[];\n"
    "    ctx.lineWidth=0.85;\n"
    "    for(var ii=V.a;ii<=V.b&&ii<signals.length;ii++){\n"
    "      var sig=signals[ii];if(!sig)continue;\n"
    "      var c=allCandles[ii];if(!c)continue;\n"
    "      var sx0=x(ii);\n"
    "      if(sx0<-200||sx0>right+40)continue;\n"
    "      var sltp=_computeSLTP(sig,c,cfg,_zones);\n"
    "      var isLong=(sig.type==='long');\n"
    "      var endIdx=Math.min(ii+40,allCandles.length-1);\n"
    "      for(var jj=ii+1;jj<=endIdx;jj++){\n"
    "        var cj=allCandles[jj];if(!cj)break;\n"
    "        if(isLong){if(cj.l<=sltp.sl||cj.h>=sltp.tp){endIdx=jj;break;}}\n"
    "        else{if(cj.h>=sltp.sl||cj.l<=sltp.tp){endIdx=jj;break;}}\n"
    "      }\n"
    "      var lx=Math.max(sx0-bw*0.4,0);\n"
    "      var rx=Math.min(x(endIdx)+bw*0.4,right);\n"
    "      if(rx<=lx)continue;\n"
    "      ctx.setLineDash([3,5]);\n"
    "      var slY=sc.y(sltp.sl);\n"
    "      ctx.strokeStyle='rgba(255,70,90,0.42)';\n"
    "      ctx.beginPath();ctx.moveTo(lx,slY);ctx.lineTo(rx,slY);ctx.stroke();\n"
    "      var tpY=sc.y(sltp.tp);\n"
    "      ctx.strokeStyle='rgba(0,210,140,0.38)';\n"
    "      ctx.beginPath();ctx.moveTo(lx,tpY);ctx.lineTo(rx,tpY);ctx.stroke();\n"
    "    }\n"
    "    ctx.setLineDash([]);ctx.lineWidth=1;\n"
    "\n"
    "    /* signal labels */\n"
    "    for(var i=V.a;i<=V.b&&i<signals.length;i++){\n"
    "      var sig=signals[i];if(!sig)continue;\n"
    "      var c=allCandles[i];if(!c)continue;\n"
    "      var cx=x(i);\n"
    "      if(cx<-40||cx>right+40)continue;\n"
    "      _drawSignal(ctx,sig,c,cx,sc,W,H,cfg,PB);\n"
    "    }\n"
    "    ctx.restore();\n"
    "  }"
)

assert OLD_DRAW_OVERLAY in html, "drawHVNSignalsOverlay not found"
html = html.replace(OLD_DRAW_OVERLAY, NEW_DRAW_OVERLAY, 1)

# ── 8. Update settings change listener list ──────────────────────────────────
OLD_LISTENER = (
    "  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',\n"
    "   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',\n"
    "   'hvnSigLongColor','hvnSigShortColor'].forEach(function(id){"
)

NEW_LISTENER = (
    "  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',\n"
    "   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',\n"
    "   'hvnSigLongColor','hvnSigShortColor','hvnSigClarity','hvnSigFlow',\n"
    "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF'].forEach(function(id){"
)

assert OLD_LISTENER in html, "listener array not found"
html = html.replace(OLD_LISTENER, NEW_LISTENER, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.077 applied')
