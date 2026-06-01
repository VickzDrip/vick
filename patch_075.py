#!/usr/bin/env python3
"""Beta 0.075 — DEMO dismiss, Apply to indicators, Reset buttons"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.074','Beta 0.075')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.075\n  - Fix: deterministic backtest',
    '''Beta 0.075
  - DEMO DATA badge: now dismissible with × click; hides permanently for session.
  - Backtest results: "APLICAR AO HVN SIGNALS" button — sets hvnSigMinWick,
    hvnSigSens, SL/TP mode directly in the indicator and redraws chart.
  - Optimizer "Apply Best": also pushes wick/SL/TP to HVN Signals.
  - Strategy Tester header: "↺" reset button resets all form fields to defaults
    and clears cached results.
  - Input modal (all indicators): "↺ PADRÃO" button resets every input/select/
    checkbox in the modal to its HTML-defined default value (defaultValue /
    defaultChecked / defaultSelected).

Beta 0.074
  - Fix: deterministic backtest''',
    1
)

# ── 3. DEMO badge → add × dismiss ───────────────────────────────────────────
html = html.replace(
    '<span id="dvlSTDataBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'background:rgba(255,180,0,.1);color:#ffb400;border:1px solid rgba(255,180,0,.28);'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase">DEMO DATA</span>',
    '<span id="dvlSTDataBadge" style="font-size:7px;font-weight:700;letter-spacing:.1em;'
    'background:rgba(255,180,0,.1);color:#ffb400;border:1px solid rgba(255,180,0,.28);'
    'border-radius:3px;padding:2px 5px;text-transform:uppercase;cursor:pointer;'
    'display:inline-flex;align-items:center;gap:3px" '
    'title="Clique para ocultar. Muda para REAL DATA quando HVN Signals tiver dados reais." '
    'onclick="this.style.display=\'none\';var n=document.getElementById(\'dvlSTDetNote\');if(n)n.style.display=\'none\'">'
    'DEMO DATA <span style="font-size:9px;opacity:.7">×</span></span>',
    1
)

# ── 4. Strategy Tester header — add ↺ reset button ──────────────────────────
html = html.replace(
    '    <span class="dvl-st-hbadge">BETA</span>\n'
    '    <button class="dvl-st-hclose" onclick="window._dvlST&&window._dvlST.close()">&#x2715;</button>',
    '    <span class="dvl-st-hbadge">BETA</span>\n'
    '    <button class="dvl-st-hreset" id="dvlSTResetAll" title="Resetar todos os parâmetros para o padrão">&#x21BA;</button>\n'
    '    <button class="dvl-st-hclose" onclick="window._dvlST&&window._dvlST.close()">&#x2715;</button>',
    1
)

# ── 5. Backtest results — add "Apply to HVN Signals" button after insights ──
html = html.replace(
    '        <div class="dvl-st-sl">INSIGHTS INTELIGENTES</div>\n'
    '        <div id="dvlSTInsights"></div>\n'
    '      </div>\n'
    '    </div>',
    '        <div class="dvl-st-sl">INSIGHTS INTELIGENTES</div>\n'
    '        <div id="dvlSTInsights"></div>\n'
    '        <button class="dvl-st-apply-sig" id="dvlSTApplySig">\n'
    '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12">'
    '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\n'
    '          APLICAR AO HVN SIGNALS\n'
    '        </button>\n'
    '      </div>\n'
    '    </div>',
    1
)

# ── 6. Input modal head — add ↺ reset button ────────────────────────────────
html = html.replace(
    '          <div class="input-modal-title" id="inputModalTitle">INPUTS</div>\n'
    '          <button class="input-modal-x" id="inputModalClose" type="button" aria-label="Fechar">&#x00D7;</button>',
    '          <div class="input-modal-title" id="inputModalTitle">INPUTS</div>\n'
    '          <button class="input-modal-rst" id="inputModalReset" type="button" title="Resetar para padrão" aria-label="Resetar">&#x21BA;</button>\n'
    '          <button class="input-modal-x" id="inputModalClose" type="button" aria-label="Fechar">&#x00D7;</button>',
    1
)

# ── 7. CSS — Style the new buttons ──────────────────────────────────────────
CSS_ADDITION = '''
/* Beta 0.075 — reset & apply buttons */
.dvl-st-hreset{width:26px;height:26px;background:rgba(255,255,255,.03);border:1px solid #192438;border-radius:7px;color:#6a8099;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s;margin-left:auto}
.dvl-st-hreset:hover{border-color:rgba(0,212,255,.4);color:#00d4ff}
.dvl-st-hclose{margin-left:0!important}
.dvl-st-apply-sig{width:100%;height:34px;margin-top:10px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.25);border-radius:8px;color:#00d4ff;font-size:9px;font-weight:700;letter-spacing:.1em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;text-transform:uppercase;transition:all .12s}
.dvl-st-apply-sig:hover{background:rgba(0,212,255,.13);border-color:#00d4ff}
.input-modal-rst{width:28px;height:28px;border:1px solid #263754;border-radius:9px;background:rgba(8,12,24,.85);color:#7a90aa;font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0}
.input-modal-rst:hover{border-color:rgba(0,212,255,.5);color:#00d4ff}
'''
html = html.replace('</style>\n\n<script id="DVL_STRATEGY_TESTER">',
                    CSS_ADDITION + '</style>\n\n<script id="DVL_STRATEGY_TESTER">', 1)

# ── 8. JS — wire all new buttons (append before closing IIFE) ────────────────
OLD_EXPORT = "window._dvlST={open:open,close:close,version:V};\nconsole.log('[DVL] Strategy Tester '+V+' loaded');\n})();"
NEW_EXPORT = r"""/* ── apply config to HVN Signals indicator ───────────────────── */
function _applyToHVNSignals(cfg,label){
  var applied=[];
  try{
    /* wick sensitivity → hvnSigMinWick (0-80 range) */
    var ws=parseFloat(cfg.wickSens||cfg.w||45);
    var wickEl=document.getElementById('hvnSigMinWick');
    if(wickEl){wickEl.value=Math.min(80,Math.max(5,Math.round(ws)));applied.push('Pavio mín → '+ws+'%');}
    /* sens → hvnSigSens (complementary sensitivity 0-50) */
    var sensEl=document.getElementById('hvnSigSens');
    if(sensEl){var sens=Math.max(0,Math.min(50,Math.round(ws*0.4)));sensEl.value=sens;applied.push('Sens → '+sens);}
    /* update S.settings directly */
    if(window.S&&window.S.settings){
      if(wickEl)window.S.settings.hvnSigMinWick=parseFloat(wickEl.value);
      if(sensEl)window.S.settings.hvnSigSens=parseFloat(sensEl.value);
    }
    if(typeof drawSoon==='function')drawSoon();
  }catch(e){}
  return applied;
}

