#!/usr/bin/env python3
"""patch_174.py — Beta 0.174: Spike Zones — body source bug fix

Problema: Com Zone Source = Body e Merge = OFF, as zonas ficavam muito
maiores do que o corpo do candle de origem. Três causas identificadas:

1. ATR cap (linha ~25423) corria para source='body', podia distorcer
   zonas de doji (hi≈lo) para ±0.75×ATR em vez do corpo real.

2. Doji fallback (linha ~25421): if(hi<=lo)lo=hi-at*0.01 — para body,
   o fallback correto é centrar no mid com margem mínima (at*0.002),
   não usar at*0.01 que pode ser maior que o corpo pretendido.

3. Body clamp ausente: rawHi/rawLo podiam divergir do open/close
   real após os passos anteriores.

4. Merge loop (linha ~25451): corria mesmo quando cfg.mergeDist=0,
   causando expansão de hi/lo de zonas sobrepostas de candles diferentes.

5. Proximity merge (linha ~25530): _proximityGroup expandia sempre
   hi=max e lo=min — para source='body', deve preservar os bounds do
   melhor candle em vez de expandir para a union de dois corpos.

6. Novo debug toggle: window.__debugSpikeZones = true no console imprime
   console.table com hi/lo/height de todas as zonas calculadas.

Sem alterações de UI, layout ou outras features.
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.173') >= 10, f'Beta 0.173 not found (count={html.count("Beta 0.173")})'
html = html.replace('Beta 0.173', 'Beta 0.174')

# ── 1. Doji fallback + ATR cap guard + body clamp ────────────────────────────
# Anchor: linhas 25421-25424 (lidas acima)
OLD_ATR = (
    '      if(hi<=lo)lo=hi-at*0.01;\n'
    '      /* ATR cap skipped in hvs_only — the HVS inner core is already tight */\n'
    '      if(!hvsOnly&&at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}\n'
    '      var rawHi=hi,rawLo=lo;'
)
assert OLD_ATR in html, 'ATR cap anchor not found'
html = html.replace(OLD_ATR,
    '      /* doji fallback: body stays at mid±tiny; others use at*0.01 */\n'
    '      if(hi<=lo){if(cfg.source===\'body\'){var _bm=(c.o+c.c)/2;hi=_bm+(at*0.002||0.01);lo=_bm-(at*0.002||0.01);}else{lo=hi-at*0.01;}}\n'
    '      /* ATR cap skipped in hvs_only and body — body must stay at open/close */\n'
    '      if(!hvsOnly&&cfg.source!==\'body\'&&at>0&&(hi-lo)>at*1.5){var _zm=(Math.max(c.o,c.c)+Math.min(c.o,c.c))/2;hi=_zm+at*0.75;lo=_zm-at*0.75;}\n'
    '      var rawHi=hi,rawLo=lo;\n'
    '      /* body clamp: final zone must never exceed the candle open/close */\n'
    '      if(cfg.source===\'body\'){rawHi=Math.min(rawHi,Math.max(c.o,c.c));rawLo=Math.max(rawLo,Math.min(c.o,c.c));hi=rawHi;lo=rawLo;}',
    1
)

# ── 2. Merge truly off when mergeDist = 0 ────────────────────────────────────
OLD_MERGE = (
    '      if(!_isHvsOnly){\n'
    '        var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);'
)
assert OLD_MERGE in html, 'merge guard anchor not found'
html = html.replace(OLD_MERGE,
    '      if(!_isHvsOnly&&cfg.mergeDist>0){\n'
    '        var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);',
    1
)

# ── 3. Proximity merge: body source preserves best candle bounds ──────────────
OLD_PROX_EXPAND = '        z0.hi=Math.max(z0.hi,oz.hi);z0.lo=Math.min(z0.lo,oz.lo);'
assert OLD_PROX_EXPAND in html, 'proximity merge expand anchor not found'
html = html.replace(OLD_PROX_EXPAND,
    '        /* body: preserve best zone bounds; other sources: expand to union */\n'
    '        if(cfg.source===\'body\'){if((oz.rawScore||0)>(z0.rawScore||0)||(oz.level>z0.level)){z0.hi=oz.hi;z0.lo=oz.lo;}}else{z0.hi=Math.max(z0.hi,oz.hi);z0.lo=Math.min(z0.lo,oz.lo);}',
    1
)

# ── 4. Debug toggle: window.__debugSpikeZones ─────────────────────────────────
# Injecto no bloco de recompute do cache, após o needle diagnostics
OLD_NEEDLE_END = (
    '          return{level:z.level,age:z.age,status:z.status,\n'
    '            zoneH:rH.toFixed?rH.toFixed(4):rH,\n'
    '            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):\'—\',\n'
    '            needleSource:z.needleSource||\'none\',\n'
    '            conf:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):\'—\'};\n'
    '        }));}catch(_){}\n'
    '      }\n'
    '    }'
)
assert OLD_NEEDLE_END in html, 'needle diagnostics end anchor not found'
html = html.replace(OLD_NEEDLE_END,
    '          return{level:z.level,age:z.age,status:z.status,\n'
    '            zoneH:rH.toFixed?rH.toFixed(4):rH,\n'
    '            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):\'—\',\n'
    '            needleSource:z.needleSource||\'none\',\n'
    '            conf:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):\'—\'};\n'
    '        }));}catch(_){}\n'
    '      }\n'
    '      if(window.__debugSpikeZones&&typeof console!==\'undefined\'&&console.table&&(_cache.main||[]).length){\n'
    '        try{console.table((_cache.main||[]).slice(0,25).map(function(z){\n'
    '          var bH=z.hi-z.lo;\n'
    '          return{level:z.level,srcIdx:z.srcIdx,age:z.age,\n'
    '            hi:z.hi.toFixed?z.hi.toFixed(5):z.hi,\n'
    '            lo:z.lo.toFixed?z.lo.toFixed(5):z.lo,\n'
    '            height:bH.toFixed?bH.toFixed(5):bH,\n'
    '            merged:z.isProxMerged||false,\n'
    '            proxN:z.proxCount||1,\n'
    '            source:cfg.source};\n'
    '        }));}catch(_){}\n'
    '      }\n'
    '    }',
    1
)

with open('DepthVisionLab-v106_REAL_UI/public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('patch_174.py applied — Beta 0.174')
print('  Fix 1: doji fallback para body usa mid±at*0.002 (não at*0.01)')
print('  Fix 2: ATR cap excluído para source=body (nunca altera open/close)')
print('  Fix 3: body clamp — rawHi/rawLo nunca excedem os bounds do open/close real')
print('  Fix 4: merge=OFF (mergeDist=0) agora realmente não mescla nada')
print('  Fix 5: proximityGroup com source=body preserva bounds do melhor candle')
print('  Debug: window.__debugSpikeZones=true → console.table com hi/lo/height')
