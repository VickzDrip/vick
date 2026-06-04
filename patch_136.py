#!/usr/bin/env python3
"""patch_136.py — Beta 0.136: Progressive History Loading (TradingView-style lazy load)"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.135') >= 10
html = html.replace('Beta 0.135', 'Beta 0.136')

# ── 1. HTML: Status toast (bottom-center, auto-dismiss) ──────────────────────
assert '</body>' in html, '</body> not found'
html = html.replace(
    '</body>',
    '<div id="dvlHistStatus" style="position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:rgba(5,10,18,0.90);border:1px solid rgba(0,212,255,0.20);color:rgba(0,212,255,0.80);font-size:10px;font-family:monospace;padding:5px 14px;border-radius:4px;pointer-events:none;opacity:0;transition:opacity 0.35s;z-index:9999;letter-spacing:.05em;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,0.55)"></div>\n</body>',
    1
)

# ── 2. Script: progressive history system — inject before boot() ──────────────
OLD_BOOT_ANCHOR = 'async function boot(){'
assert OLD_BOOT_ANCHOR in html, 'boot() not found'

DVL_HISTORY_SYSTEM = """\
/* ── DVL Progressive History — Beta 0.136 ── */
function _dvlInitLim(tf){
  if(tf==='1s')return 1500;
  if(tf==='15s'||tf==='30s')return 1500;
  if(tf==='1m'||tf==='3m')return 2000;
  if(tf==='5m')return 2500;
  if(tf==='15m'||tf==='30m')return 3000;
  if(tf==='1h'||tf==='4h')return 3000;
  return 2000;
}
function _dvlBatchLim(tf){
  if(tf==='1s'||tf==='15s'||tf==='30s')return 1000;
  if(tf==='1m'||tf==='3m'||tf==='5m')return 1500;
  if(tf==='15m'||tf==='30m')return 2000;
  if(tf==='1h'||tf==='4h')return 3000;
  return 1000;
}
function _dvlMaxCandles(){return window.innerWidth<768?20000:80000;}
var _dvlHistLoading=false,_dvlHistExhausted=false,_dvlHistStatusTimer=null;
function _dvlShowHistStatus(msg,dismissMs){
  var s=document.getElementById('dvlHistStatus');
  if(!s)return;
  s.textContent=msg;s.style.opacity='1';
  clearTimeout(_dvlHistStatusTimer);
  if(dismissMs)_dvlHistStatusTimer=setTimeout(function(){s.style.opacity='0';},dismissMs);
}
async function _dvlLoadOlderCandles(){
  if(_dvlHistLoading||_dvlHistExhausted)return;
  if(!window.S||!S.candles||S.candles.length<2)return;
  var tf=S.tf;
  /* Synthetic sub-minute TFs use aggregation — endTime not supported */
  if(tf==='1s'||tf==='15s'||tf==='30s'){
    _dvlHistExhausted=true;
    _dvlShowHistStatus('Histórico ilimitado indisponível para '+tf,2500);
    return;
  }
  if(S.candles.length>=_dvlMaxCandles()){
    _dvlHistExhausted=true;
    _dvlShowHistStatus('Limite de memória — '+S.candles.length.toLocaleString()+' candles',3000);
    return;
  }
  _dvlHistLoading=true;
  var sym=S.sym,seq=S.loadSeq,endTime=S.candles[0].t-1,lim=_dvlBatchLim(tf);
  _dvlShowHistStatus('Carregando histórico…');
  try{
    var url=API+'/api/v3/klines?symbol='+sym+'&interval='+tf+'&limit='+lim+'&endTime='+endTime;
    var resp=await fetch(url);
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    var arr=await resp.json();
    if(seq!==S.loadSeq||sym!==S.sym||tf!==S.tf)return; /* stale */
    if(!arr||!arr.length){
      _dvlHistExhausted=true;
      _dvlShowHistStatus('Histórico completo — '+S.candles.length.toLocaleString()+' candles',3500);
      return;
    }
    var cutoff=S.candles[0].t;
    var newC=arr.map(klineToCandle).filter(function(c){return c.t<cutoff;});
    newC.sort(function(a,b){return a.t-b.t;});
    if(!newC.length){
      _dvlHistExhausted=true;
      _dvlShowHistStatus('Histórico completo',2500);
      return;
    }
    var n=newC.length;
    /* Prepend + shift viewport anchor — zero visual jump */
    S.candles=newC.concat(S.candles);
    S.view.start+=n;
    S.view.end+=n;
    _dvlShowHistStatus(S.candles.length.toLocaleString()+' candles — arraste para carregar mais',2000);
    if(typeof drawSoon==='function')drawSoon();
  }catch(e){
    if(seq===S.loadSeq)_dvlShowHistStatus('Erro ao buscar histórico',2000);
  }finally{
    _dvlHistLoading=false;
  }
}
/* Poll 300 ms — trigger when viewport reaches near left edge of loaded data */
setInterval(function(){
  if(!window.S||!S.candles||!S.candles.length||!S.view)return;
  if(S.view.start<80&&!_dvlHistLoading&&!_dvlHistExhausted)_dvlLoadOlderCandles();
},300);
"""

html = html.replace(OLD_BOOT_ANCHOR, DVL_HISTORY_SYSTEM + OLD_BOOT_ANCHOR, 1)

# ── 3. boot(): reset history state + use _dvlInitLim ─────────────────────────
OLD_LIM = (
    '    S.aggSeq=seq;\n'
    '\n'
    '    const lim=520;\n'
)
assert OLD_LIM in html, 'const lim=520 block not found'

NEW_LIM = (
    '    S.aggSeq=seq;\n'
    "    _dvlHistLoading=false;_dvlHistExhausted=false;(function(){var _hs=document.getElementById('dvlHistStatus');if(_hs)_hs.style.opacity='0';})();\n"
    '\n'
    '    const lim=_dvlInitLim(tf);\n'
)
html = html.replace(OLD_LIM, NEW_LIM, 1)

# ── 4. Live candle cap: raise from 620 → mobile:20k / desktop:80k ────────────
OLD_LIVE_CAP = (
    '    S.candles.push(c);\n'
    '    if(S.candles.length>620)S.candles.shift();\n'
    '    if(S.view.auto){\n'
)
assert OLD_LIVE_CAP in html, 'live cap block not found'

NEW_LIVE_CAP = (
    '    S.candles.push(c);\n'
    '    var _lMax=_dvlMaxCandles();if(S.candles.length>_lMax){S.candles.shift();if(!S.view.auto){S.view.start=Math.max(0,S.view.start-1);S.view.end=Math.max(1,S.view.end-1);}}\n'
    '    if(S.view.auto){\n'
)
html = html.replace(OLD_LIVE_CAP, NEW_LIVE_CAP, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_136.py applied — Beta 0.136')
print('  + Initial load: 1500-3000 candles by TF (was fixed 520)')
print('  + Lazy load: fetch older candles when S.view.start < 80')
print('  + Batch sizes: 1000-3000 candles per request by TF')
print('  + endTime param: loads candles before current oldest')
print('  + View anchor: S.view.start/end += n (zero visual jump)')
print('  + Live cap: 620 → 20 000 mobile / 80 000 desktop')
print('  + Status toast: bottom-center, auto-dismiss')
print('  + Polling interval: 300ms check')
print('  + Memory guard: halts at 20k/80k candles')
print('  + 1s/15s/30s: skip lazy load (aggregation incompatibility)')
