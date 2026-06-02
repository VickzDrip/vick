#!/usr/bin/env python3
"""Beta 0.107 — Fix: _cfgLabel TB undefined%, batch 15+4ms delay, 1500 combos (sem freeze mobile)"""

import itertools, random

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.106', 'Beta 0.107')

# ── 2. changelog ─────────────────────────────────────────────────────────────
OLD_LOG = 'Beta 0.107\n  - Optimizer: combos aumentados de 1000 para 3000'
NEW_LOG = ('Beta 0.107\n'
           '  - Fix: _cfgLabel exibia "Pavio > undefined%" para combos TB.\n'
           '    Adicionado branch espec\xedfico para Trend Break no label.\n'
           '  - Optimizer: combos reduzidos de 3000 para 1500 por indicador;\n'
           '    batch 50 → 15 por tick; setTimeout(step,0) → setTimeout(step,4).\n'
           '    Evita travamento no mobile (cada tick usa ≤15ms, browser respira).\n\n'
           'Beta 0.106\n  - Optimizer: combos aumentados de 1000 para 3000')
assert OLD_LOG in html, 'changelog anchor not found'
html = html.replace(OLD_LOG, NEW_LOG, 1)

# ── 3. Fix _cfgLabel: add TB branch ──────────────────────────────────────────
OLD_CFG_LABEL = ("function _cfgLabel(c){\n"
    "  if(c.minAtr!==undefined){")
NEW_CFG_LABEL = ("function _cfgLabel(c){\n"
    "  if(c.fast!==undefined){\n"
    "    var p=['TB F'+c.fast+'/S'+c.slow];\n"
    "    if(c.bias>0)p.push('Bias≥'+c.bias);\n"
    "    if(c.exitMode==='sltp')p.push('SL/TP');\n"
    "    var tl=_tLabel(c.trend),fl=_fLabel(c.flow);\n"
    "    if(tl)p.push(tl);if(fl)p.push(fl);\n"
    "    if(c.volSpike&&c.volSpike!=='off')p.push('Vol\xd7'+c.volSpike);\n"
    "    return p.join(' | ');\n"
    "  }\n"
    "  if(c.minAtr!==undefined){")
assert OLD_CFG_LABEL in html, '_cfgLabel not found'
html = html.replace(OLD_CFG_LABEL, NEW_CFG_LABEL, 1)

# ── 4. Batch size: 50 → 15 ───────────────────────────────────────────────────
OLD_BATCH = '    var batch=Math.min(50,total-done);'
NEW_BATCH = '    var batch=Math.min(15,total-done);'
assert OLD_BATCH in html, 'batch size line not found'
html = html.replace(OLD_BATCH, NEW_BATCH, 1)

# ── 5. setTimeout(step,0) → setTimeout(step,4) ───────────────────────────────
OLD_STEP = "    setTimeout(step,0);"
NEW_STEP = "    setTimeout(step,4);"
assert OLD_STEP in html, 'setTimeout(step,0) not found'
html = html.replace(OLD_STEP, NEW_STEP, 1)

# ── 6. Generate 1500 HVN combos ──────────────────────────────────────────────
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
chosen_hvn = all_hvn[:1500]

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

# ── 7. Generate 1500 FVG combos ──────────────────────────────────────────────
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
chosen_fvg = all_fvg[:1500]

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

# ── 8. Generate 1500 TB combos ───────────────────────────────────────────────
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
chosen_tb = all_tb[:1500]

def fmt_tb(c):
    fast,slow,bias,exit_,sl,tp,trend,flow,spike = c
    t  = 'null' if trend is None else str(trend)
    fl = 'null' if flow  is None else str(flow)
    return ('{fast:'+str(fast)+',slow:'+str(slow)+',bias:'+str(bias)+
            ",exitMode:'"+exit_+"',sl:'"+sl+"',tp:'"+tp+
            "',trend:"+t+',flow:'+fl+",volSpike:'"+spike+"'}")

tb_body = ',\n  '.join(fmt_tb(c) for c in chosen_tb)
NEW_TB_COMBOS = 'var TB_OPT_COMBOS=[\n  '+tb_body+'\n];\n'

# ── 9. Replace all three combo arrays ────────────────────────────────────────
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

print('OK: Beta 0.107 applied')
print('OPT_COMBOS:    ', NEW_OPT_COMBOS.count('},'))
print('FVG_OPT_COMBOS:', NEW_FVG_COMBOS.count('},'))
print('TB_OPT_COMBOS: ', NEW_TB_COMBOS.count('},'))
