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