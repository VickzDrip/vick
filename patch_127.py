#!/usr/bin/env python3
"""patch_127.py — Beta 0.127: per-param ON/OFF toggles in Optimizer PARÂMETROS TESTADOS"""

import re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

old_count = html.count('Beta 0.126')
assert old_count >= 10, f'Expected >=10 version refs, found {old_count}'

# ── 1. VERSION BUMP ───────────────────────────────────────────────────────────
html = html.replace('Beta 0.126', 'Beta 0.127')
assert html.count('Beta 0.127') >= 10, 'Version bump incomplete'

# ── 2. CSS: toggle button styles ─────────────────────────────────────────────
OLD_CSS = '.dvl-st-opv{font-size:7.5px;color:#6a8099;text-align:right;line-height:1.55}'
assert OLD_CSS in html, 'opv CSS not found'
NEW_CSS = (OLD_CSS + '\n'
    '.dvl-st-optog{font-size:7px;font-weight:800;letter-spacing:.07em;padding:2px 6px;border-radius:4px;cursor:pointer;border:1px solid rgba(0,200,220,.28);background:rgba(0,200,220,.07);color:#3a7080;transition:all .15s;flex-shrink:0;line-height:1.5;user-select:none;-webkit-user-select:none;white-space:nowrap}\n'
    '.dvl-st-optog.locked{border-color:rgba(255,196,0,.45);background:rgba(255,196,0,.12);color:#b08800}\n'
    '.dvl-st-oparam-locked{opacity:.6}\n'
    '.dvl-st-optog:active{transform:scale(.94)}\n'
    '#dvlSTOptComboCount{font-size:8px;color:#344a62;text-align:center;padding:3px 0 5px;letter-spacing:.04em;min-height:14px}')
html = html.replace(OLD_CSS, NEW_CSS, 1)

# ── 3. OPT_PARAMS with key property ──────────────────────────────────────────
OLD_OPT_PARAMS = """var OPT_PARAMS=[
  {n:'Pavio mínimo',v:'30% · 35% · 40% · 45% · 50% · 55% · 60%'},
  {n:'Regra de fechamento',v:'Fora da zona · Além do meio · Corpo forte'},
  {n:'Consolidação (candles)',v:'3 · 5 · 8 · 12'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20'},
  {n:'Dist. próxima HVN',v:'Sem filtro · 0.25% · 0.35% · 0.50%'},
  {n:'Volume spike',v:'Desativado · ×1.5 · ×2.0'},
  {n:'Padrão do Sinal',v:'Wick Rejection · Dive & Recover · Engolfing · Todos'},
  {n:'Stop Loss',v:'Pavio · HVN · ATR'},
  {n:'Take Profit',v:'Próx. HVN · 1R · 1.5R · 2R · 0.5% · 1% · 1.5% · 2% · 3%'},
  {n:'TF das Zonas HVN',v:'5m · 15m · 1h · 4h · 1D (testado pelo optimizer)'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui'},
  {n:'Tamanho mín. ATR',v:'Off · 0.05 · 0.10 · 0.15 · 0.20 · 0.25 · 0.30'},
];"""
assert OLD_OPT_PARAMS in html, 'OPT_PARAMS not found'
NEW_OPT_PARAMS = """var OPT_PARAMS=[
  {n:'Pavio mínimo',v:'30% · 35% · 40% · 45% · 50% · 55% · 60%',key:'w'},
  {n:'Regra de fechamento',v:'Fora da zona · Além do meio · Corpo forte',key:'close'},
  {n:'Consolidação (candles)',v:'3 · 5 · 8 · 12',key:'cons'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30 · SHORT < -5 · < -10 · < -20',key:'flow'},
  {n:'Dist. próxima HVN',v:'Sem filtro · 0.25% · 0.35% · 0.50%',key:'hvn'},
  {n:'Volume spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
  {n:'Padrão do Sinal',v:'Wick Rejection · Dive & Recover · Engolfing · Todos',key:'mode'},
  {n:'Stop Loss',v:'Pavio · HVN · ATR',key:'sl'},
  {n:'Take Profit',v:'Próx. HVN · 1R · 1.5R · 2R · 0.5% · 1% · 1.5% · 2% · 3%',key:'tp'},
  {n:'TF das Zonas HVN',v:'5m · 15m · 1h · 4h · 1D (testado pelo optimizer)',key:'tf'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui',key:'trendFilter'},
  {n:'Tamanho mín. ATR',v:'Off · 0.05 · 0.10 · 0.15 · 0.20 · 0.25 · 0.30',key:'minAtrHvn'},
];"""
html = html.replace(OLD_OPT_PARAMS, NEW_OPT_PARAMS, 1)

