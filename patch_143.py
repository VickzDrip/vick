#!/usr/bin/env python3
"""patch_143.py — Beta 0.143: DVL Real Pressure Trail"""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.142') >= 10
html = html.replace('Beta 0.142', 'Beta 0.143')

# ── 1. S.inds: add pressureTrail ─────────────────────────────────────────────
OLD_INDS = "spikeZones:false},window.__savedInds||{})"
assert OLD_INDS in html, 'S.inds spikeZones not found'
html = html.replace(OLD_INDS, "spikeZones:false,pressureTrail:false},window.__savedInds||{})", 1)

# ── 2. Panel height variable (after _flowAccelH) ─────────────────────────────
OLD_FH = ("let _flowAccelH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_flowH'));"
          "return(v>=70&&v<=240)?v:120;}catch(e){return 120;}})();")
assert OLD_FH in html, '_flowAccelH not found'
html = html.replace(OLD_FH,
    OLD_FH + "let _ptFlowH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_ptFlowH'));return(v>=70&&v<=240)?v:110;}catch(e){return 110;}})();",
    1)

# ── 3. PB calculation: add _ptH ──────────────────────────────────────────────
OLD_PB = ("const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;"
          "PB=10+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);")
assert OLD_PB in html, 'PB calc not found'
html = html.replace(OLD_PB,
    "const _fah=(S.inds.flowAccel&&S.candles.length)?_flowAccelH:0;"
    "const _ptH=(S.inds.pressureTrail&&S.candles.length)?_ptFlowH:0;"
    "PB=10+(_ptH?_ptH+PANEL_GAP:0)+(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0);",
    1)

# ── 4. draw(): cloud before candles ──────────────────────────────────────────
OLD_BEFORE_CANDLES = ("if(window.__drawSessionProfile)safeLayer('Session Profile',"
                      "()=>window.__drawSessionProfile(ctx,W,H,V,sc,x));"
                      "resetCtxState(ctx);if(S.chartStyle==='renko')drawRenko")
assert OLD_BEFORE_CANDLES in html, 'before-candles anchor not found'
html = html.replace(OLD_BEFORE_CANDLES,
    "if(window.__drawSessionProfile)safeLayer('Session Profile',"
    "()=>window.__drawSessionProfile(ctx,W,H,V,sc,x));"
    "resetCtxState(ctx);"
    "if(S.inds.pressureTrail&&window.__drawPressureCloud)safeLayer('DVL Pressure Cloud',"
    "()=>window.__drawPressureCloud(ctx,W,H,AllV,sc,x,bw));"
    "resetCtxState(ctx);"
    "if(S.chartStyle==='renko')drawRenko",
    1)

# ── 5. draw(): bias line + state after candles (after trendBreak block) ───────
OLD_AFTER_CANDLES = ("if(S.inds.trendBreak){if(window.__computeTrendBreak)window.__computeTrendBreak();"
                     "if(window.__drawTrendBreakOverlay)safeLayer('Trend Break',"
                     "()=>window.__drawTrendBreakOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);"
                     "drawLastPrice(ctx,W,sc);")
assert OLD_AFTER_CANDLES in html, 'after-candles anchor not found'
html = html.replace(OLD_AFTER_CANDLES,
    "if(S.inds.trendBreak){if(window.__computeTrendBreak)window.__computeTrendBreak();"
    "if(window.__drawTrendBreakOverlay)safeLayer('Trend Break',"
    "()=>window.__drawTrendBreakOverlay(ctx,W,H,V,sc,x,bw));}resetCtxState(ctx);"
    "if(S.inds.pressureTrail&&window.__drawPressureTrail){"
    "safeLayer('DVL Pressure Trail',()=>window.__drawPressureTrail(ctx,W,H,AllV,sc,x,bw));"
    "resetCtxState(ctx);"
    "if(window.__drawPressureState)safeLayer('DVL Pressure State',()=>window.__drawPressureState(ctx,W,H));"
    "}resetCtxState(ctx);"
    "drawLastPrice(ctx,W,sc);",
    1)

