#!/usr/bin/env python3
"""Beta 0.105 — Filtro TB no Optimizer: trendFilter (Off/Adicional/Substitui) em HVN e FVG"""

import itertools, random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.104', 'Beta 0.105')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.105\n  - Indicador Trend Break'
NEW_LOG = ('Beta 0.105\n'
           '  - Optimizer HVN e FVG: filtro TB adicionado como dimens\xe3o testada.\n'
           '    Valores: Off / Adicional / Substitui. Combos regnerados com\n'
           '    a nova dimens\xe3o (seed=42 HVN, seed=99 FVG).\n'
           '  - Mock backtest: trendFilter=\'add\' reduz trades 28%+WR +6%;\n'
           '    trendFilter=\'sub\' reduz trades 55%+WR +11% (sinais s\xf3 TB).\n\n'
           'Beta 0.104\n  - Indicador Trend Break')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Add Filtro TB to OPT_PARAMS ───────────────────────────────────────────
OLD_OPT_PARAMS_END = "  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},\n];\nvar FVG_OPT_PARAMS="
NEW_OPT_PARAMS_END = ("  {n:'TF das Zonas HVN',v:'Config. no indicador (MTF)'},\n"
                      "  {n:'Filtro TB',v:'Off \xb7 Adicional \xb7 Substitui'},\n"
                      "];\nvar FVG_OPT_PARAMS=")
assert OLD_OPT_PARAMS_END in html, 'OPT_PARAMS end not found'
html = html.replace(OLD_OPT_PARAMS_END, NEW_OPT_PARAMS_END, 1)

# ── 4. Add Filtro TB to FVG_OPT_PARAMS ───────────────────────────────────────
OLD_FVG_PARAMS_END = ("  {n:'Idade m\xe1x. FVG',v:'Sem limite \xb7 100 \xb7 200 \xb7 300 barras'},\n"
                      "];\nvar TB_OPT_PARAMS=")
NEW_FVG_PARAMS_END = ("  {n:'Idade m\xe1x. FVG',v:'Sem limite \xb7 100 \xb7 200 \xb7 300 barras'},\n"
                      "  {n:'Filtro TB',v:'Off \xb7 Adicional \xb7 Substitui'},\n"
                      "];\nvar TB_OPT_PARAMS=")
assert OLD_FVG_PARAMS_END in html, 'FVG_OPT_PARAMS end not found'
html = html.replace(OLD_FVG_PARAMS_END, NEW_FVG_PARAMS_END, 1)

# ── 5. HVN mock: apply trendFilter to trade count ────────────────────────────
OLD_HVN_TRADES = ("  var trades=Math.max(8,tradesBase);\n"
                  "\n"
                  "  var wr=0.50;\n"
                  "  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;")
NEW_HVN_TRADES = ("  var trades=Math.max(8,tradesBase);\n"
                  "  var _tbf=cfg.trendFilter||'off';\n"
                  "  if(_tbf==='add')trades=Math.max(5,Math.round(trades*0.72));\n"
                  "  else if(_tbf==='sub')trades=Math.max(4,Math.round(trades*0.45));\n"
                  "\n"
                  "  var wr=0.50;\n"
                  "  if(ws>=45)wr+=0.04;if(ws>=55)wr+=0.03;")
assert OLD_HVN_TRADES in html, 'HVN trades block not found'
html = html.replace(OLD_HVN_TRADES, NEW_HVN_TRADES, 1)

OLD_HVN_WR_END = ("  if(_mode==='dive')wr+=0.06;else if(_mode==='engulf')wr+=0.09;else if(_mode==='all')wr-=0.01;\n"
                  "  wr+=rnd(-0.03,0.03);\n"
                  "  wr=Math.max(0.36,Math.min(0.78,wr));")
NEW_HVN_WR_END = ("  if(_mode==='dive')wr+=0.06;else if(_mode==='engulf')wr+=0.09;else if(_mode==='all')wr-=0.01;\n"
                  "  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;\n"
                  "  wr+=rnd(-0.03,0.03);\n"
                  "  wr=Math.max(0.36,Math.min(0.78,wr));")
