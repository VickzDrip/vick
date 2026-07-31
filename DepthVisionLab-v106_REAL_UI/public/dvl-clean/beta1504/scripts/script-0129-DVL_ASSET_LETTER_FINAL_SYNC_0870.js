(function(){
  "use strict";
  if(window.DVL_ASSET_LETTER_FINAL_SYNC_0870) return;
  window.DVL_ASSET_LETTER_FINAL_SYNC_0870 = true;
  function norm(v){return window.dvlNormalizeAssetSymbol?window.dvlNormalizeAssetSymbol(v):String(v||"").trim().toUpperCase().replace(/[\/_-]/g,"");}
  function cur(){try{if(typeof symbol!=="undefined"&&symbol)return norm(symbol);}catch(_){}var e=document.getElementById("symbolText")||document.getElementById("dvl1b_symbolText");return e?norm(e.textContent):"BTCUSDT";}
  function paint(el,s){if(window.dvlPaintAssetLetterIcon)window.dvlPaintAssetLetterIcon(el,s);}
  function sync(){
    var c=cur();
    document.querySelectorAll("#symbolBtn .btc,.symbolBtn .btc,.marketRow .btc,#DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin").forEach(function(el){paint(el,c);});
    document.querySelectorAll(".assetOption[data-symbol]").forEach(function(row){var coin=row.querySelector(".assetCoin");if(coin)paint(coin,row.getAttribute("data-symbol"));});
    document.querySelectorAll("#dvlScannerPanel0780 .dvlScan080Card").forEach(function(card){var coin=card.querySelector(".dvlScan080Coin");if(coin)paint(coin,card.getAttribute("data-mexc")||card.getAttribute("data-symbol")||"");});
  }
  function soon(){[0,60,180,420,900,1600].forEach(function(t){setTimeout(sync,t);});}
  var oldR=window.renderAssetDropdown;
  if(typeof oldR==="function"&&!oldR.__dvl0870){
    var nr=function(){var out=oldR.apply(this,arguments);soon();return out;};
    nr.__dvl0870=true;window.renderAssetDropdown=nr;
  }
  var oldS=window.selectSymbol;
  if(typeof oldS==="function"&&!oldS.__dvl0870){
    var ns=function(){var out=oldS.apply(this,arguments);soon();return out;};
    ns.__dvl0870=true;window.selectSymbol=ns;
  }
  document.addEventListener("click",soon,true);
  document.addEventListener("touchend",soon,{capture:true,passive:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",soon,{once:true});else soon();
})();
