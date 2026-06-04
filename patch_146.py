#!/usr/bin/env python3
"""patch_146.py — Beta 0.146: DvlOscPanelTemplate, localFlow bias (no flat history), normDelta"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.145') >= 10, 'Beta 0.145 not found'
html = html.replace('Beta 0.145', 'Beta 0.146')

# ── Replace entire DVL_PRESSURE_TRAIL script block ─────────────────────────────
START_TAG = '<script id="DVL_PRESSURE_TRAIL">'
END_TAG   = '</script>'

start_idx = html.index(START_TAG)
end_idx   = html.index(END_TAG, start_idx + len(START_TAG)) + len(END_TAG)

OLD_BLOCK = html[start_idx:end_idx]
assert '(function DVL_PRESSURE_TRAIL()' in OLD_BLOCK, 'DVL_PRESSURE_TRAIL block not found'

NEW_BLOCK = r"""<script id="DVL_PRESSURE_TRAIL">
(function DVL_PRESSURE_TRAIL(){
  'use strict';

  /* helpers */
  function el(id){return document.getElementById(id);}
  function nv(id,def){var v=parseFloat((el(id)||{}).value);return isFinite(v)?v:def;}
  function bv(id,def){var e=el(id);return e?e.checked:def;}
  function clp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}

  /* config */
  function _cfg(){
    return {
      showLine:   bv('ptShowLine',true),
      showCloud:  bv('ptShowCloud',true),
      showEvents: bv('ptShowEvents',true),
      showState:  bv('ptShowState',true),
      showPanel:  bv('ptShowPanel',true),
      cloudOp:    clp(nv('ptCloudOp',0.20),0.02,0.6),
      lineW:      clp(nv('ptLineW',2),0.5,5),
      glow:       clp(nv('ptGlow',6),0,20),
      volMA:      clp(nv('ptVolMA',20)|0,3,100),
      smooth:     clp(nv('ptSmooth',5)|0,1,20),
      absVol:     clp(nv('ptAbsVol',2.0),1.0,5),
      absRange:   clp(nv('ptAbsRange',0.4),0.05,0.9),
      histOp:     clp(nv('ptHistOp',0.9),0.05,1.5)
    };
  }

  /* cache */
  var _cache=null,_cKey='';

  function _ck(cs,cfg){
    var n=cs.length,last=cs[n-1]||{};
    return [n,(last.t||0),(last.v||0),cfg.volMA,cfg.smooth,cfg.absVol,cfg.absRange].join('|');
  }

  /* compute */
  function _compute(cs,cfg){
    var n=cs.length;
    if(n<4)return null;
    var MA_P=cfg.volMA,ATR_P=14;

    /* volume MA */
    var volMA=new Float64Array(n),vs=0;
    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}

    /* ATR */
    var atr=new Float64Array(n),atrS=0;
    for(var i=0;i<n;i++){
      var c=cs[i],pc=i>0?cs[i-1].c:c.o;
      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));
      atrS+=tr;
      if(i>=ATR_P){var oc=cs[i-ATR_P],op2=i>ATR_P?cs[i-ATR_P-1].c:oc.o;atrS-=Math.max(oc.h-oc.l,Math.abs(oc.h-op2),Math.abs(oc.l-op2));}
      atr[i]=atrS/Math.min(i+1,ATR_P);
    }

    /* per-candle delta (footprint or synthetic) */
    var delta=new Float64Array(n);
    for(var i=0;i<n;i++){
      var c=cs[i];
      if(c.buy!=null&&c.sell!=null){delta[i]=(c.buy||0)-(c.sell||0);}
      else{var range=Math.max(c.h-c.l,1e-12);delta[i]=((c.c-c.l)/range*2-1)*c.v;}
    }

    /* normDelta = delta/(volMA*atr) — scale-invariant across all history */
    var normDelta=new Float64Array(n);
    for(var i=0;i<n;i++){normDelta[i]=delta[i]/((volMA[i]||1)*(atr[i]||1)+1e-10);}

    /* localFlow: rolling window sum of normDelta over smooth candles */
    /* No exponential decay — historical candles reflect LOCAL activity, not decayed cumulative state */
    var sm=cfg.smooth;
    var localFlow=new Float64Array(n);
    for(var i=0;i<n;i++){
      var s=0;
      for(var j=Math.max(0,i-sm+1);j<=i;j++)s+=normDelta[j];
      localFlow[i]=s;
    }

    /* bias: tanh of localFlow — always meaningful for historical candles */
    var bias=new Float32Array(n);
    for(var i=0;i<n;i++)bias[i]=Math.tanh(localFlow[i]*3);

    /* aggression: (vol/volMA)*(body/range)*sign(delta) */
    var aggr=new Float64Array(n);
    for(var i=0;i<n;i++){
      var c=cs[i],vm=volMA[i]||1;
      var range=c.h-c.l,body=Math.abs(c.c-c.o);
      var vr=c.v/vm,br=range>1e-12?body/range:0;
      var d=delta[i];
      aggr[i]=vr*br*(d>0?1:d<0?-1:0);
    }

    /* pressure: vol intensity + delta magnitude */
    var pressure=new Float32Array(n);
    for(var i=0;i<n;i++){
      var vm=volMA[i]||1;
      var vr=Math.min(cs[i].v/vm,5)/5;
      var da=Math.min(Math.abs(delta[i])/((vm*0.5)||1),3)/3;
      pressure[i]=Math.min(1,(vr*0.55+da*0.45));
    }

    /* pulse: |bias| * pressure */
    var pulse=new Float32Array(n);
    for(var i=0;i<n;i++)pulse[i]=Math.abs(bias[i])*pressure[i];

    /* events */
    var events=[],prevBiasSign=0;
    var lastAbsIdx=-99,lastExhIdx=-99,lastFlipIdx=-99;
    for(var i=ATR_P;i<n;i++){
      var c=cs[i],at=atr[i]||1,vm=volMA[i]||1;
      var range=c.h-c.l;
      if(c.v>cfg.absVol*vm&&range<cfg.absRange*at&&i-lastAbsIdx>3){events.push({idx:i,type:'ABSORPTION'});lastAbsIdx=i;}
      if(i>=2){
        var p1=cs[i-1],p2=cs[i-2];
        var bigPrev=Math.max(p1.h-p1.l,p2.h-p2.l)>1.5*at;
        var weakNow=range<0.55*at&&c.v<0.75*vm;
        if(bigPrev&&weakNow&&i-lastExhIdx>4){events.push({idx:i,type:'EXHAUSTION'});lastExhIdx=i;}
      }
      var bs=bias[i]>0.20?1:bias[i]<-0.20?-1:0;
      if(bs!==0&&prevBiasSign!==0&&bs!==prevBiasSign&&i-lastFlipIdx>5){events.push({idx:i,type:'FLOW_FLIP'});lastFlipIdx=i;}
      if(bs!==0)prevBiasSign=bs;
    }

    /* market mode (rolling 20-candle window) */
    var MODE_WIN=20,marketMode=new Uint8Array(n);
    for(var i=MODE_WIN;i<n;i++){
      var posD=0,negD=0,bigVol=0,smallRange=0;
      for(var j=i-MODE_WIN+1;j<=i;j++){
        if(delta[j]>0)posD+=delta[j]; else negD-=delta[j];
        if(cs[j].v>volMA[j]*1.5)bigVol++;
        if((cs[j].h-cs[j].l)<atr[j]*0.5)smallRange++;
      }
      var domBull=posD>negD*1.4,domBear=negD>posD*1.4;
      var highAbsorp=bigVol>MODE_WIN*0.35&&smallRange>MODE_WIN*0.3;
      var priceUp=cs[i].c>cs[i-MODE_WIN].c,priceDn=cs[i].c<cs[i-MODE_WIN].c;
      if(highAbsorp)marketMode[i]=2;
      else if(domBull&&!priceUp)marketMode[i]=4;
      else if(domBear&&!priceDn)marketMode[i]=3;
      else if((domBull&&priceUp)||(domBear&&priceDn))marketMode[i]=1;
      else marketMode[i]=0;
    }

    return {bias,pressure,normDelta,delta,aggr,pulse,atr,volMA,events,marketMode,n};
  }

  /* bias color/sign */
  function _biasColor(b,p){
    if(b>0.15){var t=Math.min(1,p*1.5);return {r:0,g:Math.round(200+t*20),b:Math.round(230-t*80)};}
    else if(b<-0.15){var t=Math.min(1,p*1.5);return {r:Math.round(220+t*35),g:Math.round(100-t*80),b:Math.round(40-t*40)};}
    else{return {r:220,g:130,b:20};}
  }
  function _biasSign(b){return b>0.15?1:b<-0.15?-1:0;}

  /* ── DvlOscPanelTemplate ─────────────────────────────────────────────────────
     Standard oscillator panel: layout → base (eye/title/grid/scale) → gear → drawFn
     opts: {title, rightText, kind, scaleKey, eyeHiddenVar, eyeHitboxVar, gearHitboxVar}
     No fallback — requires _dvlOscLayout and _dvlDrawOscBase from the framework.       */
  function DvlOscPanelTemplate(ctx,W,H,panelH,baseOff,opts,drawFn){
    if(typeof _dvlOscLayout!=='function'||typeof _dvlDrawOscBase!=='function')return;
    var pBot=H-10-baseOff,pTop=pBot-panelH;
    var L=_dvlOscLayout(W,H,pTop,pBot);
    L.oscKind=opts.scaleKey||'pressureFlow';
    _dvlDrawOscBase(ctx,L,opts.title,opts.rightText,opts.kind,opts.eyeHiddenVar,opts.eyeHitboxVar);
    /* gear icon — positioned left of the scale area in the header row */
    var gx=L.scaleLeft-24,gy=L.pTop+L.hdrH/2;
    ctx.save();
    ctx.font='13px monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(100,130,170,0.70)';
    ctx.fillText('⚙',gx,gy);
    ctx.restore();
    if(opts.gearHitboxVar)window[opts.gearHitboxVar]={x1:gx-10,y1:L.pTop,x2:gx+10,y2:L.pTop+L.hdrH};
    if(L.plotRight>L.plotLeft&&L.plotBottom>L.plotTop)drawFn(ctx,L);
  }

  /* ── CLOUD (before candles) ────────────────────────────────────────────────── */
  function drawCloud(ctx,W,H,AllV,sc,x,bw){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();if(!cfg.showCloud)return;
    var cs=S.candles,n=cs.length;
    if(!_cache){var ck=_ck(cs,cfg);if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}}
    if(!_cache)return;
    var res=_cache;
    ctx.save();
    for(var i=AllV.a;i<AllV.b;i++){
      if(i<0||i>=n)continue;
      var b=res.bias[i],p=res.pressure[i],at=res.atr[i]||1;
      var cloudH=at*(0.25+p*0.85);
      var yTop=sc.y(cs[i].c+cloudH/2),yBot=sc.y(cs[i].c-cloudH/2);
      var h=Math.max(1,yBot-yTop);
      var col=_biasColor(b,p);
      var op=cfg.cloudOp*(0.3+p*0.7);
      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+op.toFixed(3)+')';
      var cx=x(i),hw=Math.max(bw*0.45,2);
      ctx.fillRect(cx-hw,yTop,hw*2,h);
    }
    ctx.restore();
  }

  /* ── TRAIL + EVENTS (after candles) ───────────────────────────────────────── */
  function drawTrail(ctx,W,H,AllV,sc,x,bw){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();
    var cs=S.candles,n=cs.length;
    var ck=_ck(cs,cfg);
    if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}
    if(!_cache)return;
    var res=_cache;

    if(cfg.showLine){
      ctx.save();
      var segStart=AllV.a;
      for(var i=AllV.a;i<=AllV.b;i++){
        var isLast=(i===AllV.b);
        var b0=res.bias[Math.min(i,n-1)],b1=i>0?res.bias[Math.min(i-1,n-1)]:b0;
        var colorChange=(i>AllV.a)&&((_biasSign(b0)!==_biasSign(b1))||isLast);
        if(colorChange||isLast){
          var segEnd=isLast?i:(i-1);
          if(segEnd>=segStart&&segEnd<n){
            var midB=res.bias[Math.round((segStart+segEnd)/2)];
            var midP=res.pressure[Math.round((segStart+segEnd)/2)];
            var col=_biasColor(midB,midP);
            var lw=cfg.lineW*(0.8+midP*1.2);
            ctx.beginPath();
            for(var j=segStart;j<=segEnd;j++){
              if(j<0||j>=n)continue;
              var xx=x(j),yy=sc.y(cs[j].c);
              if(j===segStart)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
            }
            ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+',0.88)';
            ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
            if(cfg.glow>0){ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.6)';ctx.shadowBlur=cfg.glow;}
            ctx.stroke();ctx.shadowBlur=0;
          }
          segStart=i;
        }
      }
      ctx.restore();
    }

    if(cfg.showEvents){
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
      var evSet=new Set();
      for(var ei=0;ei<res.events.length;ei++){
        var ev=res.events[ei],i=ev.idx;
        if(i<AllV.a-1||i>AllV.b+1)continue;
        if(evSet.has(i+'_'+ev.type))continue;
        evSet.add(i+'_'+ev.type);
        var c=cs[i],xx=x(i),isUp=c.c>=c.o;
        var yBase=isUp?sc.y(c.h)-18:sc.y(c.l)+18;
        var label,r,g,bl;
        if(ev.type==='ABSORPTION'){
          label='ABSORPTION';r=90;g=60;bl=200;
          ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.85)';ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';ctx.fillText('HIGH VOL · PRICE STALLS',xx,yBase+(isUp?-10:10));
        } else if(ev.type==='EXHAUSTION'){
          label='EXHAUSTION';r=220;g=130;bl=20;
          ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.85)';ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';ctx.fillText('WEAK FOLLOW-THROUGH',xx,yBase+(isUp?-10:10));
        } else if(ev.type==='FLOW_FLIP'){
          var b=res.bias[i];
          if(b>0){r=0;g=200;bl=220;}else{r=220;g=60;bl=50;}
          label='FLOW FLIP';
          ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.90)';ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';ctx.fillText(b>0?'BUYERS IN CONTROL':'SELLERS TAKE OVER',xx,yBase+(isUp?-10:10));
          ctx.beginPath();
          var ty=isUp?sc.y(c.h)-4:sc.y(c.l)+4,td=isUp?-1:1;
          ctx.moveTo(xx-4,ty);ctx.lineTo(xx+4,ty);ctx.lineTo(xx,ty+td*6);ctx.closePath();
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.70)';ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  /* ── STATE PANEL (top-right of chart) ─────────────────────────────────────── */
  function drawStatePanel(ctx,W,H){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();if(!cfg.showState)return;
    if(!_cache)return;
    var res=_cache,n=res.n,last=n-1;
    if(last<0)return;
    var bias=res.bias[last],pres=res.pressure[last],mode=res.marketMode[last];

    var flowState,fsR,fsG,fsB;
    if(bias>0.30){flowState='BULLISH';fsR=0;fsG=200;fsB=220;}
    else if(bias<-0.30){flowState='BEARISH';fsR=220;fsG=60;fsB=50;}
    else{flowState='NEUTRAL';fsR=200;fsG=130;fsB=20;}

    var presLabel;
    if(pres<0.25)presLabel='WEAK';else if(pres<0.50)presLabel='NORMAL';
    else if(pres<0.75)presLabel='STRONG';else presLabel='EXTREME';

    var modeLabels=['RANGING','TREND','ABSORPTION','DISTRIBUTION','ACCUMULATION'];
    var modeLabel=modeLabels[mode]||'RANGING';
    var rp=typeof RP==='function'?RP():68;
    var boxW=130,boxH=72,boxX=W-rp-boxW-6,boxY=12;
    ctx.save();
    ctx.globalAlpha=0.82;
    ctx.fillStyle='rgba(4,10,22,0.85)';
    _rrect(ctx,boxX,boxY,boxW,boxH,6);ctx.fill();
    ctx.strokeStyle='rgba(0,212,255,0.20)';ctx.lineWidth=1;
    _rrect(ctx,boxX,boxY,boxW,boxH,6);ctx.stroke();
    ctx.globalAlpha=1;
    var labelX=boxX+8,valX=boxX+boxW-8,rowH=18;
    ctx.font='bold 8px monospace';ctx.fillStyle='rgba(0,212,255,0.55)';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText('DVL PRESSURE',labelX,boxY+5);
    var y1=boxY+19;
    ctx.font='7px monospace';ctx.fillStyle='rgba(90,112,144,0.90)';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('FLOW STATE',labelX,y1);
    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+fsR+','+fsG+','+fsB+',0.95)';ctx.textAlign='right';
    ctx.fillText(flowState,valX,y1);
    var y2=y1+rowH;
    var presR,presG,presB;
    if(presLabel==='WEAK'){presR=90;presG=110;presB=140;}
    else if(presLabel==='NORMAL'){presR=0;presG=190;presB=200;}
    else if(presLabel==='STRONG'){presR=220;presG=180;presB=0;}
    else{presR=220;presG=60;presB=50;}
    ctx.font='7px monospace';ctx.fillStyle='rgba(90,112,144,0.90)';ctx.textAlign='left';
    ctx.fillText('PRESSURE',labelX,y2);
    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+presR+','+presG+','+presB+',0.95)';ctx.textAlign='right';
    ctx.fillText(presLabel,valX,y2);
    var y3=y2+rowH;
    var modeR,modeG,modeB;
    if(mode===1){modeR=0;modeG=200;modeB=220;}
    else if(mode===2){modeR=90;modeG=60;modeB=200;}
    else if(mode===3){modeR=220;modeG=60;modeB=50;}
    else if(mode===4){modeR=0;modeG=200;modeB=100;}
    else{modeR=140;modeG=160;modeB=190;}
    ctx.font='7px monospace';ctx.fillStyle='rgba(90,112,144,0.90)';ctx.textAlign='left';
    ctx.fillText('MARKET MODE',labelX,y3);
    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+modeR+','+modeG+','+modeB+',0.95)';ctx.textAlign='right';
    ctx.fillText(modeLabel,valX,y3);
    ctx.restore();
  }

  function _rrect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  }

  /* ── DVL FLOW STACK PANEL ──────────────────────────────────────────────────── */
  function drawFlowStack(ctx,W,H,V,sc,x,ptH,baseOff){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();
    if(!ptH||ptH<=0||!cfg.showPanel)return;
    var cs=S.candles;if(!cs||cs.length<2)return;

    var ck=_ck(cs,cfg);
    if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}
    if(!_cache)return;
    var res=_cache,n=res.n;

    if(!S.oscScale)S.oscScale={};
    if(!S.oscScale.pressureFlow){
      try{var _sv=JSON.parse(localStorage.getItem('dvl_osc_scale_pressureFlow')||'null');
        S.oscScale.pressureFlow=(_sv&&typeof _sv.range==='number')?_sv:{center:0,range:200};
      }catch(_){S.oscScale.pressureFlow={center:0,range:200};}
    }

    var lastI=Math.max(0,Math.min(V.b,n-1));
    var lastBias=res.bias[lastI]||0,lastPres=res.pressure[lastI]||0;
    var hdrKind=lastBias>0.15?'bull':lastBias<-0.15?'bear':'neutral';
    var presLbl=lastPres>=0.75?'EXTREME':lastPres>=0.50?'STRONG':lastPres>=0.25?'NORMAL':'WEAK';

    DvlOscPanelTemplate(ctx,W,H,ptH,baseOff,{
      title:'DVL FLOW STACK',rightText:presLbl,kind:hdrKind,scaleKey:'pressureFlow',
      eyeHiddenVar:'_dvlPTTitleHidden',eyeHitboxVar:'_dvlPTEyeHit',gearHitboxVar:'_dvlPTGearHit'
    },function(ctx,L){
      var os=S.oscScale.pressureFlow;
      var zoomF=Math.min(8,200/Math.max(1,os.range||200));
      var centerOff=os.center||0;
      var innerH=L.plotBottom-L.plotTop;
      var gap=2,nSubs=3,subH=Math.floor((innerH-gap*(nSubs-1))/nSubs);
      if(subH<4)return;

      var bw=Math.max(1.2,CW(W)/Math.max(1,V.span)*0.66);
      var barW=Math.max(1,bw*0.60);
      var histOp=cfg.histOp;

      /* visible-window 92nd-percentile normalization — prevents spike domination */
      var dVals=[],aVals=[],pVals=[];
      for(var i=V.a;i<V.b;i++){
        if(i<0||i>=n)continue;
        dVals.push(Math.abs(res.normDelta[i]||0));
        aVals.push(Math.abs(res.aggr[i]||0));
        pVals.push(Math.abs(res.pulse[i]||0));
      }
      function pct92(arr){
        if(!arr.length)return 1e-10;
        arr.sort(function(a,b){return a-b;});
        return arr[Math.min(Math.floor(arr.length*0.92),arr.length-1)]||1e-10;
      }
      var dMax=pct92(dVals),aMax=pct92(aVals),pMax=pct92(pVals);

      var subs=[
        {getVal:function(i){return res.normDelta[i]||0;},max:dMax,label:'DELTA',uni:false,
         posR:0,posG:195,posB:200,negR:220,negG:60,negB:50},
        {getVal:function(i){return res.aggr[i]||0;},max:aMax,label:'AGGRESSION',uni:false,
         posR:0,posG:155,posB:240,negR:220,negG:110,negB:30},
        {getVal:function(i){return res.pulse[i]||0;},max:pMax,label:'PULSE',uni:true,
         posR:130,posG:70,posB:230,negR:130,negG:70,negB:230}
      ];

      ctx.save();
      ctx.beginPath();
      ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);
      ctx.clip();

      for(var si=0;si<subs.length;si++){
        var sp=subs[si];
        var yTop=L.plotTop+si*(subH+gap),yBot=yTop+subH,yMid=(yTop+yBot)/2;
        if(si>0){ctx.fillStyle='rgba(23,32,45,0.60)';ctx.fillRect(L.plotLeft,yTop-gap,L.plotRight-L.plotLeft,gap);}
        ctx.font='bold 6px monospace';ctx.fillStyle='rgba(90,112,144,0.72)';
        ctx.textAlign='left';ctx.textBaseline='top';
        ctx.fillText(sp.label,L.plotLeft+3,yTop+2);
        if(!sp.uni){
          ctx.strokeStyle='rgba(40,60,90,0.50)';ctx.lineWidth=0.8;ctx.setLineDash([2,3]);
          ctx.beginPath();ctx.moveTo(L.plotLeft,yMid);ctx.lineTo(L.plotRight,yMid);ctx.stroke();
          ctx.setLineDash([]);
        }
        for(var i=V.a;i<V.b;i++){
          if(i<0||i>=n)continue;
          var v=sp.getVal(i);
          var norm=sp.max>0?v/sp.max:0;
          norm=(norm-centerOff/100)*zoomF;
          norm=Math.max(-1,Math.min(1,norm));
          var r2,g2,b2;
          if(v>=0){r2=sp.posR;g2=sp.posG;b2=sp.posB;}else{r2=sp.negR;g2=sp.negG;b2=sp.negB;}
          ctx.fillStyle='rgba('+r2+','+g2+','+b2+','+(histOp*0.55).toFixed(3)+')';
          var xx=x(i);
          if(sp.uni){
            var bh=Math.max(1,Math.abs(norm)*(subH-2)*0.9);
            ctx.fillRect(xx-barW/2,yBot-bh,barW,bh);
          } else {
            var bh=Math.max(1,Math.abs(norm)*(subH-2)*0.44);
            var y0=yMid,yv=yMid-norm*(subH-2)*0.44;
            ctx.fillRect(xx-barW/2,Math.min(y0,yv),barW,bh);
          }
        }
      }
      ctx.restore();

      /* right-scale: current value for each sub-panel */
      ctx.save();
      for(var si=0;si<subs.length;si++){
        var sp=subs[si];
        var yBot=L.plotTop+(si+1)*(subH+gap)-gap;
        var lastV=sp.getVal(lastI),isPos=lastV>=0;
        var r2,g2,b2;
        if(sp.uni||isPos){r2=sp.posR;g2=sp.posG;b2=sp.posB;}else{r2=sp.negR;g2=sp.negG;b2=sp.negB;}
        var vStr=sp.uni?(lastV*100).toFixed(0)+'%':(isPos?'+':'')+lastV.toFixed(3);
        ctx.font='700 '+(Math.round(7*(_csf||1)))+'px monospace';
        ctx.textAlign='left';ctx.textBaseline='bottom';
        ctx.fillStyle='rgba('+r2+','+g2+','+b2+',0.82)';
        ctx.fillText(vStr,L.scaleLeft+4,yBot);
      }
      ctx.restore();
    });
  }

  var _cfgCache=null,_cfgTick=0;
  function _getCfg(){
    var t=Date.now();
    if(!_cfgCache||t-_cfgTick>200){_cfgCache=_cfg();_cfgTick=t;}
    return _cfgCache;
  }

  /* ── Exports ── */
  window.__drawPressureCloud=drawCloud;
  window.__drawPressureTrail=drawTrail;
  window.__drawPressureState=drawStatePanel;
  window.__drawPressurePanel=drawFlowStack;
  window.__ptInvalidate=function(){_cache=null;_cKey='';_cfgCache=null;};

  /* ── Event wiring ── */
  var PT_IDS=new Set([
    'ptShowLine','ptShowCloud','ptShowEvents','ptShowState','ptShowPanel',
    'ptCloudOp','ptLineW','ptGlow','ptVolMA','ptSmooth','ptDecay',
    'ptAbsVol','ptAbsRange','ptHistOp'
  ]);
  function _ptRd(){_cache=null;_cKey='';_cfgCache=null;if(typeof drawSoon==='function')drawSoon();}
  document.addEventListener('input',function(ev){if(PT_IDS.has(ev.target&&ev.target.id))_ptRd();});
  document.addEventListener('change',function(ev){if(PT_IDS.has(ev.target&&ev.target.id))_ptRd();});
  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);
})();
</script>"""

html = html[:start_idx] + NEW_BLOCK + html[end_idx:]

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_146.py applied — Beta 0.146')
print('  + DvlOscPanelTemplate: gear+eye from template, no fallback layout')
print('  + localFlow (rolling window) replaces cumFlow with decay — historical data no longer flat')
print('  + normDelta = delta/(volMA*atr) — DELTA sub-panel scale-invariant across all history')
print('  + Dead _p95 function removed, dead cumFlow removed')
print('  + All overlays (cloud, trail, state panel, events) unchanged')
