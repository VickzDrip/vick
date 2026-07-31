(function(){
"use strict";
if(window.DVL_WATCHLIST_ASSET_ICONS_0765)return;

// ── Asset Registry ───────────────────────────────────────────────────────────
window.DVL_ASSET_REGISTRY={
  BTCUSDT:{symbol:'BTCUSDT',display:'BTC/USDT',base:'BTC',quote:'USDT',name:'Bitcoin',iconKey:'BTC'},
  ETHUSDT:{symbol:'ETHUSDT',display:'ETH/USDT',base:'ETH',quote:'USDT',name:'Ethereum',iconKey:'ETH'},
  ADAUSDT:{symbol:'ADAUSDT',display:'ADA/USDT',base:'ADA',quote:'USDT',name:'Cardano',iconKey:'ADA'},
  SOLUSDT:{symbol:'SOLUSDT',display:'SOL/USDT',base:'SOL',quote:'USDT',name:'Solana',iconKey:'SOL'},
  BNBUSDT:{symbol:'BNBUSDT',display:'BNB/USDT',base:'BNB',quote:'USDT',name:'BNB',iconKey:'BNB'},
  XRPUSDT:{symbol:'XRPUSDT',display:'XRP/USDT',base:'XRP',quote:'USDT',name:'XRP',iconKey:'XRP'},
  DOGEUSDT:{symbol:'DOGEUSDT',display:'DOGE/USDT',base:'DOGE',quote:'USDT',name:'Dogecoin',iconKey:'DOGE'},
  LTCUSDT:{symbol:'LTCUSDT',display:'LTC/USDT',base:'LTC',quote:'USDT',name:'Litecoin',iconKey:'LTC'},
  AVAXUSDT:{symbol:'AVAXUSDT',display:'AVAX/USDT',base:'AVAX',quote:'USDT',name:'Avalanche',iconKey:'AVAX'},
  LINKUSDT:{symbol:'LINKUSDT',display:'LINK/USDT',base:'LINK',quote:'USDT',name:'Chainlink',iconKey:'LINK'}
};

var _ICON_MAP={
  BTC:{label:'B',className:'dvlLetterBTC',name:'Bitcoin'}, ETH:{label:'E',className:'dvlLetterETH',name:'Ethereum'}, ADA:{label:'A',className:'dvlLetterADA',name:'Cardano'}, SOL:{label:'S',className:'dvlLetterSOL',name:'Solana'}, BNB:{label:'B',className:'dvlLetterBNB',name:'BNB'}, XRP:{label:'X',className:'dvlLetterXRP',name:'XRP'}, DOGE:{label:'D',className:'dvlLetterDOGE',name:'Dogecoin'}, LTC:{label:'L',className:'dvlLetterLTC',name:'Litecoin'}, AVAX:{label:'A',className:'dvlLetterAVAX',name:'Avalanche'}, LINK:{label:'L',className:'dvlLetterLINK',name:'Chainlink'}
};

function _normSym(s){if(!s)return'';return String(s).replace('/','').replace('-','').toUpperCase();}
function _getCurSym(){try{var el=document.getElementById('symbolText');if(el&&el.textContent){return _normSym(el.textContent.trim());}}catch(_){}try{if(typeof window.symbol!=='undefined'&&window.symbol)return _normSym(String(window.symbol));}catch(_){}return'';}

function getAssetIconMeta(symbol){
  symbol=_normSym(symbol);
  var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[symbol];
  var base=asset?asset.base:symbol.replace(/USDT$/i,'');
  return _ICON_MAP[base]||{label:window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(symbol):(base||'?').replace(/^[0-9]+/,'').charAt(0)||'?',className:window.dvlAssetLetterClass?window.dvlAssetLetterClass(symbol):'dvlLetterGeneric',name:base||symbol};
}
window.getAssetIconMeta=getAssetIconMeta;

function renderAssetIcon(symbol){
  var clean=window._normSym?window._normSym(symbol):String(symbol||'').toUpperCase();
  var meta=getAssetIconMeta(clean);
  var letter=(window.dvlAssetFirstLetter?window.dvlAssetFirstLetter(clean):meta.label||'?')||'?';
  var cls=(window.dvlAssetLetterClass?window.dvlAssetLetterClass(clean):meta.className||'dvlLetterGeneric')||'dvlLetterGeneric';
  var name=meta.name||clean;
  return '<span class="assetCoin dvlAssetLetterIcon '+cls+' dvlWLAssetIcon" data-dvl-symbol="'+clean+'" aria-label="'+name+'">'+letter+'</span>';
}
window.renderAssetIcon=renderAssetIcon;

// ── CSS ──────────────────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('DVL_WL_STYLE_0773'))return;
  var s=document.createElement('style');
  s.id='DVL_WL_STYLE_0773';
  s.textContent=
    '.dvlCoinIcon{width:18px;height:18px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:9px;color:#fff;flex:0 0 auto;box-shadow:0 0 8px rgba(16,223,119,.10);}'
    +'.coin-btc,.dvlCoinHdr.coin-btc{background:linear-gradient(180deg,#ffb12b,#f28b00)!important;}'
    +'.coin-eth,.dvlCoinHdr.coin-eth{background:linear-gradient(180deg,#7986ff,#404bca)!important;}'
    +'.coin-ada,.dvlCoinHdr.coin-ada{background:linear-gradient(180deg,#2f7dff,#174eb8)!important;}'
    +'.coin-sol,.dvlCoinHdr.coin-sol{background:linear-gradient(135deg,#14f195,#9945ff)!important;}'
    +'.coin-bnb,.dvlCoinHdr.coin-bnb{background:linear-gradient(180deg,#f3ba2f,#c89312)!important;}'
    +'.coin-xrp,.dvlCoinHdr.coin-xrp{background:linear-gradient(180deg,#6f7d8c,#303846)!important;}'
    +'.coin-doge,.dvlCoinHdr.coin-doge{background:linear-gradient(180deg,#d7b85d,#9a7624)!important;}'
    +'.coin-ltc,.dvlCoinHdr.coin-ltc{background:linear-gradient(180deg,#bdbdbd,#888)!important;}'
    +'.coin-avax,.dvlCoinHdr.coin-avax{background:linear-gradient(180deg,#e84142,#9f1f23)!important;}'
    +'.coin-link,.dvlCoinHdr.coin-link{background:linear-gradient(180deg,#2a5ada,#153c9e)!important;}'
    +'.coin-generic,.dvlCoinHdr.coin-generic{background:linear-gradient(180deg,#10df77,#087b43)!important;}'
    +'.dvlCoinHdr{width:27px!important;height:27px!important;border-radius:50%!important;display:grid!important;place-items:center!important;color:#fff!important;font-size:15px!important;font-weight:900!important;flex:0 0 auto!important;transition:background .25s!important;}'
    +'#assetFavoritesList{display:none!important;}'    // Watchlist panel — mesmo tema do Positions panel
    +'#dvlWatchlistPanel{position:fixed;left:4px;right:4px;bottom:calc(var(--dvl-pos-bottom-h,56px) + 17px + env(safe-area-inset-bottom,0px));z-index:3500;border-radius:24px;border:1px solid rgba(16,223,119,.28);background:radial-gradient(360px 180px at 52% 0%,rgba(16,223,119,.09),transparent 70%),linear-gradient(180deg,rgba(5,14,12,.965),rgba(3,10,8,.985));box-shadow:0 22px 60px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.025);max-height:58vh!important;height:auto;overflow:hidden;display:none;flex-direction:column;}'
    +'#dvlWatchlistPanel.is-open{display:flex!important;}'
    +'.dvlWLGrip{width:54px;height:4px;margin:10px auto 8px;border-radius:999px;background:rgba(165,170,169,.48);flex:0 0 auto;}'
    +'.dvlWLHead{display:flex;align-items:center;padding:0 18px 14px;flex:0 0 auto;}'
    +'.dvlWLTitle{font-size:24px;font-weight:950;letter-spacing:-.02em;color:#f4f6f4;margin:0;flex:1;}'
    +'.dvlWLList{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0;padding:4px 0 16px;}'
    +'.dvlWLEmpty{padding:32px 20px;text-align:center;color:#9aa3b2;}'
    +'.dvlWLEmpty strong{display:block;color:#f4f6f4;font-size:15px;margin-bottom:8px;}'
    +'.dvlWLRow{display:flex;align-items:center;gap:10px;padding:10px 18px;width:100%;text-align:left;border-bottom:1px solid rgba(16,223,119,.07);cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;}'
    +'.dvlWLRow:active{background:rgba(16,223,119,.06);}'
    +'.dvlWLInfo{flex:1;min-width:0;}'
    +'.dvlWLInfo strong{display:block;font-size:14px;color:#f4f6f4;font-weight:700;line-height:1.3;letter-spacing:-.01em;}'
    +'.dvlWLInfo span{font-size:11px;color:rgba(165,210,180,.7);line-height:1;}'
    +'.dvlWLPrice{text-align:right;min-width:70px;}'
    +'.dvlWLPrice strong{display:block;font-size:13px;color:#d7dae3;font-weight:600;line-height:1.3;}'
    +'.dvlWLChange{display:block;font-size:10px;font-weight:600;line-height:1;}'
    +'.dvlWLChange.pos{color:#10df77;}'
    +'.dvlWLChange.neg{color:#e84142;}'
    +'.dvlWLChange.neu{color:rgba(165,210,180,.5);}'
    +'.dvlWLStar{background:none;border:none;color:#ffd055;font-size:18px;cursor:pointer;padding:6px 0 6px 12px;line-height:1;flex:0 0 auto;-webkit-tap-highlight-color:transparent;opacity:.85;}'
    +'.dvlWLStar:active{opacity:1;transform:scale(1.15);}';
  (document.head||document.documentElement).appendChild(s);
})();

