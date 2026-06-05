function _hvnCfg(){
  return {
    lineGlow: Math.max(0,Math.min(2,parseFloat(el('hvnLineGlow')?.value)||1.0)),
    histOpac: Math.max(0.1,Math.min(2.2,parseFloat(el('hvnHistOpac')?.value)||1.15)),
  };
}

// TREND CLARITY OSCILLATOR
// ─────────────────────────────────────────────────────────────────────────────

function drawTrendClarityPanel(){
  const p=el('hvnClarityPane');
  if(p)p.style.display='none';
}

function getTrendClarityValue(idx){
  const c=S.candles[idx];
  if(!c)return 0;
  const range=Math.max(1e-9,c.h-c.l);
  const closeComp=((c.c-c.l)/range-0.5)*42;
  const bodyComp=((c.c-c.o)/range)*22;

  const tot=(c.buy||0)+(c.sell||0);
  const deltaComp=tot>0?(((c.buy||0)-(c.sell||0))/tot)*26:0;

  let mom=0, slope=0;
  if(idx>=8){
    const ref=S.candles[idx-8];
    mom=(c.c-ref.c)/Math.max(1e-9,ref.c);
  }
  if(idx>=21){
    const ref=S.candles[idx-21];
    slope=(c.c-ref.c)/Math.max(1e-9,ref.c);
  }
  const momComp=Math.sign(mom)*Math.min(34,Math.abs(mom)*5600);
  const slopeComp=Math.sign(slope)*Math.min(24,Math.abs(slope)*3200);

  return Math.max(-100,Math.min(100,closeComp+bodyComp+deltaComp+momComp+slopeComp));
}

function _smoothClarity(vals){
  const out=[];
  for(let i=0;i<vals.length;i++){
    const a=vals[Math.max(0,i-2)].v,b=vals[Math.max(0,i-1)].v,c=vals[i].v,d=vals[Math.min(vals.length-1,i+1)].v;
    out.push({...vals[i],v:(a+b*2+c*3+d)/7});
  }
  return out;
}

// ── Trend Clarity MTF support ─────────────────────────────────────────────
const _clarMtfMap=new Map();
const _clarMtfBusy=new Set();
function _clarityFromCandle(cs,idx){
  const c=cs[idx];if(!c)return 0;
  const range=Math.max(1e-9,c.h-c.l);
  const closeComp=((c.c-c.l)/range-0.5)*42;
  const bodyComp=((c.c-c.o)/range)*22;
  const tot=(c.buy||0)+(c.sell||0);
  const deltaComp=tot>0?(((c.buy||0)-(c.sell||0))/tot)*26:0;
  let mom=0,slope=0;
  if(idx>=8){const ref=cs[idx-8];mom=(c.c-ref.c)/Math.max(1e-9,ref.c);}
  if(idx>=21){const ref=cs[idx-21];slope=(c.c-ref.c)/Math.max(1e-9,ref.c);}
  return Math.max(-100,Math.min(100,closeComp+bodyComp+deltaComp+Math.sign(mom)*Math.min(34,Math.abs(mom)*5600)+Math.sign(slope)*Math.min(24,Math.abs(slope)*3200)));
}
async function _fetchClarMtf(sym,tf){
  const key=sym+'|'+tf;
  if(_clarMtfBusy.has(key))return;
  const cached=_clarMtfMap.get(key);
  if(cached&&cached.sym===sym&&Date.now()-cached.ts<60000)return;
  _clarMtfBusy.add(key);
  try{
    const candles=await fetchKlinesForTF(sym,tf,500);
    const vals=candles.map((_,i)=>_clarityFromCandle(candles,i));
    _clarMtfMap.set(key,{candles,vals,ts:Date.now(),sym,tf});
    if(typeof drawSoon==='function')drawSoon();
  }catch(e){console.warn('[DVL Clarity MTF]',e);}
  finally{_clarMtfBusy.delete(key);}
}
function _getClarMtfAt(chartT,tf){
  const sym=window.S?.sym;if(!sym)return null;
  const key=sym+'|'+tf;
  const cached=_clarMtfMap.get(key);
  if(!cached||!cached.candles.length){_fetchClarMtf(sym,tf);return null;}
  const cs=cached.candles;
  let lo=0,hi=cs.length-1,found=-1;
  while(lo<=hi){const m=(lo+hi)>>1;if(cs[m].t<=chartT){found=m;lo=m+1;}else hi=m-1;}
  if(found<0)return null;
  return cached.vals[found]??null;
}
window.__fetchClarMtf=_fetchClarMtf;
window.__clarMtfMap=_clarMtfMap;