assert OLD_HVN_WR_END in html, 'HVN wr end not found'
html = html.replace(OLD_HVN_WR_END, NEW_HVN_WR_END, 1)

# ── 6. FVG mock: apply trendFilter to trade count ────────────────────────────
OLD_FVG_TRADES = ("  var trades=Math.max(5,tradesBase);\n"
                  "  var wr=0.51;\n"
                  "  if(clarity!==null){")
NEW_FVG_TRADES = ("  var trades=Math.max(5,tradesBase);\n"
                  "  var _tbf=cfg.trendFilter||'off';\n"
                  "  if(_tbf==='add')trades=Math.max(4,Math.round(trades*0.72));\n"
                  "  else if(_tbf==='sub')trades=Math.max(3,Math.round(trades*0.45));\n"
                  "  var wr=0.51;\n"
                  "  if(clarity!==null){")
assert OLD_FVG_TRADES in html, 'FVG trades block not found'
html = html.replace(OLD_FVG_TRADES, NEW_FVG_TRADES, 1)

OLD_FVG_WR_END = ("  if(_minAtr>=0.15)wr+=0.05;else if(_minAtr>=0.10)wr+=0.03;\n"
                  "  wr+=rnd(-0.03,0.03);\n"
                  "  wr=Math.max(0.38,Math.min(0.80,wr));")
NEW_FVG_WR_END = ("  if(_minAtr>=0.15)wr+=0.05;else if(_minAtr>=0.10)wr+=0.03;\n"
                  "  if(_tbf==='add')wr+=0.06;else if(_tbf==='sub')wr+=0.11;\n"
                  "  wr+=rnd(-0.03,0.03);\n"
                  "  wr=Math.max(0.38,Math.min(0.80,wr));")
assert OLD_FVG_WR_END in html, 'FVG wr end not found'
html = html.replace(OLD_FVG_WR_END, NEW_FVG_WR_END, 1)

# ── 7. Optimizer dispatch: pass trendFilter for HVN and FVG ──────────────────
OLD_OPT_HVN_CALL = ("        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,period:_optPeriod,tf:_optTf}));")
NEW_OPT_HVN_CALL = ("        _cachedBacktest({wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,sl:c.sl,tp:c.tp,risk:1.0,close:c.close,cons:c.cons,volSpike:c.volSpike||'off',mode:c.mode||'wick',diveMin:c.diveMin||2,trendFilter:c.trendFilter||'off',period:_optPeriod,tf:_optTf}));")
assert OLD_OPT_HVN_CALL in html, 'optimizer HVN call not found'
html = html.replace(OLD_OPT_HVN_CALL, NEW_OPT_HVN_CALL, 1)

OLD_OPT_FVG_CALL = ("        _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,period:_optPeriod,tf:_optTf}):")
NEW_OPT_FVG_CALL = ("        _cachedBacktest({signalType:'fvgConf',trend:c.trend,flow:c.flow,volSpike:c.volSpike||'off',sl:c.sl,tp:c.tp,risk:1.0,fvgMinAtr:c.minAtr,fvgMit:c.mitMode,fvgReact:c.react,fvgReentry:c.reentry,fvgMaxAge:c.maxAge,trendFilter:c.trendFilter||'off',period:_optPeriod,tf:_optTf}):")
assert OLD_OPT_FVG_CALL in html, 'optimizer FVG call not found'
html = html.replace(OLD_OPT_FVG_CALL, NEW_OPT_FVG_CALL, 1)

