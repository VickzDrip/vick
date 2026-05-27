/**
 * HVN CLARITY ENGINE — DepthVisionLab
 * Indicador nativo para o index.html do DepthVisionLab.
 *
 * DEPENDÊNCIAS DO HOST (já existem no index.html):
 *   S              — estado global (S.candles, S.tf, S.sym, S.inds, S.view, S._cross)
 *   el(id)         — document.getElementById
 *   PL, PT, PB, PR — padding do chart (PB é expandido por _hvnClarityH)
 *   RP(), CW(W)    — right-padding e chart-width calculados
 *   clamp(v,a,b)   — utilitário clamp
 *   visible()      — retorna V (visible candle range)
 *   scale(cs,H)    — retorna sc (mapeador price→Y)
 *   x(i)           — mapeador candle-index→pixel X
 *   calcATR(candles, period) — retorna array ATR
 *   _hvnRR(ctx,x,y,w,h,r)   — rounded rect path helper
 *   safeLayer(name, fn)      — wrapper try/catch para camadas do draw()
 *   window.__hvnZones()      — getter das zonas HVN ativas
 *   draw() / drawSoon()      — funções de redraw
 *
 * COMO INTEGRAR AO INDEX.HTML:
 *   1. Variáveis (seção de declarações globais, próximo de PL/PT/PB):
 *        const PL=18,PT=8; let PB=10; let PR=68;
 *        let _hvnClarityH = (()=>{
 *          try{const v=parseInt(localStorage.getItem('dvl_hvnClarityH'));
 *            return(v>=60&&v<=280)?v:158;}catch(e){return 158;}
 *        })();
 *
 *   2. Caches (declarar junto às outras variáveis de estado):
 *        let _hvnClarityCache = null;
 *        let _hvnReactsCache  = null;
 *
 *   3. Dentro do draw() — expandir PB para o painel e chamar as funções:
 *        // No início do draw(), antes de setupCanvas:
 *        const _clarH = S.inds.hvnClarity && S.candles.length ? _hvnClarityH : 0;
 *        PB = 10 + (_clarH ? _clarH + 2 : 0);
 *        // Mostrar/ocultar o resize handle:
 *        const _rh = el('hvnResizeHandle');
 *        if(_rh){ _rh.style.display = _clarH>0?'block':'none';
 *                 _rh.style.bottom  = (10+_clarH-3)+'px'; }
 *        // No fluxo de draw, após resetCtxState:
 *        if(S.inds.hvnClarity)
 *          safeLayer('HVN Clarity Engine', ()=>drawHVNClarityEngine(ctx,W,H,AllV,sc,x));
 *        // No final, antes de drawTimeAxis():
 *        if(_clarH>0) drawTrendClarityOnCanvas(ctx,V,sc,x,W,H,_clarH);
 *
 *   4. No boot() — limpar cache ao trocar TF/símbolo:
 *        clearHVNClarityCache();
 *
 *   5. Event listeners (section de wiring, após DOMContentLoaded):
 *        ['hvnClarityScenario','hvnClarityLookback','hvnShowBounce',
 *         'hvnShowRejection','hvnShowBreakout','hvnShowFailedBreakout',
 *         'hvnShowSupportFail','hvnLineGlow','hvnHistOpac']
 *          .forEach(id=>{const n=el(id);if(n)n.addEventListener('change',()=>{
 *            _hvnClarityCache=null;_hvnReactsCache=null;drawSoon();})});
 *        ['hvnLineGlow','hvnHistOpac']
 *          .forEach(id=>{const n=el(id);if(n)n.addEventListener('input',drawSoon)});
 *
 *   6. Resize handle (IIFE no final do wiring):
 *        (()=>{let _rhDrag=null;const rh=el('hvnResizeHandle');if(!rh)return;
 *          rh.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
 *            rh.setPointerCapture(e.pointerId);_rhDrag={y:e.clientY,h:_hvnClarityH};
 *            rh.classList.add('active');});
 *          rh.addEventListener('pointermove',e=>{if(!_rhDrag)return;
 *            _hvnClarityH=clamp(_rhDrag.h-(e.clientY-_rhDrag.y),60,280);drawSoon();});
 *          rh.addEventListener('pointerup',()=>{if(!_rhDrag)return;_rhDrag=null;
 *            rh.classList.remove('active');
 *            try{localStorage.setItem('dvl_hvnClarityH',Math.round(_hvnClarityH));}catch(_){}});
 *          rh.addEventListener('pointercancel',()=>{_rhDrag=null;rh.classList.remove('active');});
 *        })();
 */

// ─────────────────────────────────────────────────────────────────────────────
// VARIÁVEIS DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

// Altura do painel Trend Clarity (px, persistida em localStorage)
let _hvnClarityH = (()=>{
  try{const v=parseInt(localStorage.getItem('dvl_hvnClarityH'));
    return(v>=60&&v<=280)?v:158;}catch(e){return 158;}
})();

// Cache do estado de claridade (calculado, re-usado enquanto a chave não muda)
let _hvnClarityCache = null;

// Cache da lista de reações HVN
let _hvnReactsCache  = null;


// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PRINCIPAIS
// ─────────────────────────────────────────────────────────────────────────────

/** Invalida ambos os caches (chamar em boot() ao trocar TF/símbolo). */
function clearHVNClarityCache(){_hvnClarityCache=null;_hvnReactsCache=null;}


/**
 * Calcula o estado de "HVN Clarity" para o cenário selecionado.
 * Resultado cacheado: estável durante pan/zoom, re-calculado só quando o
 * símbolo, TF, candles ou zonas HVN mudam.
 *
 * @returns {object|null} state — { scenario, callout, anchorPrice, bounceIdx,
 *                                  trendState, confidence, summary, bullish }
 */
function getHVNClarityState(){
  if(!S.inds.hvnClarity||!S.candles.length){_hvnClarityCache=null;return null;}
  const N=S.candles.length;
  const scenario=el('hvnClarityScenario')?.value||'support_bounce';

  // Usar zonas HVN ao vivo (window.__hvnZones é uma getter fn, não array direto)
  const hvnZones=window.__hvnZones?.()?.map(z=>({price:(z.hi+z.lo)/2,vol:z.totalVol}))||[];

  // Chave estável: inclui sym, tf, ts do último candle → invalida ao trocar TF
  const hvnFp=hvnZones.slice(0,4).map(z=>Math.round(z.price)).join(',');
  const key=`${S.sym}|${S.tf}|${N}|${S.candles.at(-1)?.t||0}|${scenario}|${hvnFp}`;
  if(_hvnClarityCache&&_hvnClarityCache.key===key)return _hvnClarityCache.state;

  // ── Preço âncora: zona HVN mais próxima do fechamento atual ──
  let anchorPrice;
  if(hvnZones.length){
    const lastC=S.candles[N-1];
    const sorted=[...hvnZones].sort((a,b)=>Math.abs(a.price-lastC.c)-Math.abs(b.price-lastC.c));
    anchorPrice=sorted[0].price;
  }else{
    const V=visible();
    if(!V.cs.length)return null;
    const hi=Math.max(...V.cs.map(c=>c.h)),lo=Math.min(...V.cs.map(c=>c.l));
    anchorPrice=lo+(hi-lo)*0.28;
  }

  // ── Tolerância ATR ──
  const atrArr=calcATR(S.candles.slice(Math.max(0,N-28),N),14);
  const atrVal=(atrArr.filter(v=>v).at(-1))||(anchorPrice*0.005);
  const tol=atrVal*0.65;

  // ── Analisar últimos candles vs zona HVN ──
  const LOOK=Math.min(25,Math.floor(N*0.12)+8);
  const startIdx=Math.max(0,N-LOOK);
  let rejections=0,bounces=0,crossings=0,lastAbove=S.candles[startIdx]?.c>anchorPrice;
  let rejIdx=N-1,bounceIdx=N-1;

  for(let i=startIdx;i<N;i++){
    const c=S.candles[i];
    const isAbove=c.c>anchorPrice;
    const nearHVN=c.h>=anchorPrice-tol&&c.l<=anchorPrice+tol;
    if(nearHVN){
      const topWick=c.h-Math.max(c.o,c.c);
      const totalRange=Math.max(1e-9,c.h-c.l);
      if(c.h>=anchorPrice-tol*0.4&&c.c<anchorPrice&&topWick>totalRange*0.28){
        rejections++;rejIdx=i;
      }
      if(c.l<=anchorPrice+tol*0.4&&c.c>anchorPrice&&c.c>=c.o){
        bounces++;bounceIdx=i;
      }
    }
    if(i>startIdx&&isAbove!==lastAbove)crossings++;
    lastAbove=isAbove;
  }

  let consAbove=0,consBelow=0;
  for(let i=N-1;i>=startIdx;i--){if(S.candles[i].c>anchorPrice)consAbove++;else break;}
  for(let i=N-1;i>=startIdx;i--){if(S.candles[i].c<anchorPrice)consBelow++;else break;}

  // ── Auto-detectar padrão pelos dados ──
  let detected=scenario;
  if(hvnZones.length){
    if(rejections>=2&&consBelow>=1)detected='rejection';
    else if(bounces>=2&&consAbove>=1)detected='support_bounce';
    else if(consAbove>=4&&rejections===0)detected='breakout';
    else if(rejections>=1&&consBelow>=2&&bounces>0)detected='failed_breakout';
    else if(crossings>=3)detected='rotation';
  }

  const ap=anchorPrice>=1?anchorPrice.toFixed(0):anchorPrice.toFixed(4);
  const rejLbl=rejections>=2?`${rejections}× wick rejection`:'Wick rejection';
  const bncLbl=bounces>=2?`${bounces}× bounce`:'Bounce';

  const stMap={
    support_bounce:{
      callout:bounces>=2?`${bncLbl} · HVN ${ap} holds as support`:`Bounce from HVN ${ap} support`,
      trendState:'CLEAR BULL',
      confidence:Math.min(93,74+bounces*5+consAbove*2),
      summary:'HVN SUPPORT + CLARITY RISING',
      bullish:true,
      anchorIdx:bounceIdx
    },
    rejection:{
      callout:rejections>=2?`${rejLbl} at HVN ${ap}`:`Rejection at HVN ${ap} resistance`,
      trendState:'BEARISH SHIFT',
      confidence:Math.min(92,68+rejections*5+consBelow*2),
      summary:'HVN REJECTION + CLARITY FALLING',
      bullish:false,
      anchorIdx:rejIdx
    },
    breakout:{
      callout:`Breakout accepted above HVN ${ap}`,
      trendState:'STRONG BULL',
      confidence:Math.min(95,80+consAbove*2),
      summary:'HVN BREAKOUT ACCEPTED + CLARITY STRONG',
      bullish:true,
      anchorIdx:N-1
    },
    rotation:{
      callout:`Price rotating between HVN zones`,
      trendState:'NO CLEAR EDGE',
      confidence:Math.max(28,Math.min(52,34+crossings*3)),
      summary:'HVN ROTATION + LOW CLARITY',
      bullish:null,
      anchorIdx:Math.max(0,N-Math.floor(LOOK/2))
    },
    failed_breakout:{
      callout:`Failed breakout · rejected at HVN ${ap}`,
      trendState:'BEARISH SHIFT',
      confidence:Math.min(90,60+rejections*5+consBelow*3),
      summary:'FAILED BREAKOUT + CLARITY WEAKENING',
      bullish:false,
      anchorIdx:rejIdx
    }
  };

  const st=stMap[detected]||stMap.support_bounce;
  const stableAnchorIdx=Math.max(0,Math.min(N-1,st.anchorIdx));

  const state={
    scenario:detected,
    callout:st.callout,
    anchorPrice,
    bounceIdx:stableAnchorIdx,
    trendState:st.trendState,
    confidence:st.confidence,
    summary:st.summary,
    bullish:st.bullish
  };
  _hvnClarityCache={key,state};
  return state;
}


