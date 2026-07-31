/* ============================================================================
   DVL Smart Delta Engine — Beta 1.335 (magnitude visual relativa)
   Motor PROPRIETÁRIO de confluência institucional. Não é Footprint e não simula
   Bid x Ask: calcula, a partir dos dados que o DVL já tem (volume, spike, corpo,
   pavios, posição do fechamento, velocidade, flat/spike, absorção, rejeição,
   delta real do footprint quando disponível, POC/VAH/VAL), quatro medidas:
     • Institutional Confidence (0–100)
     • Smart Delta (força institucional assinada, −100..+100 → histograma)
     • Continuation Probability (0–100)
     • Exhaustion Score (0–100)
   Módulos lógicos: CORE (features) · SCORE · ENGINE (cache incremental) ·
   RENDER (histograma leve + painel compacto) · STORAGE.
   ==========================================================================*/
(function(){
  "use strict";
  if(window.DVL_SMART_DELTA_ENGINE_API) return;

  /* ── STORAGE ──────────────────────────────────────────────────────────── */
  var KEY = "dvl_smart_delta_1228";
  var DEFAULTS = { on:false, panel:true, height:38, lookback:20, thNeutral:18, opacity:0.9,
    alertOn:false, alertDelta:60, alertConf:70, alertExh:75,
    alertConflOn:false, alertConflMin:2, alertConflMins:10,
    // Beta 1.231 — histograma em painel próprio (oscilador) + tabela overlay
    histogram:true, maOn:true, maLen:9, zeroLine:true, spikeMult:2, detailed:false,
    posColor:"#16c784", negColor:"#ff4a61", maColor:"#f3c768",
    // Beta 1.232 — refinamento visual
    barWidth:0.86, autoScale:true, useConfOpacity:true, maxOpacity:0.95, minOpacity:0.28, maThick:2.2,
    // Beta 1.335 — altura por magnitude real relativa × inteligência do Smart Delta
    magnitudeMode:true, magnitudeLookback:50, intelligenceWeight:0.65 };
  var state = (function(){ var s={}; try{ s=JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(_){}
    var o={}; for(var k in DEFAULTS) o[k]=DEFAULTS[k]; if(s&&typeof s==="object") for(var k2 in s){ if(k2 in DEFAULTS) o[k2]=s[k2]; } return o; })();
  var saveT=0; function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(_){} },120); }

  /* ── helpers / data access (globais `let` → por identificador com guarda) ─ */
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function candles(){ try{ if(Array.isArray(window.klines)) return window.klines; }catch(_){} try{ if(typeof klines!=="undefined"&&Array.isArray(klines)) return klines; }catch(_){} return []; }
  function fpAt(t){ try{ if(window._dvlFpCache&&window._dvlFpCache.get){ var r=window._dvlFpCache.get(Number(t)); if(r&&(r.b>0||r.s>0)) return r; } }catch(_){} return null; }
  function O(c){return Number(c.open!=null?c.open:c.o);} function H(c){return Number(c.high!=null?c.high:c.h);}
  function L(c){return Number(c.low!=null?c.low:c.l);} function C(c){return Number(c.close!=null?c.close:c.c);}
  function V(c){return Number(c.volume!=null?c.volume:c.v)||0;} function T(c){return Number(c.time!=null?c.time:c.t);}

  /* ── CORE — extração de features por candle ───────────────────────────── */
  function features(cs, i){
    var c=cs[i]; if(!c) return null;
    var o=O(c),h=H(c),l=L(c),cl=C(c),vol=V(c);
    var range=Math.max(h-l,1e-9), body=Math.abs(cl-o);
    var bodyPct=body/range;
    var upWick=(h-Math.max(o,cl))/range, dnWick=(Math.min(o,cl)-l)/range;
    var closePos=(cl-l)/range;                 // 0 fundo … 1 topo
    var dir = cl>o?1:(cl<o?-1:0);
    // volume médio e spike
    var n=Math.max(1,Math.min(20,i)), s=0; for(var k=i-n;k<i;k++){ if(cs[k]) s+=V(cs[k]); } var avgVol=n?s/n:vol||1;
    var volSpike=vol/Math.max(avgVol,1e-9);
    // velocidade e ATR simples
    var prev=cs[i-1], prevC=prev?C(prev):cl;
    var atr=0,an=0; for(var a=Math.max(1,i-13);a<=i;a++){ var pc=cs[a-1]||cs[a]; atr+=Math.max(H(cs[a])-L(cs[a]),Math.abs(H(cs[a])-C(pc)),Math.abs(L(cs[a])-C(pc))); an++; } atr=an?atr/an:range;
    var velocity=Math.abs(cl-prevC)/Math.max(atr,1e-9);
    // flat anterior (consolidação) + spike pós-flat
    var fr=6, hi=-Infinity, lo=Infinity, fv=0, fn=0;
    for(var f=Math.max(0,i-fr);f<i;f++){ if(!cs[f])continue; hi=Math.max(hi,H(cs[f])); lo=Math.min(lo,L(cs[f])); fv+=V(cs[f]); fn++; }
    var flatRange=(isFinite(hi)&&isFinite(lo))?(hi-lo):range;
    var flatPrior=clamp(1-(flatRange/Math.max(atr*fr*0.5,1e-9)),0,1);   // 1 = muito flat
    var postFlatSpike=clamp((volSpike-1)/2,0,1)*flatPrior;
    // footprint real (delta) quando houver
    var fp=fpAt(T(c)); var deltaRatio=0, hasFp=false, tradeQ=0, rawDeltaVol=0;
    if(fp){
      var buyVol=Number(fp.b)||0, sellVol=Number(fp.s)||0, tot=buyVol+sellVol;
      if(tot>0){ deltaRatio=(buyVol-sellVol)/tot; rawDeltaVol=buyVol-sellVol; hasFp=true; tradeQ=1; }
    } else {
      deltaRatio = clamp((closePos-0.5)*2 + dir*0.2, -1, 1);
      // Sem footprint, estima a agressão em unidades de volume sem fingir Bid×Ask real.
      rawDeltaVol = deltaRatio * vol;
    }
    // absorção: muito volume, pouco avanço de preço (corpo pequeno + spike)
    var absorption=clamp(volSpike/2,0,1)*clamp(1-bodyPct,0,1);
    // rejeição: pavio grande contra o corpo
    var rejUp=upWick*clamp(volSpike/1.5,0,1), rejDn=dnWick*clamp(volSpike/1.5,0,1);
    var rejection=Math.max(rejUp,rejDn);
    // desaceleração: velocidade caindo vs candle anterior
    var pf=(i>0)?features._vel[i-1]:velocity; // preenchido pelo engine
    return { o:o,h:h,l:l,c:cl,vol:vol,range:range,bodyPct:bodyPct,upWick:upWick,dnWick:dnWick,
      closePos:closePos,dir:dir,avgVol:avgVol,volSpike:volSpike,velocity:velocity,atr:atr,
      flatPrior:flatPrior,postFlatSpike:postFlatSpike,deltaRatio:deltaRatio,rawDeltaVol:rawDeltaVol,hasFp:hasFp,tradeQ:tradeQ,
      absorption:absorption,rejection:rejection,rejUp:rejUp,rejDn:rejDn };
  }
  features._vel=[];

  /* ── SCORE — as quatro medidas (puras) ────────────────────────────────── */
  function score(f, prevVol, prevVel, ext){
    if(!f) return null;
    ext = ext || {};
    var dirSign = f.deltaRatio>0?1:(f.deltaRatio<0?-1:f.dir);
    // componentes 0..100 (força institucional do candle)
    var cVolume = clamp((f.volSpike-1)/2,0,1)*100;                 // volume acima da média
    var cBody   = clamp(f.bodyPct/0.7,0,1)*100;                    // corpo dominante
    var cClose  = (dirSign>=0? f.closePos : (1-f.closePos))*100;   // fechou a favor
    var cDelta  = clamp((Math.abs(f.deltaRatio))/0.6,0,1)*100;     // delta forte
    var cAbsorb = clamp(f.absorption,0,1)*100;                      // absorção
    var cSpike  = clamp(f.postFlatSpike + clamp((f.volSpike-1)/2,0,1)*0.5,0,1)*100;
    var cOppWick= (100 - clamp((dirSign>=0? f.upWick : f.dnWick)/0.5,0,1)*100); // pavio contra pequeno = bom
    // Institutional Confidence — média ponderada
    var wsum=0, acc=0;
    function add(v,w){ acc+=v*w; wsum+=w; }
    add(cVolume,0.20); add(cBody,0.16); add(cClose,0.16); add(cDelta,0.18);
    add(cAbsorb,0.10); add(cSpike,0.10); add(cOppWick,0.10);
    var confidenceRaw=clamp(acc/Math.max(wsum,1e-9),0,100);
    if(!f.hasFp) confidenceRaw=confidenceRaw*0.92;                   // dado estimado → leve desconto
    // Smart Delta assinado (−100..+100)
    var mag = clamp((cBody*0.3 + cClose*0.25 + cDelta*0.3 + cVolume*0.15)/100,0,1);
    var delta = Math.round(dirSign * mag * 100);
    // indecisão: sinais conflitando (delta vs corpo/close divergem, ou pavios grandes dos dois lados)
    var conflict = (Math.sign(f.deltaRatio||f.dir) !== Math.sign(f.c - f.o) && f.bodyPct>0.2) ||
                   (f.upWick>0.33 && f.dnWick>0.33);
    // Continuation Probability — confirmações a favor da direção
    var conf=0, cw=0;
    conf+=clamp((f.volSpike-1)/2,0,1)*100*0.28; cw+=0.28;
    conf+=clamp(Math.abs(f.deltaRatio)/0.6,0,1)*100*0.24; cw+=0.24;
    conf+=clamp(f.bodyPct/0.7,0,1)*100*0.20; cw+=0.20;
    conf+=clamp(f.postFlatSpike,0,1)*100*0.14; cw+=0.14;
    conf+=clamp(f.absorption,0,1)*100*0.14; cw+=0.14;
    var continuationRaw=clamp(conf/Math.max(cw,1e-9),0,100) * (conflict?0.7:1);
    // Exhaustion — pavio exagerado + perda de volume + rejeição + desaceleração
    var volDrop = prevVol? clamp((prevVol - f.vol)/Math.max(prevVol,1e-9),0,1) : 0;
    var velDrop = prevVel? clamp((prevVel - f.velocity)/Math.max(prevVel,1e-9),0,1) : 0;
    var bigWick = clamp(Math.max(f.upWick,f.dnWick)/0.5,0,1);
    var exhaustionRaw=clamp( bigWick*0.34 + volDrop*0.24 + f.rejection*0.24 + velDrop*0.18, 0,1)*100;

    /* Beta 1.229 — confluência institucional externa (OI/ΔOI, LSR, VP POC/VAH/VAL).
       Só ajusta Confidence/Continuation/Exhaustion (não o delta do candle). Quando
       ausente, não penaliza. */
    var vpC=0;
    if(ext.hasOI){
      if(ext.oiDir===dirSign){ confidenceRaw+=6*ext.oiMag+2; continuationRaw+=12*ext.oiMag; }
      else if(ext.oiDir!==0){ continuationRaw-=7*ext.oiMag; }
      if(ext.oiDir<0){ exhaustionRaw+=9*ext.oiMag; }        // OI caindo → desmontagem
    }
    if(ext.hasLSR){
      if(ext.lsrDir===dirSign) continuationRaw+=6; else if(ext.lsrDir!==0) continuationRaw-=4;
    }
    if(ext.hasVP && ext.vp){
      if(dirSign>=0 && ext.vp.atVAL){ confidenceRaw+=6; continuationRaw+=8; vpC=70; }
      else if(dirSign<0 && ext.vp.atVAH){ confidenceRaw+=6; continuationRaw+=8; vpC=70; }
      else if(ext.vp.atPOC){ continuationRaw-=4; vpC=30; }
      else if((dirSign>=0&&ext.vp.atVAH)||(dirSign<0&&ext.vp.atVAL)){ continuationRaw-=6; vpC=20; } // contra o nível
    }

    var confidence=Math.round(clamp(confidenceRaw,0,100));
    var continuation=Math.round(clamp(continuationRaw,0,100));
    var exhaustion=Math.round(clamp(exhaustionRaw,0,100));
    // Qualidade direcional para modular a ALTURA visual. Não altera score/alertas.
    var quality=clamp(mag*0.50 + (confidence/100)*0.35 + (continuation/100)*0.15,0,1);
    if(conflict) quality*=0.55;
    quality*=1-(exhaustion/100)*0.22;
    if(!f.hasFp) quality*=0.92;
    quality=clamp(quality,0.08,1);
    // classe de cor
    var cls;
    if(conflict) cls="indef";
    else if(delta >= state.thNeutral) cls="buy";
    else if(delta <= -state.thNeutral) cls="sell";
    else cls="neutral";
    return { delta:delta, histDelta:delta, rawDelta:Number(f.rawDeltaVol)||0, magnitudeRatio:0, quality:quality, confidence:confidence, continuation:continuation, exhaustion:exhaustion, cls:cls,
      components:{ volume:Math.round(cVolume), body:Math.round(cBody), close:Math.round(cClose), delta:Math.round(cDelta), absorption:Math.round(cAbsorb), spike:Math.round(cSpike),
        oi:ext.hasOI?Math.round(clamp(ext.oiDir===dirSign?50+50*ext.oiMag:50-50*ext.oiMag,0,100)):null,
        lsr:ext.hasLSR?(ext.lsrDir===dirSign?70:(ext.lsrDir!==0?30:50)):null, vp:vpC } };
  }
  window.__DVL_SMART_DELTA_PURE = { features:features, score:score, clamp:clamp };

  /* ── ENGINE — cálculo por candle fechado, cache incremental ───────────── */
  var cacheKey="", cache=[];     // cache[i] = score
  function symbolTf(){ var s="?",tf="?"; try{ if(typeof symbol!=="undefined"&&symbol) s=String(symbol); }catch(_){} try{ if(typeof interval!=="undefined"&&interval) tf=String(interval); }catch(_){} return s+"|"+tf; }
  /* Beta 1.229 — confluência externa: OI/ΔOI, LSR e níveis do Volume Profile.
     Lê os osciladores/VP já existentes (não duplica cálculo). */
  function readSeries(apiObj){ try{ var d=apiObj&&apiObj.cache&&apiObj.cache.data; if(Array.isArray(d)&&d.length){ return d.map(function(x){ return {t:Number(x.time!=null?x.time:x.t), v:Number(x.value!=null?x.value:(x.usd!=null?x.usd:(x.ratio!=null?x.ratio:x.close))) }; }).filter(function(x){ return isFinite(x.t)&&isFinite(x.v); }).sort(function(a,b){ return a.t-b.t; }); } }catch(_){} return []; }
  function nearIdx(arr,t){ var lo=0,hi=arr.length-1,ans=-1; while(lo<=hi){ var m=(lo+hi)>>1; if(arr[m].t<=t){ans=m;lo=m+1;}else hi=m-1; } return ans; }
  function confluence(){
    var oi=[],lsr=[],vp=null;
    try{ oi=readSeries(window.DVLOpenInterestOscillator); }catch(_){}
    try{ lsr=readSeries(window.DVLLongShortOscillator); }catch(_){}
    try{ var L=window.DVLVolumeProfile&&window.DVLVolumeProfile.getLevels&&window.DVLVolumeProfile.getLevels(); vp=(L&&L.current)||null; }catch(_){}
    var sig=(oi.length?oi[oi.length-1].v:0)+"|"+(lsr.length?lsr[lsr.length-1].v:0)+"|"+(vp?Math.round(vp.poc):0);
    return { oi:oi, lsr:lsr, vp:vp, sig:sig };
  }
  function extFor(conf, cs, i){
    var t=T(cs[i]), c=C(cs[i]), ext={};
    if(conf.oi.length){ var oidx=nearIdx(conf.oi,t); if(oidx>=1){ var d=conf.oi[oidx].v-conf.oi[oidx-1].v; ext.hasOI=true; ext.oiDir=d>0?1:(d<0?-1:0); ext.oiMag=clamp(Math.abs(d)/Math.max(Math.abs(conf.oi[oidx].v)*0.01,1e-9),0,1); } }
    if(conf.lsr.length){ var lidx=nearIdx(conf.lsr,t); if(lidx>=1){ var dl=conf.lsr[lidx].v-conf.lsr[lidx-1].v; ext.hasLSR=true; ext.lsrDir=dl>0?1:(dl<0?-1:0); } }
    if(conf.vp && conf.vp.poc!=null){ var rng=Math.max(H(cs[i])-L(cs[i]),1e-9), tol=rng*0.6; ext.hasVP=true; ext.vp={ atVAL:Math.abs(c-conf.vp.val)<=tol, atVAH:Math.abs(c-conf.vp.vah)<=tol, atPOC:Math.abs(c-conf.vp.poc)<=tol }; }
    return ext;
  }
  function compute(){
    var cs=candles(); var n=cs.length; if(n<3){ cache=[]; return; }
    var conf=confluence();
    var key=symbolTf()+"|"+n+"|"+T(cs[n-1])+"|"+conf.sig;
    if(key===cacheKey && cache.length===n) return;
    features._vel=new Array(n).fill(0);
    var out=new Array(n).fill(null), prevVol=0, prevVel=0;
    // Referência causal: EMA da magnitude ABSOLUTA anterior. O candle atual não
    // entra na própria referência, então um spike não se achata no nascimento.
    var magRef=0, magSeen=0;
    var magLen=Math.max(10,Math.min(300,Math.round(+state.magnitudeLookback||50)));
    var magAlpha=2/(magLen+1);
    var intelligenceW=clamp(state.intelligenceWeight!=null&&isFinite(+state.intelligenceWeight)?+state.intelligenceWeight:0.65,0,1);
    for(var i=1;i<n;i++){
      var f=features(cs,i); if(!f){ continue; }
      features._vel[i]=f.velocity;
      var scored=score(f, prevVol, prevVel, extFor(conf, cs, i));
      if(scored){
        var rawAbs=Math.abs(scored.rawDelta||0);
        var base=magSeen>0?Math.max(magRef,1e-9):Math.max(rawAbs,1e-9);
        var ratio=rawAbs/base;
        // Curva ampla: 1×≈42, 2×≈66, 4×≈89 antes do peso inteligente.
        var magnitude=100*(1-Math.exp(-ratio/1.85));
        var qualityFactor=(1-intelligenceW)+intelligenceW*clamp(scored.quality,0,1);
        var sign=scored.delta<0?-1:(scored.delta>0?1:(scored.rawDelta<0?-1:1));
        scored.magnitudeRatio=ratio;
        scored.histDelta=state.magnitudeMode===false ? scored.delta : Math.round(sign*clamp(magnitude*qualityFactor,0,100));
        out[i]=scored;
        if(rawAbs>0){ magRef=magSeen>0?(magRef+magAlpha*(rawAbs-magRef)):rawAbs; magSeen++; }
      }
      prevVol=f.vol; prevVel=f.velocity;
    }
    cache=out; cacheKey=key;
    try{ publish(); }catch(_){}
  }
  /* Beta 1.230 — Stage 3: fonte única de leitura (bridge) + Smart Alerts.
     Publica a leitura atual num único lugar (window.DVL_SMART_DELTA_LAST + evento
     dvl:smart-delta) para Scanner/Copilot/Market Matrix/Smart Alerts consumirem
     SEM duplicar lógica. */
  var lastPubTime=0, lastSnap=null;
  function publish(){
    var L=null; for(var i=cache.length-1;i>=0;i--){ if(cache[i]){ L={i:i,s:cache[i]}; break; } }
    if(!L) return;
    var cs=candles(); var t=T(cs[L.i]);
    var snap={ symbol:symbolTf().split("|")[0], tf:symbolTf().split("|")[1], time:t, index:L.i,
      delta:L.s.delta, histDelta:L.s.histDelta, rawDelta:L.s.rawDelta, magnitudeRatio:L.s.magnitudeRatio, quality:L.s.quality, confidence:L.s.confidence, continuation:L.s.continuation, exhaustion:L.s.exhaustion, cls:L.s.cls, components:L.s.components, ts:Date.now() };
    lastSnap=snap; window.DVL_SMART_DELTA_LAST=snap;
    try{ window.dispatchEvent(new CustomEvent("dvl:smart-delta",{detail:snap})); }catch(_){}
    if(t!==lastPubTime){ lastPubTime=t; try{ evalAlerts(snap); }catch(_){} }
  }
  function evalAlerts(s){
    if(state.alertOn){
      var msg=null;
      if(Math.abs(s.delta)>=(state.alertDelta||60) && s.confidence>=(state.alertConf||70) && (s.cls==="buy"||s.cls==="sell")){
        msg="Smart Delta "+(s.cls==="buy"?"COMPRA":"VENDA")+" forte · "+(s.delta>0?"+":"")+s.delta+" · Conf "+s.confidence+"% · Cont "+s.continuation+"%";
      } else if(s.exhaustion>=(state.alertExh||75)){
        msg="Smart Delta · exaustão "+s.exhaustion+"% ("+s.symbol+" "+s.tf+")";
      }
      if(msg){ try{ if(typeof showToast==="function") showToast(msg); }catch(_){} try{ window.dispatchEvent(new CustomEvent("dvl:smart-delta-alert",{detail:{message:msg,snap:s}})); }catch(_){} }
    }
    /* Beta 1.259 — alerta de CONFLUÊNCIA TEMPORAL institucional (§13). Independe do
       alerta de threshold acima: dispara quando N módulos direcionais (Net Delta/
       Long/Short) estão alinhados no MESMO viés há pelo menos X minutos. Uma vez por
       episódio (não repete a cada candle enquanto a confluência persiste). */
    if(state.alertConflOn) evalConfluenceAlert(s);
  }
  var _conflActive=false, _conflBias="";
  function evalConfluenceAlert(s){
    var SD=window.DVL_SMART_DELTA_STATE; if(!SD||typeof SD.getConfluence!=="function") return;
    var c; try{ c=SD.getConfluence(); }catch(_){ return; }
    if(!c||!c.modules.length){ _conflActive=false; return; }
    var sign = c.biasScore>0?1:(c.biasScore<0?-1:0);
    if(!sign){ _conflActive=false; return; }
    var minMs=Math.max(0,(state.alertConflMins!=null?state.alertConflMins:10))*60000;
    var minMods=Math.max(2,state.alertConflMin||2);
    var aligned=0;
    for(var i=0;i<c.modules.length;i++){ var m=c.modules[i];
      var lean = (m.key==="netShort") ? (m.relation==="above"?-1:(m.relation==="below"?1:0))
               : ((m.key==="netDelta"||m.key==="netLong") ? (m.relation==="above"?1:(m.relation==="below"?-1:0)) : 0);
      if(lean===sign && (m.stateMs||0)>=minMs) aligned++;
    }
    var bias = sign>0?"compra":"venda";
    if(aligned>=minMods){
      if(!_conflActive || _conflBias!==bias){
        _conflActive=true; _conflBias=bias;
        var nar=(typeof SD.narrative==="function")?SD.narrative():c.narrative;
        var msg="Confluência institucional de "+bias.toUpperCase()+" · "+nar;
        try{ if(typeof showToast==="function") showToast(msg); }catch(_){}
        try{ window.dispatchEvent(new CustomEvent("dvl:smart-delta-alert",{detail:{message:msg,snap:s,confluence:c}})); }catch(_){}
      }
    } else if(aligned < minMods-1){ _conflActive=false; }  // histerese: só reseta quando dissolve de vez
  }
  function latest(){ compute(); for(var i=cache.length-1;i>=0;i--){ if(cache[i]) return { i:i, s:cache[i] }; } return null; }

  /* ── RENDER ───────────────────────────────────────────────────────────────
     Beta 1.231 — SEPARAÇÃO: a tabela (overlay) fica no gráfico principal; o
     HISTOGRAMA sai de cima dos candles e vai para um PAINEL PRÓPRIO (oscilador).
     Nada de barras sobre os candles, nada de misturar com o Volume. */
  var COL={ buy:[22,199,132], sell:[255,74,97], neutral:[130,150,145], indef:[243,199,104] };
  // Hook do painel de PREÇO: agora só cuida da tabela overlay (DOM), sem desenhar
  // barras no canvas dos candles.
  function draw(ctx, cfg){
    if(!state.on){ hidePanel(); return; }
    compute();
    if(state.panel!==false) renderPanel(); else hidePanel();
  }
  window.DVLSmartDeltaDraw=function(ctx,cfg){ try{ draw(ctx,cfg); }catch(_){} };

  /* ── Painel próprio (oscilador): histograma verde/vermelho + zero + MA ──── */
  function panelMetrics(padL, padR, top, h, w){ var x0=padL,x1=w-padR,y0=top+4,y1=top+h-6; return {padL:padL,padR:padR,top:top,h:h,w:w,x0:x0,x1:x1,y0:y0,y1:y1}; }
  function oscWindow(){ try{ if(typeof visibleWindow==="function") return visibleWindow(); }catch(_){} return { candles:[], totalSlots:(typeof chartViewCount!=="undefined"?chartViewCount:140), futureSlots:0 }; }
  function xForIndex(i, m, win){ var slots=Math.max(2,win.totalSlots||2); var so=(typeof __dvlSlotOffset==="function")?__dvlSlotOffset(win, win.candles||[]):0; return m.x0+(so+i)/(slots-1)*(m.x1-m.x0); }
  function yFor(v, y0, y1, lo, hi){ var span=(hi-lo)||1; return y1-(v-lo)/span*(y1-y0); }
  function basePanel(ctx, m, title, right, kind){
    ctx.save();
    ctx.fillStyle="#020806"; ctx.fillRect(0,m.top,m.w,m.h);
    ctx.strokeStyle="rgba(64,105,145,.22)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,m.top+.5); ctx.lineTo(m.w,m.top+.5); ctx.stroke();
    ctx.fillStyle="#020806"; ctx.fillRect(m.x1,m.top,m.w-m.x1,m.h);
    ctx.strokeStyle="rgba(64,105,145,.26)"; ctx.beginPath(); ctx.moveTo(m.x1+.5,m.top); ctx.lineTo(m.x1+.5,m.top+m.h); ctx.stroke();
    var headY=m.y0+12;
    ctx.font="850 9px system-ui"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(223,238,255,.84)"; ctx.fillText(title, m.x0+8, headY);
    ctx.font = "800 9px system-ui"; ctx.textAlign="right";
    ctx.fillStyle=kind==="bear"?"rgba(255,95,110,.9)":kind==="bull"?"rgba(0,220,190,.9)":"rgba(135,155,185,.86)";
    ctx.fillText(right||"", m.x1-8, headY);
    ctx.restore();
  }
  function deltaMA(){
    var len=Math.max(2,Math.round(state.maLen)||9), out=new Array(cache.length).fill(null);
    var buf=[], sum=0;
    for(var i=0;i<cache.length;i++){ if(!cache[i]){ out[i]=null; continue; } var v=(cache[i].histDelta!=null?cache[i].histDelta:cache[i].delta); buf.push(v); sum+=v; if(buf.length>len) sum-=buf.shift(); out[i]=sum/buf.length; }
    return out;
  }
  function oscOn(){ return !!state.on && state.histogram!==false; }
  // Beta 1.232 — cores por extremidade (média x extrema)
  function dimHex(hex,f){ hex=String(hex||"").replace("#",""); if(hex.length!==6) return hex; var r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16); r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f); function h2(x){x=Math.max(0,Math.min(255,x)).toString(16);return x.length<2?"0"+x:x;} return "#"+h2(r)+h2(g)+h2(b); }
  // Beta 1.233 — barra extrema BRILHA (pop tipo TV): satura + clareia levemente
  function litHex(hex,f,w){ hex=String(hex||"").replace("#",""); if(hex.length!==6) return hex; var r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16); w=w||0; r=r*f+(255-r*f)*w; g=g*f+(255-g*f)*w; b=b*f+(255-b*f)*w; function h2(x){x=Math.round(Math.max(0,Math.min(255,x))).toString(16);return x.length<2?"0"+x:x;} return "#"+h2(r)+h2(g)+h2(b); }
  function oscDraw(ctx, padL, padR, top, h, w){
    try{ window.__dvlOscillatorPanelBounds=window.__dvlOscillatorPanelBounds||{}; window.__dvlOscillatorPanelBounds.DVLSmartDelta={top:top,bottom:top+h}; }catch(_){}
    if(!oscOn()) return;
    compute();
    var m=panelMetrics(padL,padR,top,h,w);
    var win=oscWindow(), view=win.candles||[];
    var cs=candles(), byIdx={}; for(var j=0;j<cache.length;j++){ if(cache[j]) byIdx[T(cs[j])]=j; }
    // autoscale: barras fortes ocupam mais altura; escala mínima evita amplificar ruído
    var vis=[]; for(var v0=0;v0<view.length;v0++){ var i0=byIdx[T(view[v0])]; if(i0!=null&&cache[i0]) vis.push(Math.abs(cache[i0].histDelta!=null?cache[i0].histDelta:cache[i0].delta)); }
    var maxAbs=vis.length?Math.max.apply(null,vis):100;
    var rng=(state.autoScale!==false)?Math.max(35,Math.min(100,maxAbs*1.08)):100;
    var lo=-rng, hi=rng;
    var L=null; for(var q=cache.length-1;q>=0;q--){ if(cache[q]){ L=cache[q]; break; } }
    var maArr=deltaMA(); var maLast=null; for(var mq=maArr.length-1;mq>=0;mq--){ if(maArr[mq]!=null){ maLast=Math.round(maArr[mq]); break; } }
    var kind=L?(L.cls==="buy"?"bull":(L.cls==="sell"?"bear":"neutral")):"neutral";
    var _hd=L?(L.histDelta!=null?L.histDelta:L.delta):0;
    var rightTxt=L?("SD "+(L.delta>0?"+":"")+L.delta+(state.magnitudeMode!==false?"   M "+(_hd>0?"+":"")+_hd:"")+(maLast!=null?"   MA "+(maLast>0?"+":"")+maLast:"")):"";
    basePanel(ctx, m, "SMART DELTA", rightTxt, kind);
    ctx.save(); ctx.beginPath(); ctx.rect(m.x0,m.y0,m.x1-m.x0,Math.max(1,m.y1-m.y0)); ctx.clip();
    var zy=yFor(0,m.y0,m.y1,lo,hi);
    // linha zero — cinza clara, tracejada, mais visível
    if(state.zeroLine!==false){ ctx.strokeStyle="rgba(190,205,200,.5)"; ctx.lineWidth=1; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(m.x0,zy); ctx.lineTo(m.x1,zy); ctx.stroke(); ctx.setLineDash([]); }
    var posS=state.posColor||"#16c784", negS=state.negColor||"#ff4a61";
    var posM=dimHex(posS,0.62), negM=dimHex(negS,0.62);
    // extremos: cor bem mais forte/brilhante (satura + clareia) tipo o pico verde-limão do TV
    var posX=litHex(posS,1.35,0.22), negX=litHex(negS,1.15,0.14);
    var spikeMult=Math.max(1.2,+state.spikeMult||2), spikeTh=(state.thNeutral||18)*spikeMult;
    var maxOp=clamp(state.maxOpacity||0.95,0.4,1), minOp=clamp(state.minOpacity||0.28,0.05,maxOp);
    var useCO=state.useConfOpacity!==false;
    // largura ~85–90% da vela, com pequeno espaçamento
    var slotW=(m.x1-m.x0)/Math.max(2,win.totalSlots||2);
    var bwFrac=clamp(+state.barWidth||0.86,0.3,0.98);
    var bw=Math.max(1.5, slotW*bwFrac - Math.max(0.5, slotW*0.06));
    for(var k=0;k<view.length;k++){
      var idx=byIdx[T(view[k])]; if(idx==null||!cache[idx]) continue;
      var sc=cache[idx], d=(sc.histDelta!=null?sc.histDelta:sc.delta);
      var xx=xForIndex(k,m,win); if(xx<m.x0-bw||xx>m.x1+bw) continue;
      var yy=yFor(d,m.y0,m.y1,lo,hi);
      var up=d>=0, extreme=Math.abs(d)>=spikeTh;
      // ALTURA = delta ; COR = extremidade ; OPACIDADE = confidence
      if(extreme){
        // extremo BRILHA: cor forte, opacidade cheia (não escurece por confidence) + leve glow
        ctx.fillStyle = up?posX:negX;
        ctx.globalAlpha = Math.max(maxOp,0.92);
        ctx.shadowColor = up?posX:negX; ctx.shadowBlur = 7;
        ctx.fillRect(xx-bw/2, Math.min(yy,zy), bw, Math.max(0.8,Math.abs(zy-yy)));
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = up?posM:negM;
        ctx.globalAlpha = useCO ? (minOp+(maxOp-minOp)*clamp(sc.confidence/100,0,1)) : maxOp;
        ctx.fillRect(xx-bw/2, Math.min(yy,zy), bw, Math.max(0.8,Math.abs(zy-yy)));
      }
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    // média móvel amarela — 2–2.5px, sempre acima das barras
    if(state.maOn!==false){
      ctx.beginPath(); ctx.strokeStyle=state.maColor||"#f3c768"; ctx.lineWidth=clamp(+state.maThick||2.2,1,3); ctx.lineJoin="round"; ctx.lineCap="round";
      ctx.shadowColor="rgba(0,0,0,.35)"; ctx.shadowBlur=1.5;
      var started=false;
      for(var p=0;p<view.length;p++){ var ix=byIdx[T(view[p])]; if(ix==null||maArr[ix]==null) continue; var mx=xForIndex(p,m,win), my=yFor(maArr[ix],m.y0,m.y1,lo,hi); if(!started){ctx.moveTo(mx,my);started=true;}else ctx.lineTo(mx,my); }
      if(started) ctx.stroke();
      ctx.shadowBlur=0;
    }
    ctx.restore();
  }
  window.DVL_SMART_DELTA_OSC={ on:oscOn, draw:oscDraw, name:"Smart Delta" };

  var panelEl=null;
  function ensurePanel(){
    if(panelEl && document.body.contains(panelEl)) return panelEl;
    var w=document.getElementById("chartWrap")||document.querySelector(".canvasWrap"); if(!w) return null;
    if(getComputedStyle(w).position==="static") w.style.position="relative";
    panelEl=document.createElement("div"); panelEl.id="dvlSmartDeltaPanel";
    panelEl.style.cssText="position:absolute;left:8px;top:8px;z-index:44;pointer-events:auto;display:none;min-width:184px;max-width:min(74vw,320px);padding:7px 9px;border-radius:9px;background:rgba(6,16,12,.92);border:1px solid rgba(129,166,151,.24);color:#dcebe4;font:700 10px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.4);touch-action:pan-y";
    // Beta 1.251 — toque numa linha abre o mini-painel de detalhe do módulo
    panelEl.addEventListener("click", function(ev){ var r=ev.target&&ev.target.closest?ev.target.closest("[data-sd-mod]"):null; if(!r) return; ev.stopPropagation(); showModuleDetail(r.getAttribute("data-sd-mod")); });
    w.appendChild(panelEl);
    return panelEl;
  }
  var sdDetailEl=null;
  function showModuleDetail(k){
    var ST=window.DVL_SMART_DELTA_STATE; if(!ST) return;
    var m=null, mods=ST.MODS; for(var i=0;i<mods.length;i++){ if(mods[i].k===k){ m=mods[i]; break; } } if(!m) return;
    var sn=ST.getSnapshot(k); if(!sn){ return; }
    if(!sdDetailEl){
      sdDetailEl=document.createElement("div"); sdDetailEl.id="dvlSmartDeltaDetail";
      sdDetailEl.style.cssText="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100650;min-width:210px;max-width:86vw;padding:12px 14px;border-radius:12px;background:linear-gradient(180deg,#07160f,#04100b);border:1px solid rgba(19,220,141,.28);color:#e6f4ec;font:700 11px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)";
      document.body.appendChild(sdDetailEl);
      sdDetailEl.addEventListener("click", function(e){ if(e.target===sdDetailEl||e.target.getAttribute("data-close")!=null){ sdDetailEl.style.display="none"; } });
    }
    var rel=sn.relationToAverage, relTxt=rel==="above"?"Acima da média":(rel==="below"?"Abaixo da média":"Na média");
    var relC=rel==="above"?"#16c784":(rel==="below"?"#ff4a61":"#7f9c8e");
    var trTxt=sn.trend==="rising"?"Subindo":(sn.trend==="falling"?"Caindo":"Estável");
    function r(l,v,c){ return '<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#84a394">'+l+'</span><b style="color:'+(c||"#e6f4ec")+'">'+v+'</b></div>'; }
    sdDetailEl.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px"><b style="font-size:13px">'+m.label+'</b><span data-close style="cursor:pointer;color:#9db6aa;font-size:14px">✕</span></div>'+
      r("Atual", ST.fmtVal(m,sn))+
      r("Média", ST.fmtBig(sn.average))+
      r("Distância", (sn.distanceFromAveragePercent>=0?"+":"")+sn.distanceFromAveragePercent.toFixed(2)+"%", relC)+
      r("Estado", relTxt, relC)+
      r("Duração do estado", (sn.stateBars||0)+"c / "+ST.fmtDur(sn.stateMs))+
      r("Tendência", trTxt)+
      r("Duração da tendência", (sn.trendBars||0)+"c / "+ST.fmtDur(sn.trendMs));
    sdDetailEl.style.display="block";
  }
  function hidePanel(){ if(panelEl) panelEl.style.display="none"; if(sdDetailEl) sdDetailEl.style.display="none"; }
  function renderPanel(){
    var el=ensurePanel(); if(!el) return;
    var L=latest(); if(!L){ el.style.display="none"; return; }
    var s=L.s;
    var col=COL[s.cls]||COL.neutral; var hex="rgb("+col[0]+","+col[1]+","+col[2]+")";
    var ST=window.DVL_SMART_DELTA_STATE;
    var ST_null = !ST;
    /* Beta 1.255 — tabela responsiva: MOBILE = mínima (rótulo + setinha + tempo),
       fontes/padding/largura reduzidos ao máximo pra não estorvar o gráfico; PC =
       maior e mais completa (rótulo + setinha + palavra + valor + distância + tempo). */
    var isMobile = (typeof matchMedia!=="undefined" && matchMedia("(max-width:640px)").matches);
    /* Beta 1.257 — modo de exibição configurável (§10): auto/compact/detailed/collapsed.
       'auto' mantém o responsivo (mobile mínima / PC completa). + opacidade da tabela. */
    var _vcfg = ST ? ST.cfg() : null;
    var view = (_vcfg && _vcfg.view) || "auto";
    var collapsed = view==="collapsed";
    var useCompact = view==="compact" ? true : (view==="detailed" ? false : isMobile);
    var small = collapsed ? isMobile : useCompact;
    var opacity = (_vcfg && _vcfg.opacity!=null) ? Math.max(0.4,Math.min(1,+_vcfg.opacity)) : 1;
    el.style.opacity = String(opacity);
    if(small){
      el.style.minWidth="0px"; el.style.maxWidth="min(56vw,220px)"; el.style.padding="4px 6px";
      el.style.font="700 8.5px/1.32 -apple-system,Segoe UI,Roboto,sans-serif"; el.style.borderRadius="7px";
    } else {
      el.style.minWidth="244px"; el.style.maxWidth="360px"; el.style.padding="9px 12px";
      el.style.font="700 11px/1.55 -apple-system,Segoe UI,Roboto,sans-serif"; el.style.borderRadius="10px";
    }
    var head='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:'+(small?"2px":"5px")+'"><b style="color:'+hex+';font-size:'+(small?"9px":"12px")+'">SMART DELTA</b><span style="font-size:'+(small?"7.5px":"9.5px")+';color:'+hex+'">'+s.cls.toUpperCase()+' '+s.confidence+'</span></div>';
    if(ST_null){
      var sign=s.delta>0?"+":"";
      el.innerHTML=head+'<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:#7f9c8e">Delta</span><b style="color:'+hex+'">'+sign+s.delta+'</b></div>';
      el.style.display="block"; return;
    }
    var cfg=ST.cfg(), all=ST.getAll(), mods=ST.MODS;
    var arr=function(rel){ return rel==="above"?"▲":(rel==="below"?"▼":"–"); };
    var rc=function(rel){ return rel==="above"?"#16c784":(rel==="below"?"#ff4a61":"#7f9c8e"); };
    var rows="";
    if(!collapsed){
      for(var i=0;i<mods.length;i++){
        var m=mods[i]; if(cfg.modules && cfg.modules[m.k]===false) continue;
        var sn=all[m.k]; if(!sn||sn.value==null) continue;
        var dur=ST.fmtDuration(sn), rel=sn.relationToAverage;
        if(useCompact){
          /* linha mínima: rótulo + setinha + tempo. Valor completo a um toque. */
          rows+='<div data-sd-mod="'+m.k+'" style="display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;padding:1px 0;cursor:pointer"><span style="color:#9fb6ab">'+m.label+'</span><span style="color:'+rc(rel)+';font-size:10px;line-height:1">'+arr(rel)+'</span><span style="color:#8aa99b;text-align:right;white-space:nowrap">'+dur+'</span></div>';
        } else {
          var valTxt=ST.fmtVal(m,sn);
          var dist=(sn.distanceFromAveragePercent>=0?"+":"")+sn.distanceFromAveragePercent.toFixed(2)+"%";
          var word=(rel==="above"?"Acima":rel==="below"?"Abaixo":"Média");
          rows+='<div data-sd-mod="'+m.k+'" style="display:grid;grid-template-columns:66px 74px 1fr auto;gap:8px;align-items:center;padding:2px 0;cursor:pointer"><span style="color:#9fb6ab">'+m.label+'</span><span style="color:'+rc(rel)+'">'+arr(rel)+' '+word+'</span><b style="color:#dcebe4">'+valTxt+' <span style="color:#7f9c8e;font-weight:600;font-size:9px">'+dist+'</span></b><span style="color:#8aa99b;text-align:right">'+dur+'</span></div>';
        }
      }
    }
    if(!collapsed && rows===""){
      rows='<div style="padding:'+(small?"2px":"4px")+' 0;font-size:'+(small?"8px":"9px")+';color:#8aa99b">carregando…</div>';
    }
    var footTxt = small ? ('Conf '+s.confidence+' · Cont '+s.continuation+' · Exh '+s.exhaustion)
                           : ('Confidence '+s.confidence+'% · Continuation '+s.continuation+'% · Exh '+s.exhaustion+'%');
    var footer='<div style="margin-top:'+(small?"3px":"6px")+';padding-top:'+(small?"3px":"5px")+';border-top:1px solid rgba(129,166,151,.16);font-size:'+(small?"7.5px":"9px")+';color:#8aa99b">'+footTxt+'</div>';
    el.innerHTML=head+rows+footer;
    el.style.display="block";
  }
  /* Beta 1.251 — ticker central: re-renderiza a tabela ~1x/s (durações vivas) sem timer por linha */
  try{ window.addEventListener("dvl:sd-state", function(){ try{ if(state.on && state.panel!==false && latest()) renderPanel(); }catch(_){} }, {passive:true}); }catch(_){}

  /* ── API pública (para Scanner/Copilot/Market Matrix/Alerts — próximos) ── */
  window.DVL_SMART_DELTA_ENGINE_API = {
    version:"1.228",
    isOn:function(){ return !!state.on; },
    on:function(){ return !!state.on; },
    setOn:function(v){ state.on=(v===undefined?!state.on:!!v); save(); updateRow(); try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){} if(!state.on) hidePanel(); },
    getState:function(){ var o={}; for(var k in state) o[k]=state[k]; return o; },
    latest:function(){ var L=latest(); return L?Object.assign({index:L.i},L.s):null; },
    getSnapshot:function(){ compute(); return lastSnap; },
    at:function(time){ compute(); var cs=candles(); for(var i=0;i<cs.length;i++){ if(T(cs[i])===Number(time)) return cache[i]||null; } return null; },
    series:function(){ compute(); return cache.slice(); },
    openPanel:function(){ openSettings(); },
    open:function(){ openSettings(); }
  };

  /* ── indicator menu registration (registro real modules()) ────────────── */
  function updateRow(){ var st=document.getElementById("dvlSmartDeltaState"); if(st){ st.textContent=state.on?"ON":"OFF"; st.classList.toggle("is-on",!!state.on); } }
  function insertRow(){
    var menu=document.getElementById("indicatorDropdown"); if(!menu||document.getElementById("dvlSmartDeltaItem")) return;
    var item=document.createElement("div"); item.id="dvlSmartDeltaItem"; item.className="indicatorItem";
    item.innerHTML='<span class="indicatorFxMark">SD</span><span><b>DVL Smart Delta</b><small>institutional confluence</small></span><i class="dvl-vt-state" id="dvlSmartDeltaState">OFF</i>';
    menu.appendChild(item);
    var pill=item.querySelector("#dvlSmartDeltaState");
    if(pill) pill.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); window.DVL_SMART_DELTA_ENGINE_API.setOn(); });
    item.addEventListener("click",function(ev){ ev.stopPropagation(); openSettings(); });
    updateRow();
  }
  var settings=null;
  function openSettings(){
    if(!settings){
      settings=document.createElement("div"); settings.id="dvlSmartDeltaSettings"; settings.className="dvl-vt-panel";
      settings.innerHTML='<div class="dvl-vt-head"><div class="dvl-vt-title"><b>DVL Smart Delta</b><small>institutional confluence</small></div><div class="dvl-vt-head-actions"><button class="dvl-vt-close" id="dvlSDClose" type="button">×</button></div></div><div class="dvl-vt-body" id="dvlSDBody"></div>';
      document.body.appendChild(settings);
      settings.addEventListener("pointerdown",function(e){ e.stopPropagation(); },true);
      settings.querySelector("#dvlSDClose").addEventListener("click",function(){ settings.classList.remove("is-open"); });
    }
    var b=settings.querySelector("#dvlSDBody");
    /* Beta 1.256 — config da tabela institucional (consome DVL_SMART_DELTA_STATE) */
    var TS=window.DVL_SMART_DELTA_STATE, tcfg=TS?TS.cfg():null;
    var tblSec="";
    if(TS&&tcfg){
      var modLabels=[["netDelta","Net Delta"],["netLong","Net Long"],["netShort","Net Short"],["oi","OI"],["lsr","LSR"]];
      var modChecks=modLabels.map(function(p){ var on=tcfg.modules&&tcfg.modules[p[0]]!==false; return '<div class="dvl-vt-field"><label>'+p[1]+'</label><label class="dvl-switch"><input id="sdtM_'+p[0]+'" type="checkbox" '+(on?"checked":"")+'><i></i><b></b></label></div>'; }).join("");
      var vsel=function(v){ return (tcfg.view||"auto")===v?" selected":""; };
      tblSec='<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Tabela institucional (overlay)</span></div><div class="dvl-vt-grid">'+
        '<div class="dvl-vt-field"><label>Exibição</label><select id="sdtView" class="dvl-vt-select"><option value="auto"'+vsel("auto")+'>Auto (mobile/PC)</option><option value="detailed"'+vsel("detailed")+'>Detalhado</option><option value="compact"'+vsel("compact")+'>Compacto</option><option value="collapsed"'+vsel("collapsed")+'>Colapsado</option></select></div>'+
        '<div class="dvl-vt-field"><label>Opacidade</label><input id="sdtOpacity" class="dvl-vt-input" type="number" min="0.4" max="1" step="0.05" value="'+(tcfg.opacity!=null?tcfg.opacity:1)+'"></div>'+
        '<div class="dvl-vt-field"><label>Confirmação</label><select id="sdtConfirm" class="dvl-vt-select"><option value="close"'+(tcfg.confirm!=="intrabar"?" selected":"")+'>Fechamento</option><option value="intrabar"'+(tcfg.confirm==="intrabar"?" selected":"")+'>Intrabar</option></select></div>'+
        '<div class="dvl-vt-field"><label>Banda neutra %</label><input id="sdtTol" class="dvl-vt-input" type="number" min="0" max="5" step="0.05" value="'+(tcfg.tolPct!=null?tcfg.tolPct:0.15)+'"></div>'+
        '<div class="dvl-vt-field"><label>Média (MA)</label><input id="sdtMa" class="dvl-vt-input" type="number" min="2" max="200" step="1" value="'+(tcfg.maLen||20)+'"></div>'+
        '<div class="dvl-vt-field"><label>Duração</label><select id="sdtDur" class="dvl-vt-select"><option value="both"'+(tcfg.durMode!=="candles"&&tcfg.durMode!=="time"?" selected":"")+'>Candles + tempo</option><option value="candles"'+(tcfg.durMode==="candles"?" selected":"")+'>Só candles</option><option value="time"'+(tcfg.durMode==="time"?" selected":"")+'>Só tempo</option></select></div>'+
        '</div><div class="dvl-vt-section-title" style="margin-top:6px"><span>Módulos visíveis</span></div><div class="dvl-vt-grid">'+
        modChecks+'</div></div>';
    }
    b.innerHTML='<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Geral</span></div><div class="dvl-vt-grid">'+
      '<div class="dvl-vt-field"><label>Ativo</label><label class="dvl-switch"><input id="sdOn" type="checkbox" '+(state.on?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Painel</label><label class="dvl-switch"><input id="sdPanel" type="checkbox" '+(state.panel!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Altura</label><input id="sdHeight" class="dvl-vt-input" type="number" min="18" max="80" step="2" value="'+(state.height||38)+'"></div>'+
      '<div class="dvl-vt-field"><label>Neutro ±</label><input id="sdTh" class="dvl-vt-input" type="number" min="2" max="60" step="1" value="'+(state.thNeutral||18)+'"></div>'+
      '<div class="dvl-vt-field"><label>Tabela detalhada</label><label class="dvl-switch"><input id="sdDetailed" type="checkbox" '+(state.detailed?"checked":"")+'><i></i><b></b></label></div>'+
      '</div></div>'+
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Histograma (painel próprio)</span></div><div class="dvl-vt-grid">'+
      '<div class="dvl-vt-field"><label>Histograma</label><label class="dvl-switch"><input id="sdHist" type="checkbox" '+(state.histogram!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Média (MA)</label><label class="dvl-switch"><input id="sdMaOn" type="checkbox" '+(state.maOn!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>MA Length</label><input id="sdMaLen" class="dvl-vt-input" type="number" min="2" max="100" step="1" value="'+(state.maLen||9)+'"></div>'+
      '<div class="dvl-vt-field"><label>Magnitude real</label><label class="dvl-switch"><input id="sdMagMode" type="checkbox" '+(state.magnitudeMode!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Janela magnitude</label><input id="sdMagLen" class="dvl-vt-input" type="number" min="10" max="300" step="1" value="'+(state.magnitudeLookback||50)+'"></div>'+
      '<div class="dvl-vt-field"><label>Peso inteligência</label><input id="sdIntelW" class="dvl-vt-input" type="number" min="0" max="1" step="0.05" value="'+(state.intelligenceWeight!=null?state.intelligenceWeight:0.65)+'"></div>'+
      '<div class="dvl-vt-field"><label>Spike ×</label><input id="sdSpike" class="dvl-vt-input" type="number" min="1.2" max="6" step="0.1" value="'+(state.spikeMult||2)+'"></div>'+
      '<div class="dvl-vt-field"><label>Linha zero</label><label class="dvl-switch"><input id="sdZero" type="checkbox" '+(state.zeroLine!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Largura barra</label><input id="sdBarW" class="dvl-vt-input" type="number" min="0.3" max="0.98" step="0.02" value="'+(state.barWidth||0.86)+'"></div>'+
      '<div class="dvl-vt-field"><label>Auto escala</label><label class="dvl-switch"><input id="sdAuto" type="checkbox" '+(state.autoScale!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Opac. p/ Confidence</label><label class="dvl-switch"><input id="sdCO" type="checkbox" '+(state.useConfOpacity!==false?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Opac. máx</label><input id="sdOpMax" class="dvl-vt-input" type="number" min="0.4" max="1" step="0.05" value="'+(state.maxOpacity||0.95)+'"></div>'+
      '<div class="dvl-vt-field"><label>Opac. mín</label><input id="sdOpMin" class="dvl-vt-input" type="number" min="0.05" max="0.8" step="0.05" value="'+(state.minOpacity||0.28)+'"></div>'+
      '<div class="dvl-vt-field"><label>Espessura MA</label><input id="sdMaTh" class="dvl-vt-input" type="number" min="1" max="3" step="0.1" value="'+(state.maThick||2.2)+'"></div>'+
      '</div></div>'+
      '<div class="dvl-vt-section"><div class="dvl-vt-section-title"><span>Smart Alerts</span></div><div class="dvl-vt-grid">'+
      '<div class="dvl-vt-field"><label>Alertas</label><label class="dvl-switch"><input id="sdAlertOn" type="checkbox" '+(state.alertOn?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>|Delta| ≥</label><input id="sdAlDelta" class="dvl-vt-input" type="number" min="20" max="100" step="5" value="'+(state.alertDelta||60)+'"></div>'+
      '<div class="dvl-vt-field"><label>Confidence ≥</label><input id="sdAlConf" class="dvl-vt-input" type="number" min="40" max="100" step="5" value="'+(state.alertConf||70)+'"></div>'+
      '<div class="dvl-vt-field"><label>Exhaustion ≥</label><input id="sdAlExh" class="dvl-vt-input" type="number" min="40" max="100" step="5" value="'+(state.alertExh||75)+'"></div>'+
      '<div class="dvl-vt-field"><label>Alerta confluência</label><label class="dvl-switch"><input id="sdAlConflOn" type="checkbox" '+(state.alertConflOn?"checked":"")+'><i></i><b></b></label></div>'+
      '<div class="dvl-vt-field"><label>Módulos alinhados ≥</label><input id="sdAlConflMin" class="dvl-vt-input" type="number" min="2" max="3" step="1" value="'+(state.alertConflMin||2)+'"></div>'+
      '<div class="dvl-vt-field"><label>Tempo mín (min)</label><input id="sdAlConflMins" class="dvl-vt-input" type="number" min="0" max="240" step="1" value="'+(state.alertConflMins!=null?state.alertConflMins:10)+'"></div>'+
      '</div></div>'+
      tblSec;
    function bind(id,key,type){ var el=b.querySelector("#"+id); if(!el) return; var fn=function(){ if(type==="check") state[key]=!!el.checked; else { var nv=Number(String(el.value).replace(",",".")); state[key]=isFinite(nv)?nv:DEFAULTS[key]; } cacheKey=""; if(id==="sdOn") updateRow(); if(id==="sdPanel"&&!state.panel) hidePanel(); save(); try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){} }; el.addEventListener("change",fn); el.addEventListener("input",fn); }
    bind("sdOn","on","check"); bind("sdPanel","panel","check"); bind("sdHeight","height","num"); bind("sdTh","thNeutral","num"); bind("sdDetailed","detailed","check");
    bind("sdHist","histogram","check"); bind("sdMaOn","maOn","check"); bind("sdMaLen","maLen","num"); bind("sdMagMode","magnitudeMode","check"); bind("sdMagLen","magnitudeLookback","num"); bind("sdIntelW","intelligenceWeight","num"); bind("sdSpike","spikeMult","num"); bind("sdZero","zeroLine","check");
    bind("sdBarW","barWidth","num"); bind("sdAuto","autoScale","check"); bind("sdCO","useConfOpacity","check"); bind("sdOpMax","maxOpacity","num"); bind("sdOpMin","minOpacity","num"); bind("sdMaTh","maThick","num");
    bind("sdAlertOn","alertOn","check"); bind("sdAlDelta","alertDelta","num"); bind("sdAlConf","alertConf","num"); bind("sdAlExh","alertExh","num");
    bind("sdAlConflOn","alertConflOn","check"); bind("sdAlConflMin","alertConflMin","num"); bind("sdAlConflMins","alertConflMins","num");
    /* Beta 1.256 — binds da tabela institucional → DVL_SMART_DELTA_STATE.setCfg + re-render */
    if(TS){
      var setT=function(patch){ try{ TS.setCfg(patch); }catch(_){} try{ renderPanel(); }catch(_){} };
      var _view=b.querySelector("#sdtView"); if(_view) _view.addEventListener("change",function(){ setT({view:_view.value}); });
      var _op=b.querySelector("#sdtOpacity"); if(_op){ var _fo=function(){ setT({opacity:Math.max(0.4,Math.min(1,Number(_op.value)||1))}); }; _op.addEventListener("change",_fo); _op.addEventListener("input",_fo); }
      var _cSel=b.querySelector("#sdtConfirm"); if(_cSel) _cSel.addEventListener("change",function(){ setT({confirm:_cSel.value}); });
      var _tol=b.querySelector("#sdtTol"); if(_tol){ var _ft=function(){ setT({tolPct:Math.max(0,Number(_tol.value)||0)}); }; _tol.addEventListener("change",_ft); _tol.addEventListener("input",_ft); }
      var _ma=b.querySelector("#sdtMa"); if(_ma){ var _fm=function(){ setT({maLen:Math.max(2,parseInt(_ma.value,10)||20)}); }; _ma.addEventListener("change",_fm); _ma.addEventListener("input",_fm); }
      var _dur=b.querySelector("#sdtDur"); if(_dur) _dur.addEventListener("change",function(){ setT({durMode:_dur.value}); });
      ["netDelta","netLong","netShort","oi","lsr"].forEach(function(k){ var _el=b.querySelector("#sdtM_"+k); if(_el) _el.addEventListener("change",function(){ var mods=Object.assign({}, (TS.cfg().modules||{})); mods[k]=_el.checked; setT({modules:mods}); }); });
    }
    try{ if(window.DVLIndicatorCustomControls&&window.DVLIndicatorCustomControls.upgrade) window.DVLIndicatorCustomControls.upgrade(settings); }catch(_){}
    settings.classList.add("is-open");
  }

  function boot(){ insertRow(); if(state.on){ try{ if(typeof drawSoon==="function") drawSoon(); }catch(_){} } }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",function(){ setTimeout(boot,0); },{once:true}); else setTimeout(boot,0);
})();
