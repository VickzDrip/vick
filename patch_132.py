#!/usr/bin/env python3
"""patch_132.py — Beta 0.132: Spike Zones Engine — indicador nativo completo"""

import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.131') >= 10, 'Expected Beta 0.131'
html = html.replace('Beta 0.131', 'Beta 0.132')

# ── 1. Add spikeZones to S.inds ───────────────────────────────────────────────
OLD_INDS = 'inds:Object.assign({heatmap:false,profile:false,book:false,stdVolume:false,volZones:false,hvnPro:false,flowAccel:false,hvnClarity:false,dvlConf:false,fvgConf:false,sessionProfile:false,fvgVolume:false,hvnReact:false,hvnSignals:false,trendBreak:false},window.__savedInds||{})'
assert OLD_INDS in html, 'S.inds not found'
NEW_INDS = 'inds:Object.assign({heatmap:false,profile:false,book:false,stdVolume:false,volZones:false,hvnPro:false,flowAccel:false,hvnClarity:false,dvlConf:false,fvgConf:false,sessionProfile:false,fvgVolume:false,hvnReact:false,hvnSignals:false,trendBreak:false,spikeZones:false},window.__savedInds||{})'
html = html.replace(OLD_INDS, NEW_INDS, 1)

# ── 2. Menu card HTML (after volZones closing div) ────────────────────────────
OLD_AFTER_VOLZONES = '''        </div>

        <div class="dvl-cat-hdr" data-dvl-cat="confluencia">'''
assert OLD_AFTER_VOLZONES in html, 'volZones end not found'