// ── Watchlist Store ──────────────────────────────────────────────────────────
window.DVL_WATCHLIST_STORE=window.DVL_WATCHLIST_STORE||{version:'0.765',symbols:[]};

function _wlLoad(){
  try{
    var raw=localStorage.getItem('DVL_WATCHLIST_STORE_V1');
    if(raw){var d=JSON.parse(raw);if(d&&Array.isArray(d.symbols)){window.DVL_WATCHLIST_STORE.symbols=d.symbols.map(_normSym).filter(Boolean);return;}}
    var old=localStorage.getItem('DVL_FAVORITE_SYMBOLS');
    if(old){var _of=JSON.parse(old);if(Array.isArray(_of))window.DVL_WATCHLIST_STORE.symbols=_of.map(_normSym).filter(Boolean);}
  }catch(e){window.DVL_WATCHLIST_STORE.symbols=[];}
}

function _wlSave(){try{localStorage.setItem('DVL_WATCHLIST_STORE_V1',JSON.stringify(window.DVL_WATCHLIST_STORE));}catch(_){}}

function _wlHas(sym){sym=_normSym(sym);return window.DVL_WATCHLIST_STORE.symbols.indexOf(sym)>=0;}
function _wlAdd(sym){sym=_normSym(sym);if(sym&&!_wlHas(sym)){window.DVL_WATCHLIST_STORE.symbols.push(sym);_wlSave();}}
function _wlRemove(sym){sym=_normSym(sym);window.DVL_WATCHLIST_STORE.symbols=window.DVL_WATCHLIST_STORE.symbols.filter(function(s){return s!==sym;});_wlSave();}
function _wlToggle(sym){if(_wlHas(sym))_wlRemove(sym);else _wlAdd(sym);}

