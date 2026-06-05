#!/usr/bin/env python3
"""patch_165.py — Beta 0.165: Histórico longo com paginação + debug de zonas

Correções:
1. _getCandles() MTF: paginação automática (até 5000 barras) em vez de limit=1000
2. szHistoryDays: controle de período histórico (7/30/90/180/365/730 dias)
3. Diagnóstico de zonas: console.log mostra candidatos→merge→expire→spacing→final
4. __szInvalidate: reseta também o estado de paginação
5. change event: szHistoryDays reinicia fetch externo
6. Cache key: inclui histDays para invalidar ao mudar período
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.164') >= 10, 'Beta 0.164 not found'
html = html.replace('Beta 0.164', 'Beta 0.165')

# ── 1. State variables: adiciona paginação ─────────────────────────────────────
OLD_STATE = (
    "  var _extC=null,_extK='',_extF=false;    /* main TF candles   */\n"
    "  var _nestC=null,_nestK='',_nestF=false; /* nested TF candles */"
)
assert OLD_STATE in html, 'state variables anchor not found'
html = html.replace(OLD_STATE,
    "  var _extC=null,_extK='',_extF=false;    /* main TF candles   */\n"
    "  var _extPages=[],_extEndT=0,_extRem=0;  /* pagination state  */\n"
    "  var _nestC=null,_nestK='',_nestF=false; /* nested TF candles */",
    1)

# ── 2. _getCandles() — paginação baseada em szHistoryDays ─────────────────────
OLD_GET_CANDLES = (
    "  function _getCandles(){\n"
    "    var tf=sv('szTf','');\n"
    "    if(!tf||tf===window.S.tf)return window.S.candles;\n"
    "    var wk=S.sym+'|'+tf;\n"
    "    if(_extK===wk&&_extC)return _extC;\n"
    "    if(!_extF||_extK!==wk){\n"
    "      _extF=true;_extK=wk;_extC=null;\n"
    "      fetch(_API+'/api/v3/klines?symbol='+S.sym+'&interval='+tf+'&limit=1000')\n"
    "        .then(function(r){return r.ok?r.json():Promise.reject();})\n"
    "        .then(function(d){if(_extK!==wk)return;_extC=d.map(_kl);_extF=false;_cKey='';if(typeof drawSoon==='function')drawSoon();})\n"
    "        .catch(function(){_extF=false;});\n"
    "    }\n"
    "    return window.S.candles;\n"
    "  }"
)
assert OLD_GET_CANDLES in html, '_getCandles anchor not found'
html = html.replace(OLD_GET_CANDLES,
    "  function _getCandles(){\n"
    "    var tf=sv('szTf','');\n"
    "    if(!tf||tf===window.S.tf)return window.S.candles;\n"
    "    var hDays=Math.max(7,parseInt(sv('szHistoryDays','90'))||90);\n"
    "    var msBar=_tfMs(tf);\n"
    "    /* cap: 5000 barras máx (5 páginas × 1000) para não sobrecarregar */\n"
    "    var targetBars=Math.min(5000,msBar>0?Math.ceil(hDays*86400000/msBar):1000);\n"
    "    var wk=S.sym+'|'+tf+'|'+hDays;\n"
    "    if(_extK===wk&&_extC)return _extC;\n"
    "    if(!_extF||_extK!==wk){\n"
    "      _extF=true;_extK=wk;_extC=null;_extPages=[];\n"
    "      _extEndT=Date.now();_extRem=targetBars;\n"
    "      _extFetchPage(wk);\n"
    "    }\n"
    "    return window.S.candles; /* usa candles do chart enquanto carrega */\n"
    "  }\n"
    "\n"
    "  function _extFetchPage(wk){\n"
    "    if(_extK!==wk)return; /* request obsoleto */\n"
    "    var parts=wk.split('|'),sym=parts[0],tf=parts[1];\n"
    "    var lim=Math.min(1000,_extRem);\n"
    "    if(lim<=0){_extFetchDone(wk);return;}\n"
    "    var url=_API+'/api/v3/klines?symbol='+sym+'&interval='+tf\n"
    "            +'&limit='+lim+'&endTime='+_extEndT;\n"
    "    fetch(url)\n"
    "      .then(function(r){return r.ok?r.json():Promise.reject();})\n"
    "      .then(function(d){\n"
    "        if(_extK!==wk)return;\n"
    "        if(!d||!d.length){_extFetchDone(wk);return;}\n"
    "        /* prepend: dados mais antigos vêm à frente */\n"
    "        _extPages=d.concat(_extPages);\n"
    "        _extRem-=d.length;\n"
    "        /* atualiza progressivamente — primeira página já renderiza */\n"
    "        _extC=_extPages.map(_kl);\n"
    "        _cKey='';if(typeof drawSoon==='function')drawSoon();\n"
    "        if(d.length>=lim&&_extRem>0){\n"
    "          _extEndT=d[0][0]-1; /* antes da barra mais antiga carregada */\n"
    "          setTimeout(function(){_extFetchPage(wk);},280);\n"
    "        } else {\n"
    "          _extF=false;\n"
    "        }\n"
    "      })\n"
    "      .catch(function(){\n"
    "        if(_extPages.length){_extC=_extPages.map(_kl);_cKey='';if(typeof drawSoon==='function')drawSoon();}\n"
    "        _extF=false;\n"
    "      });\n"
    "  }\n"
    "\n"
    "  function _extFetchDone(wk){\n"
    "    if(_extK!==wk)return;\n"
    "    _extF=false;\n"
    "    if(_extPages.length){_extC=_extPages.map(_kl);_cKey='';if(typeof drawSoon==='function')drawSoon();}\n"
    "  }",
    1)

# ── 3. _cfg(): adiciona histDays ──────────────────────────────────────────────
OLD_CFG_NEEDLE_MODE = (
    "      showGhost:   bv('szShowRawGhost',false),\n"
    "      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30),\n"
    "      needleMode:  sv('szNeedleMode','inside')\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_NEEDLE_MODE in html, '_cfg needleMode anchor not found'
html = html.replace(OLD_CFG_NEEDLE_MODE,
    "      showGhost:   bv('szShowRawGhost',false),\n"
    "      ghostOp:     clp(nv('szRawGhostOp',0.05),0.01,0.30),\n"
    "      needleMode:  sv('szNeedleMode','inside'),\n"
    "      histDays:    Math.max(7,parseInt(sv('szHistoryDays','90'))||90)\n"
    "    };\n"
    "  }",
    1)

# ── 4. _computeAll(): diagnóstico de contagem de zonas ────────────────────────
OLD_COMPUTE_ALL = (
    "  function _computeAll(cs,cfg,nestCs){\n"
    "    var base=0;\n"
    "    var sl=cs; /* scan full history — no maxScan limit */\n"
    "    var main=_detectAndBuild(sl,base,cs,cfg,false);\n"
    "    var _isMTF=!!(cfg.tf&&cfg.tf!==S.tf);\n"
    "    if(cfg.spacingOn&&main.length>1)main=_applyAtrSmartSpacing(main,cfg,_isMTF);\n"
    "    var nested=[];\n"
    "    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){\n"
    "      var mainTfMs=_tfMs(cfg.tf||S.tf);\n"
    "      nested=_computeNested(main,nestCs,mainTfMs,cfg);\n"
    "      if(cfg.spacingOn&&nested.length>1)nested=_applyAtrSmartSpacing(nested,cfg,false);\n"
    "    }\n"
    "    return{main:main,nested:nested};\n"
    "  }"
)
assert OLD_COMPUTE_ALL in html, '_computeAll anchor not found'
html = html.replace(OLD_COMPUTE_ALL,
    "  function _computeAll(cs,cfg,nestCs){\n"
    "    var base=0;\n"
    "    var sl=cs; /* scan full history — no maxScan limit */\n"
    "    var main=_detectAndBuild(sl,base,cs,cfg,false);\n"
    "    var _afterDetect=main.length;\n"
    "    var _isMTF=!!(cfg.tf&&cfg.tf!==S.tf);\n"
    "    if(cfg.spacingOn&&main.length>1)main=_applyAtrSmartSpacing(main,cfg,_isMTF);\n"
    "    var _afterSpacing=main.length;\n"
    "    var nested=[];\n"
    "    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){\n"
    "      var mainTfMs=_tfMs(cfg.tf||S.tf);\n"
    "      nested=_computeNested(main,nestCs,mainTfMs,cfg);\n"
    "      if(cfg.spacingOn&&nested.length>1)nested=_applyAtrSmartSpacing(nested,cfg,false);\n"
    "    }\n"
    "    /* diagnóstico sempre visível no console */\n"
    "    try{console.log('[SZ] candles='+cs.length\n"
    "      +' detect='+_afterDetect\n"
    "      +' afterSpacing='+_afterSpacing\n"
    "      +' final='+main.length\n"
    "      +' maxZones='+cfg.maxZones\n"
    "      +' expire='+cfg.expire\n"
    "      +' spacingOn='+cfg.spacingOn\n"
    "      +' tf='+(cfg.tf||S.tf)\n"
    "      +' histDays='+cfg.histDays);}catch(_){}\n"
    "    return{main:main,nested:nested};\n"
    "  }",
    1)

# ── 5. Diagnóstico expandido (substitui bloco anterior de needle diag) ─────────
OLD_DIAG = (
    "      /* needle diagnostics — fires once per recompute when needleOn */\n"
    "      if(cfg.needleOn&&typeof console!=='undefined'&&console.table&&(_cache.main||[]).length){\n"
    "        try{console.table((_cache.main||[]).slice(0,10).map(function(z){\n"
    "          var rH=(z.rawHi||z.hi)-(z.rawLo||z.lo),fH=z.hi-z.lo;\n"
    "          var nH=z.needleHi!=null?z.needleHi-z.needleLo:null;\n"
    "          return{level:z.level,\n"
    "            rawH:rH.toFixed?rH.toFixed(4):rH,\n"
    "            finalH:fH.toFixed?fH.toFixed(4):fH,\n"
    "            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):'—',\n"
    "            reduced:nH!=null&&rH>0?(100*(1-nH/rH)).toFixed(1)+'%':'—',\n"
    "            needleSource:z.needleSource||'none',\n"
    "            confidence:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):z.needleConfidence};\n"
    "        }));}catch(_){}\n"
    "      }"
)
assert OLD_DIAG in html, 'needle diagnostics anchor not found'
html = html.replace(OLD_DIAG,
    "      /* needle diagnostics — fires ao recomputar quando needleOn */\n"
    "      if(cfg.needleOn&&typeof console!=='undefined'&&console.table&&(_cache.main||[]).length){\n"
    "        try{console.table((_cache.main||[]).slice(0,10).map(function(z){\n"
    "          var rH=(z.rawHi||z.hi)-(z.rawLo||z.lo);\n"
    "          var nH=z.needleHi!=null?z.needleHi-z.needleLo:null;\n"
    "          return{level:z.level,age:z.age,status:z.status,\n"
    "            zoneH:rH.toFixed?rH.toFixed(4):rH,\n"
    "            needleH:nH!=null?(nH.toFixed?nH.toFixed(4):nH):'—',\n"
    "            needleSource:z.needleSource||'none',\n"
    "            conf:(z.needleConfidence||0).toFixed?z.needleConfidence.toFixed(2):'—'};\n"
    "        }));}catch(_){}\n"
    "      }",
    1)

# ── 6. Cache key: adiciona histDays ───────────────────────────────────────────
OLD_CACHE_KEY = (
    "            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,"
    "cfg.needleFP?1:0,cfg.needleEst?1:0].join('|');"
)
assert OLD_CACHE_KEY in html, 'cache key anchor not found'
html = html.replace(OLD_CACHE_KEY,
    "            cfg.needleOn?1:0,cfg.needleCapt,cfg.needleMinA,cfg.needleMaxA,"
    "cfg.needleFP?1:0,cfg.needleEst?1:0,\n"
    "            cfg.histDays].join('|');",
    1)

# ── 7. Settings UI: szHistoryDays depois de szExtend ─────────────────────────
OLD_EXTEND_ROW = (
    '            <div class="kv"><span class="k">Extensão (barras)</span>'
    '<input class="num" id="szExtend" type="number" min="0" max="200" step="5" value="20" style="width:56px"></div>'
)
assert OLD_EXTEND_ROW in html, 'szExtend row anchor not found'
html = html.replace(OLD_EXTEND_ROW,
    '            <div class="kv"><span class="k">Extensão (barras)</span>'
    '<input class="num" id="szExtend" type="number" min="0" max="200" step="5" value="20" style="width:56px"></div>\n'
    '            <div class="kv"><span class="k">Histórico MTF</span>\n'
    '              <select class="select" id="szHistoryDays" style="width:80px">\n'
    '                <option value="7">7 dias</option>\n'
    '                <option value="30">30 dias</option>\n'
    '                <option value="90" selected>90 dias</option>\n'
    '                <option value="180">180 dias</option>\n'
    '                <option value="365">365 dias</option>\n'
    '                <option value="730">730 dias</option>\n'
    '              </select>\n'
    '            </div>',
    1)

# ── 8. SZ_IDS: adiciona szHistoryDays ─────────────────────────────────────────
OLD_SZ_IDS = (
    "  'szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',\n"
    "  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp','szNeedleMode'\n"
    "  ]);"
)
assert OLD_SZ_IDS in html, 'SZ_IDS anchor not found'
html = html.replace(OLD_SZ_IDS,
    "  'szNeedleOn','szNeedleCapture','szNeedleMinAtr','szNeedleMaxAtr','szNeedleMinPx',\n"
    "  'szNeedlePreferFP','szNeedleEstimate','szShowRawGhost','szRawGhostOp','szNeedleMode',\n"
    "  'szHistoryDays'\n"
    "  ]);",
    1)

# ── 9. __szInvalidate: reseta estado de paginação ────────────────────────────
OLD_INVALIDATE = (
    "  window.__szInvalidate=function(){"
    "_cKey='';_extC=null;_extK='';_extF=false;_nestC=null;_nestK='';_nestF=false;};"
)
assert OLD_INVALIDATE in html, '__szInvalidate anchor not found'
html = html.replace(OLD_INVALIDATE,
    "  window.__szInvalidate=function(){"
    "_cKey='';_extC=null;_extK='';_extF=false;"
    "_extPages=[];_extEndT=0;_extRem=0;"
    "_nestC=null;_nestK='';_nestF=false;};",
    1)

# ── 10. change event: szHistoryDays reinicia fetch externo ────────────────────
OLD_CHANGE_TF = (
    "    if(id==='szTf'){_extC=null;_extK='';_extF=false;}"
)
assert OLD_CHANGE_TF in html, 'change szTf anchor not found'
html = html.replace(OLD_CHANGE_TF,
    "    if(id==='szTf'||id==='szHistoryDays'){"
    "_extC=null;_extK='';_extF=false;_extPages=[];_extEndT=0;_extRem=0;}",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_165.py applied — Beta 0.165')
print('  Histórico longo:')
print('  - _getCandles() MTF: paginação automática até 5000 barras')
print('  - _extFetchPage(): busca em lotes de 1000 com delay de 280ms')
print('  - szHistoryDays: 7/30/90(default)/180/365/730 dias')
print('  - _extFetchDone(): atualiza cache progressivamente')
print('  Diagnóstico:')
print('  - [SZ] console.log: candles→detect→spacing→final em todo recompute')
print('  - console.table: needle detail das primeiras 10 zonas')
print('  Cache:')
print('  - histDays adicionado ao cache key')
print('  - szHistoryDays na SZ_IDS e no change handler')
print('  - __szInvalidate reseta estado de paginação')
