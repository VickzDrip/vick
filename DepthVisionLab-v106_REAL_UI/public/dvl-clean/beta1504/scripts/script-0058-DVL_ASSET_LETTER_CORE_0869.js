(function(){
  "use strict";
  if(window.DVL_ASSET_LETTER_CORE_0869) return;
  window.DVL_ASSET_LETTER_CORE_0869 = true;
  function norm(v){return String(v||"").trim().toUpperCase().replace(/[\/_\-]/g,"");}
  function baseOf(v){return norm(v).replace(/(USDT|BUSD|USDC|USD|BTC|ETH)$/i,"");}
  function firstLetter(v){var b=baseOf(v).replace(/^[0-9]+/,"");var m=b.match(/[A-Z]/);return m?m[0]:"?";}
  function hash(v){v=baseOf(v)||"DVL";var h=0;for(var i=0;i<v.length;i++)h=((h<<5)-h+v.charCodeAt(i))|0;return Math.abs(h);}
  function cls(v){var b=baseOf(v);var map={BTC:"dvlLetterBTC",ETH:"dvlLetterETH",SOL:"dvlLetterSOL",BNB:"dvlLetterBNB",XRP:"dvlLetterXRP",ADA:"dvlLetterADA",DOGE:"dvlLetterDOGE",AVAX:"dvlLetterAVAX",LINK:"dvlLetterLINK",LTC:"dvlLetterLTC",DOT:"dvlLetterDOT",NEAR:"dvlLetterNEAR",SUI:"dvlLetterSUI",AR:"dvlLetterAR",POL:"dvlLetterPOL",ETC:"dvlLetterETC",BCH:"dvlLetterBCH",FIL:"dvlLetterFIL",ATOM:"dvlLetterATOM",TRX:"dvlLetterTRX",XLM:"dvlLetterXLM",ICP:"dvlLetterICP",HBAR:"dvlLetterHBAR",PEPE:"dvlLetterPEPE",WIF:"dvlLetterWIF",BONK:"dvlLetterBONK",INJ:"dvlLetterINJ",SEI:"dvlLetterSEI",UNI:"dvlLetterUNI",AAVE:"dvlLetterAAVE",GRT:"dvlLetterGRT",MKR:"dvlLetterMKR",FTM:"dvlLetterFTM"};return map[b]||("dvlLetterAuto"+(hash(b)%24));}
  function current(){try{if(typeof symbol!=="undefined"&&symbol)return norm(symbol);}catch(_){}var e=document.getElementById("dvl1b_symbolText")||document.getElementById("symbolText");return e?norm(e.textContent):"BTCUSDT";}
  function paint(el,s){if(!el)return;var clean=norm(s)||current();/* Idempotent: if this icon is already painted for the same symbol, do NOT touch the DOM — rewriting text/classes on every click/refresh is what makes the asset logo flick. */if(el.getAttribute("data-dvl-symbol")===clean&&el.classList.contains("dvlAssetLetterIcon"))return;el.textContent=firstLetter(clean);el.classList.remove("btcCoin","ethCoin","solCoin","bnbCoin","xrpCoin","adaCoin","dogeCoin","avaxCoin","linkCoin","ltcCoin","genericCoin","coin-btc","coin-eth","coin-sol","coin-bnb","coin-xrp","coin-ada","coin-doge","coin-avax","coin-link","coin-ltc","coin-generic");el.classList.add(cls(clean),"dvlAssetLetterIcon");el.setAttribute("data-dvl-symbol",clean);}
  window.dvlNormalizeAssetSymbol=norm;window.dvlAssetBaseSymbol=baseOf;window.dvlAssetFirstLetter=firstLetter;window.dvlAssetLetterClass=cls;window.dvlPaintAssetLetterIcon=paint;
})();