# ── 4. FVG_OPT_PARAMS with key property ──────────────────────────────────────
OLD_FVG_PARAMS = """var FVG_OPT_PARAMS=[
  {n:'Gap mín. ATR×',v:'0.05 · 0.08 · 0.10 · 0.15 · 0.20'},
  {n:'Mitigação',v:'Wick · Close'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30'},
  {n:'Exigir Reação',v:'Sim · Não'},
  {n:'Exigir Re-entry',v:'Sim · Não'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0'},
  {n:'Stop Loss',v:'Pavio · Borda do FVG · ATR'},
  {n:'Take Profit',v:'Próx. FVG · 1R · 1.5R · 2R'},
  {n:'Idade máx. FVG',v:'Sem limite · 100 · 200 · 300 barras'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui'},
];"""
assert OLD_FVG_PARAMS in html, 'FVG_OPT_PARAMS not found'
NEW_FVG_PARAMS = """var FVG_OPT_PARAMS=[
  {n:'Gap mín. ATR×',v:'0.05 · 0.08 · 0.10 · 0.15 · 0.20',key:'minAtr'},
  {n:'Mitigação',v:'Wick · Close',key:'mitMode'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20 · > +30',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20 · > +30',key:'flow'},
  {n:'Exigir Reação',v:'Sim · Não',key:'react'},
  {n:'Exigir Re-entry',v:'Sim · Não',key:'reentry'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
  {n:'Stop Loss',v:'Pavio · Borda do FVG · ATR',key:'sl'},
  {n:'Take Profit',v:'Próx. FVG · 1R · 1.5R · 2R',key:'tp'},
  {n:'Idade máx. FVG',v:'Sem limite · 100 · 200 · 300 barras',key:'maxAge'},
  {n:'Filtro TB',v:'Off · Adicional · Substitui',key:'trendFilter'},
];"""
html = html.replace(OLD_FVG_PARAMS, NEW_FVG_PARAMS, 1)

# ── 5. TB_OPT_PARAMS with key property ───────────────────────────────────────
OLD_TB_PARAMS = """var TB_OPT_PARAMS=[
  {n:'Período rápido MA',v:'2 · 3 · 5 · 7 · 10'},
  {n:'Período lento MA',v:'8 · 10 · 14 · 20 · 30'},
  {n:'Bias mínimo',v:'0 · 3 · 5 · 10 · 15'},
  {n:'Modo saída',v:'Flip (virada) · SL/TP'},
  {n:'Stop Loss',v:'Pavio · ATR · Fixo ATR×1.5'},
  {n:'Take Profit',v:'1R · 1.5R · 2R · Próx. virada'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0'},
];"""
assert OLD_TB_PARAMS in html, 'TB_OPT_PARAMS not found'
NEW_TB_PARAMS = """var TB_OPT_PARAMS=[
  {n:'Período rápido MA',v:'2 · 3 · 5 · 7 · 10',key:'fast'},
  {n:'Período lento MA',v:'8 · 10 · 14 · 20 · 30',key:'slow'},
  {n:'Bias mínimo',v:'0 · 3 · 5 · 10 · 15',key:'bias'},
  {n:'Modo saída',v:'Flip (virada) · SL/TP',key:'exitMode'},
  {n:'Stop Loss',v:'Pavio · ATR · Fixo ATR×1.5',key:'sl'},
  {n:'Take Profit',v:'1R · 1.5R · 2R · Próx. virada',key:'tp'},
  {n:'Trend Clarity',v:'Off · LONG > +10 · > +20',key:'trend'},
  {n:'DVL Flow',v:'Off · LONG > +10 · > +20',key:'flow'},
  {n:'Volume Spike',v:'Desativado · ×1.5 · ×2.0',key:'volSpike'},
];"""
html = html.replace(OLD_TB_PARAMS, NEW_TB_PARAMS, 1)