SPIKE_ZONES_CARD = '''        </div>

        <div class="ind-card dvl-icd" data-card="spikeZones" data-dvl-cat="volume">
          <div class="dvl-icd-head">
            <div class="dvl-icd-icon" style="--ic-bg:rgba(200,80,210,.12);--ic-cl:#c850d4"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M9.5 1.5L3 9h5L6.5 14.5 13 7H8z"/></svg></div>
            <div class="dvl-icd-info">
              <div class="dvl-icd-name name">Spike Zones Engine</div>
              <div class="dvl-icd-meta">
                <span class="dvl-bdg dvl-bdg-nat">NATIVO</span>
                <span class="dvl-bdg dvl-bdg-on">ATIVO</span>
              </div>
            </div>
            <div class="dvl-icd-ctrl">
              <div class="row" data-ind="spikeZones"><span class="switch"></span></div>
              <button class="gear" data-settings="spikeZones" title="Configurar Spike Zones Engine">&#9881;</button>
              <button class="dvl-star" data-star="spikeZones" type="button" title="Favoritar"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg></button>
            </div>
          </div>
          <div class="ind-settings" id="settings-spikeZones">

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:4px 0 4px;padding-bottom:4px;border-bottom:1px solid rgba(0,212,255,.07)">DETECÇÃO</div>
            <div class="kv"><span class="k">Sensibilidade</span><input class="num" id="szSens" type="number" min="0.3" max="3" step="0.1" value="1" style="width:56px"><span style="font-size:9px;color:#5a7090;margin-left:4px">1=normal</span></div>
            <div class="kv"><span class="k">Peso volume</span><input class="num" id="szVolMult" type="number" min="0.1" max="3" step="0.1" value="1" style="width:56px"></div>
            <div class="kv"><span class="k">Peso ATR range</span><input class="num" id="szAtrMult" type="number" min="0.1" max="3" step="0.1" value="1" style="width:56px"></div>
            <div class="kv"><span class="k">Nível mínimo</span>
              <select class="select" id="szMinLevel" style="width:72px">
                <option value="1">L1 (todos)</option>
                <option value="2">L2</option>
                <option value="3" selected>L3</option>
                <option value="4">L4</option>
                <option value="5">L5 (extremo)</option>
              </select>
            </div>

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">ZONAS</div>
            <div class="kv"><span class="k">Fonte da zona</span>
              <select class="select" id="szSource" style="width:90px">
                <option value="full" selected>Candle completo</option>
                <option value="body">Corpo</option>
                <option value="wick_dom">Pavio dominante</option>
              </select>
            </div>
            <div class="kv"><span class="k">ATR padding</span>
              <select class="select" id="szAtrPad" style="width:72px">
                <option value="0">0 (sem)</option>
                <option value="0.05" selected>0.05 ATR</option>
                <option value="0.10">0.10 ATR</option>
                <option value="0.20">0.20 ATR</option>
              </select>
            </div>
            <div class="kv"><span class="k">Máx. zonas</span>
              <select class="select" id="szMaxZones" style="width:72px">
                <option value="20">20</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
            <div class="kv"><span class="k">Merge ATR×</span><input class="num" id="szMerge" type="number" min="0" max="1" step="0.05" value="0.15" style="width:56px"></div>
            <div class="kv"><span class="k">Expirar após</span>
              <select class="select" id="szExpire" style="width:72px">
                <option value="0">Off</option>
                <option value="50">50 barras</option>
                <option value="100">100 barras</option>
                <option value="250" selected>250 barras</option>
                <option value="500">500 barras</option>
              </select>
            </div>
            <div class="kv"><span class="k">Máx. testes</span>
              <select class="select" id="szMaxTests" style="width:72px">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3" selected>3</option>
                <option value="5">5</option>
              </select>
            </div>

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">TIMEFRAME</div>
            <div class="kv"><span class="k">TF das zonas</span>
              <select class="select" id="szTf" style="width:72px">
                <option value="" selected>Atual</option>
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="30m">30m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1D</option>
              </select>
            </div>
            <div class="kv"><span class="k">Max candles scan</span>
              <select class="select" id="szMaxScan" style="width:72px">
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="3000" selected>3000</option>
                <option value="5000">5000</option>
              </select>
            </div>
            <div class="kv"><span class="k">Extensão (barras)</span><input class="num" id="szExtend" type="number" min="0" max="200" step="5" value="20" style="width:56px"></div>

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">VISUAL</div>
            <div class="kv"><span class="k">Modo de cor</span>
              <select class="select" id="szColMode" style="width:90px">
                <option value="level">Por nível</option>
                <option value="recency">Por recência</option>
                <option value="hybrid" selected>Híbrido</option>
              </select>
            </div>
            <label class="kv" style="cursor:pointer"><span class="k">Destacar candle origem</span><input type="checkbox" id="szHlOn" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar labels</span><input type="checkbox" id="szLabOn" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar volume</span><input type="checkbox" id="szLabVol" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar TF</span><input type="checkbox" id="szLabTF" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar status</span><input type="checkbox" id="szLabSt" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>

            <div class="hint">Spike Zones detecta candles com volume/range anormal, classifica em L1-L5 e cria zonas horizontais. Zonas recentes têm maior opacidade. Merge une zonas próximas.</div>
          </div>
        </div>

        <div class="dvl-cat-hdr" data-dvl-cat="confluencia">'''

html = html.replace(OLD_AFTER_VOLZONES, SPIKE_ZONES_CARD, 1)

# ── 3. draw() hook: insert after Vol Zones, before HVN PRO ───────────────────
OLD_DRAW_VZ = 'if(window.__drawVolZones)safeLayer(\'High Volume Zones\',()=>window.__drawVolZones(ctx,W,H,AllV,sc,x));resetCtxState(ctx);if(window.__drawHVNPro)'
assert OLD_DRAW_VZ in html, 'draw() Vol Zones hook not found'
NEW_DRAW_VZ = 'if(window.__drawVolZones)safeLayer(\'High Volume Zones\',()=>window.__drawVolZones(ctx,W,H,AllV,sc,x));resetCtxState(ctx);if(window.__drawSpikeZones)safeLayer(\'Spike Zones\',()=>window.__drawSpikeZones(ctx,W,H,AllV,sc,x,bw));resetCtxState(ctx);if(window.__drawHVNPro)'
html = html.replace(OLD_DRAW_VZ, NEW_DRAW_VZ, 1)

