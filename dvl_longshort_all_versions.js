/* ════════════════════════════════════════════════════════════════════════
   V325 — CoinGlass Oscillators (L38770-38839)
    fetchLS(), lsParse(), __drawCGLongShortPanel() v1
    Modo: accounts-global / accounts-top | Fonte: CoinGlass ou Binance
    CG_CACHE.ls.data | panel height: window._cgLongShortH (default 104)
   ════════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';
const VER='Beta 0.325';
window._cgOpenInterestH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_cgOpenInterestH')||'112',10);return v>=78&&v<=220?v:112;}catch(_){return 112;}})();
window._cgLongShortH=(()=>{try{const v=parseInt(localStorage.getItem('dvl_cgLongShortH')||'104',10);return v>=72&&v<=210?v:104;}catch(_){return 104;}})();
window._dvlCgOscHit=window._dvlCgOscHit||{};
const CG_CACHE={oi:{key:'',data:[],fetching:false,ts:0,src:'',err:''},ls:{key:'',data:[],fetching:false,ts:0,src:'',err:''}};

function q(s,r){return (r||document).querySelector(s);}function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
function val(id,def){const e=q('#'+id);return e?e.value:def;}function checked(id,def){const e=q('#'+id);return e?!!e.checked:def;}
function setImp(el,st){if(!el)return;Object.keys(st).forEach(k=>el.style.setProperty(k,st[k],'important'));}
function fmtMoney(v){v=+v||0;const a=Math.abs(v);if(a>=1e12)return '$'+(v/1e12).toFixed(2)+'T';if(a>=1e9)return '$'+(v/1e9).toFixed(2)+'B';if(a>=1e6)return '$'+(v/1e6).toFixed(1)+'M';if(a>=1e3)return '$'+(v/1e3).toFixed(0)+'K';return '$'+v.toFixed(0);} 
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function coin(){try{return String(S.sym||'BTCUSDT').replace(/USDT|USD|PERP|BUSD/gi,'')||'BTC';}catch(_){return 'BTC';}}
function symbol(){try{return String(S.sym||'BTCUSDT').toUpperCase();}catch(_){return 'BTCUSDT';}}
function tfToPeriod(forCG){let tf=(val('cgSharedPeriod','auto')||'auto').toLowerCase();if(tf==='auto')tf=String((window.S&&S.tf)||'5m').toLowerCase();const cg=['1m','3m','5m','15m','30m','1h','4h','6h','8h','12h','1d','1w'];const bn=['5m','15m','30m','1h','2h','4h','6h','12h','1d'];if(forCG&&cg.includes(tf))return tf;if(bn.includes(tf))return tf;if(tf==='2h'&&forCG)return '1h';return '5m';}
function cgKey(){return (val('cgApiKey','')||'').trim();}
function sourcePref(){return val('cgDataSource','auto')||'auto';}
function shouldUseCG(){const s=sourcePref();return s==='coinglass'||(s==='auto'&&!!cgKey());}
function headers(){const h={'accept':'application/json'};if(cgKey())h['CG-API-KEY']=cgKey();return h;}
async function fetchJson(url,opts){const r=await fetch(url,Object.assign({cache:'no-store'},opts||{}));if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}
function arrFromResp(j){if(Array.isArray(j))return j; if(Array.isArray(j?.data))return j.data; if(Array.isArray(j?.data?.list))return j.data.list; if(Array.isArray(j?.data?.items))return j.data.items; if(Array.isArray(j?.result))return j.result; return [];}
function tsOf(o){if(Array.isArray(o))return +o[0]||+o.t||0;return +(o.timestamp||o.time||o.t||o.date||o.createTime||0);}
function nval(o,keys){if(Array.isArray(o)){for(const i of keys){const v=+o[i];if(Number.isFinite(v))return v;}return 0;}for(const k of keys){const v=+o[k];if(Number.isFinite(v))return v;}return 0;}
function oiParse(arr,isCg){return arr.map((o,idx)=>{const t=tsOf(o);let open=nval(o,['open','o',1]);let high=nval(o,['high','h',2]);let low=nval(o,['low','l',3]);let close=nval(o,['close','c','value','sumOpenInterestValue',4]);if(!isCg){close=nval(o,['sumOpenInterestValue','value','close','c']);open=idx?0:close;high=close;low=close;}if(!open)open=idx&&arr[idx-1]?nval(arr[idx-1],isCg?['close','c','value',4]:['sumOpenInterestValue','value','close','c']):close;if(!high)high=Math.max(open,close);if(!low)low=Math.min(open,close);return{t,open,high,low,close};}).filter(d=>d.t&&d.close>0).sort((a,b)=>a.t-b.t);} 
function lsParse(arr){return arr.map(o=>{const t=tsOf(o);const ratio=nval(o,['longShortRatio','ratio','long_short_ratio','longShort',1]);let long=nval(o,['longAccount','longAccountRatio','longRatio','long',2]);let short=nval(o,['shortAccount','shortAccountRatio','shortRatio','short',3]);if(long>1)long/=100;if(short>1)short/=100;if(!long&&!short&&ratio>0){long=ratio/(1+ratio);short=1/(1+ratio);}return{t,ratio:ratio||((short>0)?long/short:0),long,short};}).filter(d=>d.t&&d.ratio>0).sort((a,b)=>a.t-b.t);} 
async function fetchOI(){const useCg=shouldUseCG();const per=tfToPeriod(useCg);const key=[useCg?'cg':'binance',coin(),symbol(),per,val('cgOiUnit','usd')].join('|');if(CG_CACHE.oi.key===key&&Date.now()-CG_CACHE.oi.ts<45000)return;if(CG_CACHE.oi.fetching)return;CG_CACHE.oi.fetching=true;CG_CACHE.oi.err='';try{let data,src;if(useCg){const u='https://open-api-v4.coinglass.com/api/futures/open-interest/aggregated-history?symbol='+encodeURIComponent(coin())+'&interval='+encodeURIComponent(per)+'&limit=500&unit='+encodeURIComponent(val('cgOiUnit','usd'));data=oiParse(arrFromResp(await fetchJson(u,{headers:headers()})),true);src='COINGLASS AGG';}else{const u='https://fapi.binance.com/futures/data/openInterestHist?symbol='+encodeURIComponent(symbol())+'&period='+encodeURIComponent(tfToPeriod(false))+'&limit=500';data=oiParse(arrFromResp(await fetchJson(u)),false);src='BINANCE';}CG_CACHE.oi={key,data,fetching:false,ts:Date.now(),src,err:''};}catch(e){CG_CACHE.oi.fetching=false;CG_CACHE.oi.err=String(e&&e.message||e);if(useCg&&sourcePref()==='auto'){try{const u='https://fapi.binance.com/futures/data/openInterestHist?symbol='+encodeURIComponent(symbol())+'&period='+encodeURIComponent(tfToPeriod(false))+'&limit=500';const data=oiParse(arrFromResp(await fetchJson(u)),false);CG_CACHE.oi={key:'binance-fallback|'+symbol()+'|'+tfToPeriod(false),data,fetching:false,ts:Date.now(),src:'BINANCE FALLBACK',err:''};}catch(_){}}}}
async function fetchLS(){const useCg=shouldUseCG();const per=tfToPeriod(useCg);const mode=val('cgLsMode','global');const key=[useCg?'cg':'binance',mode,symbol(),per,val('cgExchange','Binance')].join('|');if(CG_CACHE.ls.key===key&&Date.now()-CG_CACHE.ls.ts<45000)return;if(CG_CACHE.ls.fetching)return;CG_CACHE.ls.fetching=true;CG_CACHE.ls.err='';try{let data,src;if(useCg){const ep=mode==='top'?'top-long-short-account-ratio':'global-long-short-account-ratio';const u='https://open-api-v4.coinglass.com/api/futures/'+ep+'/history?exchange='+encodeURIComponent(val('cgExchange','Binance'))+'&symbol='+encodeURIComponent(symbol())+'&interval='+encodeURIComponent(per)+'&limit=500';data=lsParse(arrFromResp(await fetchJson(u,{headers:headers()})));src='COINGLASS '+(mode==='top'?'TOP':'GLOBAL');}else{const ep=mode==='top'?'topLongShortAccountRatio':'globalLongShortAccountRatio';const u='https://fapi.binance.com/futures/data/'+ep+'?symbol='+encodeURIComponent(symbol())+'&period='+encodeURIComponent(tfToPeriod(false))+'&limit=500';data=lsParse(arrFromResp(await fetchJson(u)));src='BINANCE '+(mode==='top'?'TOP':'GLOBAL');}CG_CACHE.ls={key,data,fetching:false,ts:Date.now(),src,err:''};}catch(e){CG_CACHE.ls.fetching=false;CG_CACHE.ls.err=String(e&&e.message||e);if(useCg&&sourcePref()==='auto'){try{const ep=mode==='top'?'topLongShortAccountRatio':'globalLongShortAccountRatio';const u='https://fapi.binance.com/futures/data/'+ep+'?symbol='+encodeURIComponent(symbol())+'&period='+encodeURIComponent(tfToPeriod(false))+'&limit=500';const data=lsParse(arrFromResp(await fetchJson(u)));CG_CACHE.ls={key:'binance-fallback|'+mode+'|'+symbol(),data,fetching:false,ts:Date.now(),src:'BINANCE FALLBACK',err:''};}catch(_){}}}}
function ensureData(){try{if(window.S&&S.inds&&S.inds.cgOpenInterest)fetchOI().then(()=>{try{drawSoon();}catch(_){}});if(window.S&&S.inds&&S.inds.cgLongShort)fetchLS().then(()=>{try{drawSoon();}catch(_){}});}catch(_){}}
function valueAt(data,t){if(!data||!data.length)return null;let lo=0,hi=data.length-1;if(t<=data[0].t)return data[0];if(t>=data[hi].t)return data[hi];while(lo<hi){const m=(lo+hi+1)>>1;if(data[m].t<=t)lo=m;else hi=m-1;}return data[lo];}
function drawEye(ctx,x,y,on){ctx.save();ctx.strokeStyle='rgba(120,145,180,.76)';ctx.fillStyle='rgba(120,145,180,.76)';ctx.lineWidth=1.1;if(on){ctx.beginPath();ctx.moveTo(x-5,y);ctx.bezierCurveTo(x-2,y-3.5,x+2,y-3.5,x+5,y);ctx.bezierCurveTo(x+2,y+3.5,x-2,y+3.5,x-5,y);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.moveTo(x-5,y);ctx.bezierCurveTo(x-2,y-2.5,x+2,y-2.5,x+5,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x-5,y+5);ctx.lineTo(x+5,y-5);ctx.stroke();}ctx.restore();}
function drawGear(ctx,x,y){ctx.save();ctx.strokeStyle='rgba(120,145,180,.82)';ctx.lineWidth=1.15;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*6.2,y+Math.sin(a)*6.2);ctx.lineTo(x+Math.cos(a)*8.0,y+Math.sin(a)*8.0);ctx.stroke();}ctx.restore();}
function cgBase(ctx,L,title,right,kind,key,settingsKey){ctx.save();ctx.fillStyle='#05070b';ctx.fillRect(0,L.pTop,ctx.canvas.clientWidth||ctx.canvas.width,L.pBot-L.pTop);ctx.strokeStyle='rgba(23,32,45,.82)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,L.pTop+.5);ctx.lineTo(ctx.canvas.clientWidth||ctx.canvas.width,L.pTop+.5);ctx.stroke();const eyeX=L.plotLeft+12,eyeY=L.pTop+L.hdrH/2;const hidden=!!window['__dvl_'+key+'_hidden'];drawEye(ctx,eyeX,eyeY,!hidden);if(!hidden){ctx.font='700 '+Math.round(10*(window._csf||1))+'px monospace';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='rgba(160,178,205,.94)';ctx.fillText(title,eyeX+16,eyeY);}ctx.font='700 '+Math.round(9*(window._csf||1))+'px monospace';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=kind==='bear'?'rgba(255,95,110,.94)':kind==='bull'?'rgba(0,220,190,.94)':'rgba(135,155,185,.92)';ctx.fillText(right||'',L.scaleLeft-8,eyeY);const gx=Math.min(L.scaleLeft-84,eyeX+16+(hidden?0:ctx.measureText(title).width)+18);drawGear(ctx,gx,eyeY);window._dvlCgOscHit[key]={eye:{x1:eyeX-22,y1:eyeY-22,x2:eyeX+22,y2:eyeY+22},gear:{x1:gx-22,y1:eyeY-22,x2:gx+22,y2:eyeY+22},settings:settingsKey};ctx.strokeStyle='rgba(23,32,45,.55)';ctx.lineWidth=.7;for(let n=1;n<=3;n++){const y=L.plotTop+(L.plotBottom-L.plotTop)*n/4;ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();}ctx.fillStyle='#05070b';ctx.fillRect(L.scaleLeft,L.pTop,(ctx.canvas.clientWidth||ctx.canvas.width)-L.scaleLeft,L.pBot-L.pTop);ctx.strokeStyle='rgba(23,32,45,.88)';ctx.beginPath();ctx.moveTo(L.scaleLeft+.5,L.pTop);ctx.lineTo(L.scaleLeft+.5,L.pBot);ctx.stroke();ctx.restore();}
function layout(W,H,pTop,pBot){return _dvlOscLayout(W,H,pTop,pBot);}function yMap(L,v,min,max){if(max<=min)max=min+1;return L.plotBottom-(v-min)/(max-min)*(L.plotBottom-L.plotTop);}function panelOffsets(clarH,flowH,lsH){const GAP=typeof PANEL_GAP!=='undefined'?PANEL_GAP:4;return (clarH?clarH+GAP:0)+(flowH?flowH+GAP:0)+(lsH?lsH+GAP:0);} 
window.__drawCGOpenInterestPanel=function(ctx,W,H,V,sc,x,h,lsH,flowH,clarH){ensureData();const data=CG_CACHE.oi.data||[];const off=panelOffsets(clarH,flowH,lsH);const pBot=H-10-off,pTop=pBot-h,L=layout(W,H,pTop,pBot);if(L.plotRight<=L.plotLeft)return;const vals=[];for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(d)vals.push(d);}const last=vals[vals.length-1];const prev=vals.length>1?vals[vals.length-2]:last;const pct=last&&prev?((last.close-prev.close)/prev.close*100):0;const kind=pct>0?'bull':pct<0?'bear':'neutral';cgBase(ctx,L,'CG AGG OI',last?fmtMoney(last.close)+' '+(pct>=0?'+':'')+pct.toFixed(2)+'%':(CG_CACHE.oi.fetching?'LOADING':'NO DATA'),kind,'cgOi','cgOpenInterest');ctx.save();ctx.beginPath();ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);ctx.clip();if(vals.length){const min=Math.min(...vals.map(v=>v.low||v.close)),max=Math.max(...vals.map(v=>v.high||v.close));const bw=Math.max(2,(CW(W)/Math.max(1,V.span))*0.48);for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;const xx=x(i);const yo=yMap(L,d.open,min,max),yc=yMap(L,d.close,min,max),yh=yMap(L,d.high,min,max),yl=yMap(L,d.low,min,max);const bull=d.close>=d.open;ctx.strokeStyle=bull?'rgba(0,220,170,.82)':'rgba(255,95,80,.82)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();ctx.fillStyle=bull?'rgba(0,210,165,.54)':'rgba(255,95,80,.54)';ctx.fillRect(xx-bw/2,Math.min(yo,yc),bw,Math.max(2,Math.abs(yc-yo)));ctx.strokeRect(xx-bw/2,Math.min(yo,yc),bw,Math.max(2,Math.abs(yc-yo)));}ctx.fillStyle='rgba(120,145,180,.78)';ctx.font='700 8px monospace';ctx.textAlign='left';ctx.fillText(CG_CACHE.oi.src||'',L.plotLeft+8,L.plotBottom-5);}ctx.restore();};
window.__drawCGLongShortPanel=function(ctx,W,H,V,sc,x,h,flowH,clarH){ensureData();const data=CG_CACHE.ls.data||[];const off=(clarH?clarH+(typeof PANEL_GAP!=='undefined'?PANEL_GAP:4):0)+(flowH?flowH+(typeof PANEL_GAP!=='undefined'?PANEL_GAP:4):0);const pBot=H-10-off,pTop=pBot-h,L=layout(W,H,pTop,pBot);if(L.plotRight<=L.plotLeft)return;const vals=[];for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(d)vals.push(d);}const last=vals[vals.length-1];const kind=last?(last.ratio>1.03?'bull':last.ratio<.97?'bear':'neutral'):'neutral';const text=last?('L/S '+last.ratio.toFixed(2)+' · L '+Math.round((last.long||0)*100)+'%'):(CG_CACHE.ls.fetching?'LOADING':'NO DATA');cgBase(ctx,L,'CG L/S ACCOUNTS',text,kind,'cgLs','cgLongShort');ctx.save();ctx.beginPath();ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);ctx.clip();const min=.45,max=1.85,mid=yMap(L,1,min,max);ctx.strokeStyle='rgba(0,212,255,.32)';ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(L.plotLeft,mid);ctx.lineTo(L.plotRight,mid);ctx.stroke();ctx.setLineDash([]);if(vals.length){const bw=Math.max(1,(CW(W)/Math.max(1,V.span))*0.56);for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;const xx=x(i),yy=yMap(L,d.ratio,min,max);ctx.fillStyle=d.ratio>=1?'rgba(0,215,170,.42)':'rgba(255,95,80,.42)';ctx.fillRect(xx-bw/2,Math.min(mid,yy),bw,Math.max(1,Math.abs(yy-mid)));}ctx.beginPath();let st=false;for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;const xx=x(i),yy=yMap(L,d.ratio,min,max);if(!st){ctx.moveTo(xx,yy);st=true;}else ctx.lineTo(xx,yy);}ctx.strokeStyle='rgba(0,225,240,.92)';ctx.lineWidth=1.8;ctx.shadowColor='rgba(0,225,240,.28)';ctx.shadowBlur=4;if(st)ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(120,145,180,.78)';ctx.font='700 8px monospace';ctx.textAlign='left';ctx.fillText(CG_CACHE.ls.src||'',L.plotLeft+8,L.plotBottom-5);}ctx.restore();};
function injectCards(){if(!window.S||!S.inds)return;S.inds.cgOpenInterest=!!S.inds.cgOpenInterest;S.inds.cgLongShort=!!S.inds.cgLongShort;if(q('[data-card="cgOpenInterest"]'))return;const anchor=q('[data-card="hvnClarity"]')||q('[data-card="flowAccel"]')||q('.ind-card');if(!anchor)return;const wrap=anchor.parentNode;const html=`
<div class="ind-card dvl-icd dvl325-cg-card dvl328-cg-card" data-card="cgOpenInterest" data-dvl-cat="clareza">
  <div class="dvl-icd-head"><div class="dvl-icd-icon" style="--ic-bg:rgba(34,211,238,.12);--ic-cl:#22d3ee"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.5V5.8"/><path d="M3 5.8l3.2 2.5L9 4.5l3 5 3-3.2"/><path d="M15 6.3v7.2"/><rect x="2.2" y="11.2" width="2.2" height="3.2" rx=".6" fill="currentColor" opacity=".20"/><rect x="7.9" y="8" width="2.2" height="6.4" rx=".6" fill="currentColor" opacity=".20"/><rect x="13.6" y="9.8" width="2.2" height="4.6" rx=".6" fill="currentColor" opacity=".20"/></svg></div><div class="dvl-icd-info"><div class="dvl-icd-name name">CG Open Interest</div><div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span></div></div><div class="dvl-icd-ctrl"><div class="row" data-ind="cgOpenInterest"><span class="switch"></span></div><button class="gear" data-settings="cgOpenInterest" title="Configurar CG OI">&#9881;</button><button class="dvl-star" data-star="cgOpenInterest" type="button">★</button></div></div>
  <div class="ind-settings" id="settings-cgOpenInterest">
    <div class="dvl325-cg-row"><span class="k">Fonte</span><select class="select" id="cgDataSource"><option value="auto" selected>Auto CG/Binance</option><option value="coinglass">CoinGlass API</option><option value="binance">Binance público</option></select></div>
    <div class="dvl325-cg-row"><span class="k">CG API Key</span><input class="input dvl325-cg-key" id="cgApiKey" type="password" placeholder="opcional"></div>
    <div class="dvl325-cg-row"><span class="k">Período</span><select class="select" id="cgSharedPeriod"><option value="auto" selected>Auto TF</option><option value="5m">5m</option><option value="15m">15m</option><option value="30m">30m</option><option value="1h">1h</option><option value="4h">4h</option><option value="1d">1D</option></select></div>
    <div class="dvl325-cg-row"><span class="k">Unidade OI</span><select class="select" id="cgOiUnit"><option value="usd" selected>USD</option><option value="coin">Coin</option></select></div>
    <div class="dvl325-cg-row"><span class="k">Altura</span><input class="num" id="cgOpenInterestHeight" type="number" min="78" max="220" value="112"></div>
    <div class="dvl325-cg-note">Com API key: CoinGlass aggregated OI. Sem key: fallback Binance OI do símbolo.</div>
  </div>
</div>
<div class="ind-card dvl-icd dvl325-cg-card dvl328-cg-card" data-card="cgLongShort" data-dvl-cat="clareza">
  <div class="dvl-icd-head"><div class="dvl-icd-icon" style="--ic-bg:rgba(45,212,191,.12);--ic-cl:#2dd4bf"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h8.5"/><path d="M9 2.8L11.5 5 9 7.2"/><path d="M15 13H6.5"/><path d="M9 10.8L6.5 13 9 15.2"/><path d="M4.3 9h9.4" stroke-opacity=".35"/></svg></div><div class="dvl-icd-info"><div class="dvl-icd-name name">CG Taker L/S</div><div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span></div></div><div class="dvl-icd-ctrl"><div class="row" data-ind="cgLongShort"><span class="switch"></span></div><button class="gear" data-settings="cgLongShort" title="Configurar CG Long/Short">&#9881;</button><button class="dvl-star" data-star="cgLongShort" type="button">★</button></div></div>
  <div class="ind-settings" id="settings-cgLongShort">
    <div class="dvl325-cg-row"><span class="k">Fonte</span><select class="select" id="cgDataSourceMirror"><option value="same" selected>Usar fonte do OI</option></select></div>
    <div class="dvl325-cg-row"><span class="k">Exchange</span><select class="select" id="cgExchange"><option value="Binance" selected>Binance</option><option value="Bybit">Bybit</option><option value="OKX">OKX</option><option value="Bitget">Bitget</option></select></div>
    <div class="dvl325-cg-row"><span class="k">Accounts</span><select class="select" id="cgLsMode"><option value="accounts-global" selected>Accounts global</option><option value="accounts-top">Top accounts</option></select></div>
    <div class="dvl325-cg-row"><span class="k">Altura</span><input class="num" id="cgLongShortHeight" type="number" min="72" max="210" value="104"></div>
    <div class="dvl325-cg-note">Ratio acima de 1 = mais contas long. Abaixo de 1 = mais contas short.</div>
  </div>
</div>`;anchor.insertAdjacentHTML('afterend',html);bindInjected();}
function bindInjected(){qa('.row[data-ind="cgOpenInterest"],.row[data-ind="cgLongShort"]').forEach(r=>{if(r.dataset.dvl325Bound)return;r.dataset.dvl325Bound='1';r.onclick=function(ev){ev.stopPropagation();const k=r.dataset.ind;S.inds[k]=!S.inds[k];qa('[data-ind="'+k+'"]').forEach(n=>n.classList.toggle('on',!!S.inds[k]));ensureData();drawSoon&&drawSoon();};});qa('.gear[data-settings="cgOpenInterest"],.gear[data-settings="cgLongShort"]').forEach(g=>{if(g.dataset.dvl325Bound)return;g.dataset.dvl325Bound='1';g.onclick=function(ev){ev.stopPropagation();if(typeof window.openInputModal==='function')window.openInputModal(g.dataset.settings,g);};});['cgDataSource','cgApiKey','cgSharedPeriod','cgOiUnit','cgOpenInterestHeight','cgExchange','cgLsMode','cgLongShortHeight'].forEach(id=>{const el=q('#'+id);if(el&&!el.dataset.dvl325Bound){el.dataset.dvl325Bound='1';el.addEventListener('input',settingsChanged);el.addEventListener('change',settingsChanged);}});syncToggles();}
function settingsChanged(){window._cgOpenInterestH=clamp(parseInt(val('cgOpenInterestHeight',window._cgOpenInterestH)||window._cgOpenInterestH,10),78,220);window._cgLongShortH=clamp(parseInt(val('cgLongShortHeight',window._cgLongShortH)||window._cgLongShortH,10),72,210);try{localStorage.setItem('dvl_cgOpenInterestH',String(window._cgOpenInterestH));localStorage.setItem('dvl_cgLongShortH',String(window._cgLongShortH));}catch(_){}CG_CACHE.oi.key='';CG_CACHE.ls.key='';ensureData();try{drawSoon();}catch(_){}}
function syncToggles(){if(!window.S||!S.inds)return;qa('[data-ind="cgOpenInterest"]').forEach(n=>n.classList.toggle('on',!!S.inds.cgOpenInterest));qa('[data-ind="cgLongShort"]').forEach(n=>n.classList.toggle('on',!!S.inds.cgLongShort));}
function makeOverlays(){const wrap=q('#chartWrap');if(!wrap)return;['cgOi','cgLs'].forEach(k=>{['eye','gear'].forEach(t=>{const id='dvl325_'+k+'_'+t; if(q('#'+id))return;const b=document.createElement('button');b.id=id;b.className='dvl325-cg-'+t+'-overlay';b.type='button';b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();const hit=window._dvlCgOscHit&&window._dvlCgOscHit[k];if(!hit)return;if(t==='eye'){window['__dvl_'+k+'_hidden']=!window['__dvl_'+k+'_hidden'];try{localStorage.setItem('dvl_'+k+'_hidden',window['__dvl_'+k+'_hidden']?'1':'');}catch(_){}drawSoon&&drawSoon();}else{const settings=hit.settings;const gear=q('.gear[data-settings="'+settings+'"]');if(typeof window.openInputModal==='function')window.openInputModal(settings,gear||null);}});wrap.appendChild(b);});});}
function updateOverlays(){makeOverlays();['cgOi','cgLs'].forEach(k=>{const hit=window._dvlCgOscHit&&window._dvlCgOscHit[k];const active=(k==='cgOi')?!!(S&&S.inds&&S.inds.cgOpenInterest&&S.candles&&S.candles.length):!!(S&&S.inds&&S.inds.cgLongShort&&S.candles&&S.candles.length);['eye','gear'].forEach(t=>{const b=q('#dvl325_'+k+'_'+t);if(!b)return;const box=hit&&hit[t];if(!active||!box){b.style.display='none';b.style.pointerEvents='none';return;}b.style.left=box.x1+'px';b.style.top=box.y1+'px';b.style.width=(box.x2-box.x1)+'px';b.style.height=(box.y2-box.y1)+'px';b.style.display='block';b.style.pointerEvents='auto';});});}
function hookDraw(){const old=window.draw;if(typeof old!=='function'||old.__dvl325Cg)return;const wrapped=function(){const r=old.apply(this,arguments);try{syncToggles();updateOverlays();}catch(_){}return r;};wrapped.__dvl325Cg=true;try{window.draw=wrapped;}catch(_){}}
function forceVersion(){try{window.DVL_APP_VERSION=VER;}catch(_){}qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(b=>{if(b)b.textContent=VER;});try{window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];const note='Added CoinGlass-style Aggregated Open Interest and Long/Short Ratio account oscillator panels with CoinGlass API support and Binance public fallback.';if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});}catch(_){}}
function boot(){forceVersion();if(window.S&&S.inds){if(!('cgOpenInterest'in S.inds))S.inds.cgOpenInterest=false;if(!('cgLongShort'in S.inds))S.inds.cgLongShort=false;if(!S.oscScale)S.oscScale={};S.oscScale.cgOi=S.oscScale.cgOi||{center:0,range:200};S.oscScale.cgLs=S.oscScale.cgLs||{center:0,range:200};}injectCards();makeOverlays();hookDraw();ensureData();syncToggles();try{drawSoon&&drawSoon();}catch(_){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();[180,500,1100,2200,4000].forEach(ms=>setTimeout(boot,ms));/* CG_CACHE ensureData interval removed — CG327 handles fetching */
})();