# ── 8. Regenerate OPT_COMBOS with trendFilter dimension ──────────────────────
W       = [25,30,35,40,45,50,55,60]
CLOSE   = ['outside','mid','strong']
CONS    = [3,5,8]
TREND   = [None,-20,-10,-5,10,20,30]
FLOW    = [None,-10,-5,10,20,30]
HVN     = [0.25,0.35,0.50]
SL_HVN  = ['wick','hvn','atr']
TP_HVN  = ['hvn','1r','1.5r','2r']
SPIKE   = ['off','1.5','2.0']
MODE    = ['wick','dive','engulf','all']
DIVEMIN = [2,3,4]
TB_F    = ['off','add','sub']

all_hvn = list(itertools.product(W,CLOSE,CONS,TREND,FLOW,HVN,SL_HVN,TP_HVN,SPIKE,MODE,DIVEMIN,TB_F))
rng = random.Random(42)
rng.shuffle(all_hvn)
chosen_hvn = all_hvn[:1000]

def fmt_hvn(c):
    w,close,cons,trend,flow,hvn,sl,tp,spike,mode,dmin,tbf = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    return ('{w:'+str(w)+",close:'"+close+"',cons:"+str(cons)+
            ',trend:'+t+',flow:'+fl+',hvn:'+str(hvn)+
            ",sl:'"+sl+"',tp:'"+tp+"',volSpike:'"+spike+
            "',mode:'"+mode+"',diveMin:"+str(dmin)+",trendFilter:'"+tbf+"'}")

hvn_body = ',\n  '.join(fmt_hvn(c) for c in chosen_hvn)
NEW_OPT_COMBOS = 'var OPT_COMBOS=[\n  '+hvn_body+'\n];\n'

# ── 9. Regenerate FVG_OPT_COMBOS with trendFilter dimension ──────────────────
MINA    = [0.05,0.08,0.10,0.12,0.15,0.20,0.25]
MITMODE = ['wick','close']
TREND_F = [None,-10,10,20,30]
FLOW_F  = [None,-10,10,20,30]
REACT   = [True,False]
REENTRY = [True,False]
SL_FVG  = ['wick','fvg','atr']
TP_FVG  = ['fvg','1r','1.5r','2r']
MAXAGE  = [0,100,200,300,500]
SPIKE_F = ['off','1.5','2.0']

all_fvg = list(itertools.product(MINA,MITMODE,TREND_F,FLOW_F,REACT,REENTRY,SL_FVG,TP_FVG,MAXAGE,SPIKE_F,TB_F))
rng2 = random.Random(99)
rng2.shuffle(all_fvg)
chosen_fvg = all_fvg[:1000]

def fmt_fvg(c):
    mina,mit,trend,flow,react,reentry,sl,tp,maxage,spike,tbf = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    r  = 'true' if react   else 'false'
    re = 'true' if reentry else 'false'
    return ('{minAtr:'+str(mina)+",mitMode:'"+mit+
            "',trend:"+t+',flow:'+fl+
            ',react:'+r+',reentry:'+re+
            ",sl:'"+sl+"',tp:'"+tp+
            "',maxAge:"+str(maxage)+",volSpike:'"+spike+
            "',trendFilter:'"+tbf+"'}")

fvg_body = ',\n  '.join(fmt_fvg(c) for c in chosen_fvg)
NEW_FVG_COMBOS = 'var FVG_OPT_COMBOS=[\n  '+fvg_body+'\n];\n'

# Replace OPT_COMBOS
idx_hvn_s = html.index('var OPT_COMBOS=[')
idx_hvn_e = html.index('];\n', idx_hvn_s)+3
html = html[:idx_hvn_s] + NEW_OPT_COMBOS + html[idx_hvn_e:]

# Replace FVG_OPT_COMBOS
idx_fvg_s = html.index('var FVG_OPT_COMBOS=[')
idx_fvg_e = html.index('];\n', idx_fvg_s)+3
html = html[:idx_fvg_s] + NEW_FVG_COMBOS + html[idx_fvg_e:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.105 applied')
print('OPT_COMBOS entries:    ', NEW_OPT_COMBOS.count('},'))
print('FVG_OPT_COMBOS entries:', NEW_FVG_COMBOS.count('},'))
