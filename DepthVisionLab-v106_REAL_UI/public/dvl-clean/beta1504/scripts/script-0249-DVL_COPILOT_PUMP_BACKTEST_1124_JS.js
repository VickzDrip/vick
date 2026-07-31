/* Beta 1.124 — cartão do Copilot: backtest financeiro do modelo pré-pump/pré-short.
   Lê window.DVL_PUMP_BACKTEST (poleado pela bridge /pump-backtest): pega os
   sinais resolvidos do modelo, simula uma conta de $1000 com risco fixo por
   trade e um bracket em ATR, e mostra retorno, drawdown, win rate e o melhor
   ponto de saída (sweep de take-profit). Estimativa in-sample, só leitura. */
(function(){
  if(window.DVL_COPILOT_PUMP_BACKTEST_1124) return;
  function copilotOpen1207(){ var g=window.DVL_PANEL_ACTIVITY_1207; return g?g.copilotOpen():(!document.hidden&&!!document.querySelector("#dvlCopilotPage0974.is-open")); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function fmtUsd(v){ v=Number(v)||0; return "$"+v.toLocaleString("en-US",{maximumFractionDigits:0}); }
  function sign(v){ v=Number(v)||0; return (v>=0?"+":"")+v.toFixed(1)+"%"; }

  /* Gatilho aprendido: o limiar de expectativa (ATR) acima do qual o backtest
     fica lucrativo líquido, e se cada lado vale a pena operar. */
  function trigHtml(t){
    if(!t||typeof t!=="object") return '';
    var mc=Number(t.minConv); if(!isFinite(mc)) return '';
    var l=t.long||{}, s=t.short||{};
    function tag(o){ return o&&o.operate ? '<b class="ok">vale operar</b>' : '<b class="no">evitar por ora</b>'; }
    return '<div class="dvlCpBt1124Trig">🎯 <b>Gatilho:</b> só operar quando a expectativa do modelo for <b>≥ '+mc.toFixed(1)+'× ATR</b> na direção. '
      +'▲ Long: '+tag(l)+' · ▼ Short: '+tag(s)+'. Abaixo desse limiar, as taxas comem o edge.</div>';
  }

  /* Comparação dos modos de risco (Scalp / Equilibrado / Runner), destacando o
     que rende mais líquido. Cada modo tem seu stop e o backtest achou o melhor
     alvo + gatilho pra ele. */
  function modesHtml(list, bestKey){
    if(!Array.isArray(list)||!list.length) return '';
    var rows=list.map(function(m){
      var r=Number(m.returnPct)||0, dd=Number(m.maxDrawdownPct)||0, best=(m.key===bestKey);
      var exitTxt=m.adaptive ? ('trailing '+(Number(m.trailAtr)||0).toFixed(1)+'×') : ('alvo '+(Number(m.tpAtr)||0).toFixed(1)+'×');
      return '<div class="dvlCpBt1124Mode'+(best?' best':'')+'">'
        +'<div class="nm">'+esc(m.label||m.key)+'<small>stop '+(Number(m.slAtr)||0).toFixed(1)+'× · '+exitTxt+'</small></div>'
        +'<div class="rt '+(r>=0?'pos':'neg')+'">'+sign(r)+'</div>'
        +'<div class="dd">DD -'+dd.toFixed(0)+'%</div>'
        +'<div class="star">'+(best?'★':'')+'</div>'
      +'</div>';
    }).join("");
    return '<div class="dvlCpBt1124Modes"><div class="dvlCpBt1124ModesHd">Modos de risco (líquido)</div>'+rows+'</div>';
  }

  /* Mapa de calor da superfície SL×TP — o retorno líquido de CADA combinação de
     stop×alvo, pra ver o terreno inteiro sem pontos cegos e checar se o melhor
     é uma zona robusta ou um pico sortudo. */
  function heatmapHtml(sf){
    if(!sf||!Array.isArray(sf.cells)||!sf.cells.length) return '';
    var sls=sf.slGrid||[], tps=sf.tpGrid||[], map={};
    sf.cells.forEach(function(c){ map[c.slAtr+'|'+c.tpAtr]=c; });
    var scale=1; sf.cells.forEach(function(c){ scale=Math.max(scale, Math.abs(Number(c.returnPct)||0)); });
    function col(v){ var a=Math.max(0.08,Math.min(0.92,Math.abs(v)/scale)); return v>=0?'rgba(16,223,119,'+a+')':'rgba(255,89,102,'+a+')'; }
    var bestKey=sf.best?(sf.best.slAtr+'|'+sf.best.tpAtr):'';
    var g='<div class="dvlCpBt1124HeatGrid" style="grid-template-columns:30px repeat('+tps.length+',1fr)">';
    g+='<div class="dvlCpBt1124HeatAx" title="linhas = stop, colunas = alvo">·</div>';
    tps.forEach(function(tp){ g+='<div class="dvlCpBt1124HeatAx">'+tp+'×</div>'; });
    sls.forEach(function(sl){
      g+='<div class="dvlCpBt1124HeatAx">'+sl+'×</div>';
      tps.forEach(function(tp){
        var c=map[sl+'|'+tp], v=c?(Number(c.returnPct)||0):0, isBest=((sl+'|'+tp)===bestKey);
        g+='<div class="dvlCpBt1124HeatCell'+(isBest?' best':'')+'" style="background:'+col(v)+'" title="stop '+sl+'× / alvo '+tp+'×: '+(v>=0?'+':'')+v.toFixed(0)+'%">'+(v>=0?'+':'')+v.toFixed(0)+'</div>';
      });
    });
    g+='</div>';
    return '<div class="dvlCpBt1124Heat"><div class="dvlCpBt1124HeatHd">Superfície stop × alvo — retorno líquido</div>'
      +'<div class="dvlCpBt1124HeatWrap">'+g+'</div>'
      +'<div class="dvlCpBt1124HeatLeg">Linhas = stop, colunas = alvo (em ATR). Verde lucro · vermelho prejuízo · ★ contorno = melhor. Procure uma ZONA verde (robusto), não uma célula solta.</div></div>';
  }

  /* Otimizador (walk-forward): melhor combo de saída achado no TREINO e o
     resultado dele no TESTE (fora da amostra) — a prova de que não é só
     curve-fitting. */
  function f1(v){ return (Number(v)||0).toFixed(1); }
  function optHtml(o, title){
    var hd = title || '🧠 Melhor combo — validado fora da amostra';
    if(!o||typeof o!=="object") return '';
    if(!o.ready){
      var why=o.reason?(' — '+esc(o.reason)):'';
      return '<div class="dvlCpBt1124Opt"><div class="dvlCpBt1124OptHd">'+esc(hd)+'</div>'
        +'<div class="dvlCpBt1124OptSub">Ainda coletando sinais pra treinar/testar'+why+'.</div></div>';
    }
    var b=o.best||{}, tr=o.train||{}, te=o.test||{};
    var cfg;
    if(b.family==="trailing") cfg='stop '+f1(b.slAtr)+'× + trailing '+f1(b.trailAtr)+'×';
    else if(b.family==="scaleout") cfg='parcial: '+Math.round((Number(b.tp1Frac)||0.5)*100)+'% em '+f1(b.tp1Atr)+'× + trailing '+f1(b.trailAtr)+'× (stop '+f1(b.slAtr)+'×)';
    else if(b.family==="timestop") cfg='stop '+f1(b.slAtr)+'× / alvo '+f1(b.tpAtr)+'× · sai em '+(Number(b.timeBars)||0)+' velas';
    else cfg='stop '+f1(b.slAtr)+'× / alvo '+f1(b.tpAtr)+'×'+(b.beAtr>0?(' + breakeven '+f1(b.beAtr)+'×'):'');
    var trR=Number(tr.returnPct)||0, teR=Number(te.returnPct)||0, teN=Number(te.trades)||0;
    var verd = teN<5 ? {t:'teste pequeno — inconclusivo por ora', c:'#ffd321'}
             : (o.generalizes ? {t:'✓ generaliza (segura fora da amostra)', c:'#10df77'}
                              : {t:'✗ não generaliza — foi curve-fitting', c:'#ff5966'});
    return '<div class="dvlCpBt1124Opt">'
      +'<div class="dvlCpBt1124OptHd">'+esc(hd)+'</div>'
      +'<div class="dvlCpBt1124OptCfg">'+esc(cfg)+'</div>'
      +'<div class="dvlCpBt1124OptSub">gatilho ≥ '+f1(b.minConv)+'× ATR · testou '+(o.candidates||0)+' combos</div>'
      +'<div class="dvlCpBt1124OptCells">'
        +'<div class="dvlCpBt1124OptCell"><div class="k">Treino</div><div class="v '+(trR>=0?'pos':'neg')+'">'+sign(trR)+'</div></div>'
        +'<div class="dvlCpBt1124OptCell"><div class="k">Teste (real)</div><div class="v '+(teR>=0?'pos':'neg')+'">'+sign(teR)+'</div></div>'
      +'</div>'
      +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+'">'+verd.t+'</div>'
      +'<div class="dvlCpBt1124OptNote">Otimiza no treino ('+ (o.trainN||0) +' sinais), valida no teste ('+ (o.testN||0) +' sinais nunca vistos). O número que importa é o TESTE — se ele for vermelho, o combo só decorou o passado.</div>'
    +'</div>';
  }

  /* Calibração: o "X× ATR" que o modelo prevê corresponde ao movimento real? */
  function calibHtml(cal){
    if(!Array.isArray(cal)||!cal.length) return '';
    var rows=cal.map(function(b){
      var pred=Number(b.avgPred)||0, real=Number(b.avgReal)||0, reach=Number(b.reachRate)||0, n=Number(b.n)||0;
      var under = real < pred*0.7;
      return '<div class="dvlCpBt1124CalRow"><b>'+esc(b.range)+'× ('+n+')</b>'
        +'<span>'+pred.toFixed(1)+'×</span>'
        +'<span class="'+(under?'r':'')+'">'+real.toFixed(1)+'×</span>'
        +'<span>'+reach.toFixed(0)+'%</span></div>';
    }).join("");
    // veredito: pega o bucket de maior expectativa
    var top=cal[cal.length-1], tp=Number(top.avgPred)||0, tr=Number(top.avgReal)||0;
    var take = tr < tp*0.7
      ? ('Nas moedas que ele previu <b>'+top.range+'× ATR</b>, o movimento real médio foi só <b>'+tr.toFixed(1)+'×</b>. O modelo SUPERESTIMA — por isso o gatilho em ATR engana. A raiz é o sinal, não o TP/SL.')
      : ('A previsão acompanha a realidade de forma razoável — dá pra confiar mais no número do modelo pra filtrar.');
    return '<div class="dvlCpBt1124Deep"><div class="dvlCpBt1124DeepHd">Calibração — o número do modelo bate?</div>'
      +'<div class="dvlCpBt1124CalRow hd"><span>previu (n)</span><span>prevê</span><span>real</span><span>atinge</span></div>'
      +rows
      +'<div class="dvlCpBt1124CalTake">'+take+'</div></div>';
  }

  var COND_LABELS={volBelowMaBars:"barras de calmaria",spike20:"força do spike",crossStrength:"força do cruzamento",maFlatness1:"MA achatada",rsi14:"RSI",rsiRecoveryFromLow:"RSI recuperando",price24hPct:"variação 24h",spikePrevVolRatio:"spike vs vol. anterior",priceGlueOk:"preço colado",oiNum:"OI direção",oiRatio:"OI força",lsrNum:"LSR direção",lsrRatio:"LSR força"};
  /* Onde está o edge: condições (por feature) que mais melhoram o resultado,
     validadas no teste (fora da amostra). */
  function condHtml(cond){
    if(!cond||!Array.isArray(cond.top)||!cond.top.length) return '';
    var base=Number(cond.baselineReturn)||0;
    var rows=cond.top.map(function(c){
      var lbl=(COND_LABELS[c.feature]||c.feature)+' '+c.op+' '+(Number(c.thr)||0).toFixed(1);
      var trR=Number(c.trainReturn)||0, teR=Number(c.testReturn)||0, teN=Number(c.testTrades)||0;
      var win=(trR>0 && teR>0 && teN>=5);
      return '<div class="dvlCpBt1124Cond'+(win?' win':'')+'"><span class="nm">'+(win?'✓ ':'')+esc(lbl)+'</span>'
        +'<span class="tr">treino '+sign(trR)+'</span>'
        +'<span class="te '+(teR>=0?'pos':'neg')+'">teste '+sign(teR)+'</span></div>';
    }).join("");
    return '<div class="dvlCpBt1124Deep"><div class="dvlCpBt1124DeepHd">Onde está o edge — condições (validado no teste)</div>'
      +'<div class="dvlCpBt1124DeepNote" style="margin-top:0;margin-bottom:6px">Base (todos os sinais): '+sign(base)+'. Cada linha = filtrar por uma condição. ✓ = melhora no treino E segura no teste.</div>'
      +rows
      +'<div class="dvlCpBt1124DeepNote">Se nenhuma condição fica verde no teste, o sinal ainda não tem edge explorável — o próximo passo é melhorar o modelo (mais dados/features), não a saída.</div></div>';
  }

  /* RSI Exhaustion (15m) como confirmação do pré-volume+spike — a descoberta.
     Varre os inputs do RSI e valida fora da amostra. */
  function rsiHtml(rc){
    if(!rc||typeof rc!=="object") return '';
    if(!rc.ready){
      var have=Number(rc.withExr)||0, need=Number(rc.need)||20;
      var pct=Math.max(0,Math.min(100,Math.round(have/Math.max(1,need)*100)));
      return '<div class="dvlCpBt1124Opt" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22)">'
        +'<div class="dvlCpBt1124OptHd" style="color:#8fd0ff">RSI Exhaustion (15m) — confirmação</div>'
        +'<div class="dvlCpBt1124OptSub">Coletando sinais com leitura do RSI no momento do disparo (só sinais novos, a partir de agora).</div>'
        +'<div class="dvlCpBt1124Bar"><i style="width:'+pct+'%"></i></div>'
        +'<div class="dvlCpBt1124BarLbl">'+have+' / '+need+' sinais com RSI</div></div>';
    }
    var b=rc.best||{}, tr=rc.train||{}, te=rc.test||{};
    var trR=Number(tr.returnPct)||0, teR=Number(te.returnPct)||0, teN=Number(te.trades)||0;
    var baseTe=Number(rc.baselineTestPct);
    var verd = teN<5 ? {t:'teste pequeno — inconclusivo', c:'#ffd321'}
             : rc.generalizes ? {t:'✓ a confirmação do RSI segura fora da amostra', c:'#10df77'}
                              : {t:'✗ não segura no teste — foi coincidência', c:'#ff5966'};
    var cfg='RSI '+ (Number(b.rsiLen)||0) +' · push '+(Number(b.push)||0)+' · long ≤ '+(Number(b.lowerZone)||0)+' / short ≥ '+(Number(b.upperZone)||0);
    return '<div class="dvlCpBt1124Opt" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22)">'
      +'<div class="dvlCpBt1124OptHd" style="color:#8fd0ff">🔎 RSI Exhaustion (15m) + spike — melhor config</div>'
      +'<div class="dvlCpBt1124OptCfg">'+esc(cfg)+'</div>'
      +'<div class="dvlCpBt1124OptSub">'+ (Number(tr.trades)||0) +' sinais confirmados no treino · varreu len × push × zonas</div>'
      +'<div class="dvlCpBt1124OptCells">'
        +'<div class="dvlCpBt1124OptCell"><div class="k">Treino (c/ RSI)</div><div class="v '+(trR>=0?'pos':'neg')+'">'+sign(trR)+'</div></div>'
        +'<div class="dvlCpBt1124OptCell"><div class="k">Teste (real)</div><div class="v '+(teR>=0?'pos':'neg')+'">'+sign(teR)+'</div></div>'
      +'</div>'
      +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+'">'+verd.t+'</div>'
      +'<div class="dvlCpBt1124OptNote">Sem o filtro do RSI, o teste dava '+(isFinite(baseTe)?sign(baseTe):'—')+'. Se o número COM RSI for melhor e verde, sua descoberta está confirmada com dado.</div>'
    +'</div>';
  }

  /* "Só sinais completos": a reversible view that runs the whole backtest on
     only the new-format signals carrying the 15m Exhaustion-RSI reading (and
     exact price path). Nada é apagado — só alterna o que entra na análise. */
  function btOnlyComplete(){
    try{
      var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023;
      if(br && typeof br.btOnlyComplete==="function") return !!br.btOnlyComplete();
    }catch(_){}
    return !!window.DVL_PUMP_BT_ONLY_COMPLETE;
  }
  function toggleHtml(s){
    var on=btOnlyComplete();
    var cN=s&&isFinite(Number(s.completeN))?Number(s.completeN):null;
    var tN=s&&isFinite(Number(s.totalN))?Number(s.totalN):null;
    var cnt=(cN!=null&&tN!=null)?('<span> · '+cN+' de '+tN+' sinais completos</span>'):'';
    return '<div class="dvlCpBt1124Toggle'+(on?' on':'')+'" data-dvl-bt-toggle="1" role="switch" aria-checked="'+(on?'true':'false')+'">'
      +'<span class="dvlCpBt1124Sw"></span>'
      +'<span class="dvlCpBt1124TgTx"><b>Só sinais completos</b> — analisa apenas os sinais novos com leitura do RSI Exhaustion (15m) e trajetória exata.'+cnt+'</span>'
    +'</div>';
  }
  /* ── Backtest ANUAL (5 ativos, 1 ano de 15m) ── estado + controles ── */
  function annualState(){ var a=window.DVL_PUMP_BT_ANNUAL || (window.DVL_PUMP_BT_ANNUAL={mode:false,status:'idle',data:null,err:'',pct:0,query:'',tf:15,years:1,btype:'vp'}); a.mode=false; return a; }  /* Beta 1.236 — runner de estratégias removido: card fica sempre no Backtest financeiro (pré-pump/pré-short) */
  function curSymForGrid(){ try{ if(window.symbol) return String(window.symbol).toUpperCase(); }catch(_){} return 'BTCUSDT'; }
  function curSymLabel(){ var s=curSymForGrid().replace('_USDT','').replace('USDT',''); return s; }
  function gridTf(){ var a=annualState(); var t=Number(a.tf)||15; return [5,15,30,60].indexOf(t)>=0?t:15; }
  function gridYears(){ var a=annualState(); var y=Number(a.years)||1; return [1,2].indexOf(y)>=0?y:1; }
  function gridDays(){ return gridYears()*365; }
  function gridType(){ var a=annualState(); return (a.btype==='rsi'||a.btype==='combo'||a.btype==='vsignal')?a.btype:'vp'; }
  function btQuery(){ var t=gridType(); var flag=t==='rsi'?"&rsiGrid=1":(t==='combo'?"&combo=1":(t==='vsignal'?"&vsignal=1":"&vp=1")); return "symbols=BTCUSDT&tf="+gridTf()+"&days="+gridDays()+flag; }
  function yearsLabel(y){ return y+(y>1?' anos':' ano'); }
  function tfLabel(t){ return t>=60?(t/60)+'h':t+'m'; }
  function tfChipsHtml(){
    var cur=gridTf();
    var chips=[5,15,30,60].map(function(t){
      return '<button type="button" data-dvl-bt-grid-tf="'+t+'" class="dvlCpBt1124TfChip'+(t===cur?' on':'')+'">'+tfLabel(t)+'</button>';
    }).join('');
    var cy=gridYears();
    var ychips=[1,2].map(function(y){
      return '<button type="button" data-dvl-bt-grid-years="'+y+'" class="dvlCpBt1124TfChip'+(y===cy?' on':'')+'">'+yearsLabel(y)+'</button>';
    }).join('');
    var bt=gridType();
    var btypes=[['vp','📊 Volume Profile'],['rsi','📈 RSI Exaustão'],['combo','🎯 Combinado'],['vsignal','🔺 Sinais V']].map(function(o){
      return '<button type="button" data-dvl-bt-grid-type="'+o[0]+'" class="dvlCpBt1124TfChip'+(o[0]===bt?' on':'')+'">'+o[1]+'</button>';
    }).join('');
    return '<div class="dvlCpBt1124TfRow"><span class="dvlCpBt1124TfLbl">Teste:</span>'+btypes+'</div>'
         +'<div class="dvlCpBt1124TfRow"><span class="dvlCpBt1124TfLbl">Timeframe:</span>'+chips+'</div>'
         +'<div class="dvlCpBt1124TfRow"><span class="dvlCpBt1124TfLbl">Período:</span>'+ychips+'</div>';
  }
  function annualBtnHtml(){
    return '';  /* Beta 1.236 — runner de backtest de estratégias (VP/RSI/Combinado/Sinais V) removido a pedido; mantém só o Backtest financeiro. */
    var a=annualState();
    var _t=gridType();
    var lbl = _t==='rsi'
      ? '📈 Backtest RSI Exaustão · BTC · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+' — pré-volume + seu RSI (long/short, $1000 cada)'
      : (_t==='combo'
        ? '🎯 Backtest Combinado · BTC · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+' — pré-volume + RSI + VP juntos (long/short, $1000 cada)'
        : (_t==='vsignal'
          ? '🔺 Backtest Sinais V · BTC · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+' — os triângulos do RSI (compra/venda, $1000 cada)'
          : '📊 Backtest Volume Profile · BTC · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+' — proximidade de VAL/POC/VAH (long/short, $1000 cada)'));
    return '<div class="dvlCpBt1124AnnualBar">'
      +'<button type="button" data-dvl-bt-annual-grid="1" class="dvlCpBt1124AnnualBtn'+(a.mode?' on':'')+'" style="flex-basis:100%">'+lbl+'</button>'
      +(a.mode?'<button type="button" data-dvl-bt-annual-back="1" class="dvlCpBt1124AnnualBack">← ao vivo</button>':'')
      + tfChipsHtml()
    +'</div>';
  }
  function annualBannerHtml(s){
    var tf=tfLabel(Number(s.tfMin)||15);
    var nm = s.comboGrid ? '🎯 <b>Backtest Combinado · BTC · '+tf+'</b>' : (s.rsiGrid ? '📈 <b>Backtest RSI Exaustão · BTC · '+tf+'</b>' : '📊 <b>Backtest Volume Profile · BTC · '+tf+'</b>');
    var sub = s.comboGrid ? 'Pré-volume + RSI + VP juntos no '+tf : (s.rsiGrid ? 'Pré-volume + seu Exhaustion RSI no '+tf+' base' : 'VP reconstruído no '+tf+' (POC/VAH/VAL iguais aos do gráfico)');
    return '<div class="dvlCpBt1124Exit" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22);color:#bcd8ff">'
      +nm+' — '+(Number(s.days)||365)+' dias de '+tf+' · '+(Number(s.samples)||0)+' sinais. '+sub+'; gatilho e resultado 100% fiéis.'
    +'</div>';
  }
  /* Ganhos/perdas de CADA ativo (cada um com $1000), long e short separados,
     e os vários tipos de saída (modos) testados. */
  function perAssetHtml(s){
    var pa=(s&&Array.isArray(s.perAsset))?s.perAsset:[];
    if(!pa.length) return '';
    var acc0=Number(s.account0)||1000;
    function money(o){ o=o||{}; return {a:Number(o.account)||0, r:Number(o.returnPct)||0, w:Number(o.winRate)||0, n:Number(o.trades)||0, dd:Number(o.maxDrawdownPct)||0}; }
    var cards=pa.map(function(p){
      var nm=esc(String(p.sym||'').replace('_USDT','').replace('USDT',''));
      if(!p.best){
        return '<div class="dvlCpBt1124PaCard"><div class="dvlCpBt1124PaHd"><b>'+nm+'</b><span>'+(Number(p.signals)||0)+' sinais</span></div>'
          +'<div class="dvlCpBt1124PaSub">poucos sinais no período pra avaliar</div></div>';
      }
      var A=money(p.best), L=money(p.long&&p.long.result), S=money(p.short&&p.short.result);
      var modes=(Array.isArray(p.modes)?p.modes:[]).map(function(m){
        var lbl=esc(m.label||m.key||''); var mv=Number(m.account)||0; var mr=Number(m.returnPct)||0;
        var tp=m.adaptive?('trail '+(Number(m.trailAtr)||0).toFixed(1)+'×'):('alvo '+(Number(m.tpAtr)||0).toFixed(1)+'×');
        return '<span class="dvlCpBt1124PaMode '+(mr>=0?'pos':'neg')+'">'+lbl+' ('+tp+') '+sign(mr)+'</span>';
      }).join('');
      var mLbl=esc((p.modeLabel||'')+'');
      return '<div class="dvlCpBt1124PaCard">'
        +'<div class="dvlCpBt1124PaHd"><b>'+nm+'</b><span>'+A.n+' trades · '+(Number(p.signals)||0)+' sinais</span></div>'
        +'<div class="dvlCpBt1124PaBig"><span class="'+(A.r>=0?'pos':'neg')+'">'+fmtUsd(A.a)+'</span>'
          +'<small>de '+fmtUsd(acc0)+' · '+sign(A.r)+' · '+A.w.toFixed(0)+'% acerto · dd -'+A.dd.toFixed(0)+'%</small></div>'
        +'<div class="dvlCpBt1124PaSides">'
          +'<div class="dvlCpBt1124PaSide"><span class="k" style="color:#10df77">▲ long</span> <b class="'+(L.r>=0?'pos':'neg')+'">'+fmtUsd(L.a)+'</b> <small>'+sign(L.r)+' · '+L.w.toFixed(0)+'% · '+L.n+'t</small></div>'
          +'<div class="dvlCpBt1124PaSide"><span class="k" style="color:#ff5966">▼ short</span> <b class="'+(S.r>=0?'pos':'neg')+'">'+fmtUsd(S.a)+'</b> <small>'+sign(S.r)+' · '+S.w.toFixed(0)+'% · '+S.n+'t</small></div>'
        +'</div>'
        +(mLbl?('<div class="dvlCpBt1124PaSub">melhor saída: <b>'+mLbl+'</b></div>'):'')
        +(modes?('<div class="dvlCpBt1124PaModes">'+modes+'</div>'):'')
      +'</div>';
    }).join('');
    return '<div class="dvlCpBt1124PaWrap"><div class="dvlCpBt1124PaTitle">BTC — conta base de '+fmtUsd(acc0)+' (long e short separados, vários tipos de saída) — referência geral do ativo</div>'+cards+'</div>';
  }
  /* Backtest Volume Profile: melhor combinação de proximidade (VAL/POC/VAH)
     por lado + tabela dos melhores combos. */
  function vpLineLabel(l){ return l==='val'?'VAL (fundo da área)':(l==='vah'?'VAH (topo da área)':'POC (pico de volume)'); }
  function vpPosLabel(p){ return p==='below'?'abaixo da linha':(p==='above'?'acima da linha':'qualquer lado'); }
  function vpGridHtml(s){
    var g=s&&s.vpGrid; if(!g) return '';
    if(!g.ready){
      return '<div class="dvlCpBt1124Opt"><div class="dvlCpBt1124OptHd">📊 Backtest Volume Profile</div>'
        +'<div class="dvlCpBt1124OptSub">Poucos sinais com Volume Profile pra varrer ('+(Number(g.withVp)||0)+', precisa ~'+(Number(g.need)||20)+').</div></div>';
    }
    function cfgTxt(c){
      return vpLineLabel(c.line)+' · dist ≤ '+(Number(c.proxAtr)||0).toFixed(2)+'× ATR · '+vpPosLabel(c.pos)+' · janela '+(Number(c.vpWin)||0)+' velas · alvo '+(Number(c.tpAtr)||0).toFixed(1)+'×';
    }
    function sideBlock(sd, label, cls){
      sd=sd||{};
      /* Mostra a melhor que GENERALIZA (verde no treino E no teste). Se não tem,
         mostra a "menos ruim" (topo do ranking) mas marcada como não-confiável. */
      var b=sd.best, fallback=false;
      if(!b && Array.isArray(sd.top) && sd.top.length){ b=sd.top[0]; fallback=true; }
      if(!b) return '<div class="dvlCpBt1124PaCard"><div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b></div><div class="dvlCpBt1124PaSub">nenhuma combinação com trades suficientes</div></div>';
      var trR=Number(b.train&&b.train.returnPct)||0, teR=Number(b.test&&b.test.returnPct)||0;
      var teN=Number(b.test&&b.test.trades)||0, teW=Number(b.test&&b.test.winRate)||0;
      var verd = (!sd.best) ? {t:'✗ NADA confiável — nenhum combo ficou verde no treino E no teste', c:'#ff5966'}
               : (teN<5 ? {t:'teste pequeno — inconclusivo', c:'#ffd321'}
               : {t:'✓ segura — VERDE no treino E no teste', c:'#10df77'});
      var rows=(Array.isArray(sd.top)?sd.top:[]).slice(0,8).map(function(c){
        var tr=Number(c.train&&c.train.returnPct)||0, te=Number(c.test&&c.test.returnPct)||0;
        var pos=c.pos==='below'?'↓':(c.pos==='above'?'↑':'·');
        return '<tr><td>'+String(c.line||'').toUpperCase()+'</td><td>'+(Number(c.proxAtr)||0).toFixed(2)+'×</td><td>'+pos+'</td><td>'+(Number(c.vpWin)||0)+'</td><td>'+(Number(c.tpAtr)||0).toFixed(1)+'×</td>'
          +'<td class="'+(tr>=0?'pos':'neg')+'">'+sign(tr)+'</td><td class="'+(te>=0?'pos':'neg')+'">'+sign(te)+'</td><td>'+(Number(c.test&&c.test.trades)||0)+'t</td></tr>';
      }).join('');
      return '<div class="dvlCpBt1124PaCard">'
        +'<div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b><span>'+(Number(b.test&&b.test.trades)||0)+' trades no teste</span></div>'
        +'<div class="dvlCpBt1124PaBig"><span class="'+(teR>=0?'pos':'neg')+'">'+fmtUsd(Number(b.test&&b.test.account)||1000)+'</span><small>de '+fmtUsd(1000)+' no TESTE · '+sign(teR)+' · '+teW.toFixed(0)+'% acerto</small></div>'
        +'<div class="dvlCpBt1124PaSub">Melhor combo: <b>'+esc(cfgTxt(b))+'</b> · treino '+sign(trR)+'</div>'
        +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+';margin:4px 0 6px">'+verd.t+'</div>'
        +(rows?('<div style="overflow-x:auto"><table class="dvlCpBt1124GridTbl"><thead><tr><th>linha</th><th>dist</th><th>lado</th><th>janela</th><th>saída</th><th>treino</th><th>teste</th><th>n</th></tr></thead><tbody>'+rows+'</tbody></table></div>'):'')
      +'</div>';
    }
    return '<div class="dvlCpBt1124PaWrap">'
      +'<div class="dvlCpBt1124PaTitle">📊 Backtest Volume Profile — '+(Number(g.combosTested)||0).toLocaleString('pt-BR')+' combinações · long e short cada um com $1000 · ranqueado pelo TESTE (fora da amostra)'+((Number(g.sampleTotal)||0)>(Number(g.withVp)||0)?(' · usando os '+(Number(g.withVp)||0)+' sinais mais recentes de '+(Number(g.sampleTotal)||0)):'')+'</div>'
      +'<div class="dvlCpBt1124Exit" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22);color:#bcd8ff">Reconstrói o Volume Profile da plataforma (POC/VAH/VAL) em cada sinal e mede quão perto o spike pós pré-volume-baixo entrou de cada linha. Varre linha (VAL/POC/VAH) × distância (ATR) × lado da linha × janela do perfil × alvo, pra cada direção. <b>Critério rígido:</b> um combo só é "seguro" se for VERDE no TREINO <b>E</b> no TESTE, e o ranking é pelo <b>pior dos dois</b> — assim um combo com treino vermelho e teste verde (sorte de teste) NÃO passa. Cada lado acha o combo mais confiável fora da amostra.</div>'
      + sideBlock(g.long, '▲ Melhor combo pra LONG', '#10df77')
      + sideBlock(g.short, '▼ Melhor combo pra SHORT', '#ff5966')
    +'</div>';
  }
  /* Backtest RSI Exaustão (pré-volume + o oscilador da plataforma, SEM VP):
     melhor config por lado + tabela. Mesmo critério rígido do VP. */
  function rsiGridHtml(s){
    var g=s&&s.rsiGrid; if(!g) return '';
    if(!g.ready){
      return '<div class="dvlCpBt1124Opt"><div class="dvlCpBt1124OptHd">📈 Backtest RSI Exaustão</div>'
        +'<div class="dvlCpBt1124OptSub">Poucos sinais com leitura de RSI pra varrer ('+(Number(g.withExr)||0)+', precisa ~'+(Number(g.need)||20)+').</div></div>';
    }
    function cfgTxt(c){
      var z=c.side==='long'?('≤'+(Number(c.lowerZone)||0)):('≥'+(Number(c.upperZone)||0));
      return 'RSI '+(Number(c.rsiLen)||0)+' · push '+(Number(c.push)||0)+' · spike '+(Number(c.volSpikeAt)||0)+'× · médVol '+(Number(c.volMaLen)||0)+' · zona '+z+' · alvo '+(Number(c.tpAtr)||0).toFixed(1)+'×';
    }
    function sideBlock(sd, label, cls){
      sd=sd||{}; var b=sd.best, fallback=false;
      if(!b && Array.isArray(sd.top) && sd.top.length){ b=sd.top[0]; fallback=true; }
      if(!b) return '<div class="dvlCpBt1124PaCard"><div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b></div><div class="dvlCpBt1124PaSub">nenhuma combinação com trades suficientes</div></div>';
      var trR=Number(b.train&&b.train.returnPct)||0, teR=Number(b.test&&b.test.returnPct)||0;
      var teN=Number(b.test&&b.test.trades)||0, teW=Number(b.test&&b.test.winRate)||0;
      var verd = (!sd.best) ? {t:'✗ NADA confiável — nenhum combo ficou verde no treino E no teste', c:'#ff5966'}
               : (teN<5 ? {t:'teste pequeno — inconclusivo', c:'#ffd321'}
               : {t:'✓ segura — VERDE no treino E no teste', c:'#10df77'});
      var rows=(Array.isArray(sd.top)?sd.top:[]).slice(0,8).map(function(c){
        var z=c.side==='long'?('≤'+(Number(c.lowerZone)||0)):('≥'+(Number(c.upperZone)||0));
        var tr=Number(c.train&&c.train.returnPct)||0, te=Number(c.test&&c.test.returnPct)||0;
        return '<tr><td>'+(Number(c.rsiLen)||0)+'</td><td>'+(Number(c.push)||0)+'</td><td>'+(Number(c.volSpikeAt)||0)+'×</td><td>'+(Number(c.volMaLen)||0)+'</td><td>'+z+'</td><td>'+(Number(c.tpAtr)||0).toFixed(1)+'×</td>'
          +'<td class="'+(tr>=0?'pos':'neg')+'">'+sign(tr)+'</td><td class="'+(te>=0?'pos':'neg')+'">'+sign(te)+'</td><td>'+(Number(c.test&&c.test.trades)||0)+'t</td></tr>';
      }).join('');
      return '<div class="dvlCpBt1124PaCard">'
        +'<div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b><span>'+(Number(b.test&&b.test.trades)||0)+' trades no teste</span></div>'
        +'<div class="dvlCpBt1124PaBig"><span class="'+(teR>=0?'pos':'neg')+'">'+fmtUsd(Number(b.test&&b.test.account)||1000)+'</span><small>de '+fmtUsd(1000)+' no TESTE · '+sign(teR)+' · '+teW.toFixed(0)+'% acerto</small></div>'
        +'<div class="dvlCpBt1124PaSub">Melhor config: <b>'+esc(cfgTxt(b))+'</b> · treino '+sign(trR)+'</div>'
        +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+';margin:4px 0 6px">'+verd.t+'</div>'
        +(rows?('<div style="overflow-x:auto"><table class="dvlCpBt1124GridTbl"><thead><tr><th>RSI</th><th>push</th><th>spike</th><th>médVol</th><th>zona</th><th>saída</th><th>treino</th><th>teste</th><th>n</th></tr></thead><tbody>'+rows+'</tbody></table></div>'):'')
      +'</div>';
    }
    return '<div class="dvlCpBt1124PaWrap">'
      +'<div class="dvlCpBt1124PaTitle">📈 Backtest RSI Exaustão — '+(Number(g.combosTested)||0).toLocaleString('pt-BR')+' combinações · pré-volume + seu oscilador · long e short cada um $1000'+((Number(g.sampleTotal)||0)>(Number(g.withExr)||0)?(' · usando os '+(Number(g.withExr)||0)+' sinais mais recentes de '+(Number(g.sampleTotal)||0)):'')+'</div>'
      +'<div class="dvlCpBt1124Exit" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22);color:#bcd8ff">Pré-volume baixo + o SEU Exhaustion RSI (comprimento × push × spike de volume × média de volume × zonas × alvo), SEM Volume Profile. Regra: RSI sobrevendido → LONG, sobrecomprado → SHORT. <b>Mesmo critério rígido:</b> só é "seguro" se for VERDE no TREINO E no TESTE (ranqueado pelo pior dos dois). É a versão mais portável pro MT5.</div>'
      + sideBlock(g.long, '▲ Melhor RSI pra LONG', '#10df77')
      + sideBlock(g.short, '▼ Melhor RSI pra SHORT', '#ff5966')
    +'</div>';
  }
  /* Backtest COMBINADO: pré-volume + RSI (zona) + VP (proximidade) juntos. */
  function comboGridHtml(s){
    var g=s&&s.comboGrid; if(!g) return '';
    if(!g.ready){
      return '<div class="dvlCpBt1124Opt"><div class="dvlCpBt1124OptHd">🎯 Backtest Combinado</div>'
        +'<div class="dvlCpBt1124OptSub">Poucos sinais com RSI+VP pra varrer ('+(Number(g.usable)||0)+', precisa ~'+(Number(g.need)||30)+'). A confluência deixa os sinais raros.</div></div>';
    }
    function cfgTxt(c){
      var z=c.side==='long'?('RSI ≤'+(Number(c.zone)||0)):('RSI ≥'+(Number(c.zone)||0));
      return z+' · '+vpLineLabel(c.line)+' · dist ≤ '+(Number(c.proxAtr)||0).toFixed(2)+'× ATR · '+vpPosLabel(c.pos)+' · janela '+(Number(c.vpWin)||0)+' · alvo '+(Number(c.tpAtr)||0).toFixed(1)+'×';
    }
    function sideBlock(sd, label, cls){
      sd=sd||{}; var b=sd.best, fallback=false;
      if(!b && Array.isArray(sd.top) && sd.top.length){ b=sd.top[0]; fallback=true; }
      if(!b) return '<div class="dvlCpBt1124PaCard"><div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b></div><div class="dvlCpBt1124PaSub">nenhuma combinação com trades suficientes</div></div>';
      var trR=Number(b.train&&b.train.returnPct)||0, teR=Number(b.test&&b.test.returnPct)||0;
      var teN=Number(b.test&&b.test.trades)||0, teW=Number(b.test&&b.test.winRate)||0;
      var verd = (!sd.best) ? {t:'✗ NADA confiável — nenhum combo ficou verde no treino E no teste', c:'#ff5966'}
               : (teN<8 ? {t:'teste pequeno — inconclusivo', c:'#ffd321'}
               : {t:'✓ segura — VERDE no treino E no teste', c:'#10df77'});
      var rows=(Array.isArray(sd.top)?sd.top:[]).slice(0,8).map(function(c){
        var tr=Number(c.train&&c.train.returnPct)||0, te=Number(c.test&&c.test.returnPct)||0;
        var pos=c.pos==='below'?'↓':(c.pos==='above'?'↑':'·');
        return '<tr><td>'+(Number(c.zone)||0)+'</td><td>'+String(c.line||'').toUpperCase()+'</td><td>'+(Number(c.proxAtr)||0).toFixed(2)+'×</td><td>'+pos+'</td><td>'+(Number(c.vpWin)||0)+'</td><td>'+(Number(c.tpAtr)||0).toFixed(1)+'×</td>'
          +'<td class="'+(tr>=0?'pos':'neg')+'">'+sign(tr)+'</td><td class="'+(te>=0?'pos':'neg')+'">'+sign(te)+'</td><td>'+(Number(c.test&&c.test.trades)||0)+'t</td></tr>';
      }).join('');
      return '<div class="dvlCpBt1124PaCard">'
        +'<div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b><span>'+(Number(b.test&&b.test.trades)||0)+' trades no teste</span></div>'
        +'<div class="dvlCpBt1124PaBig"><span class="'+(teR>=0?'pos':'neg')+'">'+fmtUsd(Number(b.test&&b.test.account)||1000)+'</span><small>de '+fmtUsd(1000)+' no TESTE · '+sign(teR)+' · '+teW.toFixed(0)+'% acerto</small></div>'
        +'<div class="dvlCpBt1124PaSub">Melhor combo: <b>'+esc(cfgTxt(b))+'</b> · treino '+sign(trR)+'</div>'
        +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+';margin:4px 0 6px">'+verd.t+'</div>'
        +(rows?('<div style="overflow-x:auto"><table class="dvlCpBt1124GridTbl"><thead><tr><th>zona</th><th>linha</th><th>dist</th><th>lado</th><th>janela</th><th>saída</th><th>treino</th><th>teste</th><th>n</th></tr></thead><tbody>'+rows+'</tbody></table></div>'):'')
      +'</div>';
    }
    return '<div class="dvlCpBt1124PaWrap">'
      +'<div class="dvlCpBt1124PaTitle">🎯 Backtest Combinado — '+(Number(g.combosTested)||0).toLocaleString('pt-BR')+' combinações · pré-volume + RSI + VP juntos · long e short cada um $1000'+((Number(g.sampleTotal)||0)>(Number(g.usable)||0)?(' · usando os '+(Number(g.usable)||0)+' sinais mais recentes de '+(Number(g.sampleTotal)||0)):'')+'</div>'
      +'<div class="dvlCpBt1124Exit" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22);color:#bcd8ff">Confluência dos TRÊS: ignição pré-volume + RSI na zona (sobrevendido→LONG / sobrecomprado→SHORT) + entrada PERTO de uma linha do Volume Profile. Varre zona × linha (VAL/POC/VAH) × distância × janela × lado × alvo. <b>Critério rígido + mínimo de trades reforçado</b> (a confluência deixa os sinais raros — cuidado com amostra pequena). Só é "seguro" se for VERDE no treino E no teste.</div>'
      + sideBlock(g.long, '▲ Melhor combo pra LONG', '#10df77')
      + sideBlock(g.short, '▼ Melhor combo pra SHORT', '#ff5966')
    +'</div>';
  }
  /* Backtest SÓ dos Sinais V (exaustão por excursão do RSI): compra ao sair da
     sobrevenda, venda ao sair da sobrecompra. Long/short separados, $1000 cada,
     critério anti-sorte (verde no treino E no teste). */
  function vSignalGridHtml(s){
    var g=s&&s.vSignalGrid; if(!g) return '';
    if(!g.ready){
      return '<div class="dvlCpBt1124Opt"><div class="dvlCpBt1124OptHd">🔺 Backtest Sinais V (RSI)</div>'
        +'<div class="dvlCpBt1124OptSub">'+esc(g.reason||'Poucos candles no período pra testar.')+'</div></div>';
    }
    function cfgTxt(c){ return 'zona '+(Number(c.lower)||0)+'/'+(Number(c.upper)||0)+' · alvo '+(Number(c.tpAtr)||0).toFixed(1)+'× · SL '+(Number(c.slAtr)||0).toFixed(1)+'×'; }
    function sideBlock(sd,label,cls){
      sd=sd||{};
      var b=sd.best; if(!b && Array.isArray(sd.top) && sd.top.length){ b=sd.top[0]; }
      if(!b) return '<div class="dvlCpBt1124PaCard"><div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b></div><div class="dvlCpBt1124PaSub">poucos sinais pra avaliar</div></div>';
      var trR=Number(b.train&&b.train.returnPct)||0, teR=Number(b.test&&b.test.returnPct)||0;
      var teN=Number(b.test&&b.test.trades)||0, teW=Number(b.test&&b.test.winRate)||0;
      var verd=(!sd.best)?{t:'✗ NADA confiável — nenhuma zona ficou verde no treino E no teste',c:'#ff5966'}
              :(teN<5?{t:'teste pequeno — inconclusivo',c:'#ffd321'}:{t:'✓ segura — VERDE no treino E no teste',c:'#10df77'});
      var rows=(Array.isArray(sd.top)?sd.top:[]).slice(0,8).map(function(c){
        var tr=Number(c.train&&c.train.returnPct)||0, te=Number(c.test&&c.test.returnPct)||0;
        return '<tr><td>'+(Number(c.lower)||0)+'/'+(Number(c.upper)||0)+'</td><td>'+(Number(c.tpAtr)||0).toFixed(1)+'×</td><td>'+(Number(c.signals)||0)+'</td>'
          +'<td class="'+(tr>=0?'pos':'neg')+'">'+sign(tr)+'</td><td class="'+(te>=0?'pos':'neg')+'">'+sign(te)+'</td><td>'+(Number(c.test&&c.test.trades)||0)+'t</td></tr>';
      }).join('');
      return '<div class="dvlCpBt1124PaCard">'
        +'<div class="dvlCpBt1124PaHd"><b style="color:'+cls+'">'+label+'</b><span>'+teN+' trades no teste</span></div>'
        +'<div class="dvlCpBt1124PaBig"><span class="'+(teR>=0?'pos':'neg')+'">'+fmtUsd(Number(b.test&&b.test.account)||1000)+'</span><small>de '+fmtUsd(1000)+' no TESTE · '+sign(teR)+' · '+teW.toFixed(0)+'% acerto</small></div>'
        +'<div class="dvlCpBt1124PaSub">Melhor: <b>'+esc(cfgTxt(b))+'</b> · '+(Number(b.signals)||0)+' sinais · treino '+sign(trR)+'</div>'
        +'<div class="dvlCpBt1124OptVerd" style="color:'+verd.c+';margin:4px 0 6px">'+verd.t+'</div>'
        +(rows?('<div style="overflow-x:auto"><table class="dvlCpBt1124GridTbl"><thead><tr><th>zona</th><th>alvo</th><th>sinais</th><th>treino</th><th>teste</th><th>n</th></tr></thead><tbody>'+rows+'</tbody></table></div>'):'')
      +'</div>';
    }
    var cf=g.configured||{};
    return '<div class="dvlCpBt1124PaWrap">'
      +'<div class="dvlCpBt1124PaTitle">🔺 Backtest Sinais V (RSI de exaustão) — '+(Number(g.combosTested)||0)+' zonas testadas · compra e venda cada uma com $1000 · ranqueado pelo TESTE (fora da amostra)</div>'
      +'<div class="dvlCpBt1124Exit" style="background:rgba(120,200,255,.06);border-color:rgba(120,200,255,.22);color:#bcd8ff">Testa SÓ os triângulos do gráfico: quando o RSI de exaustão SAI de uma zona (a excursão termina) entra o trade — saiu da sobrevenda = COMPRA, saiu da sobrecompra = VENDA — resolvido com SL/TP em ATR nas velas seguintes. Nas suas zonas atuais ('+(Number(cf.lower)||0)+'/'+(Number(cf.upper)||0)+') o indicador gerou <b>'+(Number(cf.buys)||0)+' compras</b> e <b>'+(Number(cf.sells)||0)+' vendas</b> no período. <b>Critério rígido:</b> uma zona só é "segura" se for VERDE no TREINO <b>E</b> no TESTE (ranking pelo pior dos dois).</div>'
      + sideBlock(g.long,'▲ COMPRA (saiu da sobrevenda)','#10df77')
      + sideBlock(g.short,'▼ VENDA (saiu da sobrecompra)','#ff5966')
    +'</div>';
  }
  function bodyHtml(){
    var a=annualState();
    var s;
    if(a.mode){
      if(a.status==='running'){
        return {on:true, html: annualBtnHtml()
          +'<h4><i class="dvlCpBt1124Dot"></i>Backtest '+(gridType()==='rsi'?'RSI Exaustão':(gridType()==='combo'?'Combinado':(gridType()==='vsignal'?'Sinais V':'Volume Profile')))+' · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+' · rodando…</h4>'
          +'<p class="dvlCpBt1124Sub">Buscando ~'+yearsLabel(gridYears())+' de '+tfLabel(gridTf())+' do BTC e varrendo '+(gridType()==='rsi'?'as combinações do seu Exhaustion RSI':(gridType()==='combo'?'a confluência RSI + Volume Profile (zona × linha × distância × janela × alvo)':(gridType()==='vsignal'?'as zonas do sinal de V (exaustão por excursão do RSI)':'as combinações de proximidade do Volume Profile (POC/VAH/VAL)')))+', long e short separados. Pode levar ~15–90s — pode sair da tela que ele continua.</p>'
          +'<div class="dvlCpBt1124Bar"><i style="width:'+Math.max(8,Math.min(95,Number(a.pct)||20))+'%"></i></div>'};
      }
      if(a.status==='error'){
        return {on:false, html: annualBtnHtml()
          +'<h4><i class="dvlCpBt1124Dot"></i>Backtest anual · erro</h4>'
          +'<p class="dvlCpBt1124Sub">'+esc(a.err||'Falha ao rodar. Tente de novo.')+'</p>'};
      }
      if(a.status==='ready' && a.data && a.data.ready){ s=a.data; }
      else if(a.status==='ready' && a.data && !a.data.ready){
        return {on:false, html: annualBtnHtml()
          +'<h4><i class="dvlCpBt1124Dot"></i>Backtest Volume Profile · poucos sinais</h4>'
          +'<p class="dvlCpBt1124Sub">'+esc((a.data&&a.data.reason)||'Não juntou sinais suficientes no período.')+' ('+((a.data&&a.data.samples)||0)+' sinais)</p>'};
      }
      else {
        return {on:false, html: annualBtnHtml()
          +'<h4><i class="dvlCpBt1124Dot"></i>Backtest Volume Profile · BTC</h4>'
          +'<p class="dvlCpBt1124Sub">Testa a tese do gráfico: spike pós pré-volume-baixo PERTO da região do VAL/POC/VAH → movimento. Reconstrói o VP da plataforma em 1 ou 2 anos de BTC e varre a proximidade das linhas, long e short cada um com $1000. Escolhe o TF e o período e toque no botão pra começar.</p>'};
      }
    } else {
      s=window.DVL_PUMP_BACKTEST;
    }
    if(!s||typeof s!=="object"){
      return {on:false, html: annualBtnHtml()
        +'<h4><i class="dvlCpBt1124Dot"></i>Backtest financeiro</h4>'
        +'<p class="dvlCpBt1124Sub">Aguardando o scanner backend responder.</p>'};
    }
    /* Sinais V é um card próprio (não passa pelo card genérico de financeiro). */
    if(s.annual && (s.vSignalGrid || s.vSignalOnly)){
      return {on:true, html: annualBtnHtml()
        +'<h4><i class="dvlCpBt1124Dot"></i>Sinais V (RSI) · BTC · '+yearsLabel(gridYears())+' '+tfLabel(gridTf())+'</h4>'
        + vSignalGridHtml(s)};
    }
    if(!s.ready){
      var need=Number(s.need)||20;
      var have=Number(s.samples)||0, pct=Math.max(0,Math.min(100,Math.round(have/Math.max(1,need)*100)));
      return {on:false, html:''
        + annualBtnHtml()
        +'<h4><i class="dvlCpBt1124Dot"></i>Backtest financeiro · aguardando modelo</h4>'
        +'<p class="dvlCpBt1124Sub">O backtest roda assim que o modelo treinar — usa todos os sinais já resolvidos.</p>'
        + toggleHtml(s)
        +'<div class="dvlCpBt1124Bar"><i style="width:'+pct+'%"></i></div>'
        +'<div class="dvlCpBt1124BarLbl">'+have+' / '+need+' sinais resolvidos</div>'};
    }
    var b=s.best||{}, p=s.params||{};
    var acc=Number(b.account)||0, acc0=Number(b.account0)||1000, ret=Number(b.returnPct)||0;
    var dd=Number(b.maxDrawdownPct)||0, win=Number(b.winRate)||0, tr=Number(b.trades)||0;
    var tp=Number(p.tpAtr)||Number(b.tpAtr)||0, sl=Number(p.slAtr)||1, risk=(Number(p.riskPct)||0.01)*100;
    var eqCls=ret>=0?"pos":"neg";
    function sideRow(o, label, cls){
      o=o||{}; var a=Number(o.account)||0, r=Number(o.returnPct)||0, w=Number(o.winRate)||0, n=Number(o.trades)||0;
      return '<div class="dvlCpBt1124Cell"><div class="k" style="color:'+cls+'">'+label+' · '+n+' trades</div>'
        +'<div class="v '+(r>=0?'pos':'neg')+'">'+fmtUsd(a)+'</div>'
        +'<div class="k" style="margin-top:2px">'+sign(r)+' · '+w.toFixed(0)+'% acerto</div></div>';
    }
    var exact=Number(s.exactPath)||0;
    var costRt=Number(p.costRoundTripPct); if(!isFinite(costRt)) costRt=0;
    var gross=Number(s.grossReturnPct);
    var grossNote=(isFinite(gross))?(' Sem custos daria '+sign(gross)+' — a diferença é a taxa+slippage comendo o edge.'):'';
    var modeLbl=esc(p.modeLabel||p.mode||'');
    return {on:true, html:''
      + annualBtnHtml()
      +'<h4><i class="dvlCpBt1124Dot"></i>'+(s.annual?((s.comboGrid?'Combinado':(s.rsiGrid?'RSI Exaustão':'Volume Profile'))+' · BTC'):'Backtest financeiro')+' · '+tr+' trades</h4>'
      +'<p class="dvlCpBt1124Sub">Melhor modo: <b style="color:#10df77">'+modeLbl+'</b> — stop '+sl.toFixed(1)+'× ATR, arriscando '+risk.toFixed(0)+'% da conta por trade. Já com custos: ~'+costRt.toFixed(2)+'% por trade (taxa + slippage).</p>'
      +(s.preliminary?('<div class="dvlCpBt1124Exit" style="background:rgba(255,211,33,.08);border-color:rgba(255,211,33,.3);color:#ffd88a">⚠️ <b>Preliminar — amostra pequena</b> ('+(Number(s.samples)||0)+' de '+(Number(s.need)||20)+' sinais completos). Os números vão mudar bastante até acumular mais sinais resolvidos; não confie 100% ainda.</div>'):'')
      +(s.annual?annualBannerHtml(s):toggleHtml(s))
      +'<div class="dvlCpBt1124Big"><span class="dvlCpBt1124Eq '+eqCls+'">'+fmtUsd(acc)+'</span><span class="dvlCpBt1124From">de '+fmtUsd(acc0)+' · '+sign(ret)+' líquido</span></div>'
      +'<div class="dvlCpBt1124Grid">'
        +'<div class="dvlCpBt1124Cell"><div class="k">Drawdown máx.</div><div class="v neg">-'+dd.toFixed(1)+'%</div></div>'
        +'<div class="dvlCpBt1124Cell"><div class="k">Taxa de acerto</div><div class="v">'+win.toFixed(0)+'%</div></div>'
      +'</div>'
      +'<div class="dvlCpBt1124Sub" style="margin-top:10px;margin-bottom:2px"><b>Resultado separado por lado</b> — cada direção otimizada sozinha (o short deixa de diluir o edge do long).</div>'
      +'<div class="dvlCpBt1124Grid" style="margin-top:4px">'
        + sideRow((s.longSide&&s.longSide.result)||s.long, '▲ Pré-pump (long)', '#10df77')
        + sideRow((s.shortSide&&s.shortSide.result)||s.short, '▼ Pré-short (short)', '#ff5966')
      +'</div>'
      + (s.annual&&s.vpGrid?vpGridHtml(s):'')
      + (s.annual&&s.rsiGrid?rsiGridHtml(s):'')
      + (s.annual&&s.comboGrid?comboGridHtml(s):'')
      + (s.annual?perAssetHtml(s):'')
      + (s.longSide?optHtml(s.longSide.optimize, '🧠 Melhor combo LONG — fora da amostra'):'')
      + (s.shortSide?optHtml(s.shortSide.optimize, '🧠 Melhor combo SHORT — fora da amostra'):'')
      + optHtml(s.optimized, '🧠 Melhor combo (long+short) — fora da amostra')
      + rsiHtml(s.rsiConfirm)
      + modesHtml(s.modes, s.bestMode)
      + heatmapHtml(s.surface)
      + (p.adaptive
          ? '<div class="dvlCpBt1124Exit">Saída adaptativa: <b>trailing stop de '+(Number(p.trailAtr)||0).toFixed(1)+'× ATR</b> — o stop sobe atrás do preço, deixa o lucro correr e protege quando vira.</div>'
          : '<div class="dvlCpBt1124Exit">Melhor saída aprendida: <b>fechar ao andar '+tp.toFixed(1)+'× ATR a favor</b>. Foi o take-profit que mais rendeu já descontando os custos.</div>')
      + trigHtml(s.trigger)
      + calibHtml(s.calibration)
      + condHtml(s.conditions)
      +'<div class="dvlCpBt1124Note">Valores LÍQUIDOS (taxa ~'+((Number(p.feePct)||0).toFixed(2))+'%/lado + slippage ~'+((Number(p.slipPct)||0).toFixed(2))+'%/lado, custo por ativo escala com a volatilidade).'+grossNote+' Cada coluna long/short é uma conta de '+fmtUsd(acc0)+' separada. Estimativa in-sample — calibra, não promete. '+(exact<tr?(exact+' de '+tr+' trades usam a trajetória exata (o resto, aproximação MFE). '):'')+'Não abre ordem nenhuma.</div>'};
  }

  function render(){
    var d=bodyHtml();
    return '<div class="dvlCpBt1124'+(d.on?' on':'')+'" data-dvl-cp-section="pumpBacktest" id="dvlCpBt1124Card">'+d.html+'</div>';
  }
  function refreshCard(){
    var el=document.getElementById("dvlCpBt1124Card");
    if(!el) return;
    var d=bodyHtml();
    el.className='dvlCpBt1124'+(d.on?' on':'');
    el.innerHTML=d.html;
  }
  /* ── Backtest ANUAL: dispara + poleia o endpoint até ficar pronto ── */
  function annualApi(path){
    try{ var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023; if(br&&typeof br.api==="function") return br.api(path); }catch(_){}
    return path; /* mesma origem */
  }
  function pollAnnual(){
    var a=annualState();
    if(true){ if(a._t){clearTimeout(a._t);a._t=null;} return; }   /* Beta 1.260 — backtest anual removido do backend */
    if(!copilotOpen1207()){ if(a._t){clearTimeout(a._t);a._t=null;} return; }
    var qs=a.query?("?"+a.query):"";
    /* Uma piscada de rede NÃO deve matar um backtest longo (2 anos/5m pode levar
       ~1 min buscando candles + varrendo). Só desiste após várias falhas
       seguidas; qualquer resposta boa zera o contador. */
    fetch(annualApi("/api/dvl/scanner/pump-backtest-annual"+qs),{cache:"no-store"})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!j){ throw new Error('sem resposta'); }
        a._fails=0;
        if(j.error){ a.status='error'; a.err=String(j.error); refreshCard(); return; }
        if(j.ready){ a.status='ready'; a.data=j; refreshCard(); return; }
        /* ainda rodando (started/running) — segue poleando */
        a.status='running'; a.pct=Math.min(95,(Number(a.pct)||15)+5);
        refreshCard();
        a._t=setTimeout(pollAnnual, 3500);
      })
      .catch(function(){
        a._fails=(Number(a._fails)||0)+1;
        if(a._fails>=6){ a.status='error'; a.err='falha de rede (sem resposta após várias tentativas)'; refreshCard(); return; }
        /* mantém como "rodando" e tenta de novo — não trava no primeiro erro */
        a.status='running'; refreshCard();
        a._t=setTimeout(pollAnnual, 4000);
      });
  }
  function startAnnual(query){
    var a=annualState();
    a.mode=true;
    query=query||'';
    /* Se trocou o alvo (5 ativos ↔ grid de RSI), reinicia; senão reaproveita. */
    if(a.query!==query){ a.query=query; a.data=null; a.status='idle'; }
    if(a.status==='ready'&&a.data){ refreshCard(); return; } /* já tem resultado */
    a.status='running'; a.pct=15; a.err=''; a._fails=0;
    refreshCard();
    if(a._t) clearTimeout(a._t);
    pollAnnual();
  }
  document.addEventListener("click", function(ev){
    var t=ev.target;
    var abt=t&&(t.closest?t.closest("[data-dvl-bt-grid-type]"):null);
    if(abt){ ev.preventDefault(); var at=annualState(); var _bt=abt.getAttribute("data-dvl-bt-grid-type"); at.btype=(_bt==='rsi'||_bt==='combo'||_bt==='vsignal')?_bt:'vp';
      if(at.mode){ startAnnual(btQuery()); } else { refreshCard(); } return; }
    var atf=t&&(t.closest?t.closest("[data-dvl-bt-grid-tf]"):null);
    if(atf){ ev.preventDefault(); var a=annualState(); a.tf=Number(atf.getAttribute("data-dvl-bt-grid-tf"))||15;
      /* trocou o TF: se já estava em modo grid, redispara; senão só re-render pra marcar o chip */
      if(a.mode){ startAnnual(btQuery()); } else { refreshCard(); } return; }
    var ays=t&&(t.closest?t.closest("[data-dvl-bt-grid-years]"):null);
    if(ays){ ev.preventDefault(); var ay=annualState(); ay.years=Number(ays.getAttribute("data-dvl-bt-grid-years"))||1;
      if(ay.mode){ startAnnual(btQuery()); } else { refreshCard(); } return; }
    var ag=t&&(t.closest?t.closest("[data-dvl-bt-annual-grid]"):null);
    if(ag){ ev.preventDefault(); startAnnual(btQuery()); return; }
    var abk=t&&(t.closest?t.closest("[data-dvl-bt-annual-back]"):null);
    if(abk){ ev.preventDefault(); var a=annualState(); a.mode=false; if(a._t)clearTimeout(a._t); refreshCard(); return; }
  });

  /* Delegated click on the "só sinais completos" switch: flip the bridge flag
     (persisted), re-pull the backtest, then refresh the card. */
  document.addEventListener("click", function(ev){
    var t=ev.target;
    var tg=t&&(t.closest?t.closest("[data-dvl-bt-toggle]"):null);
    if(!tg) return;
    ev.preventDefault();
    var next=!btOnlyComplete();
    var br=window.DVL_SCANNER_LIVE_FEED_BRIDGE_1023;
    var p=(br&&typeof br.setBtOnlyComplete==="function")
      ? br.setBtOnlyComplete(next)
      : (function(){ window.DVL_PUMP_BT_ONLY_COMPLETE=next; try{localStorage.setItem("dvl_pump_bt_only_complete",next?"1":"0");}catch(_){} return Promise.resolve(); })();
    tg.classList.toggle("on", next); /* instant feedback while the re-pull runs */
    Promise.resolve(p).then(function(){ refreshCard(); });
  });

  var bound1207=false;
  function refreshIfOpen1207(){ if(copilotOpen1207()) refreshCard(); }
  function bind1207(){
    if(bound1207) return; bound1207=true;
    window.addEventListener("dvl:pump-backtest-update",refreshIfOpen1207,true);
    window.addEventListener("dvl:copilot-state-change",function(ev){
      var open=!ev.detail||ev.detail.open!==false, a=annualState();
      if(open){ setTimeout(refreshIfOpen1207,0); if(a.mode&&a.status==="running"&&!a._t) setTimeout(pollAnnual,0); }
      else if(a._t){ clearTimeout(a._t); a._t=null; }
    },true);
  }
  function tryRegister(tries){
    tries=tries||0;
    var core=window.DVL_COPILOT_MODULAR_CORE_0980;
    if(core && typeof core.registerSection==="function"){
      core.registerSection({ key:"pumpBacktest", render:render }, "pumpModel");
      bind1207();
      return;
    }
    if(tries<80) setTimeout(function(){ tryRegister(tries+1); }, 400);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ tryRegister(0); }, {once:true});
  else tryRegister(0);

  window.DVL_COPILOT_PUMP_BACKTEST_1124={ version:"1.124", render:render, refresh:refreshCard };
})();