/* ════════════════════════════════════════════════════════════════════════
   V327 — CG Native Oscillator (L57227-57292)  ← VERSÃO ATIVA
    fetchLS327(), parseTaker(), parseAccounts(), __drawCGLongShortPanel() v2
    Modo: taker (default) + accounts-global + accounts-top
    CG327.ls.data | TTL 45s | refresh 30s | touch/pinch scale
   ════════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';
const VER='Beta 0.327';
const GAP=()=> (typeof PANEL_GAP!=='undefined'?PANEL_GAP:4);
const CG327={oi:{key:'',data:[],ts:0,fetching:false,src:'',err:''},ls:{key:'',data:[],ts:0,fetching:false,src:'',err:''},touch:null};
function q(s,r){return (r||document).querySelector(s);}function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function val(id,d){const e=q('#'+id);return e?e.value:d;}function setVal(id,v){const e=q('#'+id);if(e)try{e.value=v;}catch(_){}}
function n(x,d=0){const v=Number(x);return Number.isFinite(v)?v:d;}
function coin(){try{return String(S.sym||'BTCUSDT').replace(/USDT|USD|PERP|BUSD/gi,'')||'BTC';}catch(_){return 'BTC';}}
function sym(){try{return String(S.sym||'BTCUSDT').toUpperCase();}catch(_){return 'BTCUSDT';}}
function cgKey(){return String(val('cgApiKey','')||'').trim();}
function source(){return val('cgDataSource','auto')||'auto';}
function useCG(){return source()==='coinglass'||(source()==='auto'&&!!cgKey());}
function hdr(){const h={'accept':'application/json'};if(cgKey())h['CG-API-KEY']=cgKey();return h;}
function tf(forCG){let p=String(val('cgSharedPeriod','auto')||'auto').toLowerCase();if(p==='auto')p=String((window.S&&S.tf)||'5m').toLowerCase();const cg=['1m','3m','5m','15m','30m','1h','4h','6h','8h','12h','1d','1w'];const bn=['5m','15m','30m','1h','2h','4h','6h','12h','1d'];if(forCG&&cg.includes(p))return p;if(bn.includes(p))return p;if(forCG&&p==='2h')return '1h';return '5m';}
async function getJson(url,opt){const r=await fetch(url,Object.assign({cache:'no-store'},opt||{}));if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}
function arr(j){if(Array.isArray(j))return j;if(Array.isArray(j?.data))return j.data;if(Array.isArray(j?.data?.list))return j.data.list;if(Array.isArray(j?.data?.items))return j.data.items;if(Array.isArray(j?.result))return j.result;return[];}
function ts(o){if(Array.isArray(o))return n(o[0]);return n(o.timestamp||o.time||o.t||o.date||o.createTime||o.openTime);}
function pick(o,keys){if(Array.isArray(o)){for(const k of keys){const v=n(o[k],NaN);if(Number.isFinite(v))return v;}return 0;}for(const k of keys){const v=n(o[k],NaN);if(Number.isFinite(v))return v;}return 0;}
function fmtMoney(v){v=n(v);const a=Math.abs(v),s=v<0?'-':'';if(a>=1e12)return s+'$'+(a/1e12).toFixed(2)+'T';if(a>=1e9)return s+'$'+(a/1e9).toFixed(2)+'B';if(a>=1e6)return s+'$'+(a/1e6).toFixed(1)+'M';if(a>=1e3)return s+'$'+(a/1e3).toFixed(0)+'K';return s+'$'+a.toFixed(0);}
function fmtVol(v){v=n(v);const a=Math.abs(v);if(a>=1e9)return (v/1e9).toFixed(2)+'B';if(a>=1e6)return (v/1e6).toFixed(1)+'M';if(a>=1e3)return (v/1e3).toFixed(0)+'K';return v.toFixed(0);}
function parseOI(a,isCg){return a.map((o,i)=>{let t=ts(o);let open=pick(o,['open','o',1]);let high=pick(o,['high','h',2]);let low=pick(o,['low','l',3]);let close=pick(o,['close','c','value','sumOpenInterestValue','openInterestUsd','oiUsd',4]);if(!isCg){close=pick(o,['sumOpenInterestValue','value','close','c']);open=i&&a[i-1]?pick(a[i-1],['sumOpenInterestValue','value','close','c']):close;high=Math.max(open,close);low=Math.min(open,close);}if(!open)open=i&&a[i-1]?pick(a[i-1],['close','c','value','sumOpenInterestValue','openInterestUsd','oiUsd',4]):close;if(!high)high=Math.max(open,close);if(!low)low=Math.min(open,close);return{t,open,high,low,close};}).filter(d=>d.t&&d.close>0).sort((a,b)=>a.t-b.t);}
function parseTaker(a){return a.map(o=>{const t=ts(o);let buy=pick(o,['buyVol','buyVolume','takerBuyVol','taker_buy_volume','longVol','longVolume','buy_usd','buyUsd','buy',1]);let sell=pick(o,['sellVol','sellVolume','takerSellVol','taker_sell_volume','shortVol','shortVolume','sell_usd','sellUsd','sell',2]);let ratio=pick(o,['buySellRatio','longShortRatio','ratio','buy_sell_ratio','long_short_ratio',3]);if(!ratio&&sell>0)ratio=buy/sell;let total=buy+sell;if(!total&&ratio>0){buy=ratio/(1+ratio);sell=1/(1+ratio);total=1;}return{t,buy,sell,total,ratio:ratio||1,longPct:total?buy/total:.5,shortPct:total?sell/total:.5};}).filter(d=>d.t&&d.ratio>0).sort((a,b)=>a.t-b.t);}
function parseAccounts(a){return a.map(o=>{const t=ts(o);let ratio=pick(o,['longShortRatio','ratio','long_short_ratio','longShort',1]);let long=pick(o,['longAccount','longAccountRatio','longRatio','long',2]);let short=pick(o,['shortAccount','shortAccountRatio','shortRatio','short',3]);if(long>1)long/=100;if(short>1)short/=100;if(!long&&!short&&ratio>0){long=ratio/(1+ratio);short=1/(1+ratio);}return{t,buy:long,sell:short,total:1,ratio:ratio||((short>0)?long/short:1),longPct:long,shortPct:short,accounts:true};}).filter(d=>d.t&&d.ratio>0).sort((a,b)=>a.t-b.t);}
async function fetchOI327(){const uc=useCG();const period=tf(uc);const key=[uc?'cg':'bn',coin(),sym(),period,val('cgOiUnit','usd')].join('|');if(CG327.oi.key===key&&Date.now()-CG327.oi.ts<45000)return;if(CG327.oi.fetching)return;CG327.oi.fetching=true;CG327.oi.err='';try{let data,src;if(uc){const u='https://open-api-v4.coinglass.com/api/futures/open-interest/aggregated-history?symbol='+encodeURIComponent(coin())+'&interval='+encodeURIComponent(period)+'&limit=500&unit='+encodeURIComponent(val('cgOiUnit','usd')||'usd');data=parseOI(arr(await getJson(u,{headers:hdr()})),true);src='COINGLASS AGG';}else{const u='https://fapi.binance.com/futures/data/openInterestHist?symbol='+encodeURIComponent(sym())+'&period='+encodeURIComponent(tf(false))+'&limit=500';data=parseOI(arr(await getJson(u)),false);src='BINANCE OI';}CG327.oi={key,data,ts:Date.now(),fetching:false,src,err:''};}catch(e){CG327.oi.fetching=false;CG327.oi.err=String(e&&e.message||e);if(uc&&source()==='auto'){try{const u='https://fapi.binance.com/futures/data/openInterestHist?symbol='+encodeURIComponent(sym())+'&period='+encodeURIComponent(tf(false))+'&limit=500';const data=parseOI(arr(await getJson(u)),false);CG327.oi={key:'fallback|'+sym()+'|'+tf(false),data,ts:Date.now(),fetching:false,src:'BINANCE OI',err:''};}catch(_){}}}}
async function fetchLS327(){const mode=val('cgLsMode','taker')||'taker';const isAccounts=mode.indexOf('account')>=0||mode==='global'||mode==='top';const uc=useCG();const period=tf(uc);const key=[uc?'cg':'bn',mode,coin(),sym(),period,val('cgExchange','Binance')].join('|');if(CG327.ls.key===key&&Date.now()-CG327.ls.ts<45000)return;if(CG327.ls.fetching)return;CG327.ls.fetching=true;CG327.ls.err='';try{let data,src;if(isAccounts){if(uc){const ep=(mode==='top'||mode==='accounts-top')?'top-long-short-account-ratio':'global-long-short-account-ratio';const u='https://open-api-v4.coinglass.com/api/futures/'+ep+'/history?exchange='+encodeURIComponent(val('cgExchange','Binance'))+'&symbol='+encodeURIComponent(sym())+'&interval='+encodeURIComponent(period)+'&limit=500';data=parseAccounts(arr(await getJson(u,{headers:hdr()})));src='CG ACCOUNTS';}else{const ep=(mode==='top'||mode==='accounts-top')?'topLongShortAccountRatio':'globalLongShortAccountRatio';const u='https://fapi.binance.com/futures/data/'+ep+'?symbol='+encodeURIComponent(sym())+'&period='+encodeURIComponent(tf(false))+'&limit=500';data=parseAccounts(arr(await getJson(u)));src='BINANCE ACC';}}
      else if(uc){const u='https://open-api-v4.coinglass.com/api/futures/aggregated-taker-buy-sell-volume/history?exchange_list='+encodeURIComponent(val('cgTakerExchanges','Binance,OKX,Bybit'))+'&symbol='+encodeURIComponent(coin())+'&interval='+encodeURIComponent(period)+'&limit=500&unit=usd';data=parseTaker(arr(await getJson(u,{headers:hdr()})));src='CG TAKER AGG';}
      else{const u='https://fapi.binance.com/futures/data/takerlongshortRatio?symbol='+encodeURIComponent(sym())+'&period='+encodeURIComponent(tf(false))+'&limit=500';data=parseTaker(arr(await getJson(u)));src='BINANCE TAKER';}
      CG327.ls={key,data,ts:Date.now(),fetching:false,src,err:''};}
    catch(e){CG327.ls.fetching=false;CG327.ls.err=String(e&&e.message||e);if(uc&&source()==='auto'){try{const u='https://fapi.binance.com/futures/data/takerlongshortRatio?symbol='+encodeURIComponent(sym())+'&period='+encodeURIComponent(tf(false))+'&limit=500';const data=parseTaker(arr(await getJson(u)));CG327.ls={key:'fallback|taker|'+sym()+'|'+tf(false),data,ts:Date.now(),fetching:false,src:'BINANCE TAKER',err:''};}catch(_){}}}}
function ensure327(){try{if(window.S&&S.inds&&S.inds.cgOpenInterest)fetchOI327().then(()=>{try{drawSoon();}catch(_){}});if(window.S&&S.inds&&S.inds.cgLongShort)fetchLS327().then(()=>{try{drawSoon();}catch(_){}});}catch(_){}}
function valueAt(data,t){if(!data||!data.length)return null;let lo=0,hi=data.length-1;if(t<=data[0].t)return data[0];if(t>=data[hi].t)return data[hi];while(lo<hi){const m=(lo+hi+1)>>1;if(data[m].t<=t)lo=m;else hi=m-1;}return data[lo];}
function activeHeights(){const has=!!(window.S&&S.candles&&S.candles.length);return{clarH:(has&&S.inds&&S.inds.hvnClarity)?(window._hvnClarityH||166):0,flowH:(has&&S.inds&&S.inds.flowAccel)?(window._flowAccelH||120):0,lsH:(has&&S.inds&&S.inds.cgLongShort)?(window._cgLongShortH||104):0,oiH:(has&&S.inds&&S.inds.cgOpenInterest)?(window._cgOpenInterestH||112):0};}
function panelBoxes(H){const h=activeHeights(),g=GAP();let b=H-10;const res={};if(h.clarH){res.trendClarity={top:b-h.clarH,bottom:b,height:h.clarH};b-=h.clarH+g;}if(h.flowH){res.flow={top:b-h.flowH,bottom:b,height:h.flowH};b-=h.flowH+g;}if(h.lsH){res.cgLs={top:b-h.lsH,bottom:b,height:h.lsH};b-=h.lsH+g;}if(h.oiH){res.cgOi={top:b-h.oiH,bottom:b,height:h.oiH};b-=h.oiH+g;}return res;}
function assignGlobalHelpers(){
  try{window.oscPanelHeights=oscPanelHeights=function(){const h=activeHeights();return{clarH:h.clarH,flowH:h.flowH,cgLsH:h.lsH,cgOiH:h.oiH};};}catch(_){ }
  try{window.oscPanelAtY=oscPanelAtY=function(y,H){const p=panelBoxes(H);for(const k of ['trendClarity','flow','cgLs','cgOi']){const b=p[k];if(b&&y>=b.top&&y<=b.bottom)return k;}return null;};}catch(_){ }
  try{window.oscScaleHit=oscScaleHit=function(x,y,W,H){const right=W-RP();if(x<right||x>Math.min(W,right+PR))return null;return window.oscPanelAtY(y,H);};}catch(_){ }
  try{window.oscEnsureScale=oscEnsureScale=function(kind){if(!S.oscScale)S.oscScale={};if(!S.oscScale[kind]){S.oscScale[kind]=(kind==='cgLs')?{center:1,range:1.2}:{center:0,range:200};}const o=S.oscScale[kind];if((kind==='cgLs')&&(!Number.isFinite(+o.center)||+o.range>20)){o.center=1;o.range=1.2;}o.center=Number.isFinite(+o.center)?+o.center:(kind==='cgLs'?1:0);o.range=Math.max(Number.isFinite(+o.range)?+o.range:(kind==='cgLs'?1.2:200),1e-9);return o;};}catch(_){ }
  try{window.oscSaveScale=oscSaveScale=function(kind){try{const o=S.oscScale&&S.oscScale[kind];if(o)localStorage.setItem('dvl_osc_scale_'+kind,JSON.stringify({center:o.center,range:o.range}));}catch(_){}};}catch(_){ }
}
function loadSavedScales(){try{if(!window.S)return;if(!S.oscScale)S.oscScale={};['cgOi','cgLs'].forEach(k=>{const raw=localStorage.getItem('dvl_osc_scale_'+k);if(raw){try{const o=JSON.parse(raw);if(Number.isFinite(+o.center)&&Number.isFinite(+o.range)&&+o.range>0)S.oscScale[k]={center:+o.center,range:+o.range};}catch(_){}}});if(!S.oscScale.cgLs||S.oscScale.cgLs.range>20)S.oscScale.cgLs={center:1,range:1.2};if(!S.oscScale.cgOi)S.oscScale.cgOi={center:0,range:200};}catch(_){}}
function layout(W,pTop,pBot){const rp=RP();return{left:PL,right:W-rp,scaleLeft:W-rp,scaleRight:W,top:pTop,bottom:pBot,plotLeft:PL+2,plotRight:W-rp-6,plotTop:pTop+20,plotBottom:pBot-18,h:pBot-pTop,rp};}
function chrome(ctx,L,title,value,kind,key,settings){ctx.save();ctx.fillStyle='rgba(5,9,20,.96)';ctx.fillRect(L.left,L.top,L.right-L.left,L.h);ctx.strokeStyle='rgba(30,42,64,.88)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L.left,L.top+.5);ctx.lineTo(L.right,L.top+.5);ctx.moveTo(L.left,L.bottom+.5);ctx.lineTo(L.right,L.bottom+.5);ctx.stroke();ctx.fillStyle='#05070b';ctx.fillRect(L.scaleLeft,L.top,L.scaleRight-L.scaleLeft,L.h);ctx.fillStyle='rgba(0,212,255,.30)';ctx.fillRect(L.scaleLeft+1,L.top,3,L.h);const hidden=!!window['__dvl_'+key+'_hidden'];const ex=L.right-54,gy=L.top+12,gearX=L.right-28;ctx.font='900 9px monospace';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=kind==='bull'?'#18e6b1':kind==='bear'?'#ff5f70':'#8ea4c6';if(!hidden){ctx.fillText(title,L.plotLeft+8,L.top+11);ctx.textAlign='right';ctx.fillText(value,L.right-62,L.top+11);}ctx.textAlign='center';ctx.font='900 11px monospace';ctx.fillStyle=hidden?'#53647d':'#00d4ff';ctx.fillText(hidden?'◌':'◉',ex,gy);ctx.fillStyle='#8da3c2';ctx.fillText('⚙',gearX,gy+1);window._dvlCgOscHit=window._dvlCgOscHit||{};window._dvlCgOscHit[key]={settings,eye:{x1:ex-18,y1:gy-18,x2:ex+18,y2:gy+18},gear:{x1:gearX-18,y1:gy-18,x2:gearX+18,y2:gy+18}};ctx.restore();}
function yScale(kind,vals,defC,defR){let min=Math.min(...vals),max=Math.max(...vals);if(!Number.isFinite(min)||!Number.isFinite(max)||min===max){min=defC-defR/2;max=defC+defR/2;}let o=oscEnsureScale(kind);if(kind==='cgOi'&&(+o.center===0&&+o.range===200)){o.center=(min+max)/2;o.range=Math.max((max-min)*1.28,Math.abs(max||1)*.02,1);}if(kind==='cgLs'&&(+o.range>20||+o.center===0)){o.center=1;o.range=1.2;}return{lo:o.center-o.range/2,hi:o.center+o.range/2,o};}
function yy(L,v,ys){return L.plotBottom-(v-ys.lo)/Math.max(1e-12,ys.hi-ys.lo)*(L.plotBottom-L.plotTop);}function scaleLabels(ctx,L,ys,fmt){ctx.save();ctx.fillStyle='#6f86a8';ctx.font='800 8px monospace';ctx.textAlign='left';ctx.textBaseline='middle';for(let k=0;k<=2;k++){const v=ys.hi-(ys.hi-ys.lo)*k/2;const y=yy(L,v,ys);ctx.fillText(fmt(v),L.scaleLeft+6,y);}ctx.restore();}
function panelOffs(clarH,flowH,lsH){let off=0;const g=GAP();if(clarH)off+=clarH+g;if(flowH)off+=flowH+g;if(lsH)off+=lsH+g;return off;}
window.__drawCGOpenInterestPanel=function(ctx,W,H,V,sc,x,h,lsH,flowH,clarH){ensure327();const off=panelOffs(clarH,flowH,lsH);const pBot=H-10-off,pTop=pBot-h,L=layout(W,pTop,pBot);const data=CG327.oi.data||[];const vals=[];for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(d)vals.push(d);}const last=vals[vals.length-1],prev=vals.length>1?vals[vals.length-2]:last;const pct=last&&prev?((last.close-prev.close)/Math.max(1e-9,prev.close)*100):0;chrome(ctx,L,'CG AGG OPEN INTEREST',last?fmtMoney(last.close)+' '+(pct>=0?'+':'')+pct.toFixed(2)+'%':(CG327.oi.fetching?'LOADING':'NO DATA'),pct>0?'bull':pct<0?'bear':'neutral','cgOi','cgOpenInterest');ctx.save();ctx.beginPath();ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);ctx.clip();if(vals.length){const all=[];vals.forEach(v=>{all.push(v.low||v.close,v.high||v.close);});const ys=yScale('cgOi',all,0,200);ctx.strokeStyle='rgba(35,50,72,.72)';ctx.lineWidth=.8;for(let k=0;k<3;k++){const y=L.plotTop+(L.plotBottom-L.plotTop)*k/2;ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();}const bw=Math.max(2,(CW(W)/Math.max(1,V.span))*0.50);for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;const xx=x(i),yo=yy(L,d.open,ys),yc=yy(L,d.close,ys),yh=yy(L,d.high,ys),yl=yy(L,d.low,ys),bull=d.close>=d.open;ctx.strokeStyle=bull?'rgba(0,225,172,.95)':'rgba(255,95,90,.95)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,yh);ctx.lineTo(xx,yl);ctx.stroke();ctx.fillStyle=bull?'rgba(0,215,168,.72)':'rgba(255,95,90,.72)';ctx.fillRect(xx-bw/2,Math.min(yo,yc),bw,Math.max(2,Math.abs(yc-yo)));ctx.strokeRect(xx-bw/2,Math.min(yo,yc),bw,Math.max(2,Math.abs(yc-yo)));}ctx.restore();scaleLabels(ctx,L,ys,fmtMoney);return;}ctx.restore();};
window.__drawCGLongShortPanel=function(ctx,W,H,V,sc,x,h,flowH,clarH){ensure327();const off=panelOffs(clarH,flowH,0);const pBot=H-10-off,pTop=pBot-h,L=layout(W,pTop,pBot);const data=CG327.ls.data||[];const vals=[];for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(d)vals.push(d);}const last=vals[vals.length-1];const label=(val('cgLsMode','taker')||'taker').includes('account')?'CG L/S ACCOUNTS':'CG TAKER LONG/SHORT';const text=last?('L/S '+last.ratio.toFixed(2)+' · L '+Math.round((last.longPct||.5)*100)+'%'):(CG327.ls.fetching?'LOADING':'NO DATA');chrome(ctx,L,label,text,last?(last.ratio>1.03?'bull':last.ratio<.97?'bear':'neutral'):'neutral','cgLs','cgLongShort');ctx.save();ctx.beginPath();ctx.rect(L.plotLeft,L.plotTop,L.plotRight-L.plotLeft,L.plotBottom-L.plotTop);ctx.clip();if(vals.length){const ratios=vals.map(v=>v.ratio).concat([1]);const ys=yScale('cgLs',ratios,1,1.2);const zero=yy(L,1,ys);/* midline */ctx.strokeStyle='rgba(0,212,255,.30)';ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(L.plotLeft,zero);ctx.lineTo(L.plotRight,zero);ctx.stroke();ctx.setLineDash([]);/* subtle grid */ctx.strokeStyle='rgba(35,50,72,.55)';ctx.lineWidth=.6;for(let k=0;k<3;k++){const y=L.plotTop+(L.plotBottom-L.plotTop)*k/2;ctx.beginPath();ctx.moveTo(L.plotLeft,y);ctx.lineTo(L.plotRight,y);ctx.stroke();}/* single color-changing line: green when ratio>=1, red when <1 */let px=null,py=null;for(let i=V.a;i<V.b;i++){const d=valueAt(data,S.candles[i]?.t||0);if(!d)continue;const xx=x(i),yr=yy(L,d.ratio,ys);if(px!==null){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(xx,yr);const dom=d.ratio>=1;ctx.strokeStyle=dom?'rgba(0,230,155,.98)':'rgba(255,85,75,.98)';ctx.lineWidth=1.8;ctx.shadowColor=dom?'rgba(0,225,150,.32)':'rgba(255,85,75,.30)';ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;}px=xx;py=yr;}ctx.restore();scaleLabels(ctx,L,ys,v=>v.toFixed(2));return;}ctx.restore();};
function customizeCards(){const c1=q('[data-card="cgOpenInterest"]'),c2=q('[data-card="cgLongShort"]');if(c1){const n=q('.name',c1),s=q('.ind-sub',c1);if(n)n.textContent='CG Open Interest';if(s)s.textContent='Aggregated OI candles';}if(c2){const n=q('.name',c2),s=q('.ind-sub',c2);if(n)n.textContent='CG Taker Long/Short';if(s)s.textContent='Taker buy/sell ratio';const sel=q('#cgLsMode');if(sel&&sel.dataset.dvl327Mode!=='1'){sel.dataset.dvl327Mode='1';sel.innerHTML='<option value="taker" selected>Taker buy/sell</option><option value="accounts-global">Accounts global</option><option value="accounts-top">Top accounts</option>';}}
  if(!q('#cgTakerExchanges')&&q('#settings-cgLongShort')){q('#settings-cgLongShort').insertAdjacentHTML('beforeend','<div class="dvl325-cg-row"><span class="k">CG exchanges</span><input class="input" id="cgTakerExchanges" value="Binance,OKX,Bybit" style="width:128px"></div><div class="dvl327-cg-desc">Padrão do painel: Taker buy/sell long-short ratio, igual ao Longs vs Shorts de fluxo/agressão. Accounts fica só como opção.</div>');}
  ['cgTakerExchanges','cgLsMode'].forEach(id=>{const el=q('#'+id);if(el&&!el.dataset.dvl327Bound){el.dataset.dvl327Bound='1';el.addEventListener('change',()=>{CG327.ls.key='';ensure327();try{drawSoon();}catch(_){}});el.addEventListener('input',()=>{CG327.ls.key='';});}});
}
function fixSettings(){window._cgOpenInterestH=clamp(parseInt(val('cgOpenInterestHeight',window._cgOpenInterestH||112)||112,10),78,240);window._cgLongShortH=clamp(parseInt(val('cgLongShortHeight',window._cgLongShortH||104)||104,10),72,230);}
function forceVersion(){try{window.DVL_APP_VERSION=VER;}catch(_){ }qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(b=>{if(b)b.textContent=VER;});try{window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];const notes=['CoinGlass panels now use the native Trend Clarity oscillator base: right-scale zoom, panel hit testing, pinch/wheel scaling and double-tap reset.','Long/Short corrected to Taker Buy/Sell long-short ratio by default; account ratio remains optional.'];notes.forEach(note=>{if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});});}catch(_){}}
function bindTouch(){const wrap=q('#chartWrap');if(!wrap||wrap.dataset.dvl327Touch==='1')return;wrap.dataset.dvl327Touch='1';function pos(t){const r=wrap.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top,r};}
  wrap.addEventListener('touchstart',e=>{if(!e.touches||!e.touches.length)return;const r=wrap.getBoundingClientRect();let x,y;if(e.touches.length===1){x=e.touches[0].clientX-r.left;y=e.touches[0].clientY-r.top;}else{x=(e.touches[0].clientX+e.touches[1].clientX)/2-r.left;y=(e.touches[0].clientY+e.touches[1].clientY)/2-r.top;}const kind=oscPanelAtY(y,r.height);if(kind!=='cgOi'&&kind!=='cgLs')return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();CG327.touch={kind,mode:(oscScaleHit(x,y,r.width,r.height)?'scale':'pan'),axis:null,lastX:e.touches[0].clientX,lastY:e.touches[0].clientY,startX:e.touches[0].clientX,startY:e.touches[0].clientY,dist:e.touches.length===2?Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY):0,midX:e.touches.length===2?(e.touches[0].clientX+e.touches[1].clientX)/2:e.touches[0].clientX};},{capture:true,passive:false});
  wrap.addEventListener('touchmove',e=>{const st=CG327.touch;if(!st||!e.touches||!e.touches.length)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();const r=wrap.getBoundingClientRect();if(e.touches.length===2){const nd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(st.dist){const factor=clamp(1+(st.dist/Math.max(1,nd)-1)*0.72,.88,1.12);const o=oscEnsureScale(st.kind);o.range=Math.max(1e-9,Math.min(1e15,o.range*factor));oscSaveScale(st.kind);}st.dist=nd;try{drawSoon();}catch(_){ }return;}const cx=e.touches[0].clientX,cy=e.touches[0].clientY,dx=cx-st.lastX,dy=cy-st.lastY;if(!st.axis){const ax=Math.abs(cx-st.startX),ay=Math.abs(cy-st.startY);if(ax>8||ay>8)st.axis=ay>ax*1.35?'v':'h';}if(st.mode==='scale'||st.axis==='v'){const o=oscEnsureScale(st.kind);if(st.mode==='scale')o.range=Math.max(1e-9,Math.min(1e15,o.range*Math.exp(dy*0.0028)));else{o.center+=dy*(o.range/((st.kind==='cgOi'?window._cgOpenInterestH:window._cgLongShortH)||110));}oscSaveScale(st.kind);st.lastY=cy;try{drawSoon();}catch(_){ }}else if(st.axis==='h'){const span=S.view.end-S.view.start,per=span/CW(r.width),shift=-dx*per;S.view.start=clamp(S.view.start+shift,0,Math.max(0,futureMax()-span));S.view.end=S.view.start+span;S.view.auto=false;st.lastX=cx;try{drawSoon();}catch(_){ }}},{capture:true,passive:false});
  wrap.addEventListener('touchend',e=>{if(CG327.touch){e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();CG327.touch=null;}},{capture:true,passive:false});
}
function boot(){forceVersion();assignGlobalHelpers();loadSavedScales();customizeCards();fixSettings();ensure327();bindTouch();try{drawSoon();}catch(_){ }}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();[80,240,700,1500,3200].forEach(ms=>setTimeout(boot,ms));setInterval(()=>{assignGlobalHelpers();ensure327();},30000);
})();


