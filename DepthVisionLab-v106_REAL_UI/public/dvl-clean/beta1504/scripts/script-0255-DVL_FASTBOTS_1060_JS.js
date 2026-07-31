/* Fast Bots — four competing entry strategies, each with its own isolated
   $1,000 virtual wallet, racing to see which actually performs. 100%
   simulated: never sends an order anywhere, never touches an API key or
   the user's real paper-trading state — own localStorage keys, own
   module.

   The combos (fixed, per bot — this is a controlled experiment, so they
   don't drift). Bots 1-2 are the original hand-picked pairs; Bots 3-7 are
   the five block-pairs the ML's own combo-importance ranking scored
   highest ("Combinações que mais pesam"), turned into live paper bots so
   their real forward P&L can be compared head-to-head. All LONG (every
   block here is a bullish/oversold-bounce read; the scanner is LONG-only
   since SHORT was removed):
     Bot 1: OI acima da média + LSR abaixo da média
     Bot 2: Pré-volume baixo + OI subindo
     Bot 3: Spike acima da média + RSI sobrevenda
     Bot 4: OI acima da média + Pré-volume baixo
     Bot 5: RSI sobrevenda + OI acima da média
     Bot 6: RSI sobrevenda + LSR abaixo da média
     Bot 7: LSR abaixo da média + Pré-volume baixo
   (An earlier Bot 3 shorted on a net-flow read and an earlier Bot 4
   followed MEXC's live order flow; both were removed in favour of this
   ML-ranked block-pair lineup — the order-flow relay/WebSocket machinery
   went with them.)

   Entries are fixed $100 slices of the $1,000 (max 5 open per bot = at
   most half the wallet deployed). The EXIT is now per-bot (each bot's
   `exit` config, resolved onto the position in tryOpen) — that's the
   whole point of this iteration: seven different exit styles racing so
   you can eyeball the most assertive one. Some use an ATR stop (atrMult
   × ATR14), one uses a fixed % of entry, one trails, some take a partial
   at +1R and some don't, targets range from +1R to +3R, timeouts 45-90
   min. R = the position's own risk distance (stored as pos.r).
   row.atr14 comes free in the snapshot (worker.js computes it from
   klines it already fetches); if a row doesn't carry it (backend not
   restarted yet / new listing), the bot fetches ATR itself once at entry,
   same pattern as the Bot Demo. Because the exit rules changed shape,
   all seven wallets reset to fresh localStorage keys (_e1) — old
   positions were opened under the old single-exit model and can't be
   re-scored under the new per-position params.

   Freshness + cooldown keep it honest as a FAST bot: only rows detected
   in the last 30 min are eligible (registry rows persist for hours —
   without this, page load would instantly buy every stale signal whose
   combo still reads true), and a symbol a bot just closed can't be
   re-entered by that bot for 30 min (the combo usually still reads true
   right after an exit — without this it would ping-pong).

   Binance-shaped symbols ("BTCUSDT") are the norm, but a row can arrive
   in MEXC's own "BTC_USDT" format during a Binance-outage fallback (the
   backend serves MEXC data under the "binance" snapshot then) — tryOpen
   and checkPositions branch on the symbol's own shape so those still get
   MEXC's ATR/price lookups (see fetchMexcAtr / the /mexc-price merge). */
