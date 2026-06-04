#!/usr/bin/env python3
"""patch_133.py — Beta 0.133: Spike Zones Engine v2
  - Zonas visualmente mais fortes (opacidade aumentada)
  - Labels perfeitamente centralizados (textBaseline=middle)
  - szTf: mais opções (1s/15s/30s/3m/…)
  - Nested Spike Zones: mini-zonas dentro das zonas maiores (MTF drill-down)
  - Novos settings: szNested, szNestMinLvl, szNestMax, szShowNested, szNestOp, szNestStyle
"""
import os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.132') >= 10, 'Expected Beta 0.132'
html = html.replace('Beta 0.132', 'Beta 0.133')

# ── 1. Replace entire spikeZones ind-card HTML ────────────────────────────────
OLD_CARD_START = '        <div class="ind-card dvl-icd" data-card="spikeZones" data-dvl-cat="volume">'
OLD_CARD_END   = '\n        <div class="dvl-cat-hdr" data-dvl-cat="confluencia">'
assert OLD_CARD_START in html and OLD_CARD_END in html
idx_start = html.index(OLD_CARD_START)
idx_end   = html.index(OLD_CARD_END, idx_start)

NEW_CARD = '''        <div class="ind-card dvl-icd" data-card="spikeZones" data-dvl-cat="volume">
          <div class="dvl-icd-head">
            <div class="dvl-icd-icon" style="--ic-bg:rgba(200,80,210,.12);--ic-cl:#c850d4"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M9.5 1.5L3 9h5L6.5 14.5 13 7H8z"/></svg></div>
            <div class="dvl-icd-info">
              <div class="dvl-icd-name name">Spike Zones Engine</div>
              <div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span></div>
            </div>
            <div class="dvl-icd-ctrl">
              <div class="row" data-ind="spikeZones"><span class="switch"></span></div>
              <button class="gear" data-settings="spikeZones" title="Configurar Spike Zones Engine">&#9881;</button>
              <button class="dvl-star" data-star="spikeZones" type="button" title="Favoritar"><svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg></button>
            </div>
          </div>
          <div class="ind-settings" id="settings-spikeZones">

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:4px 0 4px;padding-bottom:4px;border-bottom:1px solid rgba(0,212,255,.07)">DETECÇÃO</div>
            <div class="kv"><span class="k">Sensibilidade</span><input class="num" id="szSens" type="number" min="0.3" max="5" step="0.1" value="1" style="width:56px"><span style="font-size:9px;color:#5a7090;margin-left:4px">1=normal</span></div>
            <div class="kv"><span class="k">Peso volume</span><input class="num" id="szVolMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>
            <div class="kv"><span class="k">Peso ATR range</span><input class="num" id="szAtrMult" type="number" min="0.1" max="5" step="0.1" value="1" style="width:56px"></div>
            <div class="kv"><span class="k">Nível mínimo</span>
              <select class="select" id="szMinLevel" style="width:90px">
                <option value="1">L1 (todos)</option>
                <option value="2">L2</option>
                <option value="3" selected>L3</option>
                <option value="4">L4</option>
                <option value="5">L5 (extremo)</option>
              </select>
            </div>

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">ZONAS</div>
            <div class="kv"><span class="k">Fonte da zona</span>
              <select class="select" id="szSource" style="width:108px">
                <option value="full" selected>Candle completo</option>
                <option value="body">Corpo</option>
                <option value="wick_dom">Pavio dominante</option>
              </select>
            </div>
            <div class="kv"><span class="k">ATR padding</span>
              <select class="select" id="szAtrPad" style="width:90px">
                <option value="0">0 (sem)</option>
                <option value="0.05" selected>0.05 ATR</option>
                <option value="0.10">0.10 ATR</option>
                <option value="0.20">0.20 ATR</option>
              </select>
            </div>
            <div class="kv"><span class="k">Máx. zonas principais</span>
              <select class="select" id="szMaxZones" style="width:72px">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50" selected>50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="kv"><span class="k">Merge ATR×</span><input class="num" id="szMerge" type="number" min="0" max="1" step="0.05" value="0.15" style="width:56px"></div>
            <div class="kv"><span class="k">Expirar após</span>
              <select class="select" id="szExpire" style="width:90px">
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
                <option value="1s">1s</option>
                <option value="15s">15s</option>
                <option value="30s">30s</option>
                <option value="1m">1m</option>
                <option value="3m">3m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="30m">30m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1D</option>
              </select>
            </div>
            <div class="kv"><span class="k">Max scan (barras)</span>
              <select class="select" id="szMaxScan" style="width:72px">
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="3000" selected>3000</option>
                <option value="5000">5000</option>
              </select>
            </div>
            <div class="kv"><span class="k">Extensão (barras)</span><input class="num" id="szExtend" type="number" min="0" max="200" step="5" value="20" style="width:56px"></div>
            <div class="kv"><span class="k">Nested Spike Zones</span>
              <select class="select" id="szNested" style="width:108px">
                <option value="" selected>Off</option>
                <option value="same">Mesmo TF do gráfico</option>
                <option value="1m">1m</option>
                <option value="3m">3m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
              </select>
            </div>
            <div class="kv"><span class="k">Nível mín. nested</span>
              <select class="select" id="szNestMinLvl" style="width:72px">
                <option value="2">L2</option>
                <option value="3" selected>L3</option>
                <option value="4">L4</option>
                <option value="5">L5</option>
              </select>
            </div>
            <div class="kv"><span class="k">Máx. nested / zona</span>
              <select class="select" id="szNestMax" style="width:72px">
                <option value="3">3</option>
                <option value="5" selected>5</option>
                <option value="8">8</option>
                <option value="12">12</option>
              </select>
            </div>

            <div style="font-size:7px;font-weight:700;letter-spacing:.07em;color:#4a6580;text-transform:uppercase;margin:8px 0 4px;padding-top:6px;padding-bottom:4px;border-top:1px solid rgba(0,212,255,.07);border-bottom:1px solid rgba(0,212,255,.07)">VISUAL</div>
            <div class="kv"><span class="k">Modo de cor</span>
              <select class="select" id="szColMode" style="width:108px">
                <option value="level">Por nível</option>
                <option value="recency">Por recência</option>
                <option value="hybrid" selected>Híbrido</option>
              </select>
            </div>
            <div class="kv"><span class="k">Estilo nested</span>
              <select class="select" id="szNestStyle" style="width:90px">
                <option value="dashed" selected>Tracejado</option>
                <option value="solid">Sólido</option>
                <option value="thin">Thin (só topo)</option>
              </select>
            </div>
            <div class="kv"><span class="k">Opac. nested</span><input class="num" id="szNestOp" type="number" min="0.2" max="1" step="0.05" value="0.6" style="width:56px"></div>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar nested zones</span><input type="checkbox" id="szShowNested" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Destacar candle origem</span><input type="checkbox" id="szHlOn" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar labels</span><input type="checkbox" id="szLabOn" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar volume</span><input type="checkbox" id="szLabVol" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar TF</span><input type="checkbox" id="szLabTF" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>
            <label class="kv" style="cursor:pointer"><span class="k">Mostrar status</span><input type="checkbox" id="szLabSt" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0"></label>

            <div class="hint">Spike Zones detecta candles com spike de volume/range, cria zonas L1–L5. Nested: micro-zonas dentro das zonas maiores (drill-down multi-TF). Labels centralizados dentro das zonas.</div>
          </div>
        </div>

'''
html = html[:idx_start] + NEW_CARD + html[idx_end + 1:]  # +1 skips the leading \n before the next div

