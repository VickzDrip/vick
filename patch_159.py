#!/usr/bin/env python3
"""patch_159.py — Beta 0.159: Weighted HVN Zones
   - Volume-weighted bucket algorithm (weight by volume ratio, ATR compression, recency)
   - Zone enrichment: weightedVol, rawVol, avgWeight, spikeCandlesCount, strengthScore
   - Strength mode: Raw / Weighted / Hybrid
   - Candle highlight overlay (Source / Weighted / Strong zone candles)
   - HVN Signals compatibility fields added to each zone
   - Dead _ptMaIds code removed from HVN script
"""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('DepthVisionLab-v106_REAL_UI/public/index.html','r',encoding='utf-8') as f:
    html = f.read()

assert html.count('Beta 0.158') >= 10, 'Beta 0.158 not found'
html = html.replace('Beta 0.158', 'Beta 0.159')

# ── 1. Replace HVN Zones settings panel UI ───────────────────────────────────
OLD_VZ_SETTINGS = (
    '          <div class="ind-settings" id="settings-volZones">\n'
    '            <div class="kv"><span class="k">TF análise</span>'
    '<select class="select" id="vzTf" style="width:72px">'
    '<option value="">Atual</option><option value="1m">1m</option>'
    '<option value="3m">3m</option><option value="5m">5m</option>'
    '<option value="15m">15m</option><option value="30m">30m</option>'
    '<option value="1h">1h</option><option value="2h">2h</option>'
    '<option value="4h">4h</option><option value="6h">6h</option>'
    '<option value="12h">12h</option><option value="1d">1d</option>'
    '<option value="3d">3d</option><option value="1w">1w</option></select></div>\n'
    '            <div class="kv"><span class="k">Faixa % preço</span>'
    '<input class="num" id="vzBucket" type="number" min="0.01" max="5" step="0.01" value="0.1" style="width:70px"></div>\n'
    '            <div class="kv"><span class="k">Tamanho ATR×</span>'
    '<input class="num" id="vzBucketAtr" type="number" min="0" max="5" step="0.1" value="0" style="width:70px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">0=fixo</span></div>\n'
    '            <div class="kv"><span class="k">Top zonas</span>'
    '<input class="num" id="vzTopN" type="number" min="1" max="30" step="1" value="12"></div>\n'
    '            <div class="kv"><span class="k">Mín. toques</span>'
    '<input class="num" id="vzMinTouch" type="number" min="1" max="200" step="1" value="2"></div>\n'
    '            <div class="kv"><span class="k">Mesclar faixas</span>'
    '<input class="num" id="vzMerge" type="number" min="0" max="20" step="1" value="0"></div>\n'
    '            <div class="kv"><span class="k">Extensão (barras)</span>'
    '<input class="num" id="vzExtend" type="number" min="0" max="500" step="1" value="20"></div>\n'
    '            <div class="kv"><span class="k">Cor</span>'
    '<label style="position:relative;width:28px;height:28px;display:inline-flex;flex-shrink:0;cursor:pointer;border-radius:4px;border:1px solid #1e2a40;overflow:hidden">'
    '<div id="vzColorSwatch" style="width:100%;height:100%;background:#f59e0b;pointer-events:none"></div>'
    '<input id="vzColor" type="color" value="#f59e0b" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0"></label></div>\n'
    '            <div class="hint">Zonas HVN — acumula volume de todos os candles por faixa de preço. Mostra onde o mercado mais negociou historicamente. Opacidade proporcional ao volume acumulado.</div>\n'
    '          </div>'
)
assert OLD_VZ_SETTINGS in html, 'volZones settings panel anchor not found'
NEW_VZ_SETTINGS = (
    '          <div class="ind-settings" id="settings-volZones">\n'
    '            <div class="kv"><span class="k">TF análise</span>'
    '<select class="select" id="vzTf" style="width:72px">'
    '<option value="">Atual</option><option value="1m">1m</option>'
    '<option value="3m">3m</option><option value="5m">5m</option>'
    '<option value="15m">15m</option><option value="30m">30m</option>'
    '<option value="1h">1h</option><option value="2h">2h</option>'
    '<option value="4h">4h</option><option value="6h">6h</option>'
    '<option value="12h">12h</option><option value="1d">1d</option>'
    '<option value="3d">3d</option><option value="1w">1w</option></select></div>\n'
    '            <div class="kv"><span class="k">Faixa % preço</span>'
    '<input class="num" id="vzBucket" type="number" min="0.01" max="5" step="0.01" value="0.1" style="width:70px"></div>\n'
    '            <div class="kv"><span class="k">Tamanho ATR×</span>'
    '<input class="num" id="vzBucketAtr" type="number" min="0" max="5" step="0.1" value="0" style="width:70px">'
    '<span style="font-size:9px;color:#5a7090;margin-left:4px">0=fixo</span></div>\n'
    '            <div class="kv"><span class="k">Top zonas</span>'
    '<input class="num" id="vzTopN" type="number" min="1" max="30" step="1" value="12"></div>\n'
    '            <div class="kv"><span class="k">Mín. toques</span>'
    '<input class="num" id="vzMinTouch" type="number" min="1" max="200" step="1" value="2"></div>\n'
    '            <div class="kv"><span class="k">Mesclar faixas</span>'
    '<input class="num" id="vzMerge" type="number" min="0" max="20" step="1" value="0"></div>\n'
    '            <div class="kv"><span class="k">Extensão (barras)</span>'
    '<input class="num" id="vzExtend" type="number" min="0" max="500" step="1" value="20"></div>\n'
    '            <div class="kv"><span class="k">Cor</span>'
    '<label style="position:relative;width:28px;height:28px;display:inline-flex;flex-shrink:0;cursor:pointer;border-radius:4px;border:1px solid #1e2a40;overflow:hidden">'
    '<div id="vzColorSwatch" style="width:100%;height:100%;background:#f59e0b;pointer-events:none"></div>'
    '<input id="vzColor" type="color" value="#f59e0b" style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0"></label></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#f0b429;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">WEIGHTED HVN</div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Enable Weighted</span>'
    '<input type="checkbox" id="vzWeightOn" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Vol Weight MA</span>'
    '<input class="num" id="vzWeightMA" type="number" min="5" max="500" step="1" value="50" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Weight Strength</span>'
    '<input class="num" id="vzWeightStr" type="number" min="0.1" max="3" step="0.1" value="1.0" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Max Candle Wt.</span>'
    '<input class="num" id="vzMaxWeight" type="number" min="1" max="10" step="0.5" value="4.0" style="width:52px"></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">ATR Compression</span>'
    '<input type="checkbox" id="vzAtrComp" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Compres. Boost</span>'
    '<input class="num" id="vzCompBoost" type="number" min="1" max="3" step="0.05" value="1.25" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Wide Penalty</span>'
    '<input class="num" id="vzWidePen" type="number" min="0.1" max="1" step="0.05" value="0.75" style="width:52px"></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Recency Weight</span>'
    '<input type="checkbox" id="vzRecency" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Recency Strength</span>'
    '<input class="num" id="vzRecStr" type="number" min="0" max="2" step="0.05" value="0.35" style="width:52px"></div>\n'
    '            <div class="kv"><span class="k">Strength Mode</span>'
    '<select class="select" id="vzStrMode" style="width:80px">'
    '<option value="weighted" selected>Weighted</option>'
    '<option value="raw">Raw Vol</option>'
    '<option value="hybrid">Hybrid</option></select></div>\n'
    '            <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>\n'
    '            <div style="font-size:9px;color:#f0b429;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">CANDLE HIGHLIGHT</div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Highlight Candles</span>'
    '<input type="checkbox" id="vzHlOn" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Mode</span>'
    '<select class="select" id="vzHlMode" style="width:80px">'
    '<option value="source" selected>Source</option>'
    '<option value="weighted">Weighted</option>'
    '<option value="strong">Strong Zone</option></select></div>\n'
    '            <div class="kv"><span class="k">Threshold</span>'
    '<input class="num" id="vzHlThresh" type="number" min="0.5" max="10" step="0.1" value="1.5" style="width:52px"></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Level Color</span>'
    '<input type="checkbox" id="vzHlLvlColor" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Bull color</span>'
    '<input type="color" id="vzHlBull" value="#22d3ee" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">Bear color</span>'
    '<input type="color" id="vzHlBear" value="#f87171" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <div class="kv"><span class="k">Neutral color</span>'
    '<input type="color" id="vzHlNeutral" value="#94a3b8" style="width:36px;height:20px;border:none;background:none;cursor:pointer;padding:0"></div>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Border Highlight</span>'
    '<input type="checkbox" id="vzHlBorder" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <label class="kv" style="cursor:pointer;"><span class="k">Wick Highlight</span>'
    '<input type="checkbox" id="vzHlWick" checked style="width:14px;height:14px;accent-color:#f0b429;cursor:pointer;flex-shrink:0;"></label>\n'
    '            <div class="kv"><span class="k">Highlight Opacity</span>'
    '<input class="num" id="vzHlOp" type="number" min="0.05" max="1" step="0.05" value="0.35" style="width:52px"></div>\n'
    '            <div class="hint">Weighted HVN — candles com volume anormal têm mais peso. Highlight mostra quais candles originaram cada zona.</div>\n'
    '          </div>'
)
html = html.replace(OLD_VZ_SETTINGS, NEW_VZ_SETTINGS, 1)

