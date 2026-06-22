#!/usr/bin/env python3
"""patch_763.py — Beta 0.763: Positions Detail Actions Fix."""
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

print("=== patch_763.py — Beta 0.763 ===")

# ── 1. Version bumps ──────────────────────────────────────────────────────────
html = rep(html,
    '<title>DVL Binance Live — Beta 0.762</title>',
    '<title>DVL Binance Live — Beta 0.763</title>', "title")

html = rep(html,
    'const DVL_APP_VERSION = "Beta 0.762";',
    'const DVL_APP_VERSION = "Beta 0.763";', "version const")

html = rep(html,
    '>BETA 0.762</span>',
    '>BETA 0.763</span>', "badge")

html = rep(html,
    '{ version: DVL_APP_VERSION, note: "Beta 0.762 — Paper realtime multi-symbol engine: pending orders, open positions, TP/SL execution and floating PnL now update in real time for all symbols with Paper activity, without needing to open the symbol on the chart." },',
    '{ version: DVL_APP_VERSION, note: "Beta 0.763 — Positions detail actions fix: position details now open from the clicked trade id with real store data, Positions and detail PnL refresh in real time, View on chart switches to the position symbol, TP/SL move button was removed, partial close opens a percentage panel, and close position works across symbols." },\n  { version: "Beta 0.762", note: "Beta 0.762 — Paper realtime multi-symbol engine: pending orders, open positions, TP/SL execution and floating PnL now update in real time for all symbols with Paper activity, without needing to open the symbol on the chart." },',
    "changelog")

# ── 2. Audit bump 0762 → 0763 ─────────────────────────────────────────────────
html = rep(html,
    '<script id="DVL_UI_OVERLAY_PHASE_0762_AUDIT_MODULE">',
    '<script id="DVL_UI_OVERLAY_PHASE_0763_AUDIT_MODULE">', "audit script id")

html = rep(html,
    'window.DVL_APP_VERSION==="Beta 0.762"',
    'window.DVL_APP_VERSION==="Beta 0.763"', "audit A1 check")

html = rep(html,
    "A1: DVL_APP_VERSION !== 'Beta 0.762' (got: ",
    "A1: DVL_APP_VERSION !== 'Beta 0.763' (got: ", "audit A1 msg")

html = rep(html,
    'indexOf("0.762")===-1) blockers.push("A2: title missing 0.762")',
    'indexOf("0.763")===-1) blockers.push("A2: title missing 0.763")', "audit A2")

html = rep(html,
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0762_AUDIT_MODULE";',
    'var N=103, name="DVL_UI_OVERLAY_PHASE_0763_AUDIT_MODULE";',
    "audit name bump")

# ── 3. CSS: partial close panel ───────────────────────────────────────────────
html = rep(html,
    '.dvlDetailV2Action.danger{\n  color:#ff5966!important;\n  border-color:rgba(255,48,55,.28)!important;\n  background:rgba(255,48,55,.08)!important;\n}',
    '.dvlDetailV2Action.danger{\n  color:#ff5966!important;\n  border-color:rgba(255,48,55,.28)!important;\n  background:rgba(255,48,55,.08)!important;\n}\n\n.dvlDetailV2PartialPanel{padding:8px 0 4px 0!important;}\n.dvlDetailV2PartialPct{display:flex!important;align-items:center!important;gap:10px!important;margin-bottom:8px!important;}\n.dvlDetailV2PartialPct span{min-width:38px!important;font-size:15px!important;font-weight:900!important;color:#10df77!important;}\n.dvlDetailV2PartialPct input[type=range]{flex:1!important;accent-color:#10df77!important;}\n.dvlDetailV2PartialQuick{display:flex!important;gap:6px!important;margin-bottom:8px!important;}\n.dvlDetailV2PartialQuick button{flex:1!important;height:30px!important;border-radius:9px!important;border:1px solid rgba(145,175,165,.18)!important;background:rgba(4,12,10,.6)!important;color:#dfe8e3!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important;}',
    "css: partial close panel")

# ── 4. Engine: hook maybeUpdateOpenPositionDetail into onPaperSymbolPrice ─────
html = rep(html,
    "  processPaperRealtimeTick(symbol,price,time||Date.now());\n}\n\nwindow.onPaperSymbolPrice=onPaperSymbolPrice;",
    "  processPaperRealtimeTick(symbol,price,time||Date.now());\n  try{if(typeof window.maybeUpdateOpenPositionDetail==='function')window.maybeUpdateOpenPositionDetail(symbol);}catch(_){}\n}\n\nwindow.onPaperSymbolPrice=onPaperSymbolPrice;",
    "engine: hook detail realtime update")

