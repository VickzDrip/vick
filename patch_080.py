#!/usr/bin/env python3
"""Beta 0.080 — Volume spike filter for HVN Signals (real candle volume check)"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.079', 'Beta 0.080')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.080\n  - Live Stats: Trend Clarity e DVL Flow agora mostram',
    '''Beta 0.080
  - Volume spike filter: hvnSigVolSpike select (×1.2 / ×1.5 / ×2.0 / ×3.0)
    added to HVN Signals FILTROS section and Strategy Tester stFVol.
  - computeHVNSignals() precomputes a 20-candle rolling volume average;
    signal only fires if candle.vol >= multiplier × avg (no spike = no signal).
  - stFVol upgraded from on/off to same multiplier options; synced with
    hvnSigVolSpike via _syncAllFromCfg.

Beta 0.079
  - Live Stats: Trend Clarity e DVL Flow agora mostram''',
    1
)

# ── 3. Add hvnSigVolSpike to HVN Signals FILTROS section ─────────────────────
OLD_FILTROS_END = (
    '            <div class="kv"><span class="k">Prox. HVN dist. %</span>'
    '<input class="num" id="hvnSigNextHVN" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">GESTÃO DE RISCO</div>'
)

NEW_FILTROS_END = (
    '            <div class="kv"><span class="k">Prox. HVN dist. %</span>'
    '<input class="num" id="hvnSigNextHVN" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Volume spike mín.</span>\n'
    '              <select class="select" id="hvnSigVolSpike" style="width:104px">\n'
    '                <option value="off" selected>Desativado</option>\n'
    '                <option value="1.2">\xd7 1.2 (suave)</option>\n'
    '                <option value="1.5">\xd7 1.5 (m\xe9dio)</option>\n'
    '                <option value="2.0">\xd7 2.0 (forte)</option>\n'
    '                <option value="3.0">\xd7 3.0 (extremo)</option>\n'
    '              </select></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">GEST\xc3O DE RISCO</div>'
)

assert OLD_FILTROS_END in html, "FILTROS end / GESTAO divider not found"
html = html.replace(OLD_FILTROS_END, NEW_FILTROS_END, 1)

# ── 4. Add volSpike to _cfg() return ─────────────────────────────────────────
OLD_CFG_TF = (
    "      sl        : g('hvnSigSL')?.value||'wick',\n"
    "      tp        : g('hvnSigTP')?.value||'hvn',\n"
    "      tf        : g('hvnSigTF')?.value||'5m',\n"
    "    };\n"
    "  }"
)

NEW_CFG_TF = (
    "      sl        : g('hvnSigSL')?.value||'wick',\n"
    "      tp        : g('hvnSigTP')?.value||'hvn',\n"
    "      tf        : g('hvnSigTF')?.value||'5m',\n"
    "      volSpike  : g('hvnSigVolSpike')?.value||'off',\n"
    "    };\n"
    "  }"
)

assert OLD_CFG_TF in html, "_cfg() tf line not found"
html = html.replace(OLD_CFG_TF, NEW_CFG_TF, 1)

# ── 5. Add precomputed volAvg + volOK check in computeHVNSignals() ────────────
# 5a. Insert volAvg precomputation before zone loop
OLD_SIGNALS_INIT = (
    "    var signals=new Array(n).fill(null);\n"
    "\n"
    "    for(var zi=0;zi<zones.length;zi++){"
)

NEW_SIGNALS_INIT = (
    "    var signals=new Array(n).fill(null);\n"
    "\n"
    "    /* rolling 20-candle vol avg, excl. current candle — used for spike filter */\n"
    "    var _volAvg=new Float32Array(n);\n"
    "    if(cfg.volSpike&&cfg.volSpike!=='off'){\n"
    "      var _vsSum=0;\n"
    "      for(var vi=0;vi<n;vi++){\n"
    "        _volAvg[vi]=vi>0?_vsSum/Math.min(vi,20):0;\n"
    "        _vsSum+=(cs[vi].v||0);\n"
    "        if(vi>=20)_vsSum-=(cs[vi-20].v||0);\n"
    "      }\n"
    "    }\n"
    "\n"
    "    for(var zi=0;zi<zones.length;zi++){"
)

assert OLD_SIGNALS_INIT in html, "signals init / zone loop not found"
html = html.replace(OLD_SIGNALS_INIT, NEW_SIGNALS_INIT, 1)

# 5b. Add volOK variable after latOK
OLD_LATOK = "        var latOK=(cfg.allowLat||lateralCount===0);"

NEW_LATOK = (
    "        var latOK=(cfg.allowLat||lateralCount===0);\n"
    "        var volOK=(cfg.volSpike==='off'||!cfg.volSpike||_volAvg[i]<=0||(c.v||0)>=parseFloat(cfg.volSpike)*_volAvg[i]);"
)

assert OLD_LATOK in html, "latOK line not found"
html = html.replace(OLD_LATOK, NEW_LATOK, 1)

# 5c. Add &&volOK to SHORT signal condition
html = html.replace(
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'short'",
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'short'",
    1
)

# 5d. Add &&volOK to LONG signal condition
html = html.replace(
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'long'",
    "          if(wickPct>=cfg.minWickPct&&coolOK&&latOK&&volOK){\n"
    "            var isLat=(lateralCount>=1);\n"
    "            if(!signals[i]||Math.abs(signals[i]._strength||0)<Math.abs(wickPct)){\n"
    "              signals[i]={type:'long'",
    1
)

# ── 6. Upgrade stFVol options (on/off → multiplier) ──────────────────────────
html = html.replace(
    '<select class="dvl-st-sel" id="stFVol"><option value="on" selected>Ativado</option><option value="off">Desativado</option></select>',
    '<select class="dvl-st-sel" id="stFVol">'
    '<option value="off" selected>Desativado</option>'
    '<option value="1.2">\xd7 1.2</option>'
    '<option value="1.5">\xd7 1.5</option>'
    '<option value="2.0">\xd7 2.0</option>'
    '<option value="3.0">\xd7 3.0</option>'
    '</select>',
    1
)

# ── 7. Sync volSpike in _syncAllFromCfg ───────────────────────────────────────
OLD_SYNC_RISK_LINE = (
    "  /* tf = zone TF for HVN Signals; does NOT change the chart's own timeframe */\n"
    "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}"
)

NEW_SYNC_RISK_LINE = (
    "  /* tf = zone TF for HVN Signals; does NOT change the chart's own timeframe */\n"
    "  if(tf){_setSelVal('hvnSigTF',tf);_setSelVal('stTf',tf);}\n"
    "  var volSpike=cfg.volSpike||'off';\n"
    "  _setSelVal('hvnSigVolSpike',volSpike);_setSelVal('stFVol',volSpike);"
)

assert OLD_SYNC_RISK_LINE in html, "_syncAllFromCfg tf block not found"
html = html.replace(OLD_SYNC_RISK_LINE, NEW_SYNC_RISK_LINE, 1)

# ── 8. Add hvnSigVolSpike to settings change listener ────────────────────────
html = html.replace(
    "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF'].forEach(function(id){",
    "   'hvnSigNextHVN','hvnSigSL','hvnSigTP','hvnSigTF','hvnSigVolSpike'].forEach(function(id){",
    1
)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.080 applied')