/* ════════════════════════════════════════════════════════════════════════
   V328 — Card Resize Controls (L38896-39040)
    UI cards com SVG icons, eye/gear, drag-to-resize
    standardizeCards() — label "CG Taker L/S"
   ════════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';
const VER='Beta 0.328';
let raf=0;
let resizeState=null;
function q(s,r){return (r||document).querySelector(s);}function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function stop(e){try{e.preventDefault();}catch(_){}try{e.stopPropagation();}catch(_){}try{e.stopImmediatePropagation&&e.stopImmediatePropagation();}catch(_){}}
function forceVersion(){
  try{window.DVL_APP_VERSION=VER;}catch(_){ }
  qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(el=>{if(el)el.textContent=(window.DVL_APP_VERSION||VER);});
  /* body-* walker removed — caused full DOM traversal on every badge update */
  try{window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];[
    'CoinGlass indicator cards standardized to native DVL card structure with premium SVG icons.',
    'CoinGlass oscillator panels now have visible eye/gear controls and top-splitter drag resize like native oscillators.'
  ].forEach(note=>{if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});});}catch(_){ }
}
function starSvg(){return '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><polygon points="8,1 10,6.5 15.5,6.5 11,10 13,15.5 8,12 3,15.5 5,10 0.5,6.5 6,6.5"/></svg>';}
function iconOi(){return '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13.5V5.8"/><path d="M3 5.8l3.2 2.5L9 4.5l3 5 3-3.2"/><path d="M15 6.3v7.2"/><rect x="2.2" y="11.2" width="2.2" height="3.2" rx=".6" fill="currentColor" opacity=".20"/><rect x="7.9" y="8" width="2.2" height="6.4" rx=".6" fill="currentColor" opacity=".20"/><rect x="13.6" y="9.8" width="2.2" height="4.6" rx=".6" fill="currentColor" opacity=".20"/></svg>';}
function iconLs(){return '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h8.5"/><path d="M9 2.8L11.5 5 9 7.2"/><path d="M15 13H6.5"/><path d="M9 10.8L6.5 13 9 15.2"/><path d="M4.3 9h9.4" stroke-opacity=".35"/></svg>';}
function normalizeCard(key,title,badgeText,icon,colors){
  const card=q('[data-card="'+key+'"]'); if(!card)return;
  card.classList.add('dvl-icd','dvl328-cg-card');
  card.setAttribute('data-dvl-cat','clareza');
  let settings=q('#settings-'+key,card)||q('#settings-'+key);
  let row=q('.row[data-ind="'+key+'"]',card)||q('.row[data-ind="'+key+'"]');
  let gear=q('.gear[data-settings="'+key+'"]',card)||q('.gear[data-settings="'+key+'"]');
  let star=q('.dvl-star[data-star="'+key+'"]',card)||q('.dvl-star[data-star="'+key+'"]');
  if(!row){row=document.createElement('div');row.className='row';row.dataset.ind=key;row.innerHTML='<span class="switch"></span>';}
  if(!gear){gear=document.createElement('button');gear.className='gear';gear.dataset.settings=key;gear.type='button';gear.innerHTML='&#9881;';}
  if(!star){star=document.createElement('button');star.className='dvl-star';star.dataset.star=key;star.type='button';star.innerHTML=starSvg();}
  else if(!star.querySelector('svg')) star.innerHTML=starSvg();
  let head=q('.dvl-icd-head',card);
  if(!head){
    const oldHead=q('.ind-head',card);
    head=document.createElement('div');
    head.className='dvl-icd-head';
    if(oldHead)oldHead.replaceWith(head); else card.insertBefore(head,card.firstChild);
  }
  head.innerHTML='';
  const ico=document.createElement('div');ico.className='dvl-icd-icon';ico.style.setProperty('--ic-bg',colors.bg);ico.style.setProperty('--ic-cl',colors.cl);ico.innerHTML=icon;
  const info=document.createElement('div');info.className='dvl-icd-info';info.innerHTML='<div class="dvl-icd-name name">'+title+'</div><div class="dvl-icd-meta"><span class="dvl-bdg dvl-bdg-nat">NATIVO</span><span class="dvl-bdg dvl-bdg-on">ATIVO</span></div>';
  const ctrl=document.createElement('div');ctrl.className='dvl-icd-ctrl';ctrl.appendChild(row);ctrl.appendChild(gear);ctrl.appendChild(star);
  head.appendChild(ico);head.appendChild(info);head.appendChild(ctrl);
  if(settings && settings.parentNode!==card)card.appendChild(settings);
  bindCardControls(key,row,gear);
}
function bindCardControls(key,row,gear){
  if(row&&!row.dataset.dvl328Bound){
    row.dataset.dvl328Bound='1';
    row.addEventListener('click',function(ev){stop(ev);try{window.S.inds[key]=!window.S.inds[key];}catch(_){ }syncCardToggles();try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){ }},true);
  }
  if(gear&&!gear.dataset.dvl328Bound){
    gear.dataset.dvl328Bound='1';
    gear.addEventListener('click',function(ev){stop(ev);if(typeof window.openInputModal==='function')window.openInputModal(key,gear);},true);
    gear.addEventListener('touchend',function(ev){stop(ev);if(typeof window.openInputModal==='function')window.openInputModal(key,gear);},{capture:true,passive:false});
  }
}
function syncCardToggles(){try{['cgOpenInterest','cgLongShort'].forEach(k=>qa('.row[data-ind="'+k+'"]').forEach(r=>r.classList.toggle('on',!!S.inds[k])));}catch(_){}}
function standardizeCards(){
  normalizeCard('cgOpenInterest','CG Open Interest','OI CANDLES',iconOi(),{bg:'rgba(34,211,238,.12)',cl:'#22d3ee'});
  normalizeCard('cgLongShort','CG Taker L/S','TAKER RATIO',iconLs(),{bg:'rgba(45,212,191,.12)',cl:'#2dd4bf'});
  syncCardToggles();
}
function panelRects(W,H){
  let has=!!(window.S&&S.candles&&S.candles.length&&S.inds);
  const g=(typeof PANEL_GAP!=='undefined'?PANEL_GAP:4);
  const clarH=(has&&S.inds.hvnClarity)?(window._hvnClarityH||166):0;
  const flowH=(has&&S.inds.flowAccel)?(window._flowAccelH||120):0;
  const lsH=(has&&S.inds.cgLongShort)?(window._cgLongShortH||86):0;
  const oiH=(has&&S.inds.cgOpenInterest)?(window._cgOpenInterestH||92):0;
  let off=0,out={};
  if(clarH)off+=clarH+g;
  if(flowH)off+=flowH+g;
  if(lsH){const bot=H-10-off;out.cgLs={top:bot-lsH,bottom:bot,h:lsH,key:'cgLongShort',storage:'dvl_cgLongShortH',kind:'cgLs',min:58,max:210};off+=lsH+g;}
  if(oiH){const bot=H-10-off;out.cgOi={top:bot-oiH,bottom:bot,h:oiH,key:'cgOpenInterest',storage:'dvl_cgOpenInterestH',kind:'cgOi',min:62,max:220};}
  return out;
}
function resizeHit(clientX,clientY){
  const wrap=q('#chartWrap');if(!wrap)return null;const r=wrap.getBoundingClientRect();const x=clientX-r.left,y=clientY-r.top;const W=r.width,H=r.height;let right=W-68;try{right=W-(typeof RP==='function'?RP():68);}catch(_){ }
  const rects=panelRects(W,H);for(const k of ['cgOi','cgLs']){const p=rects[k];if(!p)continue;if(x>=0&&x<=right-4&&Math.abs(y-p.top)<=9)return Object.assign({x,y,wrap},p);}return null;
}
function setHeight(kind,h){
  if(kind==='cgOi'){window._cgOpenInterestH=clamp(Math.round(h),62,220);try{localStorage.setItem('dvl_cgOpenInterestH',String(window._cgOpenInterestH));const input=q('#cgOpenInterestHeight');if(input)input.value=String(window._cgOpenInterestH);}catch(_){ }}
  if(kind==='cgLs'){window._cgLongShortH=clamp(Math.round(h),58,210);try{localStorage.setItem('dvl_cgLongShortH',String(window._cgLongShortH));const input=q('#cgLongShortHeight');if(input)input.value=String(window._cgLongShortH);}catch(_){ }}
}
function bindResize(){
  if(document.documentElement.dataset.dvl328ResizeBound==='1')return;document.documentElement.dataset.dvl328ResizeBound='1';
  document.addEventListener('pointerdown',function(ev){
    const hit=resizeHit(ev.clientX,ev.clientY);if(!hit)return;
    resizeState={kind:hit.kind,startY:ev.clientY,startH:hit.h,wrap:hit.wrap};hit.wrap.classList.add('dvl328-cg-resizing');stop(ev);
  },{capture:true,passive:false});
  document.addEventListener('pointermove',function(ev){
    if(!resizeState)return;stop(ev);const dy=ev.clientY-resizeState.startY;setHeight(resizeState.kind,resizeState.startH-dy);try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){ }
  },{capture:true,passive:false});
  document.addEventListener('pointerup',function(ev){if(!resizeState)return;stop(ev);if(resizeState.wrap)resizeState.wrap.classList.remove('dvl328-cg-resizing');resizeState=null;},{capture:true,passive:false});
  document.addEventListener('pointercancel',function(){if(resizeState&&resizeState.wrap)resizeState.wrap.classList.remove('dvl328-cg-resizing');resizeState=null;},{capture:true,passive:false});
}
function eyeSvg(on){return on?'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 10s2.5-4.6 7.6-4.6 7.6 4.6 7.6 4.6-2.5 4.6-7.6 4.6S2.4 10 2.4 10z"/><circle cx="10" cy="10" r="2.2" fill="currentColor" opacity=".28"/></svg>':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14"/><path d="M7.7 5.2A8.3 8.3 0 0 1 10 4.9c5.1 0 7.6 5.1 7.6 5.1a13.2 13.2 0 0 1-2.2 3"/><path d="M12.1 12.4A3 3 0 0 1 7.6 7.9"/><path d="M5.8 7.1A13 13 0 0 0 2.4 10s2.5 5.1 7.6 5.1c1.1 0 2.1-.2 3-.6"/></svg>';}
function gearSvg(){return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v2M10 15.2v2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M2.8 10h2M15.2 10h2M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4"/></svg>';}
function makeBtn(id,cls){const wrap=q('#chartWrap');if(!wrap)return null;let b=q('#'+id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='dvl328-cg-osc-btn '+cls;wrap.appendChild(b);}return b;}
function handleOscButton(k,t,ev){stop(ev);const hit=window._dvlCgOscHit&&window._dvlCgOscHit[k];if(!hit)return;if(t==='eye'){window['__dvl_'+k+'_hidden']=!window['__dvl_'+k+'_hidden'];try{localStorage.setItem('dvl_'+k+'_hidden',window['__dvl_'+k+'_hidden']?'1':'');}catch(_){ }try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){ }}else{const key=hit.settings||(k==='cgOi'?'cgOpenInterest':'cgLongShort');const gear=q('.gear[data-settings="'+key+'"]');if(typeof window.openInputModal==='function')window.openInputModal(key,gear||null);}}
function updateOscButtons(){
  const wrap=q('#chartWrap');if(!wrap||!window._dvlCgOscHit)return;
  [['cgOi','cgOpenInterest'],['cgLs','cgLongShort']].forEach(([k,ind])=>{
    const active=!!(window.S&&S.inds&&S.inds[ind]&&S.candles&&S.candles.length);
    const hidden=!!window['__dvl_'+k+'_hidden'];
    ['eye','gear'].forEach(t=>{
      const b=makeBtn('dvl328_'+k+'_'+t,t+(t==='eye'?(hidden?' off':' on'):''));if(!b)return;
      const hit=window._dvlCgOscHit&&window._dvlCgOscHit[k]&&window._dvlCgOscHit[k][t];
      if(!active||!hit){b.style.display='none';return;}
      b.className='dvl328-cg-osc-btn '+t+(t==='eye'?(hidden?' off':' on'):'');
      b.innerHTML=t==='eye'?eyeSvg(!hidden):gearSvg();
      const cx=(hit.x1+hit.x2)/2,cy=(hit.y1+hit.y2)/2;
      b.style.left=Math.round(cx-14)+'px';b.style.top=Math.round(cy-14)+'px';b.style.display='flex';
      if(!b.dataset.dvl328Bound){b.dataset.dvl328Bound='1';['pointerdown','touchstart','click'].forEach(evt=>b.addEventListener(evt,function(ev){handleOscButton(k,t,ev);},{capture:true,passive:false}));}
    });
  });
}
function patchDrawControls(){
  ['__drawCGOpenInterestPanel','__drawCGLongShortPanel'].forEach(fn=>{
    const old=window[fn];if(typeof old!=='function'||old.__dvl328Wrapped)return;
    const wrapped=function(ctx){
      const orig=ctx&&ctx.fillText;
      if(ctx&&orig){ctx.fillText=function(text,x,y,maxW){const t=String(text==null?'':text);if(t==='◉'||t==='◌'||t==='⚙')return;return orig.call(this,text,x,y,maxW);};}
      try{return old.apply(this,arguments);}finally{if(ctx&&orig)ctx.fillText=orig;try{requestAnimationFrame(updateOscButtons);}catch(_){updateOscButtons();}}
    };
    wrapped.__dvl328Wrapped=true;window[fn]=wrapped;
  });
}
function bindHitboxFallback(){
  if(document.documentElement.dataset.dvl328HitBound==='1')return;document.documentElement.dataset.dvl328HitBound='1';
  document.addEventListener('pointerdown',function(ev){
    const wrap=q('#chartWrap');if(!wrap||!window._dvlCgOscHit)return;const r=wrap.getBoundingClientRect();const x=ev.clientX-r.left,y=ev.clientY-r.top;
    for(const k of ['cgOi','cgLs']){const hit=window._dvlCgOscHit[k];if(!hit)continue;for(const t of ['eye','gear']){const b=hit[t];if(b&&x>=b.x1&&x<=b.x2&&y>=b.y1&&y<=b.y2){handleOscButton(k,t,ev);return;}}}
  },{capture:true,passive:false});
}
function boot(){raf=0;forceVersion();standardizeCards();bindResize();bindHitboxFallback();patchDrawControls();updateOscButtons();try{if(typeof window.drawSoon==='function')window.drawSoon();}catch(_){ }}
function schedule(){if(raf)return;raf=requestAnimationFrame(boot);} 
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
[80,220,600,1400,2600,4200].forEach(ms=>setTimeout(schedule,ms));
setInterval(function(){standardizeCards();patchDrawControls();updateOscButtons();},1500);
})();


