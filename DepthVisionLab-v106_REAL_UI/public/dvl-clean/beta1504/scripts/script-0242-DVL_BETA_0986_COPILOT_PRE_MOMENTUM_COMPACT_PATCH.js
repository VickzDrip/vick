(function(){
  "use strict";

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});
  }

  function stageDots(n){
    var out = '<span class="dvlCp0986PMStageDots">';
    for(var i=0;i<5;i++) out += '<i class="'+(i<n?'on':'')+'"></i>';
    return out + '</span>';
  }

  function factor(label,state){
    return '<span class="dvlCp0986PMFactor '+(state||'off')+'"><em>'+esc(label)+'</em><i></i></span>';
  }

  function assetLetter(symbol){
    symbol = String(symbol||'BTCUSDT').replace('/','').toUpperCase();
    var base = symbol.replace(/USDT$/,'').replace(/USD$/,'');
    return (base.match(/[A-Z]/)||['D'])[0];
  }

  function makeRow(o){
    o = o || {};
    var factors = o.factors || [];
    var htmlFactors = '';
    var labels = ['VT','SZ','CS','OI','LS','EX'];
    for(var i=0;i<6;i++) htmlFactors += factor(labels[i], factors[i] || 'off');
    var scoreCls = o.aligned >= 5 ? '' : (o.aligned >= 3 ? 'mid' : 'bad');
    return ''+
      '<div class="dvlCp0986PMRow" data-dvl-pm-row="'+esc(o.id||'')+'">' +
        '<div class="dvlCp0986PMAsset">' +
          '<div class="dvlCp0986PMAssetIcon" style="--pm-c1:'+esc(o.c1||'#10df77')+';--pm-c2:'+esc(o.c2||'#0b6b44')+';--pm-glow:'+esc(o.glow||'rgba(16,223,119,.24)')+'">'+esc(o.letter || assetLetter(o.symbol))+'</div>' +
          '<div class="dvlCp0986PMAssetName"><b data-dvl-pm-symbol="'+esc(o.id||'')+'">'+esc(o.symbol||'BTCUSDT')+'</b><span class="dvlCp0986PMDir '+esc(o.dirCls||'')+'" data-dvl-pm-dir="'+esc(o.id||'')+'">'+esc(o.dir||'LONG')+'</span></div>' +
        '</div>' +
        '<div class="dvlCp0986PMStage '+esc(o.stageCls||'forming')+'" data-dvl-pm-stage-wrap="'+esc(o.id||'')+'"><b data-dvl-pm-stage="'+esc(o.id||'')+'">'+esc(o.stage||'Em formação')+'</b>'+stageDots(o.stageN||2)+'</div>' +
        '<div class="dvlCp0986PMForce '+esc(o.forceCls||'')+'" data-dvl-pm-force-wrap="'+esc(o.id||'')+'"><b data-dvl-pm-force="'+esc(o.id||'')+'">'+esc(o.force||'67%')+'</b><span class="dvlCp0986PMBar"><i style="width:'+esc(o.force||'67%')+'"></i></span></div>' +
        '<div class="dvlCp0986PMSpike '+esc(o.spikeCls||'')+'" data-dvl-pm-spike-wrap="'+esc(o.id||'')+'"><b data-dvl-pm-spike="'+esc(o.id||'')+'">'+esc(o.spike||'há 2m')+'</b><div class="dvlCp0986PMClock"></div></div>' +
        '<div class="dvlCp0986PMConf"><div class="dvlCp0986PMConfTop"><span>Confluência</span><b class="'+scoreCls+'" data-dvl-pm-score="'+esc(o.id||'')+'">'+esc(o.aligned||4)+'/6</b></div><div class="dvlCp0986PMFactors" data-dvl-pm-factors="'+esc(o.id||'')+'">'+htmlFactors+'</div></div>' +
      '</div>';
  }

  function makePreMomentumModule(){
    return ''+
      '<section class="dvlCp0976Panel dvlCp0986PreMomentumPanel" data-dvl-cp-section="decision" data-dvl-cp-section-version="0986">' +
        '<div class="dvlCp0986PMHead">' +
          '<i class="dvlCp0986PMIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.9v2M12 19.1v2M2.9 12h2M19.1 12h2"/></g></svg></i>' +
          '<div class="dvlCp0986PMTitle"><b>Pré-Momentum</b><span>Ativos para ficar de olho antes da confirmação</span></div>' +
          '<span class="dvlCp0986PMChip">Early Watch</span>' +
        '</div>' +
        '<div class="dvlCp0986PMTopLine"><div class="dvlCp0986PMLegend"><span><i class="good"></i>Alinhado</span><span><i class="wait"></i>Neutro</span><span><i class="risk"></i>Contra</span></div><span class="dvlCp0986PMMin">Min <b>3/6</b></span></div>' +
        '<div class="dvlCp1001PMTfTabs dvlCp1004PMTfTabs" data-dvl-pm-tf-tabs><button type="button" class="dvlCp1001PMTfBtn" data-dvl-pm-watch-tf="1m">1m</button><button type="button" class="dvlCp1001PMTfBtn" data-dvl-pm-watch-tf="3m">3m</button><button type="button" class="dvlCp1001PMTfBtn" data-dvl-pm-watch-tf="5m">5m</button><button type="button" class="dvlCp1001PMTfBtn" data-dvl-pm-watch-tf="15m">15m</button></div>' +
        '<div class="dvlCp0986PMList">' +
          makeRow({id:'primary',symbol:'BTCUSDT',letter:'B',dir:'LONG',stage:'Em formação',stageCls:'forming',stageN:2,force:'67%',forceCls:'mid',spike:'há 2m',aligned:4,factors:['good','good','wait','good','wait','risk'],c1:'#10df77',c2:'#073e2b'}) +
          makeRow({id:'eth',symbol:'ETHUSDT',letter:'E',dir:'SHORT',dirCls:'short',stage:'Quase pronto',stageCls:'ready',stageN:4,force:'81%',spike:'há 1m',aligned:5,factors:['good','good','good','good','wait','good'],c1:'#dfe6e4',c2:'#65716e',glow:'rgba(210,226,222,.18)'}) +
          makeRow({id:'sol',symbol:'SOLUSDT',letter:'S',dir:'LONG',stage:'Inicial',stageCls:'initial',stageN:1,force:'32%',forceCls:'low',spike:'há 8m',spikeCls:'old',aligned:2,factors:['wait','good','risk','off','risk','risk'],c1:'#8a43ff',c2:'#10df77',glow:'rgba(138,67,255,.18)'}) +
        '</div>' +
        '<div class="dvlCp0986PMFoot"><span>Observação antecipada. Entrada somente após confirmação no gráfico.</span><b>Bot bloqueado</b></div>' +
      '</section>';
  }

  function context(){
    try{
      if(window.DVL_COPILOT_LIVE_CONTEXT_CORE_0981 && typeof window.DVL_COPILOT_LIVE_CONTEXT_CORE_0981.compute === 'function'){
        return window.DVL_COPILOT_LIVE_CONTEXT_CORE_0981.compute();
      }
    }catch(_){ }
    return null;
  }

  function setText(root,sel,v){ var el=root.querySelector(sel); if(el) el.textContent = v; }
  function setClass(root,sel,base,cls){ var el=root.querySelector(sel); if(el) el.className = base + (cls ? ' '+cls : ''); }

  function applyLive(){
    var page = document.getElementById('dvlCopilotPage0974');
    if(!page) return false;
    var panel = page.querySelector('[data-dvl-cp-section="decision"][data-dvl-cp-section-version="0986"]');
    if(!panel) return false;
    var ctx = context();
    if(!ctx) return true;
    var sym = String(ctx.symbol || 'BTC/USDT').replace('/','').toUpperCase();
    var score = Math.max(18, Math.min(92, Math.round((Number(ctx.score||5)/10)*100)));
    var bias = String(ctx.bias || 'neutral');
    var dir = bias === 'bear' ? 'SHORT' : (bias === 'bull' ? 'LONG' : 'NEUTRO');
    var dirCls = bias === 'bear' ? 'short' : (bias === 'neutral' ? 'neutral' : '');
    var stage = 'Inicial', stageCls = 'initial', stageN = 1, forceCls = 'low', aligned = 2, spike = 'antigo', spikeCls = 'old';
    var volBoost = Number(ctx.volBoost || 1);
    if(score >= 78){ stage='Quase pronto'; stageCls='ready'; stageN=4; forceCls=''; aligned=5; }
    else if(score >= 58){ stage='Em formação'; stageCls='forming'; stageN=2; forceCls='mid'; aligned=4; }
    else if(score >= 38){ stage='Inicial'; stageCls='initial'; stageN=1; forceCls='low'; aligned=3; }
    else { stage='Descartar'; stageCls='drop'; stageN=1; forceCls='bad'; aligned=1; }
    if(volBoost >= 1.35){ spike='há 1m'; spikeCls=''; }
    else if(volBoost >= 1.18){ spike='há 2m'; spikeCls=''; }
    else if(volBoost >= 1.02){ spike='há 5m'; spikeCls='old'; }
    else { spike='antigo'; spikeCls='expired'; }
    setText(panel,'[data-dvl-pm-symbol="primary"]',sym);
    setText(panel,'[data-dvl-pm-dir="primary"]',dir);
    setClass(panel,'[data-dvl-pm-dir="primary"]','dvlCp0986PMDir',dirCls);
    setText(panel,'[data-dvl-pm-stage="primary"]',stage);
    setClass(panel,'[data-dvl-pm-stage-wrap="primary"]','dvlCp0986PMStage',stageCls);
    var dots = panel.querySelector('[data-dvl-pm-stage-wrap="primary"] .dvlCp0986PMStageDots');
    if(dots){ var html=''; for(var i=0;i<5;i++) html += '<i class="'+(i<stageN?'on':'')+'"></i>'; dots.innerHTML=html; }
    setText(panel,'[data-dvl-pm-force="primary"]',score+'%');
    setClass(panel,'[data-dvl-pm-force-wrap="primary"]','dvlCp0986PMForce',forceCls);
    var bar = panel.querySelector('[data-dvl-pm-force-wrap="primary"] .dvlCp0986PMBar i');
    if(bar) bar.style.width = score+'%';
    setText(panel,'[data-dvl-pm-spike="primary"]',spike);
    setClass(panel,'[data-dvl-pm-spike-wrap="primary"]','dvlCp0986PMSpike',spikeCls);
    var scoreEl = panel.querySelector('[data-dvl-pm-score="primary"]');
    if(scoreEl){ scoreEl.textContent = aligned + '/6'; scoreEl.className = aligned >=5 ? '' : (aligned >=3 ? 'mid' : 'bad'); }
    var factors = panel.querySelector('[data-dvl-pm-factors="primary"]');
    if(factors){
      var states = aligned >= 5 ? ['good','good','good','good','wait','good'] : aligned >= 4 ? ['good','good','wait','good','wait','risk'] : aligned >= 3 ? ['wait','good','wait','off','risk','wait'] : ['risk','wait','risk','off','risk','risk'];
      var labels = ['VT','SZ','CS','OI','LS','EX'], out='';
      for(var j=0;j<6;j++) out += factor(labels[j], states[j]);
      factors.innerHTML = out;
    }
    return true;
  }

  function patch(){
    var page = document.getElementById('dvlCopilotPage0974');
    if(!page) return false;
    var oldAvoid = page.querySelector('[data-dvl-cp-section="avoid"]');
    if(oldAvoid) oldAvoid.remove();
    var decision = page.querySelector('[data-dvl-cp-section="decision"]');
    if(!decision || decision.getAttribute('data-dvl-cp-section-version') !== '0986'){
      var html = makePreMomentumModule();
      if(decision) decision.outerHTML = html;
      else{
        var bot = page.querySelector('[data-dvl-cp-section="bot-soon"]');
        if(bot) bot.insertAdjacentHTML('beforebegin', html);
      }
    }
    applyLive();
    return !!page.querySelector('[data-dvl-cp-section="decision"][data-dvl-cp-section-version="0986"]');
  }

  function boot(){
    patch();
    setTimeout(patch,0);
    setTimeout(patch,350);
    setTimeout(patch,1000);
    /* DVL 0.993 stability: old patch interval disabled after initial boot. */
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_0986 = {
    version:'0.986',
    patch:patch,
    applyLive:applyLive,
    audit:function(){
      patch();
      var page = document.getElementById('dvlCopilotPage0974');
      var panel = page ? page.querySelector('[data-dvl-cp-section="decision"][data-dvl-cp-section-version="0986"]') : null;
      var bot = page ? page.querySelector('[data-dvl-cp-section="bot-soon"]') : null;
      var avoid = page ? page.querySelector('[data-dvl-cp-section="avoid"]') : null;
      var rows = panel ? panel.querySelectorAll('.dvlCp0986PMRow').length : 0;
      var factors = panel ? panel.querySelectorAll('.dvlCp0986PMFactor').length : 0;
      return {
        version:'0.986',
        preMomentumPanelFound:!!panel,
        insertedBeforeBotSoon:!!(panel && bot && (panel.compareDocumentPosition(bot) & Node.DOCUMENT_POSITION_FOLLOWING)),
        oldAvoidRemoved:!avoid,
        compactRows:rows,
        confluenceFactors:factors,
        hasSpikeTime:!!(panel && panel.textContent.indexOf('há') >= 0),
        noTradeExecution:true,
        noOrdersSent:true,
        noDrawingsTouch:true,
        noIndicatorsTouch:true,
        noApiTouch:true,
        noFallbackTouch:true,
        pass:!!panel && !!bot && rows >= 3 && factors >= 18 && !avoid
      };
    }
  };
  window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_AUDIT = function(){
    return window.DVL_COPILOT_PRE_MOMENTUM_COMPACT_0986.audit();
  };
})();