# ── 2. Replace entire HVN Zones script block ─────────────────────────────────
OLD_HVN_SCRIPT = '<!-- ── High Volume Zones (HVN) ── -->\n<script>\n(function(){'
assert OLD_HVN_SCRIPT in html, 'HVN script start anchor not found'

OLD_HVN_SCRIPT_END = (
    '  setTimeout(function(){if(typeof drawSoon===\'function\')drawSoon();},0);\n'
    '  var _ptMaIds=new Set([\'ptDeltaMA\',\'ptPressureMA\',\'ptPulseMA\']);\n'
    '  function _ptMaRd(){_cfgCache=null;if(typeof drawSoon===\'function\')drawSoon();}\n'
    '  document.addEventListener(\'input\',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});\n'
    '  document.addEventListener(\'change\',function(ev){if(_ptMaIds.has(ev.target&&ev.target.id))_ptMaRd();});\n'
    '})();\n</script>'
)
assert OLD_HVN_SCRIPT_END in html, 'HVN script end anchor not found'

# Find and replace the full block
old_full = OLD_HVN_SCRIPT + html.split(OLD_HVN_SCRIPT, 1)[1].split(OLD_HVN_SCRIPT_END, 1)[0] + OLD_HVN_SCRIPT_END

NEW_HVN_SCRIPT = r"""<!-- ── High Volume Zones (HVN) — Weighted ── -->
<script>
(function(){
  'use strict';
  function E(id){return document.getElementById(id);}
  function nFmt(v){v=Number(v)||0;var a=Math.abs(v),s=v<0?'-':'';if(a>=1e9)return s+(a/1e9).toFixed(2)+'B';if(a>=1e6)return s+(a/1e6).toFixed(1)+'M';if(a>=1e3)return s+(a/1e3).toFixed(0)+'K';return s+Math.round(a);}
  function priceFmt(v){return v>=1000?v.toLocaleString('en-US',{maximumFractionDigits:0}):v.toFixed(2);}
  function numVal(id,def){var n=E(id);if(!n)return def;var v=parseFloat(n.value);return Number.isFinite(v)?v:def;}
  function boolVal(id,def){var n=E(id);return n?n.checked:def;}
  function strVal(id,def){var n=E(id);return n?n.value:def;}
  function hexToRgb(hex){try{hex=String(hex||'').replace('#','');if(hex.length===3)hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];return{r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};}catch(_){return{r:240,g:180,b:41};}}

  function getSettings(cs){
    var bktPct=Math.max(0.01,numVal('vzBucket',0.1));
    var bktAtr=Math.max(0,numVal('vzBucketAtr',0));
    if(bktAtr>0&&cs&&cs.length>=14){
      var _atrs=calcATR(cs,14);var _la=_atrs.filter(function(v){return v!=null;}).at(-1)||0;
      var _lp=cs.at(-1).c||0;
      if(_la>0&&_lp>0)bktPct=Math.max(0.01,_la*bktAtr/_lp*100);
    }
    return{
      bucketPct:bktPct,
      topN:Math.max(1,Math.min(30,numVal('vzTopN',12))),
      minTouch:Math.max(1,Math.round(numVal('vzMinTouch',2))),
      mergeGap:Math.max(0,Math.round(numVal('vzMerge',0))),
      extend:Math.max(0,Math.round(numVal('vzExtend',20))),
      color:strVal('vzColor','#f59e0b'),
      bucketAtr:bktAtr,
      /* weighted HVN */
      weightOn:boolVal('vzWeightOn',true),
      weightMA:Math.max(5,Math.round(numVal('vzWeightMA',50))),
      weightStr:Math.max(0.1,Math.min(3,numVal('vzWeightStr',1.0))),
      maxWeight:Math.max(1,Math.min(10,numVal('vzMaxWeight',4.0))),
      atrComp:boolVal('vzAtrComp',true),
      compBoost:Math.max(1,Math.min(3,numVal('vzCompBoost',1.25))),
      widePen:Math.max(0.1,Math.min(1,numVal('vzWidePen',0.75))),
      recencyOn:boolVal('vzRecency',true),
      recStr:Math.max(0,Math.min(2,numVal('vzRecStr',0.35))),
      strMode:strVal('vzStrMode','weighted'),
      /* candle highlight */
      hlOn:boolVal('vzHlOn',true),
      hlMode:strVal('vzHlMode','source'),
      hlThresh:Math.max(0.5,numVal('vzHlThresh',1.5)),
      hlLvlColor:boolVal('vzHlLvlColor',true),
      hlBull:strVal('vzHlBull','#22d3ee'),
      hlBear:strVal('vzHlBear','#f87171'),
      hlNeutral:strVal('vzHlNeutral','#94a3b8'),
      hlBorder:boolVal('vzHlBorder',true),
      hlWick:boolVal('vzHlWick',true),
      hlOp:Math.max(0.05,Math.min(1,numVal('vzHlOp',0.35)))
    };
  }

  /* ── Multi-TF candle fetch ── */
  var _vzExtCandles=null,_vzExtKey='',_vzExtFetching=false;
  function getVZCandles(){
    var sel=E('vzTf');var vzTf=sel?sel.value:'';
    if(!vzTf||vzTf===S.tf)return S.candles;
    var wantKey=S.sym+'|'+vzTf;
    if(_vzExtKey===wantKey&&_vzExtCandles)return _vzExtCandles;
    if(!_vzExtFetching||_vzExtKey!==wantKey){
      _vzExtFetching=true;_vzExtKey=wantKey;_vzExtCandles=null;
      fetch(API+'/api/v3/klines?symbol='+S.sym+'&interval='+vzTf+'&limit=1000')
        .then(function(r){return r.ok?r.json():Promise.reject(r.status);})
        .then(function(d){if(_vzExtKey!==wantKey)return;_vzExtCandles=d.map(klineToCandle);_vzExtFetching=false;_vzCacheKey='';if(typeof drawSoon==='function')drawSoon();})
        .catch(function(e){_vzExtFetching=false;console.warn('HVN TF fetch:',e);});
    }
    return S.candles;
  }

  /* ── Volume MA (running sum O(n)) ── */
  function computeVolMA(cs,period){
    var N=cs.length,out=new Float64Array(N),sum=0;
    for(var i=0;i<N;i++){sum+=cs[i].v||0;if(i>=period)sum-=cs[i-period].v||0;out[i]=sum/Math.min(i+1,period);}
    return out;
  }

  /* ── Per-candle weight ── */
  function getCandleWeight(c,i,volMA,atrArr,s){
    var w=1;
    if(s.weightOn){
      var ma=Math.max(1e-9,volMA[i]||1);
      var ratio=Math.max(1,(c.v||0)/ma);
      w*=Math.min(Math.pow(ratio,s.weightStr),s.maxWeight);
    }
    if(s.atrComp&&atrArr){
      var atr=atrArr[i]||0;
      if(atr>0){var rr=(c.h-c.l)/atr;if(rr<0.8)w*=s.compBoost;else if(rr>2.0)w*=s.widePen;}
    }
    if(s.recencyOn){
      var t=i/Math.max(1,volMA.length-1);
      w*=(1+s.recStr*t);
    }
    return w;
  }

  /* ── HVN bucket computation (weighted) ── */
  var _vzCache=null,_vzCacheKey='';

  function computeHVN(cs,s){
    if(cs.length<2)return null;
    var lastPrice=cs[cs.length-1].c;
    var bucketSize=lastPrice*s.bucketPct/100;
    if(bucketSize<=0)return null;

    /* pre-compute weight arrays */
    var volMA=computeVolMA(cs,s.weightMA);
    var atrArr=null;
    try{if(s.atrComp)atrArr=calcATR(cs,14);}catch(_){}

    var priceMin=Infinity,priceMax=-Infinity;
    for(var ci=0;ci<cs.length;ci++){if(cs[ci].l<priceMin)priceMin=cs[ci].l;if(cs[ci].h>priceMax)priceMax=cs[ci].h;}
    var nBuckets=Math.min(8000,Math.ceil((priceMax-priceMin)/bucketSize)+1);

    var vols=new Float64Array(nBuckets);
    var wvols=new Float64Array(nBuckets);   /* weighted volume */
    var buyV=new Float64Array(nBuckets);
    var sellV=new Float64Array(nBuckets);
    var tchs=new Uint32Array(nBuckets);
    var maxW=new Float32Array(nBuckets);
    var spikes=new Uint16Array(nBuckets);   /* candles w/ weight >= hlThresh */

    /* store per-candle weights for highlight system */
    var candleWeights=new Float32Array(cs.length);

    for(var ci=0;ci<cs.length;ci++){
      var c=cs[ci];
      var w=getCandleWeight(c,ci,volMA,atrArr,s);
      candleWeights[ci]=w;
      var baseDV=c.v*c.c;
      var dv=baseDV*w;
      var rawDV=baseDV;
      var range=c.h-c.l;
      var bf=range>0?(c.c-c.l)/range:0.5;
      var sf=1-bf;
      var loIdx=Math.max(0,Math.floor((c.l-priceMin)/bucketSize));
      var hiIdx=Math.min(nBuckets-1,Math.floor((c.h-priceMin)/bucketSize));
      var isSpike=w>=s.hlThresh?1:0;
      if(loIdx===hiIdx){
        vols[loIdx]+=rawDV;wvols[loIdx]+=dv;
        buyV[loIdx]+=dv*bf;sellV[loIdx]+=dv*sf;
        tchs[loIdx]++;
        if(w>maxW[loIdx])maxW[loIdx]=w;
        if(isSpike)spikes[loIdx]++;
      }else{
        var inv=range>0?1/range:1/(hiIdx-loIdx+1);
        for(var b=loIdx;b<=hiIdx;b++){
          var bLo=priceMin+b*bucketSize,bHi=bLo+bucketSize;
          var frac=(Math.min(c.h,bHi)-Math.max(c.l,bLo))*(range>0?inv:1);
          vols[b]+=rawDV*frac;wvols[b]+=dv*frac;
          buyV[b]+=dv*frac*bf;sellV[b]+=dv*frac*sf;
          tchs[b]++;
          if(w>maxW[b])maxW[b]=w;
          if(isSpike)spikes[b]++;
        }
      }
    }

    /* pick buckets */
    var buckets=[];
    for(var i=0;i<nBuckets;i++){
      if(tchs[i]>=s.minTouch&&vols[i]>0){
        buckets.push({i:i,vol:vols[i],wvol:wvols[i],bv:buyV[i],sv:sellV[i],touches:tchs[i],mw:maxW[i],sp:spikes[i]});
      }
    }
    if(!buckets.length)return null;

    /* sort and select by weighted vol (or raw if weight off) */
    var sortKey=s.weightOn?'wvol':'vol';
    var byVol=buckets.slice().sort(function(a,b){return b[sortKey]-a[sortKey];});
    var minSep=Math.max(1,Math.floor(nBuckets/(s.topN*1.5)));
    var selIdx=[];
    for(var k=0;k<byVol.length;k++){
      var bk=byVol[k];
      var ok=true;
      for(var m=0;m<selIdx.length;m++){if(Math.abs(bk.i-selIdx[m])<minSep){ok=false;break;}}
      if(ok)selIdx.push(bk.i);
      if(selIdx.length>=s.topN*2)break;
    }
    if(!selIdx.length)return null;

    var topSet=new Set(selIdx);
    var top=buckets.filter(function(b){return topSet.has(b.i);}).sort(function(a,b){return a.i-b.i;});
    if(!top.length)return null;

    /* merge adjacent */
    var zones=[];
    var zn={
      lo:priceMin+top[0].i*bucketSize,hi:priceMin+(top[0].i+1)*bucketSize,
      totalVol:top[0].vol,weightedVol:top[0].wvol,
      totalBuyVol:top[0].bv,totalSellVol:top[0].sv,
      totalTouches:top[0].touches,
      maxWeight:top[0].mw,spikeCandlesCount:top[0].sp
    };
    var lastI=top[0].i;
    for(var k=1;k<top.length;k++){
      var b=top[k];
      if(b.i-lastI<=s.mergeGap+1){
        zn.hi=priceMin+(b.i+1)*bucketSize;
        zn.totalVol+=b.vol;zn.weightedVol+=b.wvol;
        zn.totalBuyVol+=b.bv;zn.totalSellVol+=b.sv;
        zn.totalTouches+=b.touches;
        if(b.mw>zn.maxWeight)zn.maxWeight=b.mw;
        zn.spikeCandlesCount+=b.sp;
      }else{
        zones.push(zn);
        zn={lo:priceMin+b.i*bucketSize,hi:priceMin+(b.i+1)*bucketSize,
            totalVol:b.vol,weightedVol:b.wvol,
            totalBuyVol:b.bv,totalSellVol:b.sv,
            totalTouches:b.touches,maxWeight:b.mw,spikeCandlesCount:b.sp};
      }
      lastI=b.i;
    }
    zones.push(zn);

    /* sort by weighted vol for slicing top N */
    zones.sort(function(a,b){return a.weightedVol-b.weightedVol;});
    zones=zones.slice(-s.topN);

    /* enrich zones */
    var maxRawVol=0,maxWVol=0;
    for(var zi=0;zi<zones.length;zi++){
      if(zones[zi].totalVol>maxRawVol)maxRawVol=zones[zi].totalVol;
      if(zones[zi].weightedVol>maxWVol)maxWVol=zones[zi].weightedVol;
    }
    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var relVol=maxWVol>0?z.weightedVol/maxWVol:1;
      var relRaw=maxRawVol>0?z.totalVol/maxRawVol:1;
      var relHybrid=maxWVol>0&&maxRawVol>0?(z.weightedVol/maxWVol+z.totalVol/maxRawVol)/2:relVol;
      z.rawVol=z.totalVol;
      z.avgWeight=z.totalVol>0?z.weightedVol/z.totalVol:1;
      z.relVol=relVol;z.relRaw=relRaw;z.relHybrid=relHybrid;
      /* level 1-5 for highlight colors */
      z._level=relVol>=0.8?5:relVol>=0.6?4:relVol>=0.4?3:relVol>=0.2?2:1;
      /* HVN Signals compat */
      z.strengthScore=Math.round(relVol*100);
      z.isWeightedHVN=true;
      z.weightedVolFinal=z.weightedVol;
    }

    return{hvn:zones,candleWeights:candleWeights,rawBuckets:{priceMin:priceMin,bucketSize:bucketSize,nBuckets:nBuckets}};
  }

  /* ── Build per-candle highlight data ── */
  function buildCandleHL(cs,zones,candleWeights,s){
    var N=cs.length;
    var hl=new Array(N);
    for(var i=0;i<N;i++){
      var c=cs[i];var w=candleWeights[i];
      var bestZi=-1;var bestLevel=0;var bestRel=0;
      for(var zi=0;zi<zones.length;zi++){
        var z=zones[zi];
        if(c.h>=z.lo&&c.l<=z.hi&&z.relVol>bestRel){
          bestZi=zi;bestLevel=z._level;bestRel=z.relVol;
        }
      }
      if(bestZi<0){hl[i]=null;continue;}
      var isSource=w>=s.hlThresh;
      var isWeighted=w>=s.hlThresh;
      var isStrong=bestLevel>=4;
      var show=false;
      if(s.hlMode==='source'&&isSource)show=true;
      else if(s.hlMode==='weighted'&&isWeighted)show=true;
      else if(s.hlMode==='strong'&&isStrong)show=true;
      hl[i]=show?{w:w,level:bestLevel,zi:bestZi}:null;
    }
    return hl;
  }

  /* ── Cache ── */
  var _vzCacheKey='',_vzCache=null,_vzHL=null;

  /* ── Draw zones ── */
  function drawVolZones(ctx,W,H,V,sc,x){
    if(!window.S||!S.inds.volZones||!S.candles.length)return;
    var vzTfSel=E('vzTf');var vzTf=vzTfSel?vzTfSel.value:'';
    var cs=getVZCandles();
    var s=getSettings(cs);
    var key=[cs.length,(cs[0]||{}).t||0,S.sym,vzTf||S.tf,
             s.bucketPct,s.topN,s.minTouch,s.mergeGap,
             s.weightOn?1:0,s.weightMA,s.weightStr,s.maxWeight,
             s.atrComp?1:0,s.compBoost,s.widePen,
             s.recencyOn?1:0,s.recStr,s.strMode].join('|');
    if(key!==_vzCacheKey){
      _vzCache=computeHVN(cs,s);
      _vzCacheKey=key;
      _vzHL=_vzCache&&s.hlOn?buildCandleHL(cs,_vzCache.hvn,_vzCache.candleWeights,s):null;
    }
    if(!_vzCache||!_vzCache.hvn||!_vzCache.hvn.length)return;
    var zones=_vzCache.hvn;

    var rgb=hexToRgb(s.color);
    var vspan=S.view.end-S.view.start;
    var cw=CW(W);var bw=cw/vspan;
    var xRight=Math.min(W-RP(),x(cs.length-1)+s.extend*bw);
    var xLeft=0;

    ctx.save();
    window.__ETX_SKIP_COLORMAP=true;

    for(var zi=0;zi<zones.length;zi++){
      var z=zones[zi];
      var rel=s.strMode==='raw'?z.relRaw:s.strMode==='hybrid'?z.relHybrid:z.relVol;
      var mid=(z.hi+z.lo)/2;
      var y1=sc.y(z.hi),y2=sc.y(z.lo),ym=sc.y(mid);
      var boxH=Math.max(1,y2-y1);
      if(xRight<=xLeft||y2<PT||y1>H-PB)continue;

      ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(0.03+0.10*rel).toFixed(3)+')';
      ctx.fillRect(xLeft,y1,xRight-xLeft,boxH);

      ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(0.25+0.45*rel).toFixed(3)+')';
      ctx.lineWidth=rel>0.7?1.5:1;ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(xLeft,y1);ctx.lineTo(xRight,y1);
      ctx.moveTo(xLeft,y2);ctx.lineTo(xRight,y2);ctx.stroke();

      if(boxH>12){
        ctx.strokeStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(0.15+0.28*rel).toFixed(3)+')';
        ctx.lineWidth=1;ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.moveTo(xLeft,ym);ctx.lineTo(xRight,ym);ctx.stroke();
        ctx.setLineDash([]);
      }

      if(boxH>8){
        ctx.textBaseline='middle';
        ctx.font=(rel>0.5?'bold ':'')+'9px monospace';
        ctx.fillStyle='rgba('+rgb.r+','+rgb.g+','+rgb.b+','+(0.55+0.30*rel).toFixed(3)+')';
        var wLabel=s.weightOn&&z.avgWeight>1.05?' W '+z.avgWeight.toFixed(1)+'x':'';
        ctx.fillText('HVN '+priceFmt(mid)+' | $'+nFmt(s.strMode==='raw'?z.rawVol:z.weightedVol)+' | '+z.totalTouches+'t'+wLabel,xLeft+6,ym);
      }
    }

    window.__ETX_SKIP_COLORMAP=false;
    ctx.restore();
  }

  /* level colors (5 tiers, gold/amber palette) */
  var _LVL_COL=[null,
    {r:120,g:90,b:30},   /* L1 dim  */
    {r:180,g:130,b:40},  /* L2 warm */
    {r:230,g:175,b:45},  /* L3 amber*/
    {r:255,g:200,b:40},  /* L4 gold */
    {r:255,g:235,b:80}   /* L5 bright*/
  ];

  /* ── Draw candle highlights (called AFTER drawCandles) ── */
  function drawHVNCandleHL(ctx,W,H,V,sc,x,bw){
    if(!window.S||!S.inds.volZones||!S.candles.length)return;
    var s=getSettings(S.candles);
    if(!s.hlOn||!_vzHL)return;
    var cs=getVZCandles();
    var hw=bw*0.5;
    ctx.save();
    window.__ETX_SKIP_COLORMAP=true;
    for(var i=V.a;i<V.b;i++){
      if(i<0||i>=cs.length)continue;
      var hlInfo=_vzHL[i];if(!hlInfo)continue;
      var c=cs[i];
      var hlRgb;
      if(s.hlLvlColor){
        hlRgb=_LVL_COL[hlInfo.level]||_LVL_COL[3];
      }else{
        var isDoji=Math.abs(c.c-c.o)<(c.h-c.l)*0.1;
        hlRgb=hexToRgb(isDoji?s.hlNeutral:(c.c>=c.o?s.hlBull:s.hlBear));
      }
      var op=s.hlOp;
      var xx=x(i);
      var yH=sc.y(Math.max(c.o,c.c));
      var yL=sc.y(Math.min(c.o,c.c));
      var bodyH=Math.max(1,yL-yH);
      /* body overlay */
      ctx.fillStyle='rgba('+hlRgb.r+','+hlRgb.g+','+hlRgb.b+','+op+')';
      ctx.fillRect(xx-hw,yH,bw,bodyH);
      /* border */
      if(s.hlBorder){
        ctx.strokeStyle='rgba('+hlRgb.r+','+hlRgb.g+','+hlRgb.b+','+Math.min(1,op*2.2).toFixed(3)+')';
        ctx.lineWidth=1;ctx.setLineDash([]);
        ctx.strokeRect(xx-hw,yH,bw,bodyH);
      }
      /* wick */
      if(s.hlWick){
        ctx.strokeStyle='rgba('+hlRgb.r+','+hlRgb.g+','+hlRgb.b+','+Math.min(1,op*1.8).toFixed(3)+')';
        ctx.lineWidth=1;ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(xx,sc.y(c.h));ctx.lineTo(xx,yH);
        ctx.moveTo(xx,yL);ctx.lineTo(xx,sc.y(c.l));
        ctx.stroke();
      }
    }
    window.__ETX_SKIP_COLORMAP=false;
    ctx.restore();
  }

  window.__drawVolZones=drawVolZones;
  window.__drawHVNCandleHL=drawHVNCandleHL;
  window.__hvnZones=function(){return _vzCache?_vzCache.hvn:null;};
  window.__dvlComputeHVNFromCS=function(cs){
    var s=getSettings(cs);
    var r=computeHVN(cs,s);
    return r?r.hvn||[]:[]; };

  /* ── Event wiring ── */
  var VZ_INPUTS=new Set([
    'vzBucket','vzBucketAtr','vzTopN','vzMinTouch','vzMerge','vzExtend','vzColor','vzTf',
    'vzWeightOn','vzWeightMA','vzWeightStr','vzMaxWeight',
    'vzAtrComp','vzCompBoost','vzWidePen',
    'vzRecency','vzRecStr','vzStrMode',
    'vzHlOn','vzHlMode','vzHlThresh','vzHlLvlColor',
    'vzHlBull','vzHlBear','vzHlNeutral',
    'vzHlBorder','vzHlWick','vzHlOp'
  ]);
  function vzRedraw(){_vzCacheKey='';if(typeof drawSoon==='function')drawSoon();}
  document.addEventListener('input',function(ev){
    if(!VZ_INPUTS.has(ev.target&&ev.target.id))return;
    var id=ev.target.id;
    if(id==='vzColor'){var sw=E('vzColorSwatch');if(sw)sw.style.background=ev.target.value;}
    vzRedraw();
  });
  document.addEventListener('change',function(ev){
    var id=ev.target&&ev.target.id;
    if(!VZ_INPUTS.has(id))return;
    if(id==='vzTf'){_vzExtCandles=null;_vzExtKey='';_vzExtFetching=false;}
    vzRedraw();
  });
  setTimeout(function(){if(typeof drawSoon==='function')drawSoon();},0);
})();
</script>"""