function _drawOscEye(ctx,ex,ey,open,color){
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=0.9;ctx.lineJoin='round';ctx.lineCap='round';
  if(open){ctx.beginPath();ctx.moveTo(ex-5,ey);ctx.bezierCurveTo(ex-3,ey-3.5,ex+3,ey-3.5,ex+5,ey);ctx.bezierCurveTo(ex+3,ey+3.5,ex-3,ey+3.5,ex-5,ey);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(ex,ey,1.7,0,Math.PI*2);ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(ex-5,ey);ctx.bezierCurveTo(ex-3,ey-2.5,ex+3,ey-2.5,ex+5,ey);ctx.stroke();ctx.lineWidth=0.7;for(const d of[-3,0,3]){ctx.beginPath();ctx.moveTo(ex+d,ey);ctx.lineTo(ex+d,ey+2.5);ctx.stroke();}}
  ctx.restore();
}

/* ── DVL_OSCILLATOR_SYSTEM — Beta 0.006
   Single drawing base for DVL Flow and Trend Clarity.
   It uses the same background as the chart/sidebar, removes the dead left gutter,
   clips the plot before the right scale, and keeps header values out of the bars. */
function _dvlOscLayout(W,H,pTop,pBot){
  const rightScaleW = Math.max(44, RP ? Math.min(68, RP()) : 52);
  const hdrH = Math.max(18, Math.round(20*_csf));
  const scaleLeft = W - rightScaleW;
  const plotLeft = 6;
  const plotRight = scaleLeft - 5;
  const plotTop = pTop + hdrH + 3;
  const plotBottom = pBot - 7;
  const mid = (plotTop + plotBottom) / 2;
  const amp = Math.max(8, (plotBottom - plotTop) * 0.48);
  return {pTop,pBot,hdrH,scaleLeft,plotLeft,plotRight,plotTop,plotBottom,mid,amp};
}
function _dvlOscScale(L){
  const kind=L&&L.oscKind==='flow'?'flow':L&&L.oscKind==='pressureFlow'?'pressureFlow':'trendClarity';
  if(!S.oscScale)S.oscScale={flow:{center:0,range:200},trendClarity:{center:0,range:200}};
  if(!S.oscScale[kind])S.oscScale[kind]={center:0,range:200};
  const o=S.oscScale[kind];
  o.center=Number.isFinite(+o.center)?+o.center:0;
  o.range=Math.max(Number.isFinite(+o.range)?+o.range:200,1e-6);
  return o;
}
function _dvlOscY(L,v){
  const o=_dvlOscScale(L);
  return L.mid - (((+v||0)-o.center)/(o.range/2)) * L.amp;
}
function _dvlOscTicks(L){
  const o=_dvlOscScale(L), step=o.range/4;
  return [o.center+o.range/2,o.center+step,o.center,o.center-step,o.center-o.range/2].map(v=>Math.round(v));
}
function _dvlOscLineVisible(inputId, storageKey){
  try{
    const n=document.getElementById(inputId);
    if(n)return !!n.checked;
    const saved=localStorage.getItem(storageKey);
    return saved==='1';
  }catch(_){return false;}
}
function _dvlOscClip(ctx,L){
  ctx.beginPath();
  ctx.rect(L.plotLeft,L.plotTop,Math.max(1,L.plotRight-L.plotLeft),Math.max(1,L.plotBottom-L.plotTop));
  ctx.clip();
}
function _dvlDrawOscBase(ctx,L,title,rightText,kind,hiddenFlagName,hitboxName){
  const bg = '#05070b';
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0,L.pTop,ctx.canvas.clientWidth||ctx.canvas.width,L.pBot-L.pTop);
  ctx.strokeStyle='rgba(23,32,45,0.80)';
  ctx.lineWidth=1;
  ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(0,L.pTop+.5);ctx.lineTo(ctx.canvas.clientWidth||ctx.canvas.width,L.pTop+.5);ctx.stroke();

  const eyeX=L.plotLeft+12, eyeY=L.pTop+L.hdrH/2;
  window[hitboxName]={x1:eyeX-10,y1:eyeY-10,x2:eyeX+10,y2:eyeY+10};
  const hidden=!!window[hiddenFlagName];
  _drawOscEye(ctx,eyeX,eyeY,!hidden,'rgba(120,145,180,0.70)');
  if(!hidden){
    ctx.font='700 '+Math.round(10*_csf)+'px monospace';
    ctx.fillStyle='rgba(160,178,205,0.92)';
    ctx.textAlign='left';
    ctx.textBaseline='middle';
    ctx.fillText(title,eyeX+16,eyeY);
  }

  ctx.font='700 '+Math.round(9*_csf)+'px monospace';
  ctx.textAlign='right';
  ctx.textBaseline='middle';
  ctx.fillStyle=kind==='bear'?'rgba(255,95,110,.94)':kind==='bull'?'rgba(0,220,190,.94)':'rgba(135,155,185,.92)';
  if(rightText) ctx.fillText(rightText,L.scaleLeft-8,eyeY);

  // grid + levels inside plot
  ctx.strokeStyle='rgba(23,32,45,0.52)';
  ctx.lineWidth=.7;
  ctx.setLineDash([]);
  for(const sv of _dvlOscTicks(L).filter((_,i)=>i!==2)){
    const y=_dvlOscY(L,sv);
    if(y<L.plotTop||y>L.plotBottom) continue;
    ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();
  }
  ctx.strokeStyle='rgba(0,212,255,0.30)';
  ctx.lineWidth=1;
  ctx.setLineDash([4,6]);
  ctx.beginPath();ctx.moveTo(L.plotLeft,L.mid);ctx.lineTo(L.plotRight,L.mid);ctx.stroke();
  ctx.setLineDash([]);

  // right scale gutter
  ctx.fillStyle='#05070b';
  ctx.fillRect(L.scaleLeft,L.pTop,(ctx.canvas.clientWidth||ctx.canvas.width)-L.scaleLeft,L.pBot-L.pTop);
  ctx.strokeStyle='rgba(23,32,45,0.88)';
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(L.scaleLeft+.5,L.pTop);ctx.lineTo(L.scaleLeft+.5,L.pBot);ctx.stroke();
  ctx.font='700 '+Math.round(8*_csf)+'px monospace';
  ctx.textAlign='left';
  ctx.textBaseline='middle';
  for(const sv of _dvlOscTicks(L)){
    const y=_dvlOscY(L,sv);
    if(y<L.plotTop-3||y>L.plotBottom+3) continue;
    ctx.fillStyle=sv===0?'rgba(160,180,210,.88)':'rgba(95,115,145,.82)';
    ctx.fillText((sv>0?'+':'')+sv,L.scaleLeft+7,y);
  }
  ctx.restore();
}
function _dvlDrawOscCurrentMarker(ctx,L,val,color,label){
  const v=+val||0;
  const y=_dvlOscY(L,v);
  ctx.save();
  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(L.scaleLeft-7,y);ctx.lineTo(L.scaleLeft-1,y);ctx.stroke();
  ctx.font='700 '+Math.round(8*_csf)+'px monospace';
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText((v>0?'+':'')+Math.round(v),L.scaleLeft+7,y);
  ctx.restore();
}