/**
 * Detecta reações HVN históricas com limiares estritos + confirmação de 1 candle.
 * Tipos: bounce (BNC), rejection (REJ), breakout (BRK), failed_breakout (FAIL), support_fail (S↓)
 * Regras anti-spam: cooldown 12 candles por tipo/zona, gap global 8 candles, dedup de prioridade.
 *
 * @returns {Array} [{idx, type, label, bullish, hvnPrice, prio}, ...]
 */
function _getHVNReactions(){
  if(!S.inds.hvnClarity||!S.candles.length)return[];
  const N=S.candles.length;
  const lookback=Math.min(N,Math.max(20,parseInt(el('hvnClarityLookback')?.value)||150));

  const showBounce    =el('hvnShowBounce')?.checked!==false;
  const showRejection =el('hvnShowRejection')?.checked!==false;
  const showBreakout  =el('hvnShowBreakout')?.checked!==false;
  const showFail      =el('hvnShowFailedBreakout')?.checked!==false;
  const showSFail     =el('hvnShowSupportFail')?.checked!==false;

  const _rawZones=window.__hvnZones?.()?.map(z=>({price:(z.hi+z.lo)/2}))||[];
  let zones=_rawZones.length?_rawZones:(()=>{const st=getHVNClarityState();return st?[{price:st.anchorPrice}]:[];})();
  if(!zones.length)return[];

  const hvnFp=zones.slice(0,5).map(z=>Math.round(z.price)).join(',');
  const key=`${S.sym}|${S.tf}|${N}|${S.candles.at(-1)?.t||0}|${lookback}|${hvnFp}|${+showBounce}${+showRejection}${+showBreakout}${+showFail}${+showSFail}`;
  if(_hvnReactsCache&&_hvnReactsCache.key===key)return _hvnReactsCache.reactions;

  const atrArr=calcATR(S.candles.slice(Math.max(0,N-28),N),14);
  const atrVal=(atrArr.filter(v=>v).at(-1))||(S.candles[N-1].c*0.005);
  const tol=atrVal*0.65;
  const startIdx=Math.max(0,N-lookback);

  const PRIO       ={failed_breakout:1,breakout:2,rejection:3,bounce:4,support_fail:5};
  const TYPE_LABEL ={failed_breakout:'FAIL',breakout:'BRK',rejection:'REJ',bounce:'BNC',support_fail:'S↓'};
  const TYPE_BULL  ={failed_breakout:false,breakout:true,rejection:false,bounce:true,support_fail:false};

  const COOLDOWN=12;  // candles entre o mesmo tipo na mesma zona
  const ZONE_GAP=8;   // candles entre qualquer evento na mesma zona

  const allCandidates=[];

  zones.forEach(zone=>{
    const hvnP=zone.price;
    const lastT={failed_breakout:startIdx-COOLDOWN,breakout:startIdx-COOLDOWN,
                 rejection:startIdx-COOLDOWN,bounce:startIdx-COOLDOWN,support_fail:startIdx-COOLDOWN};
    let zLast=startIdx-ZONE_GAP;

    for(let i=startIdx;i<N;i++){
      if(i-zLast<ZONE_GAP)continue;
      const c=S.candles[i];
      const prev=i>0?S.candles[i-1]:c;
      const next=i+1<N?S.candles[i+1]:null; // candle de confirmação (null = candle ao vivo)

      // Portão: candle deve tocar ou entrar na zona
      if(c.h<hvnP-tol||c.l>hvnP+tol)continue;

      const topWick=c.h-Math.max(c.o,c.c);
      const botWick=Math.min(c.o,c.c)-c.l;
      const body=Math.abs(c.c-c.o);
      const rng=Math.max(1e-9,c.h-c.l);
      const isBear=c.c<c.o, isBull=c.c>c.o;

      let type=null;

      // Failed Breakout: fechou acima, colapsou de volta
      if(showFail&&i-lastT.failed_breakout>=COOLDOWN){
        const sig=prev.c>hvnP+tol*0.3&&c.c<hvnP-tol*0.3&&isBear;
        const cfm=next?next.c<hvnP:(isBear&&body>rng*0.25);
        if(sig&&cfm)type='failed_breakout';
      }
      // Breakout: fechou claramente acima, manteve
      if(!type&&showBreakout&&i-lastT.breakout>=COOLDOWN){
        const sig=prev.c<hvnP-tol*0.3&&c.c>hvnP+tol*0.8&&isBull;
        const cfm=next?next.l>=hvnP-tol*0.5:(isBull&&body>rng*0.25);
        if(sig&&cfm)type='breakout';
      }
      // Rejection: wick sondou zona, corpo bearish fechou abaixo
      if(!type&&showRejection&&i-lastT.rejection>=COOLDOWN){
        const sig=c.h>=hvnP-tol*0.3&&c.c<hvnP-tol*0.2&&isBear&&topWick>rng*0.38&&body>rng*0.10;
        const cfm=next?next.c<c.c:(isBear&&body>rng*0.20);
        if(sig&&cfm)type='rejection';
      }
      // Bounce: wick tocou suporte, corpo bullish fechou acima
      if(!type&&showBounce&&i-lastT.bounce>=COOLDOWN){
        const sig=c.l<=hvnP+tol*0.3&&c.c>hvnP+tol*0.2&&isBull&&botWick>rng*0.28&&body>rng*0.10;
        const cfm=next?next.c>c.c:(isBull&&body>rng*0.20);
        if(sig&&cfm)type='bounce';
      }
      // Support Fail: fechou abaixo do suporte, sem wick de recuperação
      if(!type&&showSFail&&i-lastT.support_fail>=COOLDOWN){
        const sig=c.l<=hvnP+tol*0.3&&c.c<hvnP-tol*0.3&&isBear&&botWick<rng*0.18;
        const cfm=next?next.c<hvnP:(isBear&&body>rng*0.25);
        if(sig&&cfm)type='support_fail';
      }

      if(type){
        lastT[type]=i; zLast=i;
        allCandidates.push({idx:i,type,label:TYPE_LABEL[type],bullish:TYPE_BULL[type],hvnPrice:hvnP,prio:PRIO[type]});
      }
    }
  });

  // Dedup global: dentro de 3 candles mantém maior prioridade; gap mínimo de 8 candles
  allCandidates.sort((a,b)=>a.idx-b.idx||(a.prio-b.prio));
  const deduped=[];
  for(const r of allCandidates){
    const last=deduped[deduped.length-1];
    if(last&&r.idx-last.idx<3){
      if(r.prio<last.prio)deduped[deduped.length-1]=r;
    }else if(!last||r.idx-last.idx>=8){
      deduped.push(r);
    }
  }

  const final=deduped.slice(-20);
  _hvnReactsCache={key,reactions:final};
  return final;
}


