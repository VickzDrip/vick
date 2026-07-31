(function(){
  "use strict";
  if(window.DVL_COPILOT_TF_OHLC_FIX_1021) return;

  var VERSION = "1.021";

  function q(sel,root){ return (root||document).querySelector(sel); }
  function qa(sel,root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function page(){ return document.getElementById("dvlCopilotPage0974"); }

  function cleanup(){
    var p = page();
    if(!p) return false;

    qa('[data-dvl-cp-section="opportunities"] .dvlCp1004InlineTf', p).forEach(function(el){ el.remove(); });
    qa('[data-dvl-cp-section="opportunities"] .dvlCp0997TfTag', p).forEach(function(el){ el.remove(); });
    qa('[data-dvl-cp-section="decision"] .dvlCp0997PmTf', p).forEach(function(el){ el.remove(); });

    qa('[data-dvl-cp-section="opportunities"] .dvlCp0996OppLive', p).forEach(function(live){
      live.style.gridTemplateColumns = 'auto auto minmax(0,1fr)';
    });

    qa('[data-dvl-cp-section="opportunities"] .dvlCp0976MiniCandles[data-dvl-candle-source="no-real-ohlc"]', p).forEach(function(host){
      var badge = host.querySelector('.dvlCp1011NoOhlc');
      if(badge){
        badge.textContent = 'SEM OHLC';
        badge.setAttribute('title','Sem OHLC real disponível para este ativo agora');
      }
      host.style.minWidth = '52px';
      host.style.maxWidth = '52px';
      host.style.overflow = 'visible';
    });

    p.setAttribute('data-dvl-copilot-fix-1021','1');
    return true;
  }

  function boot(){
    cleanup();
    setTimeout(cleanup,0);
    setTimeout(cleanup,250);
    setTimeout(cleanup,800);
    setTimeout(cleanup,1600);
    window.addEventListener('dvl:copilot-live-feed', function(){ setTimeout(cleanup,40); }, true);
    document.addEventListener('click', function(){ setTimeout(cleanup,60); }, true);
    window.addEventListener('resize', function(){ setTimeout(cleanup,60); }, true);
    window.addEventListener('dvl:copilot-state-change', function(ev){ if(!ev.detail||ev.detail.open!==false) setTimeout(cleanup,40); }, true);
  }

  window.DVL_COPILOT_TF_OHLC_FIX_1021 = {
    version: VERSION,
    cleanup: cleanup,
    audit: function(){
      cleanup();
      var p = page();
      return {
        version: VERSION,
        pageFound: !!p,
        oppInlineTfVisible: p ? qa('[data-dvl-cp-section="opportunities"] .dvlCp1004InlineTf', p).length : 0,
        oppLiveTfVisible: p ? qa('[data-dvl-cp-section="opportunities"] .dvlCp0997TfTag', p).length : 0,
        preMomentumRowTfVisible: p ? qa('[data-dvl-cp-section="decision"] .dvlCp0997PmTf', p).length : 0,
        noOhlcBadges: p ? qa('.dvlCp1011NoOhlc', p).length : 0,
        pass: !!(p && !qa('[data-dvl-cp-section="opportunities"] .dvlCp1004InlineTf,[data-dvl-cp-section="opportunities"] .dvlCp0997TfTag,[data-dvl-cp-section="decision"] .dvlCp0997PmTf', p).length)
      };
    }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
