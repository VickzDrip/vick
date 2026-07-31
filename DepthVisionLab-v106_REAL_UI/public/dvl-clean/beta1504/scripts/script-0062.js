/* Paint the header asset icon + symbol SYNCHRONOUSLY here at parse time, from
         the saved symbol — before the browser can do any intermediate paint of the static
         BTC default. Only restores list symbols (same rule as loadAppSettings) so it can
         never diverge from what the app loads. Later painters are idempotent (data-dvl-symbol
         guard) and keep this. */
      try{(function(){
        var LIST=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","LINKUSDT","LTCUSDT"];
        var ss=null; try{ var o=JSON.parse(localStorage.getItem("DVL_APP_SETTINGS_V1")||"null"); if(o&&o.symbol) ss=String(o.symbol); }catch(_){}
        if(!ss) return; var c=ss.trim().toUpperCase().replace(/[\/_\-]/g,""); if(LIST.indexOf(c)<0||c==="BTCUSDT") return;
        var base=c.replace(/(USDT|BUSD|USDC|USD|BTC|ETH)$/i,""); var lm=base.replace(/^[0-9]+/,"").match(/[A-Z]/); var letter=lm?lm[0]:"?";
        var map={BTC:"dvlLetterBTC",ETH:"dvlLetterETH",SOL:"dvlLetterSOL",BNB:"dvlLetterBNB",XRP:"dvlLetterXRP",ADA:"dvlLetterADA",DOGE:"dvlLetterDOGE",AVAX:"dvlLetterAVAX",LINK:"dvlLetterLINK",LTC:"dvlLetterLTC"};
        var cls=map[base]||"dvlLetterGeneric";
        var coin=document.querySelector("#DVL_UI_OVERLAY_PHASE_1B .dvl1b-coin");
        if(coin){ coin.textContent=letter; coin.className="dvl1b-coin dvlAssetLetterIcon "+cls; coin.setAttribute("data-dvl-symbol",c); }
        var st=document.getElementById("dvl1b_symbolText"); if(st) st.textContent=c.replace(/USDT$/,"/USDT");
      })();}catch(_){}
