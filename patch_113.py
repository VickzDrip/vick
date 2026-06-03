#!/usr/bin/env python3
"""Beta 0.113 — TP%, TF HVN no optimizer, aplicar ao indicador somente via botão"""

import random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.112', 'Beta 0.113')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = ('Beta 0.113\n'
           '  - HVN minAtrHvn: filtro de tamanho m\xednimo de candle em ATR\n')
NEW_LOG = ('Beta 0.113\n'
           '  - Take Profit por porcentagem: op\xe7\xf5es 0.5% / 1% / 1.5% / 2% / 3%\n'
           '    adicionadas no Backtest e no Optimizer HVN.\n'
           '  - TF das Zonas HVN no Optimizer: nova dimens\xe3o testada (5m/15m/1h/4h/1D).\n'
           '  - Aplicar ao indicador somente via bot\xe3o: "APLICAR AO HVN SIGNALS" \xe9\n'
           '    o \xfanico caminho para alterar o indicador no gr\xe1fico. Clicar em\n'
           '    "APLICAR ESTA CONFIGURA\xc7\xc3O" no optimizer apenas carrega o\n'
           '    Backtest sem tocar no indicador.\n'
           '  - HVN minAtrHvn: filtro de tamanho m\xednimo de candle em ATR\n')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Backtest stTP select: add % options ───────────────────────────────────
OLD_ST_TP = ('<select class="dvl-st-sel" id="stTP">'
             '<option value="hvn" selected>Pr\xf3xima HVN</option>'
             '<option value="1r">1R</option>'
             '<option value="1.5r">1.5R</option>'
             '<option value="2r">2R</option></select>')
NEW_ST_TP = ('<select class="dvl-st-sel" id="stTP">'
             '<option value="hvn" selected>Pr\xf3xima HVN</option>'
             '<option value="1r">1R</option>'
             '<option value="1.5r">1.5R</option>'
             '<option value="2r">2R</option>'
             '<option value="0.5pct">0.5%</option>'
             '<option value="1pct">1.0%</option>'
             '<option value="1.5pct">1.5%</option>'
             '<option value="2pct">2.0%</option>'
             '<option value="3pct">3.0%</option>'
             '</select>')
assert OLD_ST_TP in html, 'stTP select not found'
html = html.replace(OLD_ST_TP, NEW_ST_TP, 1)

# ── 4. _stSwitchInd: add % options to HVN TP string ─────────────────────────
OLD_HVN_TP_STR = ("'<option value=\"hvn\" selected>Pr\xf3xima HVN</option>"
                  "<option value=\"1r\">1R</option>"
                  "<option value=\"1.5r\">1.5R</option>"
                  "<option value=\"2r\">2R</option>'")
NEW_HVN_TP_STR = ("'<option value=\"hvn\" selected>Pr\xf3xima HVN</option>"
                  "<option value=\"1r\">1R</option>"
                  "<option value=\"1.5r\">1.5R</option>"
                  "<option value=\"2r\">2R</option>"
                  "<option value=\"0.5pct\">0.5%</option>"
                  "<option value=\"1pct\">1.0%</option>"
                  "<option value=\"1.5pct\">1.5%</option>"
                  "<option value=\"2pct\">2.0%</option>"
                  "<option value=\"3pct\">3.0%</option>'")
assert OLD_HVN_TP_STR in html, '_stSwitchInd HVN TP string not found'
html = html.replace(OLD_HVN_TP_STR, NEW_HVN_TP_STR, 1)

# ── 5. _stSwitchInd: add % options to FVG TP string ─────────────────────────
OLD_FVG_TP_STR = ("'<option value=\"fvg\" selected>Pr\xf3ximo FVG</option>"
                  "<option value=\"1r\">1R</option>"
                  "<option value=\"1.5r\">1.5R</option>"
                  "<option value=\"2r\">2R</option>'")
NEW_FVG_TP_STR = ("'<option value=\"fvg\" selected>Pr\xf3ximo FVG</option>"
                  "<option value=\"1r\">1R</option>"
                  "<option value=\"1.5r\">1.5R</option>"
                  "<option value=\"2r\">2R</option>"
                  "<option value=\"0.5pct\">0.5%</option>"
                  "<option value=\"1pct\">1.0%</option>"
                  "<option value=\"1.5pct\">1.5%</option>"
                  "<option value=\"2pct\">2.0%</option>"
                  "<option value=\"3pct\">3.0%</option>'")
