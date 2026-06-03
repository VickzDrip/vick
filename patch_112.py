#!/usr/bin/env python3
"""Beta 0.112 — HVN minAtrHvn: filtro tamanho ATR no indicador, backtest e optimizer"""

import random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.111', 'Beta 0.112')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.112\n  - Filtros Clarity/Flow: removidas op\xe7\xf5es LONG e SHORT individuais;\n    mantido apenas Desativado e Ambos \xb15/\xb110/\xb120/\xb130.\n'
NEW_LOG = ('Beta 0.112\n'
           '  - HVN minAtrHvn: filtro de tamanho m\xednimo de candle em ATR\n'
           '    (0.05 a 0.30, step 0.05). Adicionado no indicador HVN Signals,\n'
           '    no Backtest (FILTROS) e no Optimizer (nova dimens\xe3o testada).\n'
           '  - Filtros Clarity/Flow: removidas op\xe7\xf5es LONG e SHORT individuais;\n'
           '    mantido apenas Desativado e Ambos \xb15/\xb110/\xb120/\xb130.\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Indicator: add hvnSigMinAtr select after hvnSigNextHVN ────────────────
OLD_SIG_NEXTHVN = ('            <div class="kv"><span class="k">Prox. HVN dist. %</span>'
                   '<input class="num" id="hvnSigNextHVN" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
                   '            <div class="kv"><span class="k">Volume spike m\xedn.</span>')
NEW_SIG_NEXTHVN = ('            <div class="kv"><span class="k">Prox. HVN dist. %</span>'
                   '<input class="num" id="hvnSigNextHVN" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
                   '            <div class="kv"><span class="k">Tamanho m\xedn. ATR</span>\n'
                   '              <select class="select" id="hvnSigMinAtr" style="width:104px">\n'
                   '                <option value="0" selected>Desativado</option>\n'
                   '                <option value="0.05">0.05\xd7ATR</option>\n'
                   '                <option value="0.10">0.10\xd7ATR</option>\n'
                   '                <option value="0.15">0.15\xd7ATR</option>\n'
                   '                <option value="0.20">0.20\xd7ATR</option>\n'
                   '                <option value="0.25">0.25\xd7ATR</option>\n'
                   '                <option value="0.30">0.30\xd7ATR</option>\n'
                   '              </select></div>\n'
                   '            <div class="kv"><span class="k">Volume spike m\xedn.</span>')
assert OLD_SIG_NEXTHVN in html, 'hvnSigNextHVN block not found'
html = html.replace(OLD_SIG_NEXTHVN, NEW_SIG_NEXTHVN, 1)

# ── 4. _cfg(): add minAtrHvn field ───────────────────────────────────────────
OLD_CFG_FUNC = ("      diveMin   : Math.max(1,parseInt(g('hvnSigDiveMin')?.value)||2),\n"
                "    };\n"
                "  }")
NEW_CFG_FUNC = ("      diveMin   : Math.max(1,parseInt(g('hvnSigDiveMin')?.value)||2),\n"
                "      minAtrHvn : Math.max(0,parseFloat(g('hvnSigMinAtr')?.value)||0),\n"
                "    };\n"
                "  }")
assert OLD_CFG_FUNC in html, '_cfg diveMin end not found'
html = html.replace(OLD_CFG_FUNC, NEW_CFG_FUNC, 1)

# ── 5. computeHVNSignals: add ATR-14 array + filter ──────────────────────────
OLD_COMPUTE_START = ("    var doWick=(cfg.mode==='wick'||cfg.mode==='all');\n"
                     "    var doDive=(cfg.mode==='dive'||cfg.mode==='all');\n"
                     "    var doEngulf=(cfg.mode==='engulf'||cfg.mode==='all');")
NEW_COMPUTE_START = ("    /* ATR-14 for minAtrHvn filter */\n"
                     "    var _atr14=new Float32Array(n);\n"
                     "    if(cfg.minAtrHvn>0){\n"
                     "      var _atrSum=0;\n"
                     "      for(var _ai=0;_ai<n;_ai++){\n"
                     "        var _ca=cs[_ai],_pc=_ai>0?cs[_ai-1].c:_ca.o;\n"
                     "        var _tr=Math.max(_ca.h-_ca.l,Math.abs(_ca.h-_pc),Math.abs(_ca.l-_pc));\n"
                     "        _atrSum+=_tr;\n"
                     "        if(_ai>=14){var _oa=cs[_ai-14],_op=_ai>14?cs[_ai-15].c:_oa.o;\n"
                     "          _atrSum-=Math.max(_oa.h-_oa.l,Math.abs(_oa.h-_op),Math.abs(_oa.l-_op));}\n"
                     "        _atr14[_ai]=_atrSum/Math.min(_ai+1,14);\n"
                     "      }\n"
                     "    }\n"
                     "\n"
                     "    var doWick=(cfg.mode==='wick'||cfg.mode==='all');\n"
                     "    var doDive=(cfg.mode==='dive'||cfg.mode==='all');\n"
                     "    var doEngulf=(cfg.mode==='engulf'||cfg.mode==='all');")
assert OLD_COMPUTE_START in html, 'computeHVNSignals doWick block not found'
html = html.replace(OLD_COMPUTE_START, NEW_COMPUTE_START, 1)

# Add atrOK check — insert into the per-candle loop after volOK
OLD_VOLOKCOOL = ("        var coolOK=(i-lastSignalIdx>=cfg.cooldown);\n"
                 "        var latOK=(cfg.allowLat||lateralCount===0);\n"
                 "        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);")
NEW_VOLOKCOOL = ("        var coolOK=(i-lastSignalIdx>=cfg.cooldown);\n"
                 "        var latOK=(cfg.allowLat||lateralCount===0);\n"
                 "        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);\n"
                 "        var atrOK=(cfg.minAtrHvn<=0||candleRange>=cfg.minAtrHvn*_atr14[i]);")
assert OLD_VOLOKCOOL in html, 'volOK block not found'
html = html.replace(OLD_VOLOKCOOL, NEW_VOLOKCOOL, 1)

# Patch wick rejection: add &&atrOK to the wickPct check
OLD_WICK_CHECK = "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n              var isLat=(lateralCount>=1);\n              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n                signals[i]={type:'short'"
NEW_WICK_CHECK = "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK&&atrOK){\n              var isLat=(lateralCount>=1);\n              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n                signals[i]={type:'short'"
assert OLD_WICK_CHECK in html, 'wick short check not found'
html = html.replace(OLD_WICK_CHECK, NEW_WICK_CHECK, 1)

OLD_WICK_LONG = "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n              var isLat=(lateralCount>=1);\n              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n                signals[i]={type:'long'"
NEW_WICK_LONG = "            if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK&&atrOK){\n              var isLat=(lateralCount>=1);\n              if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n                signals[i]={type:'long'"
assert OLD_WICK_LONG in html, 'wick long check not found'
html = html.replace(OLD_WICK_LONG, NEW_WICK_LONG, 1)

# Patch dive: add &&atrOK
OLD_DIVE = "        if(doDive&&lateralCount>=cfg.diveMin&&coolOK&&volOK){"
NEW_DIVE = "        if(doDive&&lateralCount>=cfg.diveMin&&coolOK&&volOK&&atrOK){"
assert OLD_DIVE in html, 'doDive check not found'
html = html.replace(OLD_DIVE, NEW_DIVE, 1)

# Patch engulf: add &&atrOK
OLD_ENGULF = "        if(doEngulf&&i>0&&coolOK&&volOK){"
NEW_ENGULF = "        if(doEngulf&&i>0&&coolOK&&volOK&&atrOK){"
assert OLD_ENGULF in html, 'doEngulf check not found'
html = html.replace(OLD_ENGULF, NEW_ENGULF, 1)

# ── 6. Backtest: add stHvnMinAtr inside stHVNFields ──────────────────────────
OLD_DIVE_ROW = ('        <div class="dvl-st-row2">\n'
                '          <div class="dvl-st-field"><span class="dvl-st-lbl">Padr\xe3o do Sinal</span>\n'
                '            <select class="dvl-st-sel" id="stMode">\n'
                '              <option value="wick" selected>Wick Rejection</option>\n'
                '              <option value="dive">Dive &amp; Recover</option>\n'
                '              <option value="engulf">Engolfing</option>\n'
                '              <option value="all">Todos</option>\n'
                '            </select></div>\n'
                '          <div class="dvl-st-field"><span class="dvl-st-lbl">M\xedn. candles mergulho</span>\n'
                '            <input class="dvl-st-inp" id="stDiveMin" type="number" value="2" min="1" max="10"></div>\n'
                '        </div>\n'
                '      </div>')
NEW_DIVE_ROW = ('        <div class="dvl-st-row2">\n'
                '          <div class="dvl-st-field"><span class="dvl-st-lbl">Padr\xe3o do Sinal</span>\n'
                '            <select class="dvl-st-sel" id="stMode">\n'
                '              <option value="wick" selected>Wick Rejection</option>\n'
                '              <option value="dive">Dive &amp; Recover</option>\n'
                '              <option value="engulf">Engolfing</option>\n'
                '              <option value="all">Todos</option>\n'
                '            </select></div>\n'
                '          <div class="dvl-st-field"><span class="dvl-st-lbl">M\xedn. candles mergulho</span>\n'
                '            <input class="dvl-st-inp" id="stDiveMin" type="number" value="2" min="1" max="10"></div>\n'
                '        </div>\n'
                '        <div class="dvl-st-field" style="margin-bottom:8px"><span class="dvl-st-lbl">Tamanho m\xedn. ATR</span>\n'
                '          <select class="dvl-st-sel" id="stHvnMinAtr">\n'
                '            <option value="0" selected>Desativado</option>\n'
                '            <option value="0.05">0.05\xd7ATR</option>\n'
                '            <option value="0.10">0.10\xd7ATR</option>\n'
                '            <option value="0.15">0.15\xd7ATR</option>\n'
                '            <option value="0.20">0.20\xd7ATR</option>\n'
                '            <option value="0.25">0.25\xd7ATR</option>\n'
                '            <option value="0.30">0.30\xd7ATR</option>\n'
                '          </select></div>\n'
                '      </div>')
assert OLD_DIVE_ROW in html, 'stDiveMin row closing div not found'
html = html.replace(OLD_DIVE_ROW, NEW_DIVE_ROW, 1)

# ── 7. Backtest cfg builder: add hvnMinAtr ───────────────────────────────────
OLD_CFG_BUILD = ("        trendFilter:(_g('stTBFilterMode')||{value:'off'}).value,\n"
                 "        tfBias:parseFloat((_g('stTBFilterBias')||{value:'5'}).value)||5,\n"
                 "        tfFast:parseInt((_g('stTBFilterFast')||{value:'3'}).value)||3,\n"
                 "        tfSlow:parseInt((_g('stTBFilterSlow')||{value:'10'}).value)||10,\n"
                 "      };")
NEW_CFG_BUILD = ("        trendFilter:(_g('stTBFilterMode')||{value:'off'}).value,\n"
                 "        tfBias:parseFloat((_g('stTBFilterBias')||{value:'5'}).value)||5,\n"
                 "        tfFast:parseInt((_g('stTBFilterFast')||{value:'3'}).value)||3,\n"
                 "        tfSlow:parseInt((_g('stTBFilterSlow')||{value:'10'}).value)||10,\n"
                 "        hvnMinAtr:parseFloat((_g('stHvnMinAtr')||{value:'0'}).value)||0,\n"
                 "      };")
assert OLD_CFG_BUILD in html, 'cfg build end not found'
html = html.replace(OLD_CFG_BUILD, NEW_CFG_BUILD, 1)

# ── 8. _hashCfg: add hvnMinAtr ───────────────────────────────────────────────
OLD_HASH = ("    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10\n"
            "  ]);")
NEW_HASH = ("    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10,\n"
            "    cfg.hvnMinAtr||0\n"
            "  ]);")
assert OLD_HASH in html, '_hashCfg end not found'
html = html.replace(OLD_HASH, NEW_HASH, 1)

# ── 9. HVN mock: use _minAtrHvn for tradesBase and WR ────────────────────────
OLD_HVN_TRADES = ("  var trades=Math.max(8,tradesBase);\n"
                  "  var _tbf=cfg.trendFilter||'off';")
NEW_HVN_TRADES = ("  var _minAtrHvn=parseFloat(cfg.hvnMinAtr)||0;\n"
                  "  if(_minAtrHvn>0)tradesBase=Math.round(tradesBase*(1-Math.min(0.65,_minAtrHvn*2.2)));\n"
                  "  var trades=Math.max(8,tradesBase);\n"
                  "  var _tbf=cfg.trendFilter||'off';")
assert OLD_HVN_TRADES in html, 'HVN trades _tbf block not found'
html = html.replace(OLD_HVN_TRADES, NEW_HVN_TRADES, 1)

OLD_HVN_WR_TBFEND = ("  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;\n"
                     "  wr+=rnd(-0.03,0.03);\n"
                     "  wr=Math.max(0.36,Math.min(0.78,wr));")
NEW_HVN_WR_TBFEND = ("  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;\n"
                     "  if(_minAtrHvn>0)wr+=Math.min(0.08,_minAtrHvn*0.22);\n"
                     "  wr+=rnd(-0.03,0.03);\n"
                     "  wr=Math.max(0.36,Math.min(0.78,wr));")
assert OLD_HVN_WR_TBFEND in html, 'HVN wr _tbf end not found'
html = html.replace(OLD_HVN_WR_TBFEND, NEW_HVN_WR_TBFEND, 1)

# ── 10. OPT_PARAMS: add minAtrHvn entry ─────────────────────────────────────
OLD_OPT_PARAMS_END = ("  {n:'Filtro TB',v:'Off \xb7 Adicional \xb7 Substitui'},\n"
                      "];\nvar FVG_OPT_PARAMS=")
NEW_OPT_PARAMS_END = ("  {n:'Filtro TB',v:'Off \xb7 Adicional \xb7 Substitui'},\n"
                      "  {n:'Tamanho m\xedn. ATR',v:'Off \xb7 0.05 \xb7 0.10 \xb7 0.15 \xb7 0.20 \xb7 0.25 \xb7 0.30'},\n"
                      "];\nvar FVG_OPT_PARAMS=")
assert OLD_OPT_PARAMS_END in html, 'OPT_PARAMS end not found'
html = html.replace(OLD_OPT_PARAMS_END, NEW_OPT_PARAMS_END, 1)

# ── 11. _cfgLabel HVN branch: show minAtrHvn ────────────────────────────────
OLD_HVN_LABEL = ("  var modeTag={wick:'',dive:'DIVE',engulf:'ENGULF',all:'ALL'};\n"
                 "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
                 "  if(modeTag[c.mode])p.unshift('['+modeTag[c.mode]+']');\n"
                 "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
                 "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
                 "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
                 "  return p.join(' | ');")
NEW_HVN_LABEL = ("  var modeTag={wick:'',dive:'DIVE',engulf:'ENGULF',all:'ALL'};\n"
                 "  var p=['Pavio > '+c.w+'%',CLOSE_LABELS[c.close]||c.close];\n"
                 "  if(modeTag[c.mode])p.unshift('['+modeTag[c.mode]+']');\n"
                 "  var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
                 "  if(tl)p.push(tl);if(fl)p.push(fl);\n"
                 "  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
                 "  if(c.minAtrHvn&&c.minAtrHvn>0)p.push('ATR≥'+parseFloat(c.minAtrHvn).toFixed(2)+'\xd7');\n"
                 "  return p.join(' | ');")
assert OLD_HVN_LABEL in html, '_cfgLabel HVN branch not found'
html = html.replace(OLD_HVN_LABEL, NEW_HVN_LABEL, 1)

# ── 12. _syncAllFromCfg: sync hvnMinAtr ─────────────────────────────────────
OLD_SYNC_END = ("  _setVal('hvnSigDiveMin',_diveMin);_setVal('stDiveMin',_diveMin);\n"
                "\n"
                "  /* update S.settings */")
NEW_SYNC_END = ("  _setVal('hvnSigDiveMin',_diveMin);_setVal('stDiveMin',_diveMin);\n"
                "  var _minAtr=cfg.minAtrHvn||0;\n"
                "  _setSelVal('hvnSigMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');\n"
                "  _setSelVal('stHvnMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');\n"
                "\n"
                "  /* update S.settings */")
assert OLD_SYNC_END in html, '_syncAllFromCfg diveMin end not found'
html = html.replace(OLD_SYNC_END, NEW_SYNC_END, 1)

# ── 13. Regenerate OPT_COMBOS with minAtrHvn dimension ──────────────────────
W        = [25,30,35,40,45,50,55,60]
CLOSE    = ['outside','mid','strong']
CONS     = [3,5,8]
TREND    = [None,-20,-10,-5,10,20,30]
FLOW     = [None,-10,-5,10,20,30]
HVN      = [0.25,0.35,0.50]
SL_HVN   = ['wick','hvn','atr']
TP_HVN   = ['hvn','1r','1.5r','2r']
SPIKE    = ['off','1.5','2.0']
MODE     = ['wick','dive','engulf','all']
DIVEMIN  = [2,3,4]
TB_F     = ['off','add','sub']
MINATR   = [None,0.05,0.10,0.15,0.20,0.25,0.30]

# random sampling without materialising the full 82M-combo product
rng = random.Random(42)
DIMS = [W,CLOSE,CONS,TREND,FLOW,HVN,SL_HVN,TP_HVN,SPIKE,MODE,DIVEMIN,TB_F,MINATR]
seen = set(); chosen_hvn = []
while len(chosen_hvn) < 1500:
    c = tuple(rng.choice(d) for d in DIMS)
    if c not in seen:
        seen.add(c); chosen_hvn.append(c)

def fmt_hvn(c):
    w,close,cons,trend,flow,hvn,sl,tp,spike,mode,dmin,tbf,matr = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    ma = 'null' if matr  is None else str(matr)
    return ('{w:'+str(w)+",close:'"+close+"',cons:"+str(cons)+
            ',trend:'+t+',flow:'+fl+',hvn:'+str(hvn)+
            ",sl:'"+sl+"',tp:'"+tp+"',volSpike:'"+spike+
            "',mode:'"+mode+"',diveMin:"+str(dmin)+",trendFilter:'"+tbf+
            "',minAtrHvn:"+ma+'}')

hvn_body = ',\n  '.join(fmt_hvn(c) for c in chosen_hvn)
NEW_OPT_COMBOS = 'var OPT_COMBOS=[\n  '+hvn_body+'\n];\n'

idx_hvn_s = html.index('var OPT_COMBOS=[')
idx_hvn_e = html.index('];\n', idx_hvn_s)+3
html = html[:idx_hvn_s] + NEW_OPT_COMBOS + html[idx_hvn_e:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.112 applied')
print('OPT_COMBOS entries:', NEW_OPT_COMBOS.count('},'))