/**
 * Desenha tags de reação HVN ancoradas aos wicks dos candles.
 * Chamado no fluxo principal do draw() quando S.inds.hvnClarity=true.
 */
function drawHVNClarityEngine(ctx,W,H,V,sc,x){
  const rp=RP(),chartRight=W-rp;
  const reactions=_getHVNReactions();
  if(!reactions.length)return;

  // Estilo visual por tipo de reação
  const TYPE_STYLE={
    rejection:      {gc:'255,90,50',  bc:'rgba(255,88,48,0.65)', bg:'rgba(40,8,5,0.88)',  tc:'rgba(255,165,130,0.95)',place:'above'},
    failed_breakout:{gc:'255,148,0',  bc:'rgba(255,145,0,0.62)', bg:'rgba(40,22,0,0.88)', tc:'rgba(255,200,130,0.95)',place:'above'},
    support_fail:   {gc:'255,60,80',  bc:'rgba(255,55,70,0.60)', bg:'rgba(40,5,10,0.88)', tc:'rgba(255,150,155,0.92)',place:'below'},
    bounce:         {gc:'0,210,255',  bc:'rgba(0,190,230,0.65)', bg:'rgba(3,22,40,0.88)', tc:'rgba(162,222,255,0.95)',place:'below'},
    breakout:       {gc:'0,230,118',  bc:'rgba(0,220,110,0.62)', bg:'rgba(3,30,14,0.88)', tc:'rgba(160,255,200,0.95)',place:'above'},
  };

  // ── Anéis de glow para as últimas 3 reações ──
  ctx.save();
  reactions.slice(-3).forEach(react=>{
    const {idx,type}=react;
    if(idx<V.a||idx>=V.b)return;
    const c=S.candles[idx];if(!c)return;
    const st=TYPE_STYLE[type]||TYPE_STYLE.bounce;
    const bx=x(idx);
    const by=st.place==='above'?sc.y(c.h):sc.y(c.l);
    const r=Math.max(12,Math.abs(sc.y(c.h)-sc.y(c.l))*0.4+8);
    const grd=ctx.createRadialGradient(bx,by,r*0.2,bx,by,r*2.0);
    grd.addColorStop(0,`rgba(${st.gc},0.14)`);grd.addColorStop(0.5,`rgba(${st.gc},0.05)`);grd.addColorStop(1,`rgba(${st.gc},0)`);
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(bx,by,r*2.0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${st.gc},0.40)`;ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
  });
  ctx.restore();

  // ── Tags mini ancoradas ao wick + grade de colisão (balde 24px) ──
  const BUCKET=24;
  const colGrid=new Map();
  const colOccupied=(colIdx,top,bot)=>{
    const slots=colGrid.get(colIdx)||[];
    for(const [t,b] of slots){if(top<=b+2&&bot>=t-2)return true;}
    return false;
  };
  const colReserve=(colIdx,top,bot)=>{
    if(!colGrid.has(colIdx))colGrid.set(colIdx,[]);
    colGrid.get(colIdx).push([top,bot]);
  };

  const latest=reactions[reactions.length-1];
  ctx.save();
  reactions.forEach(react=>{
    const {idx,type,label}=react;
    if(idx<V.a||idx>=V.b)return;
    const c=S.candles[idx];if(!c)return;
    const rx=x(idx);
    if(rx<PL+2||rx>chartRight-2)return;
    const st=TYPE_STYLE[type]||TYPE_STYLE.bounce;
    const isLatest=react===latest;
    const tagH=isLatest?16:11,tagPad=isLatest?5:3;
    ctx.font=`${isLatest?'700':'600'} ${isLatest?8:7}px monospace`;
    const tw=ctx.measureText(label).width+tagPad*2+2;

    // Âncora ao wick
    const wickY=st.place==='above'?sc.y(c.h):sc.y(c.l);
    const tagY=st.place==='above'?wickY-tagH-4:wickY+4;
    if(tagY<PT+2||tagY+tagH>H-PB-2)return;

    // Verificação de colisão
    const colIdx=Math.floor(rx/BUCKET);
    if(colOccupied(colIdx,tagY,tagY+tagH))return;
    colReserve(colIdx,tagY,tagY+tagH);

    const tagX=clamp(rx-tw/2,PL+2,chartRight-tw-2);

    // Fundo + borda
    ctx.fillStyle=st.bg;_hvnRR(ctx,tagX,tagY,tw,tagH,2);ctx.fill();
    ctx.strokeStyle=st.bc;ctx.lineWidth=isLatest?0.85:0.60;_hvnRR(ctx,tagX,tagY,tw,tagH,2);ctx.stroke();
    // Texto
    ctx.fillStyle=st.tc;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,tagX+tw/2,tagY+tagH/2);
    // Haste pontilhada wick→tag
    ctx.strokeStyle=st.bc;ctx.lineWidth=0.55;ctx.setLineDash([2,2]);
    ctx.beginPath();
    if(st.place==='above'){ctx.moveTo(rx,tagY+tagH);ctx.lineTo(rx,wickY);}
    else{ctx.moveTo(rx,tagY);ctx.lineTo(rx,wickY);}
    ctx.stroke();ctx.setLineDash([]);
  });
  ctx.restore();
}


/**
 * Stub: o painel Trend Clarity agora é desenhado diretamente no canvas principal.
 * Mantém o elemento DOM permanentemente oculto.
 */
function drawTrendClarityPanel(){
  const p=el('hvnClarityPane');if(p)p.style.display='none';
}


/**
 * Calcula o valor de Trend Clarity para um candle (−100 a +100).
 * Composição: posição do close na range + pressão delta compra/venda + momentum 14-bar.
 */
function getTrendClarityValue(idx){
  const c=S.candles[idx];
  if(!c)return 0;
  const range=Math.max(1e-9,c.h-c.l);
  const closeComp=((c.c-c.l)/range-0.5)*50;
  const tot=(c.buy||0)+(c.sell||0);
  const deltaComp=tot>0?((c.buy||0)/tot-0.5)*50:0;
  let trendComp=0;
  if(idx>=14){
    const ref=S.candles[idx-14];
    if(ref){const chg=(c.c-ref.c)/Math.max(1e-9,ref.c);trendComp=Math.sign(chg)*Math.min(35,Math.abs(chg)*6000);}
  }
  return Math.max(-100,Math.min(100,closeComp+deltaComp+trendComp));
}


/**
 * Desenha o painel oscillator "Trend Clarity" dentro do canvas principal,
 * na faixa inferior reservada por PB (_clarH pixels).
 *
 * Inclui: header, grid de referência, histograma, linha oscillator com glow,
 * dot final, tag de estado no footer e extensão do crosshair.
 */
function drawTrendClarityOnCanvas(ctx,V,sc,x,W,H,clarH){
  const rp=RP();
  const pLeft=PL,pRight=W-rp;
  const pTop=H-10-clarH;  // 10 = base PB
  const pBot=H-10;
  const pH=clarH;

  // ── Fundo ──
  ctx.fillStyle='#040710';ctx.fillRect(0,pTop,W,pH);
  ctx.fillStyle='#020508';
  ctx.fillRect(0,pTop,pLeft,pH);ctx.fillRect(pRight,pTop,W-pRight,pH);

  // Linha divisória com o chart
  ctx.strokeStyle='#1a2236';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,pTop);ctx.lineTo(W,pTop);ctx.stroke();

  // ── Header ──
  const hdrH=20;
  ctx.fillStyle='rgba(5,9,18,0.92)';ctx.fillRect(0,pTop,W,hdrH);
  ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(0,pTop+hdrH);ctx.lineTo(W,pTop+hdrH);ctx.stroke();

  ctx.font='700 9px monospace';ctx.fillStyle='#7a90b0';
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText('TREND CLARITY',pLeft,pTop+hdrH/2);

  // Ícone de info
  const iiX=pLeft+ctx.measureText('TREND CLARITY').width+9,iiY=pTop+hdrH/2;
  ctx.beginPath();ctx.arc(iiX,iiY,4.5,0,Math.PI*2);
  ctx.strokeStyle='rgba(75,105,155,0.45)';ctx.lineWidth=0.8;ctx.stroke();
  ctx.font='700 6px monospace';ctx.fillStyle='rgba(75,105,155,0.60)';
  ctx.textAlign='center';ctx.fillText('i',iiX,iiY+0.5);

  // ── Área de chart do painel ──
  const caTop=pTop+hdrH;
  const caH=pH-hdrH-16;   // 16px footer para o tag de estado
  const zY=caTop+caH*0.5; // linha zero
  const tY=caTop+caH*0.14;// +100 / STRONG
  const bY=caTop+caH*0.86;// -100 / WEAK

  // Linhas de referência
  ctx.strokeStyle='rgba(255,255,255,0.045)';ctx.lineWidth=0.5;
  [tY,bY].forEach(y=>{ctx.beginPath();ctx.moveTo(pLeft,y);ctx.lineTo(pRight,y);ctx.stroke();});
  ctx.strokeStyle='rgba(0,212,255,0.095)';ctx.lineWidth=0.8;ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(pLeft,zY);ctx.lineTo(pRight,zY);ctx.stroke();ctx.setLineDash([]);

  // Labels esquerda
  ctx.font='600 7px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
  [{t:'STRONG',y:tY},{t:'MEDIUM',y:zY},{t:'WEAK',y:bY}].forEach(({t,y})=>{
    ctx.fillStyle='rgba(55,84,130,0.85)';ctx.fillText(t,pLeft-3,y);
  });
  // Escala direita
  ctx.textAlign='left';
  [{t:'100',y:tY},{t:'0',y:zY},{t:'-100',y:bY}].forEach(({t,y})=>{
    ctx.fillStyle='rgba(42,68,105,0.85)';ctx.fillText(t,pRight+3,y);
  });

  // Mapeador valor→Y
  const valY=v=>zY-(v/100)*(caH*0.44);

  // Calcular valores para todos os candles visíveis
  const cw=CW(W);
  const bw=Math.max(1,cw/V.span*0.60);
  const visVals=[];
  for(let i=V.a;i<V.b;i++){
    const px=x(i);
    if(px<pLeft-bw||px>pRight+bw)continue;
    visVals.push({idx:i,v:getTrendClarityValue(i),px});
  }

  // ── Histograma ──
  const _histMult=Math.min(2,Math.max(0.1,parseFloat(el('hvnHistOpac')?.value)||1.0));
  visVals.forEach(({v,px})=>{
    const isBull=v>=0,abs=Math.abs(v)/100;
    const bh=abs*caH*0.44,by=isBull?zY-bh:zY;
    if(bh<0.3)return;
    let r,g,b,a;
    if(isBull){
      if(abs>0.65){r=0;g=210;b=188;a=0.88;}
      else if(abs>0.30){r=0;g=175;b=168;a=0.70;}
      else{r=0;g=128;b=145;a=0.50;}
    }else{
      if(abs>0.65){r=255;g=75;b=95;a=0.82;}
      else if(abs>0.30){r=200;g=58;b=80;a=0.62;}
      else{r=135;g=48;b=62;a=0.44;}
    }
    ctx.fillStyle=`rgba(${r},${g},${b},${Math.min(1,a*_histMult)})`;
    ctx.fillRect(px-bw/2,by,bw,Math.max(bh,0.5));
  });

  // ── Linha oscillator (3 passes: 2 glow + 1 core) ──
  const _glowMult=Math.min(2,Math.max(0,parseFloat(el('hvnLineGlow')?.value)??1.0));
  if(visVals.length>=2){
    [[0.07,7],[0.17,3.5],[0.84,1.4]].forEach(([a,lw],pi)=>{
      const fa=pi<2?Math.min(1,a*_glowMult):a;
      if(fa<=0)return;
      ctx.save();ctx.beginPath();
      ctx.strokeStyle=`rgba(0,212,240,${fa})`;ctx.lineWidth=lw;
      ctx.lineJoin='round';ctx.lineCap='round';
      visVals.forEach(({v,px},i)=>{
        const py=valY(v);
        if(!i){ctx.moveTo(px,py);return;}
        const prev=visVals[i-1];
        const cpx=(prev.px+px)/2;
        ctx.bezierCurveTo(cpx,valY(prev.v),cpx,py,px,py);
      });
      ctx.stroke();ctx.restore();
    });
    // Fill gradiente sob a linha
    ctx.save();ctx.beginPath();
    visVals.forEach(({v,px},i)=>{
      const py=valY(v);
      if(!i){ctx.moveTo(px,py);return;}
      const prev=visVals[i-1];
      const cpx=(prev.px+px)/2;
      ctx.bezierCurveTo(cpx,valY(prev.v),cpx,py,px,py);
    });
    ctx.lineTo(visVals[visVals.length-1].px,zY);ctx.lineTo(visVals[0].px,zY);ctx.closePath();
    const _fa2=Math.min(0.15,0.11*_glowMult);
    const fg=ctx.createLinearGradient(0,caTop,0,zY);
    fg.addColorStop(0,`rgba(0,200,220,${_fa2})`);
    fg.addColorStop(0.65,`rgba(0,180,200,${(_fa2*0.27).toFixed(3)})`);
    fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fg;ctx.fill();ctx.restore();
  }

  // Dot no último ponto
  const last=visVals[visVals.length-1];
  if(last){
    ctx.save();
    const _dotGlow=Math.round(5*_glowMult);
    if(_dotGlow>0){ctx.shadowColor='rgba(0,212,255,0.9)';ctx.shadowBlur=_dotGlow;}
    ctx.beginPath();ctx.arc(last.px,valY(last.v),2.8,0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();
    ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(last.px,valY(last.v),1.3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
    ctx.restore();
  }

  // ── Estado para o footer ──
  const state=getHVNClarityState();
  const isBear=state&&state.bullish===false;
  const isNeut=state&&state.bullish===null;

  // ── Tag de estado no footer ──
  const footerY=pBot-15;
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(pLeft,footerY);ctx.lineTo(pRight,footerY);ctx.stroke();

  const sumTxt=state?state.summary:'HVN SUPPORT + CLARITY RISING';
  const dotCol=isBear?'#ff6040':isNeut?'#7080b8':'#00d4ff';
  const sumTxtCol=isBear?'rgba(255,185,155,0.88)':isNeut?'rgba(165,185,230,0.88)':'rgba(155,215,255,0.90)';
  const tagBorder=isBear?'rgba(220,80,40,0.34)':isNeut?'rgba(100,120,170,0.30)':'rgba(0,175,220,0.36)';

  ctx.font='600 7.5px monospace';
  const tW2=ctx.measureText(sumTxt).width;
  const tPX=7,tH2=13,tagW=tW2+tPX*2+11;
  const tX2=pLeft,tY2=footerY+(pBot-footerY-tH2)/2;

  ctx.fillStyle='rgba(0,8,20,0.75)';_hvnRR(ctx,tX2,tY2,tagW,tH2,3);ctx.fill();
  ctx.strokeStyle=tagBorder;ctx.lineWidth=0.75;_hvnRR(ctx,tX2,tY2,tagW,tH2,3);ctx.stroke();

  ctx.save();ctx.shadowColor=isBear?'rgba(255,80,40,0.7)':'rgba(0,212,255,0.7)';ctx.shadowBlur=3;
  ctx.beginPath();ctx.arc(tX2+tPX+2.5,tY2+tH2/2,2,0,Math.PI*2);ctx.fillStyle=dotCol;ctx.fill();
  ctx.restore();

  ctx.font='600 7.5px monospace';ctx.fillStyle=sumTxtCol;
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(sumTxt,tX2+tPX+9,tY2+tH2/2);

  // ── Extensão vertical do crosshair para o painel ──
  if(S._cross){
    const cx=S._cross.cx;
    if(cx>=pLeft&&cx<=pRight){
      ctx.save();
      ctx.strokeStyle='rgba(200,216,240,0.18)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(cx,caTop+2);ctx.lineTo(cx,footerY-2);ctx.stroke();
      ctx.setLineDash([]);

      const crossIdx=Math.min(V.b-1,Math.max(V.a,Math.round(S.view.start+(cx-PL)/(CW(W)/V.span)-0.5)));
      const hv=getTrendClarityValue(crossIdx);
      const hpx=x(crossIdx);
      const hpy=valY(hv);
      if(hpx>=pLeft&&hpx<=pRight){
        ctx.shadowColor='rgba(0,212,255,0.9)';ctx.shadowBlur=4;
        ctx.beginPath();ctx.arc(hpx,hpy,3.5,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.95)';ctx.fill();
        ctx.shadowBlur=0;
        ctx.beginPath();ctx.arc(hpx,hpy,1.6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
        const vTxt=Math.round(hv).toString();
        ctx.font='700 8px monospace';ctx.fillStyle='rgba(0,200,240,0.90)';
        ctx.textAlign=hpx>pRight-36?'right':'left';ctx.textBaseline='bottom';
        ctx.fillText(vTxt,hpx+(hpx>pRight-36?-4:4),hpy-2);
      }
      ctx.restore();
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// HTML A ADICIONAR AO index.html
// ─────────────────────────────────────────────────────────────────────────────
/*
──────────────────────────────────────────────────────────────
1. CARD DO INDICADOR (sidebar, dentro da seção de indicadores)
──────────────────────────────────────────────────────────────
<div class="ind-card" data-card="hvnClarity">
  <div class="ind-head">
    <div class="row" data-ind="hvnClarity">
      <span class="name">HVN Clarity Engine</span><span class="switch"></span>
    </div>
    <button class="gear" data-settings="hvnClarity" title="Inputs HVN Clarity Engine">⚙</button>
  </div>
  <div class="ind-settings" id="settings-hvnClarity">
    <div class="kv"><span class="k">Cenário</span>
      <select class="select tiny-select" id="hvnClarityScenario">
        <option value="support_bounce" selected>Bounce from HVN</option>
        <option value="rejection">Rejection at HVN</option>
        <option value="breakout">Breakout through HVN</option>
        <option value="rotation">HVN Rotation</option>
        <option value="failed_breakout">Failed Breakout</option>
      </select>
    </div>
    <label class="kv"><span class="k">Lookback candles</span>
      <input type="number" class="num" id="hvnClarityLookback" value="150" min="20" max="500" style="width:52px">
    </label>
    <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin:5px 0 3px;">MOSTRAR REAÇÕES</div>
    <label class="kv" style="cursor:pointer;"><span class="k" style="color:#00d4ff;">Bounce</span>
      <input type="checkbox" id="hvnShowBounce" checked style="width:14px;height:14px;accent-color:#00d4ff;cursor:pointer;flex-shrink:0;">
    </label>
    <label class="kv" style="cursor:pointer;"><span class="k" style="color:#ff6040;">Rejection</span>
      <input type="checkbox" id="hvnShowRejection" checked style="width:14px;height:14px;accent-color:#ff6040;cursor:pointer;flex-shrink:0;">
    </label>
    <label class="kv" style="cursor:pointer;"><span class="k" style="color:#00e676;">Breakout</span>
      <input type="checkbox" id="hvnShowBreakout" checked style="width:14px;height:14px;accent-color:#00e676;cursor:pointer;flex-shrink:0;">
    </label>
    <label class="kv" style="cursor:pointer;"><span class="k" style="color:#ffaa00;">Failed Breakout</span>
      <input type="checkbox" id="hvnShowFailedBreakout" checked style="width:14px;height:14px;accent-color:#ffaa00;cursor:pointer;flex-shrink:0;">
    </label>
    <label class="kv" style="cursor:pointer;"><span class="k" style="color:#ff3d57;">Support Fail</span>
      <input type="checkbox" id="hvnShowSupportFail" checked style="width:14px;height:14px;accent-color:#ff3d57;cursor:pointer;flex-shrink:0;">
    </label>
    <div style="border-top:1px solid #101b2d;margin:6px 0 4px;"></div>
    <div style="font-size:9px;color:#5a7090;font-weight:700;letter-spacing:.08em;margin-bottom:4px;">OSCILLATOR</div>
    <label class="kv"><span class="k">Line glow</span>
      <input type="number" class="num" id="hvnLineGlow" value="1.0" min="0" max="2" step="0.1" style="width:52px">
    </label>
    <label class="kv"><span class="k">Hist opacity</span>
      <input type="number" class="num" id="hvnHistOpac" value="1.0" min="0.1" max="2" step="0.1" style="width:52px">
    </label>
    <div class="hint">Tags ancoradas ao wick de cada candle de reação. Arraste o divisor para redimensionar o painel.</div>
  </div>
</div>

──────────────────────────────────────────────────────────────
2. RESIZE HANDLE (dentro de .chartWrap ou .chartPanel, position:relative)
──────────────────────────────────────────────────────────────
<div id="hvnResizeHandle" style="display:none" title="Drag to resize Trend Clarity panel"></div>

──────────────────────────────────────────────────────────────
3. CSS (adicionar no <style> ou em tb-premium-final)
──────────────────────────────────────────────────────────────
#hvnResizeHandle {
  position:absolute;left:0;right:0;height:8px;
  cursor:ns-resize;z-index:15;background:transparent;
  touch-action:none;user-select:none;
}
#hvnResizeHandle::after {
  content:'';position:absolute;left:50%;top:50%;
  transform:translate(-50%,-50%);width:40px;height:2px;
  background:rgba(0,212,255,0.20);border-radius:1px;transition:background .15s;
}
#hvnResizeHandle:hover::after,
#hvnResizeHandle.active::after { background:rgba(0,212,255,0.55); }
*/
