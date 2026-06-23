#!/usr/bin/env python3
"""patch_765.py — Beta 0.765: Watchlist + Asset Icons Fix."""
import sys

PATH = "DepthVisionLab-v106_REAL_UI/public/index.html"

def rep(html, old, new, label, expect=1):
    count = html.count(old)
    if count != expect:
        print(f"ABORT [{label}] — expected {expect} occ, got {count}")
        sys.exit(1)
    html = html.replace(old, new, expect)
    print(f"  OK: {label}")
    return html

with open(PATH, encoding="utf-8") as f:
    html = f.read()

print("=== patch_765.py — Beta 0.765 ===")

# ── 1. Version bumps ────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.764</title>',
    '<title>DVL Binance Live — Beta 0.765</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.764";',
    'const DVL_APP_VERSION = "Beta 0.765";', "version const")

html = rep(html,
    '>BETA 0.764</span>',
    '>BETA 0.765</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.764 — Demo wallet and realtime execution: Paper TP/SL and pending orders now execute in real time across symbols without opening the asset, Demo balance uses margin like real trading, Tax was renamed to Fee, and entry/exit fees now affect PnL, equity and trade history." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.765 — Watchlist and asset icons: the header star now adds/removes the current asset from a persistent Watchlist, the footer Watchlist button opens a real favorites panel, and asset icons now update per symbol instead of showing the BTC icon for every pair." },\n  { version: "Beta 0.764", note: "Beta 0.764 — Demo wallet and realtime execution: Paper TP/SL and pending orders now execute in real time across symbols without opening the asset, Demo balance uses margin like real trading, Tax was renamed to Fee, and entry/exit fees now affect PnL, equity and trade history." },',
    "changelog")

# ── 2. Audit bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0764_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0765_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.764"',
    'window.DVL_APP_VERSION==="Beta 0.765"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.764' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.765' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.764")===-1) blockers.push("A2: title missing 0.764")',
    'indexOf("0.765")===-1) blockers.push("A2: title missing 0.765")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0764_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0765_AUDIT_MODULE";', "audit name bump")