assert OLD_FVG_TP_STR in html, '_stSwitchInd FVG TP string not found'
html = html.replace(OLD_FVG_TP_STR, NEW_FVG_TP_STR, 1)

# ── 6. _stSwitchInd: add % options to TB TP string ──────────────────────────
OLD_TB_TP_STR = ("'<option value=\"flip\">Na pr\xf3xima virada</option>"
                 "<option value=\"1r\" selected>1R</option>"
                 "<option value=\"1.5r\">1.5R</option>"
                 "<option value=\"2r\">2R</option>'")
NEW_TB_TP_STR = ("'<option value=\"flip\">Na pr\xf3xima virada</option>"
                 "<option value=\"1r\" selected>1R</option>"
                 "<option value=\"1.5r\">1.5R</option>"
                 "<option value=\"2r\">2R</option>"
                 "<option value=\"0.5pct\">0.5%</option>"
                 "<option value=\"1pct\">1.0%</option>"
                 "<option value=\"1.5pct\">1.5%</option>"
                 "<option value=\"2pct\">2.0%</option>"
                 "<option value=\"3pct\">3.0%</option>'")
assert OLD_TB_TP_STR in html, '_stSwitchInd TB TP string not found'
html = html.replace(OLD_TB_TP_STR, NEW_TB_TP_STR, 1)

# ── 7. OPT_PARAMS: update TP entry + add TF entry ───────────────────────────
OLD_TP_PARAM = "  {n:'Take Profit',v:'Pr\xf3x. HVN \xb7 1R \xb7 1.5R \xb7 2R'},"
NEW_TP_PARAM = "  {n:'Take Profit',v:'Pr\xf3x. HVN \xb7 1R \xb7 1.5R \xb7 2R \xb7 0.5% \xb7 1% \xb7 1.5% \xb7 2% \xb7 3%'},"
assert OLD_TP_PARAM in html, 'OPT_PARAMS TP entry not found'
html = html.replace(OLD_TP_PARAM, NEW_TP_PARAM, 1)

OLD_TFLBL_PARAM = "  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},"
NEW_TFLBL_PARAM = "  {n:'TF das Zonas HVN',v:'5m \xb7 15m \xb7 1h \xb7 4h \xb7 1D (testado pelo optimizer)'},"
assert OLD_TFLBL_PARAM in html, 'OPT_PARAMS TF entry not found'
html = html.replace(OLD_TFLBL_PARAM, NEW_TFLBL_PARAM, 1)

# ── 8. Optimizer dispatch: use c.tf for HVN ──────────────────────────────────
OLD_HVN_DISPATCH = ("        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,"
                    "nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,"
                    "volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,"
                    "trendFilter:c.trendFilter||'off',period:_optPeriod,tf:_optTf}));")
NEW_HVN_DISPATCH = ("        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,"
                    "nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,"
                    "volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,"
                    "trendFilter:c.trendFilter||'off',hvnMinAtr:c.minAtrHvn||0,"
                    "period:_optPeriod,tf:c.tf||_optTf}));")
assert OLD_HVN_DISPATCH in html, 'HVN optimizer dispatch not found'
html = html.replace(OLD_HVN_DISPATCH, NEW_HVN_DISPATCH, 1)

# ── 9. _cfgLabel HVN: show TP% and TF ───────────────────────────────────────
OLD_HVN_LBL_END = ("  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
                   "  if(c.minAtrHvn&&c.minAtrHvn>0)p.push('ATR≥'+parseFloat(c.minAtrHvn).toFixed(2)+'\xd7');\n"
                   "  return p.join(' | ');")