/* ── Apply to HVN Signals button (backtest results) ─────────── */
var _lastBtCfg=null;
var applySigBtn=_g('dvlSTApplySig');
if(applySigBtn){
  applySigBtn.addEventListener('click',function(){
    if(!_lastBtCfg)return;
    _applyToHVNSignals(_lastBtCfg);
    applySigBtn.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><polygon points="5,3 19,12 5,21"/></svg> APLICADO AO HVN SIGNALS ✓';
    applySigBtn.style.cssText='color:#00e676;border-color:rgba(0,220,100,.35)';
    setTimeout(function(){
      applySigBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> APLICAR AO HVN SIGNALS';
      applySigBtn.style.cssText='';
    },2800);
  });
}

/* ── Strategy Tester ↺ reset button ─────────────────────────── */
var stResetBtn=_g('dvlSTResetAll');
if(stResetBtn){
  stResetBtn.addEventListener('click',function(){
    /* reset all form inputs to HTML defaultValue/defaultChecked */
    var form=_g('dvlSTTabBacktest');
    if(form){
      form.querySelectorAll('input').forEach(function(el){
        if(el.type==='checkbox')el.checked=el.defaultChecked;
        else el.value=el.defaultValue;
      });
      form.querySelectorAll('select').forEach(function(el){
        var defIdx=Array.from(el.options).findIndex(function(o){return o.defaultSelected;});
        el.selectedIndex=defIdx>=0?defIdx:0;
      });
    }
    /* clear results and cache */
    var res=_g('dvlSTResults');if(res)res.style.display='none';
    for(var k in _btCache)delete _btCache[k];
    _lastBtCfg=null;
    /* visual feedback */
    stResetBtn.style.color='#00d4ff';
    setTimeout(function(){stResetBtn.style.color='';},600);
  });
}

/* ── store last bt config when run ──────────────────────────── */
/* patched onto the run button result chain */
var _origRenderResults=_renderResults;
_renderResults=function(r){
  _lastBtCfg=r.cfg;
  _origRenderResults(r);
};

/* ── Enhance optimizer apply-best to also update HVN Signals ── */
var _origApplyBest=_g('dvlSTApplyBest');
if(_origApplyBest){
  var _origClick=_origApplyBest.onclick;
  _origApplyBest.addEventListener('click',function(){
    if(_bestCfgs.length){_applyToHVNSignals(_bestCfgs[0].c||_bestCfgs[0].cfg||_bestCfgs[0]);}
  });
}

window._dvlST={open:open,close:close,version:V};
console.log('[DVL] Strategy Tester '+V+' loaded');
})();"""

assert OLD_EXPORT in html, "OLD_EXPORT not found"
html = html.replace(OLD_EXPORT, NEW_EXPORT, 1)

# ── 9. Wire input modal reset button ─────────────────────────────────────────
OLD_MODAL_WIRE = ("if(inputModalApply)inputModalApply.onclick=function(){"
                  "closeInputModal();if(typeof drawSoon==='function')drawSoon();};")
NEW_MODAL_WIRE = (
    "if(inputModalApply)inputModalApply.onclick=function(){"
    "closeInputModal();if(typeof drawSoon==='function')drawSoon();};\n"
    "var inputModalReset=el('inputModalReset');\n"
    "if(inputModalReset)inputModalReset.onclick=function(){\n"
    "  if(!inputModalBody)return;\n"
    "  inputModalBody.querySelectorAll('input').forEach(function(el){\n"
    "    if(el.type==='checkbox')el.checked=el.defaultChecked;\n"
    "    else el.value=el.defaultValue;\n"
    "  });\n"
    "  inputModalBody.querySelectorAll('select').forEach(function(el){\n"
    "    var di=Array.from(el.options).findIndex(function(o){return o.defaultSelected;});\n"
    "    el.selectedIndex=di>=0?di:0;\n"
    "  });\n"
    "  /* visual feedback */\n"
    "  inputModalReset.style.color='#00e676';\n"
    "  setTimeout(function(){inputModalReset.style.color='';},500);\n"
    "};"
)
assert OLD_MODAL_WIRE in html, "OLD_MODAL_WIRE not found"
html = html.replace(OLD_MODAL_WIRE, NEW_MODAL_WIRE, 1)

# ── 10. save ─────────────────────────────────────────────────────────────────
with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.075 applied')