# ── 6. draw(): panel draw (before flow panel) ─────────────────────────────────
OLD_PANEL_POS = ("if(_fah>0&&window.__drawFlowPanel)safeLayer('DVL Flow Panel',"
                 "()=>window.__drawFlowPanel(ctx,W,H,V,sc,x,_fah,_clarH,0));resetCtxState(ctx);"
                 "if(_clarH>0)drawTrendClarityOnCanvas")
assert OLD_PANEL_POS in html, 'panel position anchor not found'
html = html.replace(OLD_PANEL_POS,
    "if(_ptH>0&&window.__drawPressurePanel)safeLayer('DVL Flow Stack',"
    "()=>window.__drawPressurePanel(ctx,W,H,V,sc,x,_ptH,"
    "(_fah?_fah+PANEL_GAP:0)+(_clarH?_clarH+PANEL_GAP:0)));"
    "resetCtxState(ctx);"
    "if(_fah>0&&window.__drawFlowPanel)safeLayer('DVL Flow Panel',"
    "()=>window.__drawFlowPanel(ctx,W,H,V,sc,x,_fah,_clarH,0));resetCtxState(ctx);"
    "if(_clarH>0)drawTrendClarityOnCanvas",
    1)

# ── 7. HTML: ind-card for pressureTrail (after flowAccel card) ────────────────
OLD_AFTER_FLOW = ('        </div>\n\n        <div class="dvl-cat-hdr" data-dvl-cat="clareza">Clareza &amp; HVN</div>')
assert OLD_AFTER_FLOW in html, 'flowAccel end marker not found'

NEW_PRESSURE_CARD = '''        </div>

        <div class="ind-card dvl-icd" data-card="pressureTrail" data-dvl-cat="confluencia">
          <div class="dvl-icd-head">
            <div class="dvl-icd-icon" style="--ic-bg:rgba(0,212,255,.12);--ic-cl:#00d4ff"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1 L14 8 L8 10 L8 15 L2 8 L8 6 Z" opacity=".9"/></svg></div>
            <div class="dvl-icd-info">
              <div class="dvl-icd-name name">DVL Real Pressure Trail</div>
              <div class="dvl-icd-meta">
                <span class="dvl-bdg dvl-bdg-nat">NATIVO</span>
              </div>
            </div>
            <div class="dvl-icd-ctrl">
              <div class="row" data-ind="pressureTrail"><span class="switch"></span></div>
              <button class="gear" data-settings="pressureTrail" title="Configurar DVL Pressure Trail">&#9881;</button>
              <button class="dvl-star" data-star="pressureTrail" type="button" title="Favoritar"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg></button>
            </div>
          </div>
          <div class="ind-settings" id="settings-pressureTrail">
            <div style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.08em;margin-bottom:6px;opacity:.8;">VISUAIS</div>
            <label class="kv" style="cursor:pointer;"><span class="k">Bias Line</span><input type="checkbox" id="ptShowLine" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <label class="kv" style="cursor:pointer;"><span class="k">Pressure Cloud</span><input type="checkbox" id="ptShowCloud" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <label class="kv" style="cursor:pointer;"><span class="k">Event Labels</span><input type="checkbox" id="ptShowEvents" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <label class="kv" style="cursor:pointer;"><span class="k">State Panel</span><input type="checkbox" id="ptShowState" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">INTENSIDADE</div>
            <div class="kv"><span class="k">Cloud Opacidade</span><input class="num" id="ptCloudOp" type="number" min="0.05" max="0.6" step="0.05" value="0.20" style="width:52px"></div>
            <div class="kv"><span class="k">Line Thickness</span><input class="num" id="ptLineW" type="number" min="1" max="5" step="0.5" value="2" style="width:52px"></div>
            <div class="kv"><span class="k">Glow Strength</span><input class="num" id="ptGlow" type="number" min="0" max="20" step="1" value="6" style="width:52px"></div>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">DADOS</div>
            <div class="kv"><span class="k">Vol MA Length</span><input class="num" id="ptVolMA" type="number" min="3" max="100" step="1" value="20" style="width:52px"></div>
            <div class="kv"><span class="k">Bias Smooth</span><input class="num" id="ptSmooth" type="number" min="1" max="20" step="1" value="5" style="width:52px"></div>
            <div class="kv"><span class="k">Decay Factor</span><input class="num" id="ptDecay" type="number" min="0.5" max="0.99" step="0.01" value="0.92" style="width:52px"></div>
            <div class="kv"><span class="k">Abs Vol Mult</span><input class="num" id="ptAbsVol" type="number" min="1.2" max="5" step="0.1" value="2.0" style="width:52px"></div>
            <div class="kv"><span class="k">Abs Range Pct</span><input class="num" id="ptAbsRange" type="number" min="0.1" max="0.8" step="0.05" value="0.4" style="width:52px"></div>
            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
            <div style="font-size:9px;color:#00d4ff;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">DVL FLOW STACK</div>
            <label class="kv" style="cursor:pointer;"><span class="k">Flow Stack Panel</span><input type="checkbox" id="ptShowPanel" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;"></label>
            <div class="kv"><span class="k">Panel Hist. Op.</span><input class="num" id="ptHistOp" type="number" min="0.1" max="1.5" step="0.1" value="0.9" style="width:52px"></div>
            <div class="hint">Bias · Cloud · ABSORPTION · EXHAUSTION · FLOW FLIP</div>
          </div>
        </div>

        <div class="dvl-cat-hdr" data-dvl-cat="clareza">Clareza &amp; HVN</div>'''