window.DVL_WATCHLIST={load:_wlLoad,save:_wlSave,has:_wlHas,add:_wlAdd,remove:_wlRemove,toggle:_wlToggle,isInWatchlist:_wlHas,addToWatchlist:_wlAdd,removeFromWatchlist:_wlRemove,toggleWatchlist:_wlToggle};
window.isInWatchlist=_wlHas;
window.addToWatchlist=_wlAdd;
window.removeFromWatchlist=_wlRemove;
window.toggleWatchlist=_wlToggle;
window.saveWatchlist=_wlSave;
window.loadWatchlist=_wlLoad;

// ── Watchlist Panel ──────────────────────────────────────────────────────────
function _ensureWLPanel(){
  var p=document.getElementById('dvlWatchlistPanel');
  if(p)return p;
  p=document.createElement('section');
  p.id='dvlWatchlistPanel';
  p.setAttribute('aria-label','Watchlist');
  p.setAttribute('data-dvl-ui','true');
  document.body.appendChild(p);
  return p;
}

function _fmtWLPrice(sym){
  sym=_normSym(sym);

  var fut=window.DVL_ASSET_TICKER_MAP&&window.DVL_ASSET_TICKER_MAP[sym];
  if(fut&&Number(fut.lastPrice)>0){
    var fp=Number(fut.lastPrice);
    return fp.toLocaleString('en-US',{minimumFractionDigits:fp>=1000?2:3,maximumFractionDigits:fp>=1000?2:6});
  }

  var st=window.DVL_24H_STATS&&window.DVL_24H_STATS[sym];
  if(st&&Number.isFinite(st.price)&&st.price>0){
    var p=st.price;
    return p.toLocaleString('en-US',{minimumFractionDigits:p>=1000?2:3,maximumFractionDigits:p>=1000?2:6});
  }

  var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
  if(lp&&Number.isFinite(lp.price)&&lp.price>0){
    var p2=lp.price;
    return p2.toLocaleString('en-US',{minimumFractionDigits:p2>=1000?2:3,maximumFractionDigits:p2>=1000?2:6});
  }

  try{
    var cur=_getCurSym();
    if(sym===cur&&window.ticker&&Number(window.ticker.lastPrice)>0){
      var cp=Number(window.ticker.lastPrice);
      return cp.toLocaleString('en-US',{minimumFractionDigits:cp>=1000?2:3,maximumFractionDigits:cp>=1000?2:6});
    }
  }catch(_){}

  return '--';
}


window.DVL_24H_STATS=window.DVL_24H_STATS||{};