/* ════════════════════════════════════════════════════════════════════════
   V330 — Modal Reset (L39104-39309)
    Reset de settings do modal CG (cgLsMode, cgExchange, etc)
   ════════════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  const VER='Beta 0.330';
  const CG_IDS=['cgDataSource','cgApiKey','cgSharedPeriod','cgOiUnit','cgOpenInterestHeight','cgExchange','cgLsMode','cgLsShowAverage','cgLongShortHeight','cgTakerExchanges'];
  let lastCgOpen=0;
  let raf=0;

  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function stop(e){try{e.preventDefault();}catch(_){}try{e.stopPropagation();}catch(_){}try{e.stopImmediatePropagation&&e.stopImmediatePropagation();}catch(_){} }
  function forceVersion(){
    try{window.DVL_APP_VERSION=VER;}catch(_){ }
    qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(el=>{if(el)el.textContent=(window.DVL_APP_VERSION||VER);});
    try{
      window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];
      [
        'CoinGlass gear/settings drawer rebuilt with a stable custom modal so fields no longer disappear.',
        'Fit/square scale controls now reset oscillator vertical scales and panel heights using the correct Flow/Clarity/CG storage keys.'
      ].forEach(note=>{if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});});
    }catch(_){ }
  }
  function orig(id){return qa('#'+id).find(el=>!el.dataset.dvl330Ui)||null;}
  function storeKey(id){return 'dvl_cg_setting_'+id;}
  function getStored(id,def){
    try{const v=localStorage.getItem(storeKey(id)); if(v!==null&&v!==undefined&&v!=='')return v;}catch(_){ }
    const el=orig(id); if(el&&el.value!==undefined&&el.value!=='')return el.value;
    return def;
  }
  function ensureOption(sel,value,label){
    if(!sel||!value)return;
    if(!Array.from(sel.options||[]).some(o=>o.value===value)){
      const o=document.createElement('option');o.value=value;o.textContent=label||value;sel.appendChild(o);
    }
  }
  function setOrig(id,value,dispatch){
    let el=orig(id);
    if(!el){
      el=document.createElement(id==='cgApiKey'||id==='cgTakerExchanges'?'input':'input');
      el.type='hidden';el.id=id;el.dataset.dvl330Store='1';document.body.appendChild(el);
    }
    if(id==='cgLsMode'&&el.tagName==='SELECT'){
      ensureOption(el,'taker','Taker buy/sell');
      ensureOption(el,'accounts-global','Accounts global');
      ensureOption(el,'accounts-top','Top accounts');
    }
    if(id==='cgDataSource'&&el.tagName==='SELECT'){
      ensureOption(el,'auto','Auto CG/Binance');ensureOption(el,'coinglass','CoinGlass API');ensureOption(el,'binance','Binance público');
    }
    if(id==='cgSharedPeriod'&&el.tagName==='SELECT'){
      ['auto','5m','15m','30m','1h','4h','1d'].forEach(v=>ensureOption(el,v,v==='auto'?'Auto TF':v));
    }
    if(id==='cgOiUnit'&&el.tagName==='SELECT'){
      ensureOption(el,'usd','USD');ensureOption(el,'coin','Coin');
    }
    if(id==='cgExchange'&&el.tagName==='SELECT'){
      ['Binance','Bybit','OKX','Bitget'].forEach(v=>ensureOption(el,v,v));
    }
    if(id==='cgLsShowAverage'&&el.tagName==='SELECT'){
      ensureOption(el,'on','Ligada');ensureOption(el,'off','Desligada');
    }
    try{el.value=value;}catch(_){ }
    try{localStorage.setItem(storeKey(id),String(value));}catch(_){ }
    if(id==='cgOpenInterestHeight'){
      const n=parseInt(value,10); if(Number.isFinite(n)){window._cgOpenInterestH=Math.max(78,Math.min(240,n));try{localStorage.setItem('dvl_cgOpenInterestH',String(window._cgOpenInterestH));}catch(_){ }}
    }
    if(id==='cgLongShortHeight'){
      const n=parseInt(value,10); if(Number.isFinite(n)){window._cgLongShortH=Math.max(72,Math.min(230,n));try{localStorage.setItem('dvl_cgLongShortH',String(window._cgLongShortH));}catch(_){ }}
    }
    if(dispatch){
      try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){ }
      try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
    }
  }
  function syncOriginalsFromStorage(){
    const defaults={
      cgDataSource:'auto',cgApiKey:'',cgSharedPeriod:'auto',cgOiUnit:'usd',cgOpenInterestHeight:String(window._cgOpenInterestH||112),
      cgExchange:'Binance',cgLsMode:'accounts-global',cgLsShowAverage:'on',cgLongShortHeight:String(window._cgLongShortH||104),cgTakerExchanges:'Binance,OKX,Bybit'
    };
    CG_IDS.forEach(id=>setOrig(id,getStored(id,defaults[id]||''),false));
  }
  function row(label,control){return '<div class="dvl330-cg-row"><span class="k">'+label+'</span>'+control+'</div>';}
  function select(id,options){
    const v=getStored(id,options[0]?.[0]||'');
    return '<select class="select" data-dvl330-ui="1" data-cg-src="'+id+'">'+options.map(o=>'<option value="'+o[0]+'" '+(String(o[0])===String(v)?'selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  }
  function input(id,type,placeholder){
    const v=String(getStored(id,''));
    return '<input class="input" data-dvl330-ui="1" data-cg-src="'+id+'" type="'+type+'" value="'+v.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" placeholder="'+(placeholder||'')+'">';
  }
  function num(id,min,max,def){
    const v=String(getStored(id,def));
    return '<input class="num" data-dvl330-ui="1" data-cg-src="'+id+'" type="number" min="'+min+'" max="'+max+'" value="'+v.replace(/"/g,'&quot;')+'">';
  }
  function cgHtml(key){
    if(key==='cgOpenInterest'){
      return '<div class="dvl330-cg-section">'+
        row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
        row('CG API Key',input('cgApiKey','password','opcional'))+
        row('Período',select('cgSharedPeriod',[['auto','Auto TF'],['5m','5m'],['15m','15m'],['30m','30m'],['1h','1h'],['4h','4h'],['1d','1D']]))+
        row('Unidade OI',select('cgOiUnit',[['usd','USD'],['coin','Coin']]))+
        row('Altura',num('cgOpenInterestHeight',78,240,112))+
        '<div class="dvl330-cg-note">Com API key: CoinGlass aggregated OI. Sem key: fallback público da Binance.</div></div>';
    }
    return '<div class="dvl330-cg-section">'+
      row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
      row('Exchange',select('cgExchange',[['Binance','Binance'],['Bybit','Bybit'],['OKX','OKX'],['Bitget','Bitget']]))+
      row('Modo',select('cgLsMode',[['taker','Taker buy/sell'],['accounts-global','Accounts global'],['accounts-top','Top accounts']]))+
      row('Média',select('cgLsShowAverage',[['on','Ligada'],['off','Desligada']]))+
      row('CG Exchanges',input('cgTakerExchanges','text','Binance,OKX,Bybit'))+
      row('Altura',num('cgLongShortHeight',72,230,104))+
      '<div class="dvl330-cg-note">Padrão: Taker buy/sell long-short ratio. Accounts fica como opção secundária.</div></div>';
  }
  function openCgModal(key){
    syncOriginalsFromStorage();
    const im=q('#inputModal'), body=q('#inputModalBody'), title=q('#inputModalTitle'), scrim=q('#inputModalScrim');
    if(!im||!body)return;
    try{ if(typeof window.closeInputModal==='function') window.closeInputModal(); }catch(_){ }
    body.dataset.dvl330Cg='1';
    body.innerHTML=cgHtml(key);
    if(title)title.textContent=(key==='cgOpenInterest'?'CG Open Interest':'CG Taker L/S')+' — INPUTS';
    im.classList.add('show'); im.setAttribute('aria-hidden','false');
    if(scrim)scrim.classList.add('show');
    qa('[data-cg-src]',body).forEach(el=>{
      const id=el.getAttribute('data-cg-src');
      const mirror=function(){setOrig(id,el.value,true);try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){ }};
      el.addEventListener('input',mirror,{passive:true});
      el.addEventListener('change',mirror,{passive:true});
    });
    lastCgOpen=Date.now();
  }
  function keyFromTarget(t){
    if(!t||!t.closest)return null;
    const gear=t.closest('.gear[data-settings="cgOpenInterest"],.gear[data-settings="cgLongShort"]');
    if(gear)return gear.getAttribute('data-settings');
    const osc=t.closest('#dvl325_cgOi_gear,#dvl328_cgOi_gear,.dvl325-cg-gear-overlay[data-kind="cgOi"]');
    if(osc)return 'cgOpenInterest';
    const osc2=t.closest('#dvl325_cgLs_gear,#dvl328_cgLs_gear,.dvl325-cg-gear-overlay[data-kind="cgLs"]');
    if(osc2)return 'cgLongShort';
    const id=t.id||'';
    if(id.indexOf('cgOi')>=0&&id.indexOf('gear')>=0)return 'cgOpenInterest';
    if(id.indexOf('cgLs')>=0&&id.indexOf('gear')>=0)return 'cgLongShort';
    return null;
  }
  function bindGearCapture(){
    if(document.documentElement.dataset.dvl330GearCapture==='1')return;
    document.documentElement.dataset.dvl330GearCapture='1';
    ['click','touchend','pointerup'].forEach(evt=>{
      document.addEventListener(evt,function(e){
        const key=keyFromTarget(e.target);
        if(!key)return;
        stop(e);
        if(Date.now()-lastCgOpen>180)openCgModal(key);
      },{capture:true,passive:false});
    });
  }
  function setGlobalLet(name,value){
    try{(0,eval)(name+'='+JSON.stringify(value));return true;}catch(_){ }
    try{eval(name+'='+JSON.stringify(value));return true;}catch(_){ }
    try{window[name]=value;return true;}catch(_){ }
    return false;
  }
  function resetOscillators(){
    try{
      if(window.S){
        S.oscScale=S.oscScale||{};
        S.oscScale.flow={center:0,range:200};
        S.oscScale.trendClarity={center:0,range:200};
        S.oscScale.cgOi={center:0,range:200};
        S.oscScale.cgLs={center:1,range:1.2};
      }
      ['flow','trendClarity','cgOi','cgLs'].forEach(k=>localStorage.removeItem('dvl_osc_scale_'+k));
    }catch(_){ }
    setGlobalLet('_hvnClarityH',166);
    setGlobalLet('_flowAccelH',120);
    try{
      window._hvnClarityH=166;window._flowAccelH=120;window._cgOpenInterestH=112;window._cgLongShortH=104;
      localStorage.setItem('dvl_hvnClarityH','166');
      localStorage.setItem('dvl_flowH','120');
      localStorage.removeItem('dvl_flowAccelH');
      localStorage.setItem('dvl_cgOpenInterestH','112');
      localStorage.setItem('dvl_cgLongShortH','104');
      setOrig('cgOpenInterestHeight','112',true);
      setOrig('cgLongShortHeight','104',true);
    }catch(_){ }
    try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){ }
  }
  function bindFitReset(){
    if(document.documentElement.dataset.dvl330FitReset==='1')return;
    document.documentElement.dataset.dvl330FitReset='1';
    const shouldReset=t=>!!(t&&t.closest&&t.closest('#btnFit,#btnLive,#viewBtnDock #btnFit,#viewBtnDock #btnLive,.scaleDockV19 #btnFit,.scaleDockV19 #btnLive,[title*="Enquadrar"],[title*="Fit"],[aria-label*="Fit"]'));
    ['click','touchend','pointerup'].forEach(evt=>{
      document.addEventListener(evt,function(e){if(shouldReset(e.target))setTimeout(resetOscillators,0);},{capture:true,passive:true});
    });
    try{
      if(typeof window.fitClose==='function'&&!window.fitClose.__dvl330Wrapped){const old=window.fitClose;window.fitClose=function(){const r=old.apply(this,arguments);resetOscillators();return r;};window.fitClose.__dvl330Wrapped=true;}
      if(typeof window.fitAll==='function'&&!window.fitAll.__dvl330Wrapped){const old=window.fitAll;window.fitAll=function(){const r=old.apply(this,arguments);resetOscillators();return r;};window.fitAll.__dvl330Wrapped=true;}
    }catch(_){ }
  }
  function boot(){raf=0;forceVersion();syncOriginalsFromStorage();bindGearCapture();bindFitReset();}
  function schedule(){if(raf)return;raf=requestAnimationFrame(boot);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [80,220,600,1400,3000].forEach(ms=>setTimeout(schedule,ms));
  /* interval removed — bindGearCapture/bindFitReset superseded by 0.334 */
})();