# ── 4. Append Spike Zones Engine script block ─────────────────────────────────
SPIKE_ZONES_SCRIPT = r"""
<!-- ── DVL Spike Zones Engine (Beta 0.132) ── -->
<script id="DVL_SPIKE_ZONES">
(function DVL_SPIKE_ZONES(){
  'use strict';

  // ── Utilities ──
  var E=function(id){return document.getElementById(id);};
  function nv(id,def){var n=E(id);if(!n)return def;var v=parseFloat(n.value);return Number.isFinite(v)?v:def;}
  function bv(id,def){var n=E(id);return n?n.checked:!!def;}
  function sv(id,def){var n=E(id);return n?n.value:(def||'');}
  function clp(v,a,b){return Math.max(a,Math.min(b,v));}
  function _nf(v){
    v=Number(v)||0;var a=Math.abs(v);
    if(a>=1e9)return(a/1e9).toFixed(1)+'B';
    if(a>=1e6)return(a/1e6).toFixed(1)+'M';
    if(a>=1e3)return(a/1e3).toFixed(0)+'K';
    return v.toFixed(0);
  }

  // ── Level color palette (r,g,b) ──
  var COL=[null,
    {r:75,g:100,b:158},    // L1: steel blue muted
    {r:10,g:185,b:215},    // L2: cyan
    {r:0,g:205,b:172},     // L3: teal/mint
    {r:235,g:162,b:32},    // L4: golden amber
    {r:205,g:50,b:205}     // L5: magenta premium
  ];

  // ── State ──
  var _cache=null, _cKey='';
  var _extC=null, _extK='', _extF=false;

  // ── Settings ──
  function _cfg(){
    return {
      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,5),
      sens:      clp(nv('szSens',1.0),0.3,5),
      volMult:   clp(nv('szVolMult',1.0),0.1,5),
      atrMult:   clp(nv('szAtrMult',1.0),0.1,5),
      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,10,200),
      maxScan:   clp(parseInt(sv('szMaxScan','3000'))||3000,100,10000),
      source:    sv('szSource','full'),
      atrPad:    clp(parseFloat(sv('szAtrPad','0.05'))||0.05,0,1),
      mergeDist: clp(nv('szMerge',0.15),0,2),
      expire:    clp(parseInt(sv('szExpire','250'))||0,0,2000),
      maxTests:  clp(parseInt(sv('szMaxTests','3'))||3,1,20),
      hlOn:      bv('szHlOn',true),
      labOn:     bv('szLabOn',true),
      labVol:    bv('szLabVol',true),
      labTF:     bv('szLabTF',true),
      labSt:     bv('szLabSt',true),
      colMode:   sv('szColMode','hybrid'),
      tf:        sv('szTf',''),
      extend:    clp(nv('szExtend',20),0,200)
    };
  }

  // ── Multi-TF candle fetch ──
  function _getCandles(){
    var tf=sv('szTf','');
    if(!tf||tf===window.S.tf) return window.S.candles;
    var wk=S.sym+'|'+tf;
    if(_extK===wk&&_extC) return _extC;
    if(!_extF||_extK!==wk){
      _extF=true; _extK=wk; _extC=null;
      fetch('https://api.binance.com/api/v3/klines?symbol='+S.sym+'&interval='+tf+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject(r.status);})
        .then(function(d){
          if(_extK!==wk)return;
          _extC=d.map(function(x){return{t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()};});
          _extF=false; _cKey='';
          if(typeof drawSoon==='function')drawSoon();
        })
        .catch(function(){_extF=false;});
    }
    return window.S.candles;
  }

  // ── Spike detection & zone computation ──
  function _computeZones(cs, cfg){
    var n=cs.length;
    if(n<20) return [];

    var maxScan=Math.min(n,cfg.maxScan);
    var base=Math.max(0,n-maxScan);
    var sl=base>0?cs.slice(base):cs;
    var m=sl.length;

    // Rolling volume MA (period 20)
    var VOL_P=20, vs=0;
    var volMA=new Float64Array(m);
    for(var i=0;i<m;i++){
      vs+=sl[i].v;
      if(i>=VOL_P)vs-=sl[i-VOL_P].v;
      volMA[i]=vs/Math.min(i+1,VOL_P);
    }

    // ATR-14
    var ATR_P=14, atrSum=0;
    var atrArr=new Float64Array(m);
    for(var i=0;i<m;i++){
      var c=sl[i],pc=i>0?sl[i-1].c:c.o;
      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));
      atrSum+=tr;
      if(i>=ATR_P){var oc=sl[i-ATR_P],op=i>ATR_P?sl[i-ATR_P-1].c:oc.o;atrSum-=Math.max(oc.h-oc.l,Math.abs(oc.h-op),Math.abs(oc.l-op));}
      atrArr[i]=atrSum/Math.min(i+1,ATR_P);
    }

    // Level thresholds scaled by sensitivity
    var s=cfg.sens||1;
    var T0=1.5*s, T1=2.5*s, T2=4.0*s, T3=6.5*s, T4=10.0*s;

    var WARMUP=Math.max(ATR_P,VOL_P);
    var candidates=[];

    for(var i=WARMUP;i<m;i++){
      var c=sl[i];
      var vm=volMA[i]||1;
      var at=atrArr[i]||1;
      var range=c.h-c.l;
      var body=Math.abs(c.c-c.o);
      var upperWick=c.h-Math.max(c.o,c.c);
      var lowerWick=Math.min(c.o,c.c)-c.l;

      var volRatio=c.v/vm;
      var rangeRatio=range/at;

      // Spike score: weighted sum
      var score=cfg.volMult*volRatio+cfg.atrMult*rangeRatio;

      // Bonuses
      var bodyRatio=range>1e-12?body/range:0;
      if(bodyRatio>0.62)score+=0.4;
      var maxWick=Math.max(upperWick,lowerWick);
      if(range>1e-12&&maxWick/range>0.52)score+=0.25;
      if(volRatio>3.5)score+=0.6;
      // Orderflow bonus
      if(c.delta&&Math.abs(c.delta)>c.v*0.35)score+=0.35;

      var rawScore=score;
      // Classify level
      var level=rawScore<T0?0:rawScore<T1?1:rawScore<T2?2:rawScore<T3?3:rawScore<T4?4:5;
      if(level<1||level<cfg.minLevel)continue;

      var direction=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';
      var pad=at*(cfg.atrPad||0);

      var hi,lo;
      if(cfg.source==='body'){
        hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;
      }else if(cfg.source==='wick_dom'){
        if(upperWick>lowerWick){hi=c.h+pad;lo=Math.max(c.o,c.c)-pad;}
        else{hi=Math.min(c.o,c.c)+pad;lo=c.l-pad;}
      }else{
        hi=c.h+pad;lo=c.l-pad;
      }
      if(hi<=lo)lo=hi-at*0.02;

      candidates.push({
        id:base+i,level:level,rawScore:rawScore,
        hi:hi,lo:lo,mid:(hi+lo)/2,
        srcIdx:base+i,srcTs:c.t,
        dir:direction,vol:c.v,atr:at
      });
    }

    if(!candidates.length)return [];

    // Sort by recency (newest first) for priority merge
    candidates.sort(function(a,b){return b.srcIdx-a.srcIdx;});

    // Merge overlapping/nearby zones
    var used=new Uint8Array(candidates.length);
    var merged=[];

    for(var i=0;i<candidates.length;i++){
      if(used[i])continue;
      var z=Object.assign({},candidates[i]);
      var mt=(z.atr||1)*(cfg.mergeDist||0.15);

      for(var j=i+1;j<candidates.length;j++){
        if(used[j])continue;
        var z2=candidates[j];
        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){
          used[j]=1;
          // Newer (z) takes precedence; upgrade level if z2 is higher
          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}
          z.hi=Math.max(z.hi,z2.hi);
          z.lo=Math.min(z.lo,z2.lo);
          z.mid=(z.hi+z.lo)/2;
          z.vol=Math.max(z.vol,z2.vol);
        }
      }
      merged.push(z);
    }

    // Compute age & status
    var now=n-1;
    var final=[];
    for(var zi=0;zi<merged.length;zi++){
      var z=merged[zi];
      z.age=now-z.srcIdx;

      // Expiry check
      if(cfg.expire>0&&z.age>cfg.expire)continue;

      // Count tests in limited window for performance
      var tests=0;
      var chkStart=Math.min(n-1,z.srcIdx+1);
      var chkEnd=Math.min(n-1,z.srcIdx+(cfg.expire||250)+10);
      for(var k=chkStart;k<=chkEnd&&k<n;k++){
        var ck=cs[k];
        if(ck.l<=z.hi&&ck.h>=z.lo)tests++;
      }
      z.tests=tests;
      z.isRecent=z.age<50;

      if(tests===0)z.status='fresh';
      else if(tests<cfg.maxTests)z.status='tested';
      else z.status='weakened';

      final.push(z);
    }

    // Sort: level desc, then recency
    final.sort(function(a,b){
      var ld=b.level-a.level;
      if(ld!==0)return ld;
      return b.srcIdx-a.srcIdx;
    });

    return final.slice(0,cfg.maxZones);
  }

  // ── Draw ──
  function drawSpikeZones(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.spikeZones||!S.candles.length)return;

    var cfg=_cfg();
    var cs=_getCandles();
    if(!cs||cs.length<20)return;

    var tf=cfg.tf||S.tf;
    var ck=[cs.length,cs[0]?cs[0].t:0,S.sym,tf,
            cfg.minLevel,cfg.sens,cfg.volMult,cfg.atrMult,
            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,
            cfg.mergeDist,cfg.expire,cfg.maxTests].join('|');

    if(_cKey!==ck){
      _cache=_computeZones(cs,cfg);
      _cKey=ck;
      if(window.S)window.S.spikeZones=_cache;
    }

    var zones=_cache||[];
    if(!zones.length)return;

    var rp=typeof RP==='function'?RP():68;
    var xL=0;
    var bwPx=typeof bw==='number'?bw:4;
    var xR=W-rp+Math.min(cfg.extend*bwPx,80);
    var usingMTF=cfg.tf&&cfg.tf!==S.tf;
    var expBound=cfg.expire>0?cfg.expire:250;

    // ── Draw zone boxes ──
    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var y1=sc.y(z.hi);
      var y2=sc.y(z.lo);
      if(y1>=H||y2<=0)continue;

      var boxH=Math.max(1,y2-y1);
      var col=COL[z.level]||COL[5];
      var recency=Math.max(0,1-z.age/expBound);
      var lf=z.level/5;

      var fillOp,strOp;
      if(cfg.colMode==='level'){
        fillOp=0.04+0.07*lf;
        strOp=0.30+0.40*lf;
      }else if(cfg.colMode==='recency'){
        fillOp=0.02+0.11*recency;
        strOp=0.12+0.52*recency;
      }else{
        fillOp=0.025+0.035*lf+0.055*recency;
        strOp=0.18+0.22*lf+0.22*recency;
      }

      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}
      else if(z.status==='tested'){fillOp*=0.72;strOp*=0.72;}

      // Fill
      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';
      ctx.fillRect(xL,y1,xR-xL,boxH);

      // Border lines
      ctx.lineWidth=z.level>=4?1.5:1;
      if(z.status==='weakened'){ctx.setLineDash([3,3]);}
      else{ctx.setLineDash([]);}
      ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+strOp.toFixed(3)+')';
      ctx.beginPath();
      ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);
      ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glow for fresh L3+ recent zones
      if(z.status==='fresh'&&z.level>=3&&recency>0.55){
        ctx.save();
        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.45)';
        ctx.shadowBlur=4;
        ctx.lineWidth=1;
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.55).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
      }

      // ── Labels (left side) ──
      if(cfg.labOn){
        var ym=y1+boxH/2+3.5;
        ctx.font='bold 7px monospace';
        ctx.textAlign='left';

        var parts=['L'+z.level];
        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());
        if(cfg.labVol&&z.vol>0)parts.push('$'+_nf(z.vol));
        var main=parts.join(' · ');

        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.15).toFixed(3)+')';
        ctx.fillText(main,xL+5,ym);

        if(cfg.labSt&&boxH>7){
          var stX=xL+5+ctx.measureText(main).width+5;
          var stTxt='',stClr='';
          if(z.status==='fresh'&&z.isRecent){stTxt='NEW';stClr='rgba(0,215,110,0.88)';}
          else if(z.status==='tested'){stTxt='TESTED';stClr='rgba(235,160,35,0.78)';}
          else if(z.status==='weakened'){stTxt='WEAK';stClr='rgba(155,90,90,0.72)';}
          if(stTxt){ctx.font='7px monospace';ctx.fillStyle=stClr;ctx.fillText(stTxt,stX,ym);}
        }
      }

      // ── Right edge level indicator ──
      if(boxH>4){
        var ym2=y1+boxH/2+3;
        ctx.font='bold 7px monospace';
        ctx.textAlign='right';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';
        ctx.fillText('L'+z.level,W-rp-3,ym2);
      }
    }

    // ── Source candle highlights (current TF only, above/below candles) ──
    if(cfg.hlOn&&!usingMTF){
      ctx.textAlign='center';
      for(var zi=0;zi<zones.length;zi++){
        var z=zones[zi];
        var si=z.srcIdx;
        if(si<0||si>=S.candles.length)continue;
        if(si<V.a-2||si>V.b+2)continue;

        var c=S.candles[si];
        if(!c)continue;
        var col=COL[z.level]||COL[5];
        var cx=x(si);
        var chy=sc.y(c.h);
        var cly=sc.y(c.l);
        var isUp=c.c>=c.o;
        var hlOp=0.30+0.45*(z.level/5);

        // Vertical glow line through candle
        ctx.save();
        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.5)';
        ctx.shadowBlur=2;
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+hlOp.toFixed(3)+')';
        ctx.lineWidth=1.5;
        ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(cx,chy);ctx.lineTo(cx,cly);ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);

        // Triangle marker above/below candle
        var triY,triDir;
        if(isUp){triY=chy-3;triDir=-1;}
        else{triY=cly+3;triDir=1;}

        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(hlOp*1.1).toFixed(3)+')';
        ctx.beginPath();
        ctx.moveTo(cx-3.5,triY);
        ctx.lineTo(cx+3.5,triY);
        ctx.lineTo(cx,triY+triDir*5);
        ctx.closePath();
        ctx.fill();

        // Level text S1-S5
        var lblY=isUp?chy-10:cly+13;
        ctx.font='bold 7px monospace';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';
        ctx.fillText('S'+z.level,cx,lblY);
      }
      ctx.textAlign='left';
    }

    // Reset ctx state
    ctx.lineWidth=1;
    ctx.setLineDash([]);
    ctx.textAlign='left';
    ctx.shadowBlur=0;
    ctx.shadowColor='transparent';
  }

  // ── Export ──
  window.__drawSpikeZones=drawSpikeZones;
  window.__szInvalidate=function(){_cKey='';_extC=null;_extK='';_extF=false;};

  // ── Event wiring ──
  var SZ_IDS=new Set(['szSens','szVolMult','szAtrMult','szMinLevel','szMaxZones',
    'szMaxScan','szSource','szAtrPad','szMerge','szExpire','szMaxTests',
    'szHlOn','szLabOn','szLabVol','szLabTF','szLabSt','szColMode','szTf','szExtend']);

  document.addEventListener('input',function(ev){
    if(!SZ_IDS.has(ev.target&&ev.target.id))return;
    _cKey='';if(typeof drawSoon==='function')drawSoon();
  });
  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!SZ_IDS.has(id))return;
    if(id==='szTf'){_extC=null;_extK='';_extF=false;_cKey='';}
    else{_cKey='';}
    if(typeof drawSoon==='function')drawSoon();
  });

  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);

})();
</script>
"""

# Append after the last </script> at end of file
OLD_END = '</script>\n'
assert html.endswith('</script>\n'), 'File does not end with </script>'
html = html[:-len(OLD_END)] + OLD_END + SPIKE_ZONES_SCRIPT

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_132.py applied — Beta 0.132')
print('  + spikeZones indicator registered in S.inds')
print('  + Menu card "Spike Zones Engine" added in Volume & Liquidez category')
print('  + draw() hook inserted after Vol Zones')
print('  + DVL_SPIKE_ZONES script block: full detection + zone creation + drawing')
print('  + L1-L5 levels, merge, expire, MTF support, source candle highlights')