# ── 5. Replace DVL_POSITION_DETAILS_PANEL_MODULE_0724 ─────────────────────────
# Match from the guard line through the final export, keeping <script> tags.
OLD_MODULE = """\
  if(window.DVL_POSITION_DETAILS_PANEL_0724) return;

  var details = {
    "BTC/USDT": {
      coin:"btc", symbol:"BTC/USDT", side:"Long", leverage:"10x", mode:"Real",
      size:"0.089 BTC", margin:"571,20 USDT", entry:"63.420,10", current:"63.995,20",
      average:"63.420,10", liquidation:"61.284,80", tp:"64.420,00", sl:"62.910,00",
      pnl:"+575,10", pct:"+0,91%", fees:"-3,42 USDT", funding:"+0,18 USDT", net:"+571,86 USDT",
      direction:"long",
      timeline:[["15:10","Posição Long aberta"],["15:11","TP/SL criado 1:1"],["15:23","Preço tocou zona verde"],["15:33","PnL atualizado"]]
    },
    "ETH/USDT": {
      coin:"eth", symbol:"ETH/USDT", side:"Short", leverage:"5x", mode:"Real",
      size:"1.24 ETH", margin:"836,40 USDT", entry:"3.385,70", current:"3.348,22",
      average:"3.385,70", liquidation:"3.612,10", tp:"3.310,00", sl:"3.440,00",
      pnl:"-187,40", pct:"-0,55%", fees:"-2,15 USDT", funding:"-0,08 USDT", net:"-189,63 USDT",
      direction:"short",
      timeline:[["14:48","Ordem Short executada"],["14:49","SL confirmado"],["15:02","Preço retornou contra posição"],["15:33","PnL atualizado"]]
    },
    "SOL/USDT": {
      coin:"sol", symbol:"SOL/USDT", side:"Long", leverage:"5x", mode:"Real",
      size:"34.8 SOL", margin:"1.102,00 USDT", entry:"158,420", current:"161,870",
      average:"158,420", liquidation:"147,880", tp:"164,000", sl:"156,900",
      pnl:"+172,50", pct:"+2,17%", fees:"-1,76 USDT", funding:"+0,05 USDT", net:"+170,79 USDT",
      direction:"long",
      timeline:[["13:26","Long aberto em SOL"],["13:27","TP/SL criado"],["14:10","Preço rompeu topo local"],["15:33","PnL atualizado"]]
    }
  };\
"""

NEW_MODULE = """\
  if(window.DVL_POSITION_DETAILS_PANEL_0724) return;

  // ── global selection state ───────────────────────────────────────────────
  window.DVL_SELECTED_POSITION_ID = null;
  window.DVL_SELECTED_POSITION_SYMBOL = null;
  var _partialCloseState = null;
  var _PFX_D = 'dvl_paper_v2_pro_0695_';\
"""

html = rep(html, OLD_MODULE, NEW_MODULE, "remove mock details object")

# Now replace the core functions: renderDetails + click handler + export
OLD_CORE = """\
  function elById(id){ return document.getElementById(id); }

  function ensurePanel(){
    if(elById("dvlPositionDetailsV2")) return elById("dvlPositionDetailsV2");
    var panel = document.createElement("section");
    panel.id = "dvlPositionDetailsV2";
    panel.setAttribute("data-dvl-ui","true");
    panel.setAttribute("aria-label","Position details");
    document.body.appendChild(panel);
    return panel;
  }

  function coinGlyph(coin){
    if(coin === "btc") return "₿";
    if(coin === "eth") return "◆";
    return "";
  }

  function moneyClass(val){
    return String(val).trim().charAt(0) === "-" ? "red" : "green";
  }

  function closeDetails(){
    var panel = elById("dvlPositionDetailsV2");
    if(panel) panel.classList.remove("is-open");
    var cards = document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var i=0; i<cards.length; i++) cards[i].classList.remove("is-detail-open");
  }\
"""

NEW_CORE = """\
  function elById(id){ return document.getElementById(id); }

  function normSym(sym){if(!sym)return'';return String(sym).replace('/','').replace('-','').toUpperCase();}

  // ── find order by ID from ALL symbols ───────────────────────────────────
  function getPaperPositionById(id){
    if(!id)return null; id=String(id);
    var store=window.DVL_PAPER_TRADE_STORE;
    if(store){
      var _sa=(store.openPositions||[]).concat(store.pendingOrders||[]);
      for(var _i=0;_i<_sa.length;_i++){if(_sa[_i]&&String(_sa[_i].id)===id)return _sa[_i];}
    }
    try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(V2){var _st=V2.getState();if(_st&&Array.isArray(_st.orders)){for(var _j=0;_j<_st.orders.length;_j++){if(_st.orders[_j]&&String(_st.orders[_j].id)===id)return _st.orders[_j];}}}}catch(_){}
    try{for(var _k=0;_k<localStorage.length;_k++){var _lk=localStorage.key(_k);if(!_lk||_lk.indexOf(_PFX_D)!==0||_lk===_PFX_D+'symbols')continue;try{var _la=JSON.parse(localStorage.getItem(_lk)||'[]');if(Array.isArray(_la)){for(var _m=0;_m<_la.length;_m++){if(_la[_m]&&String(_la[_m].id)===id)return _la[_m];}}}catch(_){}}}catch(_){}
    return null;
  }
  window.getPaperPositionById=getPaperPositionById;

  // ── live price helper (per-symbol cache first) ───────────────────────────
  function getLivePrice(sym){
    sym=normSym(sym);
    var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
    if(lp&&Number.isFinite(lp.price)&&lp.price>0)return lp.price;
    try{var cs=normSym(typeof window.symbol!=='undefined'?String(window.symbol):'');if(sym===cs&&window.ticker&&Number(window.ticker.lastPrice)>0)return Number(window.ticker.lastPrice);}catch(_){}
    return 0;
  }

  function ensurePanel(){
    if(elById("dvlPositionDetailsV2")) return elById("dvlPositionDetailsV2");
    var panel = document.createElement("section");
    panel.id = "dvlPositionDetailsV2";
    panel.setAttribute("data-dvl-ui","true");
    panel.setAttribute("aria-label","Position details");
    document.body.appendChild(panel);
    return panel;
  }

  function coinGlyph(coin){
    if(coin === "btc") return "₿";
    if(coin === "eth") return "◆";
    return "";
  }

  function closeDetails(){
    var panel = elById("dvlPositionDetailsV2");
    if(panel) panel.classList.remove("is-open");
    window.DVL_SELECTED_POSITION_ID=null;
    window.DVL_SELECTED_POSITION_SYMBOL=null;
    _partialCloseState=null;
    var cards = document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var i=0; i<cards.length; i++) cards[i].classList.remove("is-detail-open");
  }\
"""