function _fmtWLChange(sym){
  sym=_normSym(sym);

  var fut=window.DVL_ASSET_TICKER_MAP&&window.DVL_ASSET_TICKER_MAP[sym];
  if(fut&&fut.priceChangePercent!=null){
    var fc=Number(fut.priceChangePercent);
    if(Number.isFinite(fc)){
      var fs=fc>=0?'+':'';
      return{text:fs+fc.toFixed(2)+'%',cls:fc>0?'pos':fc<0?'neg':'neu'};
    }
  }

  var st=window.DVL_24H_STATS&&window.DVL_24H_STATS[sym];
  if(st&&Number.isFinite(st.change)){
    var c=st.change;
    var sign=c>=0?'+':'';
    return{text:sign+c.toFixed(2)+'%',cls:c>0?'pos':c<0?'neg':'neu'};
  }

  try{
    var cur=_getCurSym();
    if(sym===cur&&window.ticker&&window.ticker.priceChangePercent!=null){
      var c2=Number(window.ticker.priceChangePercent);
      if(Number.isFinite(c2)){
        var s2=c2>=0?'+':'';
        return{text:s2+c2.toFixed(2)+'%',cls:c2>0?'pos':c2<0?'neg':'neu'};
      }
    }
  }catch(_){}

  return{text:'--',cls:'neu'};
}


function _fetchWLStats(){
  var syms=window.DVL_WATCHLIST_STORE&&window.DVL_WATCHLIST_STORE.symbols||[];
  syms=syms.map(_normSym).filter(Boolean);
  if(!syms.length)return;

  try{
    var reqs=syms.map(function(s){
      return fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol='+encodeURIComponent(s),{cache:'no-store'})
        .then(function(r){return r.ok?r.json():null;})
        .catch(function(){return null;});
    });

    Promise.all(reqs).then(function(data){
      window.DVL_24H_STATS=window.DVL_24H_STATS||{};
      window.DVL_LAST_PRICE_BY_SYMBOL=window.DVL_LAST_PRICE_BY_SYMBOL||{};
      window.DVL_ASSET_TICKER_MAP=window.DVL_ASSET_TICKER_MAP||{};

      data.forEach(function(t){
        if(!t||!t.symbol)return;
        var sym=_normSym(t.symbol);
        var price=parseFloat(t.lastPrice);
        var change=parseFloat(t.priceChangePercent);

        if(Number.isFinite(price)&&price>0){
          window.DVL_LAST_PRICE_BY_SYMBOL[sym]={price:price,time:Date.now()};
        }
        if(Number.isFinite(price)||Number.isFinite(change)){
          window.DVL_24H_STATS[sym]={
            price:Number.isFinite(price)?price:0,
            change:Number.isFinite(change)?change:0
          };
        }

        window.DVL_ASSET_TICKER_MAP[sym]=t;
      });

      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open')){if(typeof updateWatchlistPanelInPlace==='function'&&!updateWatchlistPanelInPlace())renderWatchlistPanel();}
    }).catch(function(){});
  }catch(_){}
}


function updateWatchlistPanelInPlace(){
  var panel=document.getElementById('dvlWatchlistPanel');
  if(!panel||!panel.classList.contains('is-open'))return false;

  var rows=panel.querySelectorAll('.dvlWLRow[data-wl-pick]');
  var syms=window.DVL_WATCHLIST_STORE&&window.DVL_WATCHLIST_STORE.symbols||[];

  if(!rows.length||rows.length!==syms.length)return false;

  for(var i=0;i<rows.length;i++){
    var row=rows[i];
    var s=_normSym(row.getAttribute('data-wl-pick'));
    if(!s)continue;

    var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[s];
    var disp=asset?asset.display:s.replace(/USDT$/,'/USDT');
    var name=asset?asset.name:s.replace(/USDT$/,'');

    var info=row.querySelector('.dvlWLInfo');
    if(info){
      var strong=info.querySelector('strong');
      var small=info.querySelector('span');
      if(strong)strong.textContent=disp;
      if(small)small.textContent=name;
    }

    var icon=row.querySelector('.dvlCoinIcon,.dvlAssetLetterIcon');
    if(icon&&window.dvlPaintAssetLetterIcon){
      try{window.dvlPaintAssetLetterIcon(icon,s);}catch(_){}
    }

    var price=_fmtWLPrice(s);
    var chg=_fmtWLChange(s);

    var priceEl=row.querySelector('.dvlWLPrice strong');
    if(priceEl)priceEl.textContent=price;

    var chgEl=row.querySelector('.dvlWLChange');
    if(chgEl){
      chgEl.className='dvlWLChange '+(chg.cls||'neu');
      chgEl.textContent=chg.text||'--';
    }

    var star=row.querySelector('[data-wl-remove]');
    if(star){
      star.setAttribute('data-wl-remove',s);
      star.setAttribute('aria-label','Remover '+disp);
    }
  }

  return true;
}
window.updateWatchlistPanelInPlace=updateWatchlistPanelInPlace;

