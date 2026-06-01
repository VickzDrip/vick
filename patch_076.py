#!/usr/bin/env python3
"""Beta 0.076 — HVN Signals settings sync with Strategy Tester"""

src = '/home/user/vick/DepthVisionLab-v106_REAL_UI/public/index.html'
with open(src,'r',encoding='utf-8') as f:
    html = f.read()

# ── 1. version bump ──────────────────────────────────────────────────────────
html = html.replace('Beta 0.075','Beta 0.076')

# ── 2. changelog ────────────────────────────────────────────────────────────
html = html.replace(
    'Beta 0.076\n  - DEMO DATA badge: now dismissible',
    '''Beta 0.076
  - HVN Signals settings: added FILTROS section (Clarity threshold, Flow
    threshold, Dist. prox. HVN) and GESTÃO section (SL, TP) with the same
    options as the Strategy Tester Backtest form.
  - _applyToHVNSignals now syncs both: HVN Signals indicator fields AND
    all Strategy Tester form fields — optimizer apply finally updates the
    backtest form so re-running gives consistent results.
  - _btCache cleared on apply so next run picks up the new config.

Beta 0.075
  - DEMO DATA badge: now dismissible''',
    1
)

# ── 3. Add FILTROS + GESTÃO sections to HVN Signals settings ─────────────────
# Insert before the VISUAL section divider
OLD_HVN_VISUAL = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>'
)

NEW_HVN_SECTIONS = (
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">FILTROS</div>\n'
    '            <div class="kv"><span class="k">Trend Clarity</span>\n'
    '              <select class="select" id="hvnSigClarity" style="width:104px">\n'
    '                <option value="off">Desativado</option>\n'
    '                <option value="10">LONG &gt; +10</option>\n'
    '                <option value="20" selected>LONG &gt; +20</option>\n'
    '                <option value="30">LONG &gt; +30</option>\n'
    '                <option value="-5">SHORT &lt; -5</option>\n'
    '                <option value="-10">SHORT &lt; -10</option>\n'
    '                <option value="-20">SHORT &lt; -20</option>\n'
    '              </select></div>\n'
    '            <div class="kv"><span class="k">DVL Flow</span>\n'
    '              <select class="select" id="hvnSigFlow" style="width:104px">\n'
    '                <option value="off">Desativado</option>\n'
    '                <option value="10">LONG &gt; +10</option>\n'
    '                <option value="20" selected>LONG &gt; +20</option>\n'
    '                <option value="30">LONG &gt; +30</option>\n'
    '                <option value="-5">SHORT &lt; -5</option>\n'
    '                <option value="-10">SHORT &lt; -10</option>\n'
    '                <option value="-20">SHORT &lt; -20</option>\n'
    '              </select></div>\n'
    '            <div class="kv"><span class="k">Prox. HVN dist. %</span>'
    '<input class="num" id="hvnSigNextHVN" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">GESTÃO DE RISCO</div>\n'
    '            <div class="kv"><span class="k">Stop Loss</span>\n'
    '              <select class="select" id="hvnSigSL" style="width:104px">\n'
    '                <option value="wick" selected>Atrás do pavio</option>\n'
    '                <option value="hvn">Atrás da HVN</option>\n'
    '                <option value="atr">ATR</option>\n'
    '              </select></div>\n'
    '            <div class="kv"><span class="k">Take Profit</span>\n'
    '              <select class="select" id="hvnSigTP" style="width:104px">\n'
    '                <option value="hvn" selected>Próxima HVN</option>\n'
    '                <option value="1r">1R</option>\n'
    '                <option value="1.5r">1.5R</option>\n'
    '                <option value="2r">2R</option>\n'
    '              </select></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">VISUAL</div>'
)

assert OLD_HVN_VISUAL in html, "HVN VISUAL section not found"
html = html.replace(OLD_HVN_VISUAL, NEW_HVN_SECTIONS, 1)

# ── 4. Fix _applyToHVNSignals to sync ALL fields both ways ──────────────────
OLD_APPLY = r"""function _applyToHVNSignals(cfg,label){
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
}"""

NEW_APPLY = r"""/* canonical sync: cfg object → both HVN Signals fields AND Strategy Tester form */
function _syncAllFromCfg(cfg){
  if(!cfg)return;
  var ws=parseFloat(cfg.wickSens||cfg.w||45);
  var trend=cfg.trend!==undefined?String(cfg.trend):null;
  var flow=cfg.flow!==undefined?String(cfg.flow):null;
  var nextHVN=cfg.nextHVN||cfg.hvn;
  var sl=cfg.sl;
  var tp=cfg.tp;
  var maxCandles=cfg.maxCandles||cfg.cons;
  var risk=cfg.risk;

  function _setVal(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(el)el.value=val;}
  function _setSelVal(id,val){if(val===null||val===undefined)return;var el=document.getElementById(id);if(!el)return;var found=false;for(var i=0;i<el.options.length;i++){if(el.options[i].value===String(val)){el.selectedIndex=i;found=true;break;}}if(!found&&el.options.length)el.selectedIndex=0;}

  /* ── HVN Signals indicator fields ── */
  _setVal('hvnSigMinWick', Math.min(80,Math.max(5,Math.round(ws))));
  _setVal('hvnSigSens',    Math.max(0,Math.min(50,Math.round(ws*0.4))));
  if(maxCandles)_setVal('hvnSigLateral', maxCandles);
  if(trend!==null)_setSelVal('hvnSigClarity', trend);
  if(flow!==null) _setSelVal('hvnSigFlow',    flow);
  if(nextHVN)     _setVal('hvnSigNextHVN',    nextHVN);
  if(sl)          _setSelVal('hvnSigSL',       sl);
  if(tp)          _setSelVal('hvnSigTP',       tp);

  /* ── Strategy Tester Backtest form fields ── */
  _setVal('stWickSens',  ws);
  if(trend!==null)_setSelVal('stFTrend', trend);
  if(flow!==null) _setSelVal('stFFlow',  flow);
  if(nextHVN)     _setVal('stNextHVN',   nextHVN);
  if(sl)          _setSelVal('stSL',     sl);
  if(tp)          _setSelVal('stTP',     tp);
  if(maxCandles)  _setVal('stMaxCandles',maxCandles);
  if(risk)        _setVal('stRisk',      risk);

  /* update S.settings */
  try{
    if(window.S&&window.S.settings){
      window.S.settings.hvnSigMinWick=Math.min(80,Math.max(5,Math.round(ws)));
      window.S.settings.hvnSigSens=Math.max(0,Math.min(50,Math.round(ws*0.4)));
    }
  }catch(_){}

  /* clear cache so next backtest run picks up new values */
  for(var k in _btCache)delete _btCache[k];

  if(typeof drawSoon==='function')drawSoon();
}

function _applyToHVNSignals(cfg){
  _syncAllFromCfg(cfg);
}"""

assert OLD_APPLY in html, "OLD_APPLY not found"
html = html.replace(OLD_APPLY, NEW_APPLY, 1)

# ── 5. Also expose _syncAllFromCfg on window export ──────────────────────────
html = html.replace(
    "window._dvlST={open:open,close:close,version:V};",
    "window._dvlST={open:open,close:close,version:V,syncCfg:_syncAllFromCfg};",
    1
)

with open(src,'w',encoding='utf-8') as f:
    f.write(html)
print('OK: Beta 0.076 applied')