# ── 3. Insert Watchlist + Asset Icons module before </body></html> ───────────
WATCHLIST_MODULE = '''
<script id="DVL_WATCHLIST_ASSET_ICONS_MODULE_0765">
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
  BTC:{label:'\\u20BF',className:'coin-btc',name:'Bitcoin'},
  ETH:{label:'\\u25C6',className:'coin-eth',name:'Ethereum'},
  ADA:{label:'A',className:'coin-ada',name:'Cardano'},
  SOL:{label:'S',className:'coin-sol',name:'Solana'},
  BNB:{label:'B',className:'coin-bnb',name:'BNB'},
  XRP:{label:'X',className:'coin-xrp',name:'XRP'},
  DOGE:{label:'D',className:'coin-doge',name:'Dogecoin'},
  LTC:{label:'\\u0141',className:'coin-ltc',name:'Litecoin'},
  AVAX:{label:'A',className:'coin-avax',name:'Avalanche'},
  LINK:{label:'L',className:'coin-link',name:'Chainlink'}
};

function _normSym(s){if(!s)return'';return String(s).replace('/','').replace('-','').toUpperCase();}

function getAssetIconMeta(symbol){
  symbol=_normSym(symbol);
  var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[symbol];
  var base=asset?asset.base:symbol.replace(/USDT$/i,'');
  return _ICON_MAP[base]||{label:(base||'?').slice(0,2),className:'coin-generic',name:base||symbol};
}
window.getAssetIconMeta=getAssetIconMeta;

function renderAssetIcon(symbol){
  var meta=getAssetIconMeta(symbol);
  return '<span class="dvlCoinIcon '+meta.className+'" aria-label="'+meta.name+'">'+meta.label+'</span>';
}
window.renderAssetIcon=renderAssetIcon;

// ── CSS ──────────────────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('DVL_WL_STYLE_0765'))return;
  var s=document.createElement('style');
  s.id='DVL_WL_STYLE_0765';
  s.textContent=
    '.dvlCoinIcon{width:26px;height:26px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#fff;flex:0 0 auto;box-shadow:0 0 16px rgba(16,223,119,.12);}'
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
    // Header star active (watchlist)
    +'#currentFavoriteBtn.is-wl-active svg{fill:#ffd055!important;stroke:#ffd055!important;}'
    +'#currentFavoriteBtn.is-wl-active{opacity:1!important;}'
    // Watchlist panel
    +'#dvlWatchlistPanel{position:fixed;bottom:0;left:0;right:0;background:#161a1f;border-radius:20px 20px 0 0;z-index:3500;max-height:72vh;overflow:hidden;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);}'
    +'#dvlWatchlistPanel.is-open{transform:translateY(0);}'
    +'.dvlWLHead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto;}'
    +'.dvlWLTitle{font-size:16px;font-weight:700;color:#fff;}'
    +'.dvlWLClose{background:none;border:none;color:#9aa3b2;font-size:24px;cursor:pointer;padding:0 4px;line-height:1;-webkit-tap-highlight-color:transparent;}'
    +'.dvlWLList{flex:1;overflow-y:auto;padding:4px 0 max(env(safe-area-inset-bottom,12px),12px);}'
    +'.dvlWLEmpty{padding:40px 20px;text-align:center;color:#9aa3b2;}'
    +'.dvlWLEmpty strong{display:block;color:#fff;font-size:15px;margin-bottom:8px;}'
    +'.dvlWLRow{display:flex;align-items:center;gap:12px;padding:13px 20px;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent;}'
    +'.dvlWLRow:active{background:rgba(255,255,255,.05);}'
    +'.dvlWLInfo{flex:1;min-width:0;}'
    +'.dvlWLInfo strong{display:block;font-size:14px;color:#fff;font-weight:600;}'
    +'.dvlWLInfo span{font-size:11px;color:#9aa3b2;}'
    +'.dvlWLPrice{text-align:right;padding-right:4px;}'
    +'.dvlWLPrice strong{display:block;font-size:13px;color:#d7dae3;font-weight:500;}'
    +'.dvlWLRemove{background:none;border:none;color:#555e6e;font-size:22px;cursor:pointer;padding:4px 0 4px 10px;line-height:1;flex:0 0 auto;-webkit-tap-highlight-color:transparent;}'
    +'.dvlWLRemove:active{color:#e84142;}';
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
  var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
  if(lp&&Number.isFinite(lp.price)&&lp.price>0){
    var p=lp.price;
    return p.toLocaleString('en-US',{minimumFractionDigits:p>=1000?2:3,maximumFractionDigits:p>=1000?2:6});
  }
  try{var cur=_normSym(typeof window.symbol!=='undefined'?String(window.symbol):'');if(sym===cur&&window.ticker&&Number(window.ticker.lastPrice)>0)return Number(window.ticker.lastPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});}catch(_){}
  return '--';
}

function renderWatchlistPanel(){
  var panel=_ensureWLPanel();
  var syms=window.DVL_WATCHLIST_STORE.symbols||[];
  var rows='';
  for(var i=0;i<syms.length;i++){
    var s=syms[i];
    var asset=window.DVL_ASSET_REGISTRY&&window.DVL_ASSET_REGISTRY[s];
    var disp=asset?asset.display:s.replace(/USDT$/,'\/USDT');
    var name=asset?asset.name:s.replace(/USDT$/,'');
    var icon=renderAssetIcon(s);
    var price=_fmtWLPrice(s);
    rows+='<button class="dvlWLRow" type="button" data-wl-pick="'+s+'" aria-label="'+disp+'">'+
      icon+
      '<div class="dvlWLInfo"><strong>'+disp+'</strong><span>'+name+'</span></div>'+
      '<div class="dvlWLPrice"><strong>'+price+'</strong></div>'+
      '<button class="dvlWLRemove" type="button" data-wl-remove="'+s+'" aria-label="Remover '+disp+'">\\u00d7</button>'+
    '</button>';
  }
  panel.innerHTML=
    '<div class="dvlWLHead"><span class="dvlWLTitle">Watchlist</span><button class="dvlWLClose" type="button" id="dvlWLCloseBtn" aria-label="Fechar">\\u00d7</button></div>'+
    '<div class="dvlWLList">'+(syms.length?rows:'<div class="dvlWLEmpty"><strong>Nenhum ativo salvo</strong><span>Toque na estrela \\u2605 no cabe\\u00e7alho para adicionar o ativo atual.</span></div>')+'</div>';
}
window.renderWatchlistPanel=renderWatchlistPanel;

function openWatchlistPanel(){
  renderWatchlistPanel();
  _ensureWLPanel().classList.add('is-open');
  var btn=document.querySelector('[data-dvl-nav-key="watchlist"]');
  if(btn)btn.classList.add('is-active');
}

function closeWatchlistPanel(){
  var p=document.getElementById('dvlWatchlistPanel');
  if(p)p.classList.remove('is-open');
  var btn=document.querySelector('[data-dvl-nav-key="watchlist"]');
  if(btn)btn.classList.remove('is-active');
}
window.openWatchlistPanel=openWatchlistPanel;
window.closeWatchlistPanel=closeWatchlistPanel;

// ── Update header coin icon ──────────────────────────────────────────────────
function updateHeaderIconAndStar(){
  var sym=_normSym(typeof window.symbol!=='undefined'?String(window.symbol):'');
  if(!sym)return;
  // Update coin glyph in header
  var coinEl=document.querySelector('.btc');
  if(coinEl){
    var meta=getAssetIconMeta(sym);
    coinEl.textContent=meta.label;
    coinEl.className='btc dvlCoinHdr '+meta.className;
  }
  // Update star visual
  var starBtn=document.getElementById('currentFavoriteBtn');
  if(starBtn){
    var active=_wlHas(sym);
    starBtn.classList.toggle('is-wl-active',active);
    starBtn.setAttribute('aria-pressed',active?'true':'false');
  }
}
window.updateHeaderIconAndStar=updateHeaderIconAndStar;

// ── Wire events ──────────────────────────────────────────────────────────────
(function(){

  // Panel click delegation (outside click close + row pick + remove)
  document.addEventListener('click',function(ev){
    var panel=document.getElementById('dvlWatchlistPanel');
    if(!panel)return;
    // Close button
    if(ev.target&&ev.target.id==='dvlWLCloseBtn'){closeWatchlistPanel();return;}
    // Remove button (check before pick since it's nested)
    var remBtn=ev.target.closest?ev.target.closest('[data-wl-remove]'):null;
    if(remBtn){
      ev.stopPropagation();
      var rsym=remBtn.getAttribute('data-wl-remove');
      if(rsym){_wlRemove(rsym);renderWatchlistPanel();updateHeaderIconAndStar();}
      return;
    }
    // Pick row
    var pickBtn=ev.target.closest?ev.target.closest('[data-wl-pick]'):null;
    if(pickBtn){
      var sym=pickBtn.getAttribute('data-wl-pick');
      if(sym){try{if(typeof selectSymbol==='function')selectSymbol(sym);}catch(_){}closeWatchlistPanel();}
      return;
    }
    // Outside click
    if(panel.classList.contains('is-open')){
      var inP=ev.target.closest?ev.target.closest('#dvlWatchlistPanel'):null;
      var inN=ev.target.closest?ev.target.closest('#dvlBottomNavV2'):null;
      if(!inP&&!inN)closeWatchlistPanel();
    }
  },false);

  // Star click — add to watchlist + update visual (fires alongside existing toggleFavoriteSymbol)
  function _wireStarBtn(){
    var star=document.getElementById('currentFavoriteBtn');
    if(!star||star.dataset.wlBound)return;
    star.dataset.wlBound='1';
    star.addEventListener('click',function(ev){
      // Do NOT stopPropagation — let symbolBtn handler also run for existing favorites
      ev.preventDefault();
      var sym=_normSym(typeof window.symbol!=='undefined'?String(window.symbol):'');
      if(!sym)return;
      _wlToggle(sym);
      updateHeaderIconAndStar();
      var p=document.getElementById('dvlWatchlistPanel');
      if(p&&p.classList.contains('is-open'))renderWatchlistPanel();
    },false);
  }

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
      // Close trade drawer if open
      try{var dr=document.querySelector('.tradeDrawer');var oldT=document.getElementById('tradeNavBtn');if(dr&&dr.classList.contains('is-open')&&oldT)oldT.click();}catch(_){}
      // Close positions panel
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
    _wireStarBtn();
    _wireNavWatchlist();
    updateHeaderIconAndStar();
    // Retry wiring for late-rendered elements
    setTimeout(function(){_wireStarBtn();_wireNavWatchlist();updateHeaderIconAndStar();},600);
    setTimeout(function(){_wireStarBtn();_wireNavWatchlist();updateHeaderIconAndStar();},2000);
    // Update icon when ticker updates
    setInterval(function(){
      try{
        updateHeaderIconAndStar();
        var p=document.getElementById('dvlWatchlistPanel');
        if(p&&p.classList.contains('is-open'))renderWatchlistPanel();
      }catch(_){}
    },2000);
  }

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
</script>'''

