#!/usr/bin/env python3
"""patch_169.py — Beta 0.169: DVL Moving Averages — 10 médias móveis nativas

Novo indicador nativo: DVL Moving Averages
- 10 slots independentes (MA 1–10), cada um independente
- Tipos: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA
- Por padrão: MA 1 = SMA 20 ativa, MA 2–10 desligadas
- Cada slot: toggle On/Off, período, tipo, cor, espessura, estilo de linha
- Show MA Labels: opcional (default OFF)
- Cache por sym|tf|period|type
- Persistência em localStorage
- Novo safeLayer no draw principal após candles
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.168') >= 10, 'Beta 0.168 not found'
html = html.replace('Beta 0.168', 'Beta 0.169')

# ── 1. S.inds: adiciona movingAverages:false ──────────────────────────────────
OLD_INDS = "spikeZones:false},window.__savedInds||{})"
assert OLD_INDS in html, 'S.inds anchor not found'
html = html.replace(OLD_INDS, "spikeZones:false,movingAverages:false},window.__savedInds||{})", 1)

# ── 2. safeLayer: injeta chamada após Volume Overlay / antes de drawCustom ─────
OLD_SAFE = (
    "if(S.inds.stdVolume)safeLayer('Volume Overlay',()=>drawVolumeOverlay(ctx,W,H,V,x,bw));"
    "resetCtxState(ctx);drawCustom(ctx,AllV,sc,x);"
)
assert OLD_SAFE in html, 'Volume Overlay safeLayer anchor not found'
html = html.replace(OLD_SAFE,
    "if(S.inds.stdVolume)safeLayer('Volume Overlay',()=>drawVolumeOverlay(ctx,W,H,V,x,bw));"
    "resetCtxState(ctx);"
    "if(window.__drawMovingAverages)safeLayer('Moving Averages',()=>window.__drawMovingAverages(ctx,W,H,AllV,sc,x));"
    "resetCtxState(ctx);drawCustom(ctx,AllV,sc,x);",
    1)

# ── 3. HTML card + nova categoria Tendência ───────────────────────────────────

MA_DEFS = [
    ('1', '20', '#22d3ee', True),
    ('2', '50', '#f59e0b', False),
    ('3', '100', '#a855f7', False),
    ('4', '200', '#ef4444', False),
    ('5', '10',  '#34d399', False),
    ('6', '21',  '#60a5fa', False),
    ('7', '34',  '#f97316', False),
    ('8', '55',  '#e879f9', False),
    ('9', '89',  '#4ade80', False),
    ('10','144', '#fb7185', False),
]

def ma_row(n, period, color, enabled):
    checked = ' checked' if enabled else ''
    col_checked = ' checked' if enabled else ''
    label_color = '#22d4ee' if enabled else '#8aa0bb'
    row_opacity = '' if enabled else 'opacity:.55;'
    return (
        f'            <div style="display:flex;align-items:center;gap:3px;padding:3px 0;'
        f'border-bottom:1px solid rgba(255,255,255,.04);{row_opacity}">\n'
        f'              <label style="display:flex;align-items:center;gap:2px;min-width:38px;cursor:pointer;flex-shrink:0;">'
        f'<input type="checkbox" id="ma{n}On"{checked} style="width:12px;height:12px;accent-color:#22d3ee;cursor:pointer;flex-shrink:0;">'
        f'<span style="font-size:9px;color:#8aa0bb;font-weight:700;letter-spacing:.03em;white-space:nowrap">MA{n}</span></label>\n'
        f'              <input class="num" type="number" id="ma{n}Period" value="{period}" min="1" max="2000" style="width:40px;font-size:10px;">\n'
        f'              <select id="ma{n}Type" class="select" style="width:70px;font-size:9px;">'
        f'<option value="SMA" selected>SMA</option>'
        f'<option value="EMA">EMA</option>'
        f'<option value="WMA">WMA</option>'
        f'<option value="VWMA">VWMA</option>'
        f'<option value="RMA">RMA</option>'
        f'<option value="HMA">HMA</option>'
        f'<option value="DEMA">DEMA</option>'
        f'<option value="TEMA">TEMA</option>'
        f'<option value="LSMA">LSMA</option>'
        f'<option value="KAMA">KAMA</option>'
        f'</select>\n'
        f'              <label style="position:relative;width:18px;height:18px;flex-shrink:0;cursor:pointer;border-radius:3px;border:1px solid #1e2a40;overflow:hidden">'
        f'<div id="ma{n}ColorSwatch" style="width:100%;height:100%;background:{color};pointer-events:none"></div>'
        f'<input id="ma{n}Color" type="color" value="{color}" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0"></label>\n'
        f'              <select id="ma{n}Width" class="select" style="width:38px;font-size:9px;">'
        f'<option value="1">1</option>'
        f'<option value="1.5">1.5</option>'
        f'<option value="2" selected>2</option>'
        f'<option value="3">3</option>'
        f'</select>\n'
        f'              <select id="ma{n}Style" class="select" style="width:62px;font-size:9px;">'
        f'<option value="solid" selected>Sólido</option>'
        f'<option value="dashed">Traço</option>'
        f'<option value="dotted">Ponto</option>'
        f'</select>\n'
        f'            </div>\n'
    )

MA_ROWS = ''
for n, period, color, enabled in MA_DEFS:
    MA_ROWS += ma_row(n, period, color, enabled)

MA_CARD = (
    '        <div class="dvl-cat-hdr" data-dvl-cat="tendencia">Tendência &amp; Médias</div>\n'
    '\n'
    '        <div class="ind-card dvl-icd" data-card="movingAverages" data-dvl-cat="tendencia">\n'
    '          <div class="dvl-icd-head">\n'
    '            <div class="dvl-icd-icon" style="--ic-bg:rgba(34,211,238,.12);--ic-cl:#22d3ee">'
    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">'
    '<path d="M1 12 Q4 5 7 8 Q10 11 13 4"/>'
    '</svg></div>\n'
    '            <div class="dvl-icd-info">\n'
    '              <div class="dvl-icd-name name">Moving Averages</div>\n'
    '              <div class="dvl-icd-meta">\n'
    '                <span class="dvl-bdg dvl-bdg-nat">NATIVO</span>\n'
    '              </div>\n'
    '            </div>\n'
    '            <div class="dvl-icd-ctrl">\n'
    '              <div class="row" data-ind="movingAverages"><span class="switch"></span></div>\n'
    '              <button class="gear" data-settings="movingAverages" title="Configurar Moving Averages">&#9881;</button>\n'
    '              <button class="dvl-star" data-star="movingAverages" type="button" title="Favoritar">'
    '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg>'
    '</button>\n'
    '            </div>\n'
    '          </div>\n'
    '          <div class="ind-settings" id="settings-movingAverages">\n'
    '            <!-- header de colunas -->\n'
    '            <div style="display:flex;align-items:center;gap:3px;padding:0 0 4px;border-bottom:1px solid rgba(34,211,238,.12);margin-bottom:2px;">\n'
    '              <span style="min-width:38px;font-size:8px;color:#4a6580;font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;"></span>\n'
    '              <span style="width:40px;font-size:8px;color:#4a6580;font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">Per.</span>\n'
    '              <span style="width:70px;font-size:8px;color:#4a6580;font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">Tipo</span>\n'
    '              <span style="width:18px;font-size:8px;color:#4a6580;font-weight:700;flex-shrink:0;">Cor</span>\n'
    '              <span style="width:38px;font-size:8px;color:#4a6580;font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">Larg</span>\n'
    '              <span style="width:62px;font-size:8px;color:#4a6580;font-weight:700;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;">Estilo</span>\n'
    '            </div>\n'
    + MA_ROWS +
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <label class="kv" style="cursor:pointer;">'
    '<span class="k">Show MA Labels</span>'
    '<input type="checkbox" id="maShowLabels" style="width:14px;height:14px;accent-color:#22d3ee;cursor:pointer;flex-shrink:0;">'
    '</label>\n'
    '            <div class="hint">DVL Moving Averages — até 10 médias independentes. '
    'Tipos: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA. '
    'Por padrão: MA1 = SMA 20 ativa.</div>\n'
    '          </div>\n'
    '        </div>\n'
    '\n'
)

OLD_CONF_HEADER = '        <div class="dvl-cat-hdr" data-dvl-cat="confluencia">Confluência &amp; Sinais</div>'
assert OLD_CONF_HEADER in html, 'confluencia category header not found'
html = html.replace(OLD_CONF_HEADER, MA_CARD + OLD_CONF_HEADER, 1)

# ── 4. Script block: implementação completa ───────────────────────────────────
MA_SCRIPT = r"""
<!-- ── DVL Moving Averages — Beta 0.169 ── -->
<script>
(function DVL_MA(){
  'use strict';

  /* ── Defaults ── */
  var MA_DEFAULTS=[
    {enabled:true, period:20,  type:'SMA',color:'#22d3ee',width:2,style:'solid'},
    {enabled:false,period:50,  type:'SMA',color:'#f59e0b',width:2,style:'solid'},
    {enabled:false,period:100, type:'SMA',color:'#a855f7',width:2,style:'solid'},
    {enabled:false,period:200, type:'SMA',color:'#ef4444',width:2,style:'solid'},
    {enabled:false,period:10,  type:'SMA',color:'#34d399',width:1,style:'solid'},
    {enabled:false,period:21,  type:'SMA',color:'#60a5fa',width:1,style:'solid'},
    {enabled:false,period:34,  type:'SMA',color:'#f97316',width:1,style:'solid'},
    {enabled:false,period:55,  type:'SMA',color:'#e879f9',width:1,style:'solid'},
    {enabled:false,period:89,  type:'SMA',color:'#4ade80',width:1,style:'solid'},
    {enabled:false,period:144, type:'SMA',color:'#fb7185',width:1,style:'solid'},
  ];

  /* ── Calc: SMA ── */
  function calcSMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null),sum=0;
    for(var i=0;i<n;i++){
      sum+=cs[i].c;if(i>=p)sum-=cs[i-p].c;
      if(i>=p-1)res[i]=sum/p;
    }
    return res;
  }

  /* ── Calc: EMA ── */
  function calcEMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null),k=2/(p+1),ema=0,started=false;
    for(var i=0;i<n;i++){
      if(!started){
        if(i<p-1)continue;
        var s=0;for(var j=i-p+1;j<=i;j++)s+=cs[j].c;
        ema=s/p;started=true;res[i]=ema;
      }else{ema=cs[i].c*k+ema*(1-k);res[i]=ema;}
    }
    return res;
  }

  /* ── Calc: WMA ── */
  function calcWMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null),denom=p*(p+1)/2;
    for(var i=p-1;i<n;i++){
      var ws=0;for(var j=0;j<p;j++)ws+=(p-j)*cs[i-j].c;
      res[i]=ws/denom;
    }
    return res;
  }

  /* ── Calc: VWMA ── */
  function calcVWMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null);
    for(var i=p-1;i<n;i++){
      var pv=0,v=0;
      for(var j=0;j<p;j++){pv+=cs[i-j].c*(cs[i-j].v||1);v+=cs[i-j].v||1;}
      res[i]=v>0?pv/v:cs[i].c;
    }
    return res;
  }

  /* ── Calc: RMA (Wilder) ── */
  function calcRMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null),a=1/p,rma=0,started=false;
    for(var i=0;i<n;i++){
      if(!started){
        if(i<p-1)continue;
        var s=0;for(var j=i-p+1;j<=i;j++)s+=cs[j].c;
        rma=s/p;started=true;res[i]=rma;
      }else{rma=cs[i].c*a+rma*(1-a);res[i]=rma;}
    }
    return res;
  }

  /* ── Calc: HMA = WMA(2*WMA(n/2) − WMA(n), sqrt(n)) ── */
  function calcHMA(cs,p){
    var h=Math.max(2,Math.round(Math.sqrt(p)));
    var h2=Math.max(2,Math.round(p/2));
    var w1=calcWMA(cs,p),w2=calcWMA(cs,h2),n=cs.length;
    var synth=[];
    for(var i=0;i<n;i++){
      var v=(w1[i]!=null&&w2[i]!=null)?2*w2[i]-w1[i]:null;
      synth.push({c:v||0,v:1});
    }
    var raw=calcWMA(synth,h);
    for(var i=0;i<n;i++){if(w1[i]==null||w2[i]==null)raw[i]=null;}
    return raw;
  }

  /* ── Calc: DEMA = 2*EMA − EMA(EMA) ── */
  function calcDEMA(cs,p){
    var e1=calcEMA(cs,p),n=cs.length,synth=[];
    for(var i=0;i<n;i++)synth.push({c:e1[i]||0,v:1});
    var e2=calcEMA(synth,p),res=new Array(n).fill(null);
    for(var i=0;i<n;i++){if(e1[i]!=null&&e2[i]!=null)res[i]=2*e1[i]-e2[i];}
    return res;
  }

  /* ── Calc: TEMA = 3*EMA − 3*EMA² + EMA³ ── */
  function calcTEMA(cs,p){
    var e1=calcEMA(cs,p),n=cs.length,s1=[],s2=[];
    for(var i=0;i<n;i++)s1.push({c:e1[i]||0,v:1});
    var e2=calcEMA(s1,p);
    for(var i=0;i<n;i++)s2.push({c:e2[i]||0,v:1});
    var e3=calcEMA(s2,p),res=new Array(n).fill(null);
    for(var i=0;i<n;i++){if(e1[i]!=null&&e2[i]!=null&&e3[i]!=null)res[i]=3*e1[i]-3*e2[i]+e3[i];}
    return res;
  }

  /* ── Calc: LSMA (linear regression) ── */
  function calcLSMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null);
    for(var i=p-1;i<n;i++){
      var sx=0,sy=0,sxy=0,sx2=0;
      for(var j=0;j<p;j++){var xv=j,yv=cs[i-p+1+j].c;sx+=xv;sy+=yv;sxy+=xv*yv;sx2+=xv*xv;}
      var den=p*sx2-sx*sx;
      if(den===0){res[i]=sy/p;continue;}
      var sl=(p*sxy-sx*sy)/den,ic=(sy-sl*sx)/p;
      res[i]=ic+sl*(p-1);
    }
    return res;
  }

  /* ── Calc: KAMA (Kaufman Adaptive) ── */
  function calcKAMA(cs,p){
    var n=cs.length,res=new Array(n).fill(null),fast=2/3,slow=2/31,kama=0;
    for(var i=0;i<n;i++){
      if(i<p){continue;}
      if(i===p)kama=cs[i-1].c;
      var change=Math.abs(cs[i].c-cs[i-p].c),vol=0;
      for(var j=1;j<=p;j++)vol+=Math.abs(cs[i-j+1].c-cs[i-j].c);
      var er=vol>0?change/vol:0,sc=Math.pow(er*(fast-slow)+slow,2);
      kama+=sc*(cs[i].c-kama);
      res[i]=kama;
    }
    return res;
  }

  /* ── Dispatcher ── */
  function calcMA(cs,p,type){
    if(p<1||!cs||cs.length<2)return new Array((cs||[]).length).fill(null);
    switch(type){
      case 'EMA':  return calcEMA(cs,p);
      case 'WMA':  return calcWMA(cs,p);
      case 'VWMA': return calcVWMA(cs,p);
      case 'RMA':  return calcRMA(cs,p);
      case 'HMA':  return calcHMA(cs,p);
      case 'DEMA': return calcDEMA(cs,p);
      case 'TEMA': return calcTEMA(cs,p);
      case 'LSMA': return calcLSMA(cs,p);
      case 'KAMA': return calcKAMA(cs,p);
      default:     return calcSMA(cs,p);
    }
  }

  /* ── Cache ── */
  var _cache=new Map();

  function getCachedMA(cs,p,type){
    var sym=(window.S&&S.sym)||'',tf=(window.S&&S.tf)||'';
    var n=cs.length,last=cs[n-1]?cs[n-1].c:0;
    var key=sym+'|'+tf+'|'+p+'|'+type+'|'+n+'|'+last.toFixed(2);
    if(_cache.has(key))return _cache.get(key);
    var vals=calcMA(cs,p,type);
    _cache.set(key,vals);
    if(_cache.size>80){_cache.delete(_cache.keys().next().value);}
    return vals;
  }

  /* ── Read config from DOM ── */
  function E(id){return document.getElementById(id);}

  function getMAConfig(){
    var cfg=[];
    for(var i=1;i<=10;i++){
      var def=MA_DEFAULTS[i-1];
      cfg.push({
        enabled:E('ma'+i+'On')?E('ma'+i+'On').checked:def.enabled,
        period:Math.max(1,parseInt((E('ma'+i+'Period')||{}).value||def.period)||def.period),
        type:(E('ma'+i+'Type')||{}).value||def.type,
        color:(E('ma'+i+'Color')||{}).value||def.color,
        width:parseFloat((E('ma'+i+'Width')||{}).value||def.width)||def.width,
        style:(E('ma'+i+'Style')||{}).value||def.style,
      });
    }
    return cfg;
  }

  /* ── Persist settings to localStorage ── */
  function saveMASettings(){
    try{
      var cfg=getMAConfig();
      var sl=E('maShowLabels');
      var data={cfg:cfg,showLabels:sl?sl.checked:false};
      localStorage.setItem('dvl_maSettings',JSON.stringify(data));
    }catch(_){}
  }

  /* ── Restore settings from localStorage ── */
  function loadMASettings(){
    try{
      var raw=localStorage.getItem('dvl_maSettings');
      if(!raw)return;
      var data=JSON.parse(raw);
      if(!data||!data.cfg)return;
      for(var i=0;i<Math.min(data.cfg.length,10);i++){
        var m=data.cfg[i],n=i+1;
        var on=E('ma'+n+'On');
        var per=E('ma'+n+'Period');
        var typ=E('ma'+n+'Type');
        var col=E('ma'+n+'Color');
        var sw=E('ma'+n+'ColorSwatch');
        var wid=E('ma'+n+'Width');
        var sty=E('ma'+n+'Style');
        if(on&&m.enabled!=null)on.checked=m.enabled;
        if(per&&m.period)per.value=m.period;
        if(typ&&m.type)typ.value=m.type;
        if(col&&m.color){col.value=m.color;if(sw)sw.style.background=m.color;}
        if(wid&&m.width)wid.value=m.width;
        if(sty&&m.style)sty.value=m.style;
      }
      var sl=E('maShowLabels');
      if(sl&&data.showLabels!=null)sl.checked=data.showLabels;
    }catch(_){}
  }

  /* ── Draw ── */
  function drawMovingAverages(ctx,W,H,V,sc,x){
    if(!window.S||!S.inds.movingAverages||!S.candles.length)return;
    var cs=S.candles;
    var cfg=getMAConfig();
    var showLabels=E('maShowLabels')?E('maShowLabels').checked:false;
    var xR=W-(typeof RP==='function'?RP():0);
    var PL_=typeof PL!=='undefined'?PL:0;
    var PT_=typeof PT!=='undefined'?PT:0;
    var PB_=typeof PB!=='undefined'?PB:0;

    ctx.save();

    for(var mi=0;mi<10;mi++){
      var m=cfg[mi];
      if(!m.enabled||m.period<1)continue;

      var vals=getCachedMA(cs,m.period,m.type);
      if(!vals||!vals.length)continue;

      /* set line style */
      ctx.strokeStyle=m.color;
      ctx.lineWidth=m.width;
      if(m.style==='dashed')ctx.setLineDash([6,4]);
      else if(m.style==='dotted')ctx.setLineDash([2,3]);
      else ctx.setLineDash([]);
      ctx.lineJoin='round';

      /* draw line — iterate only visible candles */
      var vStart=Math.max(0,Math.floor(S.view.start)-1);
      var vEnd=Math.min(cs.length-1,Math.ceil(S.view.end)+1);
      ctx.beginPath();
      var penDown=false;
      for(var j=vStart;j<=vEnd;j++){
        var v=vals[j];
        if(v==null){penDown=false;continue;}
        var px=x(j),py=sc.y(v);
        if(py<PT_-4||py>H-PB_+4){penDown=false;continue;}
        if(!penDown){ctx.moveTo(px,py);penDown=true;}
        else ctx.lineTo(px,py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* optional label at right edge */
      if(showLabels){
        /* find last non-null value in visible range */
        var lastIdx=-1,lastVal=null;
        for(var j=vEnd;j>=vStart;j--){
          if(vals[j]!=null){lastIdx=j;lastVal=vals[j];break;}
        }
        if(lastIdx>=0&&lastVal!=null){
          var lpx=Math.min(x(lastIdx),xR-4);
          var lpy=sc.y(lastVal);
          if(lpy>PT_&&lpy<H-PB_){
            ctx.font='bold 9px monospace';
            ctx.textBaseline='middle';
            var lbl=m.type+(m.period);
            var tw=ctx.measureText(lbl).width;
            ctx.fillStyle='rgba(0,0,0,.55)';
            ctx.fillRect(xR-tw-8,lpy-7,tw+6,14);
            ctx.fillStyle=m.color;
            ctx.fillText(lbl,xR-tw-5,lpy);
          }
        }
      }
    }

    ctx.restore();
  }

  /* ── Expose globally ── */
  window.__drawMovingAverages=drawMovingAverages;

  /* ── Event listeners ── */
  var MA_IDS=new Set();
  for(var _i=1;_i<=10;_i++){
    ['On','Period','Type','Color','Width','Style'].forEach(function(f){
      MA_IDS.add('ma'+this+f);
    },_i);
  }
  MA_IDS.add('maShowLabels');

  document.addEventListener('input',function(ev){
    var id=ev.target&&ev.target.id;
    if(!MA_IDS.has(id))return;
    /* update color swatch */
    if(id&&id.endsWith('Color')){
      var sw=document.getElementById(id+'Swatch')||document.getElementById(id.replace('Color','ColorSwatch'));
      if(sw)sw.style.background=ev.target.value;
    }
    saveMASettings();
    if(typeof drawSoon==='function')drawSoon();
    else if(typeof draw==='function')draw();
  });

  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!MA_IDS.has(id))return;
    saveMASettings();
    if(typeof drawSoon==='function')drawSoon();
    else if(typeof draw==='function')draw();
  });

  /* ── Init: restore from localStorage on first load ── */
  document.addEventListener('DOMContentLoaded',function(){
    loadMASettings();
  });
  /* fallback se DOMContentLoaded já disparou */
  setTimeout(function(){loadMASettings();},50);

})();
</script>
"""

# Inserir antes de </body>
assert '</body>' in html, '</body> not found'
html = html.replace('</body>', MA_SCRIPT + '</body>', 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_169.py applied — Beta 0.169')
print('  DVL Moving Averages:')
print('  1. 10 slots independentes (MA 1–10)')
print('  2. Tipos: SMA, EMA, WMA, VWMA, RMA, HMA, DEMA, TEMA, LSMA, KAMA')
print('  3. Default: MA1 = SMA 20 ativa, MA 2–10 desligadas')
print('  4. Cada slot: toggle, período, tipo, cor, espessura, estilo')
print('  5. Labels opcionais (default OFF)')
print('  6. Cache por sym|tf|period|type|length|lastClose')
print('  7. Persistência em localStorage (dvl_maSettings)')
print('  8. safeLayer após Volume Overlay, antes de drawCustom')
print('  9. Nova categoria "Tendência & Médias" no painel')