/* ════════════════════════════════════════════════════════════════════════
   V332 — Gear Click Fixed (L39506-39620)
    Correção do click/tap no gear do painel L/S
   ════════════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  const VER='Beta 0.332';
  let lastOpen=0;
  let raf=0;
  const IDS=['cgDataSource','cgApiKey','cgSharedPeriod','cgOiUnit','cgOpenInterestHeight','cgExchange','cgLsMode','cgLsShowAverage','cgLongShortHeight','cgTakerExchanges'];
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function stop(e){try{e.preventDefault();}catch(_){}try{e.stopPropagation();}catch(_){}try{if(e.stopImmediatePropagation)e.stopImmediatePropagation();}catch(_){} }
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function storeKey(id){return 'dvl_cg_setting_'+id;}
  function defaults(id){return ({cgDataSource:'auto',cgApiKey:'',cgSharedPeriod:'auto',cgOiUnit:'usd',cgOpenInterestHeight:'112',cgExchange:'Binance',cgLsMode:'accounts-global',cgLsShowAverage:'on',cgLongShortHeight:'104',cgTakerExchanges:'Binance,OKX,Bybit'})[id]||'';}
  function getVal(id){try{const v=localStorage.getItem(storeKey(id));if(v!==null&&v!==undefined&&v!=='')return v;}catch(_){}const el=q('#'+id);return el&&el.value!==undefined&&el.value!==''?el.value:defaults(id);}
  function setVal(id,v,redraw){
    try{localStorage.setItem(storeKey(id),String(v));}catch(_){}
    let el=q('#'+id);
    if(!el){el=document.createElement('input');el.type='hidden';el.id=id;el.dataset.dvl332Store='1';document.body.appendChild(el);}
    try{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){}
    if(id==='cgOpenInterestHeight'){
      const n=parseInt(v,10); if(Number.isFinite(n)){window._cgOpenInterestH=Math.max(78,Math.min(240,n));try{localStorage.setItem('dvl_cgOpenInterestH',String(window._cgOpenInterestH));}catch(_){}}
    }
    if(id==='cgLongShortHeight'){
      const n=parseInt(v,10); if(Number.isFinite(n)){window._cgLongShortH=Math.max(72,Math.min(230,n));try{localStorage.setItem('dvl_cgLongShortH',String(window._cgLongShortH));}catch(_){}}
    }
    if(redraw!==false){try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){} }
  }
  function forceVersion(){
    try{window.DVL_APP_VERSION=VER;}catch(_){}
    qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(el=>{if(el)el.textContent=(window.DVL_APP_VERSION||VER);});
    try{
      window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];
      const notes=[
        'CoinGlass gear click fixed: settings open instantly with one normal tap/click.',
        'CoinGlass settings modal now uses a direct stable renderer, avoiding older handlers that swallowed the gear event.'
      ];
      notes.forEach(note=>{if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});});
    }catch(_){}
  }
  function select(id,opts){const v=getVal(id);return '<select class="select" data-dvl332-cg="'+id+'">'+opts.map(o=>'<option value="'+esc(o[0])+'" '+(String(o[0])===String(v)?'selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';}
  function input(id,type,ph){return '<input class="input" type="'+type+'" data-dvl332-cg="'+id+'" value="'+esc(getVal(id))+'" placeholder="'+esc(ph||'')+'">';}
  function num(id,min,max){return '<input class="num" type="number" min="'+min+'" max="'+max+'" data-dvl332-cg="'+id+'" value="'+esc(getVal(id))+'">';}
  function row(label,control){return '<div class="dvl332-cg-row"><span class="k">'+label+'</span>'+control+'</div>';}
  function html(key){
    if(key==='cgOpenInterest'){
      return '<div class="dvl332-cg-section">'+
        row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
        row('API Key',input('cgApiKey','password','opcional'))+
        row('Período',select('cgSharedPeriod',[['auto','Auto TF'],['5m','5m'],['15m','15m'],['30m','30m'],['1h','1h'],['4h','4h'],['1d','1D']]))+
        row('Unidade',select('cgOiUnit',[['usd','USD'],['coin','Coin']]))+
        row('Altura',num('cgOpenInterestHeight',78,240))+
        '<div class="dvl332-cg-note">OI agregado via CoinGlass quando houver API key. Sem key, usa fallback público Binance.</div></div>';
    }
    return '<div class="dvl332-cg-section">'+
      row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
      row('Exchange',select('cgExchange',[['Binance','Binance'],['Bybit','Bybit'],['OKX','OKX'],['Bitget','Bitget']]))+
      row('Modo',select('cgLsMode',[['taker','Taker buy/sell'],['accounts-global','Accounts global'],['accounts-top','Top accounts']]))+
      row('Média',select('cgLsShowAverage',[['on','Ligada'],['off','Desligada']]))+
      row('CG Exch.',input('cgTakerExchanges','text','Binance,OKX,Bybit'))+
      row('Altura',num('cgLongShortHeight',72,230))+
      '<div class="dvl332-cg-note">Padrão correto: Taker buy/sell long-short ratio. A média pode ser desligada.</div></div>';
  }
  function openDirect(key){
    const now=Date.now(); if(now-lastOpen<180)return; lastOpen=now;
    IDS.forEach(id=>setVal(id,getVal(id),false));
    const modal=q('#inputModal'), body=q('#inputModalBody'), title=q('#inputModalTitle'), scrim=q('#inputModalScrim');
    if(!modal||!body){
      alert(key==='cgOpenInterest'?'CG Open Interest settings':'CG Taker L/S settings');
      return;
    }
    body.classList.add('dvl332-cg-active');
    body.dataset.dvl330Cg='1';
    body.dataset.dvl332Cg=key;
    body.innerHTML=html(key);
    if(title)title.textContent=(key==='cgOpenInterest'?'CG Open Interest':'CG Taker L/S')+' — INPUTS';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    if(scrim)scrim.classList.add('show');
    qa('[data-dvl332-cg]',body).forEach(el=>{
      const id=el.getAttribute('data-dvl332-cg');
      const mirror=function(){setVal(id,el.value,true);};
      el.addEventListener('input',mirror,{passive:true});
      el.addEventListener('change',mirror,{passive:true});
    });
  }
  function keyFromTarget(t){
    if(!t||!t.closest)return null;
    const g=t.closest('.gear[data-settings="cgOpenInterest"],.gear[data-settings="cgLongShort"]');
    if(g)return g.getAttribute('data-settings');
    if(t.closest('#dvl325_cgOi_gear,#dvl328_cgOi_gear,.dvl325-cg-gear-overlay[data-kind="cgOi"]'))return 'cgOpenInterest';
    if(t.closest('#dvl325_cgLs_gear,#dvl328_cgLs_gear,.dvl325-cg-gear-overlay[data-kind="cgLs"]'))return 'cgLongShort';
    const id=String(t.id||'');
    if(id.includes('cgOi')&&id.toLowerCase().includes('gear'))return 'cgOpenInterest';
    if(id.includes('cgLs')&&id.toLowerCase().includes('gear'))return 'cgLongShort';
    return null;
  }
  function bind(){
    if(document.documentElement.dataset.dvl332WindowGear==='1')return;
    document.documentElement.dataset.dvl332WindowGear='1';
    ['pointerdown','touchstart','mousedown','click'].forEach(evt=>{
      window.addEventListener(evt,function(e){
        const key=keyFromTarget(e.target);
        if(!key)return;
        stop(e);
        openDirect(key);
      },{capture:true,passive:false});
    });
  }
  function boot(){raf=0;forceVersion();bind();}
  function schedule(){if(raf)return;raf=requestAnimationFrame(boot);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [80,220,620,1400,3000].forEach(ms=>setTimeout(schedule,ms));
  /* interval removed — Beta 0.334 gear supersedes 0.332 */
})();