# ── 6. Add _optLockedKeys + rewrite _stRenderOptParams + add helpers ──────────
OLD_RENDER = """function _stRenderOptParams(params){
  var c=document.getElementById('dvlSTOptParams');if(!c)return;
  c.innerHTML='';
  var _pd=document.getElementById('stOptPeriod');
  var _pdTxt=_pd?_pd.options[_pd.selectedIndex].text:'30 dias';
  var _pRow=document.createElement('div');_pRow.className='dvl-st-oparam';
  _pRow.innerHTML='<span class="dvl-st-opn">Período</span><span class="dvl-st-opv">'+_pdTxt+'</span>';
  c.appendChild(_pRow);
  params.forEach(function(p){
    var d=document.createElement('div');d.className='dvl-st-oparam';
    d.innerHTML='<span class="dvl-st-opn">'+p.n+'</span><span class="dvl-st-opv">'+p.v+'</span>';
    c.appendChild(d);
  });
}"""
assert OLD_RENDER in html, '_stRenderOptParams not found'
NEW_RENDER = """var _optLockedKeys=new Set();
function _getLockedVal(key,ind){
  var g=function(id){var e=document.getElementById(id);return e?e.value:null;};
  var isFvg=ind==='fvgConf',isTB=ind==='trendBreak';
  if(isFvg){
    if(key==='minAtr'){var v=g('stFvgMinAtr');return v!==null?parseFloat(v):null;}
    if(key==='mitMode')return g('stFvgMit');
    if(key==='react'){var v=g('stFvgReact');return v!==null?(v==='1'):null;}
    if(key==='reentry'){var v=g('stFvgReentry');return v!==null?(v==='1'):null;}
    if(key==='maxAge'){var v=g('stFvgMaxAge');return v!==null?parseInt(v):null;}
    if(key==='volSpike')return g('stFVol');
    if(key==='sl')return g('stSL');
    if(key==='tp')return g('stTP');
    if(key==='trendFilter')return g('stTBFilterMode');
    return null;
  }
  if(isTB){
    if(key==='fast'){var v=g('stTBFast');return v!==null?parseInt(v):null;}
    if(key==='slow'){var v=g('stTBSlow');return v!==null?parseInt(v):null;}
    if(key==='bias'){var v=g('stTBBias');return v!==null?parseInt(v):null;}
    if(key==='exitMode')return g('stTBExit');
    if(key==='sl')return g('stSL');
    if(key==='tp')return g('stTP');
    if(key==='volSpike')return g('stFVol');
    return null;
  }
  if(key==='w'){var v=g('stWickSens');return v!==null?parseInt(v):null;}
  if(key==='cons'){var v=g('stMaxCandles');return v!==null?parseInt(v):null;}
  if(key==='hvn'){var v=g('stNextHVN');var fv=v!==null?parseFloat(v):null;return(fv!==null&&!isNaN(fv))?fv:null;}
  if(key==='mode')return g('stMode');
  if(key==='sl')return g('stSL');
  if(key==='tp')return g('stTP');
  if(key==='trendFilter')return g('stTBFilterMode');
  if(key==='minAtrHvn'){var v=g('stHvnMinAtr');return v!==null?parseFloat(v):null;}
  if(key==='tf'){var v=g('stOptTf');return v?v.toLowerCase():null;}
  if(key==='volSpike')return g('stFVol');
  return null;
}
function _comboValMatch(c,key,lv){
  var cv=c[key];
  if(key==='hvn'||key==='minAtrHvn'){
    if(lv===0)return !cv||cv===0;
    return Math.abs((parseFloat(cv)||0)-lv)<0.0001;
  }
  if(key==='tf')return (String(cv||'')).toLowerCase()===(String(lv||'')).toLowerCase();
  if(key==='react'||key==='reentry')return !!cv===!!lv;
  if(typeof lv==='number')return parseFloat(cv)===lv;
  return String(cv||'')===String(lv||'');
}
function _filterOptCombos(combos,ind){
  if(!_optLockedKeys||!_optLockedKeys.size)return combos;
  return combos.filter(function(c){
    var ok=true;
    _optLockedKeys.forEach(function(key){
      if(!ok)return;
      var lv=_getLockedVal(key,ind);
      if(lv===null||lv===undefined)return;
      if(!combos.some(function(x){return _comboValMatch(x,key,lv);}))return;
      if(!_comboValMatch(c,key,lv))ok=false;
    });
    return ok;
  });
}
function _updateOptComboCount(){
  var ind=(_g('stInd')||{value:'hvnSignals'}).value;
  var isFvg=ind==='fvgConf',isTB=ind==='trendBreak';
  var all=isFvg?FVG_OPT_COMBOS:(isTB?TB_OPT_COMBOS:OPT_COMBOS);
  var filtered=_filterOptCombos(all,ind);
  var el=_g('dvlSTOptComboCount');if(!el)return;
  if(filtered.length<all.length){
    el.textContent=filtered.length+' / '+all.length+' combinações ativas';
    el.style.color='#b08800';
  } else {
    el.textContent=all.length+' combinações';
    el.style.color='#344a62';
  }
}
function _stRenderOptParams(params){
  var c=document.getElementById('dvlSTOptParams');if(!c)return;
  c.innerHTML='';
  var _pd=document.getElementById('stOptPeriod');
  var _pdTxt=_pd?_pd.options[_pd.selectedIndex].text:'30 dias';
  var _pRow=document.createElement('div');_pRow.className='dvl-st-oparam';
  _pRow.innerHTML='<span class="dvl-st-opn">Período</span><span class="dvl-st-opv">'+_pdTxt+'</span>';
  c.appendChild(_pRow);
  params.forEach(function(p){
    var locked=!!(p.key&&_optLockedKeys.has(p.key));
    var d=document.createElement('div');
    d.className='dvl-st-oparam'+(locked?' dvl-st-oparam-locked':'');
    if(p.key){
      d.innerHTML='<button class="dvl-st-optog'+(locked?' locked':'')+'" data-optkey="'+p.key+'">'
        +(locked?'LOCK':'ON')+'</button>'
        +'<span class="dvl-st-opn" style="flex:1;margin:0 5px">'+p.n+'</span>'
        +'<span class="dvl-st-opv">'+(locked?'<i style="color:#9a7700;font-style:normal">valor atual</i>':p.v)+'</span>';
    } else {
      d.innerHTML='<span class="dvl-st-opn">'+p.n+'</span><span class="dvl-st-opv">'+p.v+'</span>';
    }
    c.appendChild(d);
  });
  _updateOptComboCount();
}"""
html = html.replace(OLD_RENDER, NEW_RENDER, 1)

