#!/usr/bin/env python3
"""Beta 0.106 — Optimizer: 3000 combos/ind, batch 50, exibe top 10 configurações"""

import itertools, random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.105', 'Beta 0.106')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.106\n  - Optimizer HVN e FVG: filtro TB'
NEW_LOG = ('Beta 0.106\n'
           '  - Optimizer: combos aumentados de 1000 para 3000 por indicador\n'
           '    (HVN, FVG e TB). Cobertura 3\xd7 maior do espa\xe7o de par\xe2metros.\n'
           '  - Batch de processamento: 20 → 50 combos por tick. 3000 combos\n'
           '    completam em ~2\xe2\x80\x933s (mesmo tempo de antes).\n'
           '  - Ranking: exibe top 10 melhores configura\xe7\xf5es (era top 5).\n\n'
           'Beta 0.105\n  - Optimizer HVN e FVG: filtro TB')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Batch size: 20 → 50 ───────────────────────────────────────────────────
OLD_BATCH = '    var batch=Math.min(20,total-done);'
NEW_BATCH = '    var batch=Math.min(50,total-done);'
assert OLD_BATCH in html, 'batch size line not found'
html = html.replace(OLD_BATCH, NEW_BATCH, 1)

# ── 4. Top 5 → top 10 ────────────────────────────────────────────────────────
OLD_SLICE  = '  _bestCfgs=scored.slice(0,5).map(function(x){return x.r;});'
NEW_SLICE  = '  _bestCfgs=scored.slice(0,10).map(function(x){return x.r;});'
assert OLD_SLICE in html, 'slice(0,5) not found'
html = html.replace(OLD_SLICE, NEW_SLICE, 1)

OLD_RANK_CLS = "var RANK_CLS=['r1','r2','r3','rn','rn'];"
NEW_RANK_CLS = "var RANK_CLS=['r1','r2','r3','rn','rn','rn','rn','rn','rn','rn'];"
assert OLD_RANK_CLS in html, 'RANK_CLS not found'
html = html.replace(OLD_RANK_CLS, NEW_RANK_CLS, 1)

OLD_TOP5_LABEL = 'TOP 5 MELHORES CONFIGURAÇÕES'
NEW_TOP5_LABEL = 'TOP 10 MELHORES CONFIGURAÇÕES'
assert OLD_TOP5_LABEL in html, 'TOP 5 label not found'
html = html.replace(OLD_TOP5_LABEL, NEW_TOP5_LABEL, 1)

# ── 5. Generate 3000 HVN combos ──────────────────────────────────────────────
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
chosen_hvn = all_hvn[:3000]

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

# ── 6. Generate 3000 FVG combos ──────────────────────────────────────────────
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
chosen_fvg = all_fvg[:3000]

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

# ── 7. Generate 3000 TB combos ───────────────────────────────────────────────
FAST_TB  = [2,3,5,7,10]
SLOW_TB  = [8,10,14,20,30]
BIAS_TB  = [0,3,5,10,15]
EXIT_TB  = ['flip','sltp']
SL_TB    = ['wick','atr','fixed']
TP_TB    = ['1r','1.5r','2r','flip']
TREND_TB = [None,-10,10,20,30]
FLOW_TB  = [None,-10,10,20,30]
SPIKE_TB = ['off','1.5','2.0']

all_tb = list(itertools.product(FAST_TB,SLOW_TB,BIAS_TB,EXIT_TB,SL_TB,TP_TB,TREND_TB,FLOW_TB,SPIKE_TB))
rng_tb = random.Random(77)
rng_tb.shuffle(all_tb)
chosen_tb = all_tb[:3000]

def fmt_tb(c):
    fast,slow,bias,exit_,sl,tp,trend,flow,spike = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    return ('{fast:'+str(fast)+',slow:'+str(slow)+',bias:'+str(bias)+
            ",exitMode:'"+exit_+"',sl:'"+sl+"',tp:'"+tp+
            "',trend:"+t+',flow:'+fl+",volSpike:'"+spike+"'}")

tb_body = ',\n  '.join(fmt_tb(c) for c in chosen_tb)
NEW_TB_COMBOS = 'var TB_OPT_COMBOS=[\n  '+tb_body+'\n];\n'

# ── 8. Replace all three combo arrays ────────────────────────────────────────
idx_hvn_s = html.index('var OPT_COMBOS=[')
idx_hvn_e = html.index('];\n', idx_hvn_s)+3
html = html[:idx_hvn_s] + NEW_OPT_COMBOS + html[idx_hvn_e:]

idx_fvg_s = html.index('var FVG_OPT_COMBOS=[')
idx_fvg_e = html.index('];\n', idx_fvg_s)+3
html = html[:idx_fvg_s] + NEW_FVG_COMBOS + html[idx_fvg_e:]

idx_tb_s = html.index('var TB_OPT_COMBOS=[')
idx_tb_e = html.index('];\n', idx_tb_s)+3
html = html[:idx_tb_s] + NEW_TB_COMBOS + html[idx_tb_e:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

print('OK: Beta 0.106 applied')
print('OPT_COMBOS:    ', NEW_OPT_COMBOS.count('},'))
print('FVG_OPT_COMBOS:', NEW_FVG_COMBOS.count('},'))
print('TB_OPT_COMBOS: ', NEW_TB_COMBOS.count('},'))