function renderWatchlistPanel(){
  var panel=_ensureWLPanel();
  var wasOpen=panel.classList.contains('is-open');
  var oldList=panel.querySelector('.dvlWLList');
  var keepTop=oldList?oldList.scrollTop:0;

  var syms=window.DVL_WATCHLIST_STORE.symbols||[];
  var rows='';
  for(var i=0;i<syms.length;i++){
    var s=syms[i];
    var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[s];
    var disp=asset?asset.display:s.replace(/USDT$/,'\/USDT');
    var name=asset?asset.name:s.replace(/USDT$/,'');
    var icon=renderAssetIcon(s);
    var price=_fmtWLPrice(s);
    var chg=_fmtWLChange(s);
    var chgHtml='<span class="dvlWLChange '+chg.cls+'">'+(chg.text||'--')+'</span>';
    rows+='<div class="dvlWLRow" data-wl-pick="'+s+'" role="button" tabindex="0" aria-label="'+disp+'">'+
      icon+
      '<div class="dvlWLInfo"><strong>'+disp+'</strong><span>'+name+'</span></div>'+
      '<div class="dvlWLPrice"><strong>'+price+'</strong>'+chgHtml+'</div>'+
      '<button class="dvlWLStar" type="button" data-wl-remove="'+s+'" aria-label="Remover '+disp+'">\u2605</button>'+
    '</div>';
  }

  panel.innerHTML=
    '<div class="dvlWLGrip"></div>'+
    '<div class="dvlWLHead"><h2 class="dvlWLTitle">Watchlist</h2></div>'+
    '<div class="dvlWLList">'+(syms.length?rows:'<div class="dvlWLEmpty"><strong>Nenhum ativo salvo</strong><span>Toque \u2605 no ativo do dropdown para adicionar.</span></div>')+'</div>';

  if(wasOpen&&keepTop>0){
    var restore=function(){
      var list=panel.querySelector('.dvlWLList');
      if(!list)return;
      var max=Math.max(0,list.scrollHeight-list.clientHeight);
      list.scrollTop=Math.min(keepTop,max);
    };
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore,60);
    setTimeout(restore,180);
  }
}

window.renderWatchlistPanel=renderWatchlistPanel;

function openWatchlistPanel(){
  try{
    if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780 && typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close === "function"){
      window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close();
    }
  }catch(_){}
  renderWatchlistPanel();
  _ensureWLPanel().classList.add('is-open');
  try{_fetchWLStats(); setTimeout(_fetchWLStats,600);}catch(_){}
  var btn=document.querySelector('[data-dvl-nav-key="watchlist"]');
  if(btn){btn.classList.add('is-active');btn.setAttribute('aria-pressed','true');}
  try{ window.dispatchEvent(new CustomEvent("dvl:watchlist-state-change",{detail:{open:true,source:"openWatchlistPanel"}})); }catch(_){}
}

function closeWatchlistPanel(){
  var p=document.getElementById('dvlWatchlistPanel');
  if(p)p.classList.remove('is-open');
  var btn=document.querySelector('[data-dvl-nav-key="watchlist"]');
  if(btn){btn.classList.remove('is-active');btn.setAttribute('aria-pressed','false');}
  try{ window.dispatchEvent(new CustomEvent("dvl:watchlist-state-change",{detail:{open:false,source:"closeWatchlistPanel"}})); }catch(_){}
}
window.openWatchlistPanel=openWatchlistPanel;
window.closeWatchlistPanel=closeWatchlistPanel;

// ── Update header coin icon ──────────────────────────────────────────────────
function updateHeaderIconAndStar(){
  var sym=_getCurSym();
  if(!sym)return;
  var coinEl=document.querySelector('.btc');
  if(coinEl){
    var meta=getAssetIconMeta(sym);
    coinEl.textContent=meta.label;
    coinEl.className='btc dvlCoinHdr '+meta.className;
  }
  updateHeaderFavoriteStarState();
  updatePhase1BHeaderFavoriteStarState();
}
window.updateHeaderIconAndStar=updateHeaderIconAndStar;