# ── 7. _stSwitchInd: clear locked keys when indicator changes ─────────────────
OLD_SWITCH_RENDER = '  _stRenderOptParams(isFvg?FVG_OPT_PARAMS:(isTB?TB_OPT_PARAMS:OPT_PARAMS));'
assert OLD_SWITCH_RENDER in html, '_stSwitchInd render line not found'
NEW_SWITCH_RENDER = '  _optLockedKeys.clear();_stRenderOptParams(isFvg?FVG_OPT_PARAMS:(isTB?TB_OPT_PARAMS:OPT_PARAMS));'
html = html.replace(OLD_SWITCH_RENDER, NEW_SWITCH_RENDER, 1)

# ── 8. Replace IIFE: use _stRenderOptParams + add click event delegation ───────
OLD_IIFE = """(function(){
  var c=document.getElementById('dvlSTOptParams');
  if(!c)return;
  OPT_PARAMS.forEach(function(p){
    var d=document.createElement('div');
    d.className='dvl-st-oparam';
    d.innerHTML='<span class="dvl-st-opn">'+p.n+'</span><span class="dvl-st-opv">'+p.v+'</span>';
    c.appendChild(d);
  });
})();"""
assert OLD_IIFE in html, 'Init IIFE not found'
NEW_IIFE = """(function(){
  var c=document.getElementById('dvlSTOptParams');
  if(!c)return;
  _stRenderOptParams(OPT_PARAMS);
  c.addEventListener('click',function(ev){
    var btn=ev.target.closest?ev.target.closest('.dvl-st-optog'):null;
    if(!btn&&ev.target.classList&&ev.target.classList.contains('dvl-st-optog'))btn=ev.target;
    if(!btn)return;
    var key=btn.getAttribute('data-optkey');if(!key)return;
    if(_optLockedKeys.has(key))_optLockedKeys.delete(key);else _optLockedKeys.add(key);
    var ind=(_g('stInd')||{value:'hvnSignals'}).value;
    _stRenderOptParams(ind==='fvgConf'?FVG_OPT_PARAMS:(ind==='trendBreak'?TB_OPT_PARAMS:OPT_PARAMS));
  });
})();"""
html = html.replace(OLD_IIFE, NEW_IIFE, 1)

