#!/usr/bin/env python3
"""Beta 0.085 — HVN Signals: Dive & Recover + Engolfing na Zona"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.084', 'Beta 0.085')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.085\n  - Optimizer: fix cr\xedtico',
    '''Beta 0.085
  - HVN Signals: 3 modos de deteção — Wick Rejection (existente),
    Dive & Recover (mergulho na zona + fechamento de volta), Engolfing
    na Zona (candle de engolfo após candle dentro da zona), e Todos.
  - Selector "Padrão" adicionado ao painel de configurações.
  - "Mín. candles no mergulho" configura quantos candles dentro da zona
    são exigidos antes de disparar um Recover.
  - Sinais RECOVER e ENGULF têm labels e cores distintas no gráfico.

Beta 0.084
  - Optimizer: fix cr\xedtico''',
    1
)

# ── 3. Add Mode selector to HVN Signals settings HTML ────────────────────────
# Insert before the FILTROS section divider
OLD_FILTROS_HDR = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">FILTROS</div>\n'
    '            <div class="kv"><span class="k">Trend Clarity</span>'
)

NEW_FILTROS_HDR = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">PADR\xc3O DO SINAL</div>\n'
    '            <div class="kv"><span class="k">Modo de dete\xe7\xe3o</span>\n'
    '              <select class="select" id="hvnSigMode" style="width:104px">\n'
    '                <option value="wick" selected>Wick Rejection</option>\n'
    '                <option value="dive">Dive &amp; Recover</option>\n'
    '                <option value="engulf">Engolfing</option>\n'
    '                <option value="all">Todos os padr\xf5es</option>\n'
    '              </select></div>\n'
    '            <div class="kv" id="hvnSigDiveRow"><span class="k">M\xedn. candles no mergulho</span>'
    '<input class="num" id="hvnSigDiveMin" type="number" min="1" max="10" value="2" style="width:52px"></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">FILTROS</div>\n'
    '            <div class="kv"><span class="k">Trend Clarity</span>'
)

assert OLD_FILTROS_HDR in html, "FILTROS header not found"
html = html.replace(OLD_FILTROS_HDR, NEW_FILTROS_HDR, 1)

# ── 4. Add mode + diveMin to _cfg() return ────────────────────────────────────
OLD_CFG_END = (
    "      volSpike  : g('hvnSigVolSpike')?.value||'off',\n"
    "    };\n"
    "  }"
)

NEW_CFG_END = (
    "      volSpike  : g('hvnSigVolSpike')?.value||'off',\n"
    "      mode      : g('hvnSigMode')?.value||'wick',\n"
    "      diveMin   : Math.max(1,parseInt(g('hvnSigDiveMin')?.value)||2),\n"
    "    };\n"
    "  }"
)

assert OLD_CFG_END in html, "_cfg() end not found"
html = html.replace(OLD_CFG_END, NEW_CFG_END, 1)

# ── 5. Add mode flags before zone loop in computeHVNSignals ──────────────────
OLD_ZONE_LOOP_START = "    for(var zi=0;zi<zones.length;zi++){"

NEW_ZONE_LOOP_START = (
    "    var doWick=(cfg.mode==='wick'||cfg.mode==='all');\n"
    "    var doDive=(cfg.mode==='dive'||cfg.mode==='all');\n"
    "    var doEngulf=(cfg.mode==='engulf'||cfg.mode==='all');\n"
    "\n"
    "    for(var zi=0;zi<zones.length;zi++){"
)

assert OLD_ZONE_LOOP_START in html, "zone loop start not found"
html = html.replace(OLD_ZONE_LOOP_START, NEW_ZONE_LOOP_START, 1)

# ── 6. Replace candle-loop inner block with all three detection modes ─────────
OLD_CANDLE_INNER = (
    "        var coolOK=(i-lastSignalIdx>=cfg.cooldown);\n"
    "        var latOK=(cfg.allowLat||lateralCount===0);\n"
    "        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);\n"
    "\n"
    "        // ── SHORT: upper wick enters zone, close back below ──────────────────\n"
    "        if(cfg.showShort&&c.h>=z.lo&&c.c<z.lo+tol&&bodyLo<z.lo){\n"
    "          var upperWick=c.h-Math.max(c.o,c.c);\n"
    "          var wickPct=upperWick/candleRange;\n"
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'short',kind:isLat?'lateral':'rejection',\n"
    "                          zone:z,wickPct:wickPct,_strength:wickPct};\n"
    "            }\n"
    "            lastSignalIdx=i;\n"
    "          }\n"
    "        }\n"
    "        // ── LONG: lower wick enters zone, close back above ───────────────────\n"
    "        else if(cfg.showLong&&c.l<=z.hi&&c.c>z.hi-tol&&bodyHi>z.hi){\n"
    "          var lowerWick=Math.min(c.o,c.c)-c.l;\n"
    "          var wickPct=lowerWick/candleRange;\n"
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'long',kind:isLat?'lateral':'rejection',\n"
    "                          zone:z,wickPct:wickPct,_strength:wickPct};\n"
    "            }\n"
    "            lastSignalIdx=i;\n"
    "          }\n"
    "        }\n"
    "\n"
    "        // Reset lateral count any time body is clearly outside the zone\n"
    "        lateralCount=0;"
)

NEW_CANDLE_INNER = (
    "        var coolOK=(i-lastSignalIdx>=cfg.cooldown);\n"
    "        var latOK=(cfg.allowLat||lateralCount===0);\n"
    "        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);\n"
    "\n"
    "        // ── WICK REJECTION ────────────────────────────────────────────────────\n"
    "        if(doWick){\n"
    "          if(cfg.showShort&&c.h>=z.lo&&c.c<z.lo+tol&&bodyLo<z.lo){\n"
    "            var upperWick=c.h-Math.max(c.o,c.c);\n"
    "            var wickPct=upperWick/candleRange;\n"
    "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "              var isLat=(lateralCount>=1);\n"
    "              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "                signals[i]={type:'short',kind:isLat?'lateral':'rejection',\n"
    "                            zone:z,wickPct:wickPct,_strength:wickPct};\n"
    "              }\n"
    "              lastSignalIdx=i;\n"
    "            }\n"
    "          } else if(cfg.showLong&&c.l<=z.hi&&c.c>z.hi-tol&&bodyHi>z.hi){\n"
    "            var lowerWick=Math.min(c.o,c.c)-c.l;\n"
    "            var wickPct=lowerWick/candleRange;\n"
    "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "              var isLat=(lateralCount>=1);\n"
    "              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "                signals[i]={type:'long',kind:isLat?'lateral':'rejection',\n"
    "                            zone:z,wickPct:wickPct,_strength:wickPct};\n"
    "              }\n"
    "              lastSignalIdx=i;\n"
    "            }\n"
    "          }\n"
    "        }\n"
    "\n"
    "        // ── DIVE & RECOVER: N candles inside zone, then close back outside ────\n"
    "        if(doDive&&lateralCount>=cfg.diveMin&&coolOK&&volOK){\n"
    "          if(cfg.showLong&&bodyLo>=z.hi&&c.c>c.o){ // exits zone upward, bullish body\n"
    "            var _ds=(c.c-c.o)/(c.h-c.l||1);\n"
    "            if(!signals[i]||signals[i]._strength<_ds){\n"
    "              signals[i]={type:'long',subtype:'recover',zone:z,_strength:_ds};\n"
    "              lastSignalIdx=i;\n"
    "            }\n"
    "          }\n"
    "          if(cfg.showShort&&bodyHi<=z.lo&&c.c<c.o){ // exits zone downward, bearish body\n"
    "            var _ds=(c.o-c.c)/(c.h-c.l||1);\n"
    "            if(!signals[i]||signals[i]._strength<_ds){\n"
    "              signals[i]={type:'short',subtype:'recover',zone:z,_strength:_ds};\n"
    "              lastSignalIdx=i;\n"
    "            }\n"
    "          }\n"
    "        }\n"
    "\n"
    "        // ── ENGOLFING NA ZONA: prev body in zone, curr engolfs prev ───────\n"
    "        if(doEngulf&&i>0&&coolOK&&volOK){\n"
    "          var _pv=cs[i-1];\n"
    "          var _pvLo=Math.min(_pv.o,_pv.c),_pvHi=Math.max(_pv.o,_pv.c);\n"
    "          if(_pvHi>=z.lo&&_pvLo<=z.hi){ // previous candle was in zone\n"
    "            if(cfg.showLong&&c.c>c.o&&_pv.c<_pv.o&&c.o<=_pv.c&&c.c>=_pv.o){ // bull engulf\n"
    "              var _ds=(c.c-c.o)/(_pvHi-_pvLo||1);\n"
    "              if(!signals[i]||signals[i]._strength<_ds){\n"
    "                signals[i]={type:'long',subtype:'engulf',zone:z,_strength:_ds};\n"
    "                lastSignalIdx=i;\n"
    "              }\n"
    "            }\n"
    "            if(cfg.showShort&&c.c<c.o&&_pv.c>_pv.o&&c.o>=_pv.c&&c.c<=_pv.o){ // bear engulf\n"
    "              var _ds=(c.o-c.c)/(_pvHi-_pvLo||1);\n"
    "              if(!signals[i]||signals[i]._strength<_ds){\n"
    "                signals[i]={type:'short',subtype:'engulf',zone:z,_strength:_ds};\n"
    "                lastSignalIdx=i;\n"
    "              }\n"
    "            }\n"
    "          }\n"
    "        }\n"
    "\n"
    "        lateralCount=0;"
)

assert OLD_CANDLE_INNER in html, "candle inner block not found"
html = html.replace(OLD_CANDLE_INNER, NEW_CANDLE_INNER, 1)

# ── 7. Update _drawSignal to show RECOVER / ENGULF labels with distinct colors ─
OLD_DRAW_LABEL = (
    "    var isLong=(sig.type==='long');\n"
    "    var bc=isLong?cfg.longColor:cfg.shortColor;\n"
    "    var glowC=isLong?'rgba(0,200,190,.4)':'rgba(255,50,80,.4)';\n"
    "    var fillC=isLong?'rgba(0,50,46,.58)':'rgba(76,10,22,.58)';\n"
    "    var textC=isLong?'rgba(0,255,230,.97)':'rgba(255,100,118,.97)';\n"
    "    var label=isLong?'LONG':'SHORT';"
)

NEW_DRAW_LABEL = (
    "    var isLong=(sig.type==='long');\n"
    "    var _sub=sig.subtype||'wick';\n"
    "    /* color palette per subtype */\n"
    "    var bc,glowC,fillC,textC,label;\n"
    "    if(_sub==='recover'){\n"
    "      bc=isLong?'#00e5a0':'#ff8c42';\n"
    "      glowC=isLong?'rgba(0,229,160,.38)':'rgba(255,140,66,.38)';\n"
    "      fillC=isLong?'rgba(0,60,40,.60)':'rgba(80,30,0,.60)';\n"
    "      textC=isLong?'rgba(0,240,168,.97)':'rgba(255,152,80,.97)';\n"
    "      label=isLong?'↑ RECOVER':'↓ RECOVER';\n"
    "    } else if(_sub==='engulf'){\n"
    "      bc=isLong?'#60c0ff':'#d966ff';\n"
    "      glowC=isLong?'rgba(96,192,255,.38)':'rgba(217,102,255,.38)';\n"
    "      fillC=isLong?'rgba(10,40,80,.60)':'rgba(50,0,80,.60)';\n"
    "      textC=isLong?'rgba(130,210,255,.97)':'rgba(230,140,255,.97)';\n"
    "      label=isLong?'↑ ENGULF':'↓ ENGULF';\n"
    "    } else {\n"
    "      bc=isLong?cfg.longColor:cfg.shortColor;\n"
    "      glowC=isLong?'rgba(0,200,190,.4)':'rgba(255,50,80,.4)';\n"
    "      fillC=isLong?'rgba(0,50,46,.58)':'rgba(76,10,22,.58)';\n"
    "      textC=isLong?'rgba(0,255,230,.97)':'rgba(255,100,118,.97)';\n"
    "      label=isLong?'LONG':'SHORT';\n"
    "    }"
)

assert OLD_DRAW_LABEL in html, "_drawSignal color/label block not found"
html = html.replace(OLD_DRAW_LABEL, NEW_DRAW_LABEL, 1)

# ── 8. Add hvnSigMode + hvnSigDiveMin to settings listeners ──────────────────
OLD_LISTENERS = "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF','hvnSigVolSpike'].forEach(function(id){"

NEW_LISTENERS = "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF','hvnSigVolSpike','hvnSigMode','hvnSigDiveMin'].forEach(function(id){"

assert OLD_LISTENERS in html, "listeners array not found"
html = html.replace(OLD_LISTENERS, NEW_LISTENERS, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.085 applied')