// ── Beta 0.779 — Phase 1B Header Favorite Star Fix ───────────────────────────
var _DVL_STAR_PATH='M12 3.7l2.5 5.1 5.6.8-4 3.9.95 5.5L12 16.4 7.05 19l.95-5.5-4-3.9 5.5-.8L12 3.7z';
var _DVL_STAR_COLOR='#ffd321';
function forcePhase1BHeaderStarVisual(active){
  var btn=document.getElementById('dvl1b_favBtn');
  if(!btn)return;
  active=!!active;
  // Early-exit guard: prevent MutationObserver loop
  var svg=btn.querySelector('svg');
  var path=svg&&svg.querySelector('path');
  if(btn.classList.contains('is-favorite')===active&&svg&&path)return;
  btn.classList.toggle('is-favorite',active);
  btn.classList.toggle('is-fav',active);
  btn.classList.toggle('is-active',active);
  btn.dataset.favorite=active?'true':'false';
  btn.setAttribute('aria-pressed',active?'true':'false');
  btn.setAttribute('aria-label',active?'Remover dos favoritos':'Adicionar aos favoritos');
  var fillColor=active?_DVL_STAR_COLOR:'none';
  if(svg&&path){
    // Update attributes only (no childList mutation → no MutationObserver loop)
    svg.setAttribute('fill',fillColor);
    path.setAttribute('fill',fillColor);
  } else {
    // SVG missing (first run or after Phase 1B re-render) — inject once
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="'+fillColor+'" stroke="'+_DVL_STAR_COLOR+'" stroke-width="1.8" stroke-linejoin="round"><path d="'+_DVL_STAR_PATH+'" fill="'+fillColor+'" stroke="'+_DVL_STAR_COLOR+'"/></svg>';
  }
}
window.forcePhase1BHeaderStarVisual=forcePhase1BHeaderStarVisual;

function getPhase1BCurrentSymbol(){
  var el=document.getElementById('dvl1b_symbolText')||document.getElementById('symbolText');
  var txt=el?el.textContent:'';
  return _normSym(String(txt).trim())||_getCurSym();
}
window.getPhase1BCurrentSymbol=getPhase1BCurrentSymbol;

function updatePhase1BHeaderFavoriteStarState(){
  var sym=getPhase1BCurrentSymbol();
  forcePhase1BHeaderStarVisual(sym&&_wlHas(sym));
}
window.updatePhase1BHeaderFavoriteStarState=updatePhase1BHeaderFavoriteStarState;

function bindPhase1BHeaderFavoriteStar(){
  var btn=document.getElementById('dvl1b_favBtn');
  if(!btn||btn.__dvlPhase1BStarBound)return;
  btn.__dvlPhase1BStarBound=true;
  btn.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    var sym=getPhase1BCurrentSymbol();
    if(!sym)return;
    _wlToggle(sym);
    updatePhase1BHeaderFavoriteStarState();
    if(typeof renderWatchlistPanel==='function'){
      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open'))renderWatchlistPanel();
    }
  },true); // capture — intercepta antes do handler antigo toggleAssetFavorites (bubble)
}
window.bindPhase1BHeaderFavoriteStar=bindPhase1BHeaderFavoriteStar;

function installPhase1BHeaderStarGuard(){
  if(window.__dvlPhase1BHeaderStarGuardInstalled)return;
  window.__dvlPhase1BHeaderStarGuardInstalled=true;
  if(typeof MutationObserver==='undefined')return;
  var target=document.getElementById('DVL_UI_OVERLAY_PHASE_1B')||document.body;
  new MutationObserver(function(){
    var btn=document.getElementById('dvl1b_favBtn');
    if(btn&&!btn.__dvlPhase1BStarBound){
      btn.__dvlPhase1BStarBound=false;
      bindPhase1BHeaderFavoriteStar();
    }
    updatePhase1BHeaderFavoriteStarState();
  }).observe(target,{childList:true,subtree:true});
}
window.installPhase1BHeaderStarGuard=installPhase1BHeaderStarGuard;

// ── Beta 0.778 — Header Star Owner Fix ───────────────────────────────────────
function forceHeaderStarVisual(active){
  var btn=document.getElementById('dvlHeaderStar');
  if(!btn)return;
  btn.classList.add('dvlHeaderStarTextOnly');
  btn.classList.toggle('is-favorite',!!active);
  btn.classList.toggle('is-active',!!active);
  btn.dataset.favorite=active?'true':'false';
  btn.setAttribute('aria-pressed',active?'true':'false');
  btn.setAttribute('aria-label',active?'Remover dos favoritos':'Adicionar aos favoritos');
  btn.innerHTML=active?'★':'☆';
}
window.forceHeaderStarVisual=forceHeaderStarVisual;

function updateHeaderFavoriteStarState(){
  var sym=_getCurSym();
  // Use IIFE's #currentFavoriteBtn as primary truth (mirrors IIFE's isFavoriteSymbol)
  var cfb=document.getElementById('currentFavoriteBtn');
  var iifeFav=cfb&&cfb.classList.contains('is-favorite');
  // Fallback to watchlist store
  var wlFav=sym&&_wlHas(sym);
  forceHeaderStarVisual(!!(iifeFav||wlFav));
}
window.updateHeaderFavoriteStarState=updateHeaderFavoriteStarState;
window.updateHeaderStarState=updateHeaderFavoriteStarState;

