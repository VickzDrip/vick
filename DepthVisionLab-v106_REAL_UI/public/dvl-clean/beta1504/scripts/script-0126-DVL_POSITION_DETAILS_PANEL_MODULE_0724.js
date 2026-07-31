(function(){
  "use strict";

  if(window.DVL_POSITION_DETAILS_PANEL_0724) return;

  // ── global selection state ───────────────────────────────────────────────
  window.DVL_SELECTED_POSITION_ID = null;
  window.DVL_SELECTED_POSITION_SYMBOL = null;
  var _partialCloseState = null;
  var _PFX_D = 'dvl_paper_v2_pro_0695_';

  function elById(id){ return document.getElementById(id); }

  function normSym(sym){if(!sym)return'';return String(sym).replace('/','').replace('-','').toUpperCase();}

  // ── find order by ID from ALL symbols ───────────────────────────────────
  function getPaperPositionById(id){
    if(!id)return null; id=String(id);
    /* Ground truth first: V2.getAllOrders() always scans localStorage + live
       memory fresh on every call (see Beta 1.038), so it reflects the real
       current status. DVL_PAPER_TRADE_STORE.openPositions/pendingOrders is
       only a CACHE that gets refreshed reactively on specific events — a
       trade closed by the background TP/SL engine (which can fire while a
       different symbol is on screen) could leave a stale "still open" copy
       sitting in that cache if a sync was missed, which used to make the
       detail popup show a frozen, wrong snapshot of an already-closed trade
       (e.g. the position card in Histórico showed the real closed PnL, but
       tapping into it opened live/open-management actions with stale
       numbers). Checking the live source first removes that whole class of
       mismatch. tradeHistory is checked next since closed orders processed
       by the background engine are removed from the live arrays entirely and
       only survive there. */
    try{
      var V2=window.DVL_PAPER_TRADING_V2_PRO;
      if(V2&&typeof V2.getAllOrders==='function'){
        var _live=V2.getAllOrders();
        if(Array.isArray(_live)){for(var _l=0;_l<_live.length;_l++){if(_live[_l]&&String(_live[_l].id)===id)return _live[_l];}}
      }
    }catch(_){}
    var store=window.DVL_PAPER_TRADE_STORE;
    if(store){
      var _sa=(store.openPositions||[]).concat(store.pendingOrders||[]).concat(store.tradeHistory||[]);
      for(var _i=0;_i<_sa.length;_i++){if(_sa[_i]&&String(_sa[_i].id)===id)return _sa[_i];}
    }
    try{var V2b=window.DVL_PAPER_TRADING_V2_PRO;if(V2b){var _st=V2b.getState();if(_st&&Array.isArray(_st.orders)){for(var _j=0;_j<_st.orders.length;_j++){if(_st.orders[_j]&&String(_st.orders[_j].id)===id)return _st.orders[_j];}}}}catch(_){}
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
    if(coin === "btc") return "B";
    if(coin === "eth") return "E";
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
  }

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
  window.maybeUpdateOpenPositionDetail=maybeUpdateOpenPositionDetail;

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
  };
})();
