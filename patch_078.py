#!/usr/bin/env python3
"""Beta 0.078 — MTF HVN zones: hvnSigTF controls which TF the zones come from"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.077', 'Beta 0.078')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.078\n  - TF selector (hvnSigTF) added to HVN Signals settings',
    '''Beta 0.078
  - hvnSigTF / stTf now control which TIMEFRAME\'s HVN zones are used for
    signal detection (MTF — e.g. trade 5m chart with zones from 4h/1h).
  - computeHVNSignals() fetches MTF candles via existing __mtfCandleCache
    infrastructure when hvnSigTF != current chart TF, then computes zones
    via window.__dvlComputeHVNFromCS (newly exposed from vol zones script).
  - _syncAllFromCfg no longer changes the chart\'s own timeframe — it only
    updates hvnSigTF and stTf selects (zone TF, not chart TF).
  - stTf label in Strategy Tester updated to "TF das Zonas HVN".
  - Hint added below hvnSigTF explaining the MTF behavior.

Beta 0.077
  - TF selector (hvnSigTF) added to HVN Signals settings; _syncAllFromCfg''',
    1
)

# ── 3. Expose computeHVN+getSettings from vol zones script ───────────────────
OLD_HVN_ZONES_EXPORT = "  window.__drawVolZones=drawVolZones;\n  window.__hvnZones=()=>_vzCache?.hvn;"

NEW_HVN_ZONES_EXPORT = (
    "  window.__drawVolZones=drawVolZones;\n"
    "  window.__hvnZones=()=>_vzCache?.hvn;\n"
    "  /* expose zone computation for MTF HVN Signals */\n"
    "  window.__dvlComputeHVNFromCS=function(cs){\n"
    "    var s=getSettings();\n"
    "    var r=computeHVN(cs,s.bucketPct,s.topN,s.minTouch,s.mergeGap);\n"
    "    return r?r.hvn||[]:[]; };"
)

assert OLD_HVN_ZONES_EXPORT in html, "vol zones export not found"
html = html.replace(OLD_HVN_ZONES_EXPORT, NEW_HVN_ZONES_EXPORT, 1)

# ── 4. Update hvnSigTF label and add hint ────────────────────────────────────
OLD_TF_SELECT = (
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">TIMEFRAME</div>\n'
    '            <div class="kv"><span class="k">TF do HVN Signals</span>\n'
    '              <select class="select" id="hvnSigTF" style="width:80px">\n'
    '                <option value="5m" selected>5m</option>\n'
    '                <option value="15m">15m</option>\n'
    '                <option value="1h">1h</option>\n'
    '                <option value="4h">4h</option>\n'
    '                <option value="1d">1D</option>\n'
    '              </select></div>'
)

NEW_TF_SELECT = (
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">TIMEFRAME</div>\n'
    '            <div class="kv"><span class="k">TF das Zonas HVN</span>\n'
    '              <select class="select" id="hvnSigTF" style="width:80px">\n'
    '                <option value="5m" selected>5m</option>\n'
    '                <option value="15m">15m</option>\n'
    '                <option value="1h">1h</option>\n'
    '                <option value="4h">4h</option>\n'
    '                <option value="1d">1D</option>\n'
    '              </select></div>\n'
    '            <div class="hint" style="margin-top:3px">MTF: use zonas calculadas de outro TF para detectar sinais no gráfico atual.</div>'
)

assert OLD_TF_SELECT in html, "hvnSigTF select not found"
html = html.replace(OLD_TF_SELECT, NEW_TF_SELECT, 1)

# ── 5. Fix _syncAllFromCfg — remove chart TF dispatch (zone TF only) ─────────
OLD_SYNC_TF = (
    "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);\n"
    "    var _chartTF=document.getElementById('tfSelect');\n"
    "    if(_chartTF&&_chartTF.value!==tf){_chartTF.value=tf;_chartTF.dispatchEvent(new Event('change'));}\n"
    "  }"
)

NEW_SYNC_TF = (
    "  /* tf = zone TF for HVN Signals; does NOT change the chart's own timeframe */\n"
    "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}"
)

assert OLD_SYNC_TF in html, "_syncAllFromCfg TF block not found"
html = html.replace(OLD_SYNC_TF, NEW_SYNC_TF, 1)

# ── 6. Update stTf label in Strategy Tester ──────────────────────────────────
html = html.replace(
    '<span class="dvl-st-lbl">Timeframe</span>\n'
    '          <select class="dvl-st-sel" id="stTf">',
    '<span class="dvl-st-lbl">TF das Zonas HVN</span>\n'
    '          <select class="dvl-st-sel" id="stTf">',
    1
)

# ── 7. Add MTF zone support to computeHVNSignals() ───────────────────────────
OLD_COMPUTE = (
    "  function computeHVNSignals(){\n"
    "    if(!window.S||!S.inds||!S.inds.hvnSignals){if(window.S)S.hvnSignals=[];return;}\n"
    "    var cs=S.candles;\n"
    "    if(!cs||cs.length<4){S.hvnSignals=[];return;}\n"
    "    var zones=window.__hvnZones?.()||[];\n"
    "    if(!zones.length){S.hvnSignals=[];return;}"
)

NEW_COMPUTE = (
    "  var _hvnMTFZoneCache={};\n"
    "\n"
    "  function _getZonesForTF(cfg){\n"
    "    var chartTf=(window.S&&window.S.tf)||'5m';\n"
    "    var hvnTf=cfg.tf||chartTf;\n"
    "    if(hvnTf===chartTf) return window.__hvnZones?.()||[];\n"
    "    var sym=(window.S&&window.S.sym)||'BTCUSDT';\n"
    "    var mtfKey=sym+'|'+hvnTf;\n"
    "    var mtfEntry=window.__mtfCandleCache&&window.__mtfCandleCache.get(mtfKey);\n"
    "    if(mtfEntry&&mtfEntry.candles&&mtfEntry.candles.length>10){\n"
    "      var ck=mtfKey+'|'+mtfEntry.candles.length+'|'+mtfEntry.ts;\n"
    "      if(!_hvnMTFZoneCache[mtfKey]||_hvnMTFZoneCache[mtfKey].k!==ck){\n"
    "        var zz=window.__dvlComputeHVNFromCS?window.__dvlComputeHVNFromCS(mtfEntry.candles):[];\n"
    "        _hvnMTFZoneCache[mtfKey]={zones:zz,k:ck};\n"
    "      }\n"
    "      return _hvnMTFZoneCache[mtfKey].zones;\n"
    "    }\n"
    "    /* async fetch — first call loads data, returns current zones as fallback */\n"
    "    if(typeof fetchKlinesForTF==='function'&&!window.__hvnMTFFetching){\n"
    "      window.__hvnMTFFetching=true;\n"
    "      fetchKlinesForTF(sym,hvnTf,500).then(function(cs){\n"
    "        if(!window.__mtfCandleCache)window.__mtfCandleCache=new Map();\n"
    "        window.__mtfCandleCache.set(mtfKey,{candles:cs,ts:Date.now(),sym:sym,tf:hvnTf});\n"
    "        window.__hvnMTFFetching=false;\n"
    "        if(typeof drawSoon==='function')drawSoon();\n"
    "      }).catch(function(){window.__hvnMTFFetching=false;});\n"
    "    }\n"
    "    return window.__hvnZones?.()||[];\n"
    "  }\n"
    "\n"
    "  function computeHVNSignals(){\n"
    "    if(!window.S||!S.inds||!S.inds.hvnSignals){if(window.S)S.hvnSignals=[];return;}\n"
    "    var cs=S.candles;\n"
    "    if(!cs||cs.length<4){S.hvnSignals=[];return;}\n"
    "    var cfg=_cfg();\n"
    "    var zones=_getZonesForTF(cfg);\n"
    "    if(!zones.length){S.hvnSignals=[];return;}"
)

assert OLD_COMPUTE in html, "computeHVNSignals start not found"
html = html.replace(OLD_COMPUTE, NEW_COMPUTE, 1)

# ── 8. Fix computeHVNSignals body — remove duplicate cfg=_cfg() call ─────────
# The old code calls _cfg() again further in; with our change we already call it
# at top, so remove the second call inside the function
OLD_CFG_INNER = (
    "    if(!zones.length){S.hvnSignals=[];return;}\n"
    "\n"
    "    var cfg=_cfg();\n"
    "    var n=cs.length;"
)

NEW_CFG_INNER = (
    "    if(!zones.length){S.hvnSignals=[];return;}\n"
    "\n"
    "    var n=cs.length;"
)

assert OLD_CFG_INNER in html, "duplicate cfg call not found"
html = html.replace(OLD_CFG_INNER, NEW_CFG_INNER, 1)

# ── 9. Wire hvnSigTF change to trigger MTF fetch immediately ─────────────────
OLD_LISTENER = (
    "  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',\n"
    "   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',\n"
    "   'hvnSigLongColor','hvnSigShortColor','hvnSigClarity','hvnSigFlow',\n"
    "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF'].forEach(function(id){\n"
    "    var el=document.getElementById(id);\n"
    "    if(el)el.addEventListener('input',function(){if(typeof drawSoon==='function')drawSoon();});\n"
    "  });"
)

NEW_LISTENER = (
    "  ['hvnSigShowLong','hvnSigShowShort','hvnSigSens','hvnSigMinWick','hvnSigCooldown',\n"
    "   'hvnSigAllowLateral','hvnSigLateral','hvnSigLabelSize','hvnSigLabelStyle',\n"
    "   'hvnSigLongColor','hvnSigShortColor','hvnSigClarity','hvnSigFlow',\n"
    "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF'].forEach(function(id){\n"
    "    var el=document.getElementById(id);\n"
    "    if(el)el.addEventListener('input',function(){if(typeof drawSoon==='function')drawSoon();});\n"
    "    if(el)el.addEventListener('change',function(){\n"
    "      /* when zone TF changes, reset MTF fetch flag so new fetch runs */\n"
    "      if(id==='hvnSigTF')window.__hvnMTFFetching=false;\n"
    "      if(typeof drawSoon==='function')drawSoon();\n"
    "    });\n"
    "  });"
)

assert OLD_LISTENER in html, "listener array not found"
html = html.replace(OLD_LISTENER, NEW_LISTENER, 1)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.078 applied')