# Verify the card was replaced
assert 'szNested' in html, 'szNested not found after replacement'
assert 'szNestMinLvl' in html, 'szNestMinLvl not found'

# ── 2. Replace entire DVL_SPIKE_ZONES script block ────────────────────────────
OLD_SCRIPT_COMMENT = '\n<!-- ── DVL Spike Zones Engine (Beta 0.133) ── -->'
OLD_SCRIPT_START   = '\n<script id="DVL_SPIKE_ZONES">'
# Find the start of the comment block (now showing 0.133 after version bump above)
assert OLD_SCRIPT_COMMENT in html, f'Script comment not found (version already bumped to 0.133)'
idx_script_start = html.index(OLD_SCRIPT_COMMENT)
# Find the closing </script> after it
idx_script_end = html.index('</script>', idx_script_start) + len('</script>')

NEW_SCRIPT = r"""
<!-- ── DVL Spike Zones Engine (Beta 0.133) ── -->
<script id="DVL_SPIKE_ZONES">
(function DVL_SPIKE_ZONES(){
  'use strict';

  /* ── Utilities ── */
  var E=function(id){return document.getElementById(id);};
  function nv(id,def){var n=E(id);if(!n)return def;var v=parseFloat(n.value);return Number.isFinite(v)?v:def;}
  function bv(id,def){var n=E(id);return n?n.checked:!!def;}
  function sv(id,def){var n=E(id);return n?n.value:(def||'');}
  function clp(v,a,b){return Math.max(a,Math.min(b,v));}
  function _nf(v){v=Number(v)||0;var a=Math.abs(v);if(a>=1e9)return(a/1e9).toFixed(1)+'B';if(a>=1e6)return(a/1e6).toFixed(1)+'M';if(a>=1e3)return(a/1e3).toFixed(0)+'K';return v.toFixed(0);}
  function _tfMs(tf){var n=parseInt(tf)||1;tf=tf||'';var u=tf.slice(-1).toLowerCase();if(u==='s')return n*1000;if(u==='m')return n*60000;if(u==='h')return n*3600000;if(u==='d')return n*86400000;if(u==='w')return n*604800000;return 60000;}

  /* ── Level colors L1-L5 ── */
  var COL=[null,
    {r:75, g:100,b:158},  /* L1 steel blue  */
    {r:10, g:185,b:215},  /* L2 cyan        */
    {r:0,  g:205,b:172},  /* L3 teal        */
    {r:235,g:162,b:32},   /* L4 golden      */
    {r:205,g:50, b:205}   /* L5 magenta     */
  ];

  /* ── State ── */
  var _cache=null,_cKey='';
  var _extC=null,_extK='',_extF=false;    /* main TF candles   */
  var _nestC=null,_nestK='',_nestF=false; /* nested TF candles */

  /* ── Config ── */
  function _cfg(){
    return{
      minLevel:  clp(parseInt(sv('szMinLevel','3'))||3,1,5),
      sens:      clp(nv('szSens',1.0),0.3,5),
      volMult:   clp(nv('szVolMult',1.0),0.1,5),
      atrMult:   clp(nv('szAtrMult',1.0),0.1,5),
      maxZones:  clp(parseInt(sv('szMaxZones','50'))||50,5,200),
      maxScan:   clp(parseInt(sv('szMaxScan','3000'))||3000,50,10000),
      source:    sv('szSource','full'),
      atrPad:    clp(parseFloat(sv('szAtrPad','0.05'))||0,0,1),
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
      extend:    clp(nv('szExtend',20),0,200),
      nested:    sv('szNested',''),
      nestMinLvl:clp(parseInt(sv('szNestMinLvl','3'))||3,1,5),
      nestMax:   clp(parseInt(sv('szNestMax','5'))||5,1,20),
      showNested:bv('szShowNested',true),
      nestOp:    clp(nv('szNestOp',0.6),0.1,1),
      nestStyle: sv('szNestStyle','dashed')
    };
  }

  /* ── Candle getters ── */
  var _API='https://api.binance.com';
  function _kl(x){return{t:+x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5],delta:0,buy:0,sell:0,fp:new Map()};}

  function _getCandles(){
    var tf=sv('szTf','');
    if(!tf||tf===window.S.tf)return window.S.candles;
    var wk=S.sym+'|'+tf;
    if(_extK===wk&&_extC)return _extC;
    if(!_extF||_extK!==wk){
      _extF=true;_extK=wk;_extC=null;
      fetch(_API+'/api/v3/klines?symbol='+S.sym+'&interval='+tf+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject();})
        .then(function(d){if(_extK!==wk)return;_extC=d.map(_kl);_extF=false;_cKey='';if(typeof drawSoon==='function')drawSoon();})
        .catch(function(){_extF=false;});
    }
    return window.S.candles;
  }

  function _getNestedCandles(nestTF){
    if(!nestTF)return null;
    var wk=S.sym+'|'+nestTF+'|n';
    if(_nestK===wk&&_nestC)return _nestC;
    if(!_nestF||_nestK!==wk){
      _nestF=true;_nestK=wk;_nestC=null;
      fetch(_API+'/api/v3/klines?symbol='+S.sym+'&interval='+nestTF+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject();})
        .then(function(d){if(_nestK!==wk)return;_nestC=d.map(_kl);_nestF=false;_cKey='';if(typeof drawSoon==='function')drawSoon();})
        .catch(function(){_nestF=false;});
    }
    return null;
  }

  /* ── Core spike detection (works for main and nested) ── */
  function _detectAndBuild(cs, baseOffset, fullCs, cfg, isNested){
    var n=cs.length;
    if(n<(isNested?2:10))return[];

    /* adaptive periods for small nested sets */
    var MA_P=isNested?Math.max(2,Math.min(5,n-1)):20;
    var ATR_P=isNested?Math.max(2,Math.min(5,n-1)):14;

    /* volume MA */
    var volMA=new Float64Array(n),vs=0;
    for(var i=0;i<n;i++){vs+=cs[i].v;if(i>=MA_P)vs-=cs[i-MA_P].v;volMA[i]=vs/Math.min(i+1,MA_P);}

    /* ATR */
    var atrArr=new Float64Array(n),atrSum=0;
    for(var i=0;i<n;i++){
      var c=cs[i],pc=i>0?cs[i-1].c:c.o;
      var tr=Math.max(c.h-c.l,Math.abs(c.h-pc),Math.abs(c.l-pc));
      atrSum+=tr;
      if(i>=ATR_P){var oc=cs[i-ATR_P],op2=i>ATR_P?cs[i-ATR_P-1].c:oc.o;atrSum-=Math.max(oc.h-oc.l,Math.abs(oc.h-op2),Math.abs(oc.l-op2));}
      atrArr[i]=atrSum/Math.min(i+1,ATR_P);
    }

    /* level thresholds scaled by sensitivity */
    var s=cfg.sens||1;
    var T=[0,1.5*s,2.5*s,4.0*s,6.5*s,10.0*s];
    var WARMUP=isNested?0:Math.max(MA_P,ATR_P);
    var minLvl=isNested?cfg.nestMinLvl:cfg.minLevel;
    var candidates=[];

    for(var i=WARMUP;i<n;i++){
      var c=cs[i],vm=volMA[i]||1,at=atrArr[i]||1;
      var range=c.h-c.l,body=Math.abs(c.c-c.o);
      var uw=c.h-Math.max(c.o,c.c),lw=Math.min(c.o,c.c)-c.l;
      var vr=c.v/vm,rr=range/at;
      var score=cfg.volMult*vr+cfg.atrMult*rr;
      var br=range>1e-12?body/range:0;
      if(br>0.62)score+=0.40;
      var mw=Math.max(uw,lw);
      if(range>1e-12&&mw/range>0.52)score+=0.25;
      if(vr>3.5)score+=0.60;
      if(c.delta&&Math.abs(c.delta)>c.v*0.35)score+=0.35;
      var level=score<T[1]?0:score<T[2]?1:score<T[3]?2:score<T[4]?3:score<T[5]?4:5;
      if(level<1||level<minLvl)continue;
      var dir=c.c>c.o?'bull':c.c<c.o?'bear':'neutral';
      var pad=at*(cfg.atrPad||0);
      var hi,lo;
      if(cfg.source==='body'){hi=Math.max(c.o,c.c)+pad;lo=Math.min(c.o,c.c)-pad;}
      else if(cfg.source==='wick_dom'){if(uw>lw){hi=c.h+pad;lo=Math.max(c.o,c.c)-pad;}else{hi=Math.min(c.o,c.c)+pad;lo=c.l-pad;}}
      else{hi=c.h+pad;lo=c.l-pad;}
      if(hi<=lo)lo=hi-at*0.01;
      candidates.push({id:baseOffset+i,srcIdx:baseOffset+i,srcTs:c.t,level:level,rawScore:score,hi:hi,lo:lo,mid:(hi+lo)/2,dir:dir,vol:c.v,atr:at});
    }
    if(!candidates.length)return[];

    /* sort newest first for merge priority */
    candidates.sort(function(a,b){return b.srcIdx-a.srcIdx;});

    /* merge overlapping/nearby */
    var used=new Uint8Array(candidates.length),merged=[];
    for(var i=0;i<candidates.length;i++){
      if(used[i])continue;
      var z=Object.assign({},candidates[i]);
      var mt=(z.atr||1)*(isNested?cfg.mergeDist*0.4:cfg.mergeDist);
      for(var j=i+1;j<candidates.length;j++){
        if(used[j])continue;
        var z2=candidates[j];
        if(z2.lo<=z.hi+mt&&z2.hi>=z.lo-mt){
          used[j]=1;
          if(z2.level>z.level){z.level=z2.level;z.rawScore=z2.rawScore;}
          z.hi=Math.max(z.hi,z2.hi);z.lo=Math.min(z.lo,z2.lo);z.mid=(z.hi+z.lo)/2;z.vol=Math.max(z.vol,z2.vol);
        }
      }
      merged.push(z);
    }

    /* status & expiry (skip for nested) */
    var fc=fullCs||cs;
    var now=fc.length-1;
    var final_=[];
    for(var zi=0;zi<merged.length;zi++){
      var z=merged[zi];
      if(isNested){z.age=0;z.tests=0;z.isRecent=true;z.status='fresh';final_.push(z);continue;}
      z.age=now-Math.min(z.srcIdx,now);
      if(cfg.expire>0&&z.age>cfg.expire)continue;
      var tests=0,chkS=Math.min(fc.length-1,z.srcIdx+1),chkE=Math.min(fc.length-1,z.srcIdx+(cfg.expire||250)+5);
      for(var k=chkS;k<=chkE&&k<fc.length;k++){var ck=fc[k];if(ck.l<=z.hi&&ck.h>=z.lo)tests++;}
      z.tests=tests;z.isRecent=z.age<50;
      z.status=tests===0?'fresh':tests<cfg.maxTests?'tested':'weakened';
      final_.push(z);
    }

    final_.sort(function(a,b){var ld=b.level-a.level;return ld!==0?ld:b.srcIdx-a.srcIdx;});
    return final_.slice(0,isNested?cfg.nestMax:cfg.maxZones);
  }

  /* ── Nested zones: per main zone, find inner spikes ── */
  function _computeNested(mainZones,nestCs,mainTfMs,nestCfg){
    var allNested=[];
    for(var zi=0;zi<mainZones.length;zi++){
      var mz=mainZones[zi];
      var t0=mz.srcTs,t1=t0+mainTfMs;
      var inner=[];
      for(var i=0;i<nestCs.length;i++){var c=nestCs[i];if(c.t>=t0&&c.t<t1)inner.push(c);}
      if(inner.length<2)continue;
      var izones=_detectAndBuild(inner,0,inner,nestCfg,true);
      for(var j=0;j<izones.length;j++){izones[j].isNested=true;izones[j].parentId=mz.id;allNested.push(izones[j]);}
    }
    return allNested;
  }

  /* ── Main compute ── */
  function _computeAll(cs,cfg,nestCs){
    var maxScan=Math.min(cs.length,cfg.maxScan),base=Math.max(0,cs.length-maxScan);
    var sl=base>0?cs.slice(base):cs;
    var main=_detectAndBuild(sl,base,cs,cfg,false);
    var nested=[];
    if(nestCs&&nestCs.length>=2&&cfg.nested&&main.length){
      var mainTfMs=_tfMs(cfg.tf||S.tf);
      nested=_computeNested(main,nestCs,mainTfMs,cfg);
    }
    return{main:main,nested:nested};
  }

  /* ── Draw ── */
  function drawSpikeZones(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.spikeZones||!S.candles.length)return;
    var cfg=_cfg();
    var cs=_getCandles();
    if(!cs||cs.length<10)return;

    /* resolve nested TF */
    var nestTF='';
    if(cfg.nested){
      nestTF=cfg.nested==='same'?S.tf:cfg.nested;
      if(nestTF===(cfg.tf||S.tf))nestTF=''; /* disable if identical to main */
    }
    var nestCs=nestTF?_getNestedCandles(nestTF):null;

    /* cache key */
    var tf=cfg.tf||S.tf;
    var ck=[cs.length,cs[0]?cs[0].t:0,S.sym,tf,
            cfg.minLevel,cfg.sens,cfg.volMult,cfg.atrMult,
            cfg.maxZones,cfg.maxScan,cfg.source,cfg.atrPad,
            cfg.mergeDist,cfg.expire,cfg.maxTests,
            nestTF,cfg.nestMinLvl,cfg.nestMax,
            nestCs?nestCs.length:0].join('|');

    if(_cKey!==ck){
      _cache=_computeAll(cs,cfg,nestCs);_cKey=ck;
      if(window.S)window.S.spikeZones=_cache.main;
    }

    var main=(_cache&&_cache.main)||[];
    var nested=(_cache&&_cache.nested)||[];
    if(!main.length&&!nested.length)return;

    var rp=typeof RP==='function'?RP():68;
    var xL=0,bwPx=typeof bw==='number'?bw:4;
    var xR=W-rp+Math.min(cfg.extend*bwPx,80);
    var usingMTF=cfg.tf&&cfg.tf!==S.tf;
    var expBound=cfg.expire>0?cfg.expire:250;

    ctx.textBaseline='middle'; /* ensures vertical centering for all text */

    /* ══ MAIN ZONES ══ */
    for(var zi=0;zi<main.length;zi++){
      var z=main[zi];
      var y1=sc.y(z.hi),y2=sc.y(z.lo);
      if(y1>=H||y2<=0)continue;
      var boxH=Math.max(1,y2-y1);
      var col=COL[z.level]||COL[5];
      var recency=Math.max(0,1-(z.age/expBound));
      var lf=z.level/5;

      /* ── opacity by mode (stronger than v0.132) ── */
      var fillOp,strOp;
      if(cfg.colMode==='level'){
        fillOp=0.06+0.11*lf;
        strOp=Math.min(0.88,0.32+0.45*lf);
      }else if(cfg.colMode==='recency'){
        fillOp=0.03+0.15*recency;
        strOp=Math.min(0.88,0.16+0.68*recency);
      }else{
        fillOp=0.045+0.065*lf+0.075*recency;
        strOp=Math.min(0.84,0.28+0.32*lf+0.26*recency);
      }
      if(z.status==='weakened'){fillOp*=0.42;strOp*=0.42;}
      else if(z.status==='tested'){fillOp*=0.76;strOp*=0.76;}

      /* fill */
      ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fillOp.toFixed(3)+')';
      ctx.fillRect(xL,y1,xR-xL,boxH);

      /* borders */
      ctx.lineWidth=z.level>=4?1.5:1;
      ctx.setLineDash(z.status==='weakened'?[3,3]:[]);
      ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+strOp.toFixed(3)+')';
      ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);ctx.stroke();
      ctx.setLineDash([]);

      /* glow for fresh L3+ recent zones */
      if(z.status==='fresh'&&z.level>=3&&recency>0.5){
        ctx.save();
        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.55)';ctx.shadowBlur=5;
        ctx.lineWidth=1;ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+(strOp*0.5).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);ctx.stroke();
        ctx.restore();ctx.setLineDash([]);
      }

      /* label — perfectly centred (textBaseline=middle) */
      if(cfg.labOn){
        var ym=y1+boxH/2; /* exact vertical centre */
        ctx.font='bold 7px monospace';ctx.textAlign='left';
        var parts=['L'+z.level];
        if(cfg.labTF&&usingMTF)parts.push(tf.toUpperCase());
        if(cfg.labVol&&z.vol>0)parts.push('$'+_nf(z.vol));
        var lbl=parts.join(' · ');
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.15).toFixed(3)+')';
        ctx.fillText(lbl,xL+5,ym);
        if(cfg.labSt&&boxH>8){
          var stX=xL+5+ctx.measureText(lbl).width+5;
          var st='',sc2='';
          if(z.status==='fresh'&&z.isRecent){st='NEW';sc2='rgba(0,220,110,0.92)';}
          else if(z.status==='tested'){st='TESTED';sc2='rgba(235,162,32,0.82)';}
          else if(z.status==='weakened'){st='WEAK';sc2='rgba(155,90,90,0.78)';}
          if(st){ctx.font='7px monospace';ctx.fillStyle=sc2;ctx.fillText(st,stX,ym);}
        }
      }

      /* right-edge level indicator */
      if(boxH>4){
        ctx.font='bold 7px monospace';ctx.textAlign='right';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,strOp*1.1).toFixed(3)+')';
        ctx.fillText('L'+z.level,W-rp-3,y1+boxH/2);
      }
    }

    /* ══ NESTED ZONES ══ */
    if(cfg.showNested&&nested.length){
      var nop=cfg.nestOp||0.6,nSt=cfg.nestStyle||'dashed';
      var nestTFLbl=nestTF?nestTF.toUpperCase():'';
      for(var zi=0;zi<nested.length;zi++){
        var z=nested[zi];
        var y1=sc.y(z.hi),y2=sc.y(z.lo);
        if(y1>=H||y2<=0)continue;
        var boxH=Math.max(1,y2-y1);
        var col=COL[z.level]||COL[5];
        var lf=z.level/5;
        var fOp=nop*(0.02+0.04*lf),sOp=nop*(0.22+0.32*lf);

        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+fOp.toFixed(3)+')';
        ctx.fillRect(xL,y1,xR-xL,boxH);

        ctx.lineWidth=1;
        ctx.setLineDash(nSt==='dashed'?[2,3]:[]);
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+sOp.toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(xL,y1);ctx.lineTo(xR,y1);
        if(nSt!=='thin'){ctx.moveTo(xL,y2);ctx.lineTo(xR,y2);}
        ctx.stroke();ctx.setLineDash([]);

        /* nested label — centred */
        if(cfg.labOn&&boxH>5){
          ctx.font='7px monospace';ctx.textAlign='left';
          var nLbl='iL'+z.level+(cfg.labTF&&nestTFLbl?' · '+nestTFLbl:'');
          ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,sOp*1.1).toFixed(3)+')';
          ctx.fillText(nLbl,xL+4,y1+boxH/2);
        }
      }
    }

    /* ══ SOURCE CANDLE HIGHLIGHTS (current TF only) ══ */
    if(cfg.hlOn&&!usingMTF){
      ctx.textAlign='center';
      for(var zi=0;zi<main.length;zi++){
        var z=main[zi];
        var si=z.srcIdx;
        if(si<0||si>=S.candles.length||si<V.a-2||si>V.b+2)continue;
        var c=S.candles[si];if(!c)continue;
        var col=COL[z.level]||COL[5];
        var cx=x(si),chy=sc.y(c.h),cly=sc.y(c.l);
        var isUp=c.c>=c.o,hlOp=0.32+0.45*(z.level/5);

        ctx.save();
        ctx.shadowColor='rgba('+col.r+','+col.g+','+col.b+',0.55)';ctx.shadowBlur=2;
        ctx.strokeStyle='rgba('+col.r+','+col.g+','+col.b+','+hlOp.toFixed(3)+')';
        ctx.lineWidth=1.5;ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(cx,chy);ctx.lineTo(cx,cly);ctx.stroke();
        ctx.restore();ctx.setLineDash([]);

        /* triangle above/below candle tip */
        var triY=isUp?chy-3:cly+3,triD=isUp?-1:1;
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+(hlOp*1.1).toFixed(3)+')';
        ctx.beginPath();ctx.moveTo(cx-3.5,triY);ctx.lineTo(cx+3.5,triY);ctx.lineTo(cx,triY+triD*5);ctx.closePath();ctx.fill();

        /* S3/S4/S5 label */
        var lblY=isUp?chy-10:cly+13;
        ctx.font='bold 7px monospace';
        ctx.fillStyle='rgba('+col.r+','+col.g+','+col.b+','+Math.min(1,hlOp+0.15).toFixed(3)+')';
        ctx.fillText('S'+z.level,cx,lblY);
      }
      ctx.textAlign='left';
    }

    /* reset ctx state */
    ctx.lineWidth=1;ctx.setLineDash([]);ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
  }

  /* ── Exports ── */
  window.__drawSpikeZones=drawSpikeZones;
  window.__szInvalidate=function(){_cKey='';_extC=null;_extK='';_extF=false;_nestC=null;_nestK='';_nestF=false;};

  /* ── Event wiring ── */
  var SZ_IDS=new Set([
    'szSens','szVolMult','szAtrMult','szMinLevel','szMaxZones',
    'szMaxScan','szSource','szAtrPad','szMerge','szExpire','szMaxTests',
    'szHlOn','szLabOn','szLabVol','szLabTF','szLabSt','szColMode','szTf','szExtend',
    'szNested','szNestMinLvl','szNestMax','szShowNested','szNestOp','szNestStyle'
  ]);
  function _szRd(){_cKey='';if(typeof drawSoon==='function')drawSoon();}

  document.addEventListener('input',function(ev){
    if(!SZ_IDS.has(ev.target&&ev.target.id))return;
    _szRd();
  });
  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!SZ_IDS.has(id))return;
    if(id==='szTf'){_extC=null;_extK='';_extF=false;}
    if(id==='szNested'||id==='szNestMinLvl'||id==='szNestMax'){_nestC=null;_nestK='';_nestF=false;}
    _szRd();
  });

  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);

})();
</script>
"""

html = html[:idx_script_start] + NEW_SCRIPT + html[idx_script_end:]

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_133.py applied — Beta 0.133')
print('  + Zonas mais fortes (opacidade fill +50%, stroke +30%)')
print('  + Labels perfeitamente centrados (textBaseline=middle)')
print('  + szTf: mais opções (1s/15s/30s/3m/…)')
print('  + Nested Spike Zones: mini-zonas dentro das zonas maiores (MTF drill-down)')
print('  + _detectAndBuild() unificado para main e nested')
print('  + _computeNested(): filtra por janela de tempo do candle maior')
print('  + Draw de nested: semi-transparente, tracejado, label iL3/iL4/iL5')