assert old_full in html, 'Full HVN script block not found in html'
html = html.replace(old_full, NEW_HVN_SCRIPT, 1)

# ── 3. Add __drawHVNCandleHL call in draw() after drawCandles ─────────────────
OLD_AFTER_CANDLES = (
    "if(S.chartStyle==='renko')drawRenko(ctx,V,sc,x,bw);"
    "else{drawCandles(ctx,V,sc,x,bw);"
    "if(S.chartStyle==='footprint')drawFootprint(ctx,V,sc,x,bw)}"
    "resetCtxState(ctx);"
    "if(S.inds.stdVolume)safeLayer('Volume Overlay',"
)
assert OLD_AFTER_CANDLES in html, 'drawCandles anchor for HL injection not found'
html = html.replace(OLD_AFTER_CANDLES,
    "if(S.chartStyle==='renko')drawRenko(ctx,V,sc,x,bw);"
    "else{drawCandles(ctx,V,sc,x,bw);"
    "if(S.chartStyle==='footprint')drawFootprint(ctx,V,sc,x,bw)}"
    "resetCtxState(ctx);"
    "if(S.inds.volZones&&window.__drawHVNCandleHL)safeLayer('HVN Candle HL',()=>window.__drawHVNCandleHL(ctx,W,H,V,sc,x,bw));resetCtxState(ctx);"
    "if(S.inds.stdVolume)safeLayer('Volume Overlay',",
    1)

with open('DepthVisionLab-v106_REAL_UI/public/index.html','w',encoding='utf-8') as f:
    f.write(html)

print('patch_159.py applied — Beta 0.159')
print('  Weighted HVN Zones:')
print('  - Volume weight: ratio^strength capped at maxWeight (default 4x)')
print('  - ATR compression: boost for tight candles, penalty for wide')
print('  - Recency: newer candles get proportional weight boost')
print('  - Zones: weightedVol, rawVol, avgWeight, spikeCandlesCount, strengthScore')
print('  - Strength mode: Weighted / Raw Vol / Hybrid')
print('  - Candle highlight: Source / Weighted / Strong Zone modes')
print('  - Level colors L1-L5 (gold palette) or bull/bear/neutral custom colors')
print('  - Border + wick highlight options')
print('  - HVN Signals compat: strengthScore, isWeightedHVN fields')
print('  - draw(): __drawHVNCandleHL called after drawCandles')