html = rep(html, OLD_CORE, NEW_CORE, "replace core helpers")

# Replace _lvPrc + buildRealRow + renderDetails
OLD_RENDER = """\
  function _lvPrc(){ try{ if(window.ticker&&Number(window.ticker.lastPrice)>0) return Number(window.ticker.lastPrice); }catch(_){} try{ if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){ var _c=window.S.candles[window.S.candles.length-1]; var _p=Number(_c.close||_c.c||0); if(Number.isFinite(_p)&&_p>0) return _p; } }catch(_){} return 0; }
  function _fmtTime(ts){ try{ var d=new Date(Number(ts)); return ("0"+d.getDate()).slice(-2)+"/"+(("0"+(d.getMonth()+1)).slice(-2))+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }catch(_){ return "--"; } }
  function _fp2(v){ v=Number(v); if(!Number.isFinite(v)||v<=0) return "--"; return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4}); }
  function _fm2(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>=0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT"; }
  function _ft2(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>=0?"+":(v<0?"-":""); return s+Math.abs(v).toFixed(2)+"%"; }

  function buildRealRow(o, status){
    var live=_lvPrc(), buy=o.side==="buy", ep=Number(o.entry)||0, qty=Number(o.qty)||0;
    var lev=Number(o.leverage)||1, sizUSDT=Number(o.size)||0;
    var sym=String(o.symbol||"").toUpperCase(), disp=sym.replace(/USDT$/i,"/USDT")||sym;
    var coin=sym.replace(/USDT$/i,"").toLowerCase(), coinUpper=sym.replace(/USDT$/i,"");
    var pv=0, pc=0, cur="--", direction="positive";
    if(status==="closed"||status==="history"){
      var exitP=Number(o.exitPrice||o.closedPrice||0);
      pv=Number(o.realizedPnl); pc=Number(o.realizedPnlPct);
      cur=exitP>0?_fp2(exitP):"--"; direction=(Number.isFinite(pv)&&pv>=0)?"positive":"negative";
    } else if(status==="pending"){
      cur="Aguardando";
    } else {
      pv=live>0&&ep>0?(buy?(live-ep)*qty:(ep-live)*qty):0;
      pc=live>0&&ep>0?(buy?((live-ep)/ep)*100:((ep-live)/ep)*100):0;
      cur=live>0?_fp2(live):"--"; direction=pv>=0?"positive":"negative";
    }
    var sizeStr=qty>0?qty.toFixed(qty<1?4:3)+" "+coinUpper:"--";
    var marginStr=sizUSDT>0?sizUSDT.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT":"--";
    var tl=[];
    if(o.createdAt) tl.push([_fmtTime(o.createdAt),"Ordem criada"]);
    if(o.armedAt&&status==="pending") tl.push([_fmtTime(o.armedAt),"Aguardando ativação"]);
    if(o.armedAt&&status==="open") tl.push([_fmtTime(o.armedAt),"Posição aberta"]);
    if(o.closedAt) tl.push([_fmtTime(o.closedAt),"Fechada — "+(o.closeReason==="tp"?"TP":o.closeReason==="sl"?"SL":"Manual")]);
    var pnlFmt=Number.isFinite(pv)?_fm2(pv):"--", pctFmt=Number.isFinite(pc)?_ft2(pc):"--";
    return {
      _real:true, coin:coin, symbol:disp, side:buy?"Long":"Short", leverage:lev+"x", mode:"Demo",
      size:sizeStr, margin:marginStr, entry:_fp2(ep), current:cur, average:ep>0?_fp2(ep):"--",
      liquidation:"--", tp:Number(o.tp)>0?_fp2(Number(o.tp)):"--", sl:Number(o.sl)>0?_fp2(Number(o.sl)):"--",
      fees:"--", pnl:pnlFmt, pct:pctFmt, net:pnlFmt, direction:direction, timeline:tl
    };
  }

  function renderDetails(symbol, sourceCard, status, orderId){
    status = status || "open";
    var row = null;
    if(orderId && window.DVL_PAPER_TRADING_V2_PRO){
      try{
        var st=window.DVL_PAPER_TRADING_V2_PRO.getState();
        if(st&&Array.isArray(st.orders)){
          for(var _oi=0;_oi<st.orders.length;_oi++){
            if(st.orders[_oi]&&String(st.orders[_oi].id)===String(orderId)){ row=buildRealRow(st.orders[_oi],status); break; }
          }
        }
      }catch(_){}
    }
    if(!row) row = details[symbol] || details["BTC/USDT"];
    var panel = ensurePanel();

    var openCards = document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var i=0; i<openCards.length; i++) openCards[i].classList.remove("is-detail-open");
    if(sourceCard) sourceCard.classList.add("is-detail-open");

    var sideClass = (String(row.side).toLowerCase().indexOf("short") !== -1) ? "short" : "long";
    var pnlClass = moneyClass(row.pnl);

    var tl = "";
    for(var j=0; j<row.timeline.length; j++){
      tl += '<div class="dvlDetailV2Event"><time>' + row.timeline[j][0] + '</time><span>' + row.timeline[j][1] + '</span></div>';
    }

    var gestaoHtml = status === "open" ?
      '<div class="dvlDetailV2SectionTitle">Gestão rápida</div>' +
      '<div class="dvlDetailV2Actions">' +
        '<button class="dvlDetailV2Action primary" type="button">Ver no gráfico</button>' +
        '<button class="dvlDetailV2Action primary" type="button">Mover TP/SL</button>' +
        '<button class="dvlDetailV2Action" type="button">Fechar parcial</button>' +
        '<button class="dvlDetailV2Action danger" type="button">Fechar posição</button>' +
      '</div>' : "";

    panel.innerHTML =
      '<header class="dvlDetailV2Head">' +
        '<div class="dvlDetailV2TitleLine">' +
          '<div class="dvlDetailV2Coin ' + row.coin + '">' + coinGlyph(row.coin) + '</div>' +
          '<div class="dvlDetailV2TitleText">' +
            '<strong>' + row.symbol + '</strong>' +
            '<div class="dvlDetailV2Sub">' +
              '<span class="dvlDetailV2Badge ' + sideClass + '">' + row.side + '</span>' +
              '<span class="dvlDetailV2Badge lev">' + row.leverage + '</span>' +
              '<span>' + row.mode + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<button class="dvlDetailV2Close" type="button" data-dvl-detail-close="true">×</button>' +
      '</header>' +
      '<div class="dvlDetailV2Body">' +
        '<div class="dvlDetailV2PnlHero">' +
          '<div><span>Resultado líquido</span><strong class="' + pnlClass + '">' + row.net + '</strong></div>' +
          '<small>' + row.pnl + '<br>' + row.pct + '</small>' +
        '</div>' +
        gestaoHtml +
        '<div class="dvlDetailV2Grid">' +
          '<div class="dvlDetailV2Cell"><span>Tamanho</span><b>' + row.size + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Margem usada</span><b>' + row.margin + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Entrada</span><b>' + row.entry + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Preço atual</span><b>' + row.current + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Preço médio</span><b>' + row.average + '</b></div>' +
          '<div class="dvlDetailV2Cell red"><span>Liquidação</span><b>' + row.liquidation + '</b></div>' +
          '<div class="dvlDetailV2Cell green"><span>Take Profit</span><b>' + row.tp + '</b></div>' +
          '<div class="dvlDetailV2Cell red"><span>Stop Loss</span><b>' + row.sl + '</b></div>' +
          '<div class="dvlDetailV2Cell"><span>Fees</span><b>' + row.fees + '</b></div>' +
        '</div>' +
        '<div class="dvlDetailV2SectionTitle">Timeline</div>' +
        '<div class="dvlDetailV2Timeline">' + tl + '</div>' +
      '</div>';

    panel.classList.add("is-open");
    try{ document.dispatchEvent(new CustomEvent("dvl:position-detail-open", {bubbles:true, detail:{symbol:symbol, status:status, orderId:orderId, row:row}})); }catch(_){}
  }\
"""