(function(){
  "use strict";
  if(window.DVL_FASTBOTS_1060) return;

  var START_BALANCE=1000;
  var ENTRY_DOLLARS=100;       // one "fração" per entry
  var MAX_OPEN=5;              // per bot -> at most $500 of the $1000 deployed
  var ATR_PERIOD=14;
  var MAX_HOLD_MS=45*60000;    // fallback timeout only — each bot sets its own holdMin (see BOTS[].exit)
  var FRESH_MS=30*60000;       // default eligibility window (see FRESH_MS_BY_TF)
  /* Eligibility window scaled per TF: a 30-min window is 6 candles on 5m but
     only half a candle on 1h, which would starve the slow TFs of entries and
     make the per-TF comparison unfair. Give each TF a window of a few of its
     own candles instead. */
  var FRESH_MS_BY_TF={ "5m":30*60000, "15m":45*60000, "30m":60*60000, "1h":120*60000 };
  var COOLDOWN_MS=30*60000;    // per bot+symbol, after a close
  var TFS=["5m","15m","30m","1h"];
  var SIGNAL_POLL_MS=60000;    // matches the backend's own refresh cadence
  var PRICE_POLL_MS=20000;     // exits need to be quicker than entries
  var MAX_HISTORY=40;
  var REASON_LABEL={tp2:"alvo", stop:"stop", be:"b.e.", trail:"trailing", timeout:"tempo", stale:"sem preço"};

  /* Bots 1-2: original hand-picked pairs. Bots 3-7: the ML's top-5
     highest-weighted block combos ("Combinações que mais pesam"). All
     LONG. Each bot now ALSO carries its own exit method (`exit`) — the
     experiment compares full packages (entry combo + exit style) so you
     can eyeball which combination is most assertive. exit fields:
       atrMult   stop distance = atrMult × ATR   (ignored if usePct)
       usePct/stopPct/tpPct  percentage-of-entry stop/target instead of ATR
       tp1R/tp1Frac/be  partial take at tp1R (in R), close tp1Frac of it,
                        move stop to breakeven after (tp1R null = no partial)
       tp2R      final target in R (null = no fixed target: trail/timeout)
       trailMult trailing stop distance in ATR once in profit (null = none)
       holdMin   timeout in minutes */
  var BOTS=[
    { id:"b1", name:"Bot 1", side:"LONG", ls:"dvl_fastbot_b1_e2",
      comboLabel:"OI acima da média + LSR abaixo da média",
      exit:{ label:"Metade no +1R → resto +2R (stop 1x ATR)", atrMult:1.0, tp1R:1, tp1Frac:0.5, be:true, tp2R:2, holdMin:45 },
      match:function(r){ return !!(r.blocks && r.blocks.oiAboveAvg && r.blocks.lsrBelowAvg); } },
    { id:"b2", name:"Bot 2", side:"LONG", ls:"dvl_fastbot_b2_e2",
      comboLabel:"Pré-volume baixo + OI subindo",
      exit:{ label:"Stop largo 1.5x ATR, metade no +1R → resto +2R", atrMult:1.5, tp1R:1, tp1Frac:0.5, be:true, tp2R:2, holdMin:45 },
      match:function(r){ return !!(r.blocks && r.blocks.prevVolBelowHalf && Number(r.oiSlope)>0); } },
    { id:"b3", name:"Bot 3", side:"LONG", ls:"dvl_fastbot_b3_e2",
      comboLabel:"Spike acima da média + RSI sobrevenda",
      exit:{ label:"Deixa correr: 1/3 no +1R → resto +3R (stop 1.5x)", atrMult:1.5, tp1R:1, tp1Frac:0.334, be:true, tp2R:3, holdMin:60 },
      match:function(r){ return !!(r.blocks && r.blocks.spikeAboveAvg && r.blocks.rsiOversold); } },
    { id:"b4", name:"Bot 4", side:"LONG", ls:"dvl_fastbot_b4_e2",
      comboLabel:"OI acima da média + Pré-volume baixo",
      exit:{ label:"Alvo único +1R, fecha tudo (rápido)", atrMult:1.0, tp1R:null, tp2R:1, holdMin:45 },
      match:function(r){ return !!(r.blocks && r.blocks.oiAboveAvg && r.blocks.prevVolBelowHalf); } },
    { id:"b5", name:"Bot 5", side:"LONG", ls:"dvl_fastbot_b5_e2",
      comboLabel:"RSI sobrevenda + OI acima da média",
      exit:{ label:"Trailing 1.5x ATR, sem alvo fixo", atrMult:1.5, tp1R:null, tp2R:null, trailMult:1.5, holdMin:90 },
      match:function(r){ return !!(r.blocks && r.blocks.rsiOversold && r.blocks.oiAboveAvg); } },
    { id:"b6", name:"Bot 6", side:"LONG", ls:"dvl_fastbot_b6_e2",
      comboLabel:"RSI sobrevenda + LSR abaixo da média",
      exit:{ label:"% fixo: stop -1% / alvo +2%", usePct:true, stopPct:0.01, tpPct:0.02, tp1R:null, holdMin:45 },
      match:function(r){ return !!(r.blocks && r.blocks.rsiOversold && r.blocks.lsrBelowAvg); } },
    { id:"b7", name:"Bot 7", side:"LONG", ls:"dvl_fastbot_b7_e2",
      comboLabel:"LSR abaixo da média + Pré-volume baixo",
      exit:{ label:"Stop largo 2x ATR, alvo +2R, segura 90min", atrMult:2.0, tp1R:null, tp2R:2, holdMin:90 },
      match:function(r){ return !!(r.blocks && r.blocks.lsrBelowAvg && r.blocks.prevVolBelowHalf); } }
  ];
  var DEFAULT_EXIT={ label:"Padrão", atrMult:1.0, tp1R:1, tp1Frac:0.5, be:true, tp2R:2, holdMin:45 };

  function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function fmtMoney(v){ v=Number(v)||0; return (v<0?"-":"")+"$"+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtPct(v){ v=Number(v)||0; return (v>=0?"+":"")+v.toFixed(2)+"%"; }

  function defaultWallet(){ return { balance:START_BALANCE, positions:[], history:[], startedAt:Date.now() }; }
  function loadWallet(key){
    try{
      var w=JSON.parse(localStorage.getItem(key)||"null");
      if(w && typeof w.balance==="number" && Array.isArray(w.positions) && Array.isArray(w.history)) return w;
    }catch(_){}
    return defaultWallet();
  }
  var wallets={};
  BOTS.forEach(function(b){ wallets[b.id]=loadWallet(b.ls); });
  function persist(bot){ try{ localStorage.setItem(bot.ls, JSON.stringify(wallets[bot.id])); }catch(_){} }

  /* Relative fetch, same as ml-status/backtest/divergence — the app and
     the backend API live on the same origin here, so there's no base-URL
     config to get wrong (an earlier version required localStorage's
     dvlScannerBackendUrl to be set, like the old Bot Demo did; dropped —
     it was an unnecessary extra failure point no other Copilot card
     actually needed). */
  async function fetchJson(url){
    var r=await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("HTTP "+r.status);
    return await r.json();
  }

  function hasOpen(bot,symbol){ return wallets[bot.id].positions.some(function(p){ return p.symbol===symbol; }); }
  function inCooldown(bot,symbol,now){
    return wallets[bot.id].history.some(function(h){ return h.symbol===symbol && (now-(h.closedAt||0))<COOLDOWN_MS; });
  }

  /* ATR fallback for rows that don't carry atr14 yet — one klines call,
     only at entry time (see module doc-comment). */
  async function fetchAtr(symbol,tf){
    try{
      var d=await fetchJson("https://fapi.binance.com/fapi/v1/klines?symbol="+encodeURIComponent(symbol)+"&interval="+encodeURIComponent(tf)+"&limit="+(ATR_PERIOD+5));
      if(!Array.isArray(d)||d.length<ATR_PERIOD+1) return null;
      var trs=[];
      for(var i=1;i<d.length;i++){
        var h=Number(d[i][2]), l=Number(d[i][3]), pc=Number(d[i-1][4]);
        if(!(h>0)||!(l>0)||!(pc>0)) continue;
        trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
      }
      if(trs.length<ATR_PERIOD) return null;
      var last=trs.slice(-ATR_PERIOD), sum=0;
      for(var j=0;j<last.length;j++) sum+=last[j];
      return sum/last.length;
    }catch(_){ return null; }
  }

  /* Bot 4's own ATR fallback — goes through our own backend (same reason
     as fetchTopVolumeSymbols/checkPositions above: a direct browser fetch
     to contract.mexc.com is blocked in practice). The backend already has
     mexc.klines() + M.computeAtr() for this exact 14-period formula, so
     this just asks it for one symbol on demand instead of duplicating
     MEXC's kline shape client-side. */
  async function fetchMexcAtr(symbol,tf){
    try{
      var d=await fetchJson("/api/dvl/scanner/mexc-atr?symbol="+encodeURIComponent(symbol)+"&tf="+encodeURIComponent(tf));
      var atr=Number(d&&d.atr);
      return atr>0 ? atr : null;
    }catch(_){ return null; }
  }

  async function tryOpen(bot,row,tf){
    var w=wallets[bot.id];
    /* Keeps the underscore ("BTC_USDT") for Bot 4's MEXC symbols instead of
       stripping it like every other non-alnum char — otherwise a MEXC
       "BTC_USDT" position would collapse to "BTCUSDT" and collide with
       (or get silently merged into) a Binance-sourced position from Bots
       1-3 for the same base pair. */
    var symbol=String(row.rawSymbol||row.symbol||"").toUpperCase().replace(/[^A-Z0-9_]/g,"");
    var price=Number(row.price)||0;
    var now=Date.now();
    if(!symbol || !(price>0)) return;
    if(w.positions.length>=MAX_OPEN) return;
    if(w.balance<ENTRY_DOLLARS) return;
    if(hasOpen(bot,symbol) || inCooldown(bot,symbol,now)) return;

    /* Which exchange's ATR fallback applies is about the SYMBOL's own
       shape, not which bot opened it — Bots 1-3 can end up trading a
       MEXC-shaped row too during a Binance-outage fallback cycle (see
       scanSignals), so "_" in the symbol, not bot.id==="b4", is what
       actually decides it. */
    var ex=bot.exit||DEFAULT_EXIT;
    var atr=Number(row.atr14)||0;
    /* % mode (Bot 6) doesn't need ATR at all — everything is off the entry
       price. ATR modes still need a real ATR for the stop distance. */
    if(!ex.usePct){
      if(!(atr>0)) atr=await (symbol.indexOf("_")>=0 ? fetchMexcAtr(symbol,tf) : fetchAtr(symbol,tf))||0;
      if(!(atr>0)) return;
    }
    var qty=ENTRY_DOLLARS/price;
    /* All 7 bots are LONG — sl below entry, targets above. r is the risk
       distance in price; each bot's exit config decides how it's derived
       and which targets exist. Resolved params are stored ON the position
       so it keeps its own rules even if bot.exit is later changed. */
    var r=ex.usePct ? price*(Number(ex.stopPct)||0.01) : atr*(Number(ex.atrMult)||1);
    var tp1=(ex.tp1R!=null) ? price + r*Number(ex.tp1R) : null;
    var tp2;
    if(ex.usePct && ex.tpPct!=null) tp2=price*(1+Number(ex.tpPct));
    else if(ex.tp2R!=null) tp2=price + r*Number(ex.tp2R);
    else tp2=null;
    w.positions.push({
      id:"fb_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
      symbol:symbol, tf:tf, entry:price, qty:qty, size:ENTRY_DOLLARS,
      r:r, sl: price-r, tp1:tp1, tp2:tp2,
      tp1Frac:Number(ex.tp1Frac)||0.5, be:!!ex.be, trailMult:(ex.trailMult!=null?Number(ex.trailMult):null),
      atr:atr, halfTaken:false, closedFrac:0, realized:0, openedAt:now,
      holdMs:(Number(ex.holdMin)||45)*60000
    });
    w.balance-=ENTRY_DOLLARS;
    persist(bot);
    render();
  }

  function pnlOf(bot,pos,price,qty){
    return bot.side==="SHORT" ? (pos.entry-price)*qty : (price-pos.entry)*qty;
  }

  function closeRest(bot,pos,price,reason){
    var w=wallets[bot.id];
    var idx=w.positions.indexOf(pos);
    if(idx<0) return;
    w.positions.splice(idx,1);
    var remFrac=1-(pos.closedFrac||0);
    var remQty=pos.qty*remFrac, remSize=pos.size*remFrac;
    var pnl=(pos.realized||0)+pnlOf(bot,pos,price,remQty);
    w.balance+=remSize+pnlOf(bot,pos,price,remQty);
    w.history.unshift({ symbol:pos.symbol, tf:pos.tf, entry:pos.entry, exit:price, pnl:pnl, pnlPct:(pnl/pos.size)*100, reason:reason, halfTaken:pos.halfTaken, openedAt:pos.openedAt, closedAt:Date.now() });
    if(w.history.length>MAX_HISTORY) w.history.length=MAX_HISTORY;
    persist(bot);
  }

  /* Partial take at tp1: closes tp1Frac of the position (half, a third,
     whatever the bot's exit config says), banks the profit, and — if the
     exit config asks for it — moves the stop to breakeven so the rest
     can't turn into a loss. Bots whose exit has tp1R:null never call this. */
  function takeHalf(bot,pos,price){
    var w=wallets[bot.id];
    var frac=Number(pos.tp1Frac)||0.5;
    var partQty=pos.qty*frac, partSize=pos.size*frac;
    var pnl=pnlOf(bot,pos,price,partQty);
    w.balance+=partSize+pnl;
    pos.realized=(pos.realized||0)+pnl;
    pos.closedFrac=frac;
    pos.halfTaken=true;
    if(pos.be) pos.sl=pos.entry; // breakeven
    persist(bot);
  }

  var _lastPriceMap={};

  async function checkPositions(){
    var any=BOTS.some(function(b){ return wallets[b.id].positions.length>0; });
    if(!any) return;
    try{
      /* One batched call regardless of how many positions/bots — Binance's
         ticker/price with no symbol param returns everything at once. */
      var arr=await fetchJson("https://fapi.binance.com/fapi/v1/ticker/price");
      var map={};
      (Array.isArray(arr)?arr:[]).forEach(function(t){ map[t.symbol]=Number(t.price); });
      /* MEXC symbols ("BTC_USDT") never show up in Binance's price map
         above — a second batched call covers those, merged into the same
         map (the two symbol formats can't collide: MEXC always keeps its
         underscore, Binance's never has one). Goes through our own
         backend (same reason as fetchTopVolumeSymbols above): a direct
         browser fetch to contract.mexc.com is blocked in practice.
         Checked across ALL bots, not just Bot 4 — Bots 1-3 can end up
         holding a MEXC-shaped position too during a Binance-outage
         fallback cycle (see scanSignals). */
      var anyMexcPosition=BOTS.some(function(b){ return wallets[b.id].positions.some(function(p){ return p.symbol.indexOf("_")>=0; }); });
      if(anyMexcPosition){
        try{
          var mexcResp=await fetchJson("/api/dvl/scanner/mexc-price");
          var prices=(mexcResp&&mexcResp.prices)||{};
          Object.keys(prices).forEach(function(sym){ map[sym]=Number(prices[sym]); });
        }catch(_){}
      }
      _lastPriceMap=map;
      var now=Date.now();
      BOTS.forEach(function(bot){
        wallets[bot.id].positions.slice().forEach(function(pos){
          var holdMs=Number(pos.holdMs)||MAX_HOLD_MS;
          var price=map[pos.symbol];
          if(!(price>0)){
            /* Safety net: a position whose price can NEVER be resolved
               (wrong-exchange symbol leaking in, a delisting, etc.) must
               still not sit open forever. Force-close flat (0%) at its own
               entry price once past its hold limit, instead of silently
               deadlocking one of this bot's MAX_OPEN slots. */
            if((now-pos.openedAt)>=holdMs) closeRest(bot,pos,pos.entry,"stale");
            return;
          }
          /* Trailing stop (LONG): once price runs up, ratchet the stop up
             behind it by trailMult×ATR — never lower it. Bots without a
             trailMult skip this and keep their fixed stop/BE. */
          if(pos.trailMult && pos.atr>0){
            var trailStop=price-Number(pos.trailMult)*pos.atr;
            if(trailStop>pos.sl) pos.sl=trailStop;
          }
          var hitTp2=(pos.tp2!=null) && price>=pos.tp2;
          var hitTp1=(pos.tp1!=null) && !pos.halfTaken && price>=pos.tp1;
          var hitSl=price<=pos.sl;
          var timedOut=(now-pos.openedAt)>=holdMs;
          if(hitTp2){ closeRest(bot,pos,price,"tp2"); return; }
          if(hitTp1){ takeHalf(bot,pos,price); }
          if(hitSl){
            /* Reason label: a trailing stop that ratcheted above entry, or
               a breakeven stop after a partial, is not a "loss" stop. */
            var slReason=(pos.sl>pos.entry) ? (pos.trailMult?"trail":"be") : (pos.halfTaken?"be":"stop");
            closeRest(bot,pos,price,slReason); return;
          }
          if(timedOut){ closeRest(bot,pos,price,"timeout"); }
        });
      });
      render();
    }catch(_){}
  }

  /* An earlier Bot 4 followed MEXC's live order flow over a backend-relayed
     WebSocket; that whole machinery (connectAggWs / checkAggression /
     radar / the /ws/dvl/agg relay) was removed when Bot 4 became a plain
     block-combo bot like the rest. The only MEXC-specific pieces still
     here are fetchMexcAtr and checkPositions' /mexc-price merge, kept for
     Binance-outage fallback rows (see tryOpen). */

  /* Status tracking exists purely so the card itself can show "last scan
     Xs ago" / per-TF row counts / any fetch error — a mobile user can
     diagnose "is this actually running?" just by looking at the card,
     no DevTools console needed. */
  var _lastScanAt=0, _lastScanErr=false, _lastScanCounts={};

  async function scanSignals(){
    var now=Date.now();
    var anyErr=false, counts={};
    for(var t=0;t<TFS.length;t++){
      var tf=TFS[t];
      var rows;
      try{
        var snap=await fetchJson("/api/dvl/scanner/snapshot?exchange=binance&tf="+encodeURIComponent(tf));
        rows=Array.isArray(snap&&snap.rows)?snap.rows:[];
      }catch(_){ anyErr=true; counts[tf]=null; continue; }
      /* The backend's own "binance" snapshot silently falls back to MEXC
         rows (activeSource:"mexc", fallback:true) when Binance's own scan
         fails — those rows carry MEXC's own rawSymbol format ("XAU_USDT",
         underscore and all, straight from worker.js's buildRow()). Every
         bot can trade these safely: tryOpen()'s ATR fallback and
         checkPositions()'s price map both branch on the SYMBOL's own
         shape (see tryOpen), not on which bot opened it, so a MEXC-shaped
         row gets MEXC's ATR/price lookups instead of Binance's — no more
         "never resolves a price, sits open forever" risk. Still flagged
         in the status line purely as info (Binance being down right now
         is worth knowing even though trading continues against MEXC). */
      var binanceLive=!(snap && snap.fallback);
      var freshMs=FRESH_MS_BY_TF[tf]||FRESH_MS;
      var freshCount=0;
      for(var i=0;i<rows.length;i++){
        var r=rows[i];
        if(r.spikeAt && (now-r.spikeAt)>freshMs) continue; // stale detection — not a "fast" opportunity anymore
        freshCount++;
        for(var b=0;b<BOTS.length;b++){
          if(BOTS[b].match(r)) await tryOpen(BOTS[b],r,tf);
        }
      }
      counts[tf]={ rows:rows.length, fresh:freshCount, fallback:!binanceLive };
    }
    _lastScanAt=now;
    _lastScanErr=anyErr;
    _lastScanCounts=counts;
    render();
  }

  function equityOf(bot){
    var w=wallets[bot.id], sum=w.balance;
    w.positions.forEach(function(p){
      var price=_lastPriceMap[p.symbol];
      var remFrac=1-(p.closedFrac||0);
      var remQty=p.qty*remFrac, remSize=p.size*remFrac;
      sum+=remSize+(price>0?pnlOf(bot,p,price,remQty):0);
    });
    return sum;
  }

  function botHtml(bot,isLeader){
    var w=wallets[bot.id];
    var equity=equityOf(bot);
    var retPct=((equity-START_BALANCE)/START_BALANCE)*100;
    var closed=w.history;
    var wins=closed.filter(function(h){ return h.pnl>0; }).length;
    var winRate=closed.length?Math.round(wins/closed.length*100):null;
    var sideTag=bot.side==="SHORT"?'<i class="shortTag">SÓ SHORT</i>':'<i class="longTag">SÓ LONG</i>';
    var out='<div class="dvlFb1060Bot'+(isLeader?' leader':'')+'">';
    out+='<div class="dvlFb1060BotTitle">'+(isLeader?'<span class="crown">👑</span>':'')+'<b>'+esc(bot.name)+'</b>'+sideTag+'</div>';
    out+='<div class="dvlFb1060Combo">'+esc(bot.comboLabel)+'</div>';
    out+='<div class="dvlFb1060Combo" style="opacity:.72;font-style:italic">Saída: '+esc((bot.exit||DEFAULT_EXIT).label)+'</div>';
    out+='<div class="dvlFb1060Stat"><span>Patrimônio</span><b>'+esc(fmtMoney(equity))+'</b></div>';
    out+='<div class="dvlFb1060Stat"><span>Retorno</span><b class="'+(retPct>=0?"pos":"neg")+'">'+esc(fmtPct(retPct))+'</b></div>';
    out+='<div class="dvlFb1060Stat"><span>Em andamento</span><b>'+w.positions.length+' trade'+(w.positions.length===1?'':'s')+'</b></div>';
    out+='<div class="dvlFb1060Stat"><span>Fechados</span><b>'+closed.length+(winRate==null?'':' ('+winRate+'% acerto)')+'</b></div>';
    /* Per-TF breakdown: realized P&L / trades / win rate split by the TF the
       signal came from (pos.tf, carried into history), plus how many are
       open now on that TF — so you can see which timeframe actually carries
       this bot's edge. Open positions add their live unrealized $ too. */
    var byTf={};
    TFS.forEach(function(tf){ byTf[tf]={ n:0, wins:0, pnl:0, open:0 }; });
    closed.forEach(function(h){ var t=byTf[h.tf]; if(!t) return; t.n++; if(h.pnl>0) t.wins++; t.pnl+=Number(h.pnl)||0; });
    w.positions.forEach(function(p){ var t=byTf[p.tf]; if(!t) return; t.open++;
      var price=_lastPriceMap[p.symbol]; var remQty=p.qty*(1-(p.closedFrac||0));
      t.pnl+=(p.realized||0)+(price>0?pnlOf(bot,p,price,remQty):0); });
    out+='<div class="dvlFb1060SubTitle">Por timeframe</div>';
    out+='<div class="dvlFb1060TfGrid">'+TFS.map(function(tf){
      var t=byTf[tf], wr=t.n?Math.round(t.wins/t.n*100):null;
      var active=(t.n>0||t.open>0);
      return '<div class="dvlFb1060TfRow'+(active?'':' idle')+'">'
        +'<span class="tf">'+esc(tf)+'</span>'
        +'<span class="cnt">'+(t.n+t.open? (t.n+' fech.'+(t.open?' · '+t.open+' aberto':'')) : '—')+'</span>'
        +'<span class="wr">'+(wr==null?'':wr+'%')+'</span>'
        +'<b class="'+(t.pnl>=0?'pos':'neg')+'">'+(active?esc(fmtMoney(t.pnl)):'')+'</b></div>';
    }).join("")+'</div>';
    if(w.positions.length){
      out+='<div class="dvlFb1060SubTitle">Abertos agora</div>';
      out+='<div class="dvlFb1060Positions">'+w.positions.slice(0,5).map(function(p){
        var price=_lastPriceMap[p.symbol];
        var remQty=p.qty*(1-(p.closedFrac||0));
        var pnl=(p.realized||0)+(price>0?pnlOf(bot,p,price,remQty):0);
        var pnlPct=(pnl/p.size)*100;
        return '<div class="dvlFb1060Row"><span>'+esc(p.symbol)+' · '+esc(p.tf)+'</span>'+(p.halfTaken?'<em class="half">parcial no bolso</em>':'')+'<b class="'+(pnl>=0?"pos":"neg")+'">'+esc(fmtPct(pnlPct))+'</b></div>';
      }).join("")+'</div>';
    }
    if(closed.length){
      out+='<div class="dvlFb1060SubTitle">Últimos fechados</div>';
      out+='<div class="dvlFb1060History">'+closed.slice(0,4).map(function(h){
        return '<div class="dvlFb1060Row"><span>'+esc(h.symbol)+' · '+esc(h.tf)+'</span><b class="'+(h.pnl>=0?"pos":"neg")+'">'+esc(fmtPct(h.pnlPct))+'</b><i>'+esc(REASON_LABEL[h.reason]||h.reason)+'</i></div>';
      }).join("")+'</div>';
    }
    out+='<button type="button" class="dvlFb1060Reset" data-fb-reset="'+bot.id+'">Reiniciar '+esc(bot.name)+'</button>';
    out+='</div>';
    return out;
  }

  /* No DevTools needed to check "is this actually running?" — this line
     shows the last scan's age and, per TF, how many rows came back vs.
     how many were fresh enough (<=30min) to even be considered. A "falha"
     tag means that TF's fetch itself threw (network/backend issue), not
     just "zero rows right now" (a quiet market) — those read differently
     and shouldn't be confused. */
  function statusHtml(){
    var agoTxt="ainda não rodou";
    if(_lastScanAt){
      var s=Math.round((Date.now()-_lastScanAt)/1000);
      agoTxt=s<60 ? (s+"s atrás") : (Math.round(s/60)+"min atrás");
    }
    var anyFallback=false;
    var parts=TFS.map(function(tf){
      var c=_lastScanCounts[tf];
      if(c && c.fallback) anyFallback=true;
      return tf+" "+(c ? (c.fresh+"/"+c.rows+(c.fallback?"⚠":"")) : "falha");
    }).join(" · ");
    var out='<div class="dvlFb1060Status'+(_lastScanErr?' err':'')+'">Última varredura: '+esc(agoTxt)+' — '+esc(parts)+'</div>';
    if(anyFallback) out+='<div class="dvlFb1060Status err">⚠ Binance indisponível agora — os bots seguem operando normalmente, só que com dados/preços/ATR da MEXC nesse ciclo</div>';
    return out;
  }

  function bodyHtml(){
    var out='<div class="dvlFb1060Body">';
    out+='<div class="dvlFb1060Note">100% simulado — sete carteiras virtuais de '+esc(fmtMoney(START_BALANCE))+' competindo, nenhuma ordem real. Cada bot entra no seu próprio combo do Scanner (agora em <b>5m / 15m / 30m / 1h</b>) e sai pelo seu próprio método ("Saída"). Novo: cada bot mostra o resultado <b>separado por timeframe</b> (bloco "Por timeframe") pra você ver em qual TF ele realmente ganha. Entradas de '+esc(fmtMoney(ENTRY_DOLLARS))+' (máx. '+MAX_OPEN+' abertas).</div>';
    out+=statusHtml();
    /* Leader = highest CURRENT equity; requires at least one closed trade
       somewhere so an untouched $1,000 wallet doesn't wear the crown. */
    var anyClosed=BOTS.some(function(b){ return wallets[b.id].history.length>0; });
    var leaderId=null;
    if(anyClosed){
      var best=-Infinity;
      BOTS.forEach(function(b){ var eq=equityOf(b); if(eq>best){ best=eq; leaderId=b.id; } });
    }
    BOTS.forEach(function(b){ out+=botHtml(b, b.id===leaderId); });
    out+='<div class="dvlFb1060Foot">Cada bot é um pacote completo: seu próprio combo de entrada (Bots 1-2 escolhidos na mão; Bots 3-7 os combos que o ML mais pontuou) E seu próprio método de saída (stop apertado, stop largo, deixa correr, alvo rápido, trailing, % fixo...). A ideia é bater o olho e ver qual pacote é o mais assertivo. Como entrada E saída mudam juntas, um bot vencer é o pacote inteiro vencendo — não dá pra isolar se foi a entrada ou a saída.</div>';
    out+='</div>';
    return out;
  }

  function html(){
    return '<section class="dvlCp0976Panel dvlFb1060Panel" data-dvl-cp-section="fast-bots" data-dvl-cp-section-version="1060">'
      +'<div class="dvlFb1060Head"><i class="dvlFb1060Icon">⚡</i>'
      +'<div class="dvlFb1060HeadTitle"><b>Fast Bots — corrida de combos</b><span>7 bots, $1.000 cada — entrada + saída própria em cada um</span></div></div>'
      +bodyHtml()
      +'</section>';
  }

  function bindEvents(panel){
    if(!panel) return;
    panel.querySelectorAll("[data-fb-reset]").forEach(function(btn){
      if(btn.dataset.fbBound) return;
      btn.dataset.fbBound="1";
      btn.addEventListener("click", function(){
        var id=btn.getAttribute("data-fb-reset");
        var bot=BOTS.filter(function(b){ return b.id===id; })[0];
        if(!bot) return;
        wallets[bot.id]=defaultWallet();
        persist(bot);
        render();
      });
    });
  }

  function render(){
    var p=document.getElementById("dvlCopilotPage0974");
    if(!p) return false;
    var panel=p.querySelector("[data-dvl-cp-section='fast-bots'][data-dvl-cp-section-version='1060']");
    if(!panel){
      var botDemo=p.querySelector("[data-dvl-cp-section='bot-demo']");
      var divergence=p.querySelector("[data-dvl-cp-section='divergence']");
      var backtest=p.querySelector("[data-dvl-cp-section='backtest']");
      var bot=p.querySelector("[data-dvl-cp-section='bot-soon']");
      if(botDemo) botDemo.insertAdjacentHTML("afterend", html());
      else if(divergence) divergence.insertAdjacentHTML("afterend", html());
      else if(backtest) backtest.insertAdjacentHTML("afterend", html());
      else if(bot) bot.insertAdjacentHTML("beforebegin", html());
      else p.insertAdjacentHTML("beforeend", html());
      panel=p.querySelector("[data-dvl-cp-section='fast-bots'][data-dvl-cp-section-version='1060']");
    }else{
      var body=panel.querySelector(".dvlFb1060Body");
      if(body) body.outerHTML=bodyHtml();
    }
    bindEvents(panel);
    return !!panel;
  }

  var signalTimer1207=null,priceTimer1207=null,renderTimer1207=null;
  function copilotOpen1207(){var g=window.DVL_PANEL_ACTIVITY_1207;return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open"));}
  function stopTimers1207(){
    if(signalTimer1207){clearInterval(signalTimer1207);signalTimer1207=null;}
    if(priceTimer1207){clearInterval(priceTimer1207);priceTimer1207=null;}
    if(renderTimer1207){clearInterval(renderTimer1207);renderTimer1207=null;}
  }
  function syncTimers1207(){
    if(!copilotOpen1207()){stopTimers1207();return;}
    render(); scanSignals(); checkPositions();
    if(!signalTimer1207) signalTimer1207=setInterval(function(){if(copilotOpen1207())scanSignals();},SIGNAL_POLL_MS);
    if(!priceTimer1207) priceTimer1207=setInterval(function(){if(copilotOpen1207())checkPositions();},PRICE_POLL_MS);
    if(!renderTimer1207) renderTimer1207=setInterval(function(){if(copilotOpen1207())render();},15000);
  }
  function boot(){
    render();
    [300,900,1500,2500,4000,6000,9000].forEach(function(ms){ setTimeout(function(){if(copilotOpen1207())render();},ms); });
    window.addEventListener("dvl:copilot-state-change",function(){setTimeout(syncTimers1207,0);},true);
    document.addEventListener("visibilitychange",syncTimers1207,true);
    syncTimers1207();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.DVL_FASTBOTS_1060={
    version:"1.060",
    render:render,
    scanSignals:scanSignals,
    checkPositions:checkPositions,
    resetBot:function(id){ var bot=BOTS.filter(function(b){ return b.id===id; })[0]; if(!bot) return; wallets[bot.id]=defaultWallet(); persist(bot); render(); },
    get wallets(){ var o={}; BOTS.forEach(function(b){ o[b.id]=clone(wallets[b.id]); }); return o; },
    audit:function(){ var p=document.getElementById("dvlCopilotPage0974"); var o={ version:"1.060", panelFound:!!(p&&p.querySelector("[data-dvl-cp-section='fast-bots']")) }; BOTS.forEach(function(b){ o[b.id]=wallets[b.id]; }); return o; }
  };
})();