/* ════════════════════════════════════════════════════════════════════════
   V334 — Gear Hard Fix (L57774-57940)
    Hard fix para hit-test do gear control (dvl334CgHooked)
   ════════════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  const VER='Beta 0.351';
  const IDS=['cgDataSource','cgApiKey','cgSharedPeriod','cgOiUnit','cgOpenInterestHeight','cgExchange','cgLsMode','cgLsShowAverage','cgLongShortHeight','cgTakerExchanges'];
  const KINDS={cgOi:'cgOpenInterest',cgLs:'cgLongShort'};
  let raf=0,lastAction=0;
  window.__dvl334CgBoxes=window.__dvl334CgBoxes||{};

  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function stop(e){try{e.preventDefault();}catch(_){}try{e.stopPropagation();}catch(_){}try{e.stopImmediatePropagation&&e.stopImmediatePropagation();}catch(_){} }
  function defaults(id){return ({cgDataSource:'auto',cgApiKey:'',cgSharedPeriod:'auto',cgOiUnit:'usd',cgOpenInterestHeight:'112',cgExchange:'Binance',cgLsMode:'accounts-global',cgLsShowAverage:'on',cgLongShortHeight:'104',cgTakerExchanges:'Binance,OKX,Bybit'})[id]||'';}
  function storageKey(id){return 'dvl_cg_setting_'+id;}
  function existing(id){return qa('#'+id).find(el=>!el.dataset.dvl334Ui)||null;}
  function ensureStore(id){let el=existing(id);if(!el){el=document.createElement('input');el.type='hidden';el.id=id;el.dataset.dvl334Store='1';document.body.appendChild(el);}return el;}
  function getVal(id){try{const v=localStorage.getItem(storageKey(id));if(v!==null&&v!==undefined&&v!=='')return v;}catch(_){}const el=existing(id);if(el&&el.value!==undefined&&el.value!=='')return el.value;return defaults(id);}
  function setVal(id,v,redraw){
    const val=String(v==null?'':v);
    try{localStorage.setItem(storageKey(id),val);}catch(_){}
    const el=ensureStore(id);try{el.value=val;}catch(_){}
    if(id==='cgOpenInterestHeight'){const n=parseInt(val,10);if(Number.isFinite(n)){window._cgOpenInterestH=Math.max(78,Math.min(240,n));try{localStorage.setItem('dvl_cgOpenInterestH',String(window._cgOpenInterestH));}catch(_){}}}
    if(id==='cgLongShortHeight'){const n=parseInt(val,10);if(Number.isFinite(n)){window._cgLongShortH=Math.max(72,Math.min(230,n));try{localStorage.setItem('dvl_cgLongShortH',String(window._cgLongShortH));}catch(_){}}}
    try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){}
    if(redraw!==false){try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){}}
  }
  function forceVersion(){
    try{window.DVL_APP_VERSION=VER;}catch(_){}
    qa('#dvlVersionBadge,.dvl-version-badge,.dvl-version-header,.dvl-version-logo-hidden,.beta-badge,.version-badge').forEach(el=>{if(el)el.textContent=(window.DVL_APP_VERSION||VER);});
    try{window.DVL_CHANGELOG=window.DVL_CHANGELOG||[];[
      'Beta 0.351: Corrigida regressão de resize do 0.350 (schedule indefinido em modulos ativos -> boot debounced). Removido console.count por frame. Interval de 500ms so redesenha quando a vela ao vivo muda (OHLC), nao a cada tick. Cadeia ativa de wrappers auditada: drawSoon=4 (dvl297/298/305/310), draw=7; wrappers em scripts application/disabled (dvl296/304/306/311/312) confirmados mortos. Reducao de CPU e flicker.',
      'Removed all forceVersion() from setIntervals and body-* DOM walker — no more badge flicker or reflow on every tick.'
    ].forEach(note=>{if(!window.DVL_CHANGELOG.some(x=>x&&x.version===VER&&x.note===note))window.DVL_CHANGELOG.unshift({version:VER,date:new Date().toISOString(),note});});}catch(_){}
  }
  function gearSvg(){return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.7"/><path d="M10 2.7v2M10 15.3v2M4.8 4.8l1.45 1.45M13.75 13.75l1.45 1.45M2.7 10h2M15.3 10h2M4.8 15.2l1.45-1.45M13.75 6.25l1.45-1.45"/></svg>';}
  function eyeSvg(on){return on?'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 10s2.5-4.6 7.6-4.6 7.6 4.6 7.6 4.6-2.5 4.6-7.6 4.6S2.4 10 2.4 10z"/><circle cx="10" cy="10" r="2.2" fill="currentColor" opacity=".28"/></svg>':'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l14 14"/><path d="M7.7 5.2A8.3 8.3 0 0 1 10 4.9c5.1 0 7.6 5.1 7.6 5.1a13.2 13.2 0 0 1-2.2 3"/><path d="M12.1 12.4A3 3 0 0 1 7.6 7.9"/><path d="M5.8 7.1A13 13 0 0 0 2.4 10s2.5 5.1 7.6 5.1c1.1 0 2.1-.2 3-.6"/></svg>';}

  function select(id,opts){const v=getVal(id);return '<select data-dvl334-ui="1" data-cg-id="'+id+'">'+opts.map(o=>'<option value="'+esc(o[0])+'" '+(String(o[0])===String(v)?'selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';}
  function input(id,type,ph){return '<input data-dvl334-ui="1" data-cg-id="'+id+'" type="'+type+'" value="'+esc(getVal(id))+'" placeholder="'+esc(ph||'')+'">';}
  function num(id,min,max){return '<input data-dvl334-ui="1" data-cg-id="'+id+'" type="number" min="'+min+'" max="'+max+'" value="'+esc(getVal(id))+'">';}
  function row(label,control){return '<div class="dvl334-cg-row"><span class="k">'+label+'</span>'+control+'</div>';}
  function bodyHtml(key){
    if(key==='cgOpenInterest'){
      return row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
        row('API Key',input('cgApiKey','password','opcional'))+
        row('Período',select('cgSharedPeriod',[['auto','Auto TF'],['5m','5m'],['15m','15m'],['30m','30m'],['1h','1h'],['4h','4h'],['1d','1D']]))+
        row('Unidade',select('cgOiUnit',[['usd','USD'],['coin','Coin']]))+
        row('Altura',num('cgOpenInterestHeight',78,240))+
        '<div class="dvl334-cg-note">Com API key usa CoinGlass aggregated OI. Sem key, usa fallback público Binance.</div>';
    }
    return row('Fonte',select('cgDataSource',[['auto','Auto CG/Binance'],['coinglass','CoinGlass API'],['binance','Binance público']]))+
      row('Exchange',select('cgExchange',[['Binance','Binance'],['Bybit','Bybit'],['OKX','OKX'],['Bitget','Bitget']]))+
      row('Modo',select('cgLsMode',[['taker','Taker buy/sell'],['accounts-global','Accounts global'],['accounts-top','Top accounts']]))+
      row('Média',select('cgLsShowAverage',[['on','Ligada'],['off','Desligada']]))+
      row('CG Exch.',input('cgTakerExchanges','text','Binance,OKX,Bybit'))+
      row('Altura',num('cgLongShortHeight',72,230))+
      '<div class="dvl334-cg-note">Padrão correto: Taker buy/sell long-short ratio. A média pode ser desligada aqui.</div>';
  }
  function ensureModal(){
    let scr=q('#dvl334CgScrim'),mod=q('#dvl334CgModal');
    if(!scr){scr=document.createElement('div');scr.id='dvl334CgScrim';document.body.appendChild(scr);} 
    if(!mod){mod=document.createElement('div');mod.id='dvl334CgModal';mod.innerHTML='<div class="dvl334-cg-head"><div class="dvl334-cg-title" id="dvl334CgTitle"></div><button type="button" class="dvl334-cg-x" id="dvl334CgClose">×</button></div><div class="dvl334-cg-body" id="dvl334CgBody"></div>';document.body.appendChild(mod);} 
    if(!scr.dataset.dvl334Bound){scr.dataset.dvl334Bound='1';['pointerdown','touchstart','mousedown','click'].forEach(ev=>scr.addEventListener(ev,e=>{stop(e);closeModal();},{capture:true,passive:false}));}
    const x=q('#dvl334CgClose');if(x&&!x.dataset.dvl334Bound){x.dataset.dvl334Bound='1';['pointerdown','touchstart','mousedown','click'].forEach(ev=>x.addEventListener(ev,e=>{stop(e);closeModal();},{capture:true,passive:false}));}
    return {scr,mod};
  }
  function openModal(key){
    const now=Date.now();if(now-lastAction<120)return;lastAction=now;
    if(key!=='cgOpenInterest'&&key!=='cgLongShort')return;
    IDS.forEach(id=>setVal(id,getVal(id),false));
    const {scr,mod}=ensureModal();const title=q('#dvl334CgTitle'),body=q('#dvl334CgBody');
    if(title)title.textContent=(key==='cgOpenInterest'?'CG Open Interest':'CG Taker L/S')+' — INPUTS';
    if(body){body.innerHTML=bodyHtml(key);qa('[data-cg-id]',body).forEach(el=>{const id=el.getAttribute('data-cg-id');const fn=()=>setVal(id,el.value,true);el.addEventListener('input',fn,{passive:true});el.addEventListener('change',fn,{passive:true});});}
    scr.classList.add('show');mod.classList.add('show');
  }
  function closeModal(){const scr=q('#dvl334CgScrim'),mod=q('#dvl334CgModal');if(scr)scr.classList.remove('show');if(mod)mod.classList.remove('show');}
  window.DVL_OPEN_CG_MODAL=openModal;

  function bindOneSidebarGear(key){
    const card=q('.ind-card[data-card="'+key+'"]'); if(!card)return;
    let gear=q('.gear[data-settings="'+key+'"]',card)||q('.gear[data-settings="'+key+'"]');
    if(!gear)return;
    if(gear.dataset.dvl334Cg!=='1'){
      const ng=gear.cloneNode(false);
      ng.className=gear.className||'gear';ng.classList.add('gear');ng.type='button';ng.setAttribute('data-settings',key);ng.setAttribute('data-dvl334-cg','1');ng.title=gear.title||'Configurar';ng.innerHTML=gearSvg();
      try{gear.replaceWith(ng);gear=ng;}catch(_){gear=ng;}
    }
    if(!gear.dataset.dvl334Bound){
      gear.dataset.dvl334Bound='1';
      const fn=e=>{stop(e);openModal(key);};
      ['pointerdown','touchstart','mousedown','click'].forEach(ev=>gear.addEventListener(ev,fn,{capture:true,passive:false}));
      gear.onclick=fn; gear.ontouchend=fn; gear.onpointerdown=fn;
    }
  }
  function bindSidebarGears(){bindOneSidebarGear('cgOpenInterest');bindOneSidebarGear('cgLongShort');}

  function chartBtn(id,cls){const wrap=q('#chartWrap');if(!wrap)return null;let b=q('#'+id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.className='dvl334-cg-osc-btn '+cls;b.dataset.dvl334CgBtn='1';wrap.appendChild(b);}return b;}
  function updateChartButtons(){
    const wrap=q('#chartWrap');if(!wrap)return;
    const hits=window._dvlCgOscHit||{};
    [['cgOi','cgOpenInterest'],['cgLs','cgLongShort']].forEach(([k,key])=>{
      const active=!!(window.S&&S.inds&&S.inds[key]&&S.candles&&S.candles.length);
      const h=hits[k];
      const saved=window.__dvl334CgBoxes[k]||{};
      const eyeBox=(h&&h.eye)?Object.assign({},h.eye):saved.eye;
      const gearBox=(h&&h.gear)?Object.assign({},h.gear):saved.gear;
      if(h){ if(h.eye) saved.eye=Object.assign({},h.eye); if(h.gear) saved.gear=Object.assign({},h.gear); window.__dvl334CgBoxes[k]=saved; }
      [['eye',eyeBox],['gear',gearBox]].forEach(([type,box])=>{
        const b=chartBtn('dvl334_'+k+'_'+type,type+(type==='eye'?' on':''));if(!b)return;
        if(!active||!box){b.style.display='none';return;}
        const hidden=!!window['__dvl_'+k+'_hidden'];
        b.dataset.cgKind=k;b.dataset.cgKey=key;b.dataset.cgAction=type;
        b.className='dvl334-cg-osc-btn '+type+(type==='eye'?(hidden?' off':' on'):'');
        b.innerHTML=type==='eye'?eyeSvg(!hidden):gearSvg();
        const cx=(box.x1+box.x2)/2,cy=(box.y1+box.y2)/2;
        b.style.left=Math.round(cx-15)+'px';b.style.top=Math.round(cy-15)+'px';b.style.display='flex';
      });
    });
  }
  function toggleEye(k){window['__dvl_'+k+'_hidden']=!window['__dvl_'+k+'_hidden'];try{localStorage.setItem('dvl_'+k+'_hidden',window['__dvl_'+k+'_hidden']?'1':'');}catch(_){}try{if(typeof window.drawSoon==='function')window.drawSoon();else if(typeof window.draw==='function')window.draw();}catch(_){} }
  function point(e){if(e.touches&&e.touches[0])return{x:e.touches[0].clientX,y:e.touches[0].clientY};if(e.changedTouches&&e.changedTouches[0])return{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};return{x:e.clientX,y:e.clientY};}
  function rectHit(rect,p,pad){pad=pad||0;return rect&&Number.isFinite(p.x)&&p.x>=rect.left-pad&&p.x<=rect.right+pad&&p.y>=rect.top-pad&&p.y<=rect.bottom+pad;}
  function actionFromPoint(e){
    const p=point(e);const t=e.target;
    if(t&&t.closest){
      const b=t.closest('[data-dvl334-cg-btn="1"]');
      if(b)return {action:b.dataset.cgAction,kind:b.dataset.cgKind,key:b.dataset.cgKey};
      const g=t.closest('.gear[data-settings="cgOpenInterest"],.gear[data-settings="cgLongShort"]');
      if(g)return {action:'gear',key:g.getAttribute('data-settings')};
    }
    for(const key of ['cgOpenInterest','cgLongShort']){
      const g=q('.ind-card[data-card="'+key+'"] .gear[data-settings="'+key+'"]')||q('.gear[data-settings="'+key+'"]');
      if(g&&rectHit(g.getBoundingClientRect(),p,6))return {action:'gear',key};
    }
    for(const k of ['cgOi','cgLs']){
      for(const type of ['eye','gear']){
        const b=q('#dvl334_'+k+'_'+type);
        if(b&&b.style.display!=='none'&&rectHit(b.getBoundingClientRect(),p,10))return {action:type,kind:k,key:KINDS[k]};
      }
    }
    return null;
  }
  function bindCapture(){
    if(window.__dvl334CgCaptureBound)return;window.__dvl334CgCaptureBound=true;
    ['pointerdown','touchstart','mousedown','click'].forEach(evt=>{
      window.addEventListener(evt,function(e){
        const a=actionFromPoint(e);if(!a)return;
        stop(e);
        if(a.action==='eye'&&a.kind){toggleEye(a.kind);return;}
        if(a.action==='gear'&&a.key){openModal(a.key);return;}
      },{capture:true,passive:false});
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();},true);
  }
  function hookDraw(){
    const old=window.draw;if(typeof old!=='function'||old.__dvl334CgHooked)return;
    const wrapped=function(){const r=old.apply(this,arguments);try{requestAnimationFrame(updateChartButtons);}catch(_){updateChartButtons();}return r;};
    wrapped.__dvl334CgHooked=true;window.draw=wrapped;
  }
  function boot(){raf=0;forceVersion();ensureModal();IDS.forEach(id=>setVal(id,getVal(id),false));bindSidebarGears();hookDraw();updateChartButtons();bindCapture();}
  function schedule(){if(raf)return;raf=requestAnimationFrame(boot);} 
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [40,100,220,500,1000,1800,3200,5200].forEach(ms=>setTimeout(schedule,ms));
  /* interval removed — updateChartButtons wired to draw hook, bindSidebarGears has guard */
})();