NEW_RENDER = """\
  function _fmtTime(ts){try{var d=new Date(Number(ts));return("0"+d.getDate()).slice(-2)+"/"+(("0"+(d.getMonth()+1)).slice(-2))+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}catch(_){return"--";}}
  function _fp2(v){v=Number(v);if(!Number.isFinite(v)||v<=0)return"--";return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4});}
  function _fm2(v){v=Number(v);if(!Number.isFinite(v))v=0;var s=v>=0?"+":(v<0?"-":"");return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+" USDT";}
  function _ft2(v){v=Number(v);if(!Number.isFinite(v))v=0;var s=v>=0?"+":(v<0?"-":"");return s+Math.abs(v).toFixed(2)+"%";}

  // ── cancel pending order (any symbol) ───────────────────────────────────
  function cancelPendingOrderById(id){
    if(!id)return; id=String(id);
    var p=getPaperPositionById(id); if(!p)return;
    var sym=normSym(p.symbol);
    try{var ords=JSON.parse(localStorage.getItem(_PFX_D+sym)||'[]');ords=ords.filter(function(o){return o&&String(o.id)!==id;});localStorage.setItem(_PFX_D+sym,JSON.stringify(ords));}catch(_){}
    try{var V2=window.DVL_PAPER_TRADING_V2_PRO;if(V2&&normSym(typeof window.symbol!=='undefined'?String(window.symbol):'')===sym){var _st=V2.getState();if(_st&&Array.isArray(_st.orders)){_st.orders=_st.orders.filter(function(o){return o&&String(o.id)!==id;});}if(typeof V2.render==='function')V2.render();}}catch(_){}
    try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}
    try{if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore();}catch(_){}
    closeDetails();
    try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}
  }

  // ── close full position (any symbol) ────────────────────────────────────
  function closePaperPositionById(id,reason){
    var p=getPaperPositionById(id); if(!p)return;
    var sym=normSym(p.symbol);
    var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
    var exitPrice=(lp&&Number.isFinite(lp.price)&&lp.price>0)?lp.price:Number(p.entry);
    if(typeof window.closePaperTradeToHistory==='function'){window.closePaperTradeToHistory(p,exitPrice,reason||'Manual',Date.now());}
    closeDetails();
  }

  // ── partial close ────────────────────────────────────────────────────────
  function confirmPartialClose(id,percent){
    var p=getPaperPositionById(id); if(!p)return;
    percent=Math.max(1,Math.min(100,Number(percent)||50));
    if(percent>=100){closePaperPositionById(id,'Manual');return;}
    var sym=normSym(p.symbol);
    var lp=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];
    var exitPrice=(lp&&Number.isFinite(lp.price)&&lp.price>0)?lp.price:Number(p.entry);
    var ratio=percent/100;
    var oldQty=Number(p.qty||p.size||0);
    if(!Number.isFinite(oldQty)||oldQty<=0)return;
    var closedQty=oldQty*ratio; var remainingQty=oldQty-closedQty;
    var partial={};for(var _ck in p)if(Object.prototype.hasOwnProperty.call(p,_ck))partial[_ck]=p[_ck];
    partial.id=p.id+'-partial-'+Date.now(); partial.parentId=p.id; partial.status='closed';
    partial.closeReason='Partial '+percent+'%'; partial.exitPrice=exitPrice; partial.closedPrice=exitPrice;
    partial.closedAt=Date.now(); partial.qty=closedQty; partial.size=closedQty;
    if(typeof window.calcPaperPnl==='function'){var _pd=window.calcPaperPnl(partial,exitPrice);partial.realizedPnl=_pd.pnl;partial.realizedPnlPct=_pd.pnlPct;}
    if(typeof window.addTradeToHistory==='function')window.addTradeToHistory(partial);
    p.qty=remainingQty; p.size=remainingQty;
    try{var ords=JSON.parse(localStorage.getItem(_PFX_D+sym)||'[]');for(var _i=0;_i<ords.length;_i++){if(ords[_i]&&String(ords[_i].id)===String(p.id)){ords[_i]=p;break;}}localStorage.setItem(_PFX_D+sym,JSON.stringify(ords));}catch(_){}
    try{var V2b=window.DVL_PAPER_TRADING_V2_PRO;if(V2b&&normSym(typeof window.symbol!=='undefined'?String(window.symbol):'')===sym){var _st2=V2b.getState();if(_st2&&Array.isArray(_st2.orders)){for(var _j2=0;_j2<_st2.orders.length;_j2++){if(_st2.orders[_j2]&&String(_st2.orders[_j2].id)===String(p.id)){_st2.orders[_j2]=p;break;}}}}}catch(_){}
    _partialCloseState=null;
    try{if(typeof window.syncPaperStoreFromOrders==='function')window.syncPaperStoreFromOrders();}catch(_){}
    try{if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore();}catch(_){}
    try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}
    var _upd=getPaperPositionById(p.id);if(_upd)renderPositionDetail(_upd);else closeDetails();
  }

  // ── switch chart to position symbol ─────────────────────────────────────
  function viewPositionOnChart(id){
    var p=getPaperPositionById(id); if(!p||!p.symbol)return;
    var sym=normSym(p.symbol);
    try{if(typeof selectSymbol==='function')selectSymbol(sym);}catch(_){}
    closeDetails();
    try{if(typeof window.DVL_POSITIONS_REFRESH==='function')window.DVL_POSITIONS_REFRESH();}catch(_){}
  }

  // ── render detail from real position object ──────────────────────────────
  function renderPositionDetail(o){
    if(!o)return;
    window.DVL_SELECTED_POSITION_ID=String(o.id||'');
    window.DVL_SELECTED_POSITION_SYMBOL=String(o.symbol||'');
    var sym=normSym(o.symbol);
    var disp=sym.replace(/USDT$/i,"/USDT")||sym;
    var coin=sym.replace(/USDT$/i,"").toLowerCase();
    var coinUpper=sym.replace(/USDT$/i,"");
    var buy=String(o.side||'').toLowerCase()==='buy';
    var sideLabel=buy?"Long":"Short";
    var ep=Number(o.entry)||0;
    var qty=Number(o.qty||o.size||0);
    var lev=Number(o.leverage)||1;
    var status=String(o.status||'open').toLowerCase();
    var live=getLivePrice(sym);
    var pv=0,pc=0,curStr="--",dirClass="positive";
    if(status==="closed"||status==="history"){
      var exitP=Number(o.exitPrice||o.closedPrice||0);
      pv=Number(o.realizedPnl);pc=Number(o.realizedPnlPct);
      curStr=exitP>0?_fp2(exitP):"--";dirClass=(Number.isFinite(pv)&&pv>=0)?"positive":"negative";
    }else if(status==="pending"){
      curStr=live>0?_fp2(live):"Aguardando";
    }else{
      pv=live>0&&ep>0?(buy?(live-ep)*qty:(ep-live)*qty):0;
      pc=live>0&&ep>0?(buy?((live-ep)/ep)*100:((ep-live)/ep)*100):0;
      curStr=live>0?_fp2(live):"--";dirClass=pv>=0?"positive":"negative";
    }
    var sizeStr=qty>0?qty.toFixed(qty<1?4:3)+" "+coinUpper:"--";
    var sideClass=buy?"long":"short";
    var pnlFmt=(status!=="pending"&&Number.isFinite(pv))?_fm2(pv):"--";
    var pctFmt=(status!=="pending"&&Number.isFinite(pc))?_ft2(pc):"--";
    var pnlClass=(Number.isFinite(pv)&&pv>=0)?"green":"red";
    var tl="";
    if(o.createdAt)tl+='<div class="dvlDetailV2Event"><time>'+_fmtTime(o.createdAt)+'</time><span>Ordem criada</span></div>';
    if(o.openedAt||o.activatedAt)tl+='<div class="dvlDetailV2Event"><time>'+_fmtTime(o.openedAt||o.activatedAt)+'</time><span>Posição aberta</span></div>';
    if(o.closedAt)tl+='<div class="dvlDetailV2Event"><time>'+_fmtTime(o.closedAt)+'</time><span>Fechada — '+(o.closeReason==="tp"?"TP":o.closeReason==="sl"?"SL":o.closeReason||"Manual")+'</span></div>';
    var actionsHtml="";
    if(status==="pending"){
      actionsHtml='<div class="dvlDetailV2SectionTitle">Ações</div><div class="dvlDetailV2Actions">'+'<button class="dvlDetailV2Action primary" type="button" data-dvl-detail-act="chart">Ver no gráfico</button>'+'<button class="dvlDetailV2Action danger" type="button" data-dvl-detail-act="cancel">Cancelar ordem</button>'+'</div>';
    }else if(status==="open"){
      if(_partialCloseState&&_partialCloseState.positionId===String(o.id)){
        var pct=_partialCloseState.percent;
        actionsHtml='<div class="dvlDetailV2SectionTitle">Fechar parcial</div><div class="dvlDetailV2PartialPanel"><div class="dvlDetailV2PartialPct"><span id="dvlPartialPctLabel">'+pct+'%</span><input type="range" id="dvlPartialSlider" min="1" max="99" value="'+pct+'" step="1"></div><div class="dvlDetailV2PartialQuick"><button type="button" data-dvl-pct="25">25%</button><button type="button" data-dvl-pct="50">50%</button><button type="button" data-dvl-pct="75">75%</button></div><div class="dvlDetailV2Actions"><button class="dvlDetailV2Action" type="button" data-dvl-detail-act="partial-cancel">Cancelar</button><button class="dvlDetailV2Action primary" type="button" data-dvl-detail-act="partial-confirm">Confirmar '+pct+'%</button></div></div>';
      }else{
        actionsHtml='<div class="dvlDetailV2SectionTitle">Gestão rápida</div><div class="dvlDetailV2Actions">'+'<button class="dvlDetailV2Action primary" type="button" data-dvl-detail-act="chart">Ver no gráfico</button>'+'<button class="dvlDetailV2Action" type="button" data-dvl-detail-act="partial">Fechar parcial</button>'+'<button class="dvlDetailV2Action danger" type="button" data-dvl-detail-act="close">Fechar posição</button>'+'</div>';
      }
    }
    var panel=ensurePanel();
    var openCards=document.querySelectorAll(".dvlPosV2Card.is-detail-open");
    for(var _ci=0;_ci<openCards.length;_ci++)openCards[_ci].classList.remove("is-detail-open");
    var _matchCards=document.querySelectorAll('.dvlPosV2Card[data-dvl-order-id="'+o.id+'"]');
    for(var _mi=0;_mi<_matchCards.length;_mi++)_matchCards[_mi].classList.add("is-detail-open");
    panel.innerHTML=
      '<header class="dvlDetailV2Head">'+
        '<div class="dvlDetailV2TitleLine">'+
          '<div class="dvlDetailV2Coin '+coin+'">'+coinGlyph(coin)+'</div>'+
          '<div class="dvlDetailV2TitleText">'+
            '<strong>'+disp+'</strong>'+
            '<div class="dvlDetailV2Sub">'+
              '<span class="dvlDetailV2Badge '+sideClass+'">'+sideLabel+'</span>'+
              '<span class="dvlDetailV2Badge lev">'+lev+'x</span>'+
              '<span>Demo</span>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<button class="dvlDetailV2Close" type="button" data-dvl-detail-close="true">×</button>'+
      '</header>'+
      '<div class="dvlDetailV2Body">'+
        '<div class="dvlDetailV2PnlHero">'+
          '<div><span>Resultado líquido</span><strong class="'+pnlClass+'">'+pnlFmt+'</strong></div>'+
          '<small class="'+pnlClass+'">'+pnlFmt+'<br>'+pctFmt+'</small>'+
        '</div>'+
        actionsHtml+
        '<div class="dvlDetailV2Grid">'+
          '<div class="dvlDetailV2Cell"><span>Tamanho</span><b>'+sizeStr+'</b></div>'+
          '<div class="dvlDetailV2Cell"><span>Entrada</span><b>'+_fp2(ep)+'</b></div>'+
          '<div class="dvlDetailV2Cell"><span>Preço atual</span><b class="'+dirClass+'">'+curStr+'</b></div>'+
          '<div class="dvlDetailV2Cell green"><span>Take Profit</span><b>'+_fp2(Number(o.tp))+'</b></div>'+
          '<div class="dvlDetailV2Cell red"><span>Stop Loss</span><b>'+_fp2(Number(o.sl))+'</b></div>'+
        '</div>'+
        (tl?'<div class="dvlDetailV2SectionTitle">Timeline</div><div class="dvlDetailV2Timeline">'+tl+'</div>':'')+
      '</div>';
    panel.classList.add("is-open");
    if(_partialCloseState&&_partialCloseState.positionId===String(o.id)){
      var slider=elById("dvlPartialSlider"),lbl=elById("dvlPartialPctLabel"),cfBtn=panel.querySelector('[data-dvl-detail-act="partial-confirm"]');
      if(slider){slider.addEventListener("input",function(){var p2=Number(slider.value)||50;_partialCloseState.percent=p2;if(lbl)lbl.textContent=p2+"%";if(cfBtn)cfBtn.textContent="Confirmar "+p2+"%";});}
      var qBtns=panel.querySelectorAll("[data-dvl-pct]");
      for(var _qi=0;_qi<qBtns.length;_qi++){qBtns[_qi].addEventListener("click",(function(b){return function(){var p3=Number(b.getAttribute("data-dvl-pct"))||50;_partialCloseState.percent=p3;if(slider)slider.value=p3;if(lbl)lbl.textContent=p3+"%";if(cfBtn)cfBtn.textContent="Confirmar "+p3+"%";};})(qBtns[_qi]));}
    }
    try{document.dispatchEvent(new CustomEvent("dvl:position-detail-open",{bubbles:true,detail:{symbol:sym,status:status,orderId:String(o.id)}}));}catch(_){}
  }
  window.renderPositionDetail=renderPositionDetail;

  function maybeUpdateOpenPositionDetail(symbol){
    var id=window.DVL_SELECTED_POSITION_ID; if(!id)return;
    var p=getPaperPositionById(id); if(!p)return;
    if(normSym(p.symbol)!==normSym(symbol))return;
    renderPositionDetail(p);
  }
  window.maybeUpdateOpenPositionDetail=maybeUpdateOpenPositionDetail;\
"""

