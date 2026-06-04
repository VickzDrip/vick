#!/usr/bin/env python3
"""patch_144.py — Beta 0.144: DVL Flow Stack conforms to oscillator template standard"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.143') >= 10
html = html.replace('Beta 0.143', 'Beta 0.144')

# ── 1. S.oscScale: add pressureFlow ──────────────────────────────────────────
OLD_OSC = "oscScale:{flow:{center:0,range:200},trendClarity:{center:0,range:200}},"
assert OLD_OSC in html, 'S.oscScale not found'
html = html.replace(OLD_OSC,
    "oscScale:{flow:{center:0,range:200},trendClarity:{center:0,range:200},pressureFlow:{center:0,range:200}},",
    1)

# ── 2. _dvlOscScale: add pressureFlow case ───────────────────────────────────
OLD_DVLOSC = "const kind=L&&L.oscKind==='flow'?'flow':'trendClarity';"
assert OLD_DVLOSC in html, '_dvlOscScale kind not found'
html = html.replace(OLD_DVLOSC,
    "const kind=L&&L.oscKind==='flow'?'flow':L&&L.oscKind==='pressureFlow'?'pressureFlow':'trendClarity';",
    1)

# ── 3. oscPanelHeights: add ptH ───────────────────────────────────────────────
OLD_OPH = ("function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;"
           "const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;return{clarH,flowH};}")
assert OLD_OPH in html, 'oscPanelHeights not found'
html = html.replace(OLD_OPH,
    "function oscPanelHeights(){const clarH=(window.S&&S.inds&&S.inds.hvnClarity&&S.candles&&S.candles.length)?_hvnClarityH:0;"
    "const flowH=(window.S&&S.inds&&S.inds.flowAccel&&S.candles&&S.candles.length)?_flowAccelH:0;"
    "const ptH=(window.S&&S.inds&&S.inds.pressureTrail&&S.candles&&S.candles.length)?_ptFlowH:0;"
    "return{clarH,flowH,ptH};}",
    1)

# ── 4. oscScaleHit: add pressureFlow detection ───────────────────────────────
OLD_OSH = ("function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;"
           "const{clarH,flowH}=oscPanelHeights();"
           "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
           "if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}"
           "return null;}")
assert OLD_OSH in html, 'oscScaleHit not found'
html = html.replace(OLD_OSH,
    "function oscScaleHit(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;"
    "const{clarH,flowH,ptH}=oscPanelHeights();"
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    "if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}"
    "if(ptH>0){const ptOff=(flowH?flowH+PANEL_GAP:0)+(clarH?clarH+PANEL_GAP:0);const pb=H-10-ptOff,pt=pb-ptH;if(y>=pt&&y<=pb)return 'pressureFlow';}"
    "return null;}",
    1)

# ── 5. oscPanelAtY: add pressureFlow detection ───────────────────────────────
OLD_OPY = ("function oscPanelAtY(y,H){const{clarH,flowH}=oscPanelHeights();"
           "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
           "if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}"
           "return null;}")
assert OLD_OPY in html, 'oscPanelAtY not found'
html = html.replace(OLD_OPY,
    "function oscPanelAtY(y,H){const{clarH,flowH,ptH}=oscPanelHeights();"
    "if(clarH>0){const ct=H-10-clarH,cb=H-10;if(y>=ct&&y<=cb)return 'trendClarity';}"
    "if(flowH>0){const clarOff=clarH>0?clarH+PANEL_GAP:0;const fb=H-10-clarOff,ft=fb-flowH;if(y>=ft&&y<=fb)return 'flow';}"
    "if(ptH>0){const ptOff=(flowH?flowH+PANEL_GAP:0)+(clarH?clarH+PANEL_GAP:0);const pb=H-10-ptOff,pt=pb-ptH;if(y>=pt&&y<=pb)return 'pressureFlow';}"
    "return null;}",
    1)

# ── 6. mousemove: add pressureFlow panel height ───────────────────────────────
OLD_MM_PH = ("const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);")
assert OLD_MM_PH in html, 'mousemove ph not found'
html = html.replace(OLD_MM_PH,
    "const ph=S.oscDrag.kind==='flow'?(_flowAccelH||120):S.oscDrag.kind==='pressureFlow'?(_ptFlowH||110):(_hvnClarityH||166);",
    1)

# ── 7. touchmove vertical pan: add pressureFlow panel height ──────────────────
OLD_TM_PH = ("const ph=touchState.oscKind==='flow'?(_flowAccelH||120):(_hvnClarityH||166);")
assert OLD_TM_PH in html, 'touchmove ph not found'
html = html.replace(OLD_TM_PH,
    "const ph=touchState.oscKind==='flow'?(_flowAccelH||120):touchState.oscKind==='pressureFlow'?(_ptFlowH||110):(_hvnClarityH||166);",
    1)

# ── 8. HTML: add ptFlowResizeHandle element ───────────────────────────────────
OLD_RH_HTML = ('        <!-- ── Wick Pressure panel resize handle ── -->')
assert OLD_RH_HTML in html, 'resize handle HTML anchor not found'
html = html.replace(OLD_RH_HTML,
    '        <!-- ── DVL Flow Stack panel resize handle ── -->\n'
    '        <div id="ptFlowResizeHandle" style="display:none" title="Drag to resize DVL Flow Stack panel"></div>\n'
    '        <!-- ── Wick Pressure panel resize handle ── -->',
    1)

# ── 9. CSS: add ptFlowResizeHandle styles ────────────────────────────────────
OLD_RH_CSS = ("#flowResizeHandle:hover::after,#flowResizeHandle.active::after{background:rgba(0,212,255,0.55);}")
assert OLD_RH_CSS in html, 'flowResizeHandle CSS end not found'
html = html.replace(OLD_RH_CSS,
    "#flowResizeHandle:hover::after,#flowResizeHandle.active::after{background:rgba(0,212,255,0.55);}"
    "#ptFlowResizeHandle{position:absolute;left:0;right:0;height:8px;cursor:ns-resize;z-index:15;background:transparent;touch-action:none;user-select:none;}"
    "#ptFlowResizeHandle::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:40px;height:2px;background:rgba(0,212,255,0.20);border-radius:1px;transition:background .15s;}"
    "#ptFlowResizeHandle:hover::after,#ptFlowResizeHandle.active::after{background:rgba(0,212,255,0.55);}",
    1)

# ── 10. draw(): show/hide ptFlowResizeHandle ──────────────────────────────────
OLD_RH_DRAW = ("const _frh=el('flowResizeHandle');if(_frh){_frh.style.display=_fah>0?'block':'none';"
               "_frh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+_fah-PANEL_GAP/2)+'px';}")
assert OLD_RH_DRAW in html, 'draw flowResizeHandle not found'
html = html.replace(OLD_RH_DRAW,
    "const _frh=el('flowResizeHandle');if(_frh){_frh.style.display=_fah>0?'block':'none';"
    "_frh.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+_fah-PANEL_GAP/2)+'px';}"
    "const _frh2=el('ptFlowResizeHandle');if(_frh2){_frh2.style.display=_ptH>0?'block':'none';"
    "_frh2.style.bottom=(10+(_clarH?_clarH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+_ptH-PANEL_GAP/2)+'px';}",
    1)

# ── 11. Resize handle IIFE: add ptFlowResizeHandle ────────────────────────────
OLD_FRH_IIFE = ("frh.addEventListener('pointercancel',()=>{_frhDrag=null;frh.classList.remove('active');});})();")
assert OLD_FRH_IIFE in html, 'flowResizeHandle IIFE end not found'
html = html.replace(OLD_FRH_IIFE,
    "frh.addEventListener('pointercancel',()=>{_frhDrag=null;frh.classList.remove('active');});})();"
    "(()=>{let _ptrhDrag=null;const ptrh=el('ptFlowResizeHandle');if(!ptrh)return;"
    "ptrh.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();ptrh.setPointerCapture(e.pointerId);_ptrhDrag={y:e.clientY,h:_ptFlowH};ptrh.classList.add('active');});"
    "ptrh.addEventListener('pointermove',e=>{if(!_ptrhDrag)return;_ptFlowH=clamp(_ptrhDrag.h-(e.clientY-_ptrhDrag.y),70,240);drawSoon();});"
    "ptrh.addEventListener('pointerup',()=>{if(!_ptrhDrag)return;_ptrhDrag=null;ptrh.classList.remove('active');try{localStorage.setItem('dvl_ptFlowH',Math.round(_ptFlowH));}catch(_){}});"
    "ptrh.addEventListener('pointercancel',()=>{_ptrhDrag=null;ptrh.classList.remove('active');});})();",
    1)

# ── 12. mousedown: add eye hitbox for DVL Flow Stack ─────────────────────────
OLD_EYE_CLR = ("if(window._dvlClarEyeHit){const _b=window._dvlClarEyeHit;"
               "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
               "window._dvlClarTitleHidden=!window._dvlClarTitleHidden;"
               "try{localStorage.setItem('dvl_clarTitleHidden',window._dvlClarTitleHidden?'1':'');}catch(_){}"
               "draw();return;}}")
assert OLD_EYE_CLR in html, 'eye hitbox clr not found'
html = html.replace(OLD_EYE_CLR,
    "if(window._dvlClarEyeHit){const _b=window._dvlClarEyeHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "window._dvlClarTitleHidden=!window._dvlClarTitleHidden;"
    "try{localStorage.setItem('dvl_clarTitleHidden',window._dvlClarTitleHidden?'1':'');}catch(_){}"
    "draw();return;}}"
    "if(window._dvlPTEyeHit){const _b=window._dvlPTEyeHit;"
    "if(x>=_b.x1&&x<=_b.x2&&y>=_b.y1&&y<=_b.y2){"
    "window._dvlPTTitleHidden=!window._dvlPTTitleHidden;"
    "try{localStorage.setItem('dvl_ptTitleHidden',window._dvlPTTitleHidden?'1':'');}catch(_){}"
    "draw();return;}}",
    1)

# ── 13. Rewrite drawFlowStack in DVL_PRESSURE_TRAIL script ──────────────────
OLD_FLOW_STACK = r"""  /* ── DVL FLOW STACK PANEL (lower) ── */
  function drawFlowStack(ctx,W,H,V,sc,x,ptH,baseOff){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();
    if(!ptH||ptH<=0||!cfg.showPanel)return;
    var cs=S.candles;if(!cs||cs.length<2)return;
    if(!_cache){var ck=_ck(cs,cfg);if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}}
    if(!_cache)return;
    var res=_cache;
    var n=res.n;

    /* panel bounds */
    var pBot=H-10-baseOff,pTop=pBot-ptH;
    var rp=typeof RP==='function'?RP():68;
    var hdrH=18,footH=0;
    var plotLeft=6,plotRight=W-rp-4;
    var innerH=pBot-pTop-hdrH-footH;
    if(plotRight<=plotLeft||innerH<20)return;

    /* 3 sub-panels: DELTA, AGGRESSION, PULSE */
    var gap=3,nPanels=3,subH=Math.floor((innerH-gap*(nPanels-1))/nPanels);
    if(subH<6)return;

    /* background */
    ctx.save();
    ctx.fillStyle='rgba(3,8,18,0.55)';
    ctx.fillRect(0,pTop,W,ptH);
    /* top border line */
    ctx.strokeStyle='rgba(0,212,255,0.18)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,pTop);ctx.lineTo(W,pTop);ctx.stroke();

    /* header */
    ctx.font='bold 8px monospace';ctx.fillStyle='rgba(0,212,255,0.60)';
    ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText('DVL FLOW STACK',plotLeft+2,pTop+4);

    var bw=Math.max(1.2,CW(W)/Math.max(1,V.span)*0.66);
    var barW=Math.max(1,bw*0.55);

    /* for each sub-panel, find data range */
    var panels=[
      {key:'delta',arr:res.delta,label:'DELTA',posR:0,posG:200,posB:180,negR:220,negG:60,negB:50},
      {key:'aggr',arr:res.aggr,label:'AGGRESSION',posR:0,posG:180,posB:240,negR:220,negG:100,negB:30},
      {key:'pulse',arr:res.pulse,label:'PULSE',posR:120,posG:60,posB:220,negR:120,negG:60,negB:220,unipolar:true}
    ];

    for(var pi=0;pi<panels.length;pi++){
      var sp=panels[pi];
      var yTop=pTop+hdrH+pi*(subH+gap);
      var yBot=yTop+subH;
      var yMid=(yTop+yBot)/2;
      var arr=sp.arr;

      /* find range */
      var mx=0;
      for(var i=V.a;i<V.b;i++){if(i<0||i>=n)continue;var v=Math.abs(arr[i]||0);if(v>mx)mx=v;}
      if(mx<1e-12)mx=1;

      /* sub-panel background */
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(plotLeft,yTop,plotRight-plotLeft,subH);

      /* zero line */
      if(!sp.unipolar){
        ctx.strokeStyle='rgba(40,60,90,0.55)';ctx.lineWidth=1;ctx.setLineDash([2,3]);
        ctx.beginPath();ctx.moveTo(plotLeft,yMid);ctx.lineTo(plotRight,yMid);ctx.stroke();
        ctx.setLineDash([]);
      }

      /* sub-panel label */
      ctx.font='bold 6px monospace';ctx.fillStyle='rgba(90,112,144,0.70)';
      ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(sp.label,plotLeft+2,yTop+2);

      /* bars */
      for(var i=V.a;i<V.b;i++){
        if(i<0||i>=n)continue;
        var v=arr[i]||0;
        if(sp.unipolar){
          /* pulse: always positive, bar from bottom */
          var barH2=Math.max(1,(v/mx)*subH*0.85);
          ctx.fillStyle='rgba('+sp.posR+','+sp.posG+','+sp.posB+','+(cfg.histOp*0.55).toFixed(3)+')';
          ctx.fillRect(x(i)-barW/2,yBot-barH2,barW,barH2);
        } else {
          var norm=v/mx;
          var barH2=Math.max(1,Math.abs(norm)*subH*0.45);
          var y0=yMid,yv=yMid-norm*subH*0.45;
          var r2,g2,b2;
          if(v>=0){r2=sp.posR;g2=sp.posG;b2=sp.posB;}else{r2=sp.negR;g2=sp.negG;b2=sp.negB;}
          ctx.fillStyle='rgba('+r2+','+g2+','+b2+','+(cfg.histOp*0.55).toFixed(3)+')';
          ctx.fillRect(x(i)-barW/2,Math.min(y0,yv),barW,barH2);
        }
      }

      /* right-side current value label */
      var lastI=Math.min(V.b,n-1);
      if(lastI>=0){
        var lastV=arr[lastI]||0;
        var vStr=sp.unipolar?(lastV*100).toFixed(0)+'%':(lastV>=0?'+':'')+lastV.toFixed(2);
        var labelY=sp.unipolar?yBot-4:lastV>=0?yTop+6:yBot-4;
        ctx.font='bold 7px monospace';
        ctx.textAlign='right';ctx.textBaseline='bottom';
        var r2,g2,b2;
        if(sp.unipolar||lastV>=0){r2=sp.posR;g2=sp.posG;b2=sp.posB;}else{r2=sp.negR;g2=sp.negG;b2=sp.negB;}
        ctx.fillStyle='rgba('+r2+','+g2+','+b2+',0.80)';
        ctx.fillText(vStr,plotRight-2,yBot);
      }
    }
    ctx.restore();
  }"""

assert OLD_FLOW_STACK in html, 'old drawFlowStack not found'

NEW_FLOW_STACK = r"""  /* ── 95th-percentile autoscale from visible window ── */
  function _p95(arr,from,to,n){
    var v=[];
    for(var i=from;i<to;i++){if(i<0||i>=n)continue;v.push(Math.abs(arr[i]||0));}
    if(!v.length)return 1;
    v.sort(function(a,b){return a-b;});
    return v[Math.min(Math.floor(v.length*0.92),v.length-1)]||1e-10;
  }

  /* ── DVL FLOW STACK PANEL — standard oscillator template ── */
  function drawFlowStack(ctx,W,H,V,sc,x,ptH,baseOff){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();
    if(!ptH||ptH<=0||!cfg.showPanel)return;
    var cs=S.candles;if(!cs||cs.length<2)return;

    var ck=_ck(cs,cfg);
    if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}
    if(!_cache)return;
    var res=_cache;
    var n=res.n;

    /* panel bounds — use standard layout */
    var pBot=H-10-baseOff,pTop=pBot-ptH;
    var L=typeof _dvlOscLayout==='function'?_dvlOscLayout(W,H,pTop,pBot):null;
    if(!L){
      /* fallback if helper not available yet */
      L={pTop:pTop,pBot:pBot,hdrH:18,scaleLeft:W-68,plotLeft:6,plotRight:W-72,
         plotTop:pTop+21,plotBottom:pBot-7,mid:(pTop+21+pBot-7)/2,amp:Math.max(8,(pBot-7-pTop-21)*0.48)};
    }
    L.oscKind='pressureFlow';

    /* ensure S.oscScale.pressureFlow exists */
    if(!S.oscScale)S.oscScale={};
    if(!S.oscScale.pressureFlow){
      try{var _sv=JSON.parse(localStorage.getItem('dvl_osc_scale_pressureFlow')||'null');
        S.oscScale.pressureFlow=(_sv&&typeof _sv.range==='number')?_sv:{center:0,range:200};
      }catch(_){S.oscScale.pressureFlow={center:0,range:200};}
    }

    /* last value for header display */
    var lastI=Math.max(0,Math.min(V.b,n-1));
    var lastBias=res.bias[lastI]||0,lastPres=res.pressure[lastI]||0;
    var hdrKind=lastBias>0.15?'bull':lastBias<-0.15?'bear':'neutral';
    var presLbl=lastPres>=0.75?'EXTREME':lastPres>=0.50?'STRONG':lastPres>=0.25?'NORMAL':'WEAK';

    /* draw standard panel base: background, top border, eye, title, grid, scale */
    if(typeof _dvlDrawOscBase==='function'){
      _dvlDrawOscBase(ctx,L,'DVL FLOW STACK',presLbl,hdrKind,'_dvlPTTitleHidden','_dvlPTEyeHit');
    }

    if(L.plotRight<=L.plotLeft||L.plotBottom<=L.plotTop)return;

    /* 3 sub-panels: DELTA (norm by volMA), AGGRESSION, PULSE */
    var innerH=L.plotBottom-L.plotTop;
    var gap=2,nSubs=3,subH=Math.floor((innerH-gap*(nSubs-1))/nSubs);
    if(subH<4)return;

    var bw=Math.max(1.2,CW(W)/Math.max(1,V.span)*0.66);
    var barW=Math.max(1,bw*0.60);
    var histOp=cfg.histOp;

    /* scale zoom factor from user drag/scroll */
    var os=S.oscScale.pressureFlow;
    var zoomF=Math.min(8,200/Math.max(1,os.range||200));
    var centerOff=os.center||0; /* pan offset in display units */

    /* Normalize delta by local volMA so history is visible at all volume levels */
    /* This is done on the fly: normDelta[i] = delta[i] / volMA[i] */
    var dArr={get:function(i){return res.volMA[i]>0?(res.delta[i]||0)/res.volMA[i]:0;}};

    /* compute visible-window 92nd-percentile max for each series */
    var dMax=1e-10,aMax=1e-10,pMax=1e-10;
    for(var i=V.a;i<V.b;i++){
      if(i<0||i>=n)continue;
      var vd=Math.abs(dArr.get(i)),va=Math.abs(res.aggr[i]||0),vp=Math.abs(res.pulse[i]||0);
      if(vd>dMax)dMax=vd;if(va>aMax)aMax=va;if(vp>pMax)pMax=vp;
    }
    /* Use sorted percentile to remove spike domination */
    var dVals=[],aVals=[],pVals=[];
    for(var i=V.a;i<V.b;i++){
      if(i<0||i>=n)continue;
      dVals.push(Math.abs(dArr.get(i)));
      aVals.push(Math.abs(res.aggr[i]||0));
      pVals.push(Math.abs(res.pulse[i]||0));
    }
    function pct92(arr){
      if(!arr.length)return 1e-10;
      arr.sort(function(a,b){return a-b;});
      return arr[Math.min(Math.floor(arr.length*0.92),arr.length-1)]||1e-10;
    }
    dMax=pct92(dVals)||1e-10;
    aMax=pct92(aVals)||1e-10;
    pMax=pct92(pVals)||1e-10;

    var subs=[
      {getVal:function(i){return dArr.get(i);},max:dMax,label:'DELTA',uni:false,
       posR:0,posG:195,posB:200,negR:220,negG:60,negB:50},
      {getVal:function(i){return res.aggr[i]||0;},max:aMax,label:'AGGRESSION',uni:false,
       posR:0,posG:155,posB:240,negR:220,negG:110,negB:30},
      {getVal:function(i){return res.pulse[i]||0;},max:pMax,label:'PULSE',uni:true,
       posR:130,posG:70,posB:230,negR:130,negG:70,negB:230}
    ];

    ctx.save();
    /* clip to entire plot area */
    ctx.beginPath();
    ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);
    ctx.clip();

    for(var si=0;si<subs.length;si++){
      var sp=subs[si];
      var yTop=L.plotTop+si*(subH+gap);
      var yBot=yTop+subH;
      var yMid=(yTop+yBot)/2;

      /* sub-panel separator */
      if(si>0){ctx.fillStyle='rgba(23,32,45,0.60)';ctx.fillRect(L.plotLeft,yTop-gap,L.plotRight-L.plotLeft,gap);}

      /* sub-panel label */
      ctx.font='bold 6px monospace';ctx.fillStyle='rgba(90,112,144,0.72)';
      ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(sp.label,L.plotLeft+3,yTop+2);

      /* zero line (bipolar only) */
      if(!sp.uni){
        ctx.strokeStyle='rgba(40,60,90,0.50)';ctx.lineWidth=0.8;
        ctx.setLineDash([2,3]);
        ctx.beginPath();ctx.moveTo(L.plotLeft,yMid);ctx.lineTo(L.plotRight,yMid);ctx.stroke();
        ctx.setLineDash([]);
      }

      /* bars */
      for(var i=V.a;i<V.b;i++){
        if(i<0||i>=n)continue;
        var v=sp.getVal(i);
        var norm=sp.max>0?v/sp.max:0;
        /* apply scale zoom and center pan */
        norm=(norm-centerOff/100)*zoomF;
        norm=Math.max(-1,Math.min(1,norm)); /* clamp after zoom */

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

    /* right-scale: show current values for each sub-panel */
    ctx.save();
    for(var si=0;si<subs.length;si++){
      var sp=subs[si];
      var yBot=L.plotTop+(si+1)*(subH+gap)-gap;
      var lastV=sp.getVal(lastI);
      var isPos=lastV>=0;
      var r2,g2,b2;
      if(sp.uni||isPos){r2=sp.posR;g2=sp.posG;b2=sp.posB;}else{r2=sp.negR;g2=sp.negG;b2=sp.negB;}
      var vStr=sp.uni?(lastV*100).toFixed(0)+'%':(isPos?'+':'')+lastV.toFixed(3);
      ctx.font='700 '+(Math.round(7*(_csf||1)))+'px monospace';
      ctx.textAlign='left';ctx.textBaseline='bottom';
      ctx.fillStyle='rgba('+r2+','+g2+','+b2+',0.82)';
      ctx.fillText(vStr,L.scaleLeft+4,yBot);
    }
    ctx.restore();
  }"""

html = html.replace(OLD_FLOW_STACK, NEW_FLOW_STACK, 1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_144.py applied — Beta 0.144')
print('  + DVL Flow Stack follows standard oscillator template:')
print('    * _dvlOscLayout + _dvlDrawOscBase (eye, title, grid, scale)')
print('    * pressureFlow kind added to oscScale system (drag/scroll/double-click reset)')
print('    * oscScaleHit + oscPanelAtY extended for pressureFlow panel')
print('    * ptFlowResizeHandle HTML+CSS+IIFE added')
print('    * delta normalized by volMA → no flat history from volume level differences')
print('    * 92nd-percentile visible-window autoscale → spikes do not crush history')
print('    * user zoom factor from S.oscScale.pressureFlow applied to bar heights')
print('    * eye hitbox wired in mousedown handler')
