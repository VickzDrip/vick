#!/usr/bin/env python3
"""Beta 0.098 — Optimizer: 1000 combos por indicador (era 100 HVN / 60 FVG)"""

import random, itertools, json

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.097', 'Beta 0.098')

# ── 2. changelog ────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.098\n  - Fix: bot\xe3o APLICAR'
NEW_LOG = ('Beta 0.098\n'
           '  - Optimizer: 1000 combina\xe7\xf5es por indicador (era 100 HVN / 60 FVG).\n'
           '    Geradas por amostragem determin\xedstica (seed=42) do espa\xe7o completo\n'
           '    de par\xe2metros — cobre todas as dimens\xf5es de forma equilibrada.\n\n'
           'Beta 0.097\n  - Fix: bot\xe3o APLICAR')
assert OLD_LOG in html, "changelog anchor not found"
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Generate 1000 HVN combos ──────────────────────────────────────────────
rng = random.Random(42)

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

# build full product then sample 1000 unique
all_hvn = list(itertools.product(W,CLOSE,CONS,TREND,FLOW,HVN,SL_HVN,TP_HVN,SPIKE,MODE,DIVEMIN))
rng.shuffle(all_hvn)
chosen_hvn = all_hvn[:1000]

def fmt_hvn(c):
    w,close,cons,trend,flow,hvn,sl,tp,spike,mode,dmin = c
    t = 'null' if trend is None else str(trend)
    fl= 'null' if flow  is None else str(flow)
    return ('{w:'+str(w)+',close:\''+close+'\',cons:'+str(cons)+
            ',trend:'+t+',flow:'+fl+',hvn:'+str(hvn)+
            ',sl:\''+sl+'\',tp:\''+tp+'\',volSpike:\''+spike+
            '\',mode:\''+mode+'\',diveMin:'+str(dmin)+'}')

hvn_body = ',\n  '.join(fmt_hvn(c) for c in chosen_hvn)
NEW_OPT_COMBOS = 'var OPT_COMBOS=[\n  '+hvn_body+'\n];\n'

# ── 4. Generate 1000 FVG combos ──────────────────────────────────────────────
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

all_fvg = list(itertools.product(MINA,MITMODE,TREND_F,FLOW_F,REACT,REENTRY,SL_FVG,TP_FVG,MAXAGE,SPIKE_F))
rng2 = random.Random(99)
rng2.shuffle(all_fvg)
chosen_fvg = all_fvg[:1000]

def fmt_fvg(c):
    mina,mit,trend,flow,react,reentry,sl,tp,maxage,spike = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    r  = 'true' if react   else 'false'
    re = 'true' if reentry else 'false'
    return ('{minAtr:'+str(mina)+',mitMode:\''+mit+
            '\',trend:'+t+',flow:'+fl+
            ',react:'+r+',reentry:'+re+
            ',sl:\''+sl+'\',tp:\''+tp+
            '\',maxAge:'+str(maxage)+',volSpike:\''+spike+'\'}')

fvg_body = ',\n  '.join(fmt_fvg(c) for c in chosen_fvg)
NEW_FVG_COMBOS = 'var FVG_OPT_COMBOS=[\n  '+fvg_body+'\n];\n'

# ── 5. Replace old arrays in HTML ─────────────────────────────────────────────
# Find and replace OPT_COMBOS
idx_hvn_s = html.index('var OPT_COMBOS=[')
idx_hvn_e = html.index('];\n', idx_hvn_s)+3
html = html[:idx_hvn_s] + NEW_OPT_COMBOS + html[idx_hvn_e:]

# Find and replace FVG_OPT_COMBOS
idx_fvg_s = html.index('var FVG_OPT_COMBOS=[')
idx_fvg_e = html.index('];\n', idx_fvg_s)+3
html = html[:idx_fvg_s] + NEW_FVG_COMBOS + html[idx_fvg_e:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

# Verify counts
print('OPT_COMBOS entries:', NEW_OPT_COMBOS.count('},'))
print('FVG_OPT_COMBOS entries:', NEW_FVG_COMBOS.count('},'))
print('OK: Beta 0.098 applied')