html = rep(html, OLD_RENDER, NEW_RENDER, "replace render functions")

# Replace click handler + export
OLD_EVENTS = """\
  document.addEventListener("click", function(ev){
    var closeBtn = ev.target.closest ? ev.target.closest("[data-dvl-detail-close]") : null;
    if(closeBtn){ closeDetails(); return; }
    var delBtn = ev.target.closest ? ev.target.closest("[data-dvl-del-id]") : null;
    if(delBtn) return;

    var card = ev.target.closest ? ev.target.closest(".dvlPosV2Card") : null;
    if(card){ renderDetails(card.getAttribute("data-dvl-symbol") || "BTC/USDT", card, card.getAttribute("data-dvl-status") || "open", card.getAttribute("data-dvl-order-id") || ""); return; }

    var panel = elById("dvlPositionDetailsV2");
    if(panel && panel.classList.contains("is-open")){
      var inDetails = ev.target.closest ? ev.target.closest("#dvlPositionDetailsV2") : null;
      var inPositions = ev.target.closest ? ev.target.closest("#dvlPositionsPanelV2") : null;
      var inNav = ev.target.closest ? ev.target.closest("#dvlBottomNavV2") : null;
      if(!inDetails && !inPositions && !inNav) closeDetails();
    }
  }, true);

  window.DVL_POSITION_DETAILS_PANEL_0724 = {
    open: renderDetails,
    close: closeDetails,
    data: details
  };\
"""