# ── 9. Add dvlSTOptComboCount div after dvlSTOptParams ───────────────────────
OLD_PARAMS_DIV = '      <div id="dvlSTOptParams"></div>'
assert OLD_PARAMS_DIV in html, 'dvlSTOptParams div not found'
NEW_PARAMS_DIV = '      <div id="dvlSTOptParams"></div>\n      <div id="dvlSTOptComboCount"></div>'
html = html.replace(OLD_PARAMS_DIV, NEW_PARAMS_DIV, 1)

# ── 10. _doOpt (HVN): filter combos before running ───────────────────────────
OLD_DO_OPT = """  function _doOpt(candles,zones){
    var results=[],total=OPT_COMBOS.length,done=0;
    function step(){
      if(done>=total){
        _allOptResults=results;
        _reRankResults();"""
assert OLD_DO_OPT in html, '_doOpt signature not found'
NEW_DO_OPT = """  function _doOpt(candles,zones){
    var _combos=_filterOptCombos(OPT_COMBOS,'hvnSignals');
    var results=[],total=_combos.length,done=0;
    function step(){
      if(done>=total){
        _allOptResults=results;
        _reRankResults();"""
html = html.replace(OLD_DO_OPT, NEW_DO_OPT, 1)

OLD_COMBOS_DONE = """      var batch=Math.min(15,total-done);
      for(var _b=0;_b<batch;_b++){
        var c=OPT_COMBOS[done];
        var comboCfg={wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,"""
assert OLD_COMBOS_DONE in html, '_doOpt batch loop not found'
NEW_COMBOS_DONE = """      var batch=Math.min(15,total-done);
      for(var _b=0;_b<batch;_b++){
        var c=_combos[done];
        var comboCfg={wickSens:c.w,trend:c.trend,flow:c.flow,nextHVN:c.hvn,"""
html = html.replace(OLD_COMBOS_DONE, NEW_COMBOS_DONE, 1)

# ── 11. _doOptFVG: filter combos ─────────────────────────────────────────────
OLD_DO_FVG = """  function _doOptFVG(candles){
    _optCandles=candles;
    _doOptGeneric(FVG_OPT_COMBOS,function(c){"""
assert OLD_DO_FVG in html, '_doOptFVG not found'
NEW_DO_FVG = """  function _doOptFVG(candles){
    _optCandles=candles;
    _doOptGeneric(_filterOptCombos(FVG_OPT_COMBOS,'fvgConf'),function(c){"""
html = html.replace(OLD_DO_FVG, NEW_DO_FVG, 1)

# ── 12. _doOptTB: filter combos ──────────────────────────────────────────────
OLD_DO_TB = """  function _doOptTB(candles){
    _optCandles=candles;
    _doOptGeneric(TB_OPT_COMBOS,function(c){"""
assert OLD_DO_TB in html, '_doOptTB not found'
NEW_DO_TB = """  function _doOptTB(candles){
    _optCandles=candles;
    _doOptGeneric(_filterOptCombos(TB_OPT_COMBOS,'trendBreak'),function(c){"""
html = html.replace(OLD_DO_TB, NEW_DO_TB, 1)

# ── 13. Changelog ─────────────────────────────────────────────────────────────
OLD_CHANGELOG = '/* ── DVL Strategy Tester — Beta 0.127 ── */'
assert OLD_CHANGELOG in html, 'CSS version comment not found'
# Already updated via version bump. Now add changelog entry.
OLD_CHANGELOG2 = '/* ── DVL Strategy Tester — Beta 0.127 ── */'
NEW_CHANGELOG2 = ('/* ── DVL Strategy Tester — Beta 0.127 ── */\n'
    '/* 0.127: optimizer per-param ON/OFF toggles — lock any param to current form value to reduce combo space */')
html = html.replace(OLD_CHANGELOG2, NEW_CHANGELOG2, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_127.py applied — Beta 0.127')
print('  + per-param ON/OFF toggles in Optimizer PARÂMETROS TESTADOS')
print('  + _optLockedKeys Set, _getLockedVal, _comboValMatch, _filterOptCombos')
print('  + _updateOptComboCount shows "N / total combinações"')
print('  + combo filtering in _doOpt, _doOptFVG, _doOptTB')