NEW_HVN_LBL_END = ("  if(c.volSpike&&c.volSpike!=='off')p.push('Vol \xd7'+c.volSpike);\n"
                   "  if(c.minAtrHvn&&c.minAtrHvn>0)p.push('ATR≥'+parseFloat(c.minAtrHvn).toFixed(2)+'\xd7');\n"
                   "  if(c.tp&&c.tp.indexOf('pct')>-1)p.push('TP '+c.tp.replace('pct','')+'%');\n"
                   "  if(c.tf&&c.tf!=='5m')p.push('TF:'+c.tf);\n"
                   "  return p.join(' | ');")
assert OLD_HVN_LBL_END in html, '_cfgLabel HVN end not found'
html = html.replace(OLD_HVN_LBL_END, NEW_HVN_LBL_END, 1)

# ── 10. _hashCfg: add tp, tf into hash (already has tf via cfg.tf) ───────────
# cfg.tf is already in the hash; cfg.tp is not explicitly there.
# Add cfg.tp to the hash so different TP values produce different seeds.
OLD_HASH_LINE = ("    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10,\n"
                 "    cfg.hvnMinAtr||0")
NEW_HASH_LINE = ("    cfg.trendFilter||'off',cfg.tfBias||5,cfg.tfFast||3,cfg.tfSlow||10,\n"
                 "    cfg.hvnMinAtr||0,cfg.tp||''")
assert OLD_HASH_LINE in html, '_hashCfg hvnMinAtr line not found'
html = html.replace(OLD_HASH_LINE, NEW_HASH_LINE, 1)

# ── 11. HVN mock: handle pct TP (WR adjustment) ──────────────────────────────
OLD_HVN_WR_START = ("  var wr=0.50;\n"
                    "  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;")
NEW_HVN_WR_START = ("  var wr=0.50;\n"
                    "  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;\n"
                    "  var _tpPct=(typeof cfg.tp==='string'&&cfg.tp.indexOf('pct')>-1)?parseFloat(cfg.tp):0;\n"
                    "  if(_tpPct>0){\n"
                    "    if(_tpPct<=0.5){wr+=0.10;trades=Math.max(6,Math.round(trades*0.80));}\n"
                    "    else if(_tpPct<=1){wr+=0.06;trades=Math.max(6,Math.round(trades*0.90));}\n"
                    "    else if(_tpPct<=1.5){wr+=0.03;}\n"
                    "    else if(_tpPct<=2){wr-=0.02;}\n"
                    "    else{wr-=0.06;trades=Math.max(6,Math.round(trades*1.10));}\n"
                    "  }")
assert OLD_HVN_WR_START in html, 'HVN wr=0.50 block not found'
html = html.replace(OLD_HVN_WR_START, NEW_HVN_WR_START, 1)

# ── 12. _syncAllFromCfg: add skipIndicator param ─────────────────────────────
OLD_SYNC_DEF = "function _syncAllFromCfg(cfg){"
NEW_SYNC_DEF = "function _syncAllFromCfg(cfg,skipIndicator){"
assert OLD_SYNC_DEF in html, '_syncAllFromCfg definition not found'
html = html.replace(OLD_SYNC_DEF, NEW_SYNC_DEF, 1)

# Wrap the HVN indicator fields section in if(!skipIndicator)
OLD_IND_FIELDS = ("  /* ── HVN Signals indicator fields ── */\n"
                  "  _setVal('hvnSigMinWick', Math.min(80,Math.max(5,Math.round(ws))));\n"
                  "  _setVal('hvnSigSens',    Math.max(0,Math.min(50,Math.round(ws*0.4))));\n"
                  "  if(maxCandles)_setVal('hvnSigLateral', maxCandles);\n"
                  "  if(trend!==null)_setSelVal('hvnSigClarity', trend);\n"
                  "  if(flow!==null) _setSelVal('hvnSigFlow',    flow);\n"
                  "  if(nextHVN)     _setVal('hvnSigNextHVN',    nextHVN);\n"
                  "  if(sl)          _setSelVal('hvnSigSL',       sl);\n"
                  "  if(tp)          _setSelVal('hvnSigTP',       tp);\n"
                  "\n"
                  "  /* ── Strategy Tester Backtest form fields ── */")