NEW_EVENTS = """\
  document.addEventListener("click", function(ev){
    var closeBtn=ev.target.closest?ev.target.closest("[data-dvl-detail-close]"):null;
    if(closeBtn){closeDetails();return;}
    var delBtn=ev.target.closest?ev.target.closest("[data-dvl-del-id]"):null;
    if(delBtn)return;
    var actBtn=ev.target.closest?ev.target.closest("[data-dvl-detail-act]"):null;
    if(actBtn){
      var act=actBtn.getAttribute("data-dvl-detail-act");
      var selId=window.DVL_SELECTED_POSITION_ID; if(!selId)return;
      if(act==="chart"){viewPositionOnChart(selId);return;}
      if(act==="close"){closePaperPositionById(selId,"Manual");return;}
      if(act==="partial"){_partialCloseState={positionId:selId,percent:50};var _p0=getPaperPositionById(selId);if(_p0)renderPositionDetail(_p0);return;}
      if(act==="partial-confirm"){var _pct=_partialCloseState?(_partialCloseState.percent||50):50;confirmPartialClose(selId,_pct);return;}
      if(act==="partial-cancel"){_partialCloseState=null;var _p1=getPaperPositionById(selId);if(_p1)renderPositionDetail(_p1);return;}
      if(act==="cancel"){cancelPendingOrderById(selId);return;}
      return;
    }
    var card=ev.target.closest?ev.target.closest(".dvlPosV2Card"):null;
    if(card){
      var ordId=card.getAttribute("data-dvl-order-id")||""; if(!ordId)return;
      var pos=getPaperPositionById(ordId); if(pos){renderPositionDetail(pos);}
      return;
    }
    var panel=elById("dvlPositionDetailsV2");
    if(panel&&panel.classList.contains("is-open")){
      var inDetails=ev.target.closest?ev.target.closest("#dvlPositionDetailsV2"):null;
      var inPositions=ev.target.closest?ev.target.closest("#dvlPositionsPanelV2"):null;
      var inNav=ev.target.closest?ev.target.closest("#dvlBottomNavV2"):null;
      if(!inDetails&&!inPositions&&!inNav)closeDetails();
    }
  }, true);

  window.DVL_POSITION_DETAILS_PANEL_0724 = {
    open: renderPositionDetail,
    close: closeDetails,
    getPaperPositionById: getPaperPositionById,
    maybeUpdateOpenPositionDetail: maybeUpdateOpenPositionDetail
  };\
"""