html = html.replace(OLD_AFTER_FLOW, NEW_PRESSURE_CARD, 1)

# ── 8. Script block: append DVL_PRESSURE_TRAIL before </script> at end ────────
OLD_END = ("  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);\n"
           "\n"
           "})();\n"
           "</script>\n")
assert OLD_END in html, 'end anchor not found'

PRESSURE_TRAIL_SCRIPT = r"""
</script>

<script id="DVL_PRESSURE_TRAIL">
(function DVL_PRESSURE_TRAIL(){
  'use strict';

  /* ── helpers ── */
  function el(id){return document.getElementById(id);}
  function nv(id,def){var v=parseFloat((el(id)||{}).value);return isFinite(v)?v:def;}
  function bv(id,def){var e=el(id);return e?e.checked:def;}
  function clp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}

  /* ── config ── */
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
      decay:      clp(nv('ptDecay',0.92),0.5,0.99),
      absVol:     clp(nv('ptAbsVol',2.0),1.0,5),
      absRange:   clp(nv('ptAbsRange',0.4),0.05,0.9),
      histOp:     clp(nv('ptHistOp',0.9),0.05,1.5)
    };
  }

  /* ── cache ── */
  var _cache=null,_cKey='';

  function _ck(cs,cfg){
    var n=cs.length,last=cs[n-1]||{};
    return [n,(last.t||0),(last.v||0),cfg.volMA,cfg.smooth,cfg.decay,cfg.absVol,cfg.absRange].join('|');
  }

  /* ── compute ── */
  function _compute(cs,cfg){
    var n=cs.length;
    if(n<4)return null;
    var MA_P=cfg.volMA,ATR_P=14;

    /* volume MA */
    var volMA=new Float64Array(n),vs=0;
    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}

    /* price ATR */
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
      if(c.buy!=null&&c.sell!=null){
        delta[i]=(c.buy||0)-(c.sell||0);
      } else {
        var range=Math.max(c.h-c.l,1e-12);
        delta[i]=((c.c-c.l)/range*2-1)*c.v;
      }
    }

    /* aggression: (vol/volMA) × (body/range) × sign(delta) */
    var aggr=new Float64Array(n);
    for(var i=0;i<n;i++){
      var c=cs[i],vm=volMA[i]||1,at=atr[i]||1;
      var range=c.h-c.l,body=Math.abs(c.c-c.o);
      var vr=c.v/vm,br=range>1e-12?body/range:0;
      var d=delta[i];
      aggr[i]=vr*br*(d>0?1:d<0?-1:0);
    }

    /* cumulative flow with exponential decay */
    var decay=cfg.decay;
    var cumFlow=new Float64Array(n);
    for(var i=0;i<n;i++){
      var prev=i>0?cumFlow[i-1]*decay:0;
      var at=atr[i]||1,vm=volMA[i]||1;
      cumFlow[i]=prev+delta[i]/(vm*at+1e-10);
    }

    /* bias: tanh-smoothed cumFlow, range -1..1 */
    var sm=cfg.smooth;
    var bias=new Float32Array(n);
    for(var i=0;i<n;i++){
      var s=0,cnt=0;
      for(var j=Math.max(0,i-sm+1);j<=i;j++){s+=cumFlow[j];cnt++;}
      bias[i]=Math.tanh(cnt>0?s/cnt:0);
    }

    /* pressure: 0..1 flow intensity regardless of direction */
    var pressure=new Float32Array(n);
    for(var i=0;i<n;i++){
      var vm=volMA[i]||1;
      var vr=Math.min(cs[i].v/vm,5)/5;
      var da=Math.min(Math.abs(delta[i])/((vm*0.5)||1),3)/3;
      pressure[i]=Math.min(1,(vr*0.55+da*0.45));
    }

    /* pulse: |bias| * pressure */
    var pulse=new Float32Array(n);
    for(var i=0;i<n;i++) pulse[i]=Math.abs(bias[i])*pressure[i];

    /* events */
    var events=[];
    var prevBiasSign=0;
    /* suppress duplicates within 3 candles */
    var lastAbsIdx=-99,lastExhIdx=-99,lastFlipIdx=-99;
    for(var i=ATR_P;i<n;i++){
      var c=cs[i],at=atr[i]||1,vm=volMA[i]||1;
      var range=c.h-c.l;
      /* ABSORPTION: high vol + small range */
      if(c.v>cfg.absVol*vm&&range<cfg.absRange*at&&i-lastAbsIdx>3){
        events.push({idx:i,type:'ABSORPTION'});
        lastAbsIdx=i;
      }
      /* EXHAUSTION: prior big candle, this candle is weak with declining vol */
      if(i>=2){
        var p1=cs[i-1],p2=cs[i-2];
        var p1Range=p1.h-p1.l,p2Range=p2.h-p2.l;
        var bigPrev=Math.max(p1Range,p2Range)>1.5*at;
        var weakNow=range<0.55*at&&c.v<0.75*vm;
        if(bigPrev&&weakNow&&i-lastExhIdx>4){
          events.push({idx:i,type:'EXHAUSTION'});
          lastExhIdx=i;
        }
      }
      /* FLOW FLIP: bias direction reverses */
      var bs=bias[i]>0.20?1:bias[i]<-0.20?-1:0;
      if(bs!==0&&prevBiasSign!==0&&bs!==prevBiasSign&&i-lastFlipIdx>5){
        events.push({idx:i,type:'FLOW_FLIP'});
        lastFlipIdx=i;
      }
      if(bs!==0)prevBiasSign=bs;
    }

    /* market mode (last 20 candles rolling) */
    var MODE_WIN=20;
    var marketMode=new Uint8Array(n); /* 0=ranging,1=trend,2=absorption,3=distribution,4=accum */
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
      if(highAbsorp)marketMode[i]=2;            /* ABSORPTION */
      else if(domBull&&!priceUp)marketMode[i]=4; /* ACCUMULATION */
      else if(domBear&&!priceDn)marketMode[i]=3; /* DISTRIBUTION */
      else if((domBull&&priceUp)||(domBear&&priceDn))marketMode[i]=1; /* TREND */
      else marketMode[i]=0;                       /* RANGING */
    }

    return {bias,pressure,delta,aggr,pulse,atr,volMA,events,marketMode,cumFlow,n};
  }

  /* ── bias → RGB ── */
  function _biasColor(b,p){
    /* b=-1..1 (bias), p=0..1 (pressure) */
    if(b>0.15){
      /* bullish: cyan→green by pressure */
      var t=Math.min(1,p*1.5);
      return {r:Math.round(0+t*0),g:Math.round(200+t*20),b:Math.round(230-t*80)};
    } else if(b<-0.15){
      /* bearish: orange→red by pressure */
      var t=Math.min(1,p*1.5);
      return {r:Math.round(220+t*35),g:Math.round(100-t*80),b:Math.round(40-t*40)};
    } else {
      /* transition: orange */
      return {r:220,g:130,b:20};
    }
  }

  /* ── CLOUD (drawn before candles) ── */
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
      var b=res.bias[i],p=res.pressure[i];
      var at=res.atr[i]||1;
      var cloudH=at*(0.25+p*0.85);
      var mid=(sc.y(cs[i].h)+sc.y(cs[i].l))/2;
      var halfPx=Math.max(2,(sc.y(cs[i].l)-sc.y(cs[i].h))*0.35+p*(sc.y(cs[i].l)-sc.y(cs[i].h))*0.15);
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

  /* ── BIAS LINE + EVENTS (drawn after candles) ── */
  function drawTrail(ctx,W,H,AllV,sc,x,bw){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();
    var cs=S.candles,n=cs.length;
    var ck=_ck(cs,cfg);
    if(_cKey!==ck){_cache=_compute(cs,cfg);_cKey=ck;}
    if(!_cache)return;
    var res=_cache;

    /* Bias line */
    if(cfg.showLine){
      ctx.save();
      /* draw as colored segments */
      var segStart=AllV.a;
      for(var i=AllV.a;i<=AllV.b;i++){
        var isLast=(i===AllV.b);
        var b0=res.bias[Math.min(i,n-1)],b1=i>0?res.bias[Math.min(i-1,n-1)]:b0;
        var colorChange=(i>AllV.a)&&((_biasSign(b0)!==_biasSign(b1))||isLast);
        if(colorChange||isLast){
          /* draw segment from segStart to i-1 */
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
            ctx.lineWidth=lw;
            ctx.lineJoin='round';
            ctx.lineCap='round';
            ctx.setLineDash([]);
            if(cfg.glow>0){ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.6)';ctx.shadowBlur=cfg.glow;}
            ctx.stroke();
            ctx.shadowBlur=0;
          }
          segStart=i;
        }
      }
      ctx.restore();
    }

    /* Events */
    if(cfg.showEvents){
      ctx.save();
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      var evSet=new Set();
      for(var ei=0;ei<res.events.length;ei++){
        var ev=res.events[ei];
        var i=ev.idx;
        if(i<AllV.a-1||i>AllV.b+1)continue;
        if(evSet.has(i+'_'+ev.type))continue;
        evSet.add(i+'_'+ev.type);
        var c=cs[i];
        var xx=x(i);
        var isUp=c.c>=c.o;
        var yBase=isUp?sc.y(c.h)-18:sc.y(c.l)+18;
        var label,r,g,bl;
        if(ev.type==='ABSORPTION'){
          label='ABSORPTION';r=90;g=60;bl=200;
          /* sub-label */
          ctx.font='bold 7px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.85)';
          ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';
          ctx.fillText('HIGH VOL · PRICE STALLS',xx,yBase+(isUp?-10:10));
        } else if(ev.type==='EXHAUSTION'){
          label='EXHAUSTION';r=220;g=130;bl=20;
          ctx.font='bold 7px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.85)';
          ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';
          ctx.fillText('WEAK FOLLOW-THROUGH',xx,yBase+(isUp?-10:10));
        } else if(ev.type==='FLOW_FLIP'){
          var b=res.bias[i];
          if(b>0){r=0;g=200;bl=220;}else{r=220;g=60;bl=50;}
          label='FLOW FLIP';
          ctx.font='bold 7px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.90)';
          ctx.fillText(label,xx,yBase);
          ctx.font='6px monospace';
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.55)';
          ctx.fillText(b>0?'BUYERS IN CONTROL':'SELLERS TAKE OVER',xx,yBase+(isUp?-10:10));
          /* small triangle */
          ctx.beginPath();
          var ty=isUp?sc.y(c.h)-4:sc.y(c.l)+4,td=isUp?-1:1;
          ctx.moveTo(xx-4,ty);ctx.lineTo(xx+4,ty);ctx.lineTo(xx,ty+td*6);ctx.closePath();
          ctx.fillStyle='rgba('+r+','+g+','+bl+',0.70)';ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function _biasSign(b){return b>0.15?1:b<-0.15?-1:0;}

  /* ── STATE PANEL (top-right of chart) ── */
  function drawStatePanel(ctx,W,H){
    if(!window.S||!S.inds.pressureTrail||!S.candles.length)return;
    var cfg=_getCfg();if(!cfg.showState)return;
    if(!_cache)return;
    var res=_cache;
    var n=res.n,last=n-1;
    if(last<0)return;

    var bias=res.bias[last],pres=res.pressure[last];
    var mode=res.marketMode[last];

    /* FLOW STATE */
    var flowState,fsR,fsG,fsB;
    if(bias>0.30){flowState='BULLISH';fsR=0;fsG=200;fsB=220;}
    else if(bias<-0.30){flowState='BEARISH';fsR=220;fsG=60;fsB=50;}
    else{flowState='NEUTRAL';fsR=200;fsG=130;fsB=20;}

    /* PRESSURE */
    var presLabel;
    if(pres<0.25)presLabel='WEAK';
    else if(pres<0.50)presLabel='NORMAL';
    else if(pres<0.75)presLabel='STRONG';
    else presLabel='EXTREME';

    /* MARKET MODE */
    var modeLabels=['RANGING','TREND','ABSORPTION','DISTRIBUTION','ACCUMULATION'];
    var modeLabel=modeLabels[mode]||'RANGING';

    /* position: top-right inside chart area */
    var rp=typeof RP==='function'?RP():68;
    var boxW=130,boxH=72,boxX=W-rp-boxW-6,boxY=12;
    ctx.save();
    ctx.globalAlpha=0.82;
    ctx.fillStyle='rgba(4,10,22,0.85)';
    _rrect(ctx,boxX,boxY,boxW,boxH,6);ctx.fill();
    ctx.strokeStyle='rgba(0,212,255,0.20)';ctx.lineWidth=1;
    _rrect(ctx,boxX,boxY,boxW,boxH,6);ctx.stroke();
    ctx.globalAlpha=1;

    var labelX=boxX+8,valX=boxX+boxW-8;
    var rowH=18;

    /* header */
    ctx.font='bold 8px monospace';ctx.fillStyle='rgba(0,212,255,0.55)';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText('DVL PRESSURE',labelX,boxY+5);

    /* row 1: FLOW STATE */
    var y1=boxY+19;
    ctx.font='7px monospace';ctx.fillStyle='rgba(90,112,144,0.90)';ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText('FLOW STATE',labelX,y1);
    ctx.font='bold 7px monospace';ctx.fillStyle='rgba('+fsR+','+fsG+','+fsB+',0.95)';ctx.textAlign='right';
    ctx.fillText(flowState,valX,y1);

    /* row 2: PRESSURE */
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

    /* row 3: MARKET MODE */
    var y3=y2+rowH;
    var modeR,modeG,modeB;
    if(mode===1){modeR=0;modeG=200;modeB=220;}      /* TREND: cyan */
    else if(mode===2){modeR=90;modeG=60;modeB=200;} /* ABSORPTION: purple */
    else if(mode===3){modeR=220;modeG=60;modeB=50;} /* DISTRIBUTION: red */
    else if(mode===4){modeR=0;modeG=200;modeB=100;} /* ACCUMULATION: green */
    else{modeR=140;modeG=160;modeB=190;}             /* RANGING: gray */
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

  /* ── DVL FLOW STACK PANEL (lower) ── */
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
})();"""

html = html.replace(OLD_END,
    "  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);\n"
    "\n"
    "})();\n"
    "</script>\n"
    + PRESSURE_TRAIL_SCRIPT,
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_143.py applied — Beta 0.143')
print('  + DVL Real Pressure Trail:')
print('    * Live Bias Line (green=buyers, red=sellers, orange=transition)')
print('    * Pressure Cloud (opacity + width = flow strength)')
print('    * Events: ABSORPTION · EXHAUSTION · FLOW FLIP')
print('    * State Panel (top-right): FLOW STATE · PRESSURE · MARKET MODE')
print('    * DVL Flow Stack panel (DELTA · AGGRESSION · PULSE histograms)')
