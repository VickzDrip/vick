#!/usr/bin/env python3
"""Beta 0.088 — Optimizer: OPT_COMBOS expandido para 100 combinações"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.087', 'Beta 0.088')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.088\n  - Optimizer: OPT_COMBOS expandido de 20 para 50',
    '''Beta 0.088
  - Optimizer: OPT_COMBOS expandido para 100 combos cobrindo wick (27),
    dive (25), engulf (23) e all (25) com variações de pavio, filtros,
    spike, SL/TP e profundidade de mergulho.

Beta 0.087
  - Optimizer: OPT_COMBOS expandido de 20 para 50''',
    1
)

# ── 3. Replace OPT_COMBOS block ───────────────────────────────────────────────
start = html.find('var OPT_COMBOS=[')
end   = html.find('];', start) + 2
assert start > 0, "OPT_COMBOS not found"

NEW_OPT_COMBOS = """var OPT_COMBOS=[
  /* ── WICK REJECTION — LONG (14) ─────────────────────────────────────── */
  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},
  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},
  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'wick',diveMin:2},
  {w:55,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'atr',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},
  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'wick',diveMin:2},
  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2},
  {w:45,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'wick',diveMin:2},
  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2},
  {w:35,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:55,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},
  {w:40,close:'outside',cons:8,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:60,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'wick',diveMin:2},
  {w:50,close:'strong',cons:3,trend:20,flow:20,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  /* ── WICK REJECTION — SHORT (13) ───────────────────────────────────── */
  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2},
  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2},
  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'wick',diveMin:2},
  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'wick',diveMin:2},
  {w:35,close:'outside',cons:5,trend:-10,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'wick',diveMin:2},
  {w:55,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:40,close:'outside',cons:8,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'wick',diveMin:2},
  {w:60,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.25,sl:'wick',tp:'1r',volSpike:'2.0',mode:'wick',diveMin:2},
  {w:40,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},
  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'wick',diveMin:2},
  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'wick',diveMin:2},
  {w:60,close:'strong',cons:3,trend:30,flow:null,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'wick',diveMin:2},
  /* ── DIVE & RECOVER — LONG (14) ──────────────────────────────────── */
  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:30,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'dive',diveMin:2},
  {w:40,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:3},
  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2},
  {w:40,close:'outside',cons:5,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'1.5',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2},
  {w:40,close:'mid',cons:5,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:2},
  {w:40,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:3},
  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:4},
  {w:40,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:2},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'dive',diveMin:3},
  {w:45,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'dive',diveMin:2},
  /* ── DIVE & RECOVER — SHORT (11) ──────────────────────────────────── */
  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},
  {w:40,close:'outside',cons:5,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'dive',diveMin:3},
  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2},
  {w:40,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},
  {w:30,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:3},
  {w:40,close:'outside',cons:3,trend:-5,flow:null,hvn:0.5,sl:'atr',tp:'2r',volSpike:'off',mode:'dive',diveMin:2},
  {w:35,close:'outside',cons:5,trend:-10,flow:-5,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'dive',diveMin:2},
  {w:30,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'dive',diveMin:2},
  {w:45,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'dive',diveMin:2},
  /* ── ENGOLFING — LONG (12) ──────────────────────────────────────── */
  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:35,close:'outside',cons:3,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'engulf',diveMin:1},
  {w:25,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:5,trend:20,flow:null,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:35,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'mid',cons:5,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:1},
  {w:25,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:1},
  {w:35,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'atr',tp:'2r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:null,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'engulf',diveMin:1},
  /* ── ENGOLFING — SHORT (11) ─────────────────────────────────────── */
  {w:30,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:35,close:'outside',cons:3,trend:-5,flow:null,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:1},
  {w:25,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:5,trend:-5,flow:null,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:25,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'2.0',mode:'engulf',diveMin:1},
  {w:30,close:'mid',cons:5,trend:-5,flow:-5,hvn:0.5,sl:'wick',tp:'1.5r',volSpike:'off',mode:'engulf',diveMin:1},
  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'engulf',diveMin:1},
  {w:30,close:'outside',cons:3,trend:null,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'engulf',diveMin:1},
  /* ── TODOS OS PADRÕES (25) ──────────────────────────────────────── */
  {w:45,close:'outside',cons:5,trend:30,flow:30,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2},
  {w:50,close:'outside',cons:3,trend:30,flow:20,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:40,close:'outside',cons:5,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2},
  {w:35,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2},
  {w:45,close:'outside',cons:5,trend:-10,flow:-10,hvn:0.35,sl:'wick',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2},
  {w:50,close:'outside',cons:3,trend:-10,flow:-5,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:40,close:'outside',cons:5,trend:20,flow:null,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2},
  {w:35,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:3},
  {w:40,close:'mid',cons:5,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'off',mode:'all',diveMin:3},
  {w:50,close:'outside',cons:3,trend:20,flow:20,hvn:0.25,sl:'atr',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:35,close:'outside',cons:3,trend:-10,flow:-10,hvn:0.35,sl:'hvn',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:45,close:'strong',cons:3,trend:30,flow:20,hvn:0.25,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2},
  {w:30,close:'outside',cons:5,trend:null,flow:null,hvn:0.35,sl:'wick',tp:'hvn',volSpike:'off',mode:'all',diveMin:2},
  {w:55,close:'outside',cons:3,trend:30,flow:30,hvn:0.25,sl:'hvn',tp:'2r',volSpike:'2.0',mode:'all',diveMin:2},
  {w:40,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'wick',tp:'1.5r',volSpike:'2.0',mode:'all',diveMin:2},
  {w:35,close:'outside',cons:5,trend:20,flow:10,hvn:0.5,sl:'wick',tp:'1r',volSpike:'off',mode:'all',diveMin:3},
  {w:45,close:'outside',cons:5,trend:-5,flow:-5,hvn:0.35,sl:'wick',tp:'1r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:50,close:'outside',cons:3,trend:30,flow:null,hvn:0.25,sl:'hvn',tp:'hvn',volSpike:'1.5',mode:'all',diveMin:2},
  {w:30,close:'outside',cons:3,trend:20,flow:20,hvn:0.35,sl:'hvn',tp:'2r',volSpike:'off',mode:'all',diveMin:4},
  {w:40,close:'mid',cons:8,trend:10,flow:10,hvn:0.5,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:2},
  {w:45,close:'outside',cons:5,trend:30,flow:20,hvn:0.35,sl:'atr',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2},
  {w:35,close:'outside',cons:3,trend:-20,flow:-10,hvn:0.25,sl:'hvn',tp:'1r',volSpike:'2.0',mode:'all',diveMin:2},
  {w:50,close:'outside',cons:5,trend:20,flow:20,hvn:0.25,sl:'wick',tp:'2r',volSpike:'1.5',mode:'all',diveMin:3},
  {w:40,close:'outside',cons:3,trend:null,flow:null,hvn:0.25,sl:'hvn',tp:'1.5r',volSpike:'off',mode:'all',diveMin:2},
  {w:55,close:'outside',cons:3,trend:20,flow:20,hvn:0.25,sl:'atr',tp:'hvn',volSpike:'2.0',mode:'all',diveMin:2},
];"""

html = html[:start] + NEW_OPT_COMBOS + html[end:]

with open(src,'w',encoding='utf-8') as f:
    f.write(html)

# verify count
import re
combos = re.findall(r'\{w:', html[html.find('var OPT_COMBOS'):html.find('];', html.find('var OPT_COMBOS'))+2])
print(f'Total combos: {len(combos)}')
modes = re.findall(r"mode:'(\w+)'", html[html.find('var OPT_COMBOS'):html.find('];', html.find('var OPT_COMBOS'))+2])
from collections import Counter
print('By mode:', dict(Counter(modes)))
print('OK: Beta 0.088 applied')