html = rep(html, OLD_EVENTS, NEW_EVENTS, "replace event handler + export")

# ── 6. Audit module ───────────────────────────────────────────────────────────
AUDIT_763 = """\
<script id="DVL_POSITIONS_DETAIL_ACTIONS_AUDIT_MODULE_0763">
(function(){
"use strict";
window.DVL_POSITIONS_DETAIL_ACTIONS_AUDIT_0763={run:function(){
  var bl=[];
  if(document.title.indexOf('0.763')<0)bl.push('01: title missing 0.763');
  if(document.body.innerHTML.indexOf('BETA 0.763')<0)bl.push('02: badge missing BETA 0.763');
  if(document.body.innerHTML.indexOf('Beta 0.763')<0)bl.push('03: changelog missing 0.763');
  if(typeof window.DVL_SELECTED_POSITION_ID==='undefined')bl.push('04: DVL_SELECTED_POSITION_ID missing');
  if(typeof window.getPaperPositionById!=='function')bl.push('05: getPaperPositionById missing');
  try{var r=window.getPaperPositionById('nonexistent-id-xyz');if(r!==null)bl.push('05b: getPaperPositionById should return null for unknown id');}catch(e){bl.push('05c: getPaperPositionById threw');}
  if(typeof window.renderPositionDetail!=='function')bl.push('10: renderPositionDetail missing');
  if(typeof window.maybeUpdateOpenPositionDetail!=='function')bl.push('13: maybeUpdateOpenPositionDetail missing');
  if(document.body.innerHTML.indexOf('data-dvl-detail-act="chart"')<0&&document.body.innerHTML.indexOf("data-dvl-detail-act=\"chart\"")>=0){}
  if(typeof window.DVL_LAST_PRICE_BY_SYMBOL==='undefined')bl.push('14: DVL_LAST_PRICE_BY_SYMBOL missing - PnL cache unavailable');
  if(typeof window.closePaperTradeToHistory!=='function')bl.push('29: closePaperTradeToHistory missing');
  if(typeof window.DVL_POSITIONS_REFRESH!=='function')bl.push('28b: DVL_POSITIONS_REFRESH missing');
  var det=window.DVL_POSITION_DETAILS_PANEL_0724;
  if(!det)bl.push('00: DVL_POSITION_DETAILS_PANEL_0724 missing');
  else{
    if(typeof det.open!=='function')bl.push('10b: detail panel open not a function');
    if(typeof det.close!=='function')bl.push('10c: detail panel close not a function');
    if(typeof det.getPaperPositionById!=='function')bl.push('05d: detail panel getPaperPositionById not exposed');
    if(det.data)bl.push('08: mock data object still present - should be removed');
  }
  if(!window.DVL_PAPER_REALTIME_ENGINE)bl.push('37: DVL_PAPER_REALTIME_ENGINE missing - 0.762 regression');
  if(!window.DVL_PAPER_TRADE_STORE)bl.push('11: DVL_PAPER_TRADE_STORE missing');
  if(typeof window.calcPaperPnl!=='function')bl.push('25b: calcPaperPnl missing - partial close PnL unavailable');
  if(typeof window.addTradeToHistory!=='function')bl.push('26: addTradeToHistory missing');
  if(typeof window.syncPaperStoreFromOrders!=='function')bl.push('11b: syncPaperStoreFromOrders missing');
  try{var _store=window.DVL_PAPER_TRADE_STORE;if(_store){var _th=_store.tradeHistory||[];if(_th.length>100)bl.push('35: tradeHistory exceeds 100');var _ids={};var _dup=false;_th.forEach(function(t){if(t&&t.id){if(_ids[t.id])_dup=true;_ids[t.id]=true;}});if(_dup)bl.push('36: tradeHistory has duplicate ids');}}catch(e){}
  return{pass:bl.length===0,blockers:bl,version:'0.763',checks:43};
}};
})();
</script>

"""

html = rep(html,
    '<script id="DVL_PAPER_REALTIME_MULTI_SYMBOL_AUDIT_MODULE_0762">',
    AUDIT_763 + '<script id="DVL_PAPER_REALTIME_MULTI_SYMBOL_AUDIT_MODULE_0762">',
    "insert 0763 audit module")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n=== Done — {html.count(chr(10))+1} lines ===")
