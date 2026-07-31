(function(){
"use strict";
if(window.DVL_POSITIONS_ADAPTER) return;

function lvPrc(){
  try{ if(window.ticker&&Number(window.ticker.lastPrice)>0) return Number(window.ticker.lastPrice); }catch(_){}
  try{ if(window.S&&Array.isArray(window.S.candles)&&window.S.candles.length){ var _c=window.S.candles[window.S.candles.length-1]; var _p=Number(_c.close||_c.c||0); if(Number.isFinite(_p)&&_p>0) return _p; } }catch(_){}
  return 0;
}
function _fp(v){ v=Number(v); if(!Number.isFinite(v)) return "--"; return v.toLocaleString("en-US",{minimumFractionDigits:v>=1000?2:3,maximumFractionDigits:v>=1000?2:4}); }
function _fm(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ft(v){ v=Number(v); if(!Number.isFinite(v)) v=0; var s=v>0?"+":(v<0?"-":""); return s+Math.abs(v).toFixed(2)+"%"; }

function readOrders(){
  var rows={open:[],pending:[],history:[]};
  var live=lvPrc();

  // Primary: DVL_PAPER_TRADING_V2_PRO
  if(window.DVL_PAPER_TRADING_V2_PRO){
    try{
      var _allOrds=typeof window.DVL_PAPER_TRADING_V2_PRO.getAllOrders==='function'?window.DVL_PAPER_TRADING_V2_PRO.getAllOrders():(function(){var _st=window.DVL_PAPER_TRADING_V2_PRO.getState();return _st&&Array.isArray(_st.orders)?_st.orders:[];})();
      var _curSym=(window.symbol&&String(window.symbol).toUpperCase())||'';
      if(Array.isArray(_allOrds)){
        for(var i=0;i<_allOrds.length;i++){
          var o=_allOrds[i];
          if(!o||o.status==="draft") continue;
          /* NORMALIZE o símbolo (tira barras/traços). Sem isto, uma ordem
             gravada como "TRX/USDT" virava chave "TRX/USDT" no mapa de preços
             (que é indexado por "TRXUSDT") → não achava o preço e mostrava "--";
             e o display saía "TRX//USDT" (barra dupla). Agora bate. */
          var sym=String(o.symbol||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
          var disp=sym.replace(/USDT$/i,"/USDT")||sym;
          var coin=sym.replace(/USDT$/i,"").toLowerCase();
          var buy=o.side==="buy";
          var ep=Number(o.entry)||0;
          var qty=Number(o.qty)||0;
          var _lpEntry=window.DVL_LAST_PRICE_BY_SYMBOL&&window.DVL_LAST_PRICE_BY_SYMBOL[sym];var _lv=(_lpEntry&&Number.isFinite(_lpEntry.price)&&_lpEntry.price>0)?_lpEntry.price:(sym===_curSym?live:0);
          var pv=_lv>0&&ep>0?(buy?(_lv-ep)*qty:(ep-_lv)*qty):0;
          var pc=_lv>0&&ep>0?(buy?((_lv-ep)/ep)*100:((ep-_lv)/ep)*100):0;
          var row={id:o.id,symbol:disp,coin:coin,side:buy?"Long":"Short",leverage:(Number(o.leverage)||1)+"x",entry:_fp(ep),current:_lv>0?_fp(_lv):"--",pnl:_lv>0?_fm(pv):"--",pct:_lv>0?_ft(pc):"--",direction:pv>=0?"positive":"negative"};
          if(o.status==="open"){ rows.open.push(row); }
          else if(o.status==="pending"){ row.current="Aguardando"; row.pnl="Pendente"; row.pct=o.orderLabel||(o.type||"Limite"); row.direction="positive"; rows.pending.push(row); }
          else if(o.status==="closed"){ var exitP=Number(o.exitPrice||o.closedPrice||0); if(exitP>0) row.current=_fp(exitP); var rpnl=Number(o.realizedPnl); var rpct=Number(o.realizedPnlPct); if(Number.isFinite(rpnl)){ row.pnl=_fm(rpnl); row.direction=rpnl>=0?"positive":"negative"; } if(Number.isFinite(rpct)) row.pct=_ft(rpct); rows.history.push(row); }
        }
        return rows;
      }
    }catch(_){}
  }

  // Fallback: legacy runtime
  var rt=window.__dvlPaperRuntime0581||window.__dvlPaperRuntime0582||window.__dvlPaperRuntime0580||window.__dvlPaperRuntime;
  if(rt&&rt.state&&Array.isArray(rt.state.positions)){
    for(var j=0;j<rt.state.positions.length;j++){
      var pos=rt.state.positions[j];
      if(!pos) continue;
      var sym2=String(pos.symbol||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
      var disp2=sym2.replace(/USDT$/i,"/USDT")||sym2;
      var coin2=sym2.replace(/USDT$/i,"").toLowerCase();
      var buy2=pos.side==="buy";
      var ep2=Number(pos.entry)||0;
      var qty2=Number(pos.qty)||0;
      var pv2=live>0&&ep2>0?(buy2?(live-ep2)*qty2:(ep2-live)*qty2):0;
      var pc2=live>0&&ep2>0?(buy2?((live-ep2)/ep2)*100:((ep2-live)/ep2)*100):0;
      var row2={id:pos.id||"",symbol:disp2,coin:coin2,side:buy2?"Long":"Short",leverage:(Number(pos.leverage)||1)+"x",entry:_fp(ep2),current:live>0?_fp(live):"--",pnl:_fm(pv2),pct:_ft(pc2),direction:pv2>=0?"positive":"negative"};
      if(pos.status==="open"){ rows.open.push(row2); }
      else if(pos.status==="pending"){ row2.current="Aguardando"; row2.pnl="Pendente"; row2.pct=pos.orderType||"Limite"; row2.direction="positive"; rows.pending.push(row2); }
    }
  }

  return rows;
}

window.DVL_POSITIONS_ADAPTER={
  readOrders:readOrders
};

window.DVL_POSITIONS_REFRESH=function(){
  try{
    var ov=window.DVL_POSITIONS_WATCHLIST_OVERLAY_0722;
    if(ov&&typeof ov.refresh==="function") ov.refresh();
  }catch(_){}
};

document.addEventListener("dvl:paper-v2-close",function(){ window.DVL_POSITIONS_REFRESH(); });
document.addEventListener("dvl:paper-position",function(){ window.DVL_POSITIONS_REFRESH(); });
document.addEventListener("dvl:paper-position-closed",function(){ window.DVL_POSITIONS_REFRESH(); });
})();