function drawTrendClarityOnCanvas(ctx,V,sc,x,W,H,clarH){
  if(!clarH||clarH<=0)return;
  const cfg=_hvnCfg? _hvnCfg() : {};
  const _clarTFSel=document.getElementById('hvnClarityTF')?.value||'current';
  const _clarIsMtf=_clarTFSel!=='current'&&_clarTFSel!==(S.tf||'');
  if(_clarIsMtf&&S.sym&&typeof _fetchClarMtf==='function')_fetchClarMtf(S.sym,_clarTFSel);

  const pTop=H-10-clarH,pBot=H-10,L=_dvlOscLayout(W,H,pTop,pBot);
  L.oscKind='trendClarity';
  if(L.plotRight<=L.plotLeft||L.plotBottom<=L.plotTop)return;

  const vals=new Float32Array(S.candles.length);
  for(let i=0;i<S.candles.length;i++){
    let v=null;
    if(_clarIsMtf&&typeof _getClarMtfAt==='function')v=_getClarMtfAt(S.candles[i].t,_clarTFSel);
    vals[i]=v==null?(_clarityFromCandle? _clarityFromCandle(S.candles,i):0):v;
  }
  const lastVal=vals.length?vals[vals.length-1]:0;
  window.__dvlClarNow=lastVal;
  const ci=(S._crossIdx!=null)?S._crossIdx:null;
  const displayVal=(ci!=null&&vals[ci]!=null)?vals[ci]:lastVal;
  const state=displayVal>=25?'bull':displayVal<=-25?'bear':'neutral';
  _dvlDrawOscBase(ctx,L,'TREND CLARITY'+(_clarIsMtf?' · '+_clarTFSel.toUpperCase():''),'CLARITY '+(displayVal>=0?'+':'')+Math.round(displayVal),state,'_dvlClarTitleHidden','_dvlClarEyeHit');

  const cw=CW(W),bw=Math.max(1.2,cw/Math.max(1,V.span)*0.66),barW=Math.max(1,bw*.62);
  ctx.save();
  _dvlOscClip(ctx,L);
  // histogram
  for(let i=V.a;i<V.b;i++){
    const v=vals[i]||0,xx=x(i),y0=_dvlOscY(L,0),yv=_dvlOscY(L,v);
    const h=Math.abs(yv-y0);
    ctx.fillStyle=v>=0?_dvlRgba((document.getElementById('hvnBullColor')?.value||'#00d2ff'),0.48):_dvlRgba((document.getElementById('hvnBearColor')?.value||'#ff465f'),0.48);
    ctx.fillRect(xx-barW/2,Math.min(y0,yv),barW,h);
  }
  // optional smoothed/average-style line
  if(_dvlOscLineVisible('hvnShowOscLine','dvl_hvn_show_osc_line')){
    ctx.beginPath();
    let started=false;
    for(let i=V.a;i<V.b;i++){
      const xx=x(i),yy=_dvlOscY(L,vals[i]||0);
      if(!started){ctx.moveTo(xx,yy);started=true;}else ctx.lineTo(xx,yy);
    }
    ctx.lineWidth=2.0;
    ctx.strokeStyle='rgba(0,215,255,0.92)';
    ctx.shadowColor='rgba(0,215,255,0.35)';
    ctx.shadowBlur=5;
    ctx.stroke();
    ctx.shadowBlur=0;
  }
  if(ci!=null&&ci>=0&&ci<vals.length){
    const cv=vals[ci]||0, yy=_dvlOscY(L,cv), xx=x(ci);
    ctx.strokeStyle=cv>=0?'rgba(0,215,255,.45)':'rgba(255,70,95,.45)';
    ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(L.plotLeft,yy);ctx.lineTo(L.plotRight,yy);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=cv>=0?'rgba(0,225,255,.95)':'rgba(255,80,100,.95)';
    ctx.beginPath();ctx.arc(xx,yy,3.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  {const _clml=Math.max(0,(+(document.getElementById('hvnClarMA')?.value)||0)|0);if(_clml>=2){const _ca=[];let _crs=0;for(let _ci=0;_ci<vals.length;_ci++){_crs+=vals[_ci];if(_ci>=_clml)_crs-=vals[_ci-_clml];_ca[_ci]=_crs/Math.min(_ci+1,_clml);}ctx.save();_dvlOscClip(ctx,L);ctx.beginPath();ctx.strokeStyle='rgba(34,211,238,0.90)';ctx.lineWidth=1.4;ctx.setLineDash([]);let _cmv=false;for(let i=V.a;i<V.b;i++){if(i<0||i>=_ca.length)continue;const _xx=x(i),_yy=_dvlOscY(L,_ca[i]);if(!_cmv){ctx.moveTo(_xx,_yy);_cmv=true;}else ctx.lineTo(_xx,_yy);}if(_cmv)ctx.stroke();ctx.restore();}}
  _dvlDrawOscCurrentMarker(ctx,L,displayVal,state==='bear'?'rgba(255,80,100,.9)':state==='bull'?'rgba(0,215,255,.9)':'rgba(140,160,190,.85)','CLARITY');
}

// Helper: draw a colored segment for the clarity line
function _drawClarSeg(ctx,seg,bull,pass,lineGlow){
  if(seg.length<2)return;
  const r=bull?0:255,g=bull?210:70,b2=bull?230:90;
  ctx.strokeStyle=`rgba(${r},${g},${b2},${pass.alpha.toFixed(3)})`;
  ctx.lineWidth=pass.width;ctx.shadowColor=`rgba(${r},${g},${b2},0.65)`;
  ctx.shadowBlur=(pass.blur||0)*(lineGlow||1);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(seg[0].px,seg[0].py);
  for(let p=1;p<seg.length;p++){
    const cpx=(seg[p-1].px+seg[p].px)/2;
    ctx.bezierCurveTo(cpx,seg[p-1].py,cpx,seg[p].py,seg[p].px,seg[p].py);
  }
  ctx.stroke();
}



