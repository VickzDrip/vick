#!/usr/bin/env python3
"""patch_156.py — Beta 0.156: Three fixes
   1. PT gear hitbox cleared when oscillator is off (no phantom touch target)
   2. Volume MA: running sum (O(n)), no null warmup — visible from first candle
   3. DVL Flow Stack: 3 MA overlay lines (Delta MA, Pressure MA, Pulse MA)
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.155') >= 10, 'Beta 0.155 not found'
html = html.replace('Beta 0.155', 'Beta 0.156')

# ── 1. Clear PT gear/eye hitbox when oscillator is not active ────────────────
OLD_PT_GUARD1 = "    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;"
assert OLD_PT_GUARD1 in html, 'PT guard1 anchor not found'
html = html.replace(OLD_PT_GUARD1,
    "    if(!window.S||!S.inds.pressureTrail||!S.candles.length)"
    "{window._dvlPTGearHit=null;window._dvlPTEyeHit=null;return;}", 1)

OLD_PT_GUARD2 = "    if(!ptH||ptH<=0||!cfg.showPanel)return;"
assert OLD_PT_GUARD2 in html, 'PT guard2 anchor not found'
html = html.replace(OLD_PT_GUARD2,
    "    if(!ptH||ptH<=0||!cfg.showPanel)"
    "{window._dvlPTGearHit=null;window._dvlPTEyeHit=null;return;}", 1)

# ── 2a. Volume MA input: raise max from 100 to 500 ───────────────────────────
OLD_VOL_MA_INPUT = '<input class="num" id="volMaLen" type="number" min="1" max="100" step="1" value="20">'
assert OLD_VOL_MA_INPUT in html, 'volMaLen input anchor not found'
html = html.replace(OLD_VOL_MA_INPUT,
    '<input class="num" id="volMaLen" type="number" min="1" max="500" step="1" value="20">', 1)

# ── 2b. Fix volume MA at line ~7160 (el() context): running sum, no null ─────
OLD_MA_1 = (
    "  const ma=vols.map((_,i)=>i<maLen-1?null:"
    "vols.slice(i-maLen+1,i+1).reduce((a,b)=>a+b,0)/maLen);"
)
assert OLD_MA_1 in html, 'volume MA (el-context) anchor not found'
html = html.replace(OLD_MA_1,
    "  const ma=[];{let _ms=0;for(let _mi=0;_mi<vols.length;_mi++)"
    "{_ms+=vols[_mi];if(_mi>=maLen)_ms-=vols[_mi-maLen];ma[_mi]=_ms/Math.min(_mi+1,maLen);}}", 1)

# ── 2c. Fix volume MA at line ~9728 (E() context): same fix ──────────────────
OLD_MA_2 = (
    "    const ma=vols.map((_,i)=>i<maLen-1?null:"
    "vols.slice(i-maLen+1,i+1).reduce((a,b)=>a+b,0)/maLen);"
)
assert OLD_MA_2 in html, 'volume MA (E-context) anchor not found'
html = html.replace(OLD_MA_2,
    "    const ma=[];{let _ms=0;for(let _mi=0;_mi<vols.length;_mi++)"
    "{_ms+=vols[_mi];if(_mi>=maLen)_ms-=vols[_mi-maLen];ma[_mi]=_ms/Math.min(_mi+1,maLen);}}", 1)

# ── 2d. Fix premium volume MA at line ~9941: remove null ─────────────────────
OLD_MA_3 = "for(let i=0;i<vols.length;i++){run+=vols[i];if(i>=maLen)run-=vols[i-maLen];ma[i]=i>=maLen-1?run/maLen:null;}"
assert OLD_MA_3 in html, 'premium volume MA anchor not found'
html = html.replace(OLD_MA_3,
    "for(let i=0;i<vols.length;i++){run+=vols[i];if(i>=maLen)run-=vols[i-maLen];ma[i]=run/Math.min(i+1,maLen);}", 1)

# ── 3a. UI: add Delta/Pressure/Pulse MA inputs in DVL FLOW STACK section ─────
OLD_HIST_OP_ROW = (
    '            <div class="kv"><span class="k">Panel Hist. Op.</span>'
    '<input class="num" id="ptHistOp" type="number" min="0.1" max="1.5" step="0.1" '
    'value="0.9" style="width:52px"></div>\n'
    '            <div class="hint">Bias · Cloud · ABSORPTION · EXHAUSTION · FLOW FLIP</div>'
)
assert OLD_HIST_OP_ROW in html, 'ptHistOp row anchor not found'
NEW_HIST_OP_ROW = (
    '            <div class="kv"><span class="k">Panel Hist. Op.</span>'
    '<input class="num" id="ptHistOp" type="number" min="0.1" max="1.5" step="0.1" '
    'value="0.9" style="width:52px"></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;'
    'letter-spacing:.08em;margin-bottom:4px;">MÉD. MÓVEIS (0=off)</div>\n'
    '            <div class="kv"><span class="k">Delta MA</span>'
    '<input class="num" id="ptDeltaMA" type="number" min="0" max="200" step="1" '
    'value="0" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Pressure MA</span>'
    '<input class="num" id="ptPressureMA" type="number" min="0" max="200" step="1" '
    'value="0" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Pulse MA</span>'
    '<input class="num" id="ptPulseMA" type="number" min="0" max="200" step="1" '
    'value="0" style="width:52px"></div>\n'
    '            <div class="hint">Bias · Cloud · ABSORPTION · EXHAUSTION · FLOW FLIP</div>'
)
html = html.replace(OLD_HIST_OP_ROW, NEW_HIST_OP_ROW, 1)

# ── 3b. _cfg(): add deltaMA, pressureMA, pulseMA ─────────────────────────────
OLD_CFG_HISTOP = (
    "      histOp:     clp(nv('ptHistOp',0.9),0.05,1.5)\n"
    "    };\n"
    "  }"
)
assert OLD_CFG_HISTOP in html, '_cfg histOp anchor not found'
NEW_CFG_HISTOP = (
    "      histOp:     clp(nv('ptHistOp',0.9),0.05,1.5),\n"
    "      deltaMA:    Math.max(0,(nv('ptDeltaMA',0)|0)),\n"
    "      pressureMA: Math.max(0,(nv('ptPressureMA',0)|0)),\n"
    "      pulseMA:    Math.max(0,(nv('ptPulseMA',0)|0))\n"
    "    };\n"
    "  }"
)
html = html.replace(OLD_CFG_HISTOP, NEW_CFG_HISTOP, 1)

# ── 3c. drawFlowStack: insert MA overlay before ctx.restore() ─────────────────
OLD_RESTORE = (
    "      }\n"
    "      ctx.restore();\n"
    "\n"
    "      /* right-scale: current value for each sub-panel */"
)
assert OLD_RESTORE in html, 'ctx.restore anchor not found'
NEW_RESTORE = (
    "      }\n"
    "\n"
    "      /* ── MA overlay lines (Delta/Pressure/Pulse) ── */\n"
    "      var _maPs=[cfg.deltaMA,cfg.pressureMA,cfg.pulseMA];\n"
    "      for(var _si2=0;_si2<subs.length;_si2++){\n"
    "        var _maP=_maPs[_si2]|0;if(_maP<2)continue;\n"
    "        var _sp=subs[_si2];\n"
    "        var _yt=L.plotTop+_si2*(subH+gap),_yb=_yt+subH,_ym=(_yt+_yb)/2;\n"
    "        /* collect values with warmup before visible window */\n"
    "        var _ws=Math.max(0,V.a-_maP+1),_we=Math.min(n,V.b);\n"
    "        var _vals=[],_ms2=0;\n"
    "        for(var _j=_ws;_j<_we;_j++)_vals.push(_sp.getVal(_j));\n"
    "        /* running sum MA */\n"
    "        var _maArr=[],_rs=0;\n"
    "        for(var _k=0;_k<_vals.length;_k++){_rs+=_vals[_k];if(_k>=_maP)_rs-=_vals[_k-_maP];_maArr[_k]=_rs/Math.min(_k+1,_maP);}\n"
    "        var _off=V.a-_ws;\n"
    "        ctx.beginPath();\n"
    "        ctx.strokeStyle='rgba('+_sp.posR+','+_sp.posG+','+_sp.posB+',0.90)';\n"
    "        ctx.lineWidth=1.4;ctx.setLineDash([]);\n"
    "        var _mv=false;\n"
    "        for(var _i=V.a;_i<V.b;_i++){\n"
    "          if(_i<0||_i>=n)continue;\n"
    "          var _mv2=_maArr[_off+(_i-V.a)];if(_mv2===undefined)continue;\n"
    "          var _mn=_sp.max>0?_mv2/_sp.max:0;\n"
    "          _mn=(_mn-centerOff/100)*zoomF;_mn=Math.max(-1,Math.min(1,_mn));\n"
    "          var _xx=x(_i),_yy=_sp.uni?_yb-Math.max(0,Math.abs(_mn))*(_yb-_yt-2)*0.9:_ym-_mn*(_yb-_yt-2)*0.44;\n"
    "          if(!_mv){ctx.moveTo(_xx,_yy);_mv=true;}else ctx.lineTo(_xx,_yy);\n"
    "        }\n"
    "        if(_mv)ctx.stroke();\n"
    "      }\n"
    "\n"
    "      ctx.restore();\n"
    "\n"
    "      /* right-scale: current value for each sub-panel */"
)
html = html.replace(OLD_RESTORE, NEW_RESTORE, 1)

# ── 3d. Event wiring: add MA ID listeners (draw-only, no cache invalidation) ──
OLD_PT_TIMEOUT = (
    "  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);\n"
    "})();"
)
assert OLD_PT_TIMEOUT in html, 'PT timeout anchor not found'
NEW_PT_TIMEOUT = (
    "  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);\n"
    "  var _ptMaIds=new Set(['ptDeltaMA','ptPressureMA','ptPulseMA']);\n"
    "  function _ptMaRd(){_cfgCache=null;if(typeof drawSoon==='function')drawSoon();}\n"
    "  document.addEventListener('input',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});\n"
    "  document.addEventListener('change',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});\n"
    "})();"
)
html = html.replace(OLD_PT_TIMEOUT, NEW_PT_TIMEOUT, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_156.py applied — Beta 0.156')
print('  1. PT gear hitbox cleared on early return — no phantom tap target when oscillator is off')
print('  2. Volume MA: running sum O(n), visible from first candle (no null warmup), max raised to 500')
print('  3. DVL Flow Stack: Delta MA, Pressure MA, Pulse MA — solid colored lines over each sub-panel (0=off)')
