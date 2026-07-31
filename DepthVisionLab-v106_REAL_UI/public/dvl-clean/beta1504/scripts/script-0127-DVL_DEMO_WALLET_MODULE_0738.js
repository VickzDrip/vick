(function(){
"use strict";
if(window.DVL_DEMO_WALLET_0738) return;

function calcWallet(){
  var w=window.DVL_DEMO_WALLET;
  if(w)return Number.isFinite(w.equity)?w.equity:(Number.isFinite(w.balance)?w.balance:10000);
  return 10000;
}

function updateDisplay(){
  var el=document.getElementById("dvlWalletValue");
  if(!el) return;
  var w=calcWallet();
  el.textContent=w.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

function resetWallet(){
  var v2=window.DVL_PAPER_TRADING_V2_PRO;
  if(v2){
    try{ var st=v2.getState(); if(st){ st.orders=[]; st.selectedId=null; st.drag=null; st.edit=null; } }catch(_){}
    try{
      var keys=[];
      for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
      for(var j=0;j<keys.length;j++) if(String(keys[j]).indexOf("dvl_paper_v2_pro_0695_")===0) try{ localStorage.removeItem(keys[j]); }catch(_){}
    }catch(_){}
    try{ v2.render(); }catch(_){}
  }
  try{localStorage.removeItem('DVL_DEMO_WALLET_0764');}catch(_){}
  var w=window.DVL_DEMO_WALLET;
  if(w){w.balance=10000;w.availableBalance=10000;w.usedMargin=0;w.equity=10000;w.unrealizedPnl=0;w.realizedPnl=0;w.totalFees=0;}
  var store=window.DVL_PAPER_TRADE_STORE;
  if(store){store.pendingOrders=[];store.openPositions=[];store.tradeHistory=[];}
  try{ if(typeof window.savePaperTradeStore==='function')window.savePaperTradeStore(); }catch(_){}
  try{ if(window.DVL_POSITIONS_REFRESH) window.DVL_POSITIONS_REFRESH(); }catch(_){}
  updateDisplay();
}

function addStyles(){
  if(document.getElementById("DVL_DEMO_WALLET_STYLE_0740")) return;
  var s=document.createElement("style");
  s.id="DVL_DEMO_WALLET_STYLE_0740";
  s.textContent=
    ".dvlDemoReset{background:none!important;border:none!important;color:var(--orange)!important;"
    "opacity:.60!important;cursor:pointer!important;font-size:16px!important;line-height:1!important;"
    "padding:0!important;display:inline-flex!important;align-items:center!important;"
    "justify-content:center!important;align-self:stretch!important;aspect-ratio:1!important;"
    "margin-left:4px!important;}"
    ".dvlDemoReset:hover,.dvlDemoReset:active{opacity:1!important;}";
  (document.head||document.documentElement).appendChild(s);
}

function init(){
  addStyles();
  var btn=document.getElementById("dvlDemoResetBtn");
  if(btn) btn.addEventListener("click",function(ev){ ev.preventDefault(); ev.stopPropagation(); resetWallet(); },false);
  window.addEventListener("dvl:paper-v2-close", updateDisplay, false);
  updateDisplay();
}

window.DVL_DEMO_WALLET_0738={calc:calcWallet,reset:resetWallet,update:updateDisplay};

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