function bindHeaderFavoriteStarTextOnly(){
  var btn=document.getElementById('dvlHeaderStar');
  if(!btn||btn.__dvlHeaderStarTextOnlyBound)return;
  btn.__dvlHeaderStarTextOnlyBound=true;
  btn.addEventListener('click',function(ev){
    ev.preventDefault();
    ev.stopPropagation();
    var sym=_getCurSym();
    if(!sym)return;
    // Click the [data-star-symbol] button in assetDropdown:
    // — triggers IIFE's toggleFavoriteSymbol (in-memory + localStorage)
    // — triggers our capture listener which calls _wlToggle
    var dropStar=document.querySelector('[data-star-symbol="'+sym+'"]');
    if(dropStar){
      dropStar.click();
    } else {
      // Fallback: update only watchlist store
      _wlToggle(sym);
    }
    // Update visual immediately (state already updated synchronously above)
    forceHeaderStarVisual(_wlHas(sym));
    if(typeof renderWatchlistPanel==='function'){
      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open'))renderWatchlistPanel();
    }
  },true);
}
window.bindHeaderFavoriteStarTextOnly=bindHeaderFavoriteStarTextOnly;
window.bindHeaderFavoriteStar=bindHeaderFavoriteStarTextOnly;

function installHeaderStarMutationGuard(){
  if(window.__dvlHeaderStarGuardInstalled)return;
  window.__dvlHeaderStarGuardInstalled=true;
  if(typeof MutationObserver==='undefined')return;
  // Watch #currentFavoriteBtn — when IIFE toggles is-favorite, mirror to #dvlHeaderStar
  var cfb=document.getElementById('currentFavoriteBtn');
  if(cfb){
    new MutationObserver(function(){
      updateHeaderFavoriteStarState();
    }).observe(cfb,{attributes:true,attributeFilter:['class','aria-pressed']});
  }
  // Watch .marketRow — if something removes/recreates #dvlHeaderStar, re-patch
  var mr=document.querySelector('.marketRow');
  if(mr){
    new MutationObserver(function(){
      var btn=document.getElementById('dvlHeaderStar');
      if(!btn||!btn.__dvlHeaderStarTextOnlyBound){
        // Button was recreated or binding lost — re-patch
        if(btn)btn.__dvlHeaderStarTextOnlyBound=false;
        bindHeaderFavoriteStarTextOnly();
        updateHeaderFavoriteStarState();
      }
    }).observe(mr,{childList:true,subtree:true});
  }
}
window.installHeaderStarMutationGuard=installHeaderStarMutationGuard;