html = rep(html,
    '</html>\n</body>\n</html>',
    WATCHLIST_MODULE + '\n</body>\n</html>',
    "insert watchlist module")

# ── 4. Insert 0765 audit before 0764 audit ──────────────────────────────────
AUDIT_0765 = '''<script id="DVL_WATCHLIST_ASSET_ICONS_AUDIT_MODULE_0765">
(function(){
"use strict";
window.DVL_WATCHLIST_ASSET_ICONS_AUDIT_0765={run:function(){
  var bl=[];
  if(document.title.indexOf('0.765')<0)bl.push('01: title missing 0.765');
  if(document.body.innerHTML.indexOf('BETA 0.765')<0)bl.push('02: badge missing 0.765');
  if(document.body.innerHTML.indexOf('Beta 0.765')<0)bl.push('03: changelog missing 0.765');
  if(!window.DVL_ASSET_REGISTRY)bl.push('04: DVL_ASSET_REGISTRY missing');
  if(typeof window.getAssetIconMeta!=='function')bl.push('05: getAssetIconMeta missing');
  if(typeof window.renderAssetIcon!=='function')bl.push('06: renderAssetIcon missing');
  try{var m=window.getAssetIconMeta('BTCUSDT');if(!m||m.className!=='coin-btc')bl.push('07: BTC icon className incorrect');}catch(e){bl.push('07: getAssetIconMeta BTC threw');}
  try{var m2=window.getAssetIconMeta('ETHUSDT');if(!m2||m2.className!=='coin-eth')bl.push('08: ETH icon className incorrect');}catch(e){bl.push('08: getAssetIconMeta ETH threw');}
  try{var m3=window.getAssetIconMeta('ADAUSDT');if(!m3||m3.className!=='coin-ada')bl.push('09: ADA icon className incorrect');}catch(e){bl.push('09: getAssetIconMeta ADA threw');}
  try{var m4=window.getAssetIconMeta('SOLUSDT');if(!m4||m4.className!=='coin-sol')bl.push('10: SOL icon className incorrect');}catch(e){bl.push('10: getAssetIconMeta SOL threw');}
  try{var m5=window.getAssetIconMeta('XYZUSDT');if(!m5||m5.className!=='coin-generic')bl.push('11: unknown asset should use coin-generic');}catch(e){bl.push('11: getAssetIconMeta generic threw');}
  try{var html=window.renderAssetIcon('ETHUSDT');if(html.indexOf('coin-eth')<0)bl.push('12: renderAssetIcon ETH missing coin-eth class');}catch(e){bl.push('12: renderAssetIcon threw');}
  try{var html2=window.renderAssetIcon('BTCUSDT');if(html2.indexOf('coin-btc')<0)bl.push('13: renderAssetIcon BTC missing coin-btc class');}catch(e){bl.push('13: renderAssetIcon BTC threw');}
  if(!window.DVL_WATCHLIST_STORE)bl.push('15: DVL_WATCHLIST_STORE missing');
  if(!window.DVL_WATCHLIST)bl.push('16: DVL_WATCHLIST missing');
  if(typeof window.loadWatchlist!=='function')bl.push('17: loadWatchlist missing');
  if(typeof window.saveWatchlist!=='function')bl.push('18: saveWatchlist missing');
  if(typeof window.toggleWatchlist!=='function')bl.push('19: toggleWatchlist missing');
  if(typeof window.isInWatchlist!=='function')bl.push('20: isInWatchlist missing');
  if(typeof window.addToWatchlist!=='function')bl.push('21: addToWatchlist missing');
  if(typeof window.removeFromWatchlist!=='function')bl.push('22: removeFromWatchlist missing');
  try{window.addToWatchlist('TESTUSDT');if(!window.isInWatchlist('TESTUSDT'))bl.push('23a: addToWatchlist not working');window.removeFromWatchlist('TESTUSDT');if(window.isInWatchlist('TESTUSDT'))bl.push('23b: removeFromWatchlist not working');}catch(e){bl.push('23: watchlist crud threw');}
  if(typeof window.openWatchlistPanel!=='function')bl.push('24: openWatchlistPanel missing');
  if(typeof window.closeWatchlistPanel!=='function')bl.push('25: closeWatchlistPanel missing');
  if(typeof window.renderWatchlistPanel!=='function')bl.push('26: renderWatchlistPanel missing');
  if(typeof window.updateHeaderIconAndStar!=='function')bl.push('27: updateHeaderIconAndStar missing');
  try{window.renderWatchlistPanel();var p=document.getElementById('dvlWatchlistPanel');if(!p)bl.push('28: dvlWatchlistPanel not created by renderWatchlistPanel');}catch(e){bl.push('28: renderWatchlistPanel threw');}
  if(document.querySelector('[data-dvl-nav-key="watchlist"]')&&!document.querySelector('#dvlBottomNavV2[data-wl-nav-bound]'))bl.push('29: footer watchlist nav not wl-bound (wire may have failed)');
  if(document.getElementById('currentFavoriteBtn')&&!document.getElementById('currentFavoriteBtn').dataset.wlBound)bl.push('30: header star not wl-bound (wire may have failed)');
  var wls=window.DVL_WATCHLIST_STORE;if(wls&&!Array.isArray(wls.symbols))bl.push('31: DVL_WATCHLIST_STORE.symbols not an array');
  if(!window.DVL_PAPER_EXECUTION_ENGINE&&!window.DVL_PAPER_REALTIME_ENGINE)bl.push('33: execution engine missing - 0.764 regression');
  if(!window.DVL_DEMO_WALLET)bl.push('34: DVL_DEMO_WALLET missing - 0.764 regression');
  if(!window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722)bl.push('35: positions overlay missing - 0.763 regression');
  if(!window.DVL_POSITION_DETAILS_PANEL_0724)bl.push('36: positions detail panel missing - 0.763 regression');
  if(document.body.innerHTML.toLowerCase().indexOf('broker connector')>=0)bl.push('37: Broker Connector found');
  return{pass:bl.length===0,blockers:bl,version:'0.765',checks:38};
}};
})();
</script>

'''

html = rep(html,
    '<script id="DVL_DEMO_WALLET_REALTIME_EXECUTION_AUDIT_MODULE_0764">',
    AUDIT_0765 + '<script id="DVL_DEMO_WALLET_REALTIME_EXECUTION_AUDIT_MODULE_0764">',
    "insert 0765 audit module")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