NEW_IND_FIELDS = ("  /* ── HVN Signals indicator fields ── */\n"
                  "  if(!skipIndicator){\n"
                  "    _setVal('hvnSigMinWick', Math.min(80,Math.max(5,Math.round(ws))));\n"
                  "    _setVal('hvnSigSens',    Math.max(0,Math.min(50,Math.round(ws*0.4))));\n"
                  "    if(maxCandles)_setVal('hvnSigLateral', maxCandles);\n"
                  "    if(trend!==null)_setSelVal('hvnSigClarity', trend);\n"
                  "    if(flow!==null) _setSelVal('hvnSigFlow',    flow);\n"
                  "    if(nextHVN)     _setVal('hvnSigNextHVN',    nextHVN);\n"
                  "    if(sl)          _setSelVal('hvnSigSL',       sl);\n"
                  "    if(tp)          _setSelVal('hvnSigTP',       tp);\n"
                  "  }\n"
                  "\n"
                  "  /* ── Strategy Tester Backtest form fields ── */")
assert OLD_IND_FIELDS in html, '_syncAllFromCfg indicator fields block not found'
html = html.replace(OLD_IND_FIELDS, NEW_IND_FIELDS, 1)

# Also wrap the hvnSigTF, hvnSigVolSpike, hvnSigMode, hvnSigDiveMin, hvnSigMinAtr syncs
OLD_INDVOL_SYNC = ("  var volSpike=cfg.volSpike||'off';\n"
                   "  _setSelVal('hvnSigVolSpike',volSpike);_setSelVal('stFVol',volSpike);\n"
                   "  var _mode=cfg.mode||'wick';\n"
                   "  _setSelVal('hvnSigMode',_mode);_setSelVal('stMode',_mode);\n"
                   "  var _diveMin=cfg.diveMin||cfg.divemin||2;\n"
                   "  _setVal('hvnSigDiveMin',_diveMin);_setVal('stDiveMin',_diveMin);\n"
                   "  var _minAtr=cfg.minAtrHvn||0;\n"
                   "  _setSelVal('hvnSigMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');\n"
                   "  _setSelVal('stHvnMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');")
NEW_INDVOL_SYNC = ("  var volSpike=cfg.volSpike||'off';\n"
                   "  if(!skipIndicator)_setSelVal('hvnSigVolSpike',volSpike);\n"
                   "  _setSelVal('stFVol',volSpike);\n"
                   "  var _mode=cfg.mode||'wick';\n"
                   "  if(!skipIndicator)_setSelVal('hvnSigMode',_mode);\n"
                   "  _setSelVal('stMode',_mode);\n"
                   "  var _diveMin=cfg.diveMin||cfg.divemin||2;\n"
                   "  if(!skipIndicator)_setVal('hvnSigDiveMin',_diveMin);\n"
                   "  _setVal('stDiveMin',_diveMin);\n"
                   "  var _minAtr=cfg.minAtrHvn||0;\n"
                   "  if(!skipIndicator)_setSelVal('hvnSigMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');\n"
                   "  _setSelVal('stHvnMinAtr',_minAtr>0?parseFloat(_minAtr).toFixed(2):'0');")
assert OLD_INDVOL_SYNC in html, '_syncAllFromCfg vol/mode/diveMin block not found'
html = html.replace(OLD_INDVOL_SYNC, NEW_INDVOL_SYNC, 1)

# Also guard the tf sync for hvnSigTF
OLD_TF_SYNC = "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}"
NEW_TF_SYNC = "  if(tf){if(!skipIndicator)_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}"
assert OLD_TF_SYNC in html, '_syncAllFromCfg tf sync not found'
html = html.replace(OLD_TF_SYNC, NEW_TF_SYNC, 1)

# Guard S.settings update
OLD_SSETTINGS = ("  /* update S.settings */\n"
                 "  try{\n"
                 "    if(window.S&&window.S.settings){\n"
                 "      window.S.settings.hvnSigMinWick=Math.min(80,Math.max(5,Math.round(ws)));\n"
                 "      window.S.settings.hvnSigSens=Math.max(0,Math.min(50,Math.round(ws*0.4)));\n"
                 "    }\n"
                 "  }catch(_){}")