// ── Wire events ──────────────────────────────────────────────────────────────
(function(){

  // Panel click delegation (row pick + remove star + outside click)
  document.addEventListener('click',function(ev){
    var panel=document.getElementById('dvlWatchlistPanel');
    if(!panel||!panel.classList.contains('is-open'))return;
    // Remove star button (check before pick since it's nested inside the row)
    var remBtn=ev.target.closest?ev.target.closest('[data-wl-remove]'):null;
    if(remBtn){
      ev.stopPropagation();
      var rsym=remBtn.getAttribute('data-wl-remove');
      if(rsym){_wlRemove(rsym);renderWatchlistPanel();updateHeaderIconAndStar();updatePhase1BHeaderFavoriteStarState();}
      return;
    }
    // Pick row → switch chart symbol
    var pickRow=ev.target.closest?ev.target.closest('[data-wl-pick]'):null;
    if(pickRow){
      var sym=pickRow.getAttribute('data-wl-pick');
      if(sym){try{if(typeof selectSymbol==='function')selectSymbol(sym);}catch(_){}closeWatchlistPanel();}
      return;
    }
    // Outside click (not inside panel, not inside footer nav)
    var inP=ev.target.closest?ev.target.closest('#dvlWatchlistPanel'):null;
    var inN=ev.target.closest?ev.target.closest('#dvlBottomNavV2'):null;
    if(!inP&&!inN)closeWatchlistPanel();
  },false);

  // Footer Watchlist button — intercept in capture to open our panel
  function _wireNavWatchlist(){
    var nav=document.getElementById('dvlBottomNavV2');
    if(!nav||nav.dataset.wlNavBound)return;
    nav.dataset.wlNavBound='1';
    nav.addEventListener('click',function(ev){
      var btn=ev.target.closest?ev.target.closest('[data-dvl-nav-key="watchlist"]'):null;
      if(!btn)return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      // Close scanner/trade/positions before Watchlist opens.
      try{if(window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780&&typeof window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close==='function')window.DVL_MEXC_VOLUME_SPIKE_SCANNER_0780.close();}catch(_){}
      try{var dr=document.querySelector('.tradeDrawer');var oldT=document.getElementById('tradeNavBtn');if(dr&&dr.classList.contains('is-open')&&oldT)oldT.click();}catch(_){}
      try{if(window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722)window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722.close();}catch(_){}
      // Deactivate other nav buttons
      var allBtns=document.querySelectorAll('.dvlNavV2Btn');
      for(var _i=0;_i<allBtns.length;_i++)allBtns[_i].classList.remove('is-active');
      // Toggle watchlist
      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open'))closeWatchlistPanel();
      else openWatchlistPanel();
    },true);
  }

  function _init(){
    _wlLoad();
    bindHeaderFavoriteStarTextOnly();
    updateHeaderFavoriteStarState();
    installHeaderStarMutationGuard();
    _wireNavWatchlist();
    updateHeaderIconAndStar();
    bindPhase1BHeaderFavoriteStar();
    updatePhase1BHeaderFavoriteStarState();
    installPhase1BHeaderStarGuard();
    // Retry for late-rendered elements
    setTimeout(function(){
      _wireNavWatchlist();
      bindHeaderFavoriteStarTextOnly();
      updateHeaderFavoriteStarState();
      updateHeaderIconAndStar();
      bindPhase1BHeaderFavoriteStar();
      updatePhase1BHeaderFavoriteStarState();
    },600);
    setTimeout(function(){
      _wireNavWatchlist();
      bindHeaderFavoriteStarTextOnly();
      updateHeaderFavoriteStarState();
      updateHeaderIconAndStar();
      bindPhase1BHeaderFavoriteStar();
      updatePhase1BHeaderFavoriteStarState();
    },2000);
    // Beta 1.208 — 24h stats timer exists only while Watchlist is open.
    var wlStatsTimer1208=0;
    function watchlistOpen1208(){
      var p=document.getElementById('dvlWatchlistPanel');
      return !document.hidden&&!!(p&&p.classList.contains('is-open'));
    }
    function syncWatchlistStats1208(){
      if(watchlistOpen1208()){
        _fetchWLStats();
        if(!wlStatsTimer1208) wlStatsTimer1208=setInterval(function(){if(watchlistOpen1208())_fetchWLStats();},15000);
      }else if(wlStatsTimer1208){
        clearInterval(wlStatsTimer1208); wlStatsTimer1208=0;
      }
    }
    window.addEventListener('dvl:watchlist-state-change',syncWatchlistStats1208,true);
    document.addEventListener('visibilitychange',syncWatchlistStats1208,true);
    setTimeout(syncWatchlistStats1208,1200);
    // Update chrome/panel only after state changes; no permanent 2s DOM sweep.
    function syncWatchlistUi1203(){
      try{
        updateHeaderFavoriteStarState();
        updateHeaderIconAndStar();
        updatePhase1BHeaderFavoriteStarState();
        var p=document.getElementById('dvlWatchlistPanel');
        if(p&&p.classList.contains('is-open')){
          if(typeof updateWatchlistPanelInPlace==='function'&&!updateWatchlistPanelInPlace())renderWatchlistPanel();
        }
      }catch(_){}
    }
    window.addEventListener('dvl:watchlist-state-change',syncWatchlistUi1203,true);
    window.addEventListener('dvl-safe-asset-selected-0804',syncWatchlistUi1203,true);
    window.addEventListener('focus',syncWatchlistUi1203);
  }

  // ── Bridge: dropdown/favorites star → Watchlist ──────────────────────────
  // Capture phase fires before existing listeners' ev.stopPropagation()
  // We call _wlToggle; the existing bubble handler still calls toggleFavoriteSymbol
  // keeping both systems in sync so dropdown star icons (.is-favorite) stay correct.
  document.addEventListener('click',function(ev){
    if(!ev.target)return;
    var star=ev.target.closest?ev.target.closest('[data-star-symbol]'):null;
    if(!star)return;
    var sym=_normSym(star.getAttribute('data-star-symbol'));
    if(!sym)return;
    // Toggle Watchlist (don't stopPropagation — let existing toggleFavoriteSymbol also run)
    _wlToggle(sym);
    // Schedule header star update after IIFE's refreshAssetUi() runs synchronously
    setTimeout(function(){updateHeaderFavoriteStarState();updatePhase1BHeaderFavoriteStarState();},30);
    setTimeout(function(){
      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open'))renderWatchlistPanel();
    },60);
  },true); // true = capture

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_init,{once:true});
  else _init();

})();

window.DVL_WATCHLIST_ASSET_ICONS_0765={
  getAssetIconMeta:getAssetIconMeta,
  renderAssetIcon:renderAssetIcon,
  open:openWatchlistPanel,
  close:closeWatchlistPanel,
  render:renderWatchlistPanel,
  updateIcon:updateHeaderIconAndStar,
  store:window.DVL_WATCHLIST_STORE,
  wl:window.DVL_WATCHLIST
};
})();