NEW_SSETTINGS = ("  /* update S.settings */\n"
                 "  if(!skipIndicator){\n"
                 "    try{\n"
                 "      if(window.S&&window.S.settings){\n"
                 "        window.S.settings.hvnSigMinWick=Math.min(80,Math.max(5,Math.round(ws)));\n"
                 "        window.S.settings.hvnSigSens=Math.max(0,Math.min(50,Math.round(ws*0.4)));\n"
                 "      }\n"
                 "    }catch(_){}\n"
                 "  }")
assert OLD_SSETTINGS in html, '_syncAllFromCfg S.settings block not found'
html = html.replace(OLD_SSETTINGS, NEW_SSETTINGS, 1)

# Guard drawSoon — only redraw if indicator was changed
OLD_DRAWSOON = ("  if(typeof drawSoon==='function')drawSoon();\n"
                "}\n"
                "\n"
                "function _applyToHVNSignals")
NEW_DRAWSOON = ("  if(!skipIndicator&&typeof drawSoon==='function')drawSoon();\n"
                "}\n"
                "\n"
                "function _applyToHVNSignals")
assert OLD_DRAWSOON in html, '_syncAllFromCfg drawSoon block not found'
html = html.replace(OLD_DRAWSOON, NEW_DRAWSOON, 1)

# ── 13. _applyRankResult: pass skipIndicator=true ────────────────────────────
OLD_APPLY_RANK_CALL = "  _applyToHVNSignals(combo);"
NEW_APPLY_RANK_CALL = "  _syncAllFromCfg(combo,true);  /* only load into backtest form, not indicator */"
assert OLD_APPLY_RANK_CALL in html, '_applyRankResult call not found'
html = html.replace(OLD_APPLY_RANK_CALL, NEW_APPLY_RANK_CALL, 1)

# ── 14. Regenerate OPT_COMBOS with TF + TP% dimensions ──────────────────────
W        = [25,30,35,40,45,50,55,60]
CLOSE    = ['outside','mid','strong']
CONS     = [3,5,8]
TREND    = [None,-20,-10,-5,10,20,30]
FLOW     = [None,-10,-5,10,20,30]
HVN      = [0.25,0.35,0.50]
SL_HVN   = ['wick','hvn','atr']
TP_HVN   = ['hvn','1r','1.5r','2r','0.5pct','1pct','1.5pct','2pct','3pct']
SPIKE    = ['off','1.5','2.0']
MODE     = ['wick','dive','engulf','all']
DIVEMIN  = [2,3,4]
TB_F     = ['off','add','sub']
MINATR   = [None,0.05,0.10,0.15,0.20,0.25,0.30]
TF_HVN   = ['5m','15m','1h','4h','1d']

rng = random.Random(42)
DIMS = [W,CLOSE,CONS,TREND,FLOW,HVN,SL_HVN,TP_HVN,SPIKE,MODE,DIVEMIN,TB_F,MINATR,TF_HVN]
seen = set(); chosen_hvn = []
while len(chosen_hvn) < 1500:
    c = tuple(rng.choice(d) for d in DIMS)
    if c not in seen:
        seen.add(c); chosen_hvn.append(c)

def fmt_hvn(c):
    w,close,cons,trend,flow,hvn,sl,tp,spike,mode,dmin,tbf,matr,tf = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    ma = 'null' if matr  is None else str(matr)
    return ('{w:'+str(w)+",close:'"+close+"',cons:"+str(cons)+
            ',trend:'+t+',flow:'+fl+',hvn:'+str(hvn)+
            ",sl:'"+sl+"',tp:'"+tp+"',volSpike:'"+spike+
            "',mode:'"+mode+"',diveMin:"+str(dmin)+",trendFilter:'"+tbf+
            "',minAtrHvn:"+ma+",tf:'"+tf+"'}")

hvn_body = ',\n  '.join(fmt_hvn(c) for c in chosen_hvn)
NEW_OPT_COMBOS = 'var OPT_COMBOS=[\n  '+hvn_body+'\n];\n'

idx_hvn_s = html.index('var OPT_COMBOS=[')
idx_hvn_e = html.index('];\n', idx_hvn_s)+3
html = html[:idx_hvn_s] + NEW_OPT_COMBOS + html[idx_hvn_e:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.113 applied')
print('OPT_COMBOS entries:', NEW_OPT_COMBOS.count('},'))